import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface RbacRole {
  name: string;
  code: string;
  is_admin_role: boolean;
}

export const useUserRbacRoles = (userId?: string) => {
  const targetUserId = userId || 'current';
  
  const { data: roles = [], isLoading, refetch } = useQuery({
    queryKey: ['user-rbac-roles', targetUserId],
    queryFn: async () => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return [];

      const { data, error } = await supabase
        .from('user_role_assignments')
        .select('role_definitions(name, code, is_admin_role)')
        .eq('user_id', uid);

      if (error) throw error;

      return (data || [])
        .map(item => item.role_definitions)
        .filter(Boolean) as RbacRole[];
    },
  });

  // Realtime subscription for current user's role changes
  useEffect(() => {
    if (!userId) {
      const channel = supabase
        .channel('user-rbac-roles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_role_assignments',
            filter: `user_id=eq.${targetUserId}`,
          },
          () => {
            refetch();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, targetUserId, refetch]);

  return {
    roles,
    isLoading,
    isAdmin: roles.some(role => role.is_admin_role),
    primaryRole: roles[0] || null,
  };
};
