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

export const useCompanyCashSummary = (enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout>();

  // Realtime subscription for automatic updates during imports
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('company-cash-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions'
        },
        () => {
          // Debounce to prevent excessive updates during bulk imports
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

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
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
