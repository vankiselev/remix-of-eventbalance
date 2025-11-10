import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransactionCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useTransactionCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['transaction-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as TransactionCategory[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: allCategories = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['transaction-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as TransactionCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createCategory = useMutation({
    mutationFn: async (category: { name: string; display_order: number }) => {
      const { error } = await supabase
        .from('transaction_categories')
        .insert({
          name: category.name,
          display_order: category.display_order,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-categories-all'] });
      toast.success('Категория создана');
    },
    onError: (error: any) => {
      console.error('Error creating category:', error);
      toast.error(`Ошибка при создании категории: ${error.message || 'неизвестная ошибка'}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async (category: Partial<TransactionCategory> & { id: string }) => {
      const { error } = await supabase
        .from('transaction_categories')
        .update({
          name: category.name,
          display_order: category.display_order,
          is_active: category.is_active,
        })
        .eq('id', category.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-categories-all'] });
      toast.success('Категория обновлена');
    },
    onError: (error: any) => {
      console.error('Error updating category:', error);
      toast.error(`Ошибка при обновлении категории: ${error.message || 'неизвестная ошибка'}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transaction_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-categories-all'] });
      toast.success('Категория удалена');
    },
    onError: (error: any) => {
      console.error('Error deleting category:', error);
      toast.error(`Ошибка при удалении категории: ${error.message || 'неизвестная ошибка'}`);
    },
  });

  return {
    categories,
    allCategories,
    isLoading,
    isLoadingAll,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
