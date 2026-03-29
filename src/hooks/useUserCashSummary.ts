// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseCashSummary, DEFAULT_CASH_SUMMARY } from "@/utils/cashSummaryParser";

export const useUserCashSummary = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-cash-summary', userId],
    queryFn: async () => {
      if (!userId) return DEFAULT_CASH_SUMMARY;
      
      const { data, error } = await supabase.rpc('calculate_user_cash_totals', { 
        p_user_id: userId 
      });
      
      if (error) throw error;
      
      return parseCashSummary(data as any[]);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
