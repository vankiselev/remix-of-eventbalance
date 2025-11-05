import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAnimators = () => {
  return useQuery({
    queryKey: ['animators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animators')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });
};
