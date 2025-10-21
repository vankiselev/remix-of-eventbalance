import { Badge } from "@/components/ui/badge";
import { RoleBadges } from "./RoleBadge";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

interface UserRoleDisplayProps {
  userId: string;
  maxDisplay?: number;
}

export const UserRoleDisplay = ({ userId, maxDisplay = 1 }: UserRoleDisplayProps) => {
  const { roles, isLoading } = useUserRbacRoles(userId);
  
  if (isLoading) {
    return <Badge variant="secondary" className="text-xs px-2 py-0.5">Загрузка...</Badge>;
  }
  
  return <RoleBadges roles={roles} maxDisplay={maxDisplay} />;
};
