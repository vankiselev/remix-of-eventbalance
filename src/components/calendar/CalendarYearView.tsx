interface Event {
  id: string;
  start_date: string;
}

interface CalendarYearViewProps {
  year: number;
  events: Event[];
  onMonthClick: (month: number) => void;
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const CalendarYearView = ({ year, events, onMonthClick }: CalendarYearViewProps) => {
  // Pre-index events by date and month for O(1) lookups
  const { eventsByDate, eventsCountByMonth } = useMemo(() => {
    const byDate = new Map<string, number>();
    const byMonth = new Array(12).fill(0);
    events.forEach(event => {
      byDate.set(event.start_date, (byDate.get(event.start_date) || 0) + 1);
      const eventDate = new Date(event.start_date);
      if (eventDate.getFullYear() === year) {
        byMonth[eventDate.getMonth()]++;
      }
    });
    return { eventsByDate: byDate, eventsCountByMonth: byMonth };
  }, [events, year]);

  const getEventsCountForMonth = (month: number) => eventsCountByMonth[month];

  const getEventsForDate = (month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventsByDate.get(dateStr) || 0;
  };

  const renderMiniMonth = (month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startingDayOfWeek = firstDay.getDay();
    if (startingDayOfWeek === 0) startingDayOfWeek = 7;
    
    const days = [];
    
    // Empty cells before the first day
    for (let i = 1; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="text-center text-xs p-1" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const eventsCount = getEventsForDate(month, day);
      const isToday = new Date().getDate() === day && 
                      new Date().getMonth() === month && 
                      new Date().getFullYear() === year;
      
      days.push(
        <div
          key={day}
          className={`text-center text-[9px] sm:text-xs p-0.5 sm:p-1 rounded ${
            isToday ? 'bg-primary text-primary-foreground font-bold' : ''
          } ${eventsCount > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
        >
          {day}
          {eventsCount > 0 && (
            <div className="text-[6px] sm:text-[8px] leading-none">•</div>
          )}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
      <div className="min-w-[280px] sm:min-w-[600px] md:min-w-[800px] px-2 sm:px-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {MONTHS.map((monthName, month) => {
            const eventsCount = getEventsCountForMonth(month);
            
            return (
              <div
                key={month}
                className="border rounded-lg p-2 sm:p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onMonthClick(month)}
              >
                <div className="text-center mb-1 sm:mb-2">
                  <h3 className="font-semibold text-xs sm:text-sm truncate">{monthName}</h3>
                  {eventsCount > 0 && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {eventsCount} {eventsCount === 1 ? 'мероприятие' : 'мероприятий'}
                    </p>
                  )}
                </div>
                
                <div className="space-y-0.5 sm:space-y-1">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-0">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="text-center text-[8px] sm:text-[10px] font-medium text-muted-foreground">
                        {day[0]}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-0">
                    {renderMiniMonth(month)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarYearView;
