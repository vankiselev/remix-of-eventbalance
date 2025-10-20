import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const useChatUnread = () => {
  const queryClient = useQueryClient();
  
  const { data: totalUnread = 0 } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // Get user's chat rooms
      const { data: chatParticipants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('chat_room_id, last_read_at')
        .eq('user_id', user.id);

      if (participantsError || !chatParticipants || chatParticipants.length === 0) {
        return 0;
      }

      // Count unread messages across all chats
      let totalCount = 0;
      
      for (const participant of chatParticipants) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_room_id', participant.chat_room_id)
          .gt('created_at', participant.last_read_at || new Date(0).toISOString())
          .neq('sender_id', user.id);

        totalCount += count || 0;
      }

      return totalCount;
    },
  });

  // Subscribe to realtime updates for messages and chat_participants
  useEffect(() => {
    const channel = supabase
      .channel('chat-unread-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { totalUnread };
};
