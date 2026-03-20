/**
 * Normalizes avatar URLs by replacing internal Docker hosts (kong:8000)
 * with the public Supabase URL.
 */
const PUBLIC_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Replace internal Docker host patterns
  return url.replace(/http:\/\/kong:\d+/, PUBLIC_SUPABASE_URL);
}
