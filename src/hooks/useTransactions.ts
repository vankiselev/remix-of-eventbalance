// @ts-nocheck
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  operation_date: string;
  created_at: string;
  description: string;
  category: string;
  expense_amount: number;
  income_amount: number;
  project_owner: string;
  cash_type: string | null;
  project_id: string | null;
  static_project_name?: string | null;
  no_receipt: boolean;
  no_receipt_reason: string | null;
  notes: string | null;
  created_by: string;
  events?: { name: string } | null;
  attachments_count?: number;
  transfer_status?: string | null;
  transfer_to_user_id?: string | null;
  transfer_from_user_id?: string | null;
  transfer_to_user?: { full_name: string; email: string } | null;
  transfer_from_user?: { full_name: string; email: string } | null;
  verification_status?: string | null;
  requires_verification?: boolean | null;
  user_name?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_comment?: string | null;
  import_row_order?: number | null;
  is_draft?: boolean | null;
}

interface UseTransactionsOptions {
  userId?: string;
  isAdmin?: boolean;
  limit?: number;
  enabled?: boolean;
}

const fetchTransactionsData = async (userId?: string, isAdmin?: boolean, limit?: number): Promise<Transaction[]> => {
  let query = supabase
    .from('financial_transactions')
    .select(`
      *,
      events:project_id(name),
      attachments_count:financial_attachments(count)
    `)
    .order('operation_date', { ascending: false })
    .order('import_row_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  // Apply user filter
  if (userId) {
    query = query.eq('created_by', userId);
  }

  // Apply limit for pagination
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Collect unique user IDs for profile enrichment
  const userIds = new Set<string>();
  (data || []).forEach(t => {
    if (t.created_by) userIds.add(t.created_by);
    if (t.transfer_to_user_id) userIds.add(t.transfer_to_user_id);
    if (t.transfer_from_user_id) userIds.add(t.transfer_from_user_id);
  });

  // Fetch profiles separately
  let profilesMap = new Map<string, { full_name: string; email: string }>();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', Array.from(userIds));
    
    if (profiles) {
      profiles.forEach(p => profilesMap.set(p.id, p));
    }
  }

  // Transform data with user names and attachment counts
  return (data || []).map(transaction => ({
    ...transaction,
    user_name: profilesMap.get(transaction.created_by)?.full_name,
    attachments_count: transaction.attachments_count?.[0]?.count || 0,
    transfer_to_user: transaction.transfer_to_user_id 
      ? profilesMap.get(transaction.transfer_to_user_id) || null
      : null,
    transfer_from_user: transaction.transfer_from_user_id
      ? profilesMap.get(transaction.transfer_from_user_id) || null
      : null,
  }));
};

export const useTransactions = (options: UseTransactionsOptions = {}) => {
  const { userId, isAdmin, limit, enabled = true } = options;
  const queryClient = useQueryClient();

  const queryKey = ['transactions', userId || 'all', limit || 'all'];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTransactionsData(userId, isAdmin, limit),
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Realtime invalidation handled by RealtimeSync in App.tsx

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return {
    ...query,
    transactions: query.data || [],
    refetch,
  };
};
