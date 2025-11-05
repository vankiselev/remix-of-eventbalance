import { useAuth } from "@/contexts/AuthContext";

interface RbacRole {
  name: string;
  code: string;
  is_admin_role: boolean;
}

// Optimized hook - reads from AuthContext instead of making separate queries
export const useUserRbacRoles = (userId?: string) => {
  const { user, rbacRoles, isAdmin, loading, refetchUserData } = useAuth();
  
  // If requesting current user's roles, use cached data from AuthContext
  const isCurrentUser = !userId || userId === user?.id;
  
  if (isCurrentUser) {
    return {
      roles: rbacRoles,
      isLoading: loading,
      isAdmin,
      primaryRole: rbacRoles[0] || null,
      refetch: refetchUserData,
    };
  }
  
  // For other users, return empty (this hook is mainly for current user)
  console.warn('[useUserRbacRoles] Fetching roles for other users not supported in optimized version');
  return {
    roles: [] as RbacRole[],
    isLoading: false,
    isAdmin: false,
    primaryRole: null,
    refetch: async () => {},
  };
};
