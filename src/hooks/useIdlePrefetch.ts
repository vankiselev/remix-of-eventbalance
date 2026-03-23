import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Prefetches data for the most visited sections after the app initializes.
 * Runs once after a short idle delay to avoid competing with critical renders.
 */
export function useIdlePrefetch() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user) return;

    const prefetch = () => {
      // Prefetch upcoming events (used by dashboard + events page)
      queryClient.prefetchQuery({
        queryKey: ['upcoming-events'],
        queryFn: async () => {
          const today = new Date().toISOString().split('T')[0];
          const { data } = await supabase
            .from('events')
            .select('id, name, start_date, event_time, end_time, location, status')
            .gte('start_date', today)
            .eq('is_archived', false)
            .order('start_date', { ascending: true })
            .limit(10);
          return data || [];
        },
        staleTime: 3 * 60 * 1000,
      });

      // Prefetch user's own transactions (most visited tab in finances)
      queryClient.prefetchQuery({
        queryKey: ['transactions', user.id, false, 50],
        queryFn: async () => {
          const { data } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('created_by', user.id)
            .order('operation_date', { ascending: false })
            .limit(50);
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      });

      // Prefetch user cash summary
      queryClient.prefetchQuery({
        queryKey: ['user-cash-summary', user.id],
        queryFn: async () => {
          const { data } = await supabase.rpc('calculate_user_cash_totals', { p_user_id: user.id });
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      });
    };

    // Use requestIdleCallback if available, else setTimeout
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(prefetch, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isAdmin, queryClient]);
}
