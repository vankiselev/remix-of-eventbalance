import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  id: string;
  item_id: string;
  changed_by: string | null;
  action: 'create' | 'update' | 'delete' | 'restore';
  old_data: any;
  new_data: any;
  changed_fields: string[] | null;
  change_description: string | null;
  changed_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export const useWarehouseItemsAudit = (itemId?: string) => {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['warehouse-items-audit', itemId],
    queryFn: async () => {
      let query = supabase
        .from('warehouse_items_audit_log' as any)
        .select(`
          *,
          profiles:changed_by(first_name, last_name, avatar_url)
        `)
        .order('changed_at', { ascending: false });
      
      if (itemId) {
        query = query.eq('item_id', itemId);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    enabled: !!itemId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });

  return { auditLogs, isLoading };
};
