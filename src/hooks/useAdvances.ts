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

export interface AdvanceInfo {
  amount: number;
  issuedByName: string | null;
  issuedAt: string | null;
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
        .order('advance_balance', { ascending: false });
      
      if (error) throw error;
      
      const total = data?.reduce((sum, p) => sum + (p.advance_balance || 0), 0) || 0;
      return { employees: data || [], total } as AdvancesData;
    },
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook to get advance info for a specific user (self or target)
export const useMyAdvance = (targetUserId?: string) => {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;
  
  return useQuery<AdvanceInfo>({
    queryKey: ['my-advance', userId],
    queryFn: async () => {
      if (!userId) return { amount: 0, issuedByName: null, issuedAt: null };
      
      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('advance_balance, advance_issued_by, advance_issued_at')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      const amount = data?.advance_balance || 0;
      const issuedBy = data?.advance_issued_by;
      const issuedAt = data?.advance_issued_at || null;
      
      let issuedByName: string | null = null;
      if (issuedBy) {
        const { data: issuerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', issuedBy)
          .single();
        issuedByName = issuerProfile?.full_name || null;
      }
      
      return { amount, issuedByName, issuedAt };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
