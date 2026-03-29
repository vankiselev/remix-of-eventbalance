/**
 * Unified owner color system.
 * Single source of truth for Настя / Лера / Ваня colors across the app.
 */

export type OwnerKey = 'nastya' | 'lera' | 'vanya';

export interface OwnerColorSet {
  label: string;
  /** Base HEX color, e.g. "#2563EB" */
  hex: string;
  /** Tailwind-compatible inline styles derived from hex */
  dot: string;
  bg: string;
  bgDark: string;
  border: string;
  text: string;
  textDark: string;
  /** CSS badge class from index.css */
  badgeClass: string;
}

export const DEFAULT_OWNER_COLORS: Record<OwnerKey, { label: string; hex: string }> = {
  nastya: { label: 'Настя', hex: '#2563EB' },
  lera:   { label: 'Лера',  hex: '#16A34A' },
  vanya:  { label: 'Ваня',  hex: '#7C3AED' },
};

/** Parse hex to RGB */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Generate a full color set from a base hex color */
export function buildOwnerColorSet(key: OwnerKey, hex: string, label: string): OwnerColorSet {
  const { r, g, b } = hexToRgb(hex);
  return {
    label,
    hex,
    dot: hex,
    bg: `rgba(${r}, ${g}, ${b}, 0.08)`,
    bgDark: `rgba(${r}, ${g}, ${b}, 0.15)`,
    border: `rgba(${r}, ${g}, ${b}, 0.3)`,
    text: hex,
    textDark: `rgba(${Math.min(r + 60, 255)}, ${Math.min(g + 60, 255)}, ${Math.min(b + 60, 255)}, 1)`,
    badgeClass: `badge-${key}`,
  };
}

/** Resolve an owner string to a key */
export function resolveOwnerKey(owner?: string | null): OwnerKey | null {
  if (!owner) return null;
  const o = owner.toLowerCase();
  if (o.includes('настя') || o === 'nastya') return 'nastya';
  if (o.includes('лера') || o === 'lera') return 'lera';
  if (o.includes('ваня') || o.includes('иван') || o === 'vanya') return 'vanya';
  return null;
}

/** All owner keys in display order */
export const OWNER_KEYS: OwnerKey[] = ['nastya', 'lera', 'vanya'];
