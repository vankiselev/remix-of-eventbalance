import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import { useQueryClient } from "@tanstack/react-query";

const TodayEventsCard = () => {
  const { data: events = [], isLoading: loading } = useUpcomingEvents();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleEventClick = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      
      setSelectedEvent(data);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
  };

  const handleDialogSave = () => {
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
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
            Ближайшие мероприятия
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
          Ближайшие мероприятия
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[180px]">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>На ближайшую неделю нет запланированных мероприятий</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-3 pb-1">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleEventClick(event.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight truncate">{event.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.start_date), 'd MMMM', { locale: ru })}
                    </p>
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
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleDialogSave}
      />
    </Card>
  );
};

export default TodayEventsCard;