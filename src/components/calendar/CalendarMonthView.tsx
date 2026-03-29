import { useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { resolveOwnerKey, DEFAULT_OWNER_COLORS, buildOwnerColorSet } from "@/constants/ownerColors";

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
  /** Mobile compact mode: dot indicators only, no event text */
  compact?: boolean;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/**
 * Returns inline-style-compatible owner color tokens.
 * Used by CalendarMonthView, CalendarWeekView, CalendarDayView, CalendarV2.
 * Falls back to gray for unknown owners.
 */
export const getOwnerColor = (owner: string | null) => {
  const key = resolveOwnerKey(owner);
  if (!key) return {
    dot: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.3)',
    text: '#6B7280',
  };
  const d = DEFAULT_OWNER_COLORS[key];
  const set = buildOwnerColorSet(key, d.hex, d.label);
  return { dot: set.dot, bg: set.bg, border: set.border, text: set.text };
};

const CalendarMonthView = ({ month, year, events, onEventClick, onDateSelect, selectedDate, compact = false }: CalendarMonthViewProps) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  let startingDayOfWeek = firstDay.getDay();
  if (startingDayOfWeek === 0) startingDayOfWeek = 7;
  
  // Pre-index events by date string for O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const list = map.get(event.start_date) || [];
      list.push(event);
      map.set(event.start_date, list);
    });
    return map;
  }, [events]);

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventsByDate.get(dateStr) || [];
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
  };

  // Compact mobile view
  if (compact) {
    const renderCompactDays = () => {
      const days = [];
      
      for (let i = 1; i < startingDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="aspect-square" />);
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dayEvents = getEventsForDate(day);
        const selected = isSelected(day);
        const today = isToday(day);
        const hasEvents = dayEvents.length > 0;
        
        // Collect unique owner dots (max 3)
        const uniqueDots = dayEvents
          .map(e => getOwnerColor(e.project_owner).dot)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 3);
        
        days.push(
          <div
            key={day}
            className={`aspect-square flex flex-col items-center justify-center cursor-pointer rounded-lg transition-colors touch-manipulation relative
              ${selected ? 'bg-primary/10 ring-2 ring-primary/40' : 'active:bg-accent/50'}
            `}
            onClick={() => onDateSelect(new Date(year, month, day))}
          >
            <span className={`text-[13px] font-medium leading-none
              ${today ? 'bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center' : ''}
              ${selected && !today ? 'text-primary font-bold' : ''}
            `}>
              {day}
            </span>
            {hasEvents && (
              <div className="flex items-center gap-[3px] mt-0.5 h-[6px]">
                {uniqueDots.map((dotColor, i) => (
                  <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: dotColor }} />
                ))}
              </div>
            )}
          </div>
        );
      }
      
      return days;
    };

    return (
      <div className="w-full px-2 py-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={`text-center text-[11px] font-medium py-1.5 text-muted-foreground
              ${i >= 5 ? 'text-muted-foreground/60' : ''}
            `}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Compact grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {renderCompactDays()}
        </div>

        {/* Compact legend */}
        <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-border/30">
          {OWNER_KEYS.map(k => {
            const c = getOwnerColor(DEFAULT_OWNER_COLORS[k].label);
            return (
              <div key={k} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
                <span className="text-[10px] text-muted-foreground">{DEFAULT_OWNER_COLORS[k].label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full desktop view
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
                  className="text-[9px] md:text-[11px] leading-tight px-1.5 py-0.5 rounded-sm truncate cursor-pointer transition-opacity hover:opacity-80 border-l-2"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
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
        {OWNER_KEYS.map(k => {
          const c = getOwnerColor(DEFAULT_OWNER_COLORS[k].label);
          return (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.dot }} />
              <span className="text-xs text-muted-foreground">{DEFAULT_OWNER_COLORS[k].label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarMonthView;
