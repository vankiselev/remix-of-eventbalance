/**
 * Generate a URL-safe slug from a name string.
 * Shared between CreateTenantDialog and TenantDetailDialog.
 */
export const generateSlug = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
};
