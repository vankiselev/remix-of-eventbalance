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

// VAPID public key - you'll need to generate this
// Generate keys at: https://www.stephane-quantin.com/en/tools/generators/vapid-keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr6xi1nWSqxPwUu5Y2XAW5U';

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
            .upsert({
              user_id: user.user.id,
              endpoint: token.value,
              p256dh: '', // Not needed for native
              auth: '', // Not needed for native
              device_type: Capacitor.getPlatform(), // 'ios' or 'android'
            }, {
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

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered:', registration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('Push subscription:', subscription);

      // Save subscription to database
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const subscriptionJson = subscription.toJSON();
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
          device_type: 'web',
        }, {
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
          .eq('device_type', Capacitor.getPlatform());

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
        .eq('device_type', Capacitor.getPlatform())
        .single();

      return !!data;
    } else {
      // Web push
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      return !!subscription;
    }
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
};
