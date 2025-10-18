import { useUserPermissions } from "./useUserPermissions";

export const useAccountantPermissions = () => {
  const { permissions, hasPermission, isLoading } = useUserPermissions();

  const canReview = hasPermission('transactions.review');
  const canApprove = hasPermission('transactions.approve');
  const canReject = hasPermission('transactions.reject');
  const canViewAll = hasPermission('transactions.view_all');
  
  const isAccountant = canReview || canApprove || canReject || canViewAll;

  return {
    isAccountant,
    canReview,
    canApprove,
    canReject,
    canViewAll,
    isLoading,
  };
};
