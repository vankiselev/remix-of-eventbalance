/**
 * Normalize project_owner abbreviations to full names.
 * Use this everywhere before saving project_owner to the database.
 */
const OWNER_MAP: Record<string, string> = {
  'н': 'Настя',
  'л': 'Лера',
  'в': 'Ваня',
};

export const normalizeProjectOwner = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return OWNER_MAP[trimmed.toLowerCase()] || trimmed;
};
