import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface TenantGuardProps {
  children: React.ReactNode;
  requireOwner?: boolean;
  requireAdmin?: boolean;
}

/**
 * TenantGuard - HOC that protects routes requiring tenant access
 * 
 * Usage:
 * <TenantGuard>
 *   <YourComponent />
 * </TenantGuard>
 * 
 * <TenantGuard requireAdmin>
 *   <AdminOnlyComponent />
 * </TenantGuard>
 */
export const TenantGuard: React.FC<TenantGuardProps> = ({ 
  children, 
  requireOwner = false,
  requireAdmin = false 
}) => {
  const { currentTenant, isLoadingTenant, tenantError, isTenantOwner, isTenantAdmin } = useTenant();
  const { user, loading: authLoading, isAdmin: isSuperAdmin } = useAuth();
  const location = useLocation();

  // Show loading while checking
  if (authLoading || isLoadingTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Super admin can access everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // No tenant selected or access error
  if (!currentTenant || tenantError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Доступ запрещён</h1>
          <p className="text-muted-foreground mb-6">
            {tenantError || 'Выберите компанию для продолжения работы'}
          </p>
          <a 
            href="/select-company" 
            className="text-primary hover:underline"
          >
            Выбрать компанию
          </a>
        </div>
      </div>
    );
  }

  // Check owner requirement
  if (requireOwner && !isTenantOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Только для владельцев</h1>
          <p className="text-muted-foreground">
            Эта страница доступна только владельцам компании
          </p>
        </div>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && !isTenantAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Только для администраторов</h1>
          <p className="text-muted-foreground">
            Эта страница доступна только администраторам компании
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
