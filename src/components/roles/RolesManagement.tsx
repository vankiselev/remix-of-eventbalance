import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRoles } from "@/hooks/useRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PermissionsTable } from "./PermissionsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const RolesManagement = () => {
  const { roles, isLoading, error, userCounts, permissionCounts, totalPermissions, deleteRole } = useRoles();

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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Создать роль
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : (
        <Tabs defaultValue="permissions" className="w-full">
          <TabsList>
            <TabsTrigger value="permissions">Матрица разрешений</TabsTrigger>
            <TabsTrigger value="roles">Роли</TabsTrigger>
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
                  <div key={role.id} className="p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">{role.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    <div className="flex gap-2 mt-3">
                      {role.is_system && (
                        <span className="text-xs px-2 py-1 bg-secondary rounded">Системная</span>
                      )}
                      {role.is_admin_role && (
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Админ</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-3">
                      Пользователей: {userCounts[role.id] || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Разрешений: {permissionCounts[role.id] || 0} / {totalPermissions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
