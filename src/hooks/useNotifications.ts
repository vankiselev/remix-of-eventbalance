import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';
import { useDebounce } from '@/hooks/useDebounce';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'report' | 'salary' | 'event' | 'vacation' | 'transaction' | 'system' | 'money_transfer';
  read: boolean;
  data?: any;
  created_at: string;
  updated_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pendingNotificationsRef = useRef<Notification[]>([]);
  const debouncedNotifications = useDebounce(pendingNotificationsRef.current, 500);

  const fetchNotifications = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data as any) || [];
      setNotifications(list);
      seenIdsRef.current = new Set(list.map((n: Notification) => n.id));
      setUnreadCount(list.filter((n: Notification) => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отметить уведомление как прочитанное',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      toast({
        title: 'Успешно',
        description: 'Все уведомления отмечены как прочитанные',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отметить все уведомления',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast({
        title: 'Успешно',
        description: 'Уведомление удалено',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить уведомление',
        variant: 'destructive',
      });
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);

      toast({
        title: 'Успешно',
        description: 'Все уведомления удалены',
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить все уведомления',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchNotifications();

    let cleanup: (() => void) | undefined;

    // Subscribe to realtime updates
    const setupRealtimeSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) return;

      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            console.log('Notification change:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification;
              if (seenIdsRef.current.has(newNotif.id)) {
                return; // prevent duplicates
              }
              seenIdsRef.current.add(newNotif.id);
              setNotifications(prev => [newNotif, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              // Add to pending queue for debounced notification
              pendingNotificationsRef.current = [...pendingNotificationsRef.current, newNotif];
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Notification;
              if (!seenIdsRef.current.has(updated.id)) {
                seenIdsRef.current.add(updated.id);
              }
              setNotifications(prev =>
                prev.map(n => n.id === updated.id ? updated : n)
              );
            } else if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as any)?.id;
              if (oldId) {
                seenIdsRef.current.delete(oldId);
              }
              setNotifications(prev => prev.filter(n => n.id !== oldId));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  // Handle debounced notifications
  useEffect(() => {
    if (debouncedNotifications.length > 0) {
      // Play sound once for all notifications
      notificationSound.play();
      
      // Show toast for the latest notification
      const latest = debouncedNotifications[debouncedNotifications.length - 1];
      if (debouncedNotifications.length === 1) {
        toast({
          title: latest.title,
          description: latest.message,
        });
      } else {
        toast({
          title: 'Новые уведомления',
          description: `Получено ${debouncedNotifications.length} новых уведомлений`,
        });
      }
      
      // Clear the pending queue
      pendingNotificationsRef.current = [];
    }
  }, [debouncedNotifications, toast]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotifications,
  };
};
