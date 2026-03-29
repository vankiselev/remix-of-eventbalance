import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// Convert base64url string to Uint8Array (needed for VAPID key)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── VAPID validation ──────────────────────────────────────────────
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function isValidBase64url(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  const clean = value.trim().replace(/=+$/g, '');
  return clean.length > 0 && BASE64URL_RE.test(clean);
}

function getWebSubPayload(subscription: PushSubscription) {
  const subJson = subscription.toJSON();
  return {
    endpoint: (subJson.endpoint || '').trim(),
    auth: (subJson.keys?.auth || '').trim(),
    p256dh: (subJson.keys?.p256dh || '').trim(),
  };
}

function validateWebSubPayload(payload: { endpoint: string; auth: string; p256dh: string }): { ok: boolean; reason?: string } {
  if (!payload.endpoint || !payload.endpoint.startsWith('https://')) return { ok: false, reason: 'subscription_invalid_endpoint' };
  if (!isValidBase64url(payload.auth)) return { ok: false, reason: 'subscription_invalid_auth' };
  if (!isValidBase64url(payload.p256dh)) return { ok: false, reason: 'subscription_invalid_p256dh' };
  return { ok: true };
}

async function clearUserPushSubscriptions(userId: string): Promise<void> {
  const { error: deleteError } = await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  if (deleteError) {
    throw new Error(`db_error: cleanup_delete_failed: ${deleteError.message}`);
  }

  const { count, error: countError } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    throw new Error(`db_error: cleanup_verify_failed: ${countError.message}`);
  }

  if ((count ?? 0) !== 0) {
    throw new Error(`db_error: cleanup_incomplete: осталось ${(count ?? 0)} записей`);
  }
}

async function ensureSinglePushSubscription(userId: string, endpoint: string): Promise<void> {
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .neq('endpoint', endpoint);

  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`db_error: single_verify_failed: ${error.message}`);
  }

  if ((count ?? 0) !== 1) {
    throw new Error(`db_error: expected_one_subscription_got_${count ?? 0}`);
  }
}

function getVapidPublicKey(): string | null {
  const raw = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.trim().replace(/[=\s\n\r"']+/g, '');
  if (key.length < 20) return null;
  if (!BASE64URL_RE.test(key)) return null;
  return key;
}

export function validateVapidKey(): { valid: boolean; error?: string } {
  const raw = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    return { valid: false, error: 'VAPID-ключ не задан (VITE_VAPID_PUBLIC_KEY). Обратитесь к администратору.' };
  }
  const key = raw.trim().replace(/[=\s\n\r"']+/g, '');
  if (key.length < 20) {
    return { valid: false, error: 'VAPID-ключ слишком короткий. Обратитесь к администратору.' };
  }
  if (!BASE64URL_RE.test(key)) {
    return { valid: false, error: 'VAPID-ключ содержит недопустимые символы. Только A-Z, a-z, 0-9, - и _.' };
  }
  return { valid: true };
}

// ── Diagnostics ───────────────────────────────────────────────────
export type PushDiagnostics = {
  isHttps: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  hasNotificationAPI: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  notificationPermission: string;
  serviceWorkerReady: boolean;
  serviceWorkerState: string;
  existingSubscription: boolean;
  vapidKeyValid: boolean;
  vapidError?: string;
  savedInDb: boolean;
  dbSubscriptionCount: number;
  isNative: boolean;
};

export const diagnosePush = async (): Promise<PushDiagnostics> => {
  const isNative = Capacitor.isNativePlatform();
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
  const hasNotificationAPI = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const notificationPermission = hasNotificationAPI ? Notification.permission : 'unsupported';
  const vapidCheck = validateVapidKey();

  let serviceWorkerReady = false;
  let serviceWorkerState = 'none';
  let existingSubscription = false;

  if (hasServiceWorker) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sw = reg.active || reg.waiting || reg.installing;
        serviceWorkerState = sw?.state || 'no-worker';
        serviceWorkerReady = !!reg.active;
        if (reg.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          existingSubscription = !!sub;
        }
      }
    } catch {
      serviceWorkerState = 'error';
    }
  }

  // Check DB subscriptions
  let savedInDb = false;
  let dbSubscriptionCount = 0;
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data, count } = await supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact' })
        .eq('user_id', userData.user.id);
      dbSubscriptionCount = count || data?.length || 0;
      savedInDb = dbSubscriptionCount > 0;
    }
  } catch { /* ignore */ }

  return {
    isHttps,
    isIOS,
    isStandalone,
    hasNotificationAPI,
    hasServiceWorker,
    hasPushManager,
    notificationPermission,
    serviceWorkerReady,
    serviceWorkerState,
    existingSubscription,
    vapidKeyValid: vapidCheck.valid,
    vapidError: vapidCheck.error,
    savedInDb,
    dbSubscriptionCount,
    isNative,
  };
};

// ── Permission ────────────────────────────────────────────────────
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// ── Subscribe ─────────────────────────────────────────────────────
export const subscribeToPushNotifications = async (): Promise<boolean> => {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      throw new Error('permission_denied: Push permission denied');
    }
    await PushNotifications.register();
    return new Promise((resolve, reject) => {
      PushNotifications.addListener('registration', async (token) => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) { reject(new Error('not_authenticated: Войдите в аккаунт')); return; }
        const nativePlatform = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android';
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({ user_id: user.user.id, endpoint: token.value, auth: '', p256dh: '', platform: nativePlatform } as any, { onConflict: 'user_id,endpoint' });
        if (error) { reject(new Error(`db_error: ${error.message}`)); } else { resolve(true); }
      });
      PushNotifications.addListener('registrationError', (error) => {
        reject(new Error(`native_error: ${error?.error || JSON.stringify(error)}`));
      });
    });
  }

  // ── Web Push flow ───────────────────────────────────────────────
  // 1. Validate VAPID
  const vapidCheck = validateVapidKey();
  if (!vapidCheck.valid) throw new Error(`vapid_invalid: ${vapidCheck.error}`);
  const vapidKey = getVapidPublicKey()!;

  // 2. Check APIs
  if (!('serviceWorker' in navigator)) throw new Error('sw_unsupported: Браузер не поддерживает Service Worker');
  if (!('PushManager' in window)) throw new Error('push_unsupported: PushManager недоступен. На iPhone откройте приложение с экрана «Домой».');

  // 3. Permission
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) throw new Error('permission_denied: Разрешение на уведомления не получено');

  // 4. Service Worker ready
  let registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) {
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (e: any) {
      throw new Error(`sw_register_failed: ${e?.message || e}`);
    }
  }

  const swReg = await navigator.serviceWorker.ready;
  if (!swReg?.pushManager) throw new Error('sw_not_ready: Service Worker активен, но PushManager недоступен');

  // 5. Unsubscribe old if exists
  const oldSub = await swReg.pushManager.getSubscription();
  if (oldSub) {
    try { await oldSub.unsubscribe(); } catch (e) { console.warn('[push] Unsubscribe old failed:', e); }
  }

  // 6. Subscribe with retry for iOS
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  let subscription: PushSubscription | null = null;
  const maxAttempts = isIOS ? 3 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
      break;
    } catch (err: any) {
      console.error(`[push] Subscribe attempt ${attempt}/${maxAttempts} failed:`, err?.message);
      if (attempt === maxAttempts) {
        throw new Error(`subscribe_failed: ${err?.message || err?.name || 'Неизвестная ошибка'}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!subscription) throw new Error('subscribe_failed: Подписка не создана');

  // 7. Save to DB via upsert (only existing columns: user_id, endpoint, auth, p256dh)
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('not_authenticated: Войдите в аккаунт');

  const payload = getWebSubPayload(subscription);
  const payloadValidation = validateWebSubPayload(payload);
  if (!payloadValidation.ok) {
    throw new Error(`subscription_invalid: ${payloadValidation.reason}`);
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userData.user.id,
        endpoint: payload.endpoint,
        auth: payload.auth,
        p256dh: payload.p256dh,
        platform: 'web',
      } as any,
      { onConflict: 'user_id,endpoint' }
    );

  if (error) throw new Error(`db_error: ${error.message}`);
  await ensureSinglePushSubscription(userData.user.id, payload.endpoint);
  console.log('[push] Subscription saved to DB');
  return true;
};

// ── Repair: save existing browser subscription to DB without full reset ──
export const repairPushSubscription = async (): Promise<boolean> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('not_authenticated: Войдите в аккаунт');

  if (!('serviceWorker' in navigator)) throw new Error('sw_unsupported: Service Worker не поддерживается');

  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg?.pushManager) throw new Error('sw_not_ready: Service Worker не готов');

  let subscription = await reg.pushManager.getSubscription();
  const payload = subscription ? getWebSubPayload(subscription) : null;

  // If current subscription is damaged (missing keys), do a full reset
  if (!subscription || !payload || !validateWebSubPayload(payload).ok) {
    console.log('[push] Existing subscription damaged or missing, doing full reset');
    return resetPushSubscription();
  }

  // Delete ALL old DB records for this user first
  await clearUserPushSubscriptions(userData.user.id);

  // Save current valid subscription
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userData.user.id,
        endpoint: payload.endpoint,
        auth: payload.auth,
        p256dh: payload.p256dh,
        platform: 'web',
      } as any,
      { onConflict: 'user_id,endpoint' }
    );

  if (error) throw new Error(`db_error: ${error.message} (code: ${error.code}, details: ${error.details})`);
  await ensureSinglePushSubscription(userData.user.id, payload.endpoint);
  console.log('[push] Subscription repaired in DB');
  return true;
};

// ── Reset subscription (deletes ALL old records for user first) ───
export const resetPushSubscription = async (): Promise<boolean> => {
  const vapidCheck = validateVapidKey();
  if (!vapidCheck.valid) throw new Error(`vapid_invalid: ${vapidCheck.error}`);
  if (!('serviceWorker' in navigator)) throw new Error('sw_unsupported: Service Worker не поддерживается');

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('not_authenticated: Войдите в аккаунт');

  // 1. Unsubscribe browser push if exists
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (reg) {
    const oldSub = await reg.pushManager?.getSubscription();
    if (oldSub) {
      try { await oldSub.unsubscribe(); } catch { /* ignore */ }
    }
  }

  // 2. Delete ALL old DB records for this user and verify cleanup to zero
  await clearUserPushSubscriptions(userData.user.id);

  // 3. Create fresh subscription
  return subscribeToPushNotifications();
};

// ── Unsubscribe ───────────────────────────────────────────────────
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllListeners();
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.user.id);
      }
      return true;
    }

    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return true;

    const subscription = await registration.pushManager?.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      await supabase.from('push_subscriptions').delete().eq('user_id', user.user.id).eq('endpoint', endpoint);
    }
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error('[push] Unsubscribe error:', error);
    return false;
  }
};

// ── Check status ──────────────────────────────────────────────────
export const checkPushSubscription = async (): Promise<boolean> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;
      const { data } = await supabase.from('push_subscriptions').select('id').eq('user_id', user.user.id).maybeSingle();
      return !!data;
    }

    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return false;
    const subscription = await registration.pushManager?.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};
