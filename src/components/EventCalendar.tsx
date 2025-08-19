import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Clock, Camera, Video, Users } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { formatCurrency } from "@/utils/formatCurrency";
import EventDetailsDialog from "@/components/EventDetailsDialog";

interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number;
  actual_cost: number;
  status: string;
  project_owner?: string;
  managers?: string[];
  location?: string;
  event_time?: string;
  animators?: string[];
  show_program?: string;
  contractors?: string[];
  photos?: string[];
  videos?: string[];
  notes?: string;
  created_at: string;
}

const EventCalendar = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    budget: "",
    project_owner: "",
    managers: "",
    location: "",
    event_time: "",
    animators: "",
    show_program: "",
    contractors: "",
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
        end_date: formData.end_date,
        budget: parseFloat(formData.budget),
        project_owner: formData.project_owner,
        managers: formData.managers ? formData.managers.split(",").map(m => m.trim()) : [],
        location: formData.location,
        event_time: formData.event_time || null,
        animators: formData.animators ? formData.animators.split(",").map(a => a.trim()) : [],
        show_program: formData.show_program,
        contractors: formData.contractors ? formData.contractors.split(",").map(c => c.trim()) : [],
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
        end_date: new Date().toISOString().split('T')[0],
        budget: "",
        project_owner: "",
        managers: "",
        location: "",
        event_time: "",
        animators: "",
        show_program: "",
        contractors: "",
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
      const startDate = parseISO(event.start_date);
      const endDate = parseISO(event.end_date);
      return date >= startDate && date <= endDate;
    });
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

  // Remove this function since we're using the imported utility
  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat("ru-RU", {
  //     style: "currency",
  //     currency: "RUB",
  //   }).format(amount);
  // };

  const eventsForSelectedDate = getEventsForDate(selectedDate);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Календарь мероприятий</h1>
          <p className="text-muted-foreground">Планируйте и отслеживайте ваши мероприятия</p>
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
                  <Label htmlFor="start_date">Дата начала</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Дата окончания</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="managers">Менеджеры (через запятую)</Label>
                  <Input
                    id="managers"
                    value={formData.managers}
                    onChange={(e) => setFormData({ ...formData, managers: e.target.value })}
                    placeholder="Иван Иванов, Петр Петров"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="animators">Аниматоры (через запятую)</Label>
                  <Input
                    id="animators"
                    value={formData.animators}
                    onChange={(e) => setFormData({ ...formData, animators: e.target.value })}
                    placeholder="Анна Смирнова, Олег Кузнецов"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="show_program">Шоу/Программа</Label>
                  <Input
                    id="show_program"
                    value={formData.show_program}
                    onChange={(e) => setFormData({ ...formData, show_program: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractors">Подрядчики (через запятую)</Label>
                  <Input
                    id="contractors"
                    value={formData.contractors}
                    onChange={(e) => setFormData({ ...formData, contractors: e.target.value })}
                    placeholder="ООО Свет, ИП Звук"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Бюджет (₽)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  required
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Календарь</CardTitle>
            <CardDescription>
              Выберите дату для просмотра мероприятий
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ru}
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0,
              }}
              modifiersStyles={{
                hasEvents: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  fontWeight: "bold",
                },
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Мероприятия на {format(selectedDate, "d MMMM yyyy", { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsForSelectedDate.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Нет мероприятий на эту дату
              </p>
            ) : (
              <div className="space-y-3">
                {eventsForSelectedDate.map((event) => (
                  <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3" onClick={() => {
                      setSelectedEvent(event);
                      setShowEventDialog(true);
                    }}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold line-clamp-1">{event.name}</h4>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusLabel(event.status)}
                        </Badge>
                      </div>
                      {event.location && (
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <MapPin className="mr-1 h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                      {event.event_time && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {event.event_time}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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