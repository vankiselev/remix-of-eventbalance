import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';

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
  const { toast } = useToast();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueueRef = useRef<Notification[]>([]);

  // Derive unreadCount from notifications — single source of truth
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data as Notification[]) || [];
      setNotifications(list);
      seenIdsRef.current = new Set(list.map(n => n.id));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const flushPendingNotifications = useCallback(() => {
    const queue = pendingQueueRef.current;
    if (queue.length === 0) return;

    notificationSound.play();

    if (queue.length === 1) {
      toast({ title: queue[0].title, description: queue[0].message });
    } else {
      toast({
        title: 'Новые уведомления',
        description: `Получено ${queue.length} новых уведомлений`,
      });
    }

    pendingQueueRef.current = [];
  }, [toast]);

  const enqueuePendingNotification = useCallback((notif: Notification) => {
    pendingQueueRef.current.push(notif);

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(flushPendingNotifications, 500);
  }, [flushPendingNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отметить уведомление как прочитанное',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const markAllAsRead = useCallback(async () => {
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
  }, [toast]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

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
  }, [toast]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.user.id);

      if (error) throw error;

      setNotifications([]);

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
  }, [toast]);

  useEffect(() => {
    fetchNotifications();

    let cleanup: (() => void) | undefined;

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
            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification;
              if (seenIdsRef.current.has(newNotif.id)) return;
              seenIdsRef.current.add(newNotif.id);
              setNotifications(prev => [newNotif, ...prev]);
              enqueuePendingNotification(newNotif);
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Notification;
              seenIdsRef.current.add(updated.id);
              setNotifications(prev =>
                prev.map(n => n.id === updated.id ? updated : n)
              );
            } else if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as any)?.id;
              if (oldId) {
                seenIdsRef.current.delete(oldId);
                setNotifications(prev => prev.filter(n => n.id !== oldId));
              }
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
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [fetchNotifications, enqueuePendingNotification]);

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
