import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Smartphone, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  checkPushSubscription,
  requestNotificationPermission 
} from '@/utils/pushNotifications';

export const NotificationSettings = () => {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

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
          toast({
            title: 'Ошибка',
            description: 'Не удалось включить push-уведомления',
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

  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  return (
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
        {!isSupported ? (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Push-уведомления недоступны</p>
              <p className="text-xs text-muted-foreground">
                Ваш браузер не поддерживает push-уведомления
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                    <p className="text-xs text-destructive mt-1">
                      Разрешение отклонено. Измените настройки браузера.
                    </p>
                  )}
                </div>
              </div>
              <Switch
                id="push-web"
                checked={isPushEnabled}
                onCheckedChange={handleTogglePush}
                disabled={isChecking || notificationPermission === 'denied'}
              />
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
  );
};
