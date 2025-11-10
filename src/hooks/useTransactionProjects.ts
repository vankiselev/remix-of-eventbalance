import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransactionProject {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useTransactionProjects = () => {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['transaction-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_projects')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as TransactionProject[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: allProjects = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['transaction-projects-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_projects')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as TransactionProject[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createProject = useMutation({
    mutationFn: async (project: { name: string; display_order: number }) => {
      const { error } = await supabase
        .from('transaction_projects')
        .insert({
          name: project.name,
          display_order: project.display_order,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-projects'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-projects-all'] });
      toast.success('Проект создан');
    },
    onError: (error: any) => {
      console.error('Error creating project:', error);
      toast.error(`Ошибка при создании проекта: ${error.message || 'неизвестная ошибка'}`);
    },
  });

  const updateProject = useMutation({
    mutationFn: async (project: Partial<TransactionProject> & { id: string }) => {
      const { error } = await supabase
        .from('transaction_projects')
        .update({
          name: project.name,
          display_order: project.display_order,
          is_active: project.is_active,
        })
        .eq('id', project.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-projects'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-projects-all'] });
      toast.success('Проект обновлен');
    },
    onError: (error: any) => {
      console.error('Error updating project:', error);
      toast.error(`Ошибка при обновлении проекта: ${error.message || 'неизвестная ошибка'}`);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transaction_projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-projects'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-projects-all'] });
      toast.success('Проект удален');
    },
    onError: (error: any) => {
      console.error('Error deleting project:', error);
      toast.error(`Ошибка при удалении проекта: ${error.message || 'неизвестная ошибка'}`);
    },
  });

  return {
    projects,
    allProjects,
    isLoading,
    isLoadingAll,
    createProject,
    updateProject,
    deleteProject,
  };
};
