import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, X, Info, ArrowLeft } from "lucide-react";
import { useMessages, type Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChatMediaPanel } from "./ChatMediaPanel";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatWindowProps {
  chatRoomId: string;
  currentUserId: string;
  onBack?: () => void;
}

export const ChatWindow = ({ chatRoomId, currentUserId, onBack }: ChatWindowProps) => {
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const { messages, isLoading, sendMessage, isSending, markAsRead } = useMessages(chatRoomId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    markAsRead();
  }, [chatRoomId, markAsRead]);

  const handleSend = () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || isSending) return;

    sendMessage({ content: messageText, files: selectedFiles });
    setMessageText("");
    setSelectedFiles([]);
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
    return <div className="flex items-center justify-center h-full">Загрузка...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--whatsapp-bg))]">
      {/* WhatsApp-style header */}
      <div className="bg-[hsl(var(--whatsapp-hover))] border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isMobile && onBack && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="w-10 h-10">
            <AvatarFallback className="text-sm font-medium bg-muted">
              ЧТ
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-[15px]">Чат</h3>
            <p className="text-xs text-muted-foreground">онлайн</p>
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

      {/* Messages area with WhatsApp pattern background */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6" 
        ref={scrollRef}
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px)`
        }}
      >
        <div className="space-y-2 max-w-5xl mx-auto">
          {messages.map((message: Message) => {
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
                  <Avatar className="w-8 h-8 mb-1">
                    <AvatarImage src={message.sender?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {message.sender?.full_name?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* WhatsApp-style message bubble */}
                <div
                  className={cn(
                    "max-w-[75%] sm:max-w-[65%] rounded-lg px-3 py-2 shadow-sm",
                    isOwn 
                      ? "bg-[hsl(var(--whatsapp-own-message))] rounded-br-none" 
                      : "bg-white rounded-bl-none"
                  )}
                >
                  {!isOwn && (
                    <p className="text-[13px] font-semibold mb-1 text-[hsl(var(--whatsapp-primary))]">
                      {message.sender?.full_name}
                    </p>
                  )}
                  
                  {message.content && (
                    <p className="text-[14.2px] text-foreground break-words leading-[19px]">
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
                          className="flex items-center gap-2 text-[13px] text-blue-600 hover:underline"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {att.file_name}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(message.created_at), "HH:mm", { locale: ru })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp-style input footer */}
      <div className={cn(
        "bg-[hsl(var(--whatsapp-hover))] border-t border-border/50 px-4 py-3 space-y-2 shrink-0",
        isMobile && "pb-safe"
      )}>
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 text-sm shadow-sm"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

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
            className="shrink-0 hover:bg-white/50"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Введите сообщение..."
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isSending}
            className="bg-white border-none shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 rounded-lg"
          />

          <Button 
            onClick={handleSend} 
            disabled={isSending}
            size="icon"
            className="shrink-0 bg-[hsl(var(--whatsapp-primary))] hover:bg-[hsl(var(--whatsapp-primary-dark))] text-white rounded-full"
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
