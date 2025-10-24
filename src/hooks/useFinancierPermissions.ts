import { useUserPermissions } from "./useUserPermissions";

export const useFinancierPermissions = () => {
  const { permissions, hasPermission, isLoading } = useUserPermissions();

  const canReview = hasPermission('transactions.review');
  const canApprove = hasPermission('transactions.approve');
  const canReject = hasPermission('transactions.reject');
  const canViewAll = hasPermission('transactions.view_all');
  
  const isFinancier = canReview || canApprove || canReject || canViewAll;

  console.log('[useFinancierPermissions] isFinancier:', isFinancier, {
    canReview,
    canApprove,
    canReject,
    canViewAll,
    permissions: permissions.slice(0, 10),
  });

  return {
    isFinancier,
    canReview,
    canApprove,
    canReject,
    canViewAll,
    isLoading,
  };
};
