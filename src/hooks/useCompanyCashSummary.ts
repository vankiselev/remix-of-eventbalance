import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseCashSummary, DEFAULT_CASH_SUMMARY } from "@/utils/cashSummaryParser";

export const useCompanyCashSummary = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['company-cash-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_cash_summary');
      if (error) throw error;
      
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      return parseCashSummary(rows as any[]);
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
