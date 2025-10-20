import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { notificationSound } from "@/utils/notificationSound";

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  reply_to_id: string | null;
  sender: {
    full_name: string;
    avatar_url: string | null;
  };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
  }>;
}

export const useMessages = (chatRoomId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', chatRoomId],
    queryFn: async () => {
      if (!chatRoomId) return [];

      // Optimized: Single query with joins instead of N+1 queries
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_sender_id_fkey(full_name, avatar_url),
          message_attachments(*)
        `)
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(msg => ({
        ...msg,
        sender: msg.profiles || { full_name: '', avatar_url: null },
        attachments: msg.message_attachments || [],
      })) as Message[];
    },
    enabled: !!chatRoomId,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!chatRoomId) return;

    const getCurrentUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    };

    const channel = supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        async (payload) => {
          const currentUserId = await getCurrentUserId();
          
          // Optimized: Single query with joins
          const { data: message } = await supabase
            .from('messages')
            .select(`
              *,
              profiles!messages_sender_id_fkey(full_name, avatar_url),
              message_attachments(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (message) {
            const newMessage = {
              ...message,
              sender: message.profiles || { full_name: '', avatar_url: null },
              attachments: message.message_attachments || [],
            };

            queryClient.setQueryData(['messages', chatRoomId], (old: Message[] = []) => 
              [...old, newMessage as Message]
            );

            // Play sound and show notification if message is from another user
            if (message.sender_id !== currentUserId) {
              // Play sound notification
              notificationSound.play();

              // Show browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                const sender = newMessage.sender;
                const senderName = sender && 'full_name' in sender ? sender.full_name : 'Кто-то';
                const messageText = message.content || 'Новое сообщение';
                
                const notification = new Notification(senderName, {
                  body: messageText,
                  icon: sender && 'avatar_url' in sender ? sender.avatar_url || '/favicon.ico' : '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: `message-${message.id}`,
                });

                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ 
      content, 
      files 
    }: { 
      content: string; 
      files?: File[] 
    }) => {
      if (!chatRoomId) throw new Error('No chat room selected');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload files if any
      if (files && files.length > 0) {
        for (const file of files) {
          const filePath = `${user.id}/${Date.now()}_${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(filePath);

          await supabase.from('message_attachments').insert({
            message_id: message.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          });
        }
      }

      return message;
    },
    onSuccess: () => {
      // Don't invalidate messages - realtime will handle it
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка отправки", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!chatRoomId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update last_read_at
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_room_id', chatRoomId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    markAsRead: markAsRead.mutate,
  };
};
