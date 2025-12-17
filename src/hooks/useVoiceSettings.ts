import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface VoiceSettings {
  user_id: string;
  default_wallet: string;
  default_project_id: string | null;
  auto_create_draft: boolean;
  preferred_categories: string[];
  created_at: string;
  updated_at: string;
}

export function useVoiceSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['voice-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_voice_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as VoiceSettings | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const saveSettings = useMutation({
    mutationFn: async (newSettings: Partial<VoiceSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_voice_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-settings', user?.id] });
    },
  });

  return {
    settings,
    isLoading,
    saveSettings: saveSettings.mutate,
    isSaving: saveSettings.isPending,
  };
}
