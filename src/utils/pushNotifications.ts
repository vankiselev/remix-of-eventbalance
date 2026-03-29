// @ts-nocheck
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

// VAPID public key — read from env, no hardcode
function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key || typeof key !== 'string' || key.length < 20) {
    return null;
  }
  return key;
}

export type PushDiagnostics = {
  isIOS: boolean;
  isStandalone: boolean;
  hasNotificationAPI: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  notificationPermission: string;
  serviceWorkerReady: boolean;
  existingSubscription: boolean;
  vapidKeyAvailable: boolean;
};

export const diagnosePush = async (): Promise<PushDiagnostics> => {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const hasNotificationAPI = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const notificationPermission = hasNotificationAPI ? Notification.permission : 'unsupported';
  const vapidKeyAvailable = !!getVapidPublicKey();

  let serviceWorkerReady = false;
  let existingSubscription = false;

  if (hasServiceWorker) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      serviceWorkerReady = !!reg?.active;
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        existingSubscription = !!sub;
      }
    } catch {}
  }

  return {
    isIOS,
    isStandalone,
    hasNotificationAPI,
    hasServiceWorker,
    hasPushManager,
    notificationPermission,
    serviceWorkerReady,
    existingSubscription,
    vapidKeyAvailable,
  };
};

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
      
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        throw new Error('permission_denied: Push notification permission denied');
      }

      await PushNotifications.register();

      return new Promise((resolve, reject) => {
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) {
            reject(new Error('not_authenticated: User not authenticated'));
            return;
          }

          // Delete existing subscriptions for this user on native (no unique constraint on user_id+endpoint)
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.user.id);

          const { error } = await supabase
            .from('push_subscriptions')
            .insert({
              user_id: user.user.id,
              endpoint: token.value,
              auth: '',
              p256dh: '',
            });

          if (error) {
            reject(new Error(`db_error: ${error.message}`));
          } else {
            resolve(true);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          reject(new Error(`native_registration_failed: ${error?.error || JSON.stringify(error)}`));
        });
      });
    } else {
      // Web push notifications
      const vapidKey = getVapidPublicKey();
      if (!vapidKey) {
        throw new Error('vapid_missing: VAPID public key not configured (VITE_VAPID_PUBLIC_KEY). Contact administrator.');
      }

      if (!('serviceWorker' in navigator)) {
        throw new Error('sw_unsupported: Service workers are not supported in this browser');
      }

      if (!('PushManager' in window)) {
        throw new Error('push_unsupported: PushManager is not available in this browser/context');
      }

      // Request notification permission
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        throw new Error('permission_denied: Notification permission was denied');
      }

      // Register or reuse service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        try {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.log('Service worker registered:', registration);
        } catch (swErr: any) {
          throw new Error(`sw_register_failed: ${swErr?.message || swErr}`);
        }
      }

      // Wait for the service worker to be ready (activated)
      const swReg = await navigator.serviceWorker.ready;
      if (!swReg?.pushManager) {
        throw new Error('sw_not_ready: Service worker ready but pushManager is unavailable');
      }

      // Unsubscribe from any existing subscription (might have old VAPID key)
      let subscription = await swReg.pushManager.getSubscription();
      if (subscription) {
        console.log('Found existing subscription, unsubscribing first to use current VAPID key...');
        try {
          await subscription.unsubscribe();
          console.log('Unsubscribed from old subscription');
        } catch (unsubErr) {
          console.warn('Failed to unsubscribe from old subscription:', unsubErr);
        }
      }

      // Create new subscription with current VAPID key
      try {
        subscription = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        console.log('Created new push subscription');
      } catch (err: any) {
        console.error('pushManager.subscribe failed:', err?.message, err?.name, err);
        throw new Error(`subscribe_failed: ${err?.message || err?.name || err}`);
      }

      // Save subscription to database
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('not_authenticated: User not authenticated');
      }

      const subscriptionJson = subscription.toJSON();
      
      // Delete old subscriptions for this user, then insert new one
      // (no unique constraint on user_id+endpoint, so upsert won't work)
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.user.id);

      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.user.id,
          endpoint: subscriptionJson.endpoint!,
          auth: subscriptionJson.keys!.auth,
          p256dh: subscriptionJson.keys!.p256dh,
        });

      if (error) throw new Error(`db_error: ${error.message}`);

      console.log('Subscription saved to database');
      return true;
    }
  } catch (error: any) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

export const resetPushSubscription = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('sw_unsupported: Service workers not supported');
    }

    const vapidKey = getVapidPublicKey();
    if (!vapidKey) {
      throw new Error('vapid_missing: VAPID public key not configured');
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('not_authenticated: User not authenticated');
    }

    // Unsubscribe from old
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const oldSub = await reg.pushManager.getSubscription();
      if (oldSub) {
        await oldSub.unsubscribe();
        // Delete old record from DB
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', oldSub.toJSON().endpoint!);
      }
    }

    // Re-register SW if needed
    let swReg = await navigator.serviceWorker.getRegistration();
    if (!swReg) {
      swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    const ready = await navigator.serviceWorker.ready;

    // Create new subscription
    const newSub = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subJson = newSub.toJSON();

    // Delete old, insert new (no unique constraint on user_id+endpoint)
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userData.user.id);

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userData.user.id,
        endpoint: subJson.endpoint!,
        auth: subJson.keys!.auth,
        p256dh: subJson.keys!.p256dh,
      });

    if (error) throw new Error(`db_error: ${error.message}`);
    console.log('Push subscription reset successfully');
    return true;
  } catch (error: any) {
    console.error('Error resetting push subscription:', error);
    throw error;
  }
};

export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      await PushNotifications.removeAllListeners();
      
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.user.id);

        if (error) throw error;
      }
      
      console.log('Unsubscribed from native push notifications');
      return true;
    } else {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return true;

      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        return true;
      }

      const subscriptionJson = subscription.toJSON();
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscriptionJson.endpoint!);

      if (error) throw error;

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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle();

      return !!data;
    } else {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

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
