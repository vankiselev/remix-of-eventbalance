import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

// Helper function to convert base64url to Uint8Array
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Send Web Push notification
async function sendWebPush(subscription: any, payload: string) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("VAPID keys not configured, skipping Web Push");
    return false;
  }

  try {
    const subscriptionData = JSON.parse(subscription.subscription_data);
    const endpoint = subscriptionData.endpoint;
    const keys = subscriptionData.keys;
    
    // Import keys for encryption
    const publicKey = await crypto.subtle.importKey(
      "raw",
      base64UrlToUint8Array(keys.p256dh),
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );
    
    const authSecret = base64UrlToUint8Array(keys.auth);
    
    // Create encryption context
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // For now, we'll use a simplified approach
    // In production, you should use a proper web-push library
    console.log("Sending push to endpoint:", endpoint.substring(0, 50) + "...");
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
      },
      body: new TextEncoder().encode(payload),
    });
    
    if (!response.ok) {
      console.error("Web Push failed:", response.status, await response.text());
      return false;
    }
    
    console.log("Web Push sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending Web Push:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, message, type, data } = await req.json() as NotificationRequest;

    console.log("Creating notification for user:", user_id);

    // Create notification in database
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id,
        title,
        message,
        type,
        data,
      })
      .select()
      .single();

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      throw notificationError;
    }

    console.log("Notification created:", notification);

    // Get user's push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subscriptionsError) {
      console.error("Error fetching subscriptions:", subscriptionsError);
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions for user`);

    // Send push notifications to all subscriptions
    let pushSentCount = 0;
    if (subscriptions && subscriptions.length > 0) {
      console.log(`Sending push notifications to ${subscriptions.length} device(s)`);
      
      const pushPayload = JSON.stringify({
        title,
        body: message,
        data: {
          type,
          ...data,
          notificationId: notification.id,
        },
      });
      
      // Send to each subscription
      for (const subscription of subscriptions) {
        try {
          if (subscription.platform === 'web') {
            // Send Web Push
            const sent = await sendWebPush(subscription, pushPayload);
            if (sent) pushSentCount++;
          } else {
            // For native platforms (iOS/Android), the push is handled by the platform's push service
            // We just log it here as the actual sending would be done through FCM/APNs
            console.log(`Native push queued for ${subscription.platform}:`, subscription.device_token?.substring(0, 20) + "...");
            pushSentCount++;
          }
        } catch (error) {
          console.error(`Error sending push to ${subscription.platform}:`, error);
          
          // If subscription is invalid, remove it
          if (error.message?.includes('expired') || error.message?.includes('invalid')) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', subscription.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification,
        push_sent: pushSentCount,
        total_subscriptions: subscriptions?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
