import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancierPermissions } from "./useFinancierPermissions";

export const usePendingTransactionsCount = () => {
  const { isFinancier } = useFinancierPermissions();
  
  const { data: count = 0, refetch } = useQuery({
    queryKey: ['pending-transactions-count'],
    queryFn: async () => {
      if (!isFinancier) return 0;
      
      const { count, error } = await supabase
        .from('financial_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('is_draft', false)
        .eq('verification_status', 'pending')
        .eq('requires_verification', true);
      
      if (error) {
        console.error('[usePendingTransactionsCount] Error:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: isFinancier,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Realtime invalidation handled by RealtimeSync in App.tsx
  });

  return {
    pendingCount: count,
    refetch,
  };
};
