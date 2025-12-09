import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction } from "./useTransactions";
import { useEffect, useRef } from "react";

export const useDraftTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout>();

  const { data: drafts = [], isLoading, refetch } = useQuery({
    queryKey: ['draft-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          events:project_id(name),
          attachments_count:financial_attachments(count)
        `)
        .eq('created_by', user.id)
        .eq('is_draft', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(t => ({
        ...t,
        attachments_count: t.attachments_count?.[0]?.count || 0,
      })) as Transaction[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Realtime subscription for draft changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`drafts-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions',
          filter: `created_by=eq.${user.id}`
        },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['draft-transactions'] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const publishDraft = async (transactionId: string) => {
    const { error } = await supabase
      .from('financial_transactions')
      .update({
        is_draft: false,
        requires_verification: true,
        verification_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (error) throw error;

    // Invalidate both drafts and transactions queries
    queryClient.invalidateQueries({ queryKey: ['draft-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return {
    drafts,
    draftsCount: drafts.length,
    isLoading,
    refetch,
    publishDraft,
  };
};
