import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, Smartphone, Globe, CheckCircle2, AlertCircle, Volume2, Send, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  checkPushSubscription,
  requestNotificationPermission,
  diagnosePush,
  resetPushSubscription,
  type PushDiagnostics,
} from '@/utils/pushNotifications';
import { notificationSound } from '@/utils/notificationSound';
import { NotificationsFAQ } from './NotificationsFAQ';
import { supabase } from '@/integrations/supabase/client';

const diagnosisMessages: Record<string, string> = {
  permission_denied: 'Разрешение на уведомления отклонено. Измените в настройках браузера.',
  vapid_missing: 'VAPID-ключ не настроен. Обратитесь к администратору.',
  sw_unsupported: 'Браузер не поддерживает Service Worker.',
  push_unsupported: 'PushManager недоступен. На iPhone откройте как приложение с экрана «Домой».',
  sw_register_failed: 'Не удалось зарегистрировать Service Worker.',
  sw_not_ready: 'Service Worker не готов. Попробуйте обновить страницу.',
  subscribe_failed: 'Не удалось создать push-подписку. Попробуйте пересоздать подписку.',
  not_authenticated: 'Вы не авторизованы. Войдите в аккаунт.',
  db_error: 'Ошибка сохранения подписки в базу данных.',
  native_registration_failed: 'Ошибка регистрации нативных уведомлений.',
};

function getFriendlyError(error: any): string {
  const msg = error?.message || String(error);
  const code = msg.split(':')[0];
  return diagnosisMessages[code] || msg;
}

export const NotificationSettings = () => {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSoundEnabled, setIsSoundEnabled] = useState(notificationSound.isEnabled());
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics | null>(null);
  const { toast } = useToast();
  const isInIframe = typeof window !== 'undefined' && window.top !== window.self;

  const handleToggleSound = (enabled: boolean) => {
    notificationSound.setEnabled(enabled);
    setIsSoundEnabled(enabled);
    toast({
      title: enabled ? 'Звук включен' : 'Звук отключен',
      description: enabled ? 'Вы будете слышать звуковые уведомления' : 'Звуковые уведомления отключены',
    });
  };

  const handleTestSound = () => {
    notificationSound.testSound();
    toast({
      title: 'Тест звука',
      description: 'Проверьте, слышен ли звук. Если нет — проверьте громкость устройства.',
    });
  };

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
          message: 'Если вы видите это — Web Push работает',
          type: 'system',
          data: { source: 'test' },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Ошибка отправки',
          description: result?.error || `HTTP ${response.status}`,
          variant: 'destructive',
        });
        return;
      }

      const desc = `push_sent: ${result.push_sent}, подписок: ${result.total_subscriptions}`;
      toast({
        title: result.push_sent > 0 ? '✅ Push отправлен' : '⚠️ Нет активных подписок',
        description: desc,
        variant: result.push_sent > 0 ? 'default' : 'destructive',
      });
      console.log('Test push response:', result);
    } catch (e: any) {
      console.error('Test push failed:', e);
      toast({ title: 'Ошибка отправки теста', description: e?.message || 'Не удалось отправить уведомление', variant: 'destructive' });
    }
  };

  const handleResetSubscription = async () => {
    setIsResetting(true);
    try {
      await resetPushSubscription();
      setIsPushEnabled(true);
      toast({
        title: 'Подписка пересоздана',
        description: 'Push-подписка обновлена с текущим VAPID-ключом',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка пересоздания',
        description: getFriendlyError(error),
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      setIsChecking(true);
      
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
      
      const isSubscribed = await checkPushSubscription();
      setIsPushEnabled(isSubscribed);

      const diag = await diagnosePush();
      setDiagnostics(diag);
      
      setIsChecking(false);
    };

    checkStatus();
  }, []);

  useEffect(() => {
    try {
      const anyNav: any = navigator as any;
      if (anyNav.permissions?.query) {
        anyNav.permissions
          .query({ name: 'notifications' as any })
          .then((status: any) => {
            const update = () => setNotificationPermission(Notification.permission);
            status.addEventListener?.('change', update);
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const handleTogglePush = async (enabled: boolean) => {
    try {
      if (enabled) {
        const hasPermission = await requestNotificationPermission();
        
        if (!hasPermission) {
          toast({
            title: 'Разрешение отклонено',
            description: 'Вы отклонили разрешение на уведомления. Пожалуйста, измените настройки браузера.',
            variant: 'destructive',
          });
          return;
        }

        try {
          const success = await subscribeToPushNotifications();
          
          if (success) {
            setIsPushEnabled(true);
            setNotificationPermission('granted');
            toast({
              title: 'Push-уведомления включены',
              description: 'Вы будете получать уведомления даже когда приложение закрыто',
            });
          } else {
            setIsPushEnabled(await checkPushSubscription());
            toast({
              title: 'Не удалось включить',
              description: 'Попробуйте ещё раз или проверьте настройки браузера.',
              variant: 'destructive',
            });
          }
        } catch (subscribeError: any) {
          console.error('Subscribe error:', subscribeError);
          toast({
            title: 'Ошибка подписки',
            description: getFriendlyError(subscribeError),
            variant: 'destructive',
          });
        }
      } else {
        const success = await unsubscribeFromPushNotifications();
        
        if (success) {
          setIsPushEnabled(false);
          toast({
            title: 'Push-уведомления отключены',
            description: 'Вы больше не будете получать push-уведомления',
          });
        } else {
          toast({
            title: 'Ошибка',
            description: 'Не удалось отключить push-уведомления',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при изменении настроек',
        variant: 'destructive',
      });
    }
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const hasBasics = 'Notification' in window && 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const isSupported = hasBasics && (hasPushManager || (isIOS && isStandalone));
  const showResetButton = isStandalone && notificationPermission === 'granted' && !isPushEnabled;

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Настройки уведомлений
        </CardTitle>
        <CardDescription>
          Управляйте способами получения уведомлений
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isInIframe && (
          <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
            <AlertDescription className="flex items-center justify-between gap-3">
              Web Push нельзя активировать внутри предпросмотра. Откройте приложение в новой вкладке и включите уведомления там.
              <Button variant="outline" size="sm" onClick={() => window.open(window.location.href, '_blank')}>Открыть</Button>
            </AlertDescription>
          </Alert>
        )}

        {/* VAPID key missing warning */}
        {diagnostics && !diagnostics.vapidKeyAvailable && (
          <Alert className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900 dark:text-orange-100">
              VAPID-ключ не настроен. Push-уведомления не будут работать. Обратитесь к администратору.
            </AlertDescription>
          </Alert>
        )}

        {/* Sound notifications */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3 flex-1">
            <Volume2 className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="sound-notifications" className="text-base font-medium">
                Звуковые уведомления
              </Label>
              <p className="text-sm text-muted-foreground">
                Воспроизводить звук при получении новых уведомлений
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="sound-notifications"
              checked={isSoundEnabled}
              onCheckedChange={handleToggleSound}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { notificationSound.beep(); notificationSound.testSound(); }}
            >
              Тест
            </Button>
          </div>
        </div>

        {!isSupported ? (
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Push-уведомления недоступны</p>
                {isIOS && !isStandalone ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    На iPhone push-уведомления работают только для установленных веб‑приложений.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Ваш браузер/среда не поддерживает Web Push. Попробуйте Chrome/Firefox/Edge на Android или установите как веб‑приложение.
                  </p>
                )}
              </div>
              
              {isIOS && !isStandalone && (
                <div className="p-3 bg-background border rounded-lg">
                  <p className="text-sm font-medium mb-2">Как установить приложение на iPhone:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Нажмите кнопку <strong>«Поделиться»</strong> (квадрат со стрелкой ↑) внизу Safari</li>
                    <li>Прокрутите вниз и выберите <strong>«На экран Домой»</strong></li>
                    <li>Нажмите <strong>«Добавить»</strong> в правом верхнем углу</li>
                    <li>Откройте приложение с экрана «Домой» (иконка EventBalance)</li>
                    <li>Вернитесь в настройки и включите уведомления</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    ⚠️ Требуется iOS 16.4 или новее
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isPushEnabled && (
              <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-900 dark:text-green-100">
                  Web Push-уведомления активны. Вы будете получать уведомления даже при закрытой вкладке.
                </AlertDescription>
              </Alert>
            )}

            {isIOS && isStandalone && !isPushEnabled && (
              <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  Приложение установлено! Теперь включите переключатель ниже, чтобы получать push-уведомления.
                </AlertDescription>
              </Alert>
            )}

            {/* Reset subscription button for iOS standalone with permission but no subscription */}
            {showResetButton && (
              <Alert className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-900 dark:text-orange-100 flex items-center justify-between gap-3">
                  <span>Разрешение есть, но подписка не найдена. Попробуйте пересоздать.</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetSubscription}
                    disabled={isResetting}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                    Пересоздать
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="push-web" className="text-base font-medium">
                    Web Push-уведомления
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Получайте уведомления в браузере, даже когда вкладка закрыта
                  </p>
                  {notificationPermission === 'denied' && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Разрешение отклонено. Измените настройки браузера.
                    </p>
                  )}
                  {notificationPermission === 'granted' && !isPushEnabled && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Разрешение получено. Включите уведомления.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="push-web"
                  checked={isPushEnabled}
                  onCheckedChange={handleTogglePush}
                  disabled={isChecking || notificationPermission === 'denied' || (diagnostics && !diagnostics.vapidKeyAvailable)}
                />
                {notificationPermission !== 'granted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const ok = await requestNotificationPermission();
                      const status = Notification.permission;
                      setNotificationPermission(status);
                      toast({
                        title: ok ? 'Разрешение получено' : 'Разрешение не предоставлено',
                        description: ok ? 'Теперь включите переключатель' : 'Измените настройку сайта в адресной строке',
                        variant: ok ? 'default' : 'destructive',
                      });
                    }}
                  >
                    Разрешить
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleTestPush} disabled={!isPushEnabled}>
                  <Send className="h-4 w-4 mr-1" />
                  Тест
                </Button>
              </div>
            </div>

            {notificationPermission === 'denied' && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium mb-2">
                  Как включить уведомления:
                </p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Нажмите на иконку замка в адресной строке</li>
                  <li>Найдите настройку "Уведомления"</li>
                  <li>Измените на "Разрешить"</li>
                  <li>Обновите страницу</li>
                </ol>
              </div>
            )}

            {notificationPermission === 'default' && (
              <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  При включении переключателя браузер запросит разрешение на уведомления. Нажмите "Разрешить".
                </AlertDescription>
              </Alert>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Мобильные уведомления
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Для мобильных приложений (iOS/Android) используется Capacitor Push Notifications. 
                    После экспорта проекта в Github и сборки мобильного приложения, уведомления будут работать автоматически.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <NotificationsFAQ />
    </div>
  );
};
