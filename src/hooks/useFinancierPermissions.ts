import { useUserPermissions } from "./useUserPermissions";

export const useFinancierPermissions = () => {
  const { permissions, hasPermission, isLoading } = useUserPermissions();

  const canReview = hasPermission('transactions.review');
  const canApprove = hasPermission('transactions.approve');
  const canReject = hasPermission('transactions.reject');
  const canViewAll = hasPermission('transactions.view_all');
  
  const isFinancier = canReview || canApprove || canReject || canViewAll;

  return {
    isFinancier,
    canReview,
    canApprove,
    canReject,
    canViewAll,
    isLoading,
  };
};
