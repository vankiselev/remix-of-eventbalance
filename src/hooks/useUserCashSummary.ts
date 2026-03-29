// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

const defaultSummary: CashSummary = {
  total_cash: 0,
  cash_nastya: 0,
  cash_lera: 0,
  cash_vanya: 0,
};

// Parse result from either function signature:
// 1) Flat: [{total_cash, cash_nastya, cash_lera, cash_vanya}]
// 2) Grouped: [{cash_type, total_income, total_expense}, ...]
function parseCashResult(data: any[]): CashSummary {
  if (!data || data.length === 0) return defaultSummary;

  // Check if flat format (has total_cash key)
  if ('total_cash' in data[0]) {
    return {
      total_cash: Number(data[0].total_cash) || 0,
      cash_nastya: Number(data[0].cash_nastya) || 0,
      cash_lera: Number(data[0].cash_lera) || 0,
      cash_vanya: Number(data[0].cash_vanya) || 0,
    };
  }

  // Grouped format: aggregate from rows
  let cash_nastya = 0;
  let cash_lera = 0;
  let cash_vanya = 0;

  for (const row of data) {
    const net = (Number(row.total_income) || 0) - (Number(row.total_expense) || 0);
    const ct = (row.cash_type || '').trim();
    if (ct === 'Наличка Настя') cash_nastya += net;
    else if (ct === 'Наличка Лера') cash_lera += net;
    else if (ct === 'Наличка Ваня') cash_vanya += net;
  }

  const total_cash = cash_nastya + cash_lera + cash_vanya;
  return { total_cash, cash_nastya, cash_lera, cash_vanya };
}

export const useUserCashSummary = (userId: string | undefined) => {
  // Realtime invalidation handled by RealtimeSync in App.tsx
  return useQuery({
    queryKey: ['user-cash-summary', userId],
    queryFn: async () => {
      if (!userId) return defaultSummary;
      
      const { data, error } = await supabase.rpc('calculate_user_cash_totals', { 
        p_user_id: userId 
      });
      
      if (error) throw error;
      
      return parseCashResult(data as any[]);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
