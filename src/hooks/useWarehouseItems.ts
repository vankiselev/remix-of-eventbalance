import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarehouseItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  photo_url: string | null;
  unit: string;
  min_stock: number;
  price: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseItemWithStock extends WarehouseItem {
  total_quantity?: number;
  category_name?: string;
}

export const useWarehouseItems = () => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['warehouse-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_items' as any)
        .select(`
          *,
          warehouse_categories!category_id(name),
          warehouse_stock(quantity)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      return (data || []).map((item: any) => {
        const totalQuantity = item.warehouse_stock?.reduce(
          (sum: number, stock: any) => sum + (stock.quantity || 0),
          0
        ) || 0;

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          category_id: item.category_id,
          category_name: item.warehouse_categories?.name || null,
          photo_url: item.photo_url,
          unit: item.unit,
          min_stock: item.min_stock,
          is_active: item.is_active,
          created_by: item.created_by,
          created_at: item.created_at,
          updated_at: item.updated_at,
          total_quantity: totalQuantity,
        };
      }) as WarehouseItemWithStock[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const createItem = useMutation({
    mutationFn: async (item: Partial<WarehouseItem>) => {
      const { data, error } = await supabase
        .from('warehouse_items' as any)
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
      toast.success('Товар создан');
    },
    onError: (error: any) => {
      console.error('Error creating item:', error);
      if (error.message?.includes('duplicate key')) {
        toast.error('Артикул (SKU) уже существует');
      } else {
        toast.error('Ошибка при создании товара');
      }
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseItem> }) => {
      const { data, error } = await supabase
        .from('warehouse_items' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
      toast.success('Товар обновлён');
    },
    onError: (error: any) => {
      console.error('Error updating item:', error);
      if (error.message?.includes('duplicate key')) {
        toast.error('Артикул (SKU) уже существует');
      } else {
        toast.error('Ошибка при обновлении товара');
      }
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouse_items' as any)
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
      toast.success('Товар удалён');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Ошибка при удалении товара');
    },
  });

  // Upload photo to storage
  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `items/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('warehouse-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('warehouse-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    uploadPhoto,
  };
};
