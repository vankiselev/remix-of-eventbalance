import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarehouseSettings {
  id: string;
  module_enabled: boolean;
  auto_create_return_tasks: boolean;
  return_task_delay_days: number;
  low_stock_notifications: boolean;
  low_stock_threshold_percent: number;
  require_photo_on_writeoff: boolean;
  require_photo_on_receipt: boolean;
  finance_integration_enabled: boolean;
  default_currency: string;
  default_unit: string;
  created_at?: string;
  updated_at?: string;
}

export const useWarehouseSettings = () => {
  const queryClient = useQueryClient();

  // Загрузка настроек
  const { data: settings, isLoading } = useQuery({
    queryKey: ['warehouse-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_settings' as any)
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Обновление настроек
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<WarehouseSettings>) => {
      const currentSettings = settings as unknown as WarehouseSettings | undefined;
      if (!currentSettings?.id) throw new Error('Настройки не найдены');
      
      const { data, error } = await supabase
        .from('warehouse_settings' as any)
        .update(updates)
        .eq('id', currentSettings.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-settings'] });
      toast.success('Настройки склада обновлены');
    },
    onError: (error) => {
      console.error('Error updating warehouse settings:', error);
      toast.error('Ошибка при обновлении настроек склада');
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
};
