import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useOwnerColors } from "@/hooks/useOwnerColors";
import { Clock, MapPin, User } from "lucide-react";

interface Event {
  id: string;
  name: string;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  project_owner: string | null;
  location: string | null;
}

interface CalendarDayViewProps {
  date: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

const CalendarDayView = ({ date, events, onEventClick }: CalendarDayViewProps) => {
  const { getOwnerColor } = useOwnerColors();
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(event => event.start_date === dateStr);

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          {format(date, 'd MMMM yyyy', { locale: ru })}
        </h2>
        <p className="text-sm text-muted-foreground capitalize">
          {format(date, 'EEEE', { locale: ru })}
        </p>
      </div>

      <div className="space-y-2">
        {dayEvents.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            На этот день нет запланированных мероприятий
          </div>
        ) : (
          dayEvents.map((event) => {
            const ownerColor = getOwnerColor(event.project_owner);
            return (
              <div
                key={event.id}
                className="p-3 rounded-lg border-l-[3px] hover:shadow-md cursor-pointer transition-all"
                style={{ borderColor: ownerColor.border, backgroundColor: ownerColor.bg }}
                onClick={() => onEventClick(event)}
              >
                <h3 className="font-semibold text-sm mb-1.5" style={{ color: ownerColor.text }}>{event.name}</h3>
                <div className="space-y-1">
                  {event.event_time && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{event.event_time.substring(0, 5)}{event.end_time ? ` — ${event.end_time.substring(0, 5)}` : ''}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.project_owner && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{event.project_owner}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CalendarDayView;
