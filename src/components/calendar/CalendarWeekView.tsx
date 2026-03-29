import { useMemo } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { getOwnerColor } from "./CalendarMonthView";

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

  // Pre-index events by date for O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const list = map.get(event.start_date) || [];
      list.push(event);
      map.set(event.start_date, list);
    });
    return map;
  }, [events]);

  const getEventsForDate = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  };

  return (
    <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
      <div className="min-w-[320px] sm:min-w-[700px] px-2 sm:px-0">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg p-1.5 sm:p-3 min-h-[120px] sm:min-h-[200px] ${
                  isToday ? 'bg-accent border-primary' : 'bg-background'
                }`}
              >
                <div className="text-center mb-2 sm:mb-3">
                  <div className={`text-[9px] sm:text-xs uppercase font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE', { locale: ru })}
                  </div>
                  <div className={`text-lg sm:text-2xl font-bold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  {dayEvents.slice(0, 4).map((event) => (
                    <div
                      key={event.id}
                      className="text-[8px] sm:text-xs p-1 sm:p-2 rounded cursor-pointer hover:opacity-80 transition-opacity bg-primary/10 text-primary border-l-2 border-primary"
                      onClick={() => onEventClick(event)}
                    >
                      <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getOwnerColor(event.project_owner).dot }} />
                        <span className="font-medium truncate text-[8px] sm:text-xs">{event.name}</span>
                      </div>
                      {event.event_time && (
                        <div className="text-muted-foreground text-[7px] sm:text-[10px] truncate hidden sm:block">{event.event_time}</div>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground text-center">
                      +{dayEvents.length - 4}
                    </div>
                  )}
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
