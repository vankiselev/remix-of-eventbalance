import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Permission, RolePermission } from "@/types/roles";
import { toast } from "sonner";

export const usePermissions = () => {
  const queryClient = useQueryClient();

  // Fetch all permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch all role permissions
  const { data: rolePermissions = [], isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*, permission:permissions(*)');
      
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  // Toggle permission for a role
  const togglePermission = useMutation({
    mutationFn: async ({ 
      roleId, 
      permissionId, 
      granted 
    }: { 
      roleId: string; 
      permissionId: string; 
      granted: boolean;
    }) => {
      // Check if permission already exists
      const { data: existing } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('role_permissions')
          .update({ granted })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role_id: roleId, permission_id: permissionId, granted });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Разрешение обновлено');
    },
    onError: (error) => {
      console.error('Error toggling permission:', error);
      toast.error('Ошибка при обновлении разрешения');
    },
  });

  return {
    permissions,
    rolePermissions,
    isLoading: permissionsLoading || rolePermissionsLoading,
    togglePermission,
  };
};
