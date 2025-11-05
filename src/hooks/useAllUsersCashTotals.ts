import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRbacRoles } from "./useUserRbacRoles";

export const useAllUsersCashTotals = () => {
  const { isAdmin } = useUserRbacRoles();
  
  return useQuery({
    queryKey: ['all-users-cash-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_cash_totals');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin, // Only for admins
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
