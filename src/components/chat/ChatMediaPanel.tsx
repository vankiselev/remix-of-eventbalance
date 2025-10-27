import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileIcon, LinkIcon, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ChatMediaPanelProps {
  chatRoomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatMediaPanel = ({ chatRoomId, open, onOpenChange }: ChatMediaPanelProps) => {
  const { data: attachments = [] } = useQuery({
    queryKey: ['chat-attachments', chatRoomId],
    queryFn: async () => {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, created_at')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: false });

      if (!messages) return [];

      const messageIds = messages.map(m => m.id);
      
      const { data: attachments } = await supabase
        .from('message_attachments')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: false });

      return attachments || [];
    },
    enabled: open && !!chatRoomId,
  });

  const { data: links = [] } = useQuery({
    queryKey: ['chat-links', chatRoomId],
    queryFn: async () => {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, created_at')
        .eq('chat_room_id', chatRoomId)
        .not('content', 'is', null)
        .order('created_at', { ascending: false });

      if (!messages) return [];

      // Extract URLs from messages
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linksData = messages
        .map(msg => {
          const urls = msg.content?.match(urlRegex);
          return urls?.map(url => ({
            id: msg.id,
            url,
            created_at: msg.created_at,
          })) || [];
        })
        .flat();

      return linksData;
    },
    enabled: open && !!chatRoomId,
  });

  const mediaFiles = attachments.filter(att => 
    att.file_type.startsWith('image/') || att.file_type.startsWith('video/')
  );
  
  const documentFiles = attachments.filter(att => 
    !att.file_type.startsWith('image/') && !att.file_type.startsWith('video/')
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Медиа и файлы</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="media" className="mt-6">
          <TabsList className="w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="media" className="whitespace-nowrap">
              <ImageIcon className="w-4 h-4 mr-2" />
              Медиа
            </TabsTrigger>
            <TabsTrigger value="files" className="whitespace-nowrap">
              <FileIcon className="w-4 h-4 mr-2" />
              Файлы
            </TabsTrigger>
            <TabsTrigger value="links" className="whitespace-nowrap">
              <LinkIcon className="w-4 h-4 mr-2" />
              Ссылки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              {mediaFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет медиафайлов
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {mediaFiles.map(file => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                    >
                      {file.file_type.startsWith('image/') ? (
                        <img 
                          src={file.file_url} 
                          alt={file.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              {documentFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет файлов
                </div>
              ) : (
                <div className="space-y-2">
                  {documentFiles.map(file => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <FileIcon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(file.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              {links.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет ссылок
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link, idx) => (
                    <a
                      key={`${link.id}-${idx}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <LinkIcon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-primary hover:underline">
                          {link.url}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(link.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
