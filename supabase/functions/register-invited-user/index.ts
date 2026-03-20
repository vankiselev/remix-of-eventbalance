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
    const { 
      email, password, full_name, role, invitation_token,
      first_name, last_name, middle_name, phone, birth_date, avatar_url
    } = await req.json();

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

    // Create user with email already confirmed
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

    // Update profile with all provided fields
    const profileUpdate: Record<string, any> = {
      full_name: full_name || email,
      invitation_status: 'invited',
    };
    if (first_name) profileUpdate.first_name = first_name;
    if (last_name) profileUpdate.last_name = last_name;
    if (middle_name) profileUpdate.middle_name = middle_name;
    if (phone) profileUpdate.phone = phone;
    if (birth_date) profileUpdate.birth_date = birth_date;
    if (avatar_url) profileUpdate.avatar_url = avatar_url;

    await adminClient.from("profiles").update(profileUpdate).eq("id", userId);

    // Accept invitation if token provided
    let invitedBy: string | null = null;
    let invTenantId: string | null = null;

    if (invitation_token) {
      const { data: invData } = await adminClient
        .from("invitations")
        .select("id, tenant_id, invited_by")
        .eq("token", invitation_token)
        .eq("status", "pending")
        .single();

      if (invData) {
        invitedBy = invData.invited_by;
        invTenantId = invData.tenant_id;

        await adminClient.from("invitations").update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        }).eq("id", invData.id);

        if (invData.tenant_id) {
          await adminClient.from("tenant_memberships").insert({
            tenant_id: invData.tenant_id,
            user_id: userId,
            role: role || "member",
          });
        }

        await adminClient.from("invitation_audit_log").insert({
          invitation_id: invData.id,
          actor_id: userId,
          action: "accepted",
          details: { email },
        });
      }
    }

    // Send notification to all admins about new registration
    try {
      const { data: adminAssignments } = await adminClient
        .from("user_role_assignments")
        .select("user_id, role_id");

      if (adminAssignments && adminAssignments.length > 0) {
        // Get admin role IDs
        const { data: adminRoles } = await adminClient
          .from("role_definitions")
          .select("id")
          .in("name", ["admin", "super_admin"]);

        const adminRoleIds = (adminRoles || []).map(r => r.id);
        const adminUserIds = adminAssignments
          .filter(a => adminRoleIds.includes(a.role_id))
          .map(a => a.user_id);

        const uniqueAdminIds = [...new Set(adminUserIds)];

        // Insert notifications directly
        const notifications = uniqueAdminIds.map(adminId => ({
          user_id: adminId,
          title: "Новая регистрация",
          message: `Пользователь ${full_name || email} (${email}) зарегистрировался по приглашению`,
          type: "system",
          data: { user_email: email, user_id: userId },
        }));

        if (notifications.length > 0) {
          await adminClient.from("notifications").insert(notifications);
        }
      }
    } catch (notifError) {
      console.error("Failed to send admin notifications:", notifError);
      // Don't fail the registration if notifications fail
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
