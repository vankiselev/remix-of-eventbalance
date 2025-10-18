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
import { Plus, CalendarIcon, ArrowUpDown, Edit, Trash2, Grid3X3, List, Search } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  event_time: string | null;
  end_time?: string | null;
  status: string;
  location: string | null;
  project_owner: string | null;
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
  photos: string[] | null;
  videos: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const Events = () => {
  const { hasPermission } = useUserPermissions();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [sortByName, setSortByName] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    event_time: "",
    end_time: "",
    status: "planning" as const,
    venue_id: "",
    project_owner: "",
    managers: "",
    animators: "",
    contractors: "",
    show_program: "",
    photo_video: "",
    notes: "",
    location: "",
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
      const eventData = {
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        event_time: formData.event_time || null,
        end_time: formData.end_time || null,
        location: formData.location || null,
        project_owner: formData.project_owner || null,
        managers: formData.managers || null,
        animators: formData.animators || null,
        contractors: formData.contractors || null,
        show_program: formData.show_program || null,
        photo_video: formData.photo_video || null,
        notes: formData.notes || null,
        created_by: user.id,
      };

      const { error } = await supabase.from("events").insert(eventData);

      if (error) throw error;

      // Send notification to all users about new event
      const { sendNotificationToAdmins } = await import('@/utils/notifications');
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      await sendNotificationToAdmins(
        'Новое мероприятие',
        `${profile?.full_name || 'Сотрудник'} создал мероприятие "${formData.name}" на ${new Date(formData.start_date).toLocaleDateString('ru-RU')}`,
        'event',
        { 
          event_name: formData.name,
          start_date: formData.start_date,
          location: formData.location
        }
      );

      toast({
        title: "Успешно!",
        description: "Мероприятие создано",
      });

      resetForm();
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

  const handleEditEvent = (event: Event) => {
    // Check permissions
    if (event.created_by === user?.id) {
      if (!hasPermission('events.edit_own')) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "У вас нет прав для редактирования своих событий"
        });
        return;
      }
    } else {
      if (!hasPermission('events.edit_all')) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "У вас нет прав для редактирования чужих событий"
        });
        return;
      }
    }
    
    setEditingEvent(event);
    setFormData({
      name: event.name || "",
      description: event.description || "",
      start_date: event.start_date || "",
      event_time: event.event_time || "",
      end_time: event.end_time || "",
      status: event.status as any,
      venue_id: event.venue_id || "",
      project_owner: event.project_owner || "",
      managers: event.managers || "",
      animators: event.animators || "",
      contractors: event.contractors || "",
      show_program: event.show_program || "",
      photo_video: event.photo_video || "",
      notes: event.notes || "",
      location: event.location || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingEvent) return;

    try {
      const eventData = {
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        event_time: formData.event_time || null,
        end_time: formData.end_time || null,
        location: formData.location || null,
        project_owner: formData.project_owner || null,
        managers: formData.managers || null,
        animators: formData.animators || null,
        contractors: formData.contractors || null,
        show_program: formData.show_program || null,
        photo_video: formData.photo_video || null,
        notes: formData.notes || null,
      };

      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", editingEvent.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Мероприятие обновлено",
      });

      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось обновить мероприятие",
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    
    // Check permissions
    if (editingEvent.created_by === user?.id) {
      if (!hasPermission('events.delete_own')) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "У вас нет прав для удаления своих событий"
        });
        return;
      }
    } else {
      if (!hasPermission('events.delete_all')) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "У вас нет прав для удаления чужих событий"
        });
        return;
      }
    }
    
    if (!confirm("Вы уверены, что хотите удалить это событие?")) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", editingEvent.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Событие удалено",
      });

      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить событие",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      start_date: new Date().toISOString().split('T')[0],
      event_time: "",
      end_time: "",
      status: "planning" as const,
      venue_id: "",
      project_owner: "",
      managers: "",
      animators: "",
      contractors: "",
      show_program: "",
      photo_video: "",
      notes: "",
      location: "",
    });
    setEditingEvent(null);
    setShowEditDialog(false);
    setShowCreateDialog(false);
  };


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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать мероприятие
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать новое мероприятие</DialogTitle>
              <DialogDescription>
                Заполните информацию о мероприятии
              </DialogDescription>
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
              <Button type="submit" className="w-full">
                Создать мероприятие
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
        
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Редактировать событие" : "Добавить событие"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Праздник *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-start_date">Дата *</Label>
                  <Input
                    id="edit-start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-project_owner">Чей проект?</Label>
                  <Input
                    id="edit-project_owner"
                    value={formData.project_owner}
                    onChange={(e) => setFormData({ ...formData, project_owner: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-managers">Менеджеры</Label>
                  <Input
                    id="edit-managers"
                    value={formData.managers}
                    onChange={(e) => setFormData({ ...formData, managers: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Место</Label>
                  <Input
                    id="edit-location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event_time">Время</Label>
                  <Input
                    id="edit-event_time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    placeholder="15:00-18:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-animators">Аниматоры</Label>
                  <Input
                    id="edit-animators"
                    value={formData.animators}
                    onChange={(e) => setFormData({ ...formData, animators: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-show_program">Шоу/Программа</Label>
                  <Input
                    id="edit-show_program"
                    value={formData.show_program}
                    onChange={(e) => setFormData({ ...formData, show_program: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contractors">Подрядчики</Label>
                  <Input
                    id="edit-contractors"
                    value={formData.contractors}
                    onChange={(e) => setFormData({ ...formData, contractors: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-photo_video">Фото/Видео</Label>
                  <Input
                    id="edit-photo_video"
                    value={formData.photo_video}
                    onChange={(e) => setFormData({ ...formData, photo_video: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Примечания</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Сохранить
                </Button>
                {editingEvent && ((editingEvent.created_by === user?.id && hasPermission('events.delete_own')) || hasPermission('events.delete_all')) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteEvent}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Общее количество праздников */}
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Всего праздников</h3>
        </div>
        <div className="text-2xl font-bold">{events.length}</div>
        <p className="text-xs text-muted-foreground">
          Мероприятий в системе
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
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortEvents(filterEvents(events)).map((event) => (
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
      ) : (
        <div className="space-y-2">
          {sortEvents(filterEvents(events)).map((event) => (
            <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEditEvent(event)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold truncate">{event.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {formatDate(event.start_date)}
                            {event.event_time && ` в ${event.event_time.slice(0, 5)}`}
                          </div>
                          {event.project_owner && (
                            <div>Проект: {event.project_owner}</div>
                          )}
                          {event.location && (
                            <div>Место: {event.location}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={getStatusColor(event.status)}>
                      {getStatusLabel(event.status)}
                    </Badge>
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;