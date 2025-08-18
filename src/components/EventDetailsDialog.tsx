import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit, Save, X } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatCurrency";

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
          end_date: editedEvent.end_date,
          event_time: editedEvent.event_time,
          location: editedEvent.location,
          budget: editedEvent.budget,
          actual_cost: editedEvent.actual_cost,
          status: editedEvent.status,
          notes: editedEvent.notes,
          show_program: editedEvent.show_program,
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
        description: error.message || "Не удалось сохранить изменения",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedEvent(event ? { ...event } : null);
    setIsEditing(false);
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Редактировать
                </Button>
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
              <Label>Дата окончания</Label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editedEvent.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedEvent.end_date ? (
                        format(new Date(editedEvent.end_date), "PPP", { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editedEvent.end_date ? new Date(editedEvent.end_date) : undefined}
                      onSelect={(date) => 
                        setEditedEvent({ 
                          ...editedEvent, 
                          end_date: date ? date.toISOString().split('T')[0] : "" 
                        })
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.end_date), "PPP", { locale: ru })}
                </p>
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
              <Label>Бюджет</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedEvent.budget}
                  onChange={(e) => setEditedEvent({ ...editedEvent, budget: Number(e.target.value) })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{formatCurrency(event.budget)}</p>
              )}
            </div>

            <div>
              <Label>Фактические затраты</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedEvent.actual_cost || 0}
                  onChange={(e) => setEditedEvent({ ...editedEvent, actual_cost: Number(e.target.value) })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{formatCurrency(event.actual_cost || 0)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4 mt-6">
          <div>
            <Label>Шоу программа</Label>
            {isEditing ? (
              <Textarea
                value={editedEvent.show_program || ""}
                onChange={(e) => setEditedEvent({ ...editedEvent, show_program: e.target.value })}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{event.show_program || "Не указано"}</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;