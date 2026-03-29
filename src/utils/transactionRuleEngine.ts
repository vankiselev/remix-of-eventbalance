/**
 * Deterministic rule engine for transaction field auto-detection.
 * No AI calls — pure regex/keyword matching.
 * 
 * Resolution order:
 * 1. priority (lower = higher): P0 project > P1 category > P2 wallet
 * 2. weight (higher = wins): within same priority+field, highest weight wins
 * 3. If equal weight, longer keyword match wins (more specific)
 * 
 * Priority levels:
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
  id: string;
  priority: number;
  /** Higher weight wins within same priority+field. */
  weight: number;
  field: 'project' | 'category' | 'wallet_key' | 'transaction_type';
  keywords: string[];
  value: string;
  /** If set, also sets transaction_type */
  transactionType?: 'income' | 'expense';
  confidence: number;
}

interface RuleMatch {
  rule: Rule;
  keyword: string;
}

const RULES: Rule[] = [
  // P0: Project — weight 100 (only rule at P0)
  { id: 'project_office', priority: 0, weight: 100, field: 'project', keywords: ['в офис', 'для офиса', 'офисные', 'офисных', 'офисную', 'офисного', 'на склад', 'для склада', 'складские', 'складских', 'складскую', 'складского', 'офис', 'склад'], value: 'Склад / Офис', confidence: 1.0 },

  // P1: Category — venue (weight 60, multi-word keywords = very specific)
  { id: 'cat_venue', priority: 1, weight: 60, field: 'category', keywords: ['аренда площадк', 'депозит площадк', 'аренда зала', 'депозит зала'], value: 'Площадка (депозит, аренда, доп. услуги)', confidence: 0.9 },

  // P1: Category — client payment (weight 55, multi-word, sets income)
  { id: 'cat_client', priority: 1, weight: 55, field: 'category', keywords: ['получил оплат', 'оплата от клиент', 'получили оплат', 'клиент оплатил', 'клиент перевел', 'клиент перевёл'], value: 'Получено/Возвращено клиенту', transactionType: 'income', confidence: 0.9 },

  // P1: Category — salary/payments (weight 40, single-word keywords)
  { id: 'cat_salary', priority: 1, weight: 40, field: 'category', keywords: ['аванс', 'зарплат', 'бонус', 'оклад', 'чаевые', 'премия'], value: 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)', confidence: 0.9 },

  // P1: Category — transport (weight 30, generic single-word keywords)
  { id: 'cat_transport', priority: 1, weight: 30, field: 'category', keywords: ['такси', 'бензин', 'парковк', 'доставк', 'трансфер', 'курьер', 'вывоз мусор'], value: 'Доставка / Трансфер / Парковка / Вывоз мусора', confidence: 0.9 },

  // P1: Category — food (weight 25)
  { id: 'cat_food', priority: 1, weight: 25, field: 'category', keywords: ['кейтеринг', 'сладкий стол', 'торт на мероприят', 'банкет'], value: 'Еда / Напитки (сладкий стол, торт, кейтеринг)', confidence: 0.85 },

  // P1: Category — print (weight 20)
  { id: 'cat_print', priority: 1, weight: 20, field: 'category', keywords: ['баннер', 'печать', 'визитки', 'меню печат'], value: 'Печать (баннеры, меню, карточки)', confidence: 0.85 },

  // P2: Wallet — Настя
  { id: 'wallet_nastya', priority: 2, weight: 50, field: 'wallet_key', keywords: ['наличка настя', 'настя наличк', 'нал настя', 'настя нал'], value: 'cash_nastya', confidence: 0.85 },

  // P2: Wallet — Лера
  { id: 'wallet_lera', priority: 2, weight: 50, field: 'wallet_key', keywords: ['наличка лера', 'лера наличк', 'нал лера', 'лера нал'], value: 'cash_lera', confidence: 0.85 },

  // P2: Wallet — Ваня
  { id: 'wallet_vanya', priority: 2, weight: 50, field: 'wallet_key', keywords: ['наличка ваня', 'ваня наличк', 'иван наличк', 'наличка иван', 'нал ваня', 'ваня нал'], value: 'cash_vanya', confidence: 0.85 },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(text: string, keyword: string): boolean {
  const regex = new RegExp(`(?:^|[\\s,.:;!?()«»"'])${escapeRegex(keyword)}`, 'i');
  return regex.test(` ${text} `);
}

/**
 * Find all matching rules, then pick the best per field using:
 * 1. priority (lower wins)
 * 2. weight (higher wins)
 * 3. keyword length (longer = more specific, wins ties)
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

  // Collect ALL matches across all rules
  const matches: RuleMatch[] = [];

  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      if (matchesKeyword(lower, keyword)) {
        matches.push({ rule, keyword });
        break; // first keyword per rule is enough
      }
    }
  }

  // Group by field, pick winner per field
  const fieldMatches = new Map<string, RuleMatch[]>();
  for (const m of matches) {
    const key = m.rule.field;
    if (!fieldMatches.has(key)) fieldMatches.set(key, []);
    fieldMatches.get(key)!.push(m);
  }

  for (const [field, candidates] of fieldMatches) {
    // Sort: priority ASC, weight DESC, keyword length DESC
    candidates.sort((a, b) => {
      if (a.rule.priority !== b.rule.priority) return a.rule.priority - b.rule.priority;
      if (a.rule.weight !== b.rule.weight) return b.rule.weight - a.rule.weight;
      return b.keyword.length - a.keyword.length;
    });

    const winner = candidates[0];
    const losers = candidates.slice(1);

    switch (field) {
      case 'project':
        result.project = winner.rule.value;
        break;
      case 'category':
        result.category = winner.rule.value;
        break;
      case 'wallet_key':
        result.wallet_key = winner.rule.value;
        break;
    }

    if (winner.rule.transactionType) {
      result.transaction_type = winner.rule.transactionType;
    }

    result.confidence = Math.max(result.confidence, winner.rule.confidence);

    // Build explain string
    let reason = `P${winner.rule.priority}/W${winner.rule.weight} [${winner.rule.id}]: "${winner.keyword}" → ${field}="${winner.rule.value}"`;
    if (losers.length > 0) {
      const loserIds = losers.map(l => `${l.rule.id}(W${l.rule.weight})`).join(', ');
      reason += ` | beat: ${loserIds}`;
    }
    result.reasons.push(reason);

    if (import.meta.env?.DEV) {
      console.log(`[RuleEngine] ${reason}`);
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
