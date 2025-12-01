import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ImportJob {
  id: string;
  user_id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  inserted_rows: number;
  failed_rows: number;
  skipped_rows: number;
  errors: Array<{ row: number; reason: string }>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useImportJobs = () => {
  const [activeJobs, setActiveJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchActiveJobs = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActiveJobs(data as unknown as ImportJob[]);
    }
    setIsLoading(false);
  };

  const fetchRecentJobs = async (limit = 10): Promise<ImportJob[]> => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data as unknown as ImportJob[];
    }
    return [];
  };

  const createJob = async (type: string = 'finances', totalRows: number): Promise<string | null> => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        user_id: user.id,
        type,
        status: 'pending',
        total_rows: totalRows,
        processed_rows: 0,
        inserted_rows: 0,
        failed_rows: 0,
        skipped_rows: 0,
        errors: []
      })
      .select('id')
      .single();

    if (!error && data) {
      fetchActiveJobs();
      return data.id;
    }
    return null;
  };

  const getJobStatus = async (jobId: string): Promise<ImportJob | null> => {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!error && data) {
      return data as unknown as ImportJob;
    }
    return null;
  };

  const deleteJob = async (jobId: string) => {
    await supabase
      .from('import_jobs')
      .delete()
      .eq('id', jobId);
    fetchActiveJobs();
  };

  // Подписка на изменения в реальном времени
  useEffect(() => {
    if (!user?.id) return;

    fetchActiveJobs();

    const channel = supabase
      .channel('import_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_jobs',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchActiveJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    activeJobs,
    isLoading,
    createJob,
    getJobStatus,
    deleteJob,
    fetchRecentJobs,
    refetch: fetchActiveJobs
  };
};