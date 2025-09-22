import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, ArrowUpDown, Edit } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  event_time: string | null;
  end_time?: string | null;
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

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [sortByName, setSortByName] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    event_time: "",
    end_time: "",
    status: "planning" as const,
    venue_id: "",
    project_owner: "",
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
        .order("created_at", { ascending: false });

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
        event_time: formData.event_time || null,
        end_time: formData.end_time || null,
        status: formData.status,
        venue_id: formData.venue_id || null,
        project_owner: formData.project_owner,
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
        end_time: "",
        status: "planning" as const,
        venue_id: "",
        project_owner: "",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  // Парсит дату из названия события (например, 3108 = 31 августа, 2709 = 27 сентября)
  const parseDateFromName = (name: string) => {
    const match = name.match(/(\d{4})/);
    if (match) {
      const dateStr = match[1];
      const day = parseInt(dateStr.substring(0, 2));
      const month = parseInt(dateStr.substring(2, 4));
      
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return new Date(2024, month - 1, day); // используем 2024 как базовый год
      }
    }
    return null;
  };

  const sortEvents = (eventsList: Event[]) => {
    if (!sortByName) return eventsList;

    return [...eventsList].sort((a, b) => {
      const dateA = parseDateFromName(a.name);
      const dateB = parseDateFromName(b.name);
      
      // Если у обоих событий есть даты в названии, сортируем по дате
      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Если только у одного есть дата, событие с датой идет первым
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      
      // Иначе сортируем алфавитно
      return a.name.localeCompare(b.name, 'ru');
    });
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || "",
      start_date: event.start_date,
      event_time: event.event_time || "",
      end_time: event.end_time || "",
      status: event.status as any,
      venue_id: event.venue_id || "",
      project_owner: event.project_owner || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingEvent) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date,
          event_time: formData.event_time || null,
          end_time: formData.end_time || null,
          status: formData.status,
          venue_id: formData.venue_id || null,
          project_owner: formData.project_owner,
        })
        .eq("id", editingEvent.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Мероприятие обновлено",
      });

      setShowEditDialog(false);
      setEditingEvent(null);
      setFormData({
        name: "",
        description: "",
        start_date: new Date().toISOString().split('T')[0],
        event_time: "",
        end_time: "",
        status: "planning" as const,
        venue_id: "",
        project_owner: "",
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось обновить мероприятие",
      });
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Мероприятия</h1>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Мероприятия</h1>
          <p className="text-muted-foreground">Управляйте вашими мероприятиями</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setSortByName(!sortByName)}
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortByName ? "Сброс сортировки" : "Сортировка по дате"}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Создать мероприятие
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать новое мероприятие</DialogTitle>
              <DialogDescription>
                Заполните информацию о мероприятии
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <div className="grid grid-cols-1 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_time">Время начала</Label>
                    <Input
                      id="event_time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Время окончания</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_owner">Владелец проекта</Label>
                <Input
                  id="project_owner"
                  value={formData.project_owner}
                  onChange={(e) => setFormData({ ...formData, project_owner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="planning">Планирование</option>
                  <option value="confirmed">Подтверждено</option>
                  <option value="in_progress">В процессе</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
              <Button type="submit" className="w-full">
                Создать мероприятие
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать мероприятие</DialogTitle>
              <DialogDescription>
                Измените информацию о мероприятии
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Название</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Описание</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start_date">Дата начала</Label>
                  <Input
                    id="edit-start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-event_time">Время начала</Label>
                    <Input
                      id="edit-event_time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-end_time">Время окончания</Label>
                    <Input
                      id="edit-end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-project_owner">Владелец проекта</Label>
                <Input
                  id="edit-project_owner"
                  value={formData.project_owner}
                  onChange={(e) => setFormData({ ...formData, project_owner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Статус</Label>
                <select
                  id="edit-status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="planning">Планирование</option>
                  <option value="confirmed">Подтверждено</option>
                  <option value="in_progress">В процессе</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
              <Button type="submit" className="w-full">
                Обновить мероприятие
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortEvents(events).map((event) => (
            <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEditEvent(event)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-2">{event.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(event.status)}>
                      {getStatusLabel(event.status)}
                    </Badge>
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(event.start_date)}
                  {event.event_time && ` в ${event.event_time.slice(0, 5)}`}
                </div>
                {event.project_owner && (
                  <div className="text-sm text-muted-foreground">
                    Проект: {event.project_owner}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;