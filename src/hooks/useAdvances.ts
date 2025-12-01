import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRbacRoles } from "./useUserRbacRoles";

interface AdvanceEmployee {
  id: string;
  full_name: string;
  advance_balance: number;
}

interface AdvancesData {
  employees: AdvanceEmployee[];
  total: number;
}

// Hook for admin to get all employees with advances
export const useAllAdvances = () => {
  const { isAdmin } = useUserRbacRoles();
  
  return useQuery({
    queryKey: ['all-advances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, advance_balance')
        .gt('advance_balance', 0)
        .eq('employment_status', 'active')
        .order('advance_balance', { ascending: false });
      
      if (error) throw error;
      
      const total = data?.reduce((sum, p) => sum + (p.advance_balance || 0), 0) || 0;
      return { employees: data || [], total } as AdvancesData;
    },
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

// Hook for employee to get their own advance
export const useMyAdvance = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRbacRoles();
  
  return useQuery({
    queryKey: ['my-advance', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('advance_balance')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      return data?.advance_balance || 0;
    },
    enabled: !!user?.id && !isAdmin, // Only for non-admin users
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
