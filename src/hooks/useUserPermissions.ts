import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserPermissions = () => {
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      // Get current user's role assignments
      const { data: roleAssignments, error: roleError } = await supabase
        .from('user_role_assignments')
        .select('role_id');
      
      if (roleError) throw roleError;
      
      if (!roleAssignments || roleAssignments.length === 0) {
        return [];
      }

      const roleIds = roleAssignments.map(ra => ra.role_id);

      // Get permissions for these roles
      const { data: rolePermissions, error: permError } = await supabase
        .from('role_permissions')
        .select('permission:permissions(code)')
        .in('role_id', roleIds)
        .eq('granted', true);
      
      if (permError) throw permError;

      // Extract permission codes
      const permissionCodes = rolePermissions
        ?.map(rp => (rp.permission as any)?.code)
        .filter(Boolean) || [];

      return permissionCodes as string[];
    },
  });

  const hasPermission = (code: string) => {
    return permissions.includes(code);
  };

  return {
    permissions,
    hasPermission,
    isLoading,
  };
};
