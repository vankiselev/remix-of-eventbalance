import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  total_events: number;
  upcoming_events: number;
  today_events: number;
  this_week_events: number;
  total_income: number;
  total_expenses: number;
  profit: number;
  cash_on_hand: number;
  nastya_cash: number;
  lera_cash: number;
  vanya_cash: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Use optimized RPC function instead of loading all transactions
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      
      if (error) throw error;
      
      const result = data as any;
      
      const stats: DashboardStats = {
        total_events: result?.total_events || 0,
        upcoming_events: result?.total_events || 0,
        today_events: 0,
        this_week_events: 0,
        total_income: result?.total_income || 0,
        total_expenses: result?.total_expenses || 0,
        profit: (result?.total_income || 0) - (result?.total_expenses || 0),
        cash_on_hand: (result?.cash_nastya || 0) + (result?.cash_lera || 0) + (result?.cash_vanya || 0),
        nastya_cash: result?.cash_nastya || 0,
        lera_cash: result?.cash_lera || 0,
        vanya_cash: result?.cash_vanya || 0,
      };
      
      return stats;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
