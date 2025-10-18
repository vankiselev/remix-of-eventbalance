import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

interface Event {
  id: string;
  name: string;
  start_date: string;
  event_time: string | null;
  project_owner: string | null;
}

interface CalendarWeekViewProps {
  date: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

const CalendarWeekView = ({ date, events, onEventClick }: CalendarWeekViewProps) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDate = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => event.start_date === dateStr);
  };

  const getOwnerColor = (owner: string | null) => {
    if (!owner) return "bg-gray-500";
    if (owner.toLowerCase().includes("настя")) return "bg-pink-500";
    if (owner.toLowerCase().includes("лера")) return "bg-purple-500";
    if (owner.toLowerCase().includes("ваня")) return "bg-blue-500";
    return "bg-gray-500";
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg p-3 min-h-[200px] ${
                  isToday ? 'bg-accent border-primary' : 'bg-background'
                }`}
              >
                <div className="text-center mb-3">
                  <div className={`text-xs uppercase font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE', { locale: ru })}
                  </div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>

                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity bg-primary/10 text-primary border-l-2 border-primary"
                      onClick={() => onEventClick(event)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getOwnerColor(event.project_owner)}`} />
                        <span className="font-medium truncate">{event.name}</span>
                      </div>
                      {event.event_time && (
                        <div className="text-muted-foreground">{event.event_time}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarWeekView;
