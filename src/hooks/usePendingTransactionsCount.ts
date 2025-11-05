import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
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
        .eq('verification_status', 'pending')
        .eq('requires_verification', true);
      
      if (error) {
        console.error('[usePendingTransactionsCount] Error:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: isFinancier,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    // Removed aggressive refetchInterval - rely on realtime instead
  });

  // Realtime subscription for transaction changes
  useEffect(() => {
    if (!isFinancier) return;
    
    const channel = supabase
      .channel('pending-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions',
          filter: 'verification_status=eq.pending',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isFinancier, refetch]);

  return {
    pendingCount: count,
    refetch,
  };
};
