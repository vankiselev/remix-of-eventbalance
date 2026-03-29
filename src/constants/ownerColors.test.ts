import { describe, it, expect } from 'vitest';
import { resolveOwnerKey, buildOwnerColorSet, DEFAULT_OWNER_COLORS, OWNER_KEYS } from './ownerColors';

describe('ownerColors', () => {
  describe('resolveOwnerKey', () => {
    it('resolves Russian names', () => {
      expect(resolveOwnerKey('Настя')).toBe('nastya');
      expect(resolveOwnerKey('Лера')).toBe('lera');
      expect(resolveOwnerKey('Ваня')).toBe('vanya');
      expect(resolveOwnerKey('Иван')).toBe('vanya');
    });

    it('resolves English keys', () => {
      expect(resolveOwnerKey('nastya')).toBe('nastya');
      expect(resolveOwnerKey('lera')).toBe('lera');
      expect(resolveOwnerKey('vanya')).toBe('vanya');
    });

    it('returns null for unknown/empty', () => {
      expect(resolveOwnerKey(null)).toBeNull();
      expect(resolveOwnerKey('')).toBeNull();
      expect(resolveOwnerKey('Unknown Person')).toBeNull();
    });
  });

  describe('buildOwnerColorSet', () => {
    it('builds correct color set from hex', () => {
      const set = buildOwnerColorSet('nastya', '#2563EB', 'Настя');
      expect(set.hex).toBe('#2563EB');
      expect(set.dot).toBe('#2563EB');
      expect(set.label).toBe('Настя');
      expect(set.badgeClass).toBe('badge-nastya');
      expect(set.bg).toContain('rgba(37');
    });
  });

  describe('DEFAULT_OWNER_COLORS', () => {
    it('has all 3 owners', () => {
      expect(OWNER_KEYS).toEqual(['nastya', 'lera', 'vanya']);
      for (const key of OWNER_KEYS) {
        expect(DEFAULT_OWNER_COLORS[key]).toBeDefined();
        expect(DEFAULT_OWNER_COLORS[key].hex).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });
  });
});
