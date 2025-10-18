import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  name: string;
  start_date: string;
  project_owner: string | null;
}

interface CalendarMonthViewProps {
  month: number;
  year: number;
  events: Event[];
  onEventClick: (event: Event) => void;
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const CalendarMonthView = ({ month, year, events, onEventClick, onDateSelect }: CalendarMonthViewProps) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Get the day of week (0 = Sunday, 1 = Monday, etc.)
  let startingDayOfWeek = firstDay.getDay();
  // Convert Sunday (0) to 7 for our purposes (Monday = 1)
  if (startingDayOfWeek === 0) startingDayOfWeek = 7;
  
  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.start_date === dateStr);
  };

  const getOwnerColor = (owner: string | null) => {
    if (!owner) return "bg-gray-500";
    if (owner.toLowerCase().includes("настя")) return "bg-pink-500";
    if (owner.toLowerCase().includes("лера")) return "bg-purple-500";
    if (owner.toLowerCase().includes("ваня")) return "bg-blue-500";
    return "bg-gray-500";
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells before the first day
    for (let i = 1; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-24 p-2 border border-border bg-muted/20" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isToday = new Date().getDate() === day && 
                      new Date().getMonth() === month && 
                      new Date().getFullYear() === year;
      
      days.push(
        <div
          key={day}
          className={`min-h-24 p-2 border border-border hover:bg-accent/50 cursor-pointer transition-colors ${
            isToday ? 'bg-accent' : 'bg-background'
          }`}
          onClick={() => onDateSelect(new Date(year, month, day))}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
            {day}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-20">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate bg-primary/10 text-primary border-l-2 border-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                title={event.name}
              >
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getOwnerColor(event.project_owner)}`} />
                  <span className="truncate">{event.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2 bg-muted">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0">
          {renderCalendarDays()}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-sm">Настя</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm">Лера</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm">Ваня</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarMonthView;
