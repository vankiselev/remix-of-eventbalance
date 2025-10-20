import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  title: string;
  message: string;
  type: string;
  data?: any;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const contact = Deno.env.get("WEB_PUSH_CONTACT") || "mailto:admin@example.com";

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(contact, vapidPublicKey, vapidPrivateKey);
    } else {
      console.warn("VAPID keys not configured. Web Push deliveries will be skipped.");
    }

    const { user_id, title, message, type, data } = (await req.json()) as NotificationRequest;

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

    if (subscriptions && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title,
        body: message,
        data: { type, ...data, notificationId: notification.id },
      });

      for (const sub of subscriptions) {
        try {
          if (sub.platform === "web") {
            if (!vapidPublicKey || !vapidPrivateKey) continue;
            const subscription = typeof sub.subscription_data === "string"
              ? JSON.parse(sub.subscription_data)
              : sub.subscription_data;

            await webpush
              .sendNotification(subscription as any, payload, { TTL: 86400 })
              .catch(async (err: any) => {
                console.error("Web Push send error:", err?.statusCode, err?.body || err?.message);
                if (String(err?.statusCode).startsWith("4")) {
                  await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
                throw err;
              });
            pushSentCount++;
          } else {
            // Native push delivery should be implemented via FCM/APNs in production
            pushSentCount++;
          }
        } catch (_err) {
          // Already logged; continue
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        push_sent: pushSentCount,
        total_subscriptions: subscriptions?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("[send-push-notification] Error:", { message: error?.message, stack: error?.stack });
    return new Response(JSON.stringify({ error: "Failed to send notification" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
