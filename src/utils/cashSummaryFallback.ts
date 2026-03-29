import { supabase } from "@/integrations/supabase/client";

interface TransactionSummaryRow {
  cash_type: string | null;
  income_amount: number | null;
  expense_amount: number | null;
}

interface GroupedCashRow {
  cash_type: string;
  total_income: number;
  total_expense: number;
}

function aggregateRows(rows: TransactionSummaryRow[]): GroupedCashRow[] {
  const grouped = new Map<string, GroupedCashRow>();

  for (const row of rows) {
    const cashType = (row.cash_type || "").trim();
    if (!cashType) continue;

    const income = Number(row.income_amount) || 0;
    const expense = Number(row.expense_amount) || 0;

    const existing = grouped.get(cashType);
    if (existing) {
      existing.total_income += income;
      existing.total_expense += expense;
    } else {
      grouped.set(cashType, {
        cash_type: cashType,
        total_income: income,
        total_expense: expense,
      });
    }
  }

  return Array.from(grouped.values());
}

export async function getTenantCashSummaryRows(tenantId: string): Promise<GroupedCashRow[]> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("cash_type, income_amount, expense_amount")
    .eq("tenant_id", tenantId);

  if (error) throw error;
  return aggregateRows((data || []) as TransactionSummaryRow[]);
}

export async function getUserCashSummaryRows(
  userId: string,
  tenantId?: string | null,
): Promise<GroupedCashRow[]> {
  let query = supabase
    .from("financial_transactions")
    .select("cash_type, income_amount, expense_amount")
    .eq("created_by", userId);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return aggregateRows((data || []) as TransactionSummaryRow[]);
}
