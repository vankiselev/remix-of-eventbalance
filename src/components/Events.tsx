import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, ArrowUpDown, Grid3X3, List, Search, X, MapPin, Clock, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  status: string;
  location: string | null;
  project_owner: string | null;
  client_id: string | null;
  managers: string | null;
  animators: string | null;
  contractors: string | null;
  show_program: string | null;
  photo_video: string | null;
  notes: string | null;
  venue_id: string | null;
  contractor_ids: string[] | null;
  responsible_manager_ids: string[] | null;
  manager_ids: string[] | null;
  animator_ids: string[] | null;
  photographer_contact_id: string | null;
  videographer_contact_id: string | null;
  photos: string[] | null;
  videos: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  estimate_file_url: string | null;
}

const Events = () => {
  const { hasPermission } = useUserPermissions();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sortByName, setSortByName] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [animators, setAnimators] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
    loadRelatedData();
  }, []);

  const loadRelatedData = async () => {
    try {
      const [employeesRes, animatorsRes, venuesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("employment_status", "active").order("full_name"),
        supabase.from("animators").select("*").order("name"),
        supabase.from("venues").select("*").order("name"),
      ]);

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (animatorsRes.data) setAnimators(animatorsRes.data);
      if (venuesRes.data) setVenues(venuesRes.data);
    } catch (error) {
      console.error("Error loading related data:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });

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

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowDetailDialog(true);
  };

  const handleCreateNew = () => {
    setSelectedEvent(null);
    setShowDetailDialog(true);
  };

  const handleDialogClose = () => {
    setShowDetailDialog(false);
    setSelectedEvent(null);
  };

  const handleEventSave = () => {
    fetchEvents();
    handleDialogClose();
  };

  const getManagerNames = (event: Event) => {
    // Если есть manager_ids (новое поле), используем его
    if (event.manager_ids && event.manager_ids.length > 0) {
      const names = event.manager_ids
        .map(id => employees.find(emp => emp.id === id)?.full_name)
        .filter(Boolean)
        .join(", ");
      if (names) return names;
    }
    // Иначе используем старое текстовое поле managers (из импорта)
    if (event.managers) return event.managers;
    return "—";
  };

  const getAnimatorNames = (event: Event) => {
    // Если есть animator_ids (новое поле), используем его
    if (event.animator_ids && event.animator_ids.length > 0) {
      const names = event.animator_ids
        .map(id => animators.find(anim => anim.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      if (names) return names;
    }
    // Иначе используем старое текстовое поле animators (из импорта)
    if (event.animators) return event.animators;
    return "—";
  };

  const getVenueName = (venueId: string | null) => {
    if (!venueId) return null;
    return venues.find(v => v.id === venueId)?.name || null;
  };

  const getLocationDisplay = (event: Event) => {
    const venueName = getVenueName(event.venue_id);
    if (venueName) return venueName;
    if (event.location) return event.location;
    return "—";
  };

  const getTimeRange = (event: Event) => {
    if (!event.event_time && !event.end_time) return "—";
    if (event.event_time && event.end_time) {
      return `${event.event_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`;
    }
    if (event.event_time) return `с ${event.event_time.slice(0, 5)}`;
    return "—";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  // Получение уникальных годов из событий
  const getAvailableYears = (): number[] => {
    const years = events.map(event => new Date(event.start_date).getFullYear());
    const uniqueYears = [...new Set(years)];
    const currentYear = new Date().getFullYear();
    if (!uniqueYears.includes(currentYear)) {
      uniqueYears.push(currentYear);
    }
    return uniqueYears.sort((a, b) => b - a);
  };

  // Фильтрация событий по дате (месяц и год)
  const filterEventsByDate = (eventsList: Event[]) => {
    let filtered = eventsList;
    
    if (selectedMonth) {
      filtered = filtered.filter(event => {
        const eventMonth = new Date(event.start_date).getMonth() + 1;
        return eventMonth === parseInt(selectedMonth);
      });
    }
    
    if (selectedYear) {
      filtered = filtered.filter(event => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear === parseInt(selectedYear);
      });
    }
    
    return filtered;
  };

  // Фильтрация событий по поисковому запросу
  const filterEvents = (eventsList: Event[]) => {
    if (!searchQuery.trim()) return eventsList;
    
    const query = searchQuery.toLowerCase();
    return eventsList.filter(event => 
      event.name.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.project_owner?.toLowerCase().includes(query) ||
      event.managers?.toLowerCase().includes(query) ||
      event.animators?.toLowerCase().includes(query)
    );
  };

  // Исправленная сортировка событий - используем start_date
  const sortEvents = (eventsList: Event[]) => {
    if (!sortByName) return eventsList;

    return [...eventsList].sort((a, b) => {
      // Сортируем по дате начала события
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Группировка событий по дням для отображения списком
  const groupEventsByDay = (eventsList: Event[]) => {
    const grouped: { [key: string]: Event[] } = {};
    
    eventsList.forEach(event => {
      const date = new Date(event.start_date);
      const dayKey = format(date, 'd MMMM yyyy', { locale: ru }); // "1 сентября 2025"
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event);
    });
    
    return grouped;
  };

  // Применение всех фильтров
  const getFilteredAndSortedEvents = () => {
    let filtered = filterEventsByDate(events);
    filtered = filterEvents(filtered);
    return sortEvents(filtered);
  };

  // Сброс всех фильтров
  const resetFilters = () => {
    setSelectedMonth(null);
    setSelectedYear(null);
    setSearchQuery("");
    setSortByName(false);
  };

  const filteredEvents = getFilteredAndSortedEvents();
  const groupedEvents = groupEventsByDay(filteredEvents);


  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Мероприятия</h1>
          <p className="text-muted-foreground">Управляйте вашими мероприятиями</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="bg-muted h-5 w-32 rounded"></div>
                <div className="bg-muted h-3 w-24 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="bg-muted h-3 w-full rounded"></div>
                  <div className="bg-muted h-3 w-3/4 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onSave={handleEventSave}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold truncate">Мероприятия</h1>
          <p className="text-muted-foreground truncate">Управляйте вашими мероприятиями</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => setSortByName(!sortByName)}
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortByName ? "Сброс сортировки" : "Сортировка по дате"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex items-center gap-2"
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            {viewMode === 'grid' ? 'Список' : 'Карточки'}
          </Button>
          {hasPermission('events.create') && (
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Создать мероприятие
            </Button>
          )}
        </div>
      </div>

      {/* Фильтры по месяцу и году */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="text-sm mb-2 block font-medium">Месяц</div>
              <Select value={selectedMonth || "all"} onValueChange={(value) => setSelectedMonth(value === "all" ? null : value)}>
                <SelectTrigger id="month-filter">
                  <SelectValue placeholder="Все месяцы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все месяцы</SelectItem>
                  <SelectItem value="1">Январь</SelectItem>
                  <SelectItem value="2">Февраль</SelectItem>
                  <SelectItem value="3">Март</SelectItem>
                  <SelectItem value="4">Апрель</SelectItem>
                  <SelectItem value="5">Май</SelectItem>
                  <SelectItem value="6">Июнь</SelectItem>
                  <SelectItem value="7">Июль</SelectItem>
                  <SelectItem value="8">Август</SelectItem>
                  <SelectItem value="9">Сентябрь</SelectItem>
                  <SelectItem value="10">Октябрь</SelectItem>
                  <SelectItem value="11">Ноябрь</SelectItem>
                  <SelectItem value="12">Декабрь</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="text-sm mb-2 block font-medium">Год</div>
              <Select value={selectedYear || "all"} onValueChange={(value) => setSelectedYear(value === "all" ? null : value)}>
                <SelectTrigger id="year-filter">
                  <SelectValue placeholder="Все годы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все годы</SelectItem>
                  {getAvailableYears().map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(selectedMonth || selectedYear || searchQuery || sortByName) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Сбросить фильтры
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Счетчик отфильтрованных событий */}
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {selectedMonth || selectedYear || searchQuery ? 'Отфильтровано' : 'Всего праздников'}
          </h3>
        </div>
        <div className="text-2xl font-bold">
          {filteredEvents.length}
          {(selectedMonth || selectedYear || searchQuery) && (
            <span className="text-lg text-muted-foreground"> / {events.length}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedMonth || selectedYear || searchQuery 
            ? 'Найдено мероприятий' 
            : 'Мероприятий в системе'}
        </p>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию, описанию, месту..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет мероприятий</h3>
            <p className="text-muted-foreground text-center mb-4">
              Создайте ваше первое мероприятие, чтобы начать работу
            </p>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Мероприятия не найдены</h3>
            <p className="text-muted-foreground text-center mb-4">
              Попробуйте изменить параметры фильтрации
            </p>
            <Button variant="outline" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dayKey, dayEvents]) => (
            <div key={dayKey} className="space-y-3">
              <h3 className="text-lg font-semibold capitalize text-primary sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 z-10 border-b">
                {dayKey}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dayEvents.map((event) => (
                  <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50" onClick={() => handleEventClick(event)}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-1">{event.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="space-y-2">
                        {event.project_owner && (
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground font-medium min-w-[80px]">Проект:</span>
                            <span className="text-foreground">{event.project_owner}</span>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground font-medium min-w-[80px]">Менеджеры:</span>
                          <span className="text-foreground">{getManagerNames(event)}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{getLocationDisplay(event)}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{getTimeRange(event)}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{getAnimatorNames(event)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dayKey, dayEvents]) => (
            <div key={dayKey} className="space-y-3">
              <h3 className="text-lg font-semibold capitalize text-primary sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 z-10 border-b">
                {dayKey}
              </h3>
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50" onClick={() => handleEventClick(event)}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base">{event.name}</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {event.project_owner && (
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground font-medium min-w-[80px]">Проект:</span>
                              <span className="text-foreground">{event.project_owner}</span>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground font-medium min-w-[80px]">Менеджеры:</span>
                            <span className="text-foreground">{getManagerNames(event)}</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground">{getLocationDisplay(event)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground">{getTimeRange(event)}</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground">{getAnimatorNames(event)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;