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

export const useCompanyCashSummary = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['company-cash-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_cash_summary');
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0] as CashSummary;
      }
      
      return defaultSummary;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
  });
};
