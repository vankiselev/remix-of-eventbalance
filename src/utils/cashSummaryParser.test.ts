import { describe, it, expect } from 'vitest';
import { parseCashSummary, DEFAULT_CASH_SUMMARY } from './cashSummaryParser';

describe('parseCashSummary', () => {
  it('returns defaults for null/empty', () => {
    expect(parseCashSummary(null)).toEqual(DEFAULT_CASH_SUMMARY);
    expect(parseCashSummary([])).toEqual(DEFAULT_CASH_SUMMARY);
    expect(parseCashSummary(undefined)).toEqual(DEFAULT_CASH_SUMMARY);
  });

  // --- Grouped format (from calculate_user_cash_totals) ---

  it('grouped: Наличка Лера expense -1000', () => {
    const data = [
      { cash_type: 'Наличка Лера', total_income: 0, total_expense: 1000 },
    ];
    const result = parseCashSummary(data);
    expect(result.cash_lera).toBe(-1000);
    expect(result.total_cash).toBe(-1000);
    expect(result.cash_nastya).toBe(0);
    expect(result.cash_vanya).toBe(0);
  });

  it('grouped: Наличка Настя income +500', () => {
    const data = [
      { cash_type: 'Наличка Настя', total_income: 500, total_expense: 0 },
    ];
    const result = parseCashSummary(data);
    expect(result.cash_nastya).toBe(500);
    expect(result.total_cash).toBe(500);
  });

  it('grouped: corp card excluded from totals', () => {
    const data = [
      { cash_type: 'Корп. карта Настя', total_income: 0, total_expense: 1000 },
      { cash_type: 'Наличка Настя', total_income: 500, total_expense: 0 },
    ];
    const result = parseCashSummary(data);
    expect(result.cash_nastya).toBe(500);
    expect(result.total_cash).toBe(500); // Corp card NOT included
  });

  it('grouped: mixed set - only cash wallets counted', () => {
    const data = [
      { cash_type: 'Наличка Лера', total_income: 0, total_expense: 1000 },
      { cash_type: 'Наличка Настя', total_income: 500, total_expense: 0 },
      { cash_type: 'корп.карта Настя', total_income: 0, total_expense: 200 },
      { cash_type: 'ИП Лера', total_income: 0, total_expense: 300 },
      { cash_type: 'оплатил клиент', total_income: 100, total_expense: 0 },
      { cash_type: 'Наличка Ваня', total_income: 200, total_expense: 0 },
    ];
    const result = parseCashSummary(data);
    expect(result.cash_lera).toBe(-1000);
    expect(result.cash_nastya).toBe(500);
    expect(result.cash_vanya).toBe(200);
    expect(result.total_cash).toBe(-1000 + 500 + 200); // -300
  });

  it('grouped: handles trimmed/extra spaces', () => {
    const data = [
      { cash_type: '  Наличка Лера  ', total_income: 100, total_expense: 0 },
    ];
    const result = parseCashSummary(data);
    expect(result.cash_lera).toBe(100);
  });

  it('grouped: client paid does not affect total_cash', () => {
    const data = [
      { cash_type: 'Оплатил(а) клиент', total_income: 1000, total_expense: 0 },
    ];
    const result = parseCashSummary(data);
    expect(result.cash_nastya).toBe(0);
    expect(result.cash_lera).toBe(0);
    expect(result.cash_vanya).toBe(0);
    expect(result.total_cash).toBe(0);
  });

  // --- Flat format (from get_company_cash_summary) ---

  it('flat: recalculates total_cash from wallets', () => {
    const data = [
      { total_cash: -2000, cash_nastya: 0, cash_lera: -1000, cash_vanya: 0 },
    ];
    const result = parseCashSummary(data);
    // total_cash should be recalculated: 0 + (-1000) + 0 = -1000
    // NOT the DB value of -2000 which includes non-cash
    expect(result.total_cash).toBe(-1000);
    expect(result.cash_lera).toBe(-1000);
  });

  it('flat: correct values pass through', () => {
    const data = [
      { total_cash: 500, cash_nastya: 300, cash_lera: 100, cash_vanya: 100 },
    ];
    const result = parseCashSummary(data);
    expect(result.total_cash).toBe(500); // 300+100+100 = 500, matches
    expect(result.cash_nastya).toBe(300);
  });

  // --- Renamed wallets should NOT break calculation ---

  it('calculation uses DB cash_type strings, not display names', () => {
    // Even if wallet is renamed in admin, DB still stores "Наличка Лера"
    const data = [
      { cash_type: 'Наличка Лера', total_income: 0, total_expense: 500 },
    ];
    const result = parseCashSummary(data);
    expect(result.cash_lera).toBe(-500);
    expect(result.total_cash).toBe(-500);
  });
});
