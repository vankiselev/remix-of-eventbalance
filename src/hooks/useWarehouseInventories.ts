import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarehouseInventory {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface WarehouseInventoryItem {
  id: string;
  inventory_id: string;
  item_id: string;
  location_id: string | null;
  expected_quantity: number;
  actual_quantity: number | null;
  difference: number | null;
  scanned_at: string | null;
  scanned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemWithDetails extends WarehouseInventoryItem {
  item_name?: string;
  item_sku?: string;
  item_unit?: string;
  location_name?: string;
}

export const useWarehouseInventories = () => {
  const queryClient = useQueryClient();

  const { data: inventories = [], isLoading } = useQuery({
    queryKey: ['warehouse-inventories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_inventories' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as WarehouseInventory[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const createInventory = useMutation({
    mutationFn: async (inventory: Partial<WarehouseInventory>) => {
      const { data, error } = await supabase
        .from('warehouse_inventories' as any)
        .insert(inventory)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventories'] });
      toast.success('Инвентаризация создана');
    },
    onError: (error) => {
      console.error('Error creating inventory:', error);
      toast.error('Ошибка при создании инвентаризации');
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseInventory> }) => {
      const { data, error } = await supabase
        .from('warehouse_inventories' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventories'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory-items'] });
      toast.success('Инвентаризация обновлена');
    },
    onError: (error) => {
      console.error('Error updating inventory:', error);
      toast.error('Ошибка при обновлении инвентаризации');
    },
  });

  const deleteInventory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouse_inventories' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventories'] });
      toast.success('Инвентаризация удалена');
    },
    onError: (error) => {
      console.error('Error deleting inventory:', error);
      toast.error('Ошибка при удалении инвентаризации');
    },
  });

  return {
    inventories,
    isLoading,
    createInventory,
    updateInventory,
    deleteInventory,
  };
};

export const useInventoryItems = (inventoryId: string | null) => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['warehouse-inventory-items', inventoryId],
    queryFn: async () => {
      if (!inventoryId) return [];

      const { data, error } = await supabase
        .from('warehouse_inventory_items' as any)
        .select(`
          *,
          warehouse_items!item_id(name, sku, unit),
          warehouse_locations!location_id(name)
        `)
        .eq('inventory_id', inventoryId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        inventory_id: item.inventory_id,
        item_id: item.item_id,
        location_id: item.location_id,
        expected_quantity: item.expected_quantity,
        actual_quantity: item.actual_quantity,
        difference: item.difference,
        scanned_at: item.scanned_at,
        scanned_by: item.scanned_by,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        item_name: item.warehouse_items?.name,
        item_sku: item.warehouse_items?.sku,
        item_unit: item.warehouse_items?.unit,
        location_name: item.warehouse_locations?.name,
      })) as InventoryItemWithDetails[];
    },
    enabled: !!inventoryId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const updateInventoryItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseInventoryItem> }) => {
      const { data, error } = await supabase
        .from('warehouse_inventory_items' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory-items'] });
    },
    onError: (error) => {
      console.error('Error updating inventory item:', error);
      toast.error('Ошибка при обновлении позиции');
    },
  });

  const addInventoryItems = useMutation({
    mutationFn: async (items: Partial<WarehouseInventoryItem>[]) => {
      const { data, error } = await supabase
        .from('warehouse_inventory_items' as any)
        .insert(items)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory-items'] });
      toast.success('Позиции добавлены');
    },
    onError: (error) => {
      console.error('Error adding inventory items:', error);
      toast.error('Ошибка при добавлении позиций');
    },
  });

  return {
    items,
    isLoading,
    updateInventoryItem,
    addInventoryItems,
  };
};
