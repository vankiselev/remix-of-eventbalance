/**
 * Central wallet type definitions.
 * wallet_key is the stable identifier stored in DB cash_type or used as form value.
 * defaultName is the display name shown to users (overridable via wallet_name_settings).
 */

export interface WalletTypeDef {
  key: string;
  defaultName: string;
  /** Legacy strings stored in financial_transactions.cash_type that map to this wallet */
  aliases: string[];
  sortOrder: number;
  /** Is this a "cash on hand" wallet (affects totals calculation) */
  isCashWallet: boolean;
}

export const WALLET_TYPES: WalletTypeDef[] = [
  {
    key: 'cash_nastya',
    defaultName: 'Наличка Настя',
    aliases: ['nastya', 'Наличка Настя', 'наличка настя'],
    sortOrder: 0,
    isCashWallet: true,
  },
  {
    key: 'cash_lera',
    defaultName: 'Наличка Лера',
    aliases: ['lera', 'Наличка Лера', 'наличка лера'],
    sortOrder: 1,
    isCashWallet: true,
  },
  {
    key: 'cash_vanya',
    defaultName: 'Наличка Ваня',
    aliases: ['vanya', 'Наличка Ваня', 'наличка ваня'],
    sortOrder: 2,
    isCashWallet: true,
  },
  {
    key: 'corp_card_nastya',
    defaultName: 'Корп. карта Настя',
    aliases: ['Корп. карта Настя', 'корп.карта Настя', 'корп. карта настя'],
    sortOrder: 3,
    isCashWallet: false,
  },
  {
    key: 'corp_card_lera',
    defaultName: 'Корп. карта Лера',
    aliases: ['Корп. карта Лера', 'корп.карта Лера', 'корп. карта лера'],
    sortOrder: 4,
    isCashWallet: false,
  },
  {
    key: 'ip_nastya',
    defaultName: 'ИП Настя',
    aliases: ['ИП Настя', 'ип настя'],
    sortOrder: 5,
    isCashWallet: false,
  },
  {
    key: 'ip_lera',
    defaultName: 'ИП Лера',
    aliases: ['ИП Лера', 'ип лера'],
    sortOrder: 6,
    isCashWallet: false,
  },
  {
    key: 'client_paid',
    defaultName: 'Оплатил(а) клиент',
    aliases: ['Оплатил(а) клиент', 'оплатил(а) клиент', 'Оплатил клиент'],
    sortOrder: 7,
    isCashWallet: false,
  },
  {
    key: 'nastya_paid',
    defaultName: 'Оплатила Настя',
    aliases: ['Оплатила Настя', 'оплатила настя'],
    sortOrder: 8,
    isCashWallet: false,
  },
  {
    key: 'lera_paid',
    defaultName: 'Оплатила Лера',
    aliases: ['Оплатила Лера', 'оплатила лера'],
    sortOrder: 9,
    isCashWallet: false,
  },
  {
    key: 'nastya_received',
    defaultName: 'Получила Настя',
    aliases: ['Получила Настя', 'получила настя'],
    sortOrder: 10,
    isCashWallet: false,
  },
  {
    key: 'lera_received',
    defaultName: 'Получила Лера',
    aliases: ['Получила Лера', 'получила лера'],
    sortOrder: 11,
    isCashWallet: false,
  },
];

/** Build a lookup from any alias or key → WalletTypeDef */
const aliasMap = new Map<string, WalletTypeDef>();
for (const w of WALLET_TYPES) {
  aliasMap.set(w.key.toLowerCase(), w);
  aliasMap.set(w.defaultName.toLowerCase(), w);
  for (const a of w.aliases) {
    aliasMap.set(a.toLowerCase(), w);
  }
}

/**
 * Resolve any cash_type string (key, display name, or legacy alias) to a WalletTypeDef.
 * Returns undefined if no match.
 */
export function resolveWalletType(cashType?: string | null): WalletTypeDef | undefined {
  if (!cashType) return undefined;
  return aliasMap.get(cashType.trim().toLowerCase());
}

/** All wallet keys in display order */
export const WALLET_KEYS = WALLET_TYPES.map(w => w.key);

/** Only cash wallets (used for "Итого на руках") */
export const CASH_WALLET_KEYS = WALLET_TYPES.filter(w => w.isCashWallet).map(w => w.key);
