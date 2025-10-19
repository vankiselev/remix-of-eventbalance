import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { ChatRoom } from "@/hooks/useChats";

interface ChatListProps {
  chats: ChatRoom[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  currentUserId: string;
}

export const ChatList = ({ chats, selectedChatId, onSelectChat, currentUserId }: ChatListProps) => {
  const getChatName = (chat: ChatRoom) => {
    if (chat.is_group) return chat.name || "Групповой чат";
    
    const otherParticipant = chat.participants?.find(p => p.user_id !== currentUserId);
    return otherParticipant?.profiles?.full_name || "Пользователь";
  };

  const getChatAvatar = (chat: ChatRoom) => {
    if (chat.is_group) return chat.avatar_url;
    
    const otherParticipant = chat.participants?.find(p => p.user_id !== currentUserId);
    return otherParticipant?.profiles?.avatar_url;
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left",
              selectedChatId === chat.id && "bg-accent"
            )}
          >
            <Avatar>
              <AvatarImage src={getChatAvatar(chat) || undefined} />
              <AvatarFallback>
                {getChatName(chat).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium truncate">{getChatName(chat)}</p>
                {chat.last_message && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(chat.last_message.created_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                )}
              </div>
              
              {chat.last_message && (
                <p className="text-sm text-muted-foreground truncate">
                  {chat.last_message.content}
                </p>
              )}
            </div>

            {chat.unread_count ? (
              <Badge variant="default" className="ml-auto">
                {chat.unread_count}
              </Badge>
            ) : null}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
