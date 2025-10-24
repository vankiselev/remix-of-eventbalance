import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

export const useUserPermissions = () => {
  const { isAdmin: isAdminRbac } = useUserRbacRoles();
  
  const { data: permissions = [], isLoading, refetch } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_user_permissions');
      if (error) throw error;
      const list = (data as string[]) || [];
      console.log('[useUserPermissions] permissions:', list);
      return list;
    },
  });

  // Keep permissions in sync with role changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setup = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;
      channel = supabase
        .channel('user-permissions-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_role_assignments', filter: `user_id=eq.${uid}` },
          () => refetch()
        )
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [refetch]);

  const hasPermission = (code: string) => {
    // Admin override: admins have all permissions
    if (isAdminRbac) return true;
    return permissions.includes(code);
  };

  return {
    permissions,
    hasPermission,
    isLoading,
    isAdmin: isAdminRbac,
  };
};
