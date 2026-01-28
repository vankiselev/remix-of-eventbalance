import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Get a secret value from the system_secrets table
 * This function is used by Edge Functions to retrieve secrets from the database
 * instead of environment variables.
 */
export async function getSystemSecret(secretKey: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[getSystemSecret] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.rpc('get_system_secret', { 
    secret_key: secretKey 
  });

  if (error) {
    console.error(`[getSystemSecret] Error fetching secret "${secretKey}":`, error.message);
    return null;
  }

  return data;
}

/**
 * Get multiple secrets at once
 * More efficient for functions that need several secrets
 */
export async function getSystemSecrets(secretKeys: string[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  
  // Fetch all secrets in parallel
  const promises = secretKeys.map(async (key) => {
    const value = await getSystemSecret(key);
    results[key] = value;
  });

  await Promise.all(promises);
  return results;
}
