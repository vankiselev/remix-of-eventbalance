import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface ChatRoom {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  description: string | null;
  unread_count?: number;
  last_message?: {
    content: string;
    created_at: string;
  };
  participants?: Array<{
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }>;
}

export const useChats = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's chat rooms
      const { data: chatParticipants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('chat_room_id, last_read_at')
        .eq('user_id', user.id);

      if (participantsError) throw participantsError;

      const chatRoomIds = chatParticipants.map(p => p.chat_room_id);

      if (chatRoomIds.length === 0) return [];

      // Get chat rooms
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', chatRoomIds)
        .order('updated_at', { ascending: false });

      if (roomsError) throw roomsError;

      // Get participants for each room
      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_room_id', room.id);

          // Use SECURITY DEFINER function to bypass profiles RLS for non-admins
          const { data: allProfiles } = await supabase.rpc('get_all_basic_profiles');
          const profileMap = new Map((allProfiles || []).map((p: any) => [p.id, p]));

          const participantsWithProfiles = (participants || []).map((p) => {
            const profile = profileMap.get(p.user_id);
            return {
              user_id: p.user_id,
              profiles: {
                full_name: profile?.full_name || '',
                avatar_url: profile?.avatar_url || null,
              },
            };
          });

          return {
            ...room,
            participants: participantsWithProfiles,
          };
        })
      );

      // Get last message for each room
      const roomsWithMessages = await Promise.all(
        roomsWithParticipants.map(async (room) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages
          const participant = chatParticipants.find(p => p.chat_room_id === room.id);
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_room_id', room.id)
            .gt('created_at', participant?.last_read_at || new Date(0).toISOString())
            .neq('sender_id', user.id);

          return {
            ...room,
            last_message: lastMessage,
            unread_count: unreadCount || 0,
          };
        })
      );

      return roomsWithMessages as ChatRoom[];
    },
  });

  const createChat = useMutation({
    mutationFn: async ({ 
      participantIds, 
      isGroup, 
      name 
    }: { 
      participantIds: string[]; 
      isGroup: boolean; 
      name?: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create chat room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: isGroup ? name : null,
          is_group: isGroup,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as participant
      const participants = [
        { chat_room_id: room.id, user_id: user.id, is_admin: true },
        ...participantIds.map(id => ({ 
          chat_room_id: room.id, 
          user_id: id, 
          is_admin: false 
        })),
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      toast({ title: "Чат создан" });
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Subscribe to realtime changes for chat rooms and participants
  useEffect(() => {
    const channel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);

  return {
    chats,
    isLoading,
    createChat: createChat.mutate,
    isCreating: createChat.isPending,
    totalUnread,
  };
};
