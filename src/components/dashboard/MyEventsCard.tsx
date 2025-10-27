import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface MyEvent {
  id: string;
  name: string;
  start_date: string;
  event_time?: string;
  location?: string;
  place?: string;
  status: string;
  role: 'manager' | 'responsible_manager';
}

const MyEventsCard = () => {
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchMyEvents();
  }, [user]);

  const fetchMyEvents = async () => {
    if (!user) return;
    
    try {
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

      setEvents(myEvents);
    } catch (error) {
      console.error('Error fetching my events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/events?eventId=${eventId}`);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'planning': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Завершено';
      case 'in_progress': return 'В процессе';
      case 'planning': return 'Планируется';
      default: return 'Неизвестно';
    }
  };

  const getRoleBadgeText = (role: 'manager' | 'responsible_manager') => {
    return role === 'responsible_manager' ? 'Ответственный' : 'Менеджер';
  };

  const formatTime = (time?: string) => {
    if (!time) return null;
    return time.slice(0, 5);
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
            Где я работаю?
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground py-4">
            Загрузка...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
          Где я работаю?
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[180px]">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>У вас пока нет назначенных мероприятий</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 4).map((event) => (
              <div 
                key={event.id} 
                className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleEventClick(event.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight truncate">{event.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.start_date), 'd MMMM', { locale: ru })}
                      {event.event_time && ` • ${formatTime(event.event_time)}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Badge variant={getStatusVariant(event.status)} className="text-xs">
                      {getStatusText(event.status)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {getRoleBadgeText(event.role)}
                    </Badge>
                  </div>
                </div>
                
                {(event.location || event.place) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{event.location || event.place}</span>
                  </div>
                )}
              </div>
            ))}
            
            {events.length > 4 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                И еще {events.length - 4} мероприятий...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyEventsCard;
