import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VacationNotificationRequest {
  user_id: string;
  vacation_id: string;
  status: 'approved' | 'rejected';
  vacation_type: string;
  start_date: string;
  end_date: string;
  comment?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- AUTH CHECK: verify caller is authenticated ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing token" }),
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
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const callerId = claimsData.claims.sub as string;
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: no user id in token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    // --- END AUTH CHECK ---

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, vacation_id, status, vacation_type, start_date, end_date, comment } = 
      (await req.json()) as VacationNotificationRequest;

    console.log('[vacation-status-notification] Processing:', { user_id, vacation_id, status, caller: callerId });

    const vacationTypeLabels: Record<string, string> = {
      weekend: "Выходной",
      vacation: "Отпуск",
      sick: "Больничный",
      personal: "Личное",
      fun: "Кайфануть",
      study: "Учеба"
    };

    const typeLabel = vacationTypeLabels[vacation_type] || vacation_type;
    const startDate = new Date(start_date).toLocaleDateString('ru-RU');
    const endDate = new Date(end_date).toLocaleDateString('ru-RU');

    let title: string;
    let message: string;

    if (status === 'approved') {
      title = 'Заявка на отпуск одобрена';
      message = `Ваша заявка на ${typeLabel.toLowerCase()} с ${startDate} по ${endDate} одобрена`;
      if (comment) {
        message += `\nКомментарий: ${comment}`;
      }
    } else {
      title = 'Заявка на отпуск отклонена';
      message = `Ваша заявка на ${typeLabel.toLowerCase()} с ${startDate} по ${endDate} отклонена`;
      if (comment) {
        message += `\nПричина: ${comment}`;
      }
    }

    // Create notification
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id,
        title,
        message,
        type: 'vacation',
        data: {
          vacation_id,
          status,
          vacation_type,
          start_date,
          end_date,
          comment,
        },
      });

    if (notificationError) {
      console.error('[vacation-status-notification] Notification error:', notificationError);
      throw notificationError;
    }

    console.log('[vacation-status-notification] Notification sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error('[vacation-status-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
