import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { useRoles } from "@/hooks/useRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PermissionsTable } from "./PermissionsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { RoleEditDialog } from "./RoleEditDialog";
import { Role } from "@/types/roles";

export const RolesManagement = () => {
  const { roles, isLoading, error, userCounts, permissionCounts, totalPermissions, deleteRole, updateRole } = useRoles();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRoleIsAdmin, setNewRoleIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsEditDialogOpen(true);
  };

  const handleSaveRole = (roleId: string, updates: Partial<Role>) => {
    updateRole.mutate({ roleId, updates }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingRole(null);
      }
    });
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleCode.trim()) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Название и код роли обязательны для заполнения",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('role_definitions')
        .insert([{
          name: newRoleName.trim(),
          code: newRoleCode.trim().toLowerCase().replace(/\s+/g, '_'),
          description: newRoleDescription.trim() || null,
          is_admin_role: newRoleIsAdmin,
          is_system: false,
        }]);

      if (error) throw error;

      toast({
        title: "Роль создана",
        description: "Новая роль успешно добавлена в систему",
      });

      // Reset form
      setNewRoleName("");
      setNewRoleCode("");
      setNewRoleDescription("");
      setNewRoleIsAdmin(false);
      setIsCreateDialogOpen(false);

      // Refresh roles list
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка создания роли",
        description: error.message || "Не удалось создать роль",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту роль?')) {
      deleteRole.mutate(roleId);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка загрузки ролей</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Не удалось загрузить роли из базы данных'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление ролями</h2>
          <p className="text-muted-foreground">
            Создавайте и настраивайте роли с различными правами доступа
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать роль
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создание новой роли</DialogTitle>
              <DialogDescription>
                Создайте новую роль с уникальным именем и кодом
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Название роли *</Label>
                <Input
                  id="role-name"
                  placeholder="Например: Менеджер"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-code">Код роли *</Label>
                <Input
                  id="role-code"
                  placeholder="Например: manager"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground">
                  Код будет автоматически преобразован в нижний регистр
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Описание</Label>
                <Textarea
                  id="role-description"
                  placeholder="Описание роли и её назначения"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is-admin">Административная роль</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Админ роли имеют полный доступ к системе
                    </p>
                  </div>
                  <Switch
                    id="is-admin"
                    checked={newRoleIsAdmin}
                    onCheckedChange={setNewRoleIsAdmin}
                    disabled={isCreating}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Отмена
                </Button>
                <Button onClick={handleCreateRole} disabled={isCreating}>
                  {isCreating ? "Создание..." : "Создать"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : (
        <Tabs defaultValue="permissions" className="w-full">
          <TabsList className="w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="permissions" className="whitespace-nowrap">
              <span className="hidden sm:inline">Матрица разрешений</span>
              <span className="sm:hidden">Разрешения</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="whitespace-nowrap">Роли</TabsTrigger>
          </TabsList>
          
          <TabsContent value="permissions" className="mt-6">
            <PermissionsTable />
          </TabsContent>
          
          <TabsContent value="roles" className="mt-6">
            {roles.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Роли не найдены</AlertTitle>
                <AlertDescription>
                  В системе пока нет ролей. Создайте первую роль для начала работы.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles.map(role => (
                  <div key={role.id} className="p-4 border rounded-lg space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{role.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {role.is_system && (
                        <span className="text-xs px-2 py-1 bg-secondary rounded">Системная</span>
                      )}
                      {role.is_admin_role && (
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Админ</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Пользователей: {userCounts[role.id] || 0}</div>
                      <div>Разрешений: {permissionCounts[role.id] || 0} / {totalPermissions}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleEditRole(role)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      <RoleEditDialog
        role={editingRole}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveRole}
        isSaving={updateRole.isPending}
      />
    </div>
  );
};
