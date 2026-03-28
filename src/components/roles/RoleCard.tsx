import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Role } from "@/types/roles";
import { MoreVertical, Users, Shield, Trash2, Edit, Copy } from "lucide-react";

interface RoleCardProps {
  role: Role;
  userCount: number;
  permissionCount: number;
  totalPermissions: number;
  onDelete?: (roleId: string) => void;
}

export const RoleCard = ({ 
  role, 
  userCount, 
  permissionCount, 
  totalPermissions,
  onDelete 
}: RoleCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{role.display_name || role.name}</CardTitle>
              {role.is_system && (
                <Badge variant="secondary" className="text-xs">
                  Системная
                </Badge>
              )}
              {role.is_admin_role && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                  Админская
                </Badge>
              )}
            </div>
            <CardDescription>
              {role.description || "Без описания"}
            </CardDescription>
          </div>
          
          {!role.is_system && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Клонировать
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete?.(role.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{userCount} {userCount === 1 ? 'пользователь' : userCount < 5 ? 'пользователя' : 'пользователей'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{permissionCount} / {totalPermissions} прав</span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Код: <code className="bg-muted px-1 py-0.5 rounded">{role.code}</code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
