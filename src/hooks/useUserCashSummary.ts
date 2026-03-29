// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseCashSummary, DEFAULT_CASH_SUMMARY } from "@/utils/cashSummaryParser";
import { getUserCashSummaryRows } from "@/utils/cashSummaryFallback";
import { useTenant } from "@/contexts/TenantContext";

export const useUserCashSummary = (userId: string | undefined) => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  return useQuery({
    queryKey: ['user-cash-summary', userId, tenantId],
    queryFn: async () => {
      if (!userId) return DEFAULT_CASH_SUMMARY;
      
      const { data, error } = await supabase.rpc('calculate_user_cash_totals', { 
        p_user_id: userId 
      });
      
      if (!error) {
        return parseCashSummary(data as any[]);
      }

      if (import.meta.env.DEV) {
        console.warn('[CashSummary] calculate_user_cash_totals RPC failed, using fallback aggregation', error.message);
      }

      const fallbackRows = await getUserCashSummaryRows(userId, tenantId);
      return parseCashSummary(fallbackRows as any[]);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
  });
};
