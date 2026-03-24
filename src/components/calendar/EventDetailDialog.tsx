// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileInput } from "@/components/ui/file-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Clock, Trash2, MapPin, Plus, File, Users, Camera, Video, FileText, StickyNote, Sparkles, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { TimePicker } from "@/components/ui/time-picker";
import { QuickCreateDialog } from "@/components/ui/quick-create-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { EventActionRequestDialog } from "@/components/events/EventActionRequestDialog";
import { useVacationConflicts, VacationConflict } from "@/hooks/useVacationConflicts";
import { VacationConflictBadge } from "./VacationConflictBadge";
import { VacationConflictDialog } from "./VacationConflictDialog";
import { EventPropsTab } from "./EventPropsTab";

interface Event {
  id: string;
  name: string;
  start_date: string;
  event_time: string | null;
  end_time: string | null;
  project_owner: string | null;
  venue_id: string | null;
  client_id: string | null;
  responsible_manager_ids: string[] | null;
  manager_ids: string[] | null;
  animator_ids: string[] | null;
  contractor_ids: string[] | null;
  photographer_contact_id: string | null;
  videographer_contact_id: string | null;
  show_program: string | null;
  notes: string | null;
  location: string | null;
  estimate_file_url: string | null;
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
  const { hasPermission } = useUserPermissions();
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [animators, setAnimators] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [estimateFile, setEstimateFile] = useState<File | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [quickCreate, setQuickCreate] = useState<{ open: boolean; type: 'client' | 'venue' | 'animator' | 'contractor' }>({ open: false, type: 'client' });
  const [actionRequestDialog, setActionRequestDialog] = useState<{ open: boolean; type: 'delete' | 'cancel' | null }>({
    open: false,
    type: null,
  });
  const [vacationConflicts, setVacationConflicts] = useState<Map<string, VacationConflict>>(new Map());
  const [selectedConflictEmployee, setSelectedConflictEmployee] = useState<{
    id: string;
    name: string;
    conflict: VacationConflict;
    listType: 'responsible_manager_ids' | 'manager_ids';
  } | null>(null);
  const { checkConflicts } = useVacationConflicts();

  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    event_time: "",
    end_time: "",
    project_owner: "",
    venue_id: "",
    client_id: "",
    responsible_manager_ids: [] as string[],
    location: "",
    manager_ids: [] as string[],
    animator_ids: [] as string[],
    contractor_ids: [] as string[],
    photographer_contact_id: "",
    videographer_contact_id: "",
    show_program: "",
    notes: "",
    estimate_file_url: "",
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
          client_id: event.client_id || "",
          responsible_manager_ids: event.responsible_manager_ids || [],
          location: event.location || "",
          manager_ids: event.manager_ids || [],
          animator_ids: event.animator_ids || [],
          contractor_ids: event.contractor_ids || [],
          photographer_contact_id: event.photographer_contact_id || "",
          videographer_contact_id: event.videographer_contact_id || "",
          show_program: event.show_program || "",
          notes: event.notes || "",
          estimate_file_url: event.estimate_file_url || "",
        });
      } else if (defaultDate) {
        setFormData(prev => ({
          ...prev,
          start_date: format(defaultDate, 'yyyy-MM-dd'),
        }));
      }
    }
  }, [event, open, defaultDate]);

  // Check vacation conflicts when date or managers change
  useEffect(() => {
    if (formData.start_date && open) {
      const managerIds = [
        ...formData.responsible_manager_ids,
        ...formData.manager_ids,
      ];
      
      if (managerIds.length > 0) {
        checkConflicts(formData.start_date, managerIds).then((conflicts) => {
          setVacationConflicts(conflicts);
        });
      } else {
        setVacationConflicts(new Map());
      }
    }
  }, [formData.start_date, formData.responsible_manager_ids, formData.manager_ids, open, checkConflicts]);

  const loadData = async () => {
    try {
      const [venuesRes, animatorsRes, contractorsRes, employeesRes, clientsRes] = await Promise.all([
        supabase.from("venues").select("*").order("name"),
        supabase.from("animators").select("*").order("name"),
        supabase.from("contractors").select("*").order("name"),
        supabase.from("profiles").select("id, full_name, avatar_url").eq("employment_status", "active").order("full_name"),
        supabase.from("clients").select("*").order("name"),
      ]);

      if (venuesRes.data) setVenues(venuesRes.data);
      if (animatorsRes.data) setAnimators(animatorsRes.data);
      if (contractorsRes.data) setContractors(contractorsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Check for vacation conflicts before saving
    const allManagerIds = [
      ...formData.responsible_manager_ids,
      ...formData.manager_ids,
    ];
    
    const conflictedManagers: string[] = [];
    allManagerIds.forEach((managerId) => {
      if (vacationConflicts.has(managerId)) {
        const emp = employees.find((e) => e.id === managerId);
        if (emp) {
          conflictedManagers.push(emp.full_name);
        }
      }
    });

    if (conflictedManagers.length > 0) {
      const confirmed = confirm(
        `⚠️ Следующие менеджеры имеют конфликты с отпусками:\n\n${conflictedManagers.map((name) => `• ${name}`).join('\n')}\n\nСохранить мероприятие?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);
    try {
      let estimateFileUrl = formData.estimate_file_url;

      // Upload file if new file selected
      if (estimateFile) {
        setUploadingFile(true);
        const fileExt = estimateFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('estimate-files')
          .upload(filePath, estimateFile, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('estimate-files')
          .getPublicUrl(filePath);

        estimateFileUrl = publicUrl;
        setUploadingFile(false);
      }

      const eventData = {
        ...formData,
        event_time: formData.event_time || null,
        end_time: formData.end_time || null,
        venue_id: formData.venue_id || null,
        client_id: formData.client_id || null,
        responsible_manager_ids: formData.responsible_manager_ids.length > 0 ? formData.responsible_manager_ids : null,
        photographer_contact_id: formData.photographer_contact_id || null,
        videographer_contact_id: formData.videographer_contact_id || null,
        show_program: formData.show_program || null,
        notes: formData.notes || null,
        estimate_file_url: estimateFileUrl || null,
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
      setUploadingFile(false);
    }
  };

  const handleCancel = async () => {
    if (!event || !confirm("Вы уверены, что хотите отменить это мероприятие? Всем участникам будет отправлено уведомление.")) return;

    try {
      // Update event status to cancelled
      const { error } = await supabase
        .from("events")
        .update({ status: 'cancelled' })
        .eq("id", event.id);

      if (error) throw error;

      // Collect all participant IDs
      const participantIds = new Set<string>();
      
      if (event.manager_ids) {
        event.manager_ids.forEach((id) => participantIds.add(id));
      }
      if (event.responsible_manager_ids) {
        event.responsible_manager_ids.forEach((id) => participantIds.add(id));
      }
      if (event.animator_ids) {
        event.animator_ids.forEach((id) => participantIds.add(id));
      }

      // Send notifications to all participants
      if (participantIds.size > 0) {
        await supabase.functions.invoke('send-event-notification', {
          body: {
            event_id: event.id,
            event_name: event.name,
            action: 'cancelled',
            participant_ids: Array.from(participantIds),
            event_date: event.start_date,
            event_time: event.event_time,
            location: event.location,
          },
        });
      }

      toast({
        title: "Успешно!",
        description: "Мероприятие отменено, уведомления отправлены участникам",
      });

      onSave();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось отменить мероприятие",
      });
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
       <DialogContent className="w-[95vw] max-w-2xl h-[85vh] sm:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0 bg-muted/30">
          <DialogTitle className="text-base sm:text-lg font-semibold pr-8">
            {event ? "Редактировать мероприятие" : "Новое мероприятие"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 sm:mx-6 mt-2 sm:mt-3 mb-1">
            <TabsTrigger value="details" className="text-[13px] sm:text-sm">Основное</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-4 sm:space-y-5 pt-2">
              
              {/* ═══ Основная информация ═══ */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-foreground tracking-wide flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Основная информация
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-sm font-medium">Название *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Название мероприятия"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Дата *</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
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
                          onSelect={(date) => {
                            setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' });
                            setDatePickerOpen(false);
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          locale={ru}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Чей проект</Label>
                    <Select
                      value={formData.project_owner}
                      onValueChange={(value) => setFormData({ ...formData, project_owner: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Владелец" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background">
                        <SelectItem value="Ваня">Ваня</SelectItem>
                        <SelectItem value="Настя">Настя</SelectItem>
                        <SelectItem value="Лера">Лера</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Клиент</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate({ open: true, type: 'client' })}>
                        <Plus className="h-3 w-3 mr-0.5" /> Создать
                      </Button>
                    </div>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Выберите клиента" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator className="my-1" />

              {/* ═══ Место и время ═══ */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-foreground tracking-wide flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Место и время
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Площадка</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate({ open: true, type: 'venue' })}>
                        <Plus className="h-3 w-3 mr-0.5" /> Создать
                      </Button>
                    </div>
                    <Select value={formData.venue_id} onValueChange={(value) => setFormData({ ...formData, venue_id: value })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Выберите площадку" /></SelectTrigger>
                      <SelectContent>
                        {venues.map((venue) => (
                          <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Адрес</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Или введите адрес вручную"
                        className="flex-1 h-9"
                      />
                      <Button
                        type="button"
                        variant={showMap ? "default" : "outline"}
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={toggleMap}
                        title="Показать на карте"
                        disabled={!formData.location && !formData.venue_id}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {showMap && getMapAddress() && (
                    <div className="md:col-span-2 rounded-lg overflow-hidden border">
                      <iframe
                        src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(getMapAddress())}&z=16`}
                        width="100%" height="220" frameBorder="0" allowFullScreen className="w-full"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Начало</Label>
                    <TimePicker
                      value={formData.event_time}
                      onChange={(v) => setFormData({ ...formData, event_time: v })}
                      placeholder="Время начала"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Окончание</Label>
                    <TimePicker
                      value={formData.end_time}
                      onChange={(v) => setFormData({ ...formData, end_time: v })}
                      placeholder="Время окончания"
                    />
                  </div>
                </div>
              </section>

              <Separator className="my-1" />

              {/* ═══ Команда ═══ */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-foreground tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Команда
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Ответственные менеджеры</Label>
                    <SearchableMultiSelect
                      options={employees.map((e) => ({ id: e.id, label: e.full_name, avatarUrl: e.avatar_url }))}
                      showAvatars
                      selected={formData.responsible_manager_ids}
                      onChange={(ids) => setFormData({ ...formData, responsible_manager_ids: ids })}
                      placeholder="Поиск менеджеров..."
                      emptyText="Нет сотрудников"
                      renderOptionExtra={(opt) => {
                        const conflict = vacationConflicts.get(opt.id);
                        return conflict ? <VacationConflictBadge conflict={conflict} /> : null;
                      }}
                      getOptionClassName={(opt) => vacationConflicts.has(opt.id) ? "border-l-2 border-l-destructive" : ""}
                      onConflictClick={(opt) => {
                        const conflict = vacationConflicts.get(opt.id);
                        if (conflict) {
                          setSelectedConflictEmployee({
                            id: opt.id,
                            name: opt.label,
                            conflict,
                            listType: 'responsible_manager_ids',
                          });
                          return true;
                        }
                        return false;
                      }}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Менеджеры</Label>
                    <SearchableMultiSelect
                      options={employees.map((e) => ({ id: e.id, label: e.full_name, avatarUrl: e.avatar_url }))}
                      showAvatars
                      selected={formData.manager_ids}
                      onChange={(ids) => setFormData({ ...formData, manager_ids: ids })}
                      placeholder="Поиск менеджеров..."
                      emptyText="Нет сотрудников"
                      renderOptionExtra={(opt) => {
                        const conflict = vacationConflicts.get(opt.id);
                        return conflict ? <VacationConflictBadge conflict={conflict} /> : null;
                      }}
                      getOptionClassName={(opt) => vacationConflicts.has(opt.id) ? "border-l-2 border-l-destructive" : ""}
                      onConflictClick={(opt) => {
                        const conflict = vacationConflicts.get(opt.id);
                        if (conflict) {
                          setSelectedConflictEmployee({
                            id: opt.id,
                            name: opt.label,
                            conflict,
                            listType: 'manager_ids',
                          });
                          return true;
                        }
                        return false;
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Аниматоры</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate({ open: true, type: 'animator' })}>
                        <Plus className="h-3 w-3 mr-0.5" /> Создать
                      </Button>
                    </div>
                    <SearchableMultiSelect
                      options={animators.map((a) => ({ id: a.id, label: a.name }))}
                      selected={formData.animator_ids}
                      onChange={(ids) => setFormData({ ...formData, animator_ids: ids })}
                      placeholder="Поиск аниматоров..."
                      emptyText="Нет аниматоров"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Подрядчики</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate({ open: true, type: 'contractor' })}>
                        <Plus className="h-3 w-3 mr-0.5" /> Создать
                      </Button>
                    </div>
                    <SearchableMultiSelect
                      options={contractors.map((c) => ({ id: c.id, label: c.name }))}
                      selected={formData.contractor_ids}
                      onChange={(ids) => setFormData({ ...formData, contractor_ids: ids })}
                      placeholder="Поиск подрядчиков..."
                      emptyText="Нет подрядчиков"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Шоу программа</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate({ open: true, type: 'contractor' })}>
                        <Plus className="h-3 w-3 mr-0.5" /> Создать
                      </Button>
                    </div>
                    <Input
                      value={formData.show_program}
                      onChange={(e) => setFormData({ ...formData, show_program: e.target.value })}
                      placeholder="Описание шоу программы"
                      className="h-9"
                    />
                  </div>
                </div>
              </section>

              <Separator className="my-1" />

              {/* ═══ Дополнительно ═══ */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-foreground tracking-wide flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" />
                  Дополнительно
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Camera className="h-3 w-3" /> Фотограф
                      </Label>
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate({ open: true, type: 'contractor' })}>
                        <Plus className="h-3 w-3 mr-0.5" /> Создать
                      </Button>
                    </div>
                    <Select value={formData.photographer_contact_id} onValueChange={(value) => setFormData({ ...formData, photographer_contact_id: value })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Выберите фотографа" /></SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Video className="h-3 w-3" /> Видеограф
                      </Label>
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate({ open: true, type: 'contractor' })}>
                        <Plus className="h-3 w-3 mr-0.5" /> Создать
                      </Button>
                    </div>
                    <Select value={formData.videographer_contact_id} onValueChange={(value) => setFormData({ ...formData, videographer_contact_id: value })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Выберите видеографа" /></SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-sm font-medium">Примечания</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Любые заметки..."
                      className="resize-none text-sm"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Смета
                    </Label>
                    <FileInput
                      id="estimate_file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                      maxSize={10}
                      value={estimateFile}
                      onChange={(file) => setEstimateFile(file as File | null)}
                      placeholder="Выберите файл сметы"
                    />
                    {formData.estimate_file_url && !estimateFile && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/40">
                        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a href={formData.estimate_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-medium">
                            Открыть текущую смету →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

            </div>
          </TabsContent>

          {/* <TabsContent value="props" className="flex-1 overflow-y-auto px-4 sm:px-6 mt-4">
            <EventPropsTab
              eventId={event?.id || null}
              eventName={formData.name}
              eventDate={formData.start_date}
            />
          </TabsContent> */}
        </Tabs>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-t flex-shrink-0 bg-muted/20"
          style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex gap-1.5 sm:gap-2">
            {event && (
              <>
                {hasPermission('events.delete') ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="flex-1 sm:flex-none h-9 text-[12px] sm:text-sm border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 touch-manipulation"
                    >
                      Отменить
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      className="flex-1 sm:flex-none h-9 text-[12px] sm:text-sm touch-manipulation"
                    >
                      <Trash2 className="mr-1 sm:mr-2 h-3.5 w-3.5" />
                      Удалить
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionRequestDialog({ open: true, type: 'cancel' })}
                      className="flex-1 sm:flex-none h-9 text-[12px] sm:text-sm border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 touch-manipulation"
                    >
                      Запрос отмены
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionRequestDialog({ open: true, type: 'delete' })}
                      className="flex-1 sm:flex-none h-9 text-[12px] sm:text-sm touch-manipulation"
                    >
                      <Trash2 className="mr-1 sm:mr-2 h-3.5 w-3.5" />
                      Запрос удаления
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none h-9 text-[13px] sm:text-sm touch-manipulation"
            >
              Закрыть
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || uploadingFile || !formData.name || !formData.start_date}
              size="sm"
              className="flex-1 sm:flex-none h-9 text-[13px] sm:text-sm touch-manipulation"
            >
              {loading || uploadingFile ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Action Request Dialog */}
      {event && actionRequestDialog.type && (
        <EventActionRequestDialog
          open={actionRequestDialog.open}
          onOpenChange={(open) => setActionRequestDialog({ open, type: null })}
          eventId={event.id}
          eventName={event.name}
          actionType={actionRequestDialog.type}
        />
      )}

      {/* Vacation Conflict Dialog */}
      <VacationConflictDialog
        open={selectedConflictEmployee !== null}
        onOpenChange={(open) => !open && setSelectedConflictEmployee(null)}
        employee={selectedConflictEmployee}
        onConfirm={() => {
          if (selectedConflictEmployee) {
            const { id, listType } = selectedConflictEmployee;
            
            setFormData({
              ...formData,
              [listType]: [...formData[listType], id],
            });
            
            setSelectedConflictEmployee(null);
          }
        }}
      />

      {/* Quick Create Dialog */}
      <QuickCreateDialog
        type={quickCreate.type}
        open={quickCreate.open}
        onOpenChange={(open) => setQuickCreate({ ...quickCreate, open })}
        onCreated={(entity) => {
          // Refresh data and auto-select the new entity
          loadData().then(() => {
            switch (quickCreate.type) {
              case 'client':
                setFormData((prev) => ({ ...prev, client_id: entity.id }));
                setClients((prev) => [...prev, entity]);
                break;
              case 'venue':
                setFormData((prev) => ({ ...prev, venue_id: entity.id }));
                setVenues((prev) => [...prev, entity]);
                break;
              case 'animator':
                setFormData((prev) => ({ ...prev, animator_ids: [...prev.animator_ids, entity.id] }));
                setAnimators((prev) => [...prev, entity]);
                break;
              case 'contractor':
                setFormData((prev) => ({ ...prev, contractor_ids: [...prev.contractor_ids, entity.id] }));
                setContractors((prev) => [...prev, entity]);
                break;
            }
          });
        }}
      />
    </Dialog>
  );
};

export default EventDetailDialog;
