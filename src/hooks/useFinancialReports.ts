import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FinancialReport {
  id: string;
  name: string;
  event_id?: string | null;
  event_date?: string | null;
  status: string;
  total_planned_income: number;
  total_planned_expense: number;
  total_actual_income: number;
  total_actual_expense: number;
  profit: number;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialReportItem {
  id: string;
  report_id: string;
  item_type?: 'income' | 'expense' | null; // Now optional - type determined by matched transactions
  category: string;
  description?: string | null;
  planned_amount: number;
  actual_amount: number;
  actual_income?: number; // New: tracks income from matched transactions
  actual_expense?: number; // New: tracks expense from matched transactions
  is_matched: boolean;
  matched_transaction_ids: string[];
  sort_order: number;
  created_at: string;
}

export const useFinancialReports = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['financial-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinancialReport[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const createReport = useMutation({
    mutationFn: async (report: Partial<FinancialReport>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('financial_reports')
        .insert({
          name: report.name!,
          event_id: report.event_id,
          event_date: report.event_date,
          status: 'draft',
          total_planned_income: report.total_planned_income || 0,
          total_planned_expense: report.total_planned_expense || 0,
          notes: report.notes,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      toast({ title: "Финотчёт создан" });
    },
    onError: (error) => {
      console.error('Error creating report:', error);
      toast({ title: "Ошибка создания финотчёта", variant: "destructive" });
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinancialReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_reports')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      toast({ title: "Финотчёт обновлён" });
    },
    onError: (error) => {
      console.error('Error updating report:', error);
      toast({ title: "Ошибка обновления финотчёта", variant: "destructive" });
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      toast({ title: "Финотчёт удалён" });
    },
    onError: (error) => {
      console.error('Error deleting report:', error);
      toast({ title: "Ошибка удаления финотчёта", variant: "destructive" });
    },
  });

  return {
    reports,
    isLoading,
    createReport,
    updateReport,
    deleteReport,
  };
};

export const useFinancialReportItems = (reportId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery({
    queryKey: ['financial-report-items', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      
      const { data, error } = await supabase
        .from('financial_report_items')
        .select('*')
        .eq('report_id', reportId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FinancialReportItem[];
    },
    enabled: !!reportId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const addItems = useMutation({
    mutationFn: async (newItems: Partial<FinancialReportItem>[]) => {
      const { data, error } = await supabase
        .from('financial_report_items')
        .insert(newItems.map((item, index) => ({
          report_id: item.report_id!,
          item_type: item.item_type!,
          category: item.category!,
          description: item.description,
          planned_amount: item.planned_amount || 0,
          sort_order: item.sort_order ?? index,
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-report-items', reportId] });
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    },
    onError: (error) => {
      console.error('Error adding items:', error);
      toast({ title: "Ошибка добавления статей", variant: "destructive" });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinancialReportItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_report_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-report-items', reportId] });
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast({ title: "Ошибка обновления статьи", variant: "destructive" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_report_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-report-items', reportId] });
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast({ title: "Ошибка удаления статьи", variant: "destructive" });
    },
  });

  return {
    items,
    isLoading,
    addItems,
    updateItem,
    deleteItem,
  };
};

export const useMatchingTransactions = (reportName: string | null) => {
  return useQuery({
    queryKey: ['matching-transactions', reportName],
    queryFn: async () => {
      if (!reportName) return [];
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .or(`static_project_name.ilike.%${reportName}%,description.ilike.%${reportName}%`)
        .order('operation_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!reportName,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
