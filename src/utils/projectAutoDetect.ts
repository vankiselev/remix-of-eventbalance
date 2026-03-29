/**
 * Local deterministic project auto-detection by keywords in description.
 * No AI calls — pure string matching.
 */

export interface ProjectDetectionResult {
  project: string | null;
  confidence: number;
  reason?: string;
}

const OFFICE_WAREHOUSE_KEYWORDS = [
  'в офис', 'для офиса', 'офисные', 'офисных', 'офисную', 'офисного',
  'на склад', 'для склада', 'складские', 'складских', 'складскую', 'складского',
  'офис', 'склад',
];

/**
 * Detects project by description keywords.
 * Returns matched project with confidence=1.0 or null.
 */
export function detectProjectByDescription(description: string): ProjectDetectionResult {
  if (!description || description.trim().length === 0) {
    return { project: null, confidence: 0 };
  }

  const lower = description.toLowerCase();

  for (const keyword of OFFICE_WAREHOUSE_KEYWORDS) {
    // Match as whole word (surrounded by word boundaries or string edges)
    const regex = new RegExp(`(?:^|[\\s,.:;!?()«»"'])${escapeRegex(keyword)}(?:$|[\\s,.:;!?()«»"'])`, 'i');
    if (regex.test(` ${lower} `)) {
      return {
        project: 'Склад / Офис',
        confidence: 1.0,
        reason: `Ключевое слово: "${keyword}"`,
      };
    }
  }

  return { project: null, confidence: 0 };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
