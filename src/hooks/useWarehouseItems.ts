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
  purchase_price: number;
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
      // Fetch items with aggregated stock
      const { data: itemsData, error: itemsError } = await supabase
        .from('warehouse_items' as any)
        .select(`
          *,
          warehouse_categories!category_id(name)
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (itemsError) throw itemsError;

      // Fetch stock for all items
      const { data: stockData, error: stockError } = await supabase
        .from('warehouse_stock' as any)
        .select('item_id, quantity');
      
      if (stockError) throw stockError;

      // Calculate total quantity for each item
      const stockMap = new Map<string, number>();
      (stockData || []).forEach((stock: any) => {
        const current = stockMap.get(stock.item_id) || 0;
        stockMap.set(stock.item_id, current + (stock.quantity || 0));
      });

      // Combine items with stock data
      const itemsWithStock = (itemsData || []).map((item: any) => ({
        ...item,
        total_quantity: stockMap.get(item.id) || 0,
        category_name: item.warehouse_categories?.name || null,
      }));

      return itemsWithStock as WarehouseItemWithStock[];
    },
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
