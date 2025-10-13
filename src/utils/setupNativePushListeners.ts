import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/components/ui/use-toast';

export const setupNativePushListeners = () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Show us the notification payload when the app is in the foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
    
    toast({
      title: notification.title || 'Новое уведомление',
      description: notification.body,
    });
  });

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification action performed:', notification);
    
    // You can navigate to specific screens based on notification data
    const data = notification.notification.data;
    if (data?.type) {
      // Handle navigation based on notification type
      console.log('Notification type:', data.type);
    }
  });
};
