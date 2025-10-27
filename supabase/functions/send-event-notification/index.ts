import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventNotificationRequest {
  event_id: string;
  event_name: string;
  action: 'created' | 'updated' | 'cancelled';
  participant_ids: string[];
  changes?: {
    date_changed?: boolean;
    time_changed?: boolean;
    location_changed?: boolean;
  };
  event_date?: string;
  event_time?: string;
  location?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      event_id, 
      event_name, 
      action, 
      participant_ids, 
      changes, 
      event_date, 
      event_time, 
      location 
    } = (await req.json()) as EventNotificationRequest;

    console.log('[send-event-notification] Processing:', { event_id, action, participant_count: participant_ids.length });

    let title: string;
    let message: string;

    if (action === 'created') {
      title = 'Новое мероприятие';
      message = `Вы назначены участником мероприятия "${event_name}"`;
      if (event_date) {
        const date = new Date(event_date).toLocaleDateString('ru-RU');
        message += `\nДата: ${date}`;
      }
      if (event_time) {
        message += `\nВремя: ${event_time}`;
      }
      if (location) {
        message += `\nМесто: ${location}`;
      }
    } else if (action === 'updated') {
      title = 'Изменение в мероприятии';
      message = `Мероприятие "${event_name}" изменено`;
      
      if (changes) {
        const changedItems = [];
        if (changes.date_changed) changedItems.push('дата');
        if (changes.time_changed) changedItems.push('время');
        if (changes.location_changed) changedItems.push('место');
        
        if (changedItems.length > 0) {
          message += `\nИзменено: ${changedItems.join(', ')}`;
        }
      }
      
      if (event_date) {
        const date = new Date(event_date).toLocaleDateString('ru-RU');
        message += `\nНовая дата: ${date}`;
      }
      if (event_time) {
        message += `\nНовое время: ${event_time}`;
      }
      if (location) {
        message += `\nНовое место: ${location}`;
      }
    } else if (action === 'cancelled') {
      title = 'Мероприятие отменено';
      message = `Мероприятие "${event_name}" отменено`;
      if (event_date) {
        const date = new Date(event_date).toLocaleDateString('ru-RU');
        message += `\nДата: ${date}`;
      }
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Send notification to each participant
    const notificationPromises = participant_ids.map((user_id) =>
      supabase
        .from("notifications")
        .insert({
          user_id,
          title,
          message,
          type: 'event',
          data: {
            event_id,
            event_name,
            action,
            changes,
            event_date,
            event_time,
            location,
          },
        })
    );

    const results = await Promise.allSettled(notificationPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log('[send-event-notification] Results:', { successCount, failCount });

    if (failCount > 0) {
      console.error('[send-event-notification] Some notifications failed:', 
        results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failCount,
        total: participant_ids.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error('[send-event-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
