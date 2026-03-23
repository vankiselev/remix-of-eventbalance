import { useState, useCallback } from "react";
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

function parseCashRows(rows: any[]): CashSummary {
  if (!rows || rows.length === 0) return defaultSummary;
  if ('total_cash' in rows[0]) {
    return {
      total_cash: Number(rows[0].total_cash) || 0,
      cash_nastya: Number(rows[0].cash_nastya) || 0,
      cash_lera: Number(rows[0].cash_lera) || 0,
      cash_vanya: Number(rows[0].cash_vanya) || 0,
    };
  }
  let total_cash = 0, cash_nastya = 0, cash_lera = 0, cash_vanya = 0;
  for (const row of rows) {
    const net = (Number(row.total_income) || 0) - (Number(row.total_expense) || 0);
    total_cash += net;
    const ct = (row.cash_type || '').trim();
    if (ct === 'Наличка Настя') cash_nastya += net;
    else if (ct === 'Наличка Лера') cash_lera += net;
    else if (ct === 'Наличка Ваня') cash_vanya += net;
  }
  return { total_cash, cash_nastya, cash_lera, cash_vanya };
}

export const useEmployeeCashSummary = () => {
  const [summary, setSummary] = useState<CashSummary>(defaultSummary);

  const fetchSummary = useCallback(async (employeeId: string): Promise<CashSummary> => {
    const { data, error } = await supabase
      .rpc("calculate_user_cash_totals", { p_user_id: employeeId });
    
    if (error) throw error;
    
    const parsed = parseCashRows(data as any[] || []);
    setSummary(parsed);
    return parsed;
  }, []);

  return { summary, fetchSummary };
};
