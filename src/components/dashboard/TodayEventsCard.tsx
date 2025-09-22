import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface TodayEvent {
  id: string;
  name: string;
  description?: string;
  event_time?: string;
  end_time?: string;
  location?: string;
  place?: string;
  status: string;
}

const TodayEventsCard = () => {
  const [events, setEvents] = useState<TodayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayEvents();
  }, []);

  const fetchTodayEvents = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('events')
        .select('id, name, description, event_time, end_time, location, place, status')
        .eq('start_date', today)
        .eq('is_archived', false)
        .order('event_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching today events:', error);
    } finally {
      setLoading(false);
    }
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

  const formatTime = (time?: string) => {
    if (!time) return null;
    return time.slice(0, 5); // Убираем секунды из HH:MM:SS
  };

  const formatTimeRange = (startTime?: string, endTime?: string) => {
    const start = formatTime(startTime);
    const end = formatTime(endTime);
    
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    return 'Время не указано';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Мероприятия сегодня
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Загрузка...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Мероприятия сегодня
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Сегодня нет запланированных мероприятий</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm leading-tight">{event.name}</h4>
                  <Badge variant={getStatusVariant(event.status)} className="text-xs">
                    {getStatusText(event.status)}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTimeRange(event.event_time, event.end_time)}
                  </div>
                  
                  {(event.location || event.place) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {event.location || event.place}
                    </div>
                  )}
                </div>

                {event.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            ))}
            
            {events.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                И еще {events.length - 3} мероприятий...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayEventsCard;