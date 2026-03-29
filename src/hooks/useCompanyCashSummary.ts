import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseCashSummary, DEFAULT_CASH_SUMMARY } from "@/utils/cashSummaryParser";
import { getTenantCashSummaryRows } from "@/utils/cashSummaryFallback";
import { useTenant } from "@/contexts/TenantContext";

export const useCompanyCashSummary = (enabled: boolean = true) => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  return useQuery({
    queryKey: ['company-cash-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_CASH_SUMMARY;

      const { data, error } = await supabase.rpc('get_company_cash_summary' as any);

      if (!error) {
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        return parseCashSummary(rows as any[]);
      }

      if (import.meta.env.DEV) {
        console.warn('[CashSummary] get_company_cash_summary RPC failed, using fallback aggregation', error.message);
      }

      const fallbackRows = await getTenantCashSummaryRows(tenantId);
      return parseCashSummary(fallbackRows as any[]);
    },
    enabled: enabled && !!tenantId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
  });
};
