import { Badge } from "@/components/ui/badge";
import { Shield, User, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  roleName: string;
  roleCode?: string;
  isAdminRole?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const getRoleIcon = (code?: string) => {
  if (!code) return <User className="h-3 w-3" />;
  
  if (code.includes('admin')) return <Shield className="h-3 w-3" />;
  if (code.includes('accountant') || code.includes('financ')) return <DollarSign className="h-3 w-3" />;
  return <User className="h-3 w-3" />;
};

const getRoleVariant = (isAdminRole?: boolean, code?: string): "default" | "secondary" | "outline" | "destructive" => {
  if (isAdminRole) return "destructive";
  if (code?.includes('accountant') || code?.includes('financ')) return "default";
  return "secondary";
};

export function RoleBadge({ 
  roleName, 
  roleCode, 
  isAdminRole, 
  className,
  size = "sm" 
}: RoleBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5"
  };

  return (
    <Badge 
      variant={getRoleVariant(isAdminRole, roleCode)}
      className={cn("flex items-center gap-1", sizeClasses[size], className)}
    >
      {getRoleIcon(roleCode)}
      <span>{roleName}</span>
    </Badge>
  );
}

interface RoleBadgesProps {
  roles: Array<{ name: string; code: string; is_admin_role: boolean }>;
  maxDisplay?: number;
  className?: string;
}

export function RoleBadges({ roles, maxDisplay = 2, className }: RoleBadgesProps) {
  if (roles.length === 0) {
    return <RoleBadge roleName="Сотрудник" className={className} />;
  }

  const displayRoles = roles.slice(0, maxDisplay);
  const remainingCount = roles.length - maxDisplay;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {displayRoles.map((role, index) => (
        <RoleBadge
          key={index}
          roleName={role.name}
          roleCode={role.code}
          isAdminRole={role.is_admin_role}
        />
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs px-2 py-0.5">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}
