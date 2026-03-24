import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REGISTER_INVITED_USER_VERSION = "2026-03-24-invite-rebuild-v1";
const TRUSTED_SELF_HOSTED_URL = "https://superbag.eventbalance.ru/a73e88c7ef6a2ca735abc52404257a9f";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type InvitationContext = {
  id: string;
  tenant_id: string | null;
  invited_by: string | null;
  email: string;
  role: string | null;
  expires_at: string | null;
  status: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ version: REGISTER_INVITED_USER_VERSION, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeUrl(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\/$/, "");
}

function deriveProjectApiUrl(req: Request): string {
  try {
    const url = new URL(req.url);
    const marker = "/functions/v1/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex > -1) {
      return normalizeUrl(`${url.origin}${url.pathname.slice(0, markerIndex)}`);
    }
  } catch {
    // ignore invalid req.url
  }
  return "";
}

function resolveApiUrl(req: Request, projectApiUrlFromBody: unknown): { supabaseUrl: string; source: string } {
  const bodyUrl =
    typeof projectApiUrlFromBody === "string" ? normalizeUrl(projectApiUrlFromBody) : "";
  const envUrl = normalizeUrl(Deno.env.get("SUPABASE_URL"));
  const derivedUrl = deriveProjectApiUrl(req);

  if (bodyUrl && bodyUrl === TRUSTED_SELF_HOSTED_URL) {
    return { supabaseUrl: bodyUrl, source: "body:trusted-self-hosted" };
  }

  if (envUrl) {
    return { supabaseUrl: envUrl, source: "env" };
  }

  if (derivedUrl) {
    return { supabaseUrl: derivedUrl, source: "derived-from-request" };
  }

  return { supabaseUrl: "", source: "none" };
}

function normalizeToken(rawToken: string): string {
  try {
    return decodeURIComponent(rawToken).trim();
  } catch {
    return rawToken.trim();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsedBody = await req.json();

    const email = typeof parsedBody?.email === "string" ? parsedBody.email.trim() : "";
    const password = typeof parsedBody?.password === "string" ? parsedBody.password : "";
    const full_name = typeof parsedBody?.full_name === "string" ? parsedBody.full_name : "";
    const role = typeof parsedBody?.role === "string" ? parsedBody.role : "member";
    const invitation_token = typeof parsedBody?.invitation_token === "string" ? parsedBody.invitation_token : "";
    const invitation_id = typeof parsedBody?.invitation_id === "string" ? parsedBody.invitation_id.trim() : "";
    const project_api_url = typeof parsedBody?.project_api_url === "string" ? parsedBody.project_api_url : null;

    const first_name = typeof parsedBody?.first_name === "string" ? parsedBody.first_name : "";
    const last_name = typeof parsedBody?.last_name === "string" ? parsedBody.last_name : "";
    const middle_name = typeof parsedBody?.middle_name === "string" ? parsedBody.middle_name : "";
    const phone = typeof parsedBody?.phone === "string" ? parsedBody.phone : null;
    const birth_date = typeof parsedBody?.birth_date === "string" ? parsedBody.birth_date : null;
    const avatar_url = typeof parsedBody?.avatar_url === "string" ? parsedBody.avatar_url : null;
    const avatar_base64 = typeof parsedBody?.avatar_base64 === "string" ? parsedBody.avatar_base64 : null;

    const normalizedToken = normalizeToken(invitation_token);

    if (!email || !password || !normalizedToken || !invitation_id) {
      return jsonResponse({
        error: "Для регистрации обязательны email, password, invitation_token и invitation_id.",
        code: "INVITE_PAYLOAD_INVALID",
      }, 400);
    }

    const { supabaseUrl, source } = resolveApiUrl(req, project_api_url);
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({
        error: "Ошибка конфигурации backend (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
        code: "INVITE_RUNTIME_CONFIG_ERROR",
        runtime: { source, request_url: req.url },
      }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log("[register] invite-flow runtime", {
      version: REGISTER_INVITED_USER_VERSION,
      supabaseUrl,
      source,
      request_url: req.url,
      invitation_id,
    });

    // STEP 1 (canonical): lookup by invitation_id first, token only as fallback
    let invitation: InvitationContext | null = null;
    let lookupPath = "none";

    if (invitation_id) {
      const { data: invitationById, error: invitationByIdError } = await adminClient
        .from("invitations")
        .select("id, tenant_id, invited_by, email, role, expires_at, status")
        .eq("id", invitation_id)
        .maybeSingle();

      if (invitationByIdError) {
        return jsonResponse({
          error: `Ошибка проверки приглашения по id: ${invitationByIdError.message}`,
          code: "INVITE_LOOKUP_BY_ID_FAILED",
        }, 500);
      }

      if (invitationById) {
        invitation = invitationById as InvitationContext;
        lookupPath = "by-id";
      }
    }

    if (!invitation && normalizedToken) {
      const { data: inviteRows, error: inviteLookupError } = await adminClient.rpc(
        "get_invitation_for_registration",
        { invitation_token: normalizedToken },
      );

      if (inviteLookupError) {
        return jsonResponse({
          error: `Ошибка проверки приглашения: ${inviteLookupError.message}`,
          code: "INVITE_LOOKUP_FAILED",
        }, 500);
      }

      if (Array.isArray(inviteRows) && inviteRows.length > 0) {
        invitation = inviteRows[0] as InvitationContext;
        lookupPath = "by-token-rpc";
      }
    }

    if (!invitation) {
      return jsonResponse({
        error: "Приглашение не найдено или уже недоступно.",
        code: "INVITE_LOOKUP_MISMATCH",
        debug: { invitation_id, lookupPath },
      }, 404);
    }

    console.log("[register] invite resolved", {
      invitation_id,
      resolved_invitation_id: invitation.id,
      email,
      lookupPath,
    });

    if (invitation.id !== invitation_id) {
      return jsonResponse({
        error: "Ссылка и submit относятся к разным приглашениям. Откройте ссылку заново.",
        code: "INVITE_CONTEXT_MISMATCH",
      }, 409);
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return jsonResponse({ error: "Email не совпадает с приглашением.", code: "INVITE_EMAIL_MISMATCH" }, 403);
    }

    if (invitation.status === "cancelled" || invitation.status === "revoked") {
      return jsonResponse({ error: "Приглашение отозвано.", code: "INVITE_REVOKED" }, 410);
    }

    const isRetry = invitation.status === "accepted";

    if (!isRetry && !["pending", "sent"].includes(invitation.status || "")) {
      return jsonResponse({ error: `Неверный статус приглашения: ${invitation.status}`, code: "INVITE_STATUS_INVALID" }, 410);
    }

    if (!isRetry && invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return jsonResponse({ error: "Срок действия приглашения истёк.", code: "INVITE_EXPIRED" }, 410);
    }

    // STEP 2: avatar upload (non-blocking)
    let finalAvatarUrl = avatar_url || null;
    if (avatar_base64) {
      try {
        const base64Data = avatar_base64.includes(",") ? avatar_base64.split(",")[1] : avatar_base64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

        const fileName = `invite_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await adminClient.storage
          .from("avatars")
          .upload(fileName, bytes, { contentType: "image/jpeg" });

        if (!uploadError) {
          finalAvatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;
        }
      } catch (avatarErr) {
        console.error("[register] avatar processing warning", avatarErr);
      }
    }

    // STEP 3: create user (or resume on retry)
    let userId = "";

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
        role: role || invitation.role || "member",
      },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
        if (listError) {
          return jsonResponse({ error: "Аккаунт уже создан. Попробуйте войти.", code: "USER_ALREADY_EXISTS" }, 409);
        }

        const existingUser = existingUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (!existingUser) {
          return jsonResponse({ error: "Аккаунт уже создан. Попробуйте войти.", code: "USER_ALREADY_EXISTS" }, 409);
        }
        userId = existingUser.id;
      } else {
        return jsonResponse({ error: `Ошибка создания аккаунта: ${createError.message}`, code: "USER_CREATE_FAILED" }, 400);
      }
    } else {
      userId = userData.user.id;
    }

    // STEP 4: profile upsert — set invitation_status='pending' and tenant_id for later admin approval
    const profilePayload: Record<string, unknown> = {
      id: userId,
      email,
      full_name: full_name || email,
      invitation_status: "pending",
      ...(invitation.tenant_id ? { tenant_id: invitation.tenant_id } : {}),
      ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {}),
      ...(phone ? { phone } : {}),
      ...(birth_date ? { birth_date } : {}),
      ...(first_name ? { first_name } : {}),
      ...(last_name ? { last_name } : {}),
      ...(middle_name ? { middle_name } : {}),
    };

    const { error: profileError } = await adminClient.from("profiles").upsert(
      profilePayload,
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("[register] STEP 4 profile upsert failed", profileError);
    }

    // NOTE: membership is NOT created here.
    // STEP 5: Create membership immediately via SECURITY DEFINER RPC
    console.log("[register] STEP 5 membership via RPC", {
      invitation_id: invitation.id,
      user_id: userId,
      role: role || invitation.role || "member",
    });

    const { data: membershipResult, error: membershipError } = await adminClient.rpc(
      "ensure_invited_user_membership",
      {
        p_invitation_id: invitation.id,
        p_user_id: userId,
        p_role: role || invitation.role || "member",
      },
    );

    if (membershipError) {
      console.error("[register] STEP 5 membership RPC failed", membershipError);
      // Non-blocking: user is created, membership can be fixed later
    } else {
      console.log("[register] STEP 5 membership OK", membershipResult);
    }

    // STEP 6: audit (non-blocking)
    await adminClient.from("invitation_audit_log").insert({
      invitation_id: invitation.id,
      actor_id: userId,
      action: isRetry ? "accepted_retry" : "accepted",
      details: { email },
    });

    // STEP 7: accept invitation (critical, single backend path)
    if (!isRetry) {
      const { error: acceptError } = await adminClient.rpc("accept_invitation_for_registration", {
        p_invitation_id: invitation.id,
      });

      if (acceptError) {
        return jsonResponse({
          error: "Аккаунт создан, но статус приглашения не обновился. Нажмите «Создать аккаунт» еще раз.",
          code: "INVITATION_ACCEPT_FAILED",
        }, 500);
      }
    }

    // STEP 8: notifications (non-blocking)
    try {
      const recipientIds: string[] = [];
      if (invitation.invited_by) recipientIds.push(invitation.invited_by);

      if (invitation.tenant_id) {
        const { data: tenantAdmins } = await adminClient
          .from("tenant_memberships")
          .select("user_id")
          .eq("tenant_id", invitation.tenant_id)
          .in("role", ["owner", "admin"]);

        if (tenantAdmins) {
          for (const admin of tenantAdmins) recipientIds.push(admin.user_id);
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
          })),
        );
      }
    } catch (notifyError) {
      console.error("[register] notify warning", notifyError);
    }

    return jsonResponse({
      user: { id: userId, email },
      invite: { id: invitation.id, status: isRetry ? "accepted" : "accepted_now" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return jsonResponse({ error: message, code: "INVITE_UNHANDLED_ERROR" }, 500);
  }
});
