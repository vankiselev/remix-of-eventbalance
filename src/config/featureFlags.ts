/**
 * Centralized feature flags.
 * Flip to `true` (or wire to env var) to re-enable a feature.
 */

/** FNS receipt verification — temporarily disabled */
export const ENABLE_FNS_RECEIPT_CHECK =
  import.meta.env.VITE_ENABLE_FNS_RECEIPT_CHECK === 'true';
