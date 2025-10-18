import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Clock, Trash2, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [showMap, setShowMap] = useState(false);
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

  const toggleMap = () => {
    let address = formData.location;
    
    // Если адрес не указан напрямую, попробуем взять из выбранной площадки
    if (!address && formData.venue_id) {
      const selectedVenue = venues.find(v => v.id === formData.venue_id);
      address = selectedVenue?.address || "";
    }

    if (!address) {
      toast({
        variant: "destructive",
        title: "Адрес не указан",
        description: "Укажите адрес или выберите площадку с адресом",
      });
      return;
    }

    setShowMap(!showMap);
  };

  const getMapAddress = () => {
    let address = formData.location;
    if (!address && formData.venue_id) {
      const selectedVenue = venues.find(v => v.id === formData.venue_id);
      address = selectedVenue?.address || "";
    }
    return address;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg">
            {event ? "Редактировать мероприятие" : "Создать мероприятие"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4">
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? (
                      format(new Date(formData.start_date), "d MMMM yyyy г.", { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => setFormData({ 
                      ...formData, 
                      start_date: date ? format(date, 'yyyy-MM-dd') : '' 
                    })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="venue_id">Площадка</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => window.open('/contacts?tab=venues', '_blank')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Создать
                </Button>
              </div>
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Адрес (если не из базы)</Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={showMap ? "default" : "outline"}
                  size="icon"
                  onClick={toggleMap}
                  title="Показать на карте"
                  disabled={!formData.location && !formData.venue_id}
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {showMap && getMapAddress() && (
                <div className="mt-2 rounded-lg overflow-hidden border">
                  <iframe
                    src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(getMapAddress())}&z=16`}
                    width="100%"
                    height="300"
                    frameBorder="0"
                    allowFullScreen
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_time">Время начала</Label>
              <Input
                id="event_time"
                type="time"
                value={formData.event_time ? formData.event_time.substring(0, 5) : ""}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Время окончания</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time ? formData.end_time.substring(0, 5) : ""}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full"
              />
            </div>
          </div>

          {/* Team Selection */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Команда</h3>
            
            <div className="space-y-2">
              <Label className="text-sm">Менеджеры</Label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {employees.map((emp) => (
                  <Button
                    key={emp.id}
                    type="button"
                    variant={formData.manager_ids.includes(emp.id) ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2"
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
              <div className="flex items-center justify-between">
                <Label className="text-sm">Аниматоры</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => window.open('/contacts?tab=animators', '_blank')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Создать
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {animators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет аниматоров</p>
                ) : (
                  animators.map((animator) => (
                    <Button
                      key={animator.id}
                      type="button"
                      variant={formData.animator_ids.includes(animator.id) ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setFormData({
                        ...formData,
                        animator_ids: toggleArrayItem(formData.animator_ids, animator.id)
                      })}
                    >
                      {animator.name}
                    </Button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Подрядчики</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => window.open('/contacts?tab=contractors', '_blank')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Создать
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {contractors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет подрядчиков</p>
                ) : (
                  contractors.map((contractor) => (
                    <Button
                      key={contractor.id}
                      type="button"
                      variant={formData.contractor_ids.includes(contractor.id) ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setFormData({
                        ...formData,
                        contractor_ids: toggleArrayItem(formData.contractor_ids, contractor.id)
                      })}
                    >
                      {contractor.name}
                    </Button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="show_program">Шоу программа</Label>
              <Input
                id="show_program"
                value={formData.show_program}
                onChange={(e) => setFormData({ ...formData, show_program: e.target.value })}
              />
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="photographer_contact_id">Фотограф</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => window.open('/contacts?tab=clients', '_blank')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Создать
                </Button>
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="videographer_contact_id">Видеограф</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => window.open('/contacts?tab=clients', '_blank')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Создать
                </Button>
              </div>
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
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 bg-background">
          <div>
            {event && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="w-full sm:w-auto"
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
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !formData.name || !formData.start_date}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;
