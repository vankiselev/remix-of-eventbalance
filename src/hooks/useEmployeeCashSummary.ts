import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseCashSummary, DEFAULT_CASH_SUMMARY, type CashSummary } from "@/utils/cashSummaryParser";

export const useEmployeeCashSummary = () => {
  const [summary, setSummary] = useState<CashSummary>(DEFAULT_CASH_SUMMARY);

  const fetchSummary = useCallback(async (employeeId: string): Promise<CashSummary> => {
    const { data, error } = await supabase
      .rpc("calculate_user_cash_totals", { p_user_id: employeeId });
    
    if (error) throw error;
    
    const parsed = parseCashSummary(data as any[] || []);
    setSummary(parsed);
    return parsed;
  }, []);

  return { summary, fetchSummary };
};
