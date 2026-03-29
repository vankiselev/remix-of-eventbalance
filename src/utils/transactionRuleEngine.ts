/**
 * Deterministic rule engine for transaction field auto-detection.
 * No AI calls — pure regex/keyword matching.
 * 
 * Priority system:
 * P0 (confidence=1.0): Project detection (офис/склад)
 * P1 (confidence=0.9): Category detection (транспорт, площадка, выплаты, клиент)
 * P2 (confidence=0.85): Wallet detection (наличка Настя/Лера/Ваня)
 * P3 (confidence=0): Fallback — no match
 */

export interface RuleEngineResult {
  category: string | null;
  project: string | null;
  wallet_key: string | null;
  transaction_type: 'income' | 'expense' | null;
  confidence: number;
  reasons: string[];
}

interface Rule {
  priority: number;
  field: 'project' | 'category' | 'wallet_key' | 'transaction_type';
  keywords: string[];
  value: string;
  /** If set, also sets transaction_type */
  transactionType?: 'income' | 'expense';
  confidence: number;
}

const RULES: Rule[] = [
  // P0: Project
  { priority: 0, field: 'project', keywords: ['в офис', 'для офиса', 'офисные', 'офисных', 'офисную', 'офисного', 'на склад', 'для склада', 'складские', 'складских', 'складскую', 'складского', 'офис', 'склад'], value: 'Склад / Офис', confidence: 1.0 },

  // P1: Category — transport
  { priority: 1, field: 'category', keywords: ['такси', 'бензин', 'парковк', 'доставк', 'трансфер', 'курьер', 'вывоз мусор'], value: 'Доставка / Трансфер / Парковка / Вывоз мусора', confidence: 0.9 },

  // P1: Category — venue
  { priority: 1, field: 'category', keywords: ['аренда площадк', 'депозит площадк', 'аренда зала', 'депозит зала'], value: 'Площадка (депозит, аренда, доп. услуги)', confidence: 0.9 },

  // P1: Category — salary/payments
  { priority: 1, field: 'category', keywords: ['аванс', 'зарплат', 'бонус', 'оклад', 'чаевые', 'премия'], value: 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)', confidence: 0.9 },

  // P1: Category — client payment (income)
  { priority: 1, field: 'category', keywords: ['получил оплат', 'оплата от клиент', 'получили оплат', 'клиент оплатил', 'клиент перевел', 'клиент перевёл'], value: 'Получено/Возвращено клиенту', transactionType: 'income', confidence: 0.9 },

  // P1: Category — food
  { priority: 1, field: 'category', keywords: ['кейтеринг', 'сладкий стол', 'торт на мероприят', 'банкет'], value: 'Еда / Напитки (сладкий стол, торт, кейтеринг)', confidence: 0.85 },

  // P1: Category — print
  { priority: 1, field: 'category', keywords: ['баннер', 'печать', 'визитки', 'меню печат'], value: 'Печать (баннеры, меню, карточки)', confidence: 0.85 },

  // P2: Wallet — Настя
  { priority: 2, field: 'wallet_key', keywords: ['наличка настя', 'настя наличк', 'нал настя', 'настя нал'], value: 'cash_nastya', confidence: 0.85 },

  // P2: Wallet — Лера
  { priority: 2, field: 'wallet_key', keywords: ['наличка лера', 'лера наличк', 'нал лера', 'лера нал'], value: 'cash_lera', confidence: 0.85 },

  // P2: Wallet — Ваня
  { priority: 2, field: 'wallet_key', keywords: ['наличка ваня', 'ваня наличк', 'иван наличк', 'наличка иван', 'нал ваня', 'ваня нал'], value: 'cash_vanya', confidence: 0.85 },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(text: string, keyword: string): boolean {
  // Use word-boundary-like matching for Russian text
  const regex = new RegExp(`(?:^|[\\s,.:;!?()«»"'])${escapeRegex(keyword)}`, 'i');
  return regex.test(` ${text} `);
}

/**
 * Run deterministic rules against a transaction description.
 * Returns detected fields with confidence and reasons.
 */
export function analyzeWithRules(description: string): RuleEngineResult {
  const result: RuleEngineResult = {
    category: null,
    project: null,
    wallet_key: null,
    transaction_type: null,
    confidence: 0,
    reasons: [],
  };

  if (!description || description.trim().length < 2) {
    return result;
  }

  const lower = description.toLowerCase();

  // Track which fields have been set (first match wins per field)
  const setFields = new Set<string>();

  // Sort rules by priority (lower = higher priority)
  const sortedRules = [...RULES].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (setFields.has(rule.field)) continue;

    for (const keyword of rule.keywords) {
      if (matchesKeyword(lower, keyword)) {
        switch (rule.field) {
          case 'project':
            result.project = rule.value;
            break;
          case 'category':
            result.category = rule.value;
            break;
          case 'wallet_key':
            result.wallet_key = rule.value;
            break;
        }

        if (rule.transactionType) {
          result.transaction_type = rule.transactionType;
        }

        result.confidence = Math.max(result.confidence, rule.confidence);
        result.reasons.push(`P${rule.priority}: "${keyword}" → ${rule.field}=${rule.value}`);
        setFields.add(rule.field);

        if (import.meta.env?.DEV) {
          console.log(`[RuleEngine] P${rule.priority}: "${keyword}" → ${rule.field}="${rule.value}"`);
        }

        break; // First keyword match for this rule wins
      }
    }
  }

  return result;
}

/** Map wallet_key to display name for UI */
export function walletKeyToDisplayName(walletKey: string): string {
  const map: Record<string, string> = {
    cash_nastya: 'Наличка Настя',
    cash_lera: 'Наличка Лера',
    cash_vanya: 'Наличка Ваня',
  };
  return map[walletKey] || walletKey;
}
