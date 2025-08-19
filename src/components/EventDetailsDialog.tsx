import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarIcon, Edit, Save, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  event_time?: string | null;
  location?: string | null;
  status: string;
  notes?: string | null;
  project_owner?: string | null;
  venue_id?: string | null;
  contractor_ids?: string[] | null;
  responsible_manager_ids?: string[] | null;
  manager_ids?: string[] | null;
  photos?: string[] | null;
  videos?: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface EventDetailsDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
}

const EventDetailsDialog = ({ event, open, onOpenChange, onEventUpdated }: EventDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (event) {
      setEditedEvent({ ...event });
    }
  }, [event]);

  const handleSave = async () => {
    if (!editedEvent) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          name: editedEvent.name,
          description: editedEvent.description,
          start_date: editedEvent.start_date,
          event_time: editedEvent.event_time,
          location: editedEvent.location,
          status: editedEvent.status,
          notes: editedEvent.notes,
          project_owner: editedEvent.project_owner,
        })
        .eq("id", editedEvent.id);

      if (error) throw error;

      toast({
        title: "Мероприятие обновлено",
        description: "Изменения успешно сохранены",
      });

      setIsEditing(false);
      onEventUpdated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось загрузить данные мероприятия",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedEvent(event ? { ...event } : null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!event) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: "Мероприятие удалено",
        description: "Мероприятие успешно удалено",
      });

      onOpenChange(false);
      onEventUpdated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить мероприятие",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!event || !editedEvent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{event.name}</span>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить мероприятие</AlertDialogTitle>
                        <AlertDialogDescription>
                          Вы уверены, что хотите удалить мероприятие "{event.name}"? Это действие нельзя отменить.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label>Название мероприятия</Label>
              {isEditing ? (
                <Input
                  value={editedEvent.name}
                  onChange={(e) => setEditedEvent({ ...editedEvent, name: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.name}</p>
              )}
            </div>

            <div>
              <Label>Описание</Label>
              {isEditing ? (
                <Textarea
                  value={editedEvent.description || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.description || "Не указано"}</p>
              )}
            </div>

            <div>
              <Label>Локация</Label>
              {isEditing ? (
                <Input
                  value={editedEvent.location || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.location || "Не указано"}</p>
              )}
            </div>

            <div>
              <Label>Статус</Label>
              {isEditing ? (
                <select
                  className="w-full p-2 border rounded"
                  value={editedEvent.status}
                  onChange={(e) => setEditedEvent({ ...editedEvent, status: e.target.value })}
                >
                  <option value="planning">Планирование</option>
                  <option value="confirmed">Подтверждено</option>
                  <option value="in_progress">В процессе</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">{event.status}</p>
              )}
            </div>
          </div>

          {/* Dates and Times */}
          <div className="space-y-4">
            <div>
              <Label>Дата начала</Label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editedEvent.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedEvent.start_date ? (
                        format(new Date(editedEvent.start_date), "PPP", { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editedEvent.start_date ? new Date(editedEvent.start_date) : undefined}
                      onSelect={(date) => 
                        setEditedEvent({ 
                          ...editedEvent, 
                          start_date: date ? date.toISOString().split('T')[0] : "" 
                        })
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.start_date), "PPP", { locale: ru })}
                </p>
              )}
            </div>

            <div>
              <Label>Владелец проекта</Label>
              {isEditing ? (
                <Input
                  value={editedEvent.project_owner || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, project_owner: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.project_owner || "Не указано"}</p>
              )}
            </div>

            <div>
              <Label>Время мероприятия</Label>
              {isEditing ? (
                <Input
                  type="time"
                  value={editedEvent.event_time || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, event_time: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.event_time || "Не указано"}</p>
              )}
            </div>

            <div>
              <Label>Заметки</Label>
              {isEditing ? (
                <Textarea
                  value={editedEvent.notes || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.notes || "Нет заметок"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Event Information */}
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {event.contractor_ids && event.contractor_ids.length > 0 && (
              <span>Подрядчики: {event.contractor_ids.length} выбрано</span>
            )}
            {event.responsible_manager_ids && event.responsible_manager_ids.length > 0 && (
              <span className="ml-4">Ответственные: {event.responsible_manager_ids.length} назначено</span>
            )}
            {event.manager_ids && event.manager_ids.length > 0 && (
              <span className="ml-4">Менеджеры: {event.manager_ids.length} назначено</span>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;