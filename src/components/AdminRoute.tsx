import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        // Use has_role function which checks RBAC, user_roles, and profiles.role
        const { data: hasAdmin, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });

        if (error) {
          console.error('[AdminRoute] Error checking admin role:', error);
          // Fallback: check user_role_assignments directly
          const { data: adminRoles } = await supabase
            .from('user_role_assignments')
            .select('role_definitions!inner(is_admin_role)')
            .eq('user_id', user.id);

          const hasAdminRole = adminRoles?.some(
            (item: any) => item.role_definitions?.is_admin_role === true
          );
          setUserRole(hasAdminRole ? 'admin' : 'employee');
        } else {
          setUserRole(hasAdmin ? 'admin' : 'employee');
        }
      }
      setLoading(false);
    };
    
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
