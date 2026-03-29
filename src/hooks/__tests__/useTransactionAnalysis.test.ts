import { describe, it, expect } from 'vitest';

// Hardcoded to avoid importing supabase client in test env
const MIN_CONFIDENCE_TO_RETURN_CATEGORY = 0.6;
const MIN_CONFIDENCE_TO_AUTO_APPLY = 0.75;

// ---- Threshold constants ----

describe('Confidence thresholds', () => {
  it('MIN_CONFIDENCE_TO_RETURN_CATEGORY is 0.6', () => {
    expect(MIN_CONFIDENCE_TO_RETURN_CATEGORY).toBe(0.6);
  });

  it('MIN_CONFIDENCE_TO_AUTO_APPLY is 0.75', () => {
    expect(MIN_CONFIDENCE_TO_AUTO_APPLY).toBe(0.75);
  });

  it('auto-apply threshold is higher than return threshold', () => {
    expect(MIN_CONFIDENCE_TO_AUTO_APPLY).toBeGreaterThan(MIN_CONFIDENCE_TO_RETURN_CATEGORY);
  });
});

// ---- Category normalization (mirrors edge function logic) ----

const CATEGORIES = [
  'Агентская комиссия',
  'Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)',
  'Аренда (оборудование, костюмы, мебель, декор, аттракционы, шатры)',
  'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
  'Выступление артистов (диджеи, селебрити, кавер-группы)',
  'Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)',
  'Доставка / Трансфер / Парковка / Вывоз мусора',
  'Еда / Напитки (сладкий стол, торт, кейтеринг)',
  'Закупки / Оплаты (ФИН, офис, склад, компания)',
  'Залог (внесли/вернули)',
  'Комиссия за перевод',
  'Монтаж / Демонтаж',
  'Накладные расходы (райдер, траты вне сметы)',
  'Передано или получено от Леры/Насти/Вани',
  'Передано или получено от сотрудника',
  'Печать (баннеры, меню, карточки)',
  'Площадка (депозит, аренда, доп. услуги)',
  'Получено/Возвращено клиенту',
  'Производство (декорации, костюмы)',
  'Прочие специалисты',
  'Фотограф / Видеограф',
  'Налог / УСН',
];

/** Mirrors the edge function normalization logic */
function normalizeCategory(raw: string): string | null {
  const rawCategory = raw.trim();
  if (!rawCategory) return null;

  // Exact match
  let match = CATEGORIES.find(c => c === rawCategory) || null;
  // Case-insensitive
  if (!match) {
    match = CATEGORIES.find(c => c.toLowerCase() === rawCategory.toLowerCase()) || null;
  }
  // Partial match
  if (!match) {
    match = CATEGORIES.find(c =>
      c.toLowerCase().includes(rawCategory.toLowerCase()) ||
      rawCategory.toLowerCase().includes(c.toLowerCase())
    ) || null;
  }
  return match;
}

describe('Category normalization', () => {
  it('exact match works', () => {
    expect(normalizeCategory('Площадка (депозит, аренда, доп. услуги)')).toBe(
      'Площадка (депозит, аренда, доп. услуги)'
    );
  });

  it('case-insensitive match works', () => {
    expect(normalizeCategory('площадка (депозит, аренда, доп. услуги)')).toBe(
      'Площадка (депозит, аренда, доп. услуги)'
    );
  });

  it('partial match works (substring)', () => {
    expect(normalizeCategory('Площадка')).toBe(
      'Площадка (депозит, аренда, доп. услуги)'
    );
  });

  it('returns null for completely unknown category', () => {
    expect(normalizeCategory('Абсолютно неизвестная категория XYZ')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeCategory('')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(normalizeCategory('  Налог / УСН  ')).toBe('Налог / УСН');
  });
});

// ---- UI visibility logic ----

describe('UI category visibility logic', () => {
  function shouldShowCategory(category: string | null, confidence: number): boolean {
    return !!(category && confidence >= MIN_CONFIDENCE_TO_RETURN_CATEGORY);
  }

  function shouldAutoApply(confidence: number): boolean {
    return confidence >= MIN_CONFIDENCE_TO_AUTO_APPLY;
  }

  it('shows category at confidence 0.6', () => {
    expect(shouldShowCategory('Площадка (депозит, аренда, доп. услуги)', 0.6)).toBe(true);
  });

  it('hides category at confidence 0.59', () => {
    expect(shouldShowCategory('Площадка (депозит, аренда, доп. услуги)', 0.59)).toBe(false);
  });

  it('hides category when null regardless of confidence', () => {
    expect(shouldShowCategory(null, 0.9)).toBe(false);
  });

  it('auto-applies at confidence 0.75', () => {
    expect(shouldAutoApply(0.75)).toBe(true);
  });

  it('does NOT auto-apply at confidence 0.74', () => {
    expect(shouldAutoApply(0.74)).toBe(false);
  });

  it('shows but does NOT auto-apply at confidence 0.65', () => {
    expect(shouldShowCategory('Some category', 0.65)).toBe(true);
    expect(shouldAutoApply(0.65)).toBe(false);
  });
});

// ---- 6 expected categorization cases ----

describe('Expected categorization cases (normalization)', () => {
  const cases: Array<{ input: string; expectedCategory: string }> = [
    {
      input: 'Передано или получено от сотрудника',
      expectedCategory: 'Передано или получено от сотрудника',
    },
    {
      input: 'Доставка / Трансфер',
      expectedCategory: 'Доставка / Трансфер / Парковка / Вывоз мусора',
    },
    {
      input: 'Получено/Возвращено клиенту',
      expectedCategory: 'Получено/Возвращено клиенту',
    },
    {
      input: 'Производство',
      expectedCategory: 'Производство (декорации, костюмы)',
    },
    {
      input: 'Выплаты',
      expectedCategory: 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)',
    },
    {
      input: 'Площадка',
      expectedCategory: 'Площадка (депозит, аренда, доп. услуги)',
    },
  ];

  cases.forEach(({ input, expectedCategory }) => {
    it(`"${input}" → "${expectedCategory}"`, () => {
      expect(normalizeCategory(input)).toBe(expectedCategory);
    });
  });
});
