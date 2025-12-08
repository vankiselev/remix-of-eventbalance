import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePendingTasksCount = () => {
  const { user } = useAuth();
  
  const { data: count = 0, refetch } = useQuery({
    queryKey: ['pending-tasks-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      // Count CRM tasks assigned to user with pending/in_progress status
      const { count: crmCount, error: crmError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress']);
      
      if (crmError) {
        console.error('[usePendingTasksCount] CRM tasks error:', crmError);
      }
      
      // Count warehouse tasks assigned to user with pending/in_progress status
      const { count: warehouseCount, error: warehouseError } = await supabase
        .from('warehouse_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress']);
      
      if (warehouseError) {
        console.error('[usePendingTasksCount] Warehouse tasks error:', warehouseError);
      }
      
      return (crmCount || 0) + (warehouseCount || 0);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    pendingTasksCount: count,
    refetch,
  };
};
