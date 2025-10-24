import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/usePermissions";
import { useRoles } from "@/hooks/useRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const PermissionsTable = () => {
  const { roles, isLoading: rolesLoading } = useRoles();
  const { permissions, rolePermissions, isLoading: permissionsLoading, togglePermission } = usePermissions();

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!permissions.length) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Нет разрешений</AlertTitle>
        <AlertDescription>
          В системе пока нет настроенных разрешений
        </AlertDescription>
      </Alert>
    );
  }

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  // Helper to check if permission is granted for a role
  const isPermissionGranted = (roleId: string, permissionId: string): boolean => {
    const rolePermission = rolePermissions.find(
      rp => rp.role_id === roleId && rp.permission_id === permissionId
    );
    return rolePermission?.granted || false;
  };

  // Helper to handle checkbox change
  const handleToggle = (roleId: string, permissionId: string, currentValue: boolean) => {
    togglePermission.mutate({ roleId, permissionId, granted: !currentValue });
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <div className="text-sm text-muted-foreground mb-2">
        Всего разрешений: {permissions.length} в {Object.keys(groupedPermissions).length} категориях
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Раздел</TableHead>
            <TableHead className="w-[300px]">Действие</TableHead>
            {roles.map(role => (
              <TableHead key={role.id} className="text-center">
                {role.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
            categoryPermissions.map((permission, index) => (
              <TableRow key={permission.id}>
                {index === 0 && (
                  <TableCell 
                    rowSpan={categoryPermissions.length}
                    className="font-medium align-top bg-muted/30"
                  >
                    {category}
                  </TableCell>
                )}
                <TableCell>
                  <div>
                    <div className="font-medium">{permission.name}</div>
                    {permission.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {permission.description}
                      </div>
                    )}
                    {permission.scope_type && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Область: {permission.scope_type}
                      </div>
                    )}
                  </div>
                </TableCell>
                {roles.map(role => {
                  const granted = isPermissionGranted(role.id, permission.id);
                  
                  return (
                    <TableCell key={role.id} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={granted}
                          onCheckedChange={() => handleToggle(role.id, permission.id, granted)}
                        />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
