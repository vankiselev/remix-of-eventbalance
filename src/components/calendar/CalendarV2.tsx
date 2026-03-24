import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, CalendarDays } from "lucide-react";
import CalendarWeekView from "./CalendarWeekView";
import CalendarMonthView, { getOwnerColor } from "./CalendarMonthView";
import CalendarYearView from "./CalendarYearView";
import EventDetailDialog from "./EventDetailDialog";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

type ViewMode = "week" | "month" | "year";

interface Event {
  id: string;
  name: string;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  project_owner: string | null;
  venue_id: string | null;
  client_id: string | null;
  responsible_manager_ids: string[] | null;
  manager_ids: string[] | null;
  animator_ids: string[] | null;
  contractor_ids: string[] | null;
  photographer_contact_id: string | null;
  videographer_contact_id: string | null;
  show_program: string | null;
  notes: string | null;
  location: string | null;
  estimate_file_url: string | null;
  status: string | null;
}

const CalendarV2 = () => {
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, [selectedMonth, selectedYear, viewMode]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (viewMode === "year") {
        startDate = new Date(selectedYear, 0, 1).toISOString().split('T')[0];
        endDate = new Date(selectedYear, 11, 31).toISOString().split('T')[0];
      } else {
        startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
        endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("start_date", startDate)
        .lte("start_date", endDate)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить мероприятия",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setSelectedYear(direction === 'prev' ? selectedYear - 1 : selectedYear + 1);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowCreateDialog(true);
  };

  const handleEventSaved = () => {
    fetchEvents();
    setShowEventDialog(false);
    setShowCreateDialog(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Events for the selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayEvents = events.filter(e => e.start_date === selectedDateStr);

  return (
    <div className="w-full overflow-x-hidden">
      {/* Header — mobile-optimized */}
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-5">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="text-xs font-medium h-8 px-2 sm:px-3 touch-manipulation flex-shrink-0"
          >
            <span className="hidden sm:inline">Сегодня</span>
            <span className="sm:hidden">Сег.</span>
          </Button>

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => viewMode === "year" ? navigateYear('prev') : navigateMonth('prev')}
              className="h-8 w-8 p-0 touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {viewMode !== "year" && (
              <div className="flex items-center gap-0 sm:gap-1">
                {/* Mobile: plain text month+year */}
                <span className="sm:hidden text-sm font-semibold whitespace-nowrap">
                  {MONTHS[selectedMonth].substring(0, 3)} {selectedYear}
                </span>
                {/* Desktop: selects */}
                <div className="hidden sm:flex items-center gap-1">
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger className="w-28 text-xs border-0 shadow-none font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-20 text-xs border-0 shadow-none font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 2 + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {viewMode === "year" && (
              <span className="text-sm font-semibold px-2">{selectedYear}</span>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => viewMode === "year" ? navigateYear('next') : navigateMonth('next')}
              className="h-8 w-8 p-0 touch-manipulation"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {(["week", "month", "year"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-all touch-manipulation ${
                  viewMode === mode 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === "week" ? "Нед" : mode === "month" ? "Мес" : "Год"}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={handleCreateEvent} className="gap-1 h-8 px-2 sm:px-3 touch-manipulation">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      {/* Main content: split layout for month view */}
      {viewMode === "month" ? (
        <>
          {/* Desktop: split layout */}
          <div className="hidden sm:flex gap-0 border rounded-xl overflow-hidden bg-background shadow-sm">
            {/* Left panel - selected day events */}
            <div className="w-[320px] min-w-[320px] border-r bg-muted/20 flex flex-col">
              <div className="p-4 border-b bg-background/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      {format(selectedDate, 'd MMMM', { locale: ru })}
                    </h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(selectedDate, 'EEEE', { locale: ru })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    <CalendarDays className="h-3 w-3" />
                    {selectedDayEvents.length}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Нет мероприятий</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Выберите день в календаре</p>
                  </div>
                ) : (
                  selectedDayEvents.map((event) => {
                    const colors = getOwnerColor(event.project_owner);
                    return (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border-l-[3px] cursor-pointer transition-all hover:shadow-md hover:translate-x-0.5 ${colors.border} ${colors.bg}`}
                        onClick={() => handleEventClick(event)}
                      >
                        <h4 className={`font-semibold text-sm leading-tight mb-1.5 ${colors.text}`}>
                          {event.name}
                        </h4>
                        <div className="space-y-1">
                          {event.event_time && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span>{event.event_time.substring(0, 5)}{event.end_time ? ` — ${event.end_time.substring(0, 5)}` : ''}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          {event.project_owner && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3 flex-shrink-0" />
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

            {/* Right panel - calendar grid */}
            <div className="flex-1 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <CalendarMonthView
                  month={selectedMonth}
                  year={selectedYear}
                  events={events}
                  onEventClick={handleEventClick}
                  onDateSelect={handleDateSelect}
                  selectedDate={selectedDate}
                />
              )}
            </div>
          </div>

          {/* Mobile: stacked layout — compact grid + day events below */}
          <div className="sm:hidden space-y-3">
            {/* Month grid */}
            <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <CalendarMonthView
                  month={selectedMonth}
                  year={selectedYear}
                  events={events}
                  onEventClick={handleEventClick}
                  onDateSelect={handleDateSelect}
                  selectedDate={selectedDate}
                  compact
                />
              )}
            </div>

            {/* Selected day events */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {format(selectedDate, 'd MMMM', { locale: ru })}
                  </h3>
                  <span className="text-xs text-muted-foreground capitalize">
                    {format(selectedDate, 'EEEE', { locale: ru })}
                  </span>
                </div>
                {selectedDayEvents.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                    {selectedDayEvents.length}
                  </span>
                )}
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Нет мероприятий</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((event) => {
                    const colors = getOwnerColor(event.project_owner);
                    return (
                      <div
                        key={event.id}
                        className={`p-2.5 rounded-lg border-l-[3px] cursor-pointer active:scale-[0.98] transition-transform touch-manipulation ${colors.border} ${colors.bg}`}
                        onClick={() => handleEventClick(event)}
                      >
                        <h4 className={`font-semibold text-sm leading-tight mb-1 ${colors.text}`}>
                          {event.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {event.event_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span>{event.event_time.substring(0, 5)}{event.end_time ? `–${event.end_time.substring(0, 5)}` : ''}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{event.location}</span>
                            </div>
                          )}
                          {event.project_owner && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span>{event.project_owner}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-background shadow-sm p-2 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              {viewMode === "week" && (
                <CalendarWeekView
                  date={selectedDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === "year" && (
                <CalendarYearView
                  year={selectedYear}
                  events={events}
                  onMonthClick={(month) => {
                    setSelectedMonth(month);
                    setViewMode("month");
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Event Detail Dialog */}
      {(showEventDialog || showCreateDialog) && (
        <EventDetailDialog
          event={selectedEvent}
          open={showEventDialog || showCreateDialog}
          onOpenChange={(open) => {
            setShowEventDialog(open);
            setShowCreateDialog(open);
            if (!open) setSelectedEvent(null);
          }}
          onSave={handleEventSaved}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
};

export default CalendarV2;
