import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Setting up real-time subscriptions');

    const channel = supabase
      .channel('db-changes')
      // Financial transactions updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions'
        },
        (payload) => {
          console.log('[Realtime] Financial transaction update:', payload);
          queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
          queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
      )
      // Reports updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_reports'
        },
        (payload) => {
          console.log('[Realtime] Report update:', payload);
          queryClient.invalidateQueries({ queryKey: ['event-reports'] });
        }
      )
      // Salary updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_report_salaries'
        },
        (payload) => {
          console.log('[Realtime] Salary update:', payload);
          queryClient.invalidateQueries({ queryKey: ['event-reports'] });
        }
      )
      // Events updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('[Realtime] Event update:', payload);
          queryClient.invalidateQueries({ queryKey: ['events'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      // Profiles updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('[Realtime] Profile update:', payload);
          queryClient.invalidateQueries({ queryKey: ['profiles'] });
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          queryClient.invalidateQueries({ queryKey: ['all-advances'] });
          queryClient.invalidateQueries({ queryKey: ['my-advance'] });
        }
      )
      // Vacations updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vacations'
        },
        (payload) => {
          console.log('[Realtime] Vacation update:', payload);
          queryClient.invalidateQueries({ queryKey: ['vacations'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up subscriptions');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
