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
      if (!uid) return [] as RbacRole[];

      // 1) Fetch role assignments to get role_ids
      const { data: assignments, error: assignError } = await supabase
        .from('user_role_assignments')
        .select('role_id')
        .eq('user_id', uid);
      if (assignError) throw assignError;

      const roleIds = (assignments || []).map(a => a.role_id).filter(Boolean);
      if (roleIds.length === 0) return [] as RbacRole[]; // no roles -> show default badge

      // 2) Fetch role definitions by ids (robust even without FK relations)
      const { data: defs, error: defsError } = await supabase
        .from('role_definitions')
        .select('name, code, is_admin_role')
        .in('id', roleIds);
      if (defsError) throw defsError;

      return (defs || []) as RbacRole[];
    },
  });

  // Realtime subscription for current user's role changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setup = async () => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return;
      channel = supabase
        .channel('user-rbac-roles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_role_assignments',
            filter: `user_id=eq.${uid}`,
          },
          () => {
            refetch();
          }
        )
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return {
    roles,
    isLoading,
    isAdmin: roles.some(role => role.is_admin_role),
    primaryRole: roles[0] || null,
    refetch,
  };
};
