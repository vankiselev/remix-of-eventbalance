import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseCashSummary, DEFAULT_CASH_SUMMARY, type CashSummary } from "@/utils/cashSummaryParser";
import { getUserCashSummaryRows } from "@/utils/cashSummaryFallback";
import { useTenant } from "@/contexts/TenantContext";

export const useEmployeeCashSummary = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;
  const [summary, setSummary] = useState<CashSummary>(DEFAULT_CASH_SUMMARY);

  const fetchSummary = useCallback(async (employeeId: string): Promise<CashSummary> => {
    const { data, error } = await supabase
      .rpc("calculate_user_cash_totals", { p_user_id: employeeId });
    
    if (!error) {
      const parsed = parseCashSummary(data as any[] || []);
      setSummary(parsed);
      return parsed;
    }

    if (import.meta.env.DEV) {
      console.warn('[CashSummary] employee RPC failed, using fallback aggregation', error.message);
    }

    const fallbackRows = await getUserCashSummaryRows(employeeId, tenantId);
    const parsed = parseCashSummary(fallbackRows as any[]);
    setSummary(parsed);
    return parsed;
  }, [tenantId]);

  return { summary, fetchSummary };
};
