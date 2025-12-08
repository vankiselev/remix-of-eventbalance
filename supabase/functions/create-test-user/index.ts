import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      throw new Error("Unauthorized");
    }

    // Check if caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_user", { _user_id: caller.id });
    if (!isAdmin) {
      throw new Error("Only admins can create test users");
    }

    const { email, password, firstName, lastName } = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Create user via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${lastName || ""} ${firstName || ""}`.trim(),
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(createError.message);
    }

    console.log("User created:", newUser.user?.id);

    // Mark as test user in profiles
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        is_test_user: true,
        first_name: firstName,
        last_name: lastName,
        full_name: `${lastName || ""} ${firstName || ""}`.trim(),
      })
      .eq("id", newUser.user!.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Don't throw - user is created, just profile update failed
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
