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
 * Priority levels:
 *   P0 (confidence 1.0) : Project  (офис / склад)
 *   P1 (confidence 0.9) : Category (транспорт, площадка, выплаты, клиент, еда, печать)
 *   P2 (confidence 0.85): Wallet   (наличка Настя / Лера / Ваня)
 *   P3 (confidence 0)   : Fallback — no match
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
  transactionType?: 'income' | 'expense';
  confidence: number;
}

interface RuleMatch {
  rule: Rule;
  keyword: string;
}

// ── Keyword lists ────────────────────────────────────────────

/** Multi-word keywords are matched as-is; single-word keywords
 *  use word-boundary guards so "склад" won't fire on "складчина". */

const RULES: Rule[] = [
  // P0 — project
  { id: 'project_office', priority: 0, weight: 100, field: 'project',
    keywords: ['в офис', 'для офиса', 'офисные', 'офисных', 'офисную', 'офисного',
               'на склад', 'для склада', 'складские', 'складских', 'складскую', 'складского',
               'офис', 'склад'],
    value: 'Склад / Офис', confidence: 1.0 },

  // P1 — category
  { id: 'cat_venue', priority: 1, weight: 60, field: 'category',
    keywords: ['аренда площадк', 'депозит площадк', 'аренда зала', 'депозит зала'],
    value: 'Площадка (депозит, аренда, доп. услуги)', confidence: 0.9 },

  { id: 'cat_client', priority: 1, weight: 55, field: 'category',
    keywords: ['получил оплат', 'оплата от клиент', 'получили оплат',
               'клиент оплатил', 'клиент перевел', 'клиент перевёл'],
    value: 'Получено/Возвращено клиенту', transactionType: 'income', confidence: 0.9 },

  { id: 'cat_salary', priority: 1, weight: 40, field: 'category',
    keywords: ['аванс', 'зарплат', 'бонус', 'оклад', 'чаевые', 'премия'],
    value: 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)', confidence: 0.9 },

  { id: 'cat_transport', priority: 1, weight: 30, field: 'category',
    keywords: ['такси', 'бензин', 'парковк', 'доставк', 'трансфер', 'курьер', 'вывоз мусор'],
    value: 'Доставка / Трансфер / Парковка / Вывоз мусора', confidence: 0.9 },

  { id: 'cat_food', priority: 1, weight: 25, field: 'category',
    keywords: ['кейтеринг', 'сладкий стол', 'торт на мероприят', 'банкет'],
    value: 'Еда / Напитки (сладкий стол, торт, кейтеринг)', confidence: 0.85 },

  { id: 'cat_print', priority: 1, weight: 20, field: 'category',
    keywords: ['баннер', 'печать', 'визитки', 'меню печат'],
    value: 'Печать (баннеры, меню, карточки)', confidence: 0.85 },

  // P2 — wallet
  { id: 'wallet_lera',   priority: 2, weight: 50, field: 'wallet_key',
    keywords: ['наличка лера', 'лера наличк', 'нал лера', 'лера нал'],
    value: 'cash_lera', confidence: 0.85 },

  { id: 'wallet_nastya', priority: 2, weight: 50, field: 'wallet_key',
    keywords: ['наличка настя', 'настя наличк', 'нал настя', 'настя нал'],
    value: 'cash_nastya', confidence: 0.85 },

  { id: 'wallet_vanya',  priority: 2, weight: 50, field: 'wallet_key',
    keywords: ['наличка ваня', 'ваня наличк', 'иван наличк', 'наличка иван', 'нал ваня', 'ваня нал'],
    value: 'cash_vanya', confidence: 0.85 },
];

// ── Helpers ──────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cyrillic-safe word-boundary chars */
const B = '[\\s,.:;!?()«»"\'\\-]';

/**
 * Match keyword in text with word-boundary guards.
 * Both leading and trailing boundaries are enforced so that
 * "склад" does NOT match inside "складчина".
 */
function matchesKeyword(text: string, keyword: string): boolean {
  const pattern = `(?:^|${B})${escapeRegex(keyword)}(?:$|${B})`;
  const regex = new RegExp(pattern, 'i');
  // Pad so anchors work at edges
  return regex.test(` ${text} `);
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

/**
 * Run deterministic rules against a transaction description.
 *
 * Tie-breaker per field:
 *   priority ASC → weight DESC → keyword.length DESC → rule.id ASC
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

  const norm = normalizeDescription(description);

  // Collect ALL matches
  const matches: RuleMatch[] = [];
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      if (matchesKeyword(norm, keyword)) {
        matches.push({ rule, keyword });
        break; // first keyword hit per rule is enough
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

    // Safe reason — no raw description, only rule metadata
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
