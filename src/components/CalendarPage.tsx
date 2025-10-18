import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Upload, Minus, PlusIcon, Trash2 } from "lucide-react";
import CalendarTable from "./CalendarTable";
import EventsImportDialog from "./EventsImportDialog";

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
  managers: string | null;
  animators: string | null;
  contractors: string | null;
  show_program: string | null;
  photo_video: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  date: string;
  dayOfWeek: string;
  events: Event[];
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

const ZOOM_LEVELS = [50, 75, 100, 125, 150];

const CalendarPage = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [events, setEvents] = useState<Event[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    event_time: "",
    end_time: "",
    location: "",
    project_owner: "",
    managers: "",
    animators: "",
    contractors: "",
    show_program: "",
    photo_video: "",
    notes: "",
  });

  // Load zoom from localStorage
  useEffect(() => {
    const savedZoom = localStorage.getItem('calendar-zoom');
    if (savedZoom) {
      setZoom(parseInt(savedZoom));
    }
  }, []);

  // Save zoom to localStorage
  useEffect(() => {
    localStorage.setItem('calendar-zoom', zoom.toString());
  }, [zoom]);

  useEffect(() => {
    fetchEvents();
  }, [selectedMonth, selectedYear]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("start_date", startDate)
        .lte("start_date", endDate)
        .order("start_date", { ascending: true });

      if (error) throw error;
      
      setEvents(data || []);
      generateCalendarEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить события",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarEvents = (eventData: Event[]) => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const calendarData: CalendarEvent[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventData.filter(event => event.start_date === dateStr);
      const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();

      calendarData.push({
        date: dateStr,
        dayOfWeek: WEEKDAYS[dayOfWeek],
        events: dayEvents
      });
    }

    setCalendarEvents(calendarData);
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

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const eventData = {
        ...formData,
        event_time: formData.event_time || null,
        end_time: formData.end_time || null,
        location: formData.location || null,
        created_by: user.id,
      };

      let result;
      if (editingEvent) {
        result = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);
      } else {
        result = await supabase
          .from("events")
          .insert(eventData);
      }

      if (result.error) throw result.error;

      toast({
        title: "Успешно!",
        description: editingEvent ? "Событие обновлено" : "Событие создано",
      });

      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось сохранить событие",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      start_date: "",
      event_time: "",
      end_time: "",
      location: "",
      project_owner: "",
      managers: "",
      animators: "",
      contractors: "",
      show_program: "",
      photo_video: "",
      notes: "",
    });
    setEditingEvent(null);
    setShowCreateDialog(false);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name || "",
      description: event.description || "",
      start_date: event.start_date || "",
      event_time: event.event_time || "",
      end_time: event.end_time || "",
      location: event.location || "",
      project_owner: event.project_owner || "",
      managers: event.managers || "",
      animators: event.animators || "",
      contractors: event.contractors || "",
      show_program: event.show_program || "",
      photo_video: event.photo_video || "",
      notes: event.notes || "",
    });
    setShowCreateDialog(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Вы уверены, что хотите удалить это событие?")) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Событие удалено",
      });

      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить событие",
      });
    }
  };

  const handleDeleteAllEvents = async () => {
    if (!confirm("Вы уверены, что хотите удалить ВСЕ мероприятия? Это действие нельзя отменить!")) return;
    if (!confirm("Это действие удалит все мероприятия из базы данных. Продолжить?")) return;

    try {
      // Сначала обнуляем project_id в связанных финансовых транзакциях
      await supabase
        .from("financial_transactions")
        .update({ project_id: null })
        .not("project_id", "is", null);

      // Затем удаляем все события
      const { error } = await supabase
        .from("events")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Все мероприятия удалены",
      });

      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Ошибка",
        description: error.message || "Не удалось удалить мероприятия",
      });
    }
  };

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:justify-between lg:items-center w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold truncate">Календарь</h1>
          <p className="text-muted-foreground truncate">Расписание праздников {MONTHS[selectedMonth]} {selectedYear}</p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 text-sm lg:text-base w-full sm:w-auto flex-shrink-0">
          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month/Year selectors */}
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
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
            <SelectTrigger className="w-20">
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

          <Button variant="outline" size="sm" onClick={goToToday}>
            Сегодня
          </Button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              disabled={zoom <= 50}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-12 text-center text-xs">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(150, zoom + 25))}
              disabled={zoom >= 150}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingEvent(null)}>
                <Plus className="mr-1 h-4 w-4" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Редактировать событие" : "Добавить событие"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Праздник *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Дата *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project_owner">Чей проект?</Label>
                    <Input
                      id="project_owner"
                      value={formData.project_owner}
                      onChange={(e) => setFormData({ ...formData, project_owner: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managers">Менеджеры</Label>
                    <Input
                      id="managers"
                      value={formData.managers}
                      onChange={(e) => setFormData({ ...formData, managers: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Место</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_time">Время</Label>
                    <Input
                      id="event_time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                      placeholder="15:00-18:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="animators">Аниматоры</Label>
                    <Input
                      id="animators"
                      value={formData.animators}
                      onChange={(e) => setFormData({ ...formData, animators: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="show_program">Шоу/Программа</Label>
                    <Input
                      id="show_program"
                      value={formData.show_program}
                      onChange={(e) => setFormData({ ...formData, show_program: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractors">Подрядчики</Label>
                    <Input
                      id="contractors"
                      value={formData.contractors}
                      onChange={(e) => setFormData({ ...formData, contractors: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo_video">Фото/Видео</Label>
                    <Input
                      id="photo_video"
                      value={formData.photo_video}
                      onChange={(e) => setFormData({ ...formData, photo_video: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Примечания</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingEvent ? "Сохранить" : "Создать"}
                  </Button>
                  {editingEvent && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        handleDeleteEvent(editingEvent.id);
                        resetForm();
                      }}
                    >
                      Удалить
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-1 h-4 w-4" />
            Импорт
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDeleteAllEvents}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Удалить все
          </Button>
        </div>
      </div>

      {/* Calendar Table */}
      <Card>
        <CalendarTable
          calendarEvents={calendarEvents}
          zoom={zoom}
          loading={loading}
          onEventEdit={handleEditEvent}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </Card>

      {/* Import Dialog */}
      <EventsImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={fetchEvents}
      />
    </div>
  );
};

export default CalendarPage;