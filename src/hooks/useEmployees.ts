import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useEmployees = (status: 'active' | 'all' = 'active') => {
  return useQuery({
    queryKey: ['employees', status],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url');
      
      if (status === 'active') {
        query = query.eq('employment_status', 'active');
      }
      
      query = query.order('full_name');
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - employees change rarely
    gcTime: 15 * 60 * 1000,
  });
};
