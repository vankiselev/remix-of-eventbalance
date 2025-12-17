import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetConfig, DEFAULT_LAYOUT } from '@/types/dashboard';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export function useDashboardLayout() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load layout from Supabase
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadLayout = async () => {
      try {
        const { data, error } = await supabase
          .from('user_dashboard_layouts')
          .select('layout')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
          // Validate and cast layout
          const validLayout = (data.layout as unknown as WidgetConfig[]).filter(
            (item): item is WidgetConfig => 
              typeof item === 'object' && 
              item !== null &&
              'id' in item && 
              'type' in item
          );
          if (validLayout.length > 0) {
            setLayout(validLayout);
          } else {
            setLayout(DEFAULT_LAYOUT);
          }
        } else {
          setLayout(DEFAULT_LAYOUT);
        }
      } catch (error) {
        console.error('Error loading dashboard layout:', error);
        setLayout(DEFAULT_LAYOUT);
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, [user?.id]);

  // Save layout to Supabase
  const saveLayout = useCallback(async (newLayout: WidgetConfig[]) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Check if layout exists
      const { data: existing } = await supabase
        .from('user_dashboard_layouts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_dashboard_layouts')
          .update({
            layout: newLayout as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_dashboard_layouts')
          .insert({
            user_id: user.id,
            layout: newLayout as unknown as Json,
          });

        if (error) throw error;
      }

      setLayout(newLayout);
      toast.success('Настройки дашборда сохранены');
    } catch (error) {
      console.error('Error saving dashboard layout:', error);
      toast.error('Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  // Reset to default layout
  const resetLayout = useCallback(async () => {
    await saveLayout(DEFAULT_LAYOUT);
  }, [saveLayout]);

  // Add a widget
  const addWidget = useCallback((type: WidgetConfig['type']) => {
    const newWidget: WidgetConfig = {
      id: crypto.randomUUID(),
      type,
      x: 0,
      y: Infinity, // Will be placed at the bottom
      w: 2,
      h: 2,
    };
    return [...layout, newWidget];
  }, [layout]);

  // Remove a widget
  const removeWidget = useCallback((id: string) => {
    return layout.filter(w => w.id !== id);
  }, [layout]);

  return {
    layout,
    setLayout,
    saveLayout,
    resetLayout,
    addWidget,
    removeWidget,
    isLoading,
    isSaving,
  };
}
