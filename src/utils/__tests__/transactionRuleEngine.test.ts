import { describe, it, expect } from 'vitest';
import { analyzeWithRules } from '../transactionRuleEngine';

describe('transactionRuleEngine', () => {
  // P0: Project — офис/склад
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

  // P1: Category — transport
  it.each([
    ['Такси до дома', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Бензин на дорогу', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Парковка у ТЦ', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Доставка декора', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Трансфер до площадки', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
    ['Курьер привёз реквизит', 'Доставка / Трансфер / Парковка / Вывоз мусора'],
  ])('P1 transport: "%s" → category', (desc, expected) => {
    const r = analyzeWithRules(desc);
    expect(r.category).toBe(expected);
  });

  // P1: Category — venue
  it.each([
    ['Аренда площадки на 10 часов', 'Площадка (депозит, аренда, доп. услуги)'],
    ['Депозит площадки', 'Площадка (депозит, аренда, доп. услуги)'],
  ])('P1 venue: "%s" → category', (desc, expected) => {
    const r = analyzeWithRules(desc);
    expect(r.category).toBe(expected);
  });

  // P1: Category — salary
  it.each([
    ['Аванс сотруднику', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
    ['Зарплата за март', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
    ['Бонус за проект', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
    ['Оклад Камилле', 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)'],
  ])('P1 salary: "%s" → category', (desc, expected) => {
    const r = analyzeWithRules(desc);
    expect(r.category).toBe(expected);
  });

  // P1: Category — client payment (income)
  it.each([
    ['Получил оплату от клиента Иванова', 'Получено/Возвращено клиенту'],
    ['Оплата от клиента за мероприятие', 'Получено/Возвращено клиенту'],
  ])('P1 client payment: "%s" → income', (desc, expected) => {
    const r = analyzeWithRules(desc);
    expect(r.category).toBe(expected);
    expect(r.transaction_type).toBe('income');
  });

  // P2: Wallet detection
  it('P2 wallet: "наличка Настя" → cash_nastya', () => {
    const r = analyzeWithRules('Купили воду наличка Настя');
    expect(r.wallet_key).toBe('cash_nastya');
  });

  it('P2 wallet: "лера наличка" → cash_lera', () => {
    const r = analyzeWithRules('Такси Лера наличка');
    expect(r.wallet_key).toBe('cash_lera');
  });

  it('P2 wallet: "наличка Ваня" → cash_vanya', () => {
    const r = analyzeWithRules('Канцелярия наличка Ваня');
    expect(r.wallet_key).toBe('cash_vanya');
  });

  it('P2 wallet: "Иван наличка" → cash_vanya', () => {
    const r = analyzeWithRules('Бумага Иван наличка');
    expect(r.wallet_key).toBe('cash_vanya');
  });

  // Combined: "Такси до дома наличка Лера" → transport + cash_lera
  it('combined: transport + wallet', () => {
    const r = analyzeWithRules('Такси до дома наличка Лера');
    expect(r.category).toBe('Доставка / Трансфер / Парковка / Вывоз мусора');
    expect(r.wallet_key).toBe('cash_lera');
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  // Combined: "Закупка в офис наличка Настя" → project + wallet
  it('combined: project + wallet', () => {
    const r = analyzeWithRules('Закупка в офис наличка Настя');
    expect(r.project).toBe('Склад / Офис');
    expect(r.wallet_key).toBe('cash_nastya');
  });

  // Negative cases
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

  // Edge: conflicting — both "аванс" and "такси" in text, first P1 rule (transport) wins
  it('conflict: "Аванс водителю такси" → transport wins (first P1 rule)', () => {
    const r = analyzeWithRules('Аванс водителю такси');
    // transport rule is listed before salary in rules array, so it wins
    expect(r.category).toBe('Доставка / Трансфер / Парковка / Вывоз мусора');
  });

  // But "Аванс сотруднику" without transport keywords → salary
  it('conflict: "Аванс сотруднику" → salary (no transport keyword)', () => {
    const r = analyzeWithRules('Аванс сотруднику');
    expect(r.category).toBe('Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)');
  });

  // Edge: case insensitive
  it('case insensitive', () => {
    const r = analyzeWithRules('ТАКСИ ДО ПЛОЩАДКИ');
    expect(r.category).toBe('Доставка / Трансфер / Парковка / Вывоз мусора');
  });

  // Reasons logged
  it('includes reasons', () => {
    const r = analyzeWithRules('Закупка в офис');
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons[0]).toContain('P0');
  });
});
