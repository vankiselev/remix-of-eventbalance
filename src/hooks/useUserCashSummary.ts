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

export const useUserCashSummary = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout>();

  // Realtime subscription for automatic updates during imports
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
          // Debounce to prevent excessive updates during bulk imports
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
        user_uuid: userId 
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0] as CashSummary;
      }
      
      return defaultSummary;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
