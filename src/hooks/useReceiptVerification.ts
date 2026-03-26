import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReceiptVerification {
  id: string;
  transaction_id: string;
  fn: string | null;
  fd: string | null;
  fp: string | null;
  receipt_date: string | null;
  receipt_sum: number | null;
  operation_type: number | null;
  qr_raw: string | null;
  qr_parsed: boolean;
  input_method: string;
  status: string;
  fns_response: any;
  fns_error_code: string | null;
  fns_error_message: string | null;
  verified_at: string | null;
  retry_count: number;
  needs_manual_review: boolean;
  manual_review_comment: string | null;
  created_at: string;
  updated_at: string;
}

export function useReceiptVerification(transactionId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receipt-verification', transactionId],
    queryFn: async (): Promise<ReceiptVerification | null> => {
      if (!transactionId) return null;

      const { data, error } = await (supabase
        .from('receipt_verifications') as any)
        .select('*')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (error) {
        // Table might not exist on older self-hosted
        console.warn('receipt_verifications query error:', error.message);
        return null;
      }
      return data;
    },
    enabled: !!transactionId,
    staleTime: 30 * 1000,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['receipt-verification', transactionId] });
  };

  return {
    verification: query.data ?? null,
    isLoading: query.isLoading,
    refetch,
  };
}
