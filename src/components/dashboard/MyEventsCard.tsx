import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useMyEvents } from "@/hooks/useMyEvents";

const MyEventsCard = () => {
  const { data: events = [], isLoading: loading } = useMyEvents();
  const navigate = useNavigate();

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
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="flex items-center gap-2 justify-center text-sm sm:text-base">
          <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Где я работаю?
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-3 sm:px-6">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[120px] sm:min-h-[180px]">
            <Briefcase className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
            <p className="text-sm">У вас нет назначенных мероприятий</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {events.slice(0, 4).map((event) => (
              <div 
                key={event.id} 
                className="border rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 cursor-pointer hover:bg-accent/50 active:bg-accent/70 transition-colors touch-manipulation"
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
                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                    <Badge variant={getStatusVariant(event.status)} className="text-[10px] sm:text-xs whitespace-nowrap">
                      {getStatusText(event.status)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs whitespace-nowrap">
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
