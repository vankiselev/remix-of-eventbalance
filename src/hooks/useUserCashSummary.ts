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

export const useUserCashSummary = (userId: string | undefined) => {
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
