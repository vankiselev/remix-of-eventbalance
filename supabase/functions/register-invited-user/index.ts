import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      email, password, full_name, role, invitation_token, invitation_id,
      first_name, last_name, middle_name, phone, birth_date,
      avatar_url, avatar_base64,
    } = await req.json();

    let normalizedToken = "";
    if (typeof invitation_token === "string") {
      try {
        normalizedToken = decodeURIComponent(invitation_token).trim();
      } catch {
        normalizedToken = invitation_token.trim();
      }
    }

    const normalizedInvitationId =
      typeof invitation_id === "string" && invitation_id.trim().length > 0
        ? invitation_id.trim()
        : null;

    if (!email || !password || (!normalizedToken && !normalizedInvitationId)) {
      return jsonResponse({ error: "Email, password и invitation token обязательны" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[register] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ error: "Ошибка конфигурации сервера." }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── STEP 1: Validate invitation ──
    // First do an unrestricted lookup to give specific error messages
    console.log("[register] Step 1: Looking up token...");
    const { data: invData, error: invError } = await adminClient
      .from("invitations")
      .select("id, tenant_id, invited_by, email, expires_at, status")
      .eq("token", invitation_token)
      .single();

    if (invError || !invData) {
      console.error("[register] Token not found in DB:", invError?.message);
      return jsonResponse({ error: "Токен приглашения не найден. Проверьте ссылку." }, 404);
    }

    // Now check specific conditions and return targeted errors
    if (invData.status === "cancelled" || invData.status === "revoked") {
      console.error("[register] Invitation cancelled/revoked:", invData.status);
      return jsonResponse({ error: "Приглашение было отменено. Запросите новое приглашение." }, 410);
    }

    const isRetry = invData.status === "accepted";

    if (!isRetry && !["pending", "sent"].includes(invData.status)) {
      console.error("[register] Unexpected invitation status:", invData.status);
      return jsonResponse({ error: `Приглашение имеет статус "${invData.status}" и не может быть использовано.` }, 410);
    }

    if (!isRetry && invData.expires_at && new Date(invData.expires_at) < new Date()) {
      console.error("[register] Invitation expired:", invData.expires_at);
      return jsonResponse({ error: "Срок действия приглашения истёк. Запросите новое приглашение." }, 410);
    }

    if (invData.email.toLowerCase() !== email.toLowerCase()) {
      console.error("[register] Email mismatch:", email, "vs", invData.email);
      return jsonResponse({ error: "Email не совпадает с приглашением" }, 403);
    }
    console.log("[register] Step 1 OK: invitation valid, status:", invData.status, "isRetry:", isRetry);

    // ── STEP 2: Upload avatar (non-blocking) ──
    let finalAvatarUrl = avatar_url || null;
    if (avatar_base64) {
      try {
        const base64Data = avatar_base64.includes(",")
          ? avatar_base64.split(",")[1]
          : avatar_base64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const fileName = `invite_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await adminClient.storage
          .from("avatars")
          .upload(fileName, bytes, { contentType: "image/jpeg" });

        if (uploadError) {
          console.warn("[register] Avatar upload failed (non-blocking):", uploadError.message);
        } else {
          finalAvatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;
        }
      } catch (avatarErr) {
        console.warn("[register] Avatar processing failed (non-blocking):", avatarErr);
      }
    }

    // ── STEP 3: Create user (or find existing on retry) ──
    console.log("[register] Step 3: Creating user for:", email);
    let userId: string;

    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email,
        first_name: first_name || "",
        last_name: last_name || "",
        middle_name: middle_name || "",
        phone: phone || null,
        birth_date: birth_date || null,
        avatar_url: finalAvatarUrl,
        role: role || "member",
      },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        console.log("[register] Step 3: User already exists, looking up...");
        const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
        if (listError) {
          console.error("[register] Failed to list users:", listError.message);
          return jsonResponse({ error: "Пользователь уже зарегистрирован. Попробуйте войти с вашим паролем." }, 409);
        }
        const existingUser = existingUsers.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (!existingUser) {
          return jsonResponse({ error: "Пользователь уже зарегистрирован. Попробуйте войти с вашим паролем." }, 409);
        }
        userId = existingUser.id;
        console.log("[register] Step 3 OK: found existing user, id:", userId);
      } else {
        console.error("[register] Step 3 FAILED - createUser:", createError.message);
        return jsonResponse({ error: `Ошибка создания аккаунта: ${createError.message}` }, 400);
      }
    } else {
      userId = userData.user.id;
      console.log("[register] Step 3 OK: user created, id:", userId);
    }

    // ── STEP 4: Create/update profile (non-fatal) ──
    const profileData: Record<string, unknown> = {
      id: userId,
      email: email,
      full_name: full_name || email,
    };
    if (finalAvatarUrl) profileData.avatar_url = finalAvatarUrl;
    if (phone) profileData.phone = phone;
    if (birth_date) profileData.birth_date = birth_date;
    if (first_name) profileData.first_name = first_name;
    if (last_name) profileData.last_name = last_name;
    if (middle_name) profileData.middle_name = middle_name;

    try {
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert(profileData, { onConflict: "id" });
      if (profileError) {
        console.error("[register] Step 4 WARN - profile upsert failed:", profileError.message);
      } else {
        console.log("[register] Step 4 OK: profile upserted");
      }
    } catch (profileErr) {
      console.error("[register] Step 4 WARN - profile exception:", profileErr);
    }

    // ── STEP 5: Insert tenant membership (idempotent, non-fatal) ──
    if (invData.tenant_id) {
      try {
        const { error: tmError } = await adminClient
          .from("tenant_memberships")
          .upsert(
            { tenant_id: invData.tenant_id, user_id: userId, role: role || "member" },
            { onConflict: "tenant_id,user_id" }
          );
        if (tmError) {
          // Fallback: try insert, ignore duplicate
          const { error: tmInsertError } = await adminClient
            .from("tenant_memberships")
            .insert({ tenant_id: invData.tenant_id, user_id: userId, role: role || "member" });
          if (tmInsertError && !tmInsertError.message.includes("duplicate")) {
            console.error("[register] Step 5 WARN - tenant_memberships insert failed:", tmInsertError.message);
          } else {
            console.log("[register] Step 5 OK: tenant membership created (insert fallback)");
          }
        } else {
          console.log("[register] Step 5 OK: tenant membership upserted");
        }
      } catch (tmErr) {
        console.error("[register] Step 5 WARN - tenant_memberships exception:", tmErr);
      }
    }

    // ── STEP 6: Audit log (non-fatal) ──
    try {
      await adminClient.from("invitation_audit_log").insert({
        invitation_id: invData.id,
        actor_id: userId,
        action: isRetry ? "accepted_retry" : "accepted",
        details: { email },
      });
      console.log("[register] Step 6 OK: audit log created");
    } catch (auditErr) {
      console.error("[register] Step 6 WARN - audit log failed:", auditErr);
    }

    // ── STEP 7: Accept invitation — ONLY after all critical steps succeeded ──
    if (!isRetry) {
      try {
        const { error: invUpdateErr } = await adminClient
          .from("invitations")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", invData.id);
        if (invUpdateErr) {
          console.error("[register] Step 7 WARN - invitation update failed:", invUpdateErr.message);
        } else {
          console.log("[register] Step 7 OK: invitation accepted");
        }
      } catch (invUpErr) {
        console.error("[register] Step 7 WARN - invitation exception:", invUpErr);
      }
    } else {
      console.log("[register] Step 7 SKIP: invitation already accepted (retry)");
    }

    // ── STEP 8: Notify admins (non-fatal) ──
    try {
      const recipientIds: string[] = [];
      if (invData.invited_by) recipientIds.push(invData.invited_by);

      if (invData.tenant_id) {
        const { data: tenantAdmins } = await adminClient
          .from("tenant_memberships")
          .select("user_id")
          .eq("tenant_id", invData.tenant_id)
          .in("role", ["owner", "admin"]);
        if (tenantAdmins) {
          for (const ta of tenantAdmins) recipientIds.push(ta.user_id);
        }
      }

      const uniqueIds = [...new Set(recipientIds)].filter((id) => id !== userId);
      if (uniqueIds.length > 0) {
        await adminClient.from("notifications").insert(
          uniqueIds.map((adminId) => ({
            user_id: adminId,
            title: "Новая регистрация",
            message: `Пользователь ${full_name || email} (${email}) зарегистрировался по приглашению`,
            type: "system",
            data: { user_email: email, user_id: userId },
          }))
        );
      }
      console.log("[register] Step 8 OK: notifications sent");
    } catch (notifErr) {
      console.error("[register] Step 8 WARN - notifications failed:", notifErr);
    }

    console.log("[register] ✅ Registration complete for:", email);
    return jsonResponse({ user: { id: userId, email } });
  } catch (error) {
    console.error("[register] ❌ Unhandled error:", error);
    return jsonResponse({ error: error.message || "Внутренняя ошибка сервера" }, 500);
  }
});
