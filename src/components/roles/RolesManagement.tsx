import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { useRoles } from "@/hooks/useRoles";
import { RoleCard } from "./RoleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Редактор прав
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать роль
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Роли не найдены</CardTitle>
            <CardDescription>
              В системе пока нет ролей. Создайте первую роль для начала работы.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              userCount={userCounts[role.id] || 0}
              permissionCount={permissionCounts[role.id] || 0}
              totalPermissions={totalPermissions}
              onDelete={handleDeleteRole}
            />
          ))}
        </div>
      )}
    </div>
  );
};
