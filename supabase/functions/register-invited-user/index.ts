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

function deriveProjectApiUrl(req: Request, fallbackUrl: string | null): string {
  try {
    const url = new URL(req.url);
    const marker = "/functions/v1/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex > -1) {
      const projectPath = url.pathname.slice(0, markerIndex);
      return `${url.origin}${projectPath}`;
    }
  } catch (e) {
    console.warn("[register] Failed to derive project URL from request:", e);
  }

  return fallbackUrl || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsedBody = await req.json();
    console.log("[register] Parsed request body", {
      keys: parsedBody && typeof parsedBody === "object" ? Object.keys(parsedBody as Record<string, unknown>) : [],
      invitation_id:
        typeof parsedBody?.invitation_id === "string"
          ? parsedBody.invitation_id
          : typeof parsedBody?.invitationId === "string"
            ? parsedBody.invitationId
            : null,
      invitation_token: typeof parsedBody?.invitation_token === "string" ? parsedBody.invitation_token : null,
      email: typeof parsedBody?.email === "string" ? parsedBody.email : null,
    });

    const email = typeof parsedBody?.email === "string" ? parsedBody.email : "";
    const password = typeof parsedBody?.password === "string" ? parsedBody.password : "";
    const full_name = typeof parsedBody?.full_name === "string" ? parsedBody.full_name : "";
    const role = typeof parsedBody?.role === "string" ? parsedBody.role : "member";
    const invitation_token =
      typeof parsedBody?.invitation_token === "string" ? parsedBody.invitation_token : "";
    const invitation_id =
      typeof parsedBody?.invitation_id === "string"
        ? parsedBody.invitation_id
        : typeof parsedBody?.invitationId === "string"
          ? parsedBody.invitationId
          : null;
    const first_name = typeof parsedBody?.first_name === "string" ? parsedBody.first_name : "";
    const last_name = typeof parsedBody?.last_name === "string" ? parsedBody.last_name : "";
    const middle_name = typeof parsedBody?.middle_name === "string" ? parsedBody.middle_name : "";
    const phone = typeof parsedBody?.phone === "string" ? parsedBody.phone : null;
    const birth_date = typeof parsedBody?.birth_date === "string" ? parsedBody.birth_date : null;
    const avatar_url = typeof parsedBody?.avatar_url === "string" ? parsedBody.avatar_url : null;
    const avatar_base64 =
      typeof parsedBody?.avatar_base64 === "string" ? parsedBody.avatar_base64 : null;

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

    console.log("[register] Canonical lookup input", {
      invitation_id: normalizedInvitationId,
      invitation_token: normalizedToken || null,
      email,
    });

    if (!email || !password || (!normalizedToken && !normalizedInvitationId)) {
      return jsonResponse({ error: "Email, password и invitation token обязательны" }, 400);
    }

    const envSupabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseUrl = deriveProjectApiUrl(req, envSupabaseUrl);
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[register] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return jsonResponse({ error: "Ошибка конфигурации сервера." }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── STEP 1: Validate invitation (canonical: invitation_id -> token/RPC fallback) ──
    const invitationSelect = "id, tenant_id, invited_by, email, expires_at, status, token";
    let invData: any = null;
    let invError: any = null;
    let lookupPath = "none";

    // 1a. Primary: lookup by invitation_id from validated invite page
    if (normalizedInvitationId) {
      console.log("[register] Step 1a: Lookup by invitation_id...");
      const idLookup = await adminClient
        .from("invitations")
        .select(invitationSelect)
        .eq("id", normalizedInvitationId)
        .maybeSingle();

      if (idLookup.data) {
        invData = idLookup.data;
        lookupPath = "table:id";
        invError = null;
        console.log("[register] Step 1a OK: found via invitation_id", normalizedInvitationId);
      } else if (idLookup.error) {
        invError = idLookup.error;
        console.warn("[register] Step 1a: invitation_id lookup error:", idLookup.error.message);
      }
    }

    // 1b. Fallback: RPC get_invitation_by_token (type-safe and centralized)
    if (!invData && normalizedToken) {
      console.log("[register] Step 1b: RPC lookup by token...");
      try {
        const rpcLookup = await adminClient.rpc("get_invitation_by_token", {
          invitation_token: normalizedToken,
        });

        if (!rpcLookup.error && Array.isArray(rpcLookup.data) && rpcLookup.data.length > 0) {
          const rpcInvId = rpcLookup.data[0]?.id;
          if (rpcInvId) {
            const { data: fullRec } = await adminClient
              .from("invitations")
              .select(invitationSelect)
              .eq("id", rpcInvId)
              .maybeSingle();
            if (fullRec) {
              invData = fullRec;
              lookupPath = "rpc:get_invitation_by_token";
              console.log("[register] Step 1b OK: found via RPC, id:", rpcInvId);
            }
          }
        } else if (rpcLookup.error) {
          invError = rpcLookup.error;
          console.warn("[register] Step 1b: RPC error (non-fatal):", rpcLookup.error.message);
        }
      } catch (rpcErr) {
        console.warn("[register] Step 1b: RPC exception (non-fatal):", rpcErr);
      }
    }

    // 1c. Fallback: direct query by token
    if (!invData && normalizedToken) {
      console.log("[register] Step 1c: Direct token lookup...");
      const tokenLookup = await adminClient
        .from("invitations")
        .select(invitationSelect)
        .eq("token", normalizedToken)
        .maybeSingle();
      if (tokenLookup.data) {
        invData = tokenLookup.data;
        lookupPath = "table:token";
        console.log("[register] Step 1c OK: found via direct query");
      } else if (tokenLookup.error) {
        invError = tokenLookup.error;
        console.warn("[register] Step 1c: direct query error:", tokenLookup.error.message);
      }
    }

    if (!invData) {
      console.error("[register] Invitation not found:", {
        tokenProvided: Boolean(normalizedToken),
        invitationIdProvided: Boolean(normalizedInvitationId),
        lookupPath,
        normalizedToken,
        normalizedInvitationId,
        tokenError: invError?.message ?? null,
      });
      return jsonResponse({
        error: "Токен приглашения не найден в submit-обработчике. Код: INVITE_LOOKUP_MISMATCH. Откройте ссылку-приглашение заново или запросите новое.",
      }, 404);
    }

    if (normalizedToken && invData.token && invData.token !== normalizedToken) {
      console.error("[register] Token mismatch for invitation_id", {
        invitationId: invData.id,
        lookupPath,
      });
      return jsonResponse({ error: "Ссылка приглашения не совпадает с найденным приглашением. Откройте ссылку из письма заново." }, 403);
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
    console.log("[register] Step 1 OK", {
      invitation_id: invData.id,
      email: invData.email,
      status: invData.status,
      isRetry,
      lookupPath,
      requestInvitationId: normalizedInvitationId,
      tokenProvided: Boolean(normalizedToken),
    });

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
