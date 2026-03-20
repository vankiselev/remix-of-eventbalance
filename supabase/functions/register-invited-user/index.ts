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
        
        if (!uploadError) {
          const { data: urlData } = adminClient.storage.from('avatars').getPublicUrl(fileName);
          // Replace internal Docker URL (http://kong:8000) with public Supabase URL
          finalAvatarUrl = urlData.publicUrl.replace(/http:\/\/kong:\d+/, supabaseUrl);
        } else {
          console.error('Avatar upload error:', uploadError);
        }
      } catch (avatarError) {
        console.error('Avatar processing error:', avatarError);
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

    // Update invitation_status to 'invited' via direct update (service role bypasses RLS)
    await adminClient.from("profiles").update({ 
      invitation_status: 'invited' 
    }).eq("id", userId);

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
