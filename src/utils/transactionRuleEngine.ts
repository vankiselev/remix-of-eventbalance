/**
 * Deterministic rule engine for transaction field auto-detection.
 * No AI calls — pure regex/keyword matching.
 *
 * Tie-breaker (fully deterministic):
 *   1. priority ASC   (lower = more important level)
 *   2. weight  DESC   (higher = preferred rule within level)
 *   3. keyword length DESC (longer = more specific match)
 *   4. rule.id ASC    (alphabetical, stable across environments)
 *
 * Word boundaries are enforced on BOTH sides of every keyword
 * to prevent false positives (e.g. "склад" must not match "складчина").
 * All keywords must therefore be complete word-forms, not truncated stems.
 *
 * Priority levels:
 *   P0 (confidence 1.0) : Project  (офис / склад)
 *   P1 (confidence 0.9) : Category
 *   P2 (confidence 0.85): Wallet
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
  weight: number;
  field: 'project' | 'category' | 'wallet_key' | 'transaction_type';
  keywords: string[];
  value: string;
  transactionType?: 'income' | 'expense';
  confidence: number;
}

interface RuleMatch {
  rule: Rule;
  keyword: string;
}

// ── Rules ────────────────────────────────────────────────────
// All keywords are complete word-forms (not stems).
// Word boundaries are enforced on both sides during matching.

const RULES: Rule[] = [
  // P0 — project
  { id: 'project_office', priority: 0, weight: 100, field: 'project',
    keywords: [
      'в офис', 'для офиса', 'офисные', 'офисных', 'офисную', 'офисного',
      'на склад', 'для склада', 'складские', 'складских', 'складскую', 'складского',
      'офис', 'склад',
    ],
    value: 'Склад / Офис', confidence: 1.0 },

  // P1 — category
  { id: 'cat_venue', priority: 1, weight: 60, field: 'category',
    keywords: [
      'аренда площадки', 'аренда площадку', 'аренда площадке',
      'депозит площадки', 'депозит площадку', 'депозит площадке',
      'аренда зала', 'депозит зала',
    ],
    value: 'Площадка (депозит, аренда, доп. услуги)', confidence: 0.9 },

  { id: 'cat_client', priority: 1, weight: 55, field: 'category',
    keywords: [
      'получил оплату', 'получили оплату',
      'оплата от клиента', 'оплата от клиентов',
      'клиент оплатил', 'клиент перевел', 'клиент перевёл',
    ],
    value: 'Получено/Возвращено клиенту', transactionType: 'income', confidence: 0.9 },

  { id: 'cat_salary', priority: 1, weight: 40, field: 'category',
    keywords: [
      'аванс', 'зарплата', 'зарплату', 'зарплаты', 'зарплате', 'зарплатой',
      'бонус', 'оклад', 'чаевые', 'премия', 'премию', 'премии',
    ],
    value: 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)', confidence: 0.9 },

  { id: 'cat_transport', priority: 1, weight: 30, field: 'category',
    keywords: [
      'такси',
      'бензин',
      'парковка', 'парковку', 'парковки', 'парковке', 'парковкой',
      'доставка', 'доставку', 'доставки', 'доставке', 'доставкой',
      'трансфер',
      'курьер',
      'вывоз мусора',
    ],
    value: 'Доставка / Трансфер / Парковка / Вывоз мусора', confidence: 0.9 },

  { id: 'cat_food', priority: 1, weight: 25, field: 'category',
    keywords: [
      'кейтеринг', 'сладкий стол',
      'торт на мероприятие', 'торт на мероприятии',
      'банкет',
    ],
    value: 'Еда / Напитки (сладкий стол, торт, кейтеринг)', confidence: 0.85 },

  { id: 'cat_print', priority: 1, weight: 20, field: 'category',
    keywords: ['баннер', 'печать', 'визитки', 'меню печать', 'меню печати'],
    value: 'Печать (баннеры, меню, карточки)', confidence: 0.85 },

  // P2 — wallet
  { id: 'wallet_lera', priority: 2, weight: 50, field: 'wallet_key',
    keywords: [
      'наличка лера', 'лера наличка', 'лера наличку', 'лера наличкой',
      'нал лера', 'лера нал',
    ],
    value: 'cash_lera', confidence: 0.85 },

  { id: 'wallet_nastya', priority: 2, weight: 50, field: 'wallet_key',
    keywords: [
      'наличка настя', 'настя наличка', 'настя наличку', 'настя наличкой',
      'нал настя', 'настя нал',
    ],
    value: 'cash_nastya', confidence: 0.85 },

  { id: 'wallet_vanya', priority: 2, weight: 50, field: 'wallet_key',
    keywords: [
      'наличка ваня', 'ваня наличка', 'ваня наличку', 'ваня наличкой',
      'иван наличка', 'иван наличку', 'наличка иван',
      'нал ваня', 'ваня нал',
    ],
    value: 'cash_vanya', confidence: 0.85 },
];

// ── Helpers ──────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cyrillic-safe word-boundary chars */
const B = '[\\s,.:;!?()«»"\'\\-]';

/**
 * Match keyword with word-boundary guards on BOTH sides.
 * Prevents "склад" matching inside "складчина".
 */
function matchesKeyword(text: string, keyword: string): boolean {
  const pattern = `(?:^|${B})${escapeRegex(keyword)}(?:$|${B})`;
  return new RegExp(pattern, 'i').test(` ${text} `);
}

/**
 * Normalise input: trim, collapse whitespace, lowercase, ё→е.
 */
export function normalizeDescription(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/ё/g, 'е');
}

// ── Core ─────────────────────────────────────────────────────

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

  const norm = normalizeDescription(description);

  // Collect ALL matches
  const matches: RuleMatch[] = [];
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      // keywords with ё are also normalised for matching
      const normKw = keyword.replace(/ё/g, 'е');
      if (matchesKeyword(norm, normKw)) {
        matches.push({ rule, keyword });
        break;
      }
    }
  }

  // Group by field
  const fieldMatches = new Map<string, RuleMatch[]>();
  for (const m of matches) {
    const key = m.rule.field;
    if (!fieldMatches.has(key)) fieldMatches.set(key, []);
    fieldMatches.get(key)!.push(m);
  }

  for (const [field, candidates] of fieldMatches) {
    // Deterministic sort: priority ASC → weight DESC → kw length DESC → id ASC
    candidates.sort((a, b) => {
      if (a.rule.priority !== b.rule.priority) return a.rule.priority - b.rule.priority;
      if (a.rule.weight !== b.rule.weight) return b.rule.weight - a.rule.weight;
      if (a.keyword.length !== b.keyword.length) return b.keyword.length - a.keyword.length;
      return a.rule.id.localeCompare(b.rule.id);
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

    // Safe reason — no raw description
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
