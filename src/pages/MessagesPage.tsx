import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { useChats } from "@/hooks/useChats";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const MessagesPage = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const { chats, isLoading, createChat } = useChats();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const handleCreateChat = (data: any) => {
    createChat(data);
    setNewChatDialogOpen(false);
  };

  if (!user) return null;

  return (
    <Layout>
      <div className={cn(
        "flex flex-1 min-h-0 h-full"
      )}>
        {/* Mobile: Show either chat list or chat window */}
        {isMobile ? (
          <>
            {selectedChatId ? (
              <div className="flex-1 flex flex-col">
                <ChatWindow 
                  chatRoomId={selectedChatId} 
                  currentUserId={user.id}
                  onBack={() => setSelectedChatId(null)}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Чаты</h2>
                  <Button size="icon" onClick={() => setNewChatDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    Загрузка...
                  </div>
                ) : chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground mb-4">У вас пока нет чатов</p>
                    <Button onClick={() => setNewChatDialogOpen(true)}>
                      Создать чат
                    </Button>
                  </div>
                ) : (
                  <ChatList
                    chats={chats}
                    selectedChatId={selectedChatId}
                    onSelectChat={setSelectedChatId}
                    currentUserId={user.id}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          /* Desktop: Show both chat list and chat window */
          <>
            <div className="w-80 border-r flex flex-col min-h-0">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold">Чаты</h2>
                <Button size="icon" onClick={() => setNewChatDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center flex-1">
                  Загрузка...
                </div>
              ) : chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">У вас пока нет чатов</p>
                  <Button onClick={() => setNewChatDialogOpen(true)}>
                    Создать чат
                  </Button>
                </div>
              ) : (
                <ChatList
                  chats={chats}
                  selectedChatId={selectedChatId}
                  onSelectChat={setSelectedChatId}
                  currentUserId={user.id}
                />
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              {selectedChatId ? (
                <ChatWindow chatRoomId={selectedChatId} currentUserId={user.id} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">
                      Выберите чат для начала общения
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <NewChatDialog
        open={newChatDialogOpen}
        onOpenChange={setNewChatDialogOpen}
        onCreateChat={handleCreateChat}
      />
    </Layout>
  );
};

export default MessagesPage;
