import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";
import { getSystemSecrets } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  user_id: string;
  title: string;
  message: string;
  type: string;
  data?: any;
}

interface SubscriptionDebug {
  sub_id: string;
  endpoint_ok: boolean;
  auth_ok: boolean;
  p256dh_ok: boolean;
  auth_len: number;
  p256dh_len: number;
  removed_reason?: string;
}

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const SEND_PUSH_VERSION_SHA = "2d10b5775fd596f7109831d73467db52695bc85e";

function sanitizeBase64url(val: string): string {
  // Convert standard base64 to base64url and strip padding
  return val.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function isValidBase64url(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  const cleaned = sanitizeBase64url(val);
  return cleaned.length > 0 && BASE64URL_RE.test(cleaned);
}

function isValidEndpoint(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  try {
    const url = new URL(val.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- AUTH CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing token", version_sha: SEND_PUSH_VERSION_SHA }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || supabaseServiceKey;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token", version_sha: SEND_PUSH_VERSION_SHA }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const callerId = claimsData.claims.sub as string;
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: no user id in token", version_sha: SEND_PUSH_VERSION_SHA }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    // --- END AUTH CHECK ---

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys from database and sanitize
    const secrets = await getSystemSecrets(['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'WEB_PUSH_CONTACT']);
    const vapidPublicKey = secrets['VAPID_PUBLIC_KEY'] ? sanitizeBase64url(secrets['VAPID_PUBLIC_KEY']) : null;
    const vapidPrivateKey = secrets['VAPID_PRIVATE_KEY'] ? sanitizeBase64url(secrets['VAPID_PRIVATE_KEY']) : null;
    const contact = (secrets['WEB_PUSH_CONTACT'] || "mailto:admin@example.com").trim();

    const vapidPubValid = isValidBase64url(vapidPublicKey);
    const vapidPrivValid = isValidBase64url(vapidPrivateKey);
    
    if (vapidPublicKey && !vapidPubValid) {
      console.error("[send-push] VAPID_PUBLIC_KEY invalid base64url after sanitization");
      return new Response(
        JSON.stringify({
          error: "vapid_invalid",
          detail: "VAPID_PUBLIC_KEY невалидный base64url",
          vapid_valid: false,
          version_sha: SEND_PUSH_VERSION_SHA,
          push_errors: ["VAPID_PUBLIC_KEY invalid base64url"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    if (vapidPrivateKey && !vapidPrivValid) {
      console.error("[send-push] VAPID_PRIVATE_KEY invalid base64url after sanitization");
      return new Response(
        JSON.stringify({
          error: "vapid_invalid",
          detail: "VAPID_PRIVATE_KEY невалидный base64url",
          vapid_valid: false,
          version_sha: SEND_PUSH_VERSION_SHA,
          push_errors: ["VAPID_PRIVATE_KEY invalid base64url"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let vapidConfigured = !!(vapidPublicKey && vapidPrivateKey);

    if (vapidConfigured) {
      try {
        webpush.setVapidDetails(contact, vapidPublicKey!, vapidPrivateKey!);
        console.log("[send-push] VAPID configured successfully");
      } catch (e: any) {
        const detail = e?.message || "webpush.setVapidDetails failed";
        console.error("[send-push] vapid_invalid setVapidDetails:", detail);
        vapidConfigured = false;
        return new Response(
          JSON.stringify({
            error: "vapid_invalid",
            detail,
            vapid_valid: false,
            version_sha: SEND_PUSH_VERSION_SHA,
            push_errors: ["setVapidDetails failed"],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else {
      const missing = [];
      if (!vapidPublicKey) missing.push('VAPID_PUBLIC_KEY');
      if (!vapidPrivateKey) missing.push('VAPID_PRIVATE_KEY');
      console.error(`[send-push] VAPID keys missing in system_secrets: ${missing.join(', ')}`);
    }

    const { user_id, title, message, type, data } = (await req.json()) as NotificationRequest;

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id and title", version_sha: SEND_PUSH_VERSION_SHA }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create notification row
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({ user_id, title, message, type, data })
      .select()
      .single();

    if (notificationError) throw notificationError;

    // Fetch subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subscriptionsError) throw subscriptionsError;

    let pushSentCount = 0;
    let invalidRemoved = 0;
    let validSubscriptions = 0;
    const pushErrors: string[] = [];
    const subscriptionDebug: SubscriptionDebug[] = [];
    const invalidDeletedSubscriptions: Array<{ sub_id: string; reason: string }> = [];

    if (!vapidConfigured) {
      pushErrors.push("VAPID keys not configured in system_secrets — web push skipped");
    }

    if (subscriptions && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title,
        body: message,
        data: { type, ...data, notificationId: notification.id },
      });

      for (const sub of subscriptions) {
        // ── Validate subscription fields before attempting send ──
        const endpointValid = isValidEndpoint(sub.endpoint);
        const authValid = isValidBase64url(sub.auth);
        const p256dhValid = isValidBase64url(sub.p256dh);
        const subDebug: SubscriptionDebug = {
          sub_id: sub.id,
          endpoint_ok: endpointValid,
          auth_ok: authValid,
          p256dh_ok: p256dhValid,
          auth_len: (sub.auth || '').trim().length,
          p256dh_len: (sub.p256dh || '').trim().length,
        };
        subscriptionDebug.push(subDebug);

        if (!endpointValid || !authValid || !p256dhValid) {
          const reasons: string[] = [];
          if (!endpointValid) reasons.push('endpoint');
          if (!authValid) reasons.push('auth');
          if (!p256dhValid) reasons.push('p256dh');
          const removedReason = `invalid_${reasons.join('_')}`;
          subDebug.removed_reason = removedReason;
          
          console.warn(`[send-push] invalid_subscription ${sub.id}: bad ${reasons.join(',')}`);
          pushErrors.push(`invalid_subscription ${sub.id}: bad ${reasons.join(',')}`);
          
          // Remove invalid subscription from DB
          try {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            invalidRemoved++;
            invalidDeletedSubscriptions.push({ sub_id: sub.id, reason: removedReason });
            console.log(`[send-push] Removed invalid subscription ${sub.id}`);
          } catch (delErr: any) {
            console.error(`[send-push] Failed to delete invalid sub ${sub.id}:`, delErr?.message);
          }
          continue;
        }

        validSubscriptions++;

        if (!vapidConfigured) continue;

        try {
          const subscription = {
            endpoint: sub.endpoint.trim(),
            keys: {
              p256dh: sanitizeBase64url(sub.p256dh),
              auth: sanitizeBase64url(sub.auth),
            },
          };

          await webpush.sendNotification(subscription as any, payload, { TTL: 86400 });
          pushSentCount++;
          console.log(`[send-push] Delivered to subscription ${sub.id}`);
        } catch (err: any) {
          const errMsg = `Subscription ${sub.id}: ${err?.statusCode || ''} ${err?.body || err?.message || 'unknown error'}`;
          console.error("[send-push] Push error:", errMsg);
          pushErrors.push(errMsg);

          // Remove expired/gone subscriptions (410 Gone, 404, etc.)
          if ([404, 410].includes(err?.statusCode)) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            invalidRemoved++;
            subDebug.removed_reason = `expired_${err?.statusCode}`;
            invalidDeletedSubscriptions.push({ sub_id: sub.id, reason: `expired_${err?.statusCode}` });
            console.log(`[send-push] Removed expired subscription ${sub.id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        version_sha: SEND_PUSH_VERSION_SHA,
        notification,
        push_sent: pushSentCount,
        total_subscriptions: subscriptions?.length || 0,
        valid_subscriptions: validSubscriptions,
        invalid_removed: invalidRemoved,
        vapid_valid: vapidConfigured,
        vapid_configured: vapidConfigured,
        push_errors: pushErrors,
        invalid_deleted_subscriptions: invalidDeletedSubscriptions,
        push_debug: subscriptionDebug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("[send-push-notification] Error:", { message: error?.message, stack: error?.stack });
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to send notification", version_sha: SEND_PUSH_VERSION_SHA }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
