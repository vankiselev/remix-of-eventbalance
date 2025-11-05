import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useVacations = (tab: 'active' | 'archive') => {
  return useQuery({
    queryKey: ['vacations', tab],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase.from('vacations').select('*');
      
      if (tab === 'active') {
        query = query.gte('end_date', today).order('start_date', { ascending: true });
      } else {
        query = query.lt('end_date', today).order('start_date', { ascending: false });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};
