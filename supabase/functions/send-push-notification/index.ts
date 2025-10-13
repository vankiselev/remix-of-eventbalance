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
    if (subscriptions && subscriptions.length > 0) {
      // Note: For Web Push to work in production, you need to:
      // 1. Generate VAPID keys
      // 2. Set up a push service (e.g., using web-push library)
      // 3. Send notifications using the Web Push protocol
      
      // For now, we'll just log that we would send push notifications
      console.log("Would send push notifications to:", subscriptions.length, "devices");
      
      // TODO: Implement actual Web Push sending
      // This requires the web-push npm package and proper VAPID configuration
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification,
        push_sent: subscriptions?.length || 0
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
