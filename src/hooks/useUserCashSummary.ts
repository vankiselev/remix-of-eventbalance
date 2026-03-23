// @ts-nocheck
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

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
  let total_cash = 0;
  let cash_nastya = 0;
  let cash_lera = 0;
  let cash_vanya = 0;

  for (const row of data) {
    const net = (Number(row.total_income) || 0) - (Number(row.total_expense) || 0);
    total_cash += net;
    const ct = (row.cash_type || '').trim();
    if (ct === 'Наличка Настя') cash_nastya += net;
    else if (ct === 'Наличка Лера') cash_lera += net;
    else if (ct === 'Наличка Ваня') cash_vanya += net;
  }

  return { total_cash, cash_nastya, cash_lera, cash_vanya };
}

export const useUserCashSummary = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-cash-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions',
          filter: `created_by=eq.${userId}`
        },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['user-cash-summary', userId] });
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

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
