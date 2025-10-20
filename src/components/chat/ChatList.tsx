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
    <ScrollArea className="h-full bg-background">
      <div className="divide-y divide-border/50">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-l-4",
              selectedChatId === chat.id 
                ? "bg-[hsl(var(--whatsapp-hover))] border-[hsl(var(--whatsapp-primary))]" 
                : "hover:bg-[hsl(var(--whatsapp-hover))] border-transparent"
            )}
          >
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarImage src={getChatAvatar(chat) || undefined} />
              <AvatarFallback className="text-sm font-medium">
                {getChatName(chat).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="font-semibold text-[15px] text-foreground truncate">
                  {getChatName(chat)}
                </p>
                {chat.last_message && (
                  <span className="text-[12px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(chat.last_message.created_at), { 
                      addSuffix: false, 
                      locale: ru 
                    })}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between gap-2">
                {chat.last_message && (
                  <p className="text-[14px] text-muted-foreground truncate">
                    {chat.last_message.content}
                  </p>
                )}
                
                {chat.unread_count ? (
                  <Badge 
                    className="ml-auto shrink-0 bg-[hsl(var(--whatsapp-primary))] text-white hover:bg-[hsl(var(--whatsapp-primary-dark))] h-5 min-w-[20px] rounded-full px-1.5"
                  >
                    {chat.unread_count}
                  </Badge>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
