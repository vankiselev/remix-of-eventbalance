import { format } from "date-fns";
import { ru } from "date-fns/locale";

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
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(event => event.start_date === dateStr);

  const getOwnerColor = (owner: string | null) => {
    if (!owner) return "bg-gray-500";
    if (owner.toLowerCase().includes("настя")) return "bg-pink-500";
    if (owner.toLowerCase().includes("лера")) return "bg-purple-500";
    if (owner.toLowerCase().includes("ваня")) return "bg-blue-500";
    return "bg-gray-500";
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {format(date, 'd MMMM yyyy', { locale: ru })}
        </h2>
        <p className="text-muted-foreground capitalize">
          {format(date, 'EEEE', { locale: ru })}
        </p>
      </div>

      <div className="space-y-3">
        {dayEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            На этот день нет запланированных мероприятий
          </div>
        ) : (
          dayEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onEventClick(event)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ${getOwnerColor(event.project_owner)}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{event.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    {event.event_time && (
                      <span>⏰ {event.event_time}{event.end_time && ` - ${event.end_time}`}</span>
                    )}
                    {event.location && (
                      <span className="truncate">📍 {event.location}</span>
                    )}
                    {event.project_owner && (
                      <span>👤 {event.project_owner}</span>
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
