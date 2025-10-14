import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Role } from "@/types/roles";

interface RoleEditDialogProps {
  role: Role | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (roleId: string, updates: Partial<Role>) => void;
  isSaving: boolean;
}

export const RoleEditDialog = ({
  role,
  isOpen,
  onOpenChange,
  onSave,
  isSaving
}: RoleEditDialogProps) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setCode(role.code);
      setDescription(role.description || "");
      setIsAdmin(role.is_admin_role);
    }
  }, [role]);

  const handleSave = () => {
    if (!role) return;
    
    onSave(role.id, {
      name: name.trim(),
      code: code.trim().toLowerCase().replace(/\s+/g, '_'),
      description: description.trim() || null,
      is_admin_role: isAdmin
    });
  };

  if (!role) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактирование роли</DialogTitle>
          <DialogDescription>
            Изменение параметров роли "{role.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-role-name">Название роли *</Label>
            <Input
              id="edit-role-name"
              placeholder="Например: Менеджер"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving || role.is_system}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role-code">Код роли *</Label>
            <Input
              id="edit-role-code"
              placeholder="Например: manager"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isSaving || role.is_system}
            />
            <p className="text-xs text-muted-foreground">
              Код будет автоматически преобразован в нижний регистр
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role-description">Описание</Label>
            <Textarea
              id="edit-role-description"
              placeholder="Описание роли и её назначения"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="edit-is-admin">Административная роль</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Админ роли имеют полный доступ к системе
                </p>
              </div>
              <Switch
                id="edit-is-admin"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
                disabled={isSaving || role.is_system}
              />
            </div>
          </div>
          {role.is_system && (
            <p className="text-xs text-amber-600">
              Системные роли нельзя редактировать
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || role.is_system || !name.trim() || !code.trim()}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
