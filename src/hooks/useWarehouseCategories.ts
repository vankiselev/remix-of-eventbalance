import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarehouseCategory {
  id: string;
  name: string;
  icon_type: string;
  icon_value: string;
  bg_color: string;
  icon_color: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useWarehouseCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['warehouse-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as WarehouseCategory[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const createCategory = useMutation({
    mutationFn: async (category: Partial<WarehouseCategory>) => {
      const { data, error } = await supabase
        .from('warehouse_categories' as any)
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-categories'] });
      toast.success('Категория создана');
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Ошибка при создании категории');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseCategory> }) => {
      const { data, error } = await supabase
        .from('warehouse_categories' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-categories'] });
      toast.success('Категория обновлена');
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast.error('Ошибка при обновлении категории');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouse_categories' as any)
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-categories'] });
      toast.success('Категория удалена');
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      toast.error('Ошибка при удалении категории');
    },
  });

  return {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
