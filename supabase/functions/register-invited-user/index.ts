import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, invitation_token } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user with email already confirmed (skip confirmation email)
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email,
        role: role || "member",
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Update profile
    await adminClient.from("profiles").update({
      full_name: full_name || email,
    }).eq("id", userId);

    // Accept invitation if token provided
    if (invitation_token) {
      // Get anon key for RPC call context
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
      
      // Use admin client to accept invitation directly
      const { data: invData } = await adminClient
        .from("invitations")
        .select("id, tenant_id")
        .eq("token", invitation_token)
        .eq("status", "pending")
        .single();

      if (invData) {
        // Mark invitation as accepted
        await adminClient.from("invitations").update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        }).eq("id", invData.id);

        // Add user to tenant if tenant_id exists
        if (invData.tenant_id) {
          await adminClient.from("tenant_memberships").insert({
            tenant_id: invData.tenant_id,
            user_id: userId,
            role: role || "member",
          });
        }

        // Log audit
        await adminClient.from("invitation_audit_log").insert({
          invitation_id: invData.id,
          actor_id: userId,
          action: "accepted",
          details: { email },
        });
      }
    }

    return new Response(
      JSON.stringify({ user: { id: userId, email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
