// @ts-nocheck
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RbacRole {
  name: string;
  code: string;
  is_admin_role: boolean;
}

// Optimized hook - reads from AuthContext for current user, queries DB for others
export const useUserRbacRoles = (userId?: string) => {
  const { user, rbacRoles, isAdmin, loading, refetchUserData } = useAuth();
  
  // If requesting current user's roles, use cached data from AuthContext
  const isCurrentUser = !userId || userId === user?.id;
  
  // For other users, fetch from database using RPC
  const { data: otherUserRoles, isLoading: otherUserLoading } = useQuery({
    queryKey: ['user-rbac-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase.rpc('get_user_rbac_roles_by_id', {
        target_user_id: userId
      });
      
      if (error) {
        console.error('[useUserRbacRoles] Error fetching roles:', error);
        return [];
      }
      
      // Parse JSON response to RbacRole array
      if (Array.isArray(data)) {
        return data as unknown as RbacRole[];
      }
      
      return [];
    },
    enabled: !isCurrentUser && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  if (isCurrentUser) {
    return {
      roles: rbacRoles,
      isLoading: loading,
      isAdmin,
      primaryRole: rbacRoles[0] || null,
      refetch: refetchUserData,
    };
  }
  
  // For other users
  const otherUserIsAdmin = otherUserRoles?.some((r: RbacRole) => r.is_admin_role) || false;
  return {
    roles: otherUserRoles || [],
    isLoading: otherUserLoading,
    isAdmin: otherUserIsAdmin,
    primaryRole: otherUserRoles?.[0] || null,
    refetch: async () => {},
  };
};
