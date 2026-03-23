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
      first_name, last_name, middle_name, phone, birth_date, 
      avatar_url, avatar_base64
    } = await req.json();

    if (!email || !password || !invitation_token) {
      return new Response(
        JSON.stringify({ error: "Email, password and invitation token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SECURITY: Validate invitation token BEFORE any user creation
    const { data: invData, error: invError } = await adminClient
      .from("invitations")
      .select("id, tenant_id, invited_by, email, expires_at")
      .eq("token", invitation_token)
      .in("status", ["pending", "sent"])
      .single();

    if (invError || !invData) {
      return new Response(
        JSON.stringify({ error: "Invalid or already used invitation token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (invData.expires_at && new Date(invData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invitation token has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches invitation
    if (invData.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Email does not match the invitation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Compute public base URL from the request origin (not SUPABASE_URL which may be internal)
    const reqUrl = new URL(req.url);
    const publicBaseUrl = `${reqUrl.protocol}//${reqUrl.host}`;

    // Upload avatar if base64 provided
    let finalAvatarUrl = avatar_url || null;
    if (avatar_base64) {
      try {
        const base64Data = avatar_base64.includes(',') 
          ? avatar_base64.split(',')[1] 
          : avatar_base64;
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const fileName = `invite_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await adminClient.storage
          .from('avatars')
          .upload(fileName, bytes, { contentType: 'image/jpeg' });
        
        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          return new Response(
            JSON.stringify({ error: `Avatar upload failed: ${uploadError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Build public URL manually to avoid internal Docker host (kong:8000)
        finalAvatarUrl = `${publicBaseUrl}/storage/v1/object/public/avatars/${fileName}`;
        console.log('Avatar uploaded, public URL:', finalAvatarUrl);
      } catch (avatarError) {
        console.error('Avatar processing error:', avatarError);
        return new Response(
          JSON.stringify({ error: `Avatar processing failed: ${avatarError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create user - all profile fields go into user_metadata
    // The handle_new_user trigger will read them and insert into profiles
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email,
        first_name: first_name || '',
        last_name: last_name || '',
        middle_name: middle_name || '',
        phone: phone || null,
        birth_date: birth_date || null,
        avatar_url: finalAvatarUrl,
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

    // Explicitly update profile fields that the trigger might not handle
    // This is a safety net for self-hosted where the trigger may be outdated
    const profileUpdate: Record<string, any> = {};
    if (finalAvatarUrl) profileUpdate.avatar_url = finalAvatarUrl;
    if (phone) profileUpdate.phone = phone;
    if (birth_date) profileUpdate.birth_date = birth_date;
    if (first_name) profileUpdate.first_name = first_name;
    if (last_name) profileUpdate.last_name = last_name;
    if (middle_name) profileUpdate.middle_name = middle_name;
    if (full_name) profileUpdate.full_name = full_name;

    if (Object.keys(profileUpdate).length > 0) {
      await adminClient.from("profiles")
        .update(profileUpdate)
        .eq("id", userId);
    }

    // Accept invitation — reuse invData from pre-validation above
    const invitedBy: string | null = invData.invited_by;
    const invTenantId: string | null = invData.tenant_id;

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

    // Send notification to admins about new registration
    try {
      const recipientIds: string[] = [];

      if (invitedBy) {
        recipientIds.push(invitedBy);
      }

      if (invTenantId) {
        const { data: tenantAdmins } = await adminClient
          .from("tenant_memberships")
          .select("user_id")
          .eq("tenant_id", invTenantId)
          .in("role", ["owner", "admin"]);

        if (tenantAdmins) {
          for (const ta of tenantAdmins) {
            recipientIds.push(ta.user_id);
          }
        }
      }

      const uniqueIds = [...new Set(recipientIds)].filter(id => id !== userId);

      const notifications = uniqueIds.map(adminId => ({
        user_id: adminId,
        title: "Новая регистрация",
        message: `Пользователь ${full_name || email} (${email}) зарегистрировался по приглашению и ожидает одобрения`,
        type: "system",
        data: { user_email: email, user_id: userId },
      }));

      if (notifications.length > 0) {
        await adminClient.from("notifications").insert(notifications);
      }
    } catch (notifError) {
      console.error("Failed to send admin notifications:", notifError);
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
