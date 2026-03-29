import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, BellOff, Globe, CheckCircle2, AlertCircle, Volume2, 
  Send, RefreshCw, Shield, Wifi, Eye, Smartphone, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  checkPushSubscription,
  requestNotificationPermission,
  diagnosePush,
  resetPushSubscription,
  validateVapidKey,
  type PushDiagnostics,
} from '@/utils/pushNotifications';
import { notificationSound } from '@/utils/notificationSound';
import { NotificationsFAQ } from './NotificationsFAQ';
import { supabase } from '@/integrations/supabase/client';

const ERROR_MESSAGES: Record<string, string> = {
  permission_denied: 'Разрешение на уведомления отклонено. Измените в настройках браузера/устройства.',
  vapid_invalid: 'VAPID-ключ невалиден. Обратитесь к администратору.',
  vapid_missing: 'VAPID-ключ не настроен. Обратитесь к администратору.',
  sw_unsupported: 'Браузер не поддерживает Service Worker.',
  push_unsupported: 'PushManager недоступен. На iPhone откройте приложение с экрана «Домой».',
  sw_register_failed: 'Не удалось зарегистрировать Service Worker. Обновите страницу.',
  sw_not_ready: 'Service Worker не готов. Обновите страницу и попробуйте снова.',
  subscribe_failed: 'Не удалось создать push-подписку. Попробуйте «Пересоздать подписку».',
  not_authenticated: 'Вы не авторизованы. Войдите в аккаунт.',
  db_error: 'Ошибка сохранения подписки. Попробуйте ещё раз.',
  native_error: 'Ошибка нативных уведомлений.',
  ios_not_standalone: 'На iPhone push работает только из приложения на экране «Домой».',
};

function getFriendlyError(error: any): string {
  const msg = error?.message || String(error);
  const code = msg.split(':')[0]?.trim();
  return ERROR_MESSAGES[code] || msg;
}

// ── Diagnostics status item ───────────────────────────────────────
function DiagItem({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`mt-0.5 flex-shrink-0 ${ok ? 'text-green-600' : 'text-red-500'}`}>
        {ok ? '✅' : '❌'}
      </span>
      <div>
        <span className={ok ? 'text-foreground' : 'text-destructive font-medium'}>{label}</span>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

export const NotificationSettings = () => {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSoundEnabled, setIsSoundEnabled] = useState(notificationSound.isEnabled());
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { toast } = useToast();
  const isInIframe = typeof window !== 'undefined' && window.top !== window.self;

  const refreshDiagnostics = async () => {
    const diag = await diagnosePush();
    setDiagnostics(diag);
    return diag;
  };

  // ── Sound ───────────────────────────────────────────────────────
  const handleToggleSound = (enabled: boolean) => {
    notificationSound.setEnabled(enabled);
    setIsSoundEnabled(enabled);
    toast({
      title: enabled ? 'Звук включен' : 'Звук отключен',
      description: enabled ? 'Звуковые уведомления активны' : 'Звуковые уведомления отключены',
    });
  };

  // ── Test push ───────────────────────────────────────────────────
  const handleTestPush = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Не авторизован', description: 'Войдите в аккаунт', variant: 'destructive' });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          title: 'Тестовое уведомление',
          message: 'Если вы видите это — Web Push работает! 🎉',
          type: 'system',
          data: { source: 'test' },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({ title: 'Ошибка отправки', description: result?.error || `HTTP ${response.status}`, variant: 'destructive' });
        return;
      }

      const statusParts = [
        `vapid: ${result.vapid_configured ? '✅' : '❌'}`,
        `push: ${result.push_sent}/${result.total_subscriptions}`,
      ];
      if (result.push_errors?.length) {
        statusParts.push(`ошибки: ${result.push_errors.length}`);
      }

      toast({
        title: result.push_sent > 0 ? '✅ Push отправлен!' : '⚠️ Push не доставлен',
        description: statusParts.join(' · '),
        variant: result.push_sent > 0 ? 'default' : 'destructive',
      });

      console.log('[push-test] Response:', { ...result, push_errors: result.push_errors?.map((e: string) => e.substring(0, 80)) });
    } catch (e: any) {
      toast({ title: 'Ошибка теста', description: e?.message || 'Не удалось отправить', variant: 'destructive' });
    }
  };

  // ── Reset subscription ──────────────────────────────────────────
  const handleResetSubscription = async () => {
    setIsResetting(true);
    try {
      await resetPushSubscription();
      setIsPushEnabled(true);
      await refreshDiagnostics();
      toast({ title: '✅ Подписка пересоздана', description: 'Push-подписка обновлена с текущим VAPID-ключом' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: getFriendlyError(error), variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  // ── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setIsChecking(true);
      if ('Notification' in window) setNotificationPermission(Notification.permission);
      const isSubscribed = await checkPushSubscription();
      setIsPushEnabled(isSubscribed);
      await refreshDiagnostics();
      setIsChecking(false);
    };
    init();
  }, []);

  // Listen for permission changes
  useEffect(() => {
    try {
      (navigator as any).permissions?.query?.({ name: 'notifications' as any })
        ?.then((status: any) => {
          status.addEventListener?.('change', () => setNotificationPermission(Notification.permission));
        })
        ?.catch(() => {});
    } catch {}
  }, []);

  // ── Toggle push ─────────────────────────────────────────────────
  const handleTogglePush = async (enabled: boolean) => {
    setIsSubscribing(true);
    try {
      if (enabled) {
        await subscribeToPushNotifications();
        setIsPushEnabled(true);
        setNotificationPermission('granted');
        await refreshDiagnostics();
        toast({ title: '✅ Push-уведомления включены', description: 'Уведомления будут приходить даже при закрытом браузере' });
      } else {
        const ok = await unsubscribeFromPushNotifications();
        if (ok) {
          setIsPushEnabled(false);
          await refreshDiagnostics();
          toast({ title: 'Push-уведомления отключены' });
        } else {
          toast({ title: 'Ошибка отключения', variant: 'destructive' });
        }
      }
    } catch (error: any) {
      console.error('[push] Toggle error:', error);
      toast({ title: 'Ошибка', description: getFriendlyError(error), variant: 'destructive' });
      // Refresh state
      setIsPushEnabled(await checkPushSubscription());
      await refreshDiagnostics();
    } finally {
      setIsSubscribing(false);
    }
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
  const hasBasics = 'Notification' in window && 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const isSupported = hasBasics && hasPushManager;
  const vapidValid = validateVapidKey().valid;
  const canSubscribe = isSupported && vapidValid && notificationPermission !== 'denied';
  const showIosInstallGuide = isIOS && !isStandalone;

  // Anomaly states
  const hasPermissionNoSub = notificationPermission === 'granted' && !isPushEnabled && isSupported;
  const hasBrowserSubNoDb = diagnostics?.existingSubscription && !diagnostics?.savedInDb;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Настройки уведомлений
          </CardTitle>
          <CardDescription>Управляйте push и звуковыми уведомлениями</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* ── iframe warning ──────────────────────────────────── */}
          {isInIframe && (
            <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
              <AlertDescription className="flex items-center justify-between gap-3">
                Push нельзя включить в предпросмотре.
                <Button variant="outline" size="sm" onClick={() => window.open(window.location.href, '_blank')}>Открыть в новой вкладке</Button>
              </AlertDescription>
            </Alert>
          )}

          {/* ── VAPID invalid ──────────────────────────────────── */}
          {diagnostics && !diagnostics.vapidKeyValid && (
            <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 dark:text-red-100">
                {diagnostics.vapidError || 'VAPID-ключ не настроен. Push-уведомления не будут работать.'}
              </AlertDescription>
            </Alert>
          )}

          {/* ── Sound section ──────────────────────────────────── */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <Volume2 className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="sound-toggle" className="text-base font-medium">Звуковые уведомления</Label>
                <p className="text-sm text-muted-foreground">Звук при получении уведомления</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sound-toggle" checked={isSoundEnabled} onCheckedChange={handleToggleSound} />
              <Button variant="outline" size="sm" onClick={() => { notificationSound.beep(); notificationSound.testSound(); }}>
                Тест
              </Button>
            </div>
          </div>

          {/* ── iOS install guide ──────────────────────────────── */}
          {showIosInstallGuide && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <BellOff className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Push-уведомления на iPhone</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Push работает только из установленного приложения (PWA). Сейчас вы в Safari.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-background border rounded-lg">
                <p className="text-sm font-medium mb-2">Как установить:</p>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Нажмите <strong>«Поделиться»</strong> (↑) внизу Safari</li>
                  <li>Выберите <strong>«На экран Домой»</strong></li>
                  <li>Нажмите <strong>«Добавить»</strong></li>
                  <li>Откройте приложение с иконки на экране «Домой»</li>
                  <li>Включите уведомления в настройках</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2 italic">⚠️ Требуется iOS 16.4+</p>
              </div>
            </div>
          )}

          {/* ── Push section (supported) ───────────────────────── */}
          {(isSupported || (isIOS && isStandalone)) && (
            <div className="space-y-3">
              {/* Success state */}
              {isPushEnabled && (
                <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    Web Push активны{diagnostics?.savedInDb ? ' и сохранены в базе' : ''}.
                    {diagnostics && ` Подписок в БД: ${diagnostics.dbSubscriptionCount}`}
                  </AlertDescription>
                </Alert>
              )}

              {/* iOS standalone — ready to subscribe */}
              {isIOS && isStandalone && !isPushEnabled && notificationPermission !== 'denied' && (
                <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    Приложение установлено! Включите переключатель ниже.
                  </AlertDescription>
                </Alert>
              )}

              {/* Anomaly: permission granted but no subscription */}
              {hasPermissionNoSub && (
                <Alert className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900 dark:text-orange-100 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="flex-1">Разрешение есть, но подписки нет. Включите переключатель или пересоздайте подписку.</span>
                    <Button variant="outline" size="sm" onClick={handleResetSubscription} disabled={isResetting} className="flex-shrink-0">
                      <RefreshCw className={`h-4 w-4 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                      Пересоздать
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Anomaly: browser sub exists but not in DB */}
              {hasBrowserSubNoDb && isPushEnabled && (
                <Alert className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900 dark:text-orange-100 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="flex-1">Подписка есть в браузере, но не сохранена в базу. Push не придут.</span>
                    <Button variant="outline" size="sm" onClick={handleResetSubscription} disabled={isResetting} className="flex-shrink-0">
                      <RefreshCw className={`h-4 w-4 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                      Пересоздать
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Main toggle row */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Globe className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="push-web" className="text-base font-medium">Web Push-уведомления</Label>
                    <p className="text-sm text-muted-foreground">Уведомления даже при закрытой вкладке</p>
                    {notificationPermission === 'denied' && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Разрешение отклонено. Измените в настройках.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    id="push-web"
                    checked={isPushEnabled}
                    onCheckedChange={handleTogglePush}
                    disabled={isChecking || isSubscribing || !canSubscribe}
                  />
                  {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const ok = await requestNotificationPermission();
                      setNotificationPermission(Notification.permission);
                      await refreshDiagnostics();
                      toast({
                        title: ok ? 'Разрешение получено' : 'Не получено',
                        description: ok ? 'Теперь включите переключатель' : 'Измените настройку в адресной строке',
                        variant: ok ? 'default' : 'destructive',
                      });
                    }}>
                      Разрешить
                    </Button>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleResetSubscription} disabled={isResetting || !canSubscribe}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                  Пересоздать подписку
                </Button>
                <Button variant="outline" size="sm" onClick={handleTestPush} disabled={!isPushEnabled}>
                  <Send className="h-4 w-4 mr-1" />
                  Тест
                </Button>
              </div>

              {/* Permission denied instructions */}
              {notificationPermission === 'denied' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium mb-1.5">Как включить уведомления:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    {isIOS ? (
                      <>
                        <li>Откройте «Настройки» → найдите Safari</li>
                        <li>Проверьте «Уведомления» для этого сайта</li>
                        <li>Или удалите приложение с экрана Домой и добавьте заново</li>
                      </>
                    ) : (
                      <>
                        <li>Нажмите на иконку замка/настроек в адресной строке</li>
                        <li>Найдите «Уведомления» → «Разрешить»</li>
                        <li>Обновите страницу</li>
                      </>
                    )}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* ── Not supported at all ───────────────────────────── */}
          {!isSupported && !showIosInstallGuide && (
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Push-уведомления недоступны</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ваш браузер не поддерживает Web Push. Попробуйте Chrome, Firefox или Edge.
                </p>
              </div>
            </div>
          )}

          {/* ── Diagnostics panel ──────────────────────────────── */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={async () => {
                if (!showDiagnostics) await refreshDiagnostics();
                setShowDiagnostics(!showDiagnostics);
              }}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Диагностика Push
              </span>
              {showDiagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDiagnostics && diagnostics && (
              <div className="p-3 border-t space-y-2 bg-muted/20">
                <DiagItem ok={diagnostics.isHttps} label="HTTPS" detail={diagnostics.isHttps ? 'Безопасное соединение' : 'Push требует HTTPS'} />
                <DiagItem ok={diagnostics.hasServiceWorker} label="Service Worker API" />
                <DiagItem ok={diagnostics.serviceWorkerReady} label={`Service Worker: ${diagnostics.serviceWorkerState}`} detail={!diagnostics.serviceWorkerReady ? 'Попробуйте обновить страницу' : undefined} />
                <DiagItem ok={diagnostics.hasNotificationAPI} label="Notification API" />
                <DiagItem ok={diagnostics.hasPushManager} label="PushManager API" detail={!diagnostics.hasPushManager && diagnostics.isIOS ? 'На iPhone доступен только в PWA (с экрана Домой)' : undefined} />
                <DiagItem ok={diagnostics.notificationPermission === 'granted'} label={`Разрешение: ${diagnostics.notificationPermission}`} />
                <DiagItem ok={diagnostics.vapidKeyValid} label="VAPID ключ" detail={diagnostics.vapidError} />
                <DiagItem ok={diagnostics.existingSubscription} label={diagnostics.existingSubscription ? 'Подписка в браузере: есть' : 'Подписка в браузере: нет'} />
                <DiagItem ok={diagnostics.savedInDb} label={`В базе данных: ${diagnostics.dbSubscriptionCount} подписок`} />
                {diagnostics.isIOS && (
                  <DiagItem ok={diagnostics.isStandalone} label={diagnostics.isStandalone ? 'iPhone PWA (standalone)' : 'iPhone Safari (не standalone)'} detail={!diagnostics.isStandalone ? 'Установите на экран Домой для push' : undefined} />
                )}
                <div className="pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={refreshDiagnostics} className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" /> Обновить
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile native info ─────────────────────────────── */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Для нативного iOS/Android приложения push работает через Capacitor автоматически после сборки.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <NotificationsFAQ />
    </div>
  );
};
