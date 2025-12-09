import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useCallback } from "react";
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
  const currentUserIdRef = useRef<string | null>(null);

  // Get current user ID once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      currentUserIdRef.current = user?.id || null;
    });
  }, []);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', chatRoomId],
    queryFn: async () => {
      if (!chatRoomId) return [];

      // Get messages with attachments
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*, message_attachments(*)')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Get all profiles
      const { data: allProfiles } = await supabase.rpc('get_all_basic_profiles');
      const profileMap = new Map((allProfiles || []).map((p: any) => [p.id, p]));

      return (messagesData || []).map(msg => {
        const profile = profileMap.get(msg.sender_id);
        return {
          ...msg,
          sender: {
            full_name: profile?.full_name || '',
            avatar_url: profile?.avatar_url || null,
          },
          attachments: msg.message_attachments || [],
        };
      }) as Message[];
    },
    enabled: !!chatRoomId,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Process new message from realtime
  const processNewMessage = useCallback(async (messageId: string) => {
    // Fetch the complete message with attachments
    const { data: message } = await supabase
      .from('messages')
      .select('*, message_attachments(*)')
      .eq('id', messageId)
      .single();

    if (!message) return null;

    // Get sender profile
    const { data: allProfiles } = await supabase.rpc('get_all_basic_profiles');
    const profile = (allProfiles || []).find((p: any) => p.id === message.sender_id);

    return {
      ...message,
      sender: {
        full_name: profile?.full_name || '',
        avatar_url: profile?.avatar_url || null,
      },
      attachments: message.message_attachments || [],
    } as Message;
  }, []);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!chatRoomId) return;

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
          const newMessageData = payload.new as any;
          
          // Check for duplicate before adding
          const existingMessages = queryClient.getQueryData<Message[]>(['messages', chatRoomId]) || [];
          if (existingMessages.some(m => m.id === newMessageData.id)) {
            return; // Skip duplicate
          }

          // Fetch complete message with profile
          const newMessage = await processNewMessage(newMessageData.id);
          if (!newMessage) return;

          // Add to cache
          queryClient.setQueryData(['messages', chatRoomId], (old: Message[] = []) => {
            // Double-check for duplicates
            if (old.some(m => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          });

          // Play sound and show notification if message is from another user
          const currentUserId = currentUserIdRef.current;
          if (newMessage.sender_id !== currentUserId) {
            notificationSound.play();

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              const senderName = newMessage.sender?.full_name || 'Кто-то';
              const messageText = newMessage.content || 'Новое сообщение';
              
              const notification = new Notification(senderName, {
                body: messageText,
                icon: newMessage.sender?.avatar_url || '/favicon.ico',
                badge: '/favicon.ico',
                tag: `message-${newMessage.id}`,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        async (payload) => {
          const updatedMessage = await processNewMessage(payload.new.id);
          if (!updatedMessage) return;

          queryClient.setQueryData(['messages', chatRoomId], (old: Message[] = []) => 
            old.map(m => m.id === updatedMessage.id ? updatedMessage : m)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          queryClient.setQueryData(['messages', chatRoomId], (old: Message[] = []) => 
            old.filter(m => m.id !== deletedId)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, queryClient, processNewMessage]);

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
      // Invalidate chats to update last message
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
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
    markAsRead: markAsRead.mutate,
  };
};
