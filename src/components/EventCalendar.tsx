import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import EventDetailsDialog from "@/components/EventDetailsDialog";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  event_time: string | null;
  status: string;
  location: string | null;
  venue_id: string | null;
  contractor_ids: string[] | null;
  responsible_manager_ids: string[] | null;
  manager_ids: string[] | null;
  photos: string[] | null;
  videos: string[] | null;
  notes: string | null;
  project_owner: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const EventCalendar = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{day: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    event_time: "",
    project_owner: "",
    location: "",
    notes: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("events").insert({
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        project_owner: formData.project_owner,
        location: formData.location,
        event_time: formData.event_time || null,
        notes: formData.notes,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Мероприятие создано",
      });

      setFormData({
        name: "",
        description: "",
        start_date: new Date().toISOString().split('T')[0],
        event_time: "",
        project_owner: "",
        location: "",
        notes: "",
      });
      setShowCreateDialog(false);
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось создать мероприятие",
      });
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const startDate = new Date(event.start_date);
      return date.toDateString() === startDate.toDateString();
    });
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getEventForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.find(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentDate.getMonth() && 
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isDateHighlighted = (day: number) => {
    const event = getEventForDay(day);
    if (!event) return false;
    
    const eventDate = new Date(event.start_date);
    return !isPast(eventDate) || isToday(eventDate);
  };

  const handleCellEdit = (day: number, field: string, currentValue: string = "") => {
    setEditingCell({ day, field });
    setEditValue(currentValue);
  };

  const handleCellSave = async () => {
    if (!editingCell || !user) return;
    
    const event = getEventForDay(editingCell.day);
    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), editingCell.day);
    
    try {
      if (event) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update({ [editingCell.field]: editValue })
          .eq("id", event.id);
          
        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from("events")
          .insert({
            name: editingCell.field === 'name' ? editValue : `Мероприятие ${editingCell.day}`,
            start_date: eventDate.toISOString().split('T')[0],
            [editingCell.field]: editValue,
            created_by: user.id,
          });
          
        if (error) throw error;
      }
      
      fetchEvents();
      toast({
        title: "Успешно!",
        description: "Данные обновлены",
      });
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Ошибка",
        description: error.message || "Не удалось сохранить изменения",
      });
    }
    
    setEditingCell(null);
    setEditValue("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "planning":
        return "Планирование";
      case "active":
        return "Активное";
      case "completed":
        return "Завершено";
      case "cancelled":
        return "Отменено";
      default:
        return status;
    }
  };

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const getDayOfWeekAbbr = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    const daysRu = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    return daysRu[dayOfWeek];
  };

  const daysInMonth = getDaysInMonth();
  const maxDays = Math.max(...daysInMonth.map(d => d.getDate()));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Календарь мероприятий</h1>
        </div>
        <div className="animate-pulse">
          <div className="bg-muted h-96 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-black">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить мероприятие
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать новое мероприятие</DialogTitle>
              <DialogDescription>
                Заполните информацию о мероприятии
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Праздник</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Дата</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_time">Время</Label>
                  <Input
                    id="event_time"
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  />
                </div>
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
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                Создать мероприятие
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="calendar-scroll h-[calc(100vh-300px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-success">
              <TableRow>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Дата</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Праздник</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Чей проект?</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Менеджеры</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Место</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Время</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Аниматоры</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Шоу/Программа</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Подрядчики</TableHead>
                <TableHead className="text-center text-foreground font-bold border-r text-xs sticky top-0 bg-success py-3">Фото/Видео</TableHead>
                <TableHead className="text-center text-foreground font-bold text-xs sticky top-0 bg-success py-3">Примечания</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {Array.from({ length: maxDays }, (_, index) => {
              const day = index + 1;
              const event = getEventForDay(day);
              const isHighlighted = isDateHighlighted(day);
              
              return (
                <TableRow key={day}>
                  <TableCell 
                    className={cn(
                      "text-center font-medium border-r text-foreground text-xs py-2",
                      isHighlighted && "bg-warning-light"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div>{day}</div>
                      <div className="text-xs">{getDayOfWeekAbbr(day)}</div>
                    </div>
                  </TableCell>
                  
                  {/* Праздник */}
                  <TableCell 
                    className={cn(
                      "text-center border-r text-foreground cursor-pointer hover:bg-accent text-xs py-2",
                      isHighlighted && "bg-warning-light"
                    )}
                    onClick={() => handleCellEdit(day, 'name', event?.name || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'name' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center"
                        autoFocus
                      />
                    ) : (
                      event?.name || ''
                    )}
                  </TableCell>
                  
                  {/* Чей проект? */}
                  <TableCell 
                    className="text-center border-r text-foreground cursor-pointer hover:bg-accent text-xs py-2"
                    onClick={() => handleCellEdit(day, 'project_owner', event?.project_owner || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'project_owner' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center text-xs"
                        autoFocus
                      />
                    ) : (
                      event?.project_owner || ''
                    )}
                  </TableCell>
                  
                  {/* Менеджеры */}
                  <TableCell 
                    className="text-center border-r text-foreground cursor-pointer hover:bg-accent text-xs py-2"
                    onClick={() => handleCellEdit(day, 'manager_ids', event?.manager_ids?.join(', ') || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'manager_ids' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center text-xs"
                        autoFocus
                      />
                    ) : (
                      event?.manager_ids?.join(', ') || ''
                    )}
                  </TableCell>
                  
                  {/* Место */}
                  <TableCell 
                    className="text-center border-r text-foreground cursor-pointer hover:bg-accent text-xs py-2"
                    onClick={() => handleCellEdit(day, 'location', event?.location || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'location' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center text-xs"
                        autoFocus
                      />
                    ) : (
                      event?.location || ''
                    )}
                  </TableCell>
                  
                  {/* Время */}
                  <TableCell 
                    className="text-center border-r text-foreground cursor-pointer hover:bg-accent text-xs py-2"
                    onClick={() => handleCellEdit(day, 'event_time', event?.event_time || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'event_time' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center text-xs"
                        autoFocus
                      />
                    ) : (
                      event?.event_time || ''
                    )}
                  </TableCell>
                  
                  {/* Аниматоры - пустая колонка */}
                  <TableCell className="text-center border-r text-foreground text-xs py-2"></TableCell>
                  
                  {/* Шоу/Программа */}
                  <TableCell 
                    className="text-center border-r text-foreground cursor-pointer hover:bg-accent text-xs py-2"
                    onClick={() => handleCellEdit(day, 'contractor_ids', event?.contractor_ids?.join(', ') || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'contractor_ids' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center text-xs"
                        autoFocus
                      />
                    ) : (
                      event?.contractor_ids?.join(', ') || ''
                    )}
                  </TableCell>
                  
                  {/* Подрядчики */}
                  <TableCell 
                    className="text-center border-r text-foreground cursor-pointer hover:bg-accent text-xs py-2"
                    onClick={() => handleCellEdit(day, 'responsible_manager_ids', event?.responsible_manager_ids?.join(', ') || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'responsible_manager_ids' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center text-xs"
                        autoFocus
                      />
                    ) : (
                      event?.responsible_manager_ids?.join(', ') || ''
                    )}
                  </TableCell>
                  
                  {/* Фото/Видео */}
                  <TableCell className="text-center border-r text-foreground text-xs py-2">
                    {event?.photos?.length || event?.videos?.length ? 'Есть' : ''}
                  </TableCell>
                  
                  {/* Примечания */}
                  <TableCell 
                    className="text-center text-foreground cursor-pointer hover:bg-accent text-xs py-2"
                    onClick={() => handleCellEdit(day, 'notes', event?.notes || '')}
                  >
                    {editingCell?.day === day && editingCell?.field === 'notes' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="text-center text-xs"
                        autoFocus
                      />
                    ) : (
                      event?.notes || ''
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEvent as any}
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        onEventUpdated={fetchEvents}
      />
    </div>
  );
};

export default EventCalendar;