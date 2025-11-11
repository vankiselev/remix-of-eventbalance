import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarehouseMovement {
  id: string;
  type: 'receipt' | 'issue' | 'return' | 'writeoff' | 'transfer' | 'inventory';
  item_id: string;
  quantity: number;
  from_location_id: string | null;
  to_location_id: string | null;
  event_id: string | null;
  task_id: string | null;
  responsible_user_id: string | null;
  movement_date: string;
  reason: string | null;
  notes: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface WarehouseMovementWithDetails extends WarehouseMovement {
  item_name?: string;
  item_sku?: string;
  from_location_name?: string;
  to_location_name?: string;
  responsible_user_name?: string;
  created_by_name?: string;
}

export const useWarehouseMovements = () => {
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['warehouse-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_movements' as any)
        .select(`
          *,
          warehouse_items!item_id(name, sku),
          from_location:warehouse_locations!from_location_id(name),
          to_location:warehouse_locations!to_location_id(name),
          responsible_user:profiles!responsible_user_id(full_name),
          created_by_user:profiles!created_by(full_name)
        `)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      return (data || []).map((m: any) => ({
        ...m,
        item_name: m.warehouse_items?.name,
        item_sku: m.warehouse_items?.sku,
        from_location_name: m.from_location?.name,
        to_location_name: m.to_location?.name,
        responsible_user_name: m.responsible_user?.full_name,
        created_by_name: m.created_by_user?.full_name,
      })) as WarehouseMovementWithDetails[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Create movement and update stock
  const createMovement = useMutation({
    mutationFn: async (movement: Partial<WarehouseMovement>) => {
      // Create movement record
      const { data: movementData, error: movementError } = await supabase
        .from('warehouse_movements' as any)
        .insert(movement)
        .select()
        .single();
      
      if (movementError) throw movementError;

      // Update stock based on movement type
      await updateStock(movement);

      return movementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-movements'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
      toast.success('Движение создано, остатки обновлены');
    },
    onError: (error: any) => {
      console.error('Error creating movement:', error);
      toast.error(error.message || 'Ошибка при создании движения');
    },
  });

  // Update stock based on movement type
  const updateStock = async (movement: Partial<WarehouseMovement>) => {
    const { type, item_id, quantity, from_location_id, to_location_id } = movement;

    if (!item_id || !quantity) {
      throw new Error('Item ID and quantity are required');
    }

    switch (type) {
      case 'receipt': {
        // Приход: увеличиваем остаток в to_location
        if (!to_location_id) throw new Error('To location is required for receipt');
        await updateLocationStock(item_id, to_location_id, quantity, 'add');
        break;
      }

      case 'issue': {
        // Выдача: уменьшаем остаток в from_location
        if (!from_location_id) throw new Error('From location is required for issue');
        await updateLocationStock(item_id, from_location_id, quantity, 'subtract');
        break;
      }

      case 'return': {
        // Возврат: увеличиваем остаток в to_location
        if (!to_location_id) throw new Error('To location is required for return');
        await updateLocationStock(item_id, to_location_id, quantity, 'add');
        break;
      }

      case 'writeoff': {
        // Списание: уменьшаем остаток в from_location
        if (!from_location_id) throw new Error('From location is required for writeoff');
        await updateLocationStock(item_id, from_location_id, quantity, 'subtract');
        break;
      }

      case 'transfer': {
        // Перемещение: уменьшаем в from_location и увеличиваем в to_location
        if (!from_location_id || !to_location_id) {
          throw new Error('Both locations are required for transfer');
        }
        await updateLocationStock(item_id, from_location_id, quantity, 'subtract');
        await updateLocationStock(item_id, to_location_id, quantity, 'add');
        break;
      }

      case 'inventory': {
        // Инвентаризация: устанавливаем точное количество
        if (!to_location_id) throw new Error('Location is required for inventory');
        await setLocationStock(item_id, to_location_id, quantity);
        break;
      }
    }
  };

  // Helper: Update stock for a location
  const updateLocationStock = async (
    itemId: string,
    locationId: string,
    quantity: number,
    operation: 'add' | 'subtract'
  ) => {
    // Get current stock
    const { data: currentStock, error: fetchError } = await supabase
      .from('warehouse_stock' as any)
      .select('quantity')
      .eq('item_id', itemId)
      .eq('location_id', locationId)
      .eq('condition', 'good')
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentQty = (currentStock as any)?.quantity || 0;
    const newQty = operation === 'add' ? currentQty + quantity : currentQty - quantity;

    // Validate we're not going negative
    if (newQty < 0) {
      throw new Error(`Недостаточно товара на складе. Доступно: ${currentQty}`);
    }

    if (currentStock) {
      // Update existing stock
      const { error: updateError } = await supabase
        .from('warehouse_stock' as any)
        .update({ quantity: newQty })
        .eq('item_id', itemId)
        .eq('location_id', locationId)
        .eq('condition', 'good');

      if (updateError) throw updateError;
    } else {
      // Create new stock record
      const { error: insertError } = await supabase
        .from('warehouse_stock' as any)
        .insert({
          item_id: itemId,
          location_id: locationId,
          quantity: newQty,
          condition: 'good',
        });

      if (insertError) throw insertError;
    }
  };

  // Helper: Set exact stock for inventory
  const setLocationStock = async (
    itemId: string,
    locationId: string,
    quantity: number
  ) => {
    const { data: existingStock } = await supabase
      .from('warehouse_stock' as any)
      .select('id')
      .eq('item_id', itemId)
      .eq('location_id', locationId)
      .eq('condition', 'good')
      .maybeSingle();

    if (existingStock && (existingStock as any)?.id) {
      // Update existing
      const { error } = await supabase
        .from('warehouse_stock' as any)
        .update({ 
          quantity,
          last_inventory_date: new Date().toISOString(),
        })
        .eq('id', (existingStock as any).id);

      if (error) throw error;
    } else {
      // Create new
      const { error } = await supabase
        .from('warehouse_stock' as any)
        .insert({
          item_id: itemId,
          location_id: locationId,
          quantity,
          condition: 'good',
          last_inventory_date: new Date().toISOString(),
        });

      if (error) throw error;
    }
  };

  // Upload photo to storage
  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `movements/${fileName}`;

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
    movements,
    isLoading,
    createMovement,
    uploadPhoto,
  };
};
