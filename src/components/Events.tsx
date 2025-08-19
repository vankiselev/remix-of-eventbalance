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
import { Plus, CalendarIcon, DollarSign, Eye } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import EventDetailsDialog from "@/components/EventDetailsDialog";

interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  event_time: string;
  location: string;
  budget: number;
  actual_cost: number;
  status: string;
  notes: string;
  show_program: string;
  project_owner: string;
  created_at: string;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    budget: "",
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
        end_date: formData.end_date,
        budget: parseFloat(formData.budget),
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

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleEventUpdated = () => {
    fetchEvents();
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
              <Button type="submit" className="w-full">
                Создать мероприятие
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-2">{event.name}</CardTitle>
                  <Badge className={getStatusColor(event.status)}>
                    {getStatusLabel(event.status)}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(event.start_date)} - {formatDate(event.end_date)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <DollarSign className="mr-1 h-4 w-4" />
                    {formatCurrency(event.budget)}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewEvent(event)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Просмотр
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEvent}
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  );
};

export default Events;