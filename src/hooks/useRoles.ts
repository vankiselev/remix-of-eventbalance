import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Role } from "@/types/roles";
import { useToast } from "@/hooks/use-toast";

export const useRoles = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles, isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_definitions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Role[];
    }
  });

  const { data: userCounts } = useQuery({
    queryKey: ['role-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select('role_id');
      
      if (error) throw error;
      
      // Count users per role
      const counts: Record<string, number> = {};
      data.forEach(assignment => {
        counts[assignment.role_id] = (counts[assignment.role_id] || 0) + 1;
      });
      
      return counts;
    }
  });

  const { data: permissionCounts } = useQuery({
    queryKey: ['role-permission-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_id, granted');
      
      if (error) throw error;
      
      // Count granted permissions per role
      const counts: Record<string, number> = {};
      data.forEach(rp => {
        if (rp.granted) {
          counts[rp.role_id] = (counts[rp.role_id] || 0) + 1;
        }
      });
      
      return counts;
    }
  });

  const { data: totalPermissions } = useQuery({
    queryKey: ['total-permissions'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('permissions')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  const createRole = useMutation({
    mutationFn: async (roleData: { name: string; code: string; description?: string }) => {
      const { data, error } = await supabase
        .from('role_definitions')
        .insert({
          name: roleData.name,
          code: roleData.code,
          description: roleData.description,
          is_system: false,
          is_admin_role: false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: "Роль создана",
        description: "Новая роль успешно добавлена в систему",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось создать роль",
      });
    }
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('role_definitions')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: "Роль удалена",
        description: "Роль успешно удалена из системы",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить роль",
      });
    }
  });

  return {
    roles: roles || [],
    isLoading,
    error,
    userCounts: userCounts || {},
    permissionCounts: permissionCounts || {},
    totalPermissions: totalPermissions || 0,
    createRole,
    deleteRole
  };
};
