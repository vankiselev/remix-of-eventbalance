import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRbacRoles } from "./useUserRbacRoles";
import { useAuth } from "@/contexts/AuthContext";

export const useProfiles = () => {
  const { isAdmin } = useUserRbacRoles();
  
  return useQuery({
    queryKey: ['profiles', isAdmin ? 'admin' : 'basic'],
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase.rpc('get_admin_profiles');
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase.rpc('get_all_basic_profiles');
        if (error) throw error;
        return data || [];
      }
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useEmployeesData = () => {
  const { isAdmin } = useUserRbacRoles();
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['employees-data', isAdmin, user?.id || 'anon'],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select(`
          id, user_id, position, hire_date, created_at, updated_at, salary
        `)
        .order('hire_date', { ascending: false });
      
      if (!isAdmin && user?.id) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};
