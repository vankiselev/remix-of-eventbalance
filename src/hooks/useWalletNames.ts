import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { WALLET_TYPES, resolveWalletType, type WalletTypeDef } from '@/constants/walletTypes';

export interface WalletDisplayInfo {
  key: string;
  displayName: string;
  defaultName: string;
  sortOrder: number;
  isActive: boolean;
  isCashWallet: boolean;
}

function buildDefaults(): Record<string, WalletDisplayInfo> {
  const result: Record<string, WalletDisplayInfo> = {};
  for (const w of WALLET_TYPES) {
    result[w.key] = {
      key: w.key,
      displayName: w.defaultName,
      defaultName: w.defaultName,
      sortOrder: w.sortOrder,
      isActive: true,
      isCashWallet: w.isCashWallet,
    };
  }
  return result;
}

const DEFAULT_WALLETS = buildDefaults();

export function useWalletNames() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  const { data: wallets = DEFAULT_WALLETS } = useQuery({
    queryKey: ['wallet-names', tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_WALLETS;

      const { data, error } = await supabase
        .from('wallet_name_settings' as any)
        .select('wallet_key, display_name, sort_order, is_active')
        .eq('tenant_id', tenantId);

      if (error || !data || data.length === 0) return DEFAULT_WALLETS;

      const result = { ...DEFAULT_WALLETS };
      for (const row of data as any[]) {
        const key = row.wallet_key as string;
        if (result[key]) {
          result[key] = {
            ...result[key],
            displayName: row.display_name || result[key].defaultName,
            sortOrder: row.sort_order ?? result[key].sortOrder,
            isActive: row.is_active ?? true,
          };
        }
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Resolve any cash_type string (from DB) to the current display name.
   * Handles stable keys, legacy display names, and aliases.
   */
  const getWalletDisplayName = (cashType?: string | null): string => {
    if (!cashType) return 'Не указан';
    const def = resolveWalletType(cashType);
    if (def && wallets[def.key]) {
      return wallets[def.key].displayName;
    }
    // Unknown wallet type — return as-is
    return cashType;
  };

  /**
   * Get all wallets sorted and optionally filtered by active status.
   */
  const getActiveWallets = (onlyActive = true): WalletDisplayInfo[] => {
    return Object.values(wallets)
      .filter(w => !onlyActive || w.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  /**
   * Get only cash wallets (for forms that only show Наличка options).
   */
  const getCashWallets = (): WalletDisplayInfo[] => {
    return getActiveWallets().filter(w => w.isCashWallet);
  };

  return {
    wallets,
    getWalletDisplayName,
    getActiveWallets,
    getCashWallets,
    WALLET_TYPES,
  };
}
