import { supabase } from '@/integrations/supabase/client';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// Convert base64 string to Uint8Array (needed for VAPID key)
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// VAPID public key for web push
// To generate new keys, run: npx tsx scripts/generate-vapid-keys.ts
// Or use: https://www.stephane-quantin.com/en/tools/generators/vapid-keys
const VAPID_PUBLIC_KEY = 'B0DQ58L1hiBn6AtQyjxRDt2VUz0KCPAouU_0TcQkEAADUIyKfyP42D1eAi_OLD_gEhxMkATCIy77sFiuaGrC9jk';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const subscribeToPushNotifications = async (): Promise<boolean> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Native mobile push notifications (iOS/Android)
      console.log('Setting up native push notifications');
      
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();

      // Listen for registration token
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) {
            resolve(false);
            return;
          }

          // Save token to database
          const { error } = await supabase
            .from('push_subscriptions')
            .upsert([{
              user_id: user.user.id,
              platform: Capacitor.getPlatform(), // 'ios' or 'android'
              endpoint: token.value,
              device_token: token.value,
              subscription_data: { token: token.value },
              auth: '',
              p256dh: '',
              device_type: Capacitor.getPlatform(),
            }], {
              onConflict: 'user_id,endpoint',
            });

          if (error) {
            console.error('Error saving push token:', error);
            resolve(false);
          } else {
            console.log('Push token saved to database');
            resolve(true);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration:', error);
          resolve(false);
        });
      });
    } else {
      // Web push notifications
      if (!('serviceWorker' in navigator)) {
        console.error('Service workers are not supported');
        return false;
      }

      // Request notification permission
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.log('Notification permission denied');
        return false;
      }

      // Register or reuse service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('Service worker registered:', registration);
      } else {
        console.log('Service worker already registered:', registration);
      }

      // Wait for the service worker to be ready (activated)
      const swReg = await navigator.serviceWorker.ready;
      console.log('Service worker ready:', swReg);

      // Reuse existing subscription if present
      let subscription = await swReg.pushManager.getSubscription();
      if (!subscription) {
        try {
          subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          console.log('Created new push subscription:', subscription);
        } catch (err) {
          console.error('pushManager.subscribe failed:', err);
          throw err;
        }
      } else {
        console.log('Existing push subscription found:', subscription);
      }

      // Save subscription to database
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const subscriptionJson = subscription.toJSON();
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert([{
          user_id: user.user.id,
          platform: 'web',
          endpoint: subscriptionJson.endpoint!,
          subscription_data: {
            endpoint: subscriptionJson.endpoint,
            keys: subscriptionJson.keys,
          },
          auth: subscriptionJson.keys!.auth,
          p256dh: subscriptionJson.keys!.p256dh,
          device_type: 'web',
        }], {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      console.log('Subscription saved to database');
      return true;
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
};

export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Unregister native push
      await PushNotifications.removeAllListeners();
      
      // Remove from database - we need to get all subscriptions for this user
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.user.id)
          .eq('platform', Capacitor.getPlatform());

        if (error) throw error;
      }
      
      console.log('Unsubscribed from native push notifications');
      return true;
    } else {
      // Web push
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        return true;
      }

      // Remove from database
      const subscriptionJson = subscription.toJSON();
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscriptionJson.endpoint!);

      if (error) throw error;

      // Unsubscribe from push
      await subscription.unsubscribe();
      
      console.log('Unsubscribed from push notifications');
      return true;
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

export const checkPushSubscription = async (): Promise<boolean> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Check if we have a saved token in the database
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('platform', Capacitor.getPlatform())
        .single();

      return !!data;
    } else {
      // Web push
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      // Avoid waiting on navigator.serviceWorker.ready here — it may never resolve
      // when no Service Worker is registered yet. Check existing registration only.
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    }
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
};
