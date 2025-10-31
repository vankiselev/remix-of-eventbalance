import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyEvent {
  id: string;
  name: string;
  start_date: string;
  event_time?: string;
  location?: string;
  place?: string;
  status: string;
  role: 'manager' | 'responsible_manager';
}

export const useMyEvents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, event_time, location, place, status, manager_ids, responsible_manager_ids')
        .gte('start_date', today)
        .eq('is_archived', false)
        .order('start_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (error) throw error;

      // Filter events where user is manager or responsible manager
      const myEvents: MyEvent[] = [];
      data?.forEach(event => {
        const isManager = event.manager_ids?.includes(user.id);
        const isResponsibleManager = event.responsible_manager_ids?.includes(user.id);
        
        if (isManager || isResponsibleManager) {
          myEvents.push({
            id: event.id,
            name: event.name,
            start_date: event.start_date,
            event_time: event.event_time,
            location: event.location,
            place: event.place,
            status: event.status,
            role: isResponsibleManager ? 'responsible_manager' : 'manager'
          });
        }
      });

      return myEvents;
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
