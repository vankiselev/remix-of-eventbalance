import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateChat: (args: { participantIds: string[]; isGroup: boolean; name?: string }) => void;
}

export const NewChatDialog = ({ open, onOpenChange, onCreateChat }: NewChatDialogProps) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-chat', open],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Use security definer function to avoid RLS issues for non-admins
      const { data, error } = await supabase.rpc('get_all_basic_profiles');
      if (error) throw error;

      return (data || []).filter((u: any) => u.id !== user.id);
    },
    enabled: open,
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (selectedUsers.length === 0) return;

    const shouldBeGroup = selectedUsers.length > 1 || isGroup;
    onCreateChat({
      participantIds: selectedUsers,
      isGroup: shouldBeGroup,
      name: shouldBeGroup ? groupName : undefined,
    });
    
    setSelectedUsers([]);
    setGroupName("");
    setIsGroup(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {selectedUsers.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isGroup"
                  checked={isGroup}
                  onCheckedChange={(checked) => setIsGroup(checked as boolean)}
                />
                <Label htmlFor="isGroup">Создать групповой чат</Label>
              </div>

              {isGroup && (
                <div className="space-y-2">
                  <Label htmlFor="groupName">Название группы</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Введите название..."
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Выберите участников</Label>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Checkbox checked={selectedUsers.includes(user.id)} />
                    
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-left">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={selectedUsers.length === 0}
            >
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
