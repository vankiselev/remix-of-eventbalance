import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Event {
  id: string;
  name: string;
  start_date: string;
  project_owner: string | null;
  event_time: string | null;
}

interface CalendarMonthViewProps {
  month: number;
  year: number;
  events: Event[];
  onEventClick: (event: Event) => void;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const getOwnerColor = (owner: string | null) => {
  if (!owner) return { bg: "bg-muted", dot: "bg-gray-400", border: "border-gray-300", text: "text-muted-foreground" };
  const o = owner.toLowerCase();
  if (o.includes("настя")) return { bg: "bg-violet-50 dark:bg-violet-950/30", dot: "bg-violet-500", border: "border-violet-400", text: "text-violet-700 dark:text-violet-300" };
  if (o.includes("лера")) return { bg: "bg-orange-50 dark:bg-orange-950/30", dot: "bg-orange-500", border: "border-orange-400", text: "text-orange-700 dark:text-orange-300" };
  if (o.includes("ваня") || o.includes("иван")) return { bg: "bg-yellow-50 dark:bg-yellow-950/30", dot: "bg-yellow-500", border: "border-yellow-400", text: "text-yellow-700 dark:text-yellow-300" };
  return { bg: "bg-muted", dot: "bg-gray-400", border: "border-gray-300", text: "text-muted-foreground" };
};

const CalendarMonthView = ({ month, year, events, onEventClick, onDateSelect, selectedDate }: CalendarMonthViewProps) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  let startingDayOfWeek = firstDay.getDay();
  if (startingDayOfWeek === 0) startingDayOfWeek = 7;
  
  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.start_date === dateStr);
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
  };

  const renderCalendarDays = () => {
    const days = [];
    
    for (let i = 1; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[72px] md:min-h-[88px] p-1.5 border-b border-r border-border/50" />
      );
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const selected = isSelected(day);
      const today = isToday(day);
      const hasEvents = dayEvents.length > 0;
      
      days.push(
        <div
          key={day}
          className={`min-h-[72px] md:min-h-[88px] p-1.5 border-b border-r border-border/50 cursor-pointer transition-all duration-150 group
            ${selected ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset' : 'hover:bg-accent/30'}
          `}
          onClick={() => onDateSelect(new Date(year, month, day))}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs md:text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors
              ${today ? 'bg-primary text-primary-foreground' : ''}
              ${selected && !today ? 'text-primary font-bold' : ''}
            `}>
              {day}
            </span>
            {hasEvents && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {dayEvents.length}
              </span>
            )}
          </div>
          <div className="space-y-0.5 overflow-hidden max-h-[48px] md:max-h-[56px]">
            {dayEvents.slice(0, 3).map((event) => {
              const colors = getOwnerColor(event.project_owner);
              return (
                <div
                  key={event.id}
                  className={`text-[9px] md:text-[11px] leading-tight px-1.5 py-0.5 rounded-sm truncate cursor-pointer transition-opacity hover:opacity-80 border-l-2 ${colors.bg} ${colors.border} ${colors.text}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  title={event.name}
                >
                  {event.name}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-[9px] text-muted-foreground pl-1.5">
                ещё {dayEvents.length - 3}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((day, i) => (
          <div key={day} className={`text-center text-xs font-semibold py-2.5 uppercase tracking-wider text-muted-foreground
            ${i < 5 ? '' : 'text-muted-foreground/60'}
          `}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-border/50">
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          <span className="text-xs text-muted-foreground">Настя</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-xs text-muted-foreground">Лера</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="text-xs text-muted-foreground">Ваня</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarMonthView;
