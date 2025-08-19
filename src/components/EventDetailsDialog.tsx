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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Edit, Save, X, Trash2, Plus } from "lucide-react";
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
  end_time?: string | null;
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

interface Contractor {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
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
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [selectedResponsibleManagers, setSelectedResponsibleManagers] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (event) {
      setEditedEvent({ ...event });
      setSelectedContractors(event.contractor_ids || []);
      setSelectedResponsibleManagers(event.responsible_manager_ids || []);
      setSelectedManagers(event.manager_ids || []);
    }
  }, [event]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [contractorsRes, venuesRes, employeesRes] = await Promise.all([
        supabase.from("contractors").select("id, name"),
        supabase.from("venues").select("id, name"),
        supabase.rpc("get_admin_profiles").select("id, full_name")
      ]);

      if (contractorsRes.data) setContractors(contractorsRes.data);
      if (venuesRes.data) setVenues(venuesRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

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
          end_time: editedEvent.end_time,
          location: editedEvent.location,
          status: editedEvent.status,
          notes: editedEvent.notes,
          project_owner: editedEvent.project_owner,
          venue_id: editedEvent.venue_id,
          contractor_ids: selectedContractors,
          responsible_manager_ids: selectedResponsibleManagers,
          manager_ids: selectedManagers,
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
        description: error.message || "Не удалось обновить мероприятие",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedEvent(event ? { ...event } : null);
    setSelectedContractors(event?.contractor_ids || []);
    setSelectedResponsibleManagers(event?.responsible_manager_ids || []);
    setSelectedManagers(event?.manager_ids || []);
    setIsEditing(false);
  };

  const toggleSelection = (id: string, selectedList: string[], setSelectedList: (list: string[]) => void) => {
    if (selectedList.includes(id)) {
      setSelectedList(selectedList.filter(item => item !== id));
    } else {
      setSelectedList([...selectedList, id]);
    }
  };

  const getNameById = (id: string, type: 'contractor' | 'venue' | 'employee') => {
    switch (type) {
      case 'contractor':
        return contractors.find(c => c.id === id)?.name || id;
      case 'venue':
        return venues.find(v => v.id === id)?.name || id;
      case 'employee':
        return employees.find(e => e.id === id)?.full_name || id;
      default:
        return id;
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <Label>Описание (Шоу-программа)</Label>
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
              <Label>Статус</Label>
              {isEditing ? (
                <Select value={editedEvent.status} onValueChange={(value) => setEditedEvent({ ...editedEvent, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Планирование</SelectItem>
                    <SelectItem value="confirmed">Подтверждено</SelectItem>
                    <SelectItem value="in_progress">В процессе</SelectItem>
                    <SelectItem value="completed">Завершено</SelectItem>
                    <SelectItem value="cancelled">Отменено</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{event.status}</p>
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

          {/* Dates, Times and Location */}
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
              <Label>Время начала</Label>
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
              <Label>Время окончания</Label>
              {isEditing ? (
                <Input
                  type="time"
                  value={editedEvent.end_time || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, end_time: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.end_time || "Не указано"}</p>
              )}
            </div>

            <div>
              <Label>Площадка (место проведения)</Label>
              {isEditing ? (
                <Select value={editedEvent.venue_id || ""} onValueChange={(value) => setEditedEvent({ ...editedEvent, venue_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите площадку" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {event.venue_id ? getNameById(event.venue_id, 'venue') : "Не указано"}
                </p>
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

          {/* Team and Contractors */}
          <div className="space-y-4">
            <div>
              <Label>Подрядчики (Шоу-программа)</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {contractors.map((contractor) => (
                      <div key={contractor.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedContractors.includes(contractor.id)}
                          onChange={() => toggleSelection(contractor.id, selectedContractors, setSelectedContractors)}
                        />
                        <span className="text-sm">{contractor.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedContractors.map(id => (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {getNameById(id, 'contractor')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {event.contractor_ids?.length ? (
                    event.contractor_ids.map(id => (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {getNameById(id, 'contractor')}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Не назначено</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Ответственный менеджер</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedResponsibleManagers.includes(employee.id)}
                          onChange={() => toggleSelection(employee.id, selectedResponsibleManagers, setSelectedResponsibleManagers)}
                        />
                        <span className="text-sm">{employee.full_name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedResponsibleManagers.map(id => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {getNameById(id, 'employee')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {event.responsible_manager_ids?.length ? (
                    event.responsible_manager_ids.map(id => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {getNameById(id, 'employee')}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Не назначено</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Менеджеры</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedManagers.includes(employee.id)}
                          onChange={() => toggleSelection(employee.id, selectedManagers, setSelectedManagers)}
                        />
                        <span className="text-sm">{employee.full_name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedManagers.map(id => (
                      <Badge key={id} variant="default" className="text-xs">
                        {getNameById(id, 'employee')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {event.manager_ids?.length ? (
                    event.manager_ids.map(id => (
                      <Badge key={id} variant="default" className="text-xs">
                        {getNameById(id, 'employee')}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Не назначено</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;