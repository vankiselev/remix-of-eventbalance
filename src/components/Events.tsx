// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useEvents } from "@/hooks/useEvents";
import { useEmployees } from "@/hooks/useEmployees";
import { useAnimators } from "@/hooks/useAnimators";
import { useVenues } from "@/hooks/useVenues";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, ArrowUpDown, Search, X, MapPin, Clock, Users, Trash2, Filter, Check, ChevronsUpDown, User, Target } from "lucide-react";
import { formatDisplayName } from "@/utils/formatName";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  responsible_manager_id: string | null;
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
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useEvents();
  const { data: employees = [] } = useEmployees('active');
  const { data: animators = [] } = useAnimators();
  const { data: venues = [] } = useVenues();
  
  const loading = eventsLoading;
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sortByName, setSortByName] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedProjectOwner, setSelectedProjectOwner] = useState<string | null>(null);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'future' | 'past' | 'all' | 'cancelled'>('future');
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();


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
    refetchEvents();
    handleDialogClose();
  };

  const getResponsibleManager = (event: Event) => {
    if (!event.responsible_manager_id) return null;
    return employees.find(emp => emp.id === event.responsible_manager_id);
  };

  const getManagerNames = (event: Event) => {
    // Если есть manager_ids (новое поле), используем его
    if (event.manager_ids && event.manager_ids.length > 0) {
      const names = event.manager_ids
        .map(id => formatDisplayName(employees.find(emp => emp.id === id)?.full_name))
        .filter(Boolean)
        .join(", ");
      if (names) return names;
    }
    // Иначе используем старое текстовое поле managers (из импорта)
    if (event.managers) return event.managers;
    return "—";
  };

  const getManagerAvatars = (event: Event) => {
    if (!event.manager_ids || event.manager_ids.length === 0) return [];
    return event.manager_ids
      .map(id => employees.find(emp => emp.id === id))
      .filter(Boolean);
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

  // Получение доступных месяцев в зависимости от периода фильтра
  const getAvailableMonths = () => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const allMonths = [
      { value: "1", label: "Январь" },
      { value: "2", label: "Февраль" },
      { value: "3", label: "Март" },
      { value: "4", label: "Апрель" },
      { value: "5", label: "Май" },
      { value: "6", label: "Июнь" },
      { value: "7", label: "Июль" },
      { value: "8", label: "Август" },
      { value: "9", label: "Сентябрь" },
      { value: "10", label: "Октябрь" },
      { value: "11", label: "Ноябрь" },
      { value: "12", label: "Декабрь" }
    ];

    if (periodFilter === 'future') {
      // Показываем только текущий месяц и будущие
      return allMonths.filter(month => parseInt(month.value) >= currentMonth);
    } else if (periodFilter === 'past') {
      // Показываем только прошедшие месяцы до текущего включительно
      return allMonths.filter(month => parseInt(month.value) <= currentMonth);
    }
    
    // Для 'all' показываем все месяцы
    return allMonths;
  };

  // Получение уникальных владельцев проектов
  const getAvailableProjectOwners = (): string[] => {
    const owners = events
      .map(event => event.project_owner)
      .filter((owner): owner is string => !!owner);
    return [...new Set(owners)].sort();
  };

  // Фильтрация событий по дате (месяц и год)
  const filterEventsByDate = (eventsList: Event[]) => {
    let filtered = eventsList;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Фильтр по периоду
    if (periodFilter === 'cancelled') {
      // Показываем только отмененные
      filtered = filtered.filter(event => event.status === 'cancelled');
    } else {
      // Исключаем отмененные из остальных фильтров
      filtered = filtered.filter(event => event.status !== 'cancelled');
      
      if (periodFilter === 'future') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.start_date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        });
      } else if (periodFilter === 'past') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.start_date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate < today;
        });
      }
    }
    
    // Фильтр по владельцу проекта
    if (selectedProjectOwner) {
      filtered = filtered.filter(event => event.project_owner === selectedProjectOwner);
    }
    
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
    
    // Фильтр по менеджерам
    if (selectedManagers.length > 0) {
      filtered = filtered.filter(event => {
        if (!event.manager_ids || event.manager_ids.length === 0) return false;
        return selectedManagers.some(managerId => event.manager_ids?.includes(managerId));
      });
    }
    
    // Фильтр по площадке
    if (selectedVenue) {
      filtered = filtered.filter(event => event.venue_id === selectedVenue);
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

  // Сортировка событий по дате
  const sortEvents = (eventsList: Event[]) => {
    return [...eventsList].sort((a, b) => {
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      
      return sortOrder === 'asc' 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
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
    setSelectedProjectOwner(null);
    setSelectedManagers([]);
    setSelectedVenue(null);
    setSearchQuery("");
    setPeriodFilter('future');
    setSortOrder('asc');
  };

  // Обработка выбора мероприятий
  const toggleEventSelection = (eventId: string) => {
    const newSelected = new Set(selectedEventIds);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEventIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEventIds.size === filteredEvents.length && filteredEvents.length > 0) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedEventIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', Array.from(selectedEventIds));

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Удалено мероприятий: ${selectedEventIds.size}`,
      });

      setSelectedEventIds(new Set());
      await refetchEvents();
    } catch (error) {
      console.error('Error deleting events:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить мероприятия",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const filteredEvents = useMemo(() => getFilteredAndSortedEvents(), [events, periodFilter, selectedMonth, selectedYear, selectedProjectOwner, selectedManagers, selectedVenue, searchQuery, sortOrder]);
  const groupedEvents = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents]);


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
    <div className="space-y-3 sm:space-y-6 w-full overflow-x-hidden">
      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onSave={handleEventSave}
      />

      <div className="flex flex-col gap-2 sm:gap-4 w-full">
        {/* Header hidden on mobile — Layout shows page title */}
        <div className="min-w-0 hidden sm:block">
          <h1 className="text-2xl md:text-3xl font-bold truncate">Мероприятия</h1>
          <p className="text-sm md:text-base text-muted-foreground truncate">Управляйте вашими мероприятиями</p>
        </div>
        
        {/* Верхняя панель: Фильтр, Сортировка, Поиск, Создать */}
        <div className="action-row">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center gap-2"
              >
                <span className="hidden sm:inline">{selectedEventIds.size === filteredEvents.length && filteredEvents.length > 0 ? 'Снять всё' : 'Выбрать всё'}</span>
                <span className="sm:hidden">{selectedEventIds.size === filteredEvents.length && filteredEvents.length > 0 ? 'Снять' : 'Все'}</span>
              </Button>
              {selectedEventIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Удалить ({selectedEventIds.size})</span>
                  <span className="sm:hidden">({selectedEventIds.size})</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedEventIds(new Set());
                }}
              >
                Отмена
              </Button>
            </>
          ) : (
            <>
              {/* Кнопка Фильтр */}
              <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1.5 touch-manipulation"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="text-sm">Фильтр</span>
                    {(selectedMonth || selectedYear || selectedProjectOwner || selectedManagers.length > 0 || selectedVenue) && (
                      <span className="ml-0.5 bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full tabular-nums font-bold">
                        {[selectedMonth, selectedYear, selectedProjectOwner, selectedManagers.length > 0, selectedVenue].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Фильтры</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm mb-2 block font-medium">Месяц</div>
                        <Select value={selectedMonth || "all"} onValueChange={(value) => setSelectedMonth(value === "all" ? null : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Все месяцы" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все месяцы</SelectItem>
                            {getAvailableMonths().map(month => (
                              <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-sm mb-2 block font-medium">Год</div>
                        <Select value={selectedYear || "all"} onValueChange={(value) => setSelectedYear(value === "all" ? null : value)}>
                          <SelectTrigger>
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
                      <div>
                        <div className="text-sm mb-2 block font-medium">Чей проект</div>
                        <Select value={selectedProjectOwner || "all"} onValueChange={(value) => setSelectedProjectOwner(value === "all" ? null : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Все проекты" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все проекты</SelectItem>
                            {getAvailableProjectOwners().map(owner => (
                              <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-sm mb-2 block font-medium">Менеджеры</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                            >
                              {selectedManagers.length > 0
                                ? `Выбрано: ${selectedManagers.length}`
                                : "Выберите менеджеров"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Поиск менеджера..." />
                              <CommandList>
                                <CommandEmpty>Менеджер не найден</CommandEmpty>
                                <CommandGroup>
                                  {employees.map((employee) => (
                                    <CommandItem
                                      key={employee.id}
                                      onSelect={() => {
                                        setSelectedManagers(prev =>
                                          prev.includes(employee.id)
                                            ? prev.filter(id => id !== employee.id)
                                            : [...prev, employee.id]
                                        );
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedManagers.includes(employee.id) ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {formatDisplayName(employee.full_name)}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <div className="text-sm mb-2 block font-medium">Площадка</div>
                        <Select value={selectedVenue || "all"} onValueChange={(value) => setSelectedVenue(value === "all" ? null : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Все площадки" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все площадки</SelectItem>
                            {venues.map(venue => (
                              <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Счетчик мероприятий */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Найдено:</span>
                        <span className="font-semibold text-lg">{filteredEvents.length}</span>
                        {(selectedMonth || selectedYear || selectedProjectOwner || selectedManagers.length > 0 || selectedVenue || searchQuery || periodFilter !== 'future') && (
                          <span className="text-muted-foreground">/ {events.length}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t">
                      {(selectedMonth || selectedYear || selectedProjectOwner || selectedManagers.length > 0 || selectedVenue || searchQuery) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            resetFilters();
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Сбросить фильтры
                        </Button>
                      )}
                      <Button
                        onClick={() => setIsFilterDialogOpen(false)}
                      >
                        Применить
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Сортировка */}
              {isMobile ? (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={toggleSortOrder}
                  className="flex items-center gap-1 touch-manipulation"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
                </Button>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      Сортировка
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Порядок сортировки</h4>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={sortOrder === 'asc' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortOrder('asc')}
                          className="w-full justify-start"
                        >
                          По возрастанию (старые → новые)
                        </Button>
                        <Button
                          variant={sortOrder === 'desc' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortOrder('desc')}
                          className="w-full justify-start"
                        >
                          По убыванию (новые → старые)
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {hasPermission('events.delete') && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                >
                  Выбрать
                </Button>
              )}

              {/* Поиск */}
              <div className="relative flex-1 min-w-[100px] sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isMobile ? "Поиск..." : "Поиск по названию, описанию, месту..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </>
          )}
          
          {/* Кнопка создания */}
          {hasPermission('events.create') && !selectionMode && (
            <Button size="sm" onClick={handleCreateNew} className="touch-manipulation ml-auto">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Создать мероприятие</span>
            </Button>
          )}
        </div>
      </div>

      {/* Период */}
      <div>
        <ToggleGroup 
          type="single" 
          value={periodFilter}
          onValueChange={(value) => {
            if (value) setPeriodFilter(value as 'future' | 'past' | 'all' | 'cancelled');
          }}
          className="grid grid-cols-4 w-full border rounded-xl"
        >
          <ToggleGroupItem 
            value="future" 
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-xs sm:text-sm h-10 sm:h-11 touch-manipulation"
          >
            Будущие
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="past"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-xs sm:text-sm h-10 sm:h-11 touch-manipulation"
          >
            Прошлые
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="all"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-xs sm:text-sm h-10 sm:h-11 touch-manipulation"
          >
            Все
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="cancelled"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-xs sm:text-sm h-10 sm:h-11 touch-manipulation"
          >
            Отмена
          </ToggleGroupItem>
        </ToggleGroup>
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
      ) : (
        <div className="space-y-3 sm:space-y-6 pb-4">
          {Object.entries(groupedEvents).map(([dayKey, dayEvents]) => (
            <div key={dayKey} className="space-y-2 sm:space-y-4">
                {dayEvents.map((event) => {
                  const isSelected = selectedEventIds.has(event.id);
                  const eventDate = new Date(event.start_date);
                  const day = format(eventDate, 'd', { locale: ru });
                  const month = format(eventDate, 'MMMM', { locale: ru });
                  const weekday = format(eventDate, 'EEEE', { locale: ru });
                  
                  return (
                    <Card 
                      key={event.id} 
                      className={`cursor-pointer hover:shadow-lg active:bg-accent/30 transition-all hover:border-primary/50 relative touch-manipulation ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => selectionMode ? toggleEventSelection(event.id) : handleEventClick(event)}
                    >
                      {selectionMode && (
                        <div className="absolute top-4 right-4 z-10 pointer-events-none">
                          <Checkbox checked={isSelected} />
                        </div>
                      )}
                      
                      <div className="flex gap-2.5 sm:gap-4 p-2.5 sm:p-5">
                        {/* Левый блок с датой */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-muted rounded-xl w-14 h-14 sm:w-24 sm:h-24 border gap-0 sm:gap-1">
                          <div className="text-lg sm:text-3xl font-bold leading-none">{day}</div>
                          <div className="text-[9px] sm:text-sm capitalize text-muted-foreground leading-tight">{month}</div>
                          <div className="text-[8px] sm:text-xs font-medium capitalize text-muted-foreground/70 leading-tight hidden sm:block">{weekday}</div>
                        </div>
                        
                        {/* Правый блок с информацией */}
                        <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                          {/* Заголовок + статус */}
                          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                            <h3 className="text-[13px] sm:text-lg font-semibold leading-tight line-clamp-2">{event.name}</h3>
                            {event.status && (
                              <Badge 
                                variant={event.status === 'completed' ? 'default' : event.status === 'in_progress' ? 'secondary' : 'outline'}
                                className="text-[9px] sm:text-[10px] flex-shrink-0 whitespace-nowrap px-1.5 py-0"
                              >
                                {event.status === 'completed' ? 'Завершено' : event.status === 'in_progress' ? 'В процессе' : event.status === 'planning' ? 'Планируется' : event.status}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Бейджи: владелец + менеджеры */}
                          <div className="flex flex-wrap gap-1">
                            {event.project_owner && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 py-0">
                                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {event.project_owner}
                              </Badge>
                            )}
                            {(() => {
                              const managerNames = getManagerNames(event);
                              return managerNames !== '—' ? (
                                <Badge variant="outline" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 py-0">
                                  <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  <span className="truncate max-w-[120px] sm:max-w-none">{managerNames}</span>
                                </Badge>
                              ) : null;
                            })()}
                          </div>
                          
                          {/* Детали: место, время, аниматоры — только если есть */}
                          {(() => {
                            const locationDisplay = getLocationDisplay(event);
                            const timeRange = getTimeRange(event);
                            const animatorNames = getAnimatorNames(event);
                            const hasDetails = locationDisplay !== '—' || timeRange !== '—' || animatorNames !== '—';
                            if (!hasDetails) return null;
                            return (
                              <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 text-[11px] sm:text-sm text-muted-foreground pt-0.5 sm:pt-1">
                                {locationDisplay !== '—' && (
                                  <div className="flex items-center gap-1 sm:gap-1.5">
                                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                    <span className="truncate max-w-[140px] sm:max-w-[200px]">{locationDisplay}</span>
                                  </div>
                                )}
                                {timeRange !== '—' && (
                                  <div className="flex items-center gap-1 sm:gap-1.5">
                                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                    <span>{timeRange}</span>
                                  </div>
                                )}
                                {animatorNames !== '—' && (
                                  <div className="flex items-center gap-1 sm:gap-1.5">
                                    <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                    <span className="truncate max-w-[140px] sm:max-w-[200px]">{animatorNames}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      {/* Alert Dialog для подтверждения удаления */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {selectedEventIds.size} {selectedEventIds.size === 1 ? 'мероприятие' : 'мероприятий'}? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Events;