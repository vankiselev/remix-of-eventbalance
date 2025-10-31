import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';

export interface UpcomingEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  event_time?: string;
  end_time?: string;
  location?: string;
  place?: string;
  status: string;
}

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekLater = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('events')
        .select('id, name, description, start_date, event_time, end_time, location, place, status')
        .gte('start_date', today)
        .lte('start_date', weekLater)
        .eq('is_archived', false)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (error) throw error;
      return (data || []) as UpcomingEvent[];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
