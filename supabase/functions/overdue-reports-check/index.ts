import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getSystemSecret } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for security
    const cronSecret = await getSystemSecret('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    
    if (!cronSecret || providedSecret !== cronSecret) {
      console.error('[overdue-reports-check] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[overdue-reports-check] Starting overdue reports check...');

    // Get date 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    // Find events that ended more than 2 days ago
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, start_date, manager_ids, animator_ids, responsible_manager_id')
      .lt('start_date', twoDaysAgoStr)
      .eq('is_archived', false);

    if (eventsError) throw eventsError;

    console.log('[overdue-reports-check] Found events:', events?.length || 0);

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Нет просроченных событий', sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let totalNotificationsSent = 0;

    // Check each event for missing reports
    for (const event of events) {
      // Collect all participant IDs
      const participantIds = new Set<string>();
      
      if (event.responsible_manager_id) {
        participantIds.add(event.responsible_manager_id);
      }
      
      if (event.manager_ids && Array.isArray(event.manager_ids)) {
        event.manager_ids.forEach(id => participantIds.add(id));
      }
      
      if (event.animator_ids && Array.isArray(event.animator_ids)) {
        event.animator_ids.forEach(id => participantIds.add(id));
      }

      if (participantIds.size === 0) continue;

      // Check which participants haven't submitted reports
      const { data: existingReports, error: reportsError } = await supabase
        .from('event_reports')
        .select('user_id')
        .in('user_id', Array.from(participantIds));

      if (reportsError) {
        console.error('[overdue-reports-check] Error fetching reports:', reportsError);
        continue;
      }

      const reportedUserIds = new Set(existingReports?.map(r => r.user_id) || []);
      const missingReportUserIds = Array.from(participantIds).filter(id => !reportedUserIds.has(id));

      console.log('[overdue-reports-check] Event:', event.name, 'Missing reports:', missingReportUserIds.length);

      // Send notifications to users who haven't submitted reports
      const eventDate = new Date(event.start_date).toLocaleDateString('ru-RU');
      
      const notificationPromises = missingReportUserIds.map((user_id) =>
        supabase
          .from("notifications")
          .insert({
            user_id,
            title: 'Не сдан отчет за мероприятие',
            message: `Вы не сдали отчет за мероприятие "${event.name}" (${eventDate}). Пожалуйста, заполните отчет как можно скорее.`,
            type: 'report',
            data: {
              event_id: event.id,
              event_name: event.name,
              event_date: event.start_date,
            },
          })
      );

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      totalNotificationsSent += successCount;
    }

    console.log('[overdue-reports-check] Total notifications sent:', totalNotificationsSent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Отправлено ${totalNotificationsSent} уведомлений о просроченных отчётах`,
        sent: totalNotificationsSent,
        events_checked: events.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error('[overdue-reports-check] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
