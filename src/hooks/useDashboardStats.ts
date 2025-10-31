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
      // Using direct queries with correct column names
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false);

      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('income_amount, expense_amount, cash_type');

      let totalIncome = 0;
      let totalExpenses = 0;
      let nastyaCash = 0;
      let leraCash = 0;
      let vanyaCash = 0;

      transactions?.forEach(t => {
        if (t.income_amount) totalIncome += t.income_amount;
        if (t.expense_amount) totalExpenses += t.expense_amount;
        
        const netAmount = (t.income_amount || 0) - (t.expense_amount || 0);
        if (t.cash_type === 'nastya') nastyaCash += netAmount;
        else if (t.cash_type === 'lera') leraCash += netAmount;
        else if (t.cash_type === 'vanya') vanyaCash += netAmount;
      });

      const totalCash = nastyaCash + leraCash + vanyaCash;
      const profit = totalIncome - totalExpenses;

      const stats: DashboardStats = {
        total_events: eventsCount || 0,
        upcoming_events: eventsCount || 0,
        today_events: 0,
        this_week_events: 0,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        profit,
        cash_on_hand: totalCash,
        nastya_cash: nastyaCash,
        lera_cash: leraCash,
        vanya_cash: vanyaCash,
      };
      
      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
