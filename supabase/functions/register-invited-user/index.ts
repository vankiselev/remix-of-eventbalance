import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REGISTER_INVITED_USER_VERSION = "2026-03-24-lookup-fix";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({
    version: REGISTER_INVITED_USER_VERSION,
    ...body,
  }), {
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

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function parseUrl(value: string | null | undefined): URL | null {
  if (!value || !value.trim()) return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function getFirstHeaderValue(req: Request, header: string): string | null {
  const raw = req.headers.get(header);
  if (!raw) return null;
  return raw.split(",")[0]?.trim() || null;
}

function resolveProjectApiCandidates(
  req: Request,
  fallbackUrl: string | null,
  projectApiUrlFromBody: unknown,
): { candidates: string[]; derivedUrl: string; acceptedBodyUrl: string | null } {
  const requestUrl = new URL(req.url);
  const derivedUrl = normalizeUrl(deriveProjectApiUrl(req, fallbackUrl));
  const envUrl = fallbackUrl ? normalizeUrl(fallbackUrl) : "";

  const headerOrigin = getFirstHeaderValue(req, "origin");
  const headerReferer = getFirstHeaderValue(req, "referer");
  const forwardedHost = getFirstHeaderValue(req, "x-forwarded-host");
  const forwardedProto = getFirstHeaderValue(req, "x-forwarded-proto");

  const allowedHosts = new Set<string>();
  allowedHosts.add(requestUrl.host);
  allowedHosts.add("superbag.eventbalance.ru");

  const envParsed = parseUrl(envUrl);
  if (envParsed) allowedHosts.add(envParsed.host);

  const originParsed = parseUrl(headerOrigin);
  if (originParsed) allowedHosts.add(originParsed.host);

  const refererParsed = parseUrl(headerReferer);
  if (refererParsed) allowedHosts.add(refererParsed.host);

  if (forwardedHost) {
    allowedHosts.add(forwardedHost);
    if (forwardedProto) {
      const forwardedOrigin = parseUrl(`${forwardedProto}://${forwardedHost}`);
      if (forwardedOrigin) allowedHosts.add(forwardedOrigin.host);
    }
  }

  let acceptedBodyUrl: string | null = null;
  const bodyUrlRaw =
    typeof projectApiUrlFromBody === "string" && projectApiUrlFromBody.trim().length > 0
      ? projectApiUrlFromBody.trim()
      : null;

  if (bodyUrlRaw) {
    const bodyParsed = parseUrl(bodyUrlRaw);
    if (bodyParsed && allowedHosts.has(bodyParsed.host)) {
      acceptedBodyUrl = normalizeUrl(bodyParsed.toString());
    } else {
      console.warn("[register] Ignoring project_api_url: host is not in allowed runtime hosts", {
        bodyHost: bodyParsed?.host ?? null,
        allowedHosts: Array.from(allowedHosts),
      });
    }
  }

  const candidates = [
    acceptedBodyUrl,
    derivedUrl,
    envUrl,
  ].filter((v): v is string => Boolean(v));

  return {
    candidates: Array.from(new Set(candidates)),
    derivedUrl,
    acceptedBodyUrl,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[register] Function version marker", { version: REGISTER_INVITED_USER_VERSION });
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
      project_api_url: typeof parsedBody?.project_api_url === "string" ? parsedBody.project_api_url : null,
      email: typeof parsedBody?.email === "string" ? parsedBody.email : null,
    });

    const email = typeof parsedBody?.email === "string" ? parsedBody.email : "";
    const password = typeof parsedBody?.password === "string" ? parsedBody.password : "";
    const full_name = typeof parsedBody?.full_name === "string" ? parsedBody.full_name : "";
    const role = typeof parsedBody?.role === "string" ? parsedBody.role : "member";
    const invitation_token =
      typeof parsedBody?.invitation_token === "string" ? parsedBody.invitation_token : "";
    const project_api_url =
      typeof parsedBody?.project_api_url === "string" ? parsedBody.project_api_url : null;
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
      project_api_url,
      email,
    });

    if (!email || !password || (!normalizedToken && !normalizedInvitationId)) {
      return jsonResponse({ error: "Email, password и invitation token обязательны" }, 400);
    }

    const envSupabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const { candidates: supabaseUrlCandidates, derivedUrl, acceptedBodyUrl } =
      resolveProjectApiCandidates(req, envSupabaseUrl, project_api_url);
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("[register] Runtime URL context", {
      envSupabaseUrl,
      requestUrl: req.url,
      requestOrigin: new URL(req.url).origin,
      headerOrigin: req.headers.get("origin"),
      headerReferer: req.headers.get("referer"),
      headerForwardedHost: req.headers.get("x-forwarded-host"),
      headerForwardedProto: req.headers.get("x-forwarded-proto"),
      derivedUrl,
      acceptedBodyUrl,
      resolvedCandidates: supabaseUrlCandidates,
      invitation_id: normalizedInvitationId,
    });

    if (supabaseUrlCandidates.length === 0 || !serviceRoleKey) {
      console.error("[register] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", {
        hasSupabaseUrlCandidates: supabaseUrlCandidates.length > 0,
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return jsonResponse({ error: "Ошибка конфигурации сервера." }, 500);
    }

    const buildAdminClient = (apiUrl: string) =>
      createClient(apiUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

    let supabaseUrl = supabaseUrlCandidates[0];
    let adminClient = buildAdminClient(supabaseUrl);

    const switchContext = (nextUrl: string) => {
      if (nextUrl !== supabaseUrl) {
        supabaseUrl = nextUrl;
        adminClient = buildAdminClient(nextUrl);
      }
    };

    const preferredUrls = () => [
      supabaseUrl,
      ...supabaseUrlCandidates.filter((candidate) => candidate !== supabaseUrl),
    ];

    console.log("[register] Active API URL selected", { supabaseUrl });

    // ── STEP 1: Validate invitation (canonical: invitation_id -> token/RPC fallback) ──
    const invitationSelect = "id, tenant_id, invited_by, email, expires_at, status, token";
    let invData: any = null;
    let invError: any = null;
    let lookupPath = "none";
    const directIdLookupDiagnostics: Array<{
      candidateUrl: string;
      found: boolean;
      error: string | null;
    }> = [];

    // 1a. Primary: lookup by invitation_id from validated invite page
    if (normalizedInvitationId) {
      console.log("[register] Step 1a: Lookup by invitation_id across runtime candidates...");

      for (const candidateUrl of preferredUrls()) {
        const candidateClient = buildAdminClient(candidateUrl);
        const idLookup = await candidateClient
          .from("invitations")
          .select(invitationSelect)
          .eq("id", normalizedInvitationId)
          .maybeSingle();

        console.log("[register] Step 1a candidate result", {
          candidateUrl,
          invitation_id: normalizedInvitationId,
          found: Boolean(idLookup.data),
          error: idLookup.error?.message ?? null,
        });

        directIdLookupDiagnostics.push({
          candidateUrl,
          found: Boolean(idLookup.data),
          error: idLookup.error?.message ?? null,
        });

        if (idLookup.data) {
          invData = idLookup.data;
          lookupPath = `table:id@${candidateUrl}`;
          invError = null;
          switchContext(candidateUrl);
          console.log("[register] Step 1a OK: found via invitation_id", {
            invitation_id: normalizedInvitationId,
            candidateUrl,
          });
          break;
        }

        if (idLookup.error && !invError) {
          invError = idLookup.error;
        }
      }
    }

    // 1b. Fallback: RPC get_invitation_by_token (type-safe and centralized)
    if (!invData && normalizedToken) {
      console.log("[register] Step 1b: RPC lookup by token across runtime candidates...");
      for (const candidateUrl of preferredUrls()) {
        const candidateClient = buildAdminClient(candidateUrl);
        try {
          const rpcLookup = await candidateClient.rpc("get_invitation_by_token", {
            invitation_token: normalizedToken,
          });

          console.log("[register] Step 1b candidate RPC result", {
            candidateUrl,
            found: Array.isArray(rpcLookup.data) && rpcLookup.data.length > 0,
            error: rpcLookup.error?.message ?? null,
          });

          if (!rpcLookup.error && Array.isArray(rpcLookup.data) && rpcLookup.data.length > 0) {
            const rpcInvId = rpcLookup.data[0]?.id;
            if (rpcInvId) {
              const { data: fullRec } = await candidateClient
                .from("invitations")
                .select(invitationSelect)
                .eq("id", rpcInvId)
                .maybeSingle();
              if (fullRec) {
                invData = fullRec;
                lookupPath = `rpc:get_invitation_by_token@${candidateUrl}`;
                switchContext(candidateUrl);
                console.log("[register] Step 1b OK: found via RPC", {
                  rpcInvId,
                  candidateUrl,
                });
                break;
              }
            }
          } else if (rpcLookup.error && !invError) {
            invError = rpcLookup.error;
          }
        } catch (rpcErr) {
          console.warn("[register] Step 1b: RPC exception (non-fatal)", {
            candidateUrl,
            error: rpcErr,
          });
        }
      }
    }

    // 1c. Fallback: direct query by token
    if (!invData && normalizedToken) {
      console.log("[register] Step 1c: Direct token lookup across runtime candidates...");
      for (const candidateUrl of preferredUrls()) {
        const candidateClient = buildAdminClient(candidateUrl);
        const tokenLookup = await candidateClient
          .from("invitations")
          .select(invitationSelect)
          .eq("token", normalizedToken)
          .maybeSingle();

        console.log("[register] Step 1c candidate token result", {
          candidateUrl,
          found: Boolean(tokenLookup.data),
          error: tokenLookup.error?.message ?? null,
        });

        if (tokenLookup.data) {
          invData = tokenLookup.data;
          lookupPath = `table:token@${candidateUrl}`;
          switchContext(candidateUrl);
          console.log("[register] Step 1c OK: found via direct token", {
            candidateUrl,
          });
          break;
        }

        if (tokenLookup.error && !invError) {
          invError = tokenLookup.error;
        }
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
        resolvedCandidates: supabaseUrlCandidates,
        directIdLookupDiagnostics,
      });
      return jsonResponse({
        error: "Токен приглашения не найден в submit-обработчике. Код: INVITE_LOOKUP_MISMATCH. Откройте ссылку-приглашение заново или запросите новое.",
        code: "INVITE_LOOKUP_MISMATCH",
        debug: {
          request_url: req.url,
          invitation_id: normalizedInvitationId,
          active_supabase_url: supabaseUrl,
          resolved_candidates: supabaseUrlCandidates,
          direct_id_lookup: directIdLookupDiagnostics,
        },
      }, 404);
    }

    console.log("[register] Runtime context resolved by invitation lookup", {
      activeSupabaseUrl: supabaseUrl,
      lookupPath,
      invitation_id: invData.id,
      invitation_status: invData.status,
      invitation_email: invData.email,
    });

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
    const errorMessage = error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return jsonResponse({ error: errorMessage }, 500);
  }
});
