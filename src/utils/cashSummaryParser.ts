/**
 * Centralized cash summary parser.
 * Uses stable matching logic for cash wallet types.
 * All cash summary components should use this instead of local parsers.
 */

export interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

export const DEFAULT_CASH_SUMMARY: CashSummary = {
  total_cash: 0,
  cash_nastya: 0,
  cash_lera: 0,
  cash_vanya: 0,
};

/**
 * Normalized cash type matching.
 * Maps trimmed+lowercased cash_type strings to wallet keys.
 * Only these 3 wallets count toward "Итого на руках".
 */
const CASH_TYPE_TO_KEY: Record<string, keyof Pick<CashSummary, 'cash_nastya' | 'cash_lera' | 'cash_vanya'>> = {
  'наличка настя': 'cash_nastya',
  'наличка лера': 'cash_lera',
  'наличка ваня': 'cash_vanya',
};

/**
 * Normalize a cash_type string for matching:
 * trim, lowercase, collapse multiple spaces.
 */
function normalizeCashType(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Parse DB response into CashSummary.
 * Handles two formats:
 * 1) Flat: [{total_cash, cash_nastya, cash_lera, cash_vanya}]
 * 2) Grouped: [{cash_type, total_income, total_expense}, ...]
 *
 * In both cases, total_cash = cash_nastya + cash_lera + cash_vanya (cash wallets only).
 */
export function parseCashSummary(data: any[] | null | undefined): CashSummary {
  if (!data || data.length === 0) return DEFAULT_CASH_SUMMARY;

  const first = data[0];

  // Flat format from get_company_cash_summary / get_employee_cash_summary
  if ('cash_nastya' in first || 'cash_lera' in first || 'cash_vanya' in first) {
    const cash_nastya = Number(first.cash_nastya) || 0;
    const cash_lera = Number(first.cash_lera) || 0;
    const cash_vanya = Number(first.cash_vanya) || 0;
    // Always recalculate total_cash from wallets to prevent DB-level bugs
    const total_cash = cash_nastya + cash_lera + cash_vanya;

    if (import.meta.env.DEV) {
      const dbTotal = Number(first.total_cash) || 0;
      if (Math.abs(dbTotal - total_cash) > 0.01) {
        console.warn('[CashSummary] DB total_cash differs from wallet sum', {
          dbTotal, calculatedTotal: total_cash, cash_nastya, cash_lera, cash_vanya,
        });
      }
    }

    return { total_cash, cash_nastya, cash_lera, cash_vanya };
  }

  // Grouped format from calculate_user_cash_totals
  let cash_nastya = 0;
  let cash_lera = 0;
  let cash_vanya = 0;

  for (const row of data) {
    const normalized = normalizeCashType(row.cash_type);
    const walletKey = CASH_TYPE_TO_KEY[normalized];

    if (!walletKey) continue; // Skip non-cash wallets (corp card, ИП, client payments)

    const income = Number(row.total_income) || 0;
    const expense = Number(row.total_expense) || 0;
    const net = income - expense;

    if (walletKey === 'cash_nastya') cash_nastya += net;
    else if (walletKey === 'cash_lera') cash_lera += net;
    else if (walletKey === 'cash_vanya') cash_vanya += net;
  }

  const total_cash = cash_nastya + cash_lera + cash_vanya;

  if (import.meta.env.DEV) {
    console.debug('[CashSummary] Parsed grouped data', {
      rows: data.length,
      result: { total_cash, cash_nastya, cash_lera, cash_vanya },
      skipped: data.filter(r => !CASH_TYPE_TO_KEY[normalizeCashType(r.cash_type)]).map(r => r.cash_type),
    });
  }

  return { total_cash, cash_nastya, cash_lera, cash_vanya };
}
