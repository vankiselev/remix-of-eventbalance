import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import CalendarDayView from "./CalendarDayView";
import CalendarWeekView from "./CalendarWeekView";
import CalendarMonthView from "./CalendarMonthView";
import CalendarYearView from "./CalendarYearView";
import EventDetailDialog from "./EventDetailDialog";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

type ViewMode = "day" | "week" | "month" | "year";

interface Event {
  id: string;
  name: string;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  project_owner: string | null;
  venue_id: string | null;
  manager_ids: string[] | null;
  animator_ids: string[] | null;
  contractor_ids: string[] | null;
  photographer_contact_id: string | null;
  videographer_contact_id: string | null;
  show_program: string | null;
  notes: string | null;
  location: string | null;
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

  return (
    <div className="w-full overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Календарь</h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            {viewMode === "year" ? selectedYear : `${MONTHS[selectedMonth]} ${selectedYear}`}
          </p>
        </div>

        {/* Controls - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          {/* First Row: View Mode + Navigation */}
          <div className="flex items-center gap-2 flex-1">
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-[100px] sm:w-32 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">День</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="year">Год</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewMode === "year" ? navigateYear('prev') : navigateMonth('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewMode === "year" ? navigateYear('next') : navigateMonth('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              Сегодня
            </Button>
          </div>

          {/* Second Row: Month/Year + Add Button */}
          <div className="flex items-center gap-2">
            {viewMode !== "year" && (
              <>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="flex-1 sm:w-32 text-xs sm:text-sm">
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
                  <SelectTrigger className="w-20 text-xs sm:text-sm">
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
              </>
            )}

            <Button size="sm" onClick={handleCreateEvent} className="flex-shrink-0">
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Добавить</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Views */}
      <Card className="w-full">
        <CardContent className="p-2 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {viewMode === "day" && (
                <CalendarDayView
                  date={selectedDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === "week" && (
                <CalendarWeekView
                  date={selectedDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === "month" && (
                <CalendarMonthView
                  month={selectedMonth}
                  year={selectedYear}
                  events={events}
                  onEventClick={handleEventClick}
                  onDateSelect={setSelectedDate}
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
        </CardContent>
      </Card>

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
