import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, BellOff, Globe, CheckCircle2, AlertCircle, Volume2, 
  Send, RefreshCw, Eye, Smartphone, ChevronDown, ChevronUp 
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
  permission_denied: 'Разрешение на уведомления отклонено. Измените в настройках браузера.',
  vapid_invalid: 'VAPID-ключ невалиден. Обратитесь к администратору.',
  vapid_missing: 'VAPID-ключ не настроен. Обратитесь к администратору.',
  sw_unsupported: 'Браузер не поддерживает Service Worker.',
  push_unsupported: 'PushManager недоступен. На iPhone — откройте с экрана «Домой».',
  sw_register_failed: 'Не удалось зарегистрировать Service Worker.',
  sw_not_ready: 'Service Worker не готов. Обновите страницу.',
  subscribe_failed: 'Не удалось создать подписку. Попробуйте «Пересоздать».',
  not_authenticated: 'Вы не авторизованы.',
  db_error: 'Ошибка сохранения. Попробуйте ещё раз.',
  native_error: 'Ошибка нативных уведомлений.',
  ios_not_standalone: 'На iPhone push работает только с экрана «Домой».',
};

function getFriendlyError(error: any): string {
  const msg = error?.message || String(error);
  const code = msg.split(':')[0]?.trim();
  return ERROR_MESSAGES[code] || msg;
}

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

  const handleToggleSound = (enabled: boolean) => {
    notificationSound.setEnabled(enabled);
    setIsSoundEnabled(enabled);
    toast({ title: enabled ? 'Звук включен' : 'Звук отключен' });
  };

  const handleTestPush = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Не авторизован', variant: 'destructive' });
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
          message: 'Web Push работает! 🎉',
          type: 'system',
          data: { source: 'test' },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({ title: 'Ошибка', description: result?.error || `HTTP ${response.status}`, variant: 'destructive' });
        return;
      }

      const parts = [`push: ${result.push_sent}/${result.valid_subscriptions}`];
      if (result.invalid_removed > 0) parts.push(`удалено невалидных: ${result.invalid_removed}`);
      if (result.push_errors?.length) parts.push(`ошибки: ${result.push_errors.length}`);

      toast({
        title: result.push_sent > 0 ? '✅ Push отправлен' : '⚠️ Push не доставлен',
        description: parts.join(' · '),
        variant: result.push_sent > 0 ? 'default' : 'destructive',
      });

      // Refresh diagnostics after test
      await refreshDiagnostics();
    } catch (e: any) {
      toast({ title: 'Ошибка теста', description: e?.message || 'Не удалось отправить', variant: 'destructive' });
    }
  };

  const handleResetSubscription = async () => {
    setIsResetting(true);
    try {
      await resetPushSubscription();
      setIsPushEnabled(true);
      await refreshDiagnostics();
      toast({ title: '✅ Подписка пересоздана' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: getFriendlyError(error), variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

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

  useEffect(() => {
    try {
      (navigator as any).permissions?.query?.({ name: 'notifications' as any })
        ?.then((status: any) => {
          status.addEventListener?.('change', () => setNotificationPermission(Notification.permission));
        })
        ?.catch(() => {});
    } catch {}
  }, []);

  const handleTogglePush = async (enabled: boolean) => {
    setIsSubscribing(true);
    try {
      if (enabled) {
        await subscribeToPushNotifications();
        setIsPushEnabled(true);
        setNotificationPermission('granted');
        await refreshDiagnostics();
        toast({ title: '✅ Push включены' });
      } else {
        const ok = await unsubscribeFromPushNotifications();
        if (ok) {
          setIsPushEnabled(false);
          await refreshDiagnostics();
          toast({ title: 'Push отключены' });
        }
      }
    } catch (error: any) {
      toast({ title: 'Ошибка', description: getFriendlyError(error), variant: 'destructive' });
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
  const hasPermissionNoSub = notificationPermission === 'granted' && !isPushEnabled && isSupported;
  const hasBrowserSubNoDb = diagnostics?.existingSubscription && !diagnostics?.savedInDb;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
          <CardDescription>Push и звуковые уведомления</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {isInIframe && (
            <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
              <AlertDescription className="flex items-center justify-between gap-3 text-sm">
                Push нельзя включить в предпросмотре.
                <Button variant="outline" size="sm" onClick={() => window.open(window.location.href, '_blank')}>Открыть</Button>
              </AlertDescription>
            </Alert>
          )}

          {diagnostics && !diagnostics.vapidKeyValid && (
            <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900 dark:text-red-100">
                {diagnostics.vapidError || 'VAPID не настроен. Push не будут работать.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Sound */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Volume2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <Label htmlFor="sound-toggle" className="text-sm font-medium">Звук</Label>
                <p className="text-xs text-muted-foreground">При получении уведомления</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Switch id="sound-toggle" checked={isSoundEnabled} onCheckedChange={handleToggleSound} />
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { notificationSound.beep(); notificationSound.testSound(); }}>
                Тест
              </Button>
            </div>
          </div>

          {/* iOS install guide */}
          {showIosInstallGuide && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <BellOff className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Push на iPhone</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Работает только из установленного приложения (PWA).
                  </p>
                </div>
              </div>
              <div className="p-2.5 bg-background border rounded-lg">
                <p className="text-xs font-medium mb-1.5">Как установить:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Нажмите <strong>«Поделиться»</strong> (↑) внизу Safari</li>
                  <li>Выберите <strong>«На экран Домой»</strong></li>
                  <li>Откройте с иконки → включите уведомления</li>
                </ol>
                <p className="text-[11px] text-muted-foreground mt-1.5 italic">Требуется iOS 16.4+</p>
              </div>
            </div>
          )}

          {/* Push section */}
          {(isSupported || (isIOS && isStandalone)) && (
            <div className="space-y-3">
              {isPushEnabled && (
                <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-sm text-green-900 dark:text-green-100">
                    Push активны{diagnostics?.savedInDb ? ` · в БД: ${diagnostics.dbSubscriptionCount}` : ''}
                  </AlertDescription>
                </Alert>
              )}

              {isIOS && isStandalone && !isPushEnabled && notificationPermission !== 'denied' && (
                <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">Приложение установлено! Включите push ниже.</AlertDescription>
                </Alert>
              )}

              {hasPermissionNoSub && (
                <Alert className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-sm flex items-center justify-between gap-2">
                    <span>Разрешение есть, подписки нет</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0" onClick={handleResetSubscription} disabled={isResetting}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                      Создать
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {hasBrowserSubNoDb && isPushEnabled && (
                <Alert className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-sm flex items-center justify-between gap-2">
                    <span>Подписка есть, но не в БД</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0" onClick={handleResetSubscription} disabled={isResetting}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                      Починить
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Main toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Globe className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <Label htmlFor="push-web" className="text-sm font-medium">Web Push</Label>
                    <p className="text-xs text-muted-foreground">Уведомления при закрытой вкладке</p>
                    {notificationPermission === 'denied' && (
                      <p className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Разрешение отклонено
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    id="push-web"
                    checked={isPushEnabled}
                    onCheckedChange={handleTogglePush}
                    disabled={isChecking || isSubscribing || !canSubscribe}
                  />
                  {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={async () => {
                      const ok = await requestNotificationPermission();
                      setNotificationPermission(Notification.permission);
                      await refreshDiagnostics();
                      toast({
                        title: ok ? 'Разрешение получено' : 'Не получено',
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
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleResetSubscription} disabled={isResetting || !canSubscribe}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                  Пересоздать
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleTestPush} disabled={!isPushEnabled}>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Тест
                </Button>
              </div>

              {notificationPermission === 'denied' && (
                <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-xs text-destructive font-medium mb-1">Как включить:</p>
                  <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                    {isIOS ? (
                      <>
                        <li>Настройки → Safari → Уведомления</li>
                        <li>Или удалите и добавьте PWA заново</li>
                      </>
                    ) : (
                      <>
                        <li>Нажмите замок в адресной строке → Уведомления → Разрешить</li>
                        <li>Обновите страницу</li>
                      </>
                    )}
                  </ol>
                </div>
              )}
            </div>
          )}

          {!isSupported && !showIosInstallGuide && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <BellOff className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">Push недоступны. Попробуйте Chrome, Firefox или Edge.</p>
            </div>
          )}

          {/* Diagnostics */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={async () => {
                if (!showDiagnostics) await refreshDiagnostics();
                setShowDiagnostics(!showDiagnostics);
              }}
              className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Диагностика
              </span>
              {showDiagnostics ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showDiagnostics && diagnostics && (
              <div className="p-2.5 border-t space-y-1.5 bg-muted/20">
                <DiagItem ok={diagnostics.isHttps} label="HTTPS" />
                <DiagItem ok={diagnostics.hasServiceWorker} label="Service Worker API" />
                <DiagItem ok={diagnostics.serviceWorkerReady} label={`SW: ${diagnostics.serviceWorkerState}`} />
                <DiagItem ok={diagnostics.hasPushManager} label="PushManager" detail={!diagnostics.hasPushManager && diagnostics.isIOS ? 'На iPhone — только в PWA' : undefined} />
                <DiagItem ok={diagnostics.notificationPermission === 'granted'} label={`Разрешение: ${diagnostics.notificationPermission}`} />
                <DiagItem ok={diagnostics.vapidKeyValid} label="VAPID" detail={diagnostics.vapidError} />
                <DiagItem ok={diagnostics.existingSubscription} label={`Браузер: ${diagnostics.existingSubscription ? 'подписка есть' : 'нет'}`} />
                <DiagItem ok={diagnostics.savedInDb} label={`БД: ${diagnostics.dbSubscriptionCount} подписок`} />
                {diagnostics.isIOS && (
                  <DiagItem ok={diagnostics.isStandalone} label={diagnostics.isStandalone ? 'PWA (standalone)' : 'Safari (не PWA)'} />
                )}
                <div className="pt-1.5 border-t">
                  <Button variant="ghost" size="sm" onClick={refreshDiagnostics} className="text-xs h-7">
                    <RefreshCw className="h-3 w-3 mr-1" /> Обновить
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Нативные iOS/Android push работают через Capacitor после сборки.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <NotificationsFAQ />
    </div>
  );
};
