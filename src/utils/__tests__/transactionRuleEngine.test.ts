import { describe, it, expect } from 'vitest';
import { analyzeWithRules, normalizeDescription } from '../transactionRuleEngine';

describe('transactionRuleEngine', () => {
  // ════════════════════════════════════════════════════════════
  // Regression suite
  // ════════════════════════════════════════════════════════════

  // P0: Project
  it.each([
    ['Закупка конфет в офис', 'Склад / Офис'],
    ['Купили бумагу для офиса', 'Склад / Офис'],
    ['Офисные принадлежности', 'Склад / Офис'],
    ['Закупка коробок на склад', 'Склад / Офис'],
    ['Доставка на склад материалов', 'Склад / Офис'],
    ['Складские расходы', 'Склад / Офис'],
  ])('P0 project: "%s" → %s', (desc, expected) => {
    const r = analyzeWithRules(desc);
    expect(r.project).toBe(expected);
    expect(r.confidence).toBeGreaterThanOrEqual(1.0);
  });

  // P1: transport
  it.each([
    ['Такси до дома', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Бензин на дорогу', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Парковка у ТЦ', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Доставка декора', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Трансфер до площадки', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Курьер привёз реквизит', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
  ])('P1 transport: "%s"', (desc, expected) => {
    expect(analyzeWithRules(desc).category).toBe(expected);
  });

  // P1: venue
  it.each([
    ['Аренда площадки на 10 часов', 'Площадка (депозит, аренда, доп. услуги)'],
    ['Депозит площадки', 'Площадка (депозит, аренда, доп. услуги)'],
  ])('P1 venue: "%s"', (desc, expected) => {
    expect(analyzeWithRules(desc).category).toBe(expected);
  });

  // P1: salary
  it.each([
    ['Аванс сотруднику', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
    ['Зарплата за март', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
    ['Бонус за проект', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
    ['Оклад Камилле', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
  ])('P1 salary: "%s"', (desc, expected) => {
    expect(analyzeWithRules(desc).category).toBe(expected);
  });

  // P1: client payment (income)
  it.each([
    ['Получил оплату от клиента Иванова', 'Получено/Возвращено клиенту'],
    ['Оплата от клиента за мероприятие', 'Получено/Возвращено клиенту'],
  ])('P1 client payment: "%s" → income', (desc, expected) => {
    const r = analyzeWithRules(desc);
    expect(r.category).toBe(expected);
    expect(r.transaction_type).toBe('income');
  });

  // P2: Wallet
  it('wallet: наличка Настя → cash_nastya', () => {
    expect(analyzeWithRules('Купили воду наличка Настя').wallet_key).toBe('cash_nastya');
  });
  it('wallet: Лера наличка → cash_lera', () => {
    expect(analyzeWithRules('Такси Лера наличка').wallet_key).toBe('cash_lera');
  });
  it('wallet: наличка Ваня → cash_vanya', () => {
    expect(analyzeWithRules('Канцелярия наличка Ваня').wallet_key).toBe('cash_vanya');
  });
  it('wallet: Иван наличка → cash_vanya', () => {
    expect(analyzeWithRules('Бумага Иван наличка').wallet_key).toBe('cash_vanya');
  });

  // Combined
  it('combined: transport + wallet', () => {
    const r = analyzeWithRules('Такси до дома наличка Лера');
    expect(r.category).toBe('Доставка / Трансфер / Парковка / Вывоз мусора');
    expect(r.wallet_key).toBe('cash_lera');
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });
  it('combined: project + wallet', () => {
    const r = analyzeWithRules('Закупка в офис наличка Настя');
    expect(r.project).toBe('Склад / Офис');
    expect(r.wallet_key).toBe('cash_nastya');
  });
  it('triple: project + category + wallet', () => {
    const r = analyzeWithRules('Доставка в офис наличка Ваня');
    expect(r.project).toBe('Склад / Офис');
    expect(r.category).toBe('Доставка / Трансфер / Парковка / Вывоз мусора');
    expect(r.wallet_key).toBe('cash_vanya');
    expect(r.reasons.length).toBe(3);
  });

  // Negative
  it.each([
    ['Реклама в Instagram'],
    ['Оплата за дизайн'],
    ['Звонок клиенту'],
    [''],
    ['аб'],
  ])('no match: "%s" → null', (desc) => {
    const r = analyzeWithRules(desc);
    expect(r.category).toBeNull();
    expect(r.project).toBeNull();
    expect(r.wallet_key).toBeNull();
    expect(r.confidence).toBe(0);
  });

  // ════════════════════════════════════════════════════════════
  // Weight-based conflict resolution
  // ════════════════════════════════════════════════════════════

  it('conflict: "Аванс водителю такси" → salary W40 beats transport W30', () => {
    const r = analyzeWithRules('Аванс водителю такси');
    expect(r.category).toBe('Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)');
    expect(r.reasons[0]).toContain('cat_salary');
    expect(r.reasons[0]).toContain('beat');
    expect(r.reasons[0]).toContain('cat_transport');
  });

  it('conflict: "Доставка банкета" → transport W30 beats food W25', () => {
    const r = analyzeWithRules('Доставка банкета');
    expect(r.category).toBe('Доставка / Трансфер / Парковка / Вывоз мусора');
    expect(r.reasons[0]).toContain('cat_transport');
  });

  it('conflict: "Печать баннера для офиса" → print + project (different fields)', () => {
    const r = analyzeWithRules('Печать баннера для офиса');
    expect(r.category).toBe('Печать (баннеры, меню, карточки)');
    expect(r.project).toBe('Склад / Офис');
  });

  it('no conflict: "Аванс сотруднику" → salary only', () => {
    expect(analyzeWithRules('Аванс сотруднику').category).toBe(
      'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'
    );
  });

  // ════════════════════════════════════════════════════════════
  // Tie-breaker: equal priority+weight+kwlen → rule.id ASC
  // ════════════════════════════════════════════════════════════

  it('tie-breaker by rule.id: wallet_lera < wallet_nastya alphabetically', () => {
    // "наличка лера" and "наличка настя" both in text → wallet_lera wins (id < id)
    const r = analyzeWithRules('наличка лера наличка настя');
    expect(r.wallet_key).toBe('cash_lera'); // wallet_lera < wallet_nastya
  });

  // ════════════════════════════════════════════════════════════
  // FALSE POSITIVES — word-boundary guards
  // ════════════════════════════════════════════════════════════

  it.each([
    ['складчина для вечеринки'],      // "склад" must not match
    ['таксист привёз гостей'],        // "такси" must not match
    ['бонусный купон на скидку'],     // "бонус" must not match
    ['парковочный датчик сломался'],  // "парковк" must not match
    ['доставщик уволился'],           // "доставк" must not match
    ['курьерская служба закрылась'],  // "курьер" must not match  
    ['печатный станок'],              // "печать" — "печатн" ≠ "печать"
    ['баннерная реклама в ТЦ'],       // "баннер" must not match inside "баннерная"
  ])('false positive guard: "%s" → no category match', (desc) => {
    const r = analyzeWithRules(desc);
    expect(r.category).toBeNull();
  });

  it('false positive: "офисный" is whitelisted, but "переоформление" is not', () => {
    // "офис" inside "переоформление" should NOT match
    const r = analyzeWithRules('переоформление документов');
    expect(r.project).toBeNull();
  });

  // ════════════════════════════════════════════════════════════
  // Normalisation: trim, collapse, case, ё→е
  // ════════════════════════════════════════════════════════════

  describe('normalizeDescription', () => {
    it('trims whitespace', () => {
      expect(normalizeDescription('  hello  ')).toBe('hello');
    });
    it('collapses multiple spaces', () => {
      expect(normalizeDescription('a   b    c')).toBe('a b c');
    });
    it('lowercases', () => {
      expect(normalizeDescription('ТАКСИ')).toBe('такси');
    });
    it('ё → е', () => {
      expect(normalizeDescription('привёз')).toBe('привез');
    });
    it('combined', () => {
      expect(normalizeDescription('  ПРИВЁЗ   Курьер  ')).toBe('привез курьер');
    });
  });

  it('normalisation: mixed case + extra spaces', () => {
    const r = analyzeWithRules('  ТАКСИ   до   дома  ');
    expect(r.category).toBe('Доставка / Трансфер / Парковка / Вывоз мусора');
  });

  it('normalisation: ё in keyword → matches rule with е', () => {
    // "клиент перевёл" has ё, normalisation converts to е, matches "клиент перевел"
    const r = analyzeWithRules('Клиент перевёл оплату');
    expect(r.category).toBe('Получено/Возвращено клиенту');
    expect(r.transaction_type).toBe('income');
  });

  // ════════════════════════════════════════════════════════════
  // Reason format — safe, structured
  // ════════════════════════════════════════════════════════════

  it('reasons contain P/W, rule.id, keyword, field, value', () => {
    const r = analyzeWithRules('Закупка в офис');
    expect(r.reasons[0]).toContain('P0');
    expect(r.reasons[0]).toContain('W100');
    expect(r.reasons[0]).toContain('project_office');
    expect(r.reasons[0]).toContain('project=');
  });

  it('reason shows beaten rules', () => {
    const r = analyzeWithRules('Аванс водителю такси');
    const catReason = r.reasons.find(r => r.includes('category'));
    expect(catReason).toContain('beat');
    expect(catReason).toContain('cat_transport');
  });

  it('reason does NOT contain raw description', () => {
    const desc = 'Секретная закупка в офис для проекта X';
    const r = analyzeWithRules(desc);
    for (const reason of r.reasons) {
      expect(reason).not.toContain(desc);
    }
  });

  // ════════════════════════════════════════════════════════════
  // Case insensitive
  // ════════════════════════════════════════════════════════════

  it('case insensitive', () => {
    expect(analyzeWithRules('ТАКСИ ДО ПЛОЩАДКИ').category).toBe(
      'Доставка / Трансфер / Парковка / Вывоз мусора'
    );
  });
});
