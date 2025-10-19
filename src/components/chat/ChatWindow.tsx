import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, X } from "lucide-react";
import { useMessages, type Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  chatRoomId: string;
  currentUserId: string;
}

export const ChatWindow = ({ chatRoomId, currentUserId }: ChatWindowProps) => {
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
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
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message: Message) => {
            const isOwn = message.sender_id === currentUserId;
            
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={message.sender?.avatar_url || undefined} />
                    <AvatarFallback>
                      {message.sender?.full_name?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    isOwn 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium mb-1">
                      {message.sender?.full_name}
                    </p>
                  )}
                  
                  {message.content && (
                    <p className="break-words">{message.content}</p>
                  )}

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map(att => (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm underline"
                        >
                          <Paperclip className="w-4 h-4" />
                          {att.file_name}
                        </a>
                      ))}
                    </div>
                  )}

                  <p className={cn(
                    "text-xs mt-1",
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {format(new Date(message.created_at), "HH:mm", { locale: ru })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-4 space-y-2">
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted rounded px-3 py-1 text-sm"
              >
                <Paperclip className="w-4 h-4" />
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

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Введите сообщение..."
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={isSending}
          />

          <Button onClick={handleSend} disabled={isSending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
