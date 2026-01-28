import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Reserved slugs that cannot be used
const RESERVED_SLUGS = ['auth', 'register', 'admin', 'api', 'awaiting-invitation', 'select-company', 'default', 'app', 'www', 'dashboard', 'settings', 'profile'];

interface CreateTenantRequest {
  name: string;
  slug: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { name, slug }: CreateTenantRequest = await req.json();

    // Validate input
    if (!name || name.length < 2 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Название компании должно быть от 2 до 100 символов' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!slug || slug.length < 3 || slug.length > 30) {
      return new Response(
        JSON.stringify({ error: 'Адрес компании должен быть от 3 до 30 символов' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!slugRegex.test(slug)) {
      return new Response(
        JSON.stringify({ error: 'Адрес может содержать только латинские буквы, цифры и дефисы' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check reserved slugs
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Этот адрес зарезервирован системой' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if slug is already taken
    const { data: existingTenant, error: checkError } = await adminClient
      .from('tenants')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking slug:', checkError);
      return new Response(
        JSON.stringify({ error: 'Ошибка проверки адреса' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: 'Этот адрес уже занят' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create tenant
    const { data: tenant, error: createError } = await adminClient
      .from('tenants')
      .insert({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating tenant:', createError);
      return new Response(
        JSON.stringify({ error: 'Ошибка создания компании' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create tenant membership for the user as owner
    const { error: membershipError } = await adminClient
      .from('tenant_memberships')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        is_owner: true,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      // Rollback tenant creation
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Ошибка создания членства' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tenant created: ${tenant.slug} (${tenant.id}) by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-tenant:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
