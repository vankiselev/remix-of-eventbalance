import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import {
  OwnerKey, OwnerColorSet,
  DEFAULT_OWNER_COLORS, OWNER_KEYS,
  buildOwnerColorSet, resolveOwnerKey,
} from '@/constants/ownerColors';

export type OwnerColors = Record<OwnerKey, OwnerColorSet>;

function buildDefaults(): OwnerColors {
  const result = {} as OwnerColors;
  for (const key of OWNER_KEYS) {
    const d = DEFAULT_OWNER_COLORS[key];
    result[key] = buildOwnerColorSet(key, d.hex, d.label);
  }
  return result;
}

const DEFAULT_COLORS = buildDefaults();

export function useOwnerColors() {
  const { currentTenantId } = useTenant();

  const { data: colors = DEFAULT_COLORS } = useQuery({
    queryKey: ['owner-colors', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return DEFAULT_COLORS;

      const { data, error } = await supabase
        .from('owner_color_settings' as any)
        .select('owner_key, base_color, label')
        .eq('tenant_id', currentTenantId);

      if (error || !data || data.length === 0) return DEFAULT_COLORS;

      const result = { ...DEFAULT_COLORS };
      for (const row of data as any[]) {
        const key = row.owner_key as OwnerKey;
        if (OWNER_KEYS.includes(key)) {
          result[key] = buildOwnerColorSet(key, row.base_color, row.label);
        }
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  /** Get color set for an owner string like "Настя" or "nastya" */
  const getOwnerColor = (owner?: string | null) => {
    const key = resolveOwnerKey(owner);
    if (!key) return {
      hex: '#9CA3AF',
      dot: '#9CA3AF',
      bg: 'rgba(156,163,175,0.08)',
      bgDark: 'rgba(156,163,175,0.15)',
      border: 'rgba(156,163,175,0.3)',
      text: '#6B7280',
      textDark: '#9CA3AF',
      label: '',
      badgeClass: '',
    } as OwnerColorSet;
    return colors[key];
  };

  return { colors, getOwnerColor, OWNER_KEYS };
}
