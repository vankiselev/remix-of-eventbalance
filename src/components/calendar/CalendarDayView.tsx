import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getOwnerColor } from "./CalendarMonthView";
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

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold">
          {format(date, 'd MMMM yyyy', { locale: ru })}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground capitalize">
          {format(date, 'EEEE', { locale: ru })}
        </p>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {dayEvents.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-sm sm:text-base text-muted-foreground">
            На этот день нет запланированных мероприятий
          </div>
        ) : (
          dayEvents.map((event) => (
            <div
              key={event.id}
              className="p-3 sm:p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onEventClick(event)}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mt-1 flex-shrink-0 ${getOwnerColor(event.project_owner)}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg truncate">{event.name}</h3>
                  <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                    {event.event_time && (
                      <span className="flex items-center gap-1">
                        <span>⏰</span>
                        <span>{event.event_time}{event.end_time && ` - ${event.end_time}`}</span>
                      </span>
                    )}
                    {event.location && (
                      <span className="truncate flex items-center gap-1">
                        <span>📍</span>
                        <span>{event.location}</span>
                      </span>
                    )}
                    {event.project_owner && (
                      <span className="flex items-center gap-1">
                        <span>👤</span>
                        <span>{event.project_owner}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarDayView;
