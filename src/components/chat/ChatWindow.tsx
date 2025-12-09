import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, X, Info, ArrowLeft, ArrowDown } from "lucide-react";
import { useMessages, type Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChatMediaPanel } from "./ChatMediaPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChatRoom } from "@/hooks/useChats";

interface ChatWindowProps {
  chatRoomId: string;
  chat?: ChatRoom;
  currentUserId: string;
  onBack?: () => void;
}

export const ChatWindow = ({ chatRoomId, chat, currentUserId, onBack }: ChatWindowProps) => {
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const { messages, isLoading, sendMessage, isSending, markAsRead } = useMessages(chatRoomId);

  // Get chat name and avatar
  const getChatDisplayInfo = () => {
    if (!chat) {
      return { name: "Чат", avatar: null, initials: "ЧТ" };
    }

    if (chat.is_group) {
      return {
        name: chat.name || "Групповой чат",
        avatar: chat.avatar_url,
        initials: (chat.name || "ГЧ").substring(0, 2).toUpperCase(),
      };
    }

    // For 1-on-1 chats, show the other participant's name
    const otherParticipant = chat.participants?.find(p => p.user_id !== currentUserId);
    if (otherParticipant?.profiles) {
      const name = otherParticipant.profiles.full_name;
      return {
        name,
        avatar: otherParticipant.profiles.avatar_url,
        initials: name?.substring(0, 2).toUpperCase() || "??",
      };
    }

    return { name: "Чат", avatar: null, initials: "ЧТ" };
  };

  const displayInfo = getChatDisplayInfo();

  // Scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // Initial scroll and on new messages
  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  useEffect(() => {
    markAsRead();
  }, [chatRoomId, markAsRead]);

  // Handle scroll to show/hide scroll button
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // iOS keyboard handling
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined' || !window.visualViewport) return;

    const viewport = window.visualViewport;
    
    const handleResize = () => {
      const offset = window.innerHeight - viewport.height;
      setKeyboardHeight(offset > 50 ? offset : 0);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, [isMobile]);

  const handleSend = async () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || isSending) return;

    try {
      await sendMessage({ content: messageText, files: selectedFiles });
      setMessageText("");
      setSelectedFiles([]);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Failed to send:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col bg-background"
      style={{ 
        height: isMobile ? '100dvh' : '100%',
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined
      }}
    >
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={displayInfo.avatar || undefined} />
            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
              {displayInfo.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold text-[15px] truncate">{displayInfo.name}</h3>
            {chat?.is_group && (
              <p className="text-xs text-muted-foreground">
                {chat.participants?.length || 0} участников
              </p>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setMediaPanelOpen(true)}
          className="shrink-0"
        >
          <Info className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 bg-muted/20 relative" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="space-y-2 max-w-3xl mx-auto min-h-full flex flex-col justify-end">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Нет сообщений</p>
            </div>
          ) : (
            messages.map((message: Message) => {
              const isOwn = message.sender_id === currentUserId;
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 items-end",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8 mb-1 shrink-0">
                      <AvatarImage src={message.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {message.sender?.full_name?.substring(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
                      isOwn 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-card border rounded-bl-md"
                    )}
                  >
                    {!isOwn && chat?.is_group && (
                      <p className="text-xs font-semibold mb-1 text-primary">
                        {message.sender?.full_name}
                      </p>
                    )}
                    
                    {message.content && (
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map(att => (
                          <a
                            key={att.id}
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-2 text-xs underline",
                              isOwn ? "text-primary-foreground/80" : "text-primary"
                            )}
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate">{att.file_name}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    <p className={cn(
                      "text-[10px] mt-1 text-right",
                      isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      {format(new Date(message.created_at), "HH:mm", { locale: ru })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg h-10 w-10"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 bg-card border-t shrink-0">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-card border-t px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Сообщение..."
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isSending}
            className="flex-1 rounded-full bg-muted border-0"
          />

          <Button 
            onClick={handleSend} 
            disabled={isSending || (!messageText.trim() && selectedFiles.length === 0)}
            size="icon"
            className="shrink-0 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ChatMediaPanel 
        chatRoomId={chatRoomId}
        open={mediaPanelOpen}
        onOpenChange={setMediaPanelOpen}
      />
    </div>
  );
};
