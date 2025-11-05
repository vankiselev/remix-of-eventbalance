import { useAuth } from "@/contexts/AuthContext";

// Optimized hook - reads from AuthContext instead of making separate queries
export const useUserPermissions = () => {
  const { permissions, isAdmin, hasPermission: hasPermissionFn, loading, refetchUserData } = useAuth();
  
  return {
    permissions,
    hasPermission: hasPermissionFn,
    isLoading: loading,
    isAdmin,
    refetch: refetchUserData,
  };
};
