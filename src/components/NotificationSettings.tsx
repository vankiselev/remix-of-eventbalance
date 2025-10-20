import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, Smartphone, Globe, CheckCircle2, AlertCircle, Volume2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  checkPushSubscription,
  requestNotificationPermission 
} from '@/utils/pushNotifications';
import { notificationSound } from '@/utils/notificationSound';
import { NotificationsFAQ } from './NotificationsFAQ';
import { supabase } from '@/integrations/supabase/client';

export const NotificationSettings = () => {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSoundEnabled, setIsSoundEnabled] = useState(notificationSound.isEnabled());
  const { toast } = useToast();

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
      const { error, data } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Тестовое уведомление',
          message: 'Если вы видите это — Web Push работает',
          type: 'system',
          data: { source: 'test' },
        }
      });
      if (error) throw error;
      toast({ title: 'Отправлено', description: 'Проверьте уведомления (может прийти с задержкой 1-2 сек.)' });
      console.log('Test push response:', data);
    } catch (e: any) {
      console.error('Test push failed:', e);
      toast({ title: 'Ошибка отправки теста', description: e?.message || 'Не удалось отправить уведомление', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      setIsChecking(true);
      
      // Check notification permission
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
      
      // Check if already subscribed
      const isSubscribed = await checkPushSubscription();
      setIsPushEnabled(isSubscribed);
      
      setIsChecking(false);
    };

    checkStatus();
  }, []);

  const handleTogglePush = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request permission first
        const hasPermission = await requestNotificationPermission();
        
        if (!hasPermission) {
          toast({
            title: 'Разрешение отклонено',
            description: 'Вы отклонили разрешение на уведомления. Пожалуйста, измените настройки браузера.',
            variant: 'destructive',
          });
          return;
        }

        // Subscribe to push notifications
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
            description: 'Попробуйте ещё раз. Если не включается — откройте консоль (F12) → Console и пришлите ошибку.',
            variant: 'destructive',
          });
        }
      } else {
        // Unsubscribe from push notifications
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

  // iOS Safari supports Web Push only for installed Web Apps (Add to Home Screen)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const hasBasics = 'Notification' in window && 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const isSupported = hasBasics && (hasPushManager || (isIOS && isStandalone));

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
            <div>
              <p className="text-sm font-medium">Push-уведомления недоступны</p>
              {isIOS && !isStandalone ? (
                <p className="text-xs text-muted-foreground">
                  На iPhone push-уведомления работают только для установленных веб‑приложений. Добавьте приложение на экран Домой: Поделиться → На экран Домой, затем откройте его оттуда и включите уведомления.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ваш браузер/среда не поддерживает Web Push. Попробуйте Chrome/Firefox/Edge на Android или установите как веб‑приложение.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status indicator */}
            {isPushEnabled && (
              <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-900 dark:text-green-100">
                  Web Push-уведомления активны. Вы будете получать уведомления даже при закрытой вкладке.
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
                  disabled={isChecking || notificationPermission === 'denied'}
                />
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
