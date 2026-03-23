import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';

/**
 * Prefetches data for the most visited sections after the app initializes.
 * Runs once after a short idle delay to avoid competing with critical renders.
 * 
 * IMPORTANT: Query keys and queryFn must exactly match the hooks that consume them,
 * otherwise React Query treats them as different queries and the prefetch is wasted.
 */
export function useIdlePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const prefetch = () => {
      // 1. Upcoming events — matches useUpcomingEvents hook exactly
      queryClient.prefetchQuery({
        queryKey: ['upcoming-events'],
        queryFn: async () => {
          const today = format(new Date(), 'yyyy-MM-dd');
          const weekLater = format(addDays(new Date(), 7), 'yyyy-MM-dd');
          const { data } = await supabase
            .from('events')
            .select('id, name, description, start_date, event_time, end_time, location, place, status')
            .gte('start_date', today)
            .lte('start_date', weekLater)
            .eq('is_archived', false)
            .neq('status', 'cancelled')
            .order('start_date', { ascending: true })
            .order('event_time', { ascending: true });
          return data || [];
        },
        staleTime: 3 * 60 * 1000,
      });

      // 2. User's own transactions — matches useTransactions({ userId: user.id }) key
      //    Key format: ['transactions', userId || 'all', limit || 'all']
      queryClient.prefetchQuery({
        queryKey: ['transactions', user.id, 'all'],
        queryFn: async () => {
          const { data } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('created_by', user.id)
            .eq('is_draft', false)
            .order('operation_date', { ascending: false });
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      });

      // 3. User cash summary — matches useUserCashSummary hook key
      queryClient.prefetchQuery({
        queryKey: ['user-cash-summary', user.id],
        queryFn: async () => {
          const { data } = await supabase.rpc('calculate_user_cash_totals', { p_user_id: user.id });
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      });

      // 4. Dashboard stats — matches useDashboardStats hook key
      queryClient.prefetchQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
          const { data } = await supabase.rpc('get_dashboard_stats');
          return data || {};
        },
        staleTime: 3 * 60 * 1000,
      });
    };

    // Phase 1: Prefetch data after idle
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(prefetch, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, queryClient]);

  // Phase 2: Preload popular route chunks after dashboard renders
  useEffect(() => {
    if (!user) return;

    const preloadChunks = () => {
      // These imports just trigger the chunk download, React.lazy will use the cached module
      import('../pages/FinancesPage');
      import('../pages/EventsPage');
      import('../pages/CalendarPageWrapper');
    };

    const timer = setTimeout(preloadChunks, 4000);
    return () => clearTimeout(timer);
  }, [user]);
}
