import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface UpcomingEvent {
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

const TodayEventsCard = () => {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekLater = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('events')
        .select('id, name, description, start_date, event_time, end_time, location, place, status')
        .gte('start_date', today)
        .lte('start_date', weekLater)
        .eq('is_archived', false)
        .order('start_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
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
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
            Мероприятия на неделю
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
          <CalendarDays className="w-5 h-5 text-primary" />
          Мероприятия на неделю
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[180px]">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>На ближайшую неделю нет запланированных мероприятий</p>
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
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(event.status)} className="text-xs flex-shrink-0">
                    {getStatusText(event.status)}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{formatTimeRange(event.event_time, event.end_time)}</span>
                  </div>
                  
                  {(event.location || event.place) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{event.location || event.place}</span>
                    </div>
                  )}
                </div>
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

export default TodayEventsCard;