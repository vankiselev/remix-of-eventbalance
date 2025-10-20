import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessagePayload {
  type: 'INSERT';
  table: string;
  schema: string;
  record: {
    id: string;
    chat_room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
  };
  old_record: null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: MessagePayload = await req.json();
    const message = payload.record;

    console.log('Processing message notification:', message.id);

    // Get sender's profile
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', message.sender_id)
      .single();

    const senderName = sender?.full_name || 'Кто-то';

    // Get all chat participants except the sender
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_room_id', message.chat_room_id)
      .neq('user_id', message.sender_id);

    if (!participants || participants.length === 0) {
      console.log('No participants to notify');
      return new Response(
        JSON.stringify({ success: true, message: 'No participants to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notification to each participant
    const notificationPromises = participants.map(async (participant) => {
      try {
        console.log(`Sending notification to user: ${participant.user_id}`);
        
        // Call the send-push-notification function
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: participant.user_id,
            title: senderName,
            message: message.content || 'Новое сообщение',
            type: 'message',
            data: {
              chat_room_id: message.chat_room_id,
              message_id: message.id,
            },
          },
        });

        if (error) {
          console.error(`Error sending notification to ${participant.user_id}:`, error);
        } else {
          console.log(`Notification sent successfully to ${participant.user_id}`);
        }
      } catch (error) {
        console.error(`Exception sending notification to ${participant.user_id}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ success: true, notified: participants.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-message-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
