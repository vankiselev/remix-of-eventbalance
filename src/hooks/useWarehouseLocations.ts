import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarehouseLocation {
  id: string;
  name: string;
  type: 'warehouse' | 'vehicle' | 'office' | 'employee' | 'other';
  address: string | null;
  employee_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useWarehouseLocations = () => {
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['warehouse-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_locations' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as WarehouseLocation[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const createLocation = useMutation({
    mutationFn: async (location: Partial<WarehouseLocation>) => {
      const { data, error } = await supabase
        .from('warehouse_locations' as any)
        .insert(location)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-locations'] });
      toast.success('Локация создана');
    },
    onError: (error) => {
      console.error('Error creating location:', error);
      toast.error('Ошибка при создании локации');
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseLocation> }) => {
      const { data, error } = await supabase
        .from('warehouse_locations' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-locations'] });
      toast.success('Локация обновлена');
    },
    onError: (error) => {
      console.error('Error updating location:', error);
      toast.error('Ошибка при обновлении локации');
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouse_locations' as any)
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-locations'] });
      toast.success('Локация удалена');
    },
    onError: (error) => {
      console.error('Error deleting location:', error);
      toast.error('Ошибка при удалении локации');
    },
  });

  return {
    locations,
    isLoading,
    createLocation,
    updateLocation,
    deleteLocation,
  };
};
