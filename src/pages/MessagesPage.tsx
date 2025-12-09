import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { useChats } from "@/hooks/useChats";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

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

  const selectedChat = chats.find(c => c.id === selectedChatId);

  if (!user) return null;

  // Mobile layout - full screen chat when selected
  if (isMobile) {
    if (selectedChatId) {
      return (
        <ChatWindow
          chatRoomId={selectedChatId}
          chat={selectedChat}
          currentUserId={user.id}
          onBack={() => setSelectedChatId(null)}
        />
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between bg-card">
          <h2 className="text-xl font-semibold">Чаты</h2>
          <Button size="icon" variant="ghost" onClick={() => setNewChatDialogOpen(true)}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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

        <NewChatDialog
          open={newChatDialogOpen}
          onOpenChange={setNewChatDialogOpen}
          onCreateChat={handleCreateChat}
        />
      </div>
    );
  }

  // Desktop layout - side by side
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="w-[400px] border-r border-border/50 flex flex-col h-full bg-background">
        <div className="px-4 py-4 bg-card border-b border-border/50 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold">Чаты</h2>
          <Button 
            size="icon" 
            onClick={() => setNewChatDialogOpen(true)}
            variant="ghost"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedChatId ? (
          <ChatWindow 
            chatRoomId={selectedChatId} 
            chat={selectedChat}
            currentUserId={user.id} 
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/30">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                Выберите чат для начала общения
              </p>
            </div>
          </div>
        )}
      </div>

      <NewChatDialog
        open={newChatDialogOpen}
        onOpenChange={setNewChatDialogOpen}
        onCreateChat={handleCreateChat}
      />
    </div>
  );
};

export default MessagesPage;
