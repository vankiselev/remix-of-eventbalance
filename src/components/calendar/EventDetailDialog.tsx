import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface Event {
  id: string;
  name: string;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  project_owner: string | null;
  venue_id: string | null;
  manager_ids: string[] | null;
  animator_ids: string[] | null;
  contractor_ids: string[] | null;
  photographer_contact_id: string | null;
  videographer_contact_id: string | null;
  show_program: string | null;
  notes: string | null;
  location: string | null;
}

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  defaultDate?: Date;
}

const EventDetailDialog = ({ event, open, onOpenChange, onSave, defaultDate }: EventDetailDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [animators, setAnimators] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    event_time: "",
    end_time: "",
    project_owner: "",
    venue_id: "",
    location: "",
    manager_ids: [] as string[],
    animator_ids: [] as string[],
    contractor_ids: [] as string[],
    photographer_contact_id: "",
    videographer_contact_id: "",
    show_program: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (event) {
        setFormData({
          name: event.name || "",
          start_date: event.start_date || "",
          event_time: event.event_time || "",
          end_time: event.end_time || "",
          project_owner: event.project_owner || "",
          venue_id: event.venue_id || "",
          location: event.location || "",
          manager_ids: event.manager_ids || [],
          animator_ids: event.animator_ids || [],
          contractor_ids: event.contractor_ids || [],
          photographer_contact_id: event.photographer_contact_id || "",
          videographer_contact_id: event.videographer_contact_id || "",
          show_program: event.show_program || "",
          notes: event.notes || "",
        });
      } else if (defaultDate) {
        setFormData(prev => ({
          ...prev,
          start_date: format(defaultDate, 'yyyy-MM-dd'),
        }));
      }
    }
  }, [event, open, defaultDate]);

  const loadData = async () => {
    try {
      const [venuesRes, animatorsRes, contractorsRes, employeesRes, clientsRes] = await Promise.all([
        supabase.from("venues").select("*").order("name"),
        supabase.from("animators").select("*").order("name"),
        supabase.from("contractors").select("*").order("name"),
        supabase.from("profiles").select("id, full_name").eq("employment_status", "active").order("full_name"),
        supabase.from("clients").select("*").order("name"),
      ]);

      if (venuesRes.data) setVenues(venuesRes.data);
      if (animatorsRes.data) setAnimators(animatorsRes.data);
      if (contractorsRes.data) setContractors(contractorsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (clientsRes.data) setContacts(clientsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        event_time: formData.event_time || null,
        end_time: formData.end_time || null,
        venue_id: formData.venue_id || null,
        photographer_contact_id: formData.photographer_contact_id || null,
        videographer_contact_id: formData.videographer_contact_id || null,
        show_program: formData.show_program || null,
        notes: formData.notes || null,
        created_by: user.id,
      };

      let result;
      if (event) {
        result = await supabase
          .from("events")
          .update(eventData)
          .eq("id", event.id);
      } else {
        result = await supabase
          .from("events")
          .insert(eventData);
      }

      if (result.error) throw result.error;

      toast({
        title: "Успешно!",
        description: event ? "Мероприятие обновлено" : "Мероприятие создано",
      });

      onSave();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось сохранить мероприятие",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("Вы уверены, что хотите удалить это мероприятие?")) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Мероприятие удалено",
      });

      onSave();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить мероприятие",
      });
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? "Редактировать мероприятие" : "Создать мероприятие"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название мероприятия *</Label>
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
              <Label htmlFor="project_owner">Чей проект</Label>
              <Select
                value={formData.project_owner}
                onValueChange={(value) => setFormData({ ...formData, project_owner: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите владельца" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Настя">Настя</SelectItem>
                  <SelectItem value="Лера">Лера</SelectItem>
                  <SelectItem value="Ваня">Ваня</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_id">Площадка</Label>
              <Select
                value={formData.venue_id}
                onValueChange={(value) => setFormData({ ...formData, venue_id: value })}
              >
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Адрес (если не из базы)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

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

          {/* Team Selection */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Команда</h3>
            
            <div className="space-y-2">
              <Label>Менеджеры</Label>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp) => (
                  <Button
                    key={emp.id}
                    type="button"
                    variant={formData.manager_ids.includes(emp.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      manager_ids: toggleArrayItem(formData.manager_ids, emp.id)
                    })}
                  >
                    {emp.full_name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Аниматоры</Label>
              <div className="flex flex-wrap gap-2">
                {animators.map((animator) => (
                  <Button
                    key={animator.id}
                    type="button"
                    variant={formData.animator_ids.includes(animator.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      animator_ids: toggleArrayItem(formData.animator_ids, animator.id)
                    })}
                  >
                    {animator.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Подрядчики</Label>
              <div className="flex flex-wrap gap-2">
                {contractors.map((contractor) => (
                  <Button
                    key={contractor.id}
                    type="button"
                    variant={formData.contractor_ids.includes(contractor.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      contractor_ids: toggleArrayItem(formData.contractor_ids, contractor.id)
                    })}
                  >
                    {contractor.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="photographer_contact_id">Фотограф</Label>
              <Select
                value={formData.photographer_contact_id}
                onValueChange={(value) => setFormData({ ...formData, photographer_contact_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите фотографа" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videographer_contact_id">Видеограф</Label>
              <Select
                value={formData.videographer_contact_id}
                onValueChange={(value) => setFormData({ ...formData, videographer_contact_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите видеографа" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="show_program">Шоу программа</Label>
              <Input
                id="show_program"
                value={formData.show_program}
                onChange={(e) => setFormData({ ...formData, show_program: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <div>
              {event && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !formData.name || !formData.start_date}
              >
                {loading ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;
