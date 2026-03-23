import { useState, useEffect } from "react";
import { useVacations } from "@/hooks/useVacations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayName } from "@/utils/formatName";
import { getVacationTypeLabel, getVacationStatusColor as getStatusColor, getVacationStatusLabel as getStatusLabel, calculateVacationDays as calculateDays, vacationTypeLabels } from "@/utils/vacationConstants";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Edit, Trash2, Plane } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { VacationApprovalDialog } from "@/components/vacation/VacationApprovalDialog";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

interface Vacation {
  id: string;
  user_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  vacation_type: string;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const VacationSchedule = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const { data: vacations = [], isLoading: loading, refetch: refetchVacations } = useVacations(activeTab);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalVacation, setApprovalVacation] = useState<Vacation | null>(null);
  
  const [formData, setFormData] = useState({
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    vacation_type: "vacation" as const,
    description: "",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useUserRbacRoles();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .limit(1)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };


  const handleCreateVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !formData.start_date || !formData.end_date) return;

    if (formData.start_date >= formData.end_date) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Дата окончания должна быть позже даты начала",
      });
      return;
    }

    try {
      const vacationData = {
        user_id: user.id,
        employee_name: formatDisplayName(userProfile.full_name),
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date.toISOString().split('T')[0],
        vacation_type: formData.vacation_type,
        description: formData.description || null,
        status: 'pending',
      };

      const { error } = await supabase.from("vacations").insert(vacationData);

      if (error) throw error;

      // Send notification to admins
      const { sendNotificationToAdmins } = await import('@/utils/notifications');
      const vacationType = vacationTypeLabels[formData.vacation_type] || formData.vacation_type;

      await sendNotificationToAdmins(
        'Новая заявка на отпуск',
        `${formatDisplayName(userProfile.full_name)} подал заявку: ${vacationType} с ${formData.start_date.toLocaleDateString('ru-RU')} по ${formData.end_date.toLocaleDateString('ru-RU')}`,
        'vacation',
        { 
          vacation_type: formData.vacation_type,
          start_date: vacationData.start_date,
          end_date: vacationData.end_date
        }
      );

      toast({
        title: "Успешно!",
        description: "Заявка на отпуск создана и отправлена на одобрение",
      });

      resetForm();
      refetchVacations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось создать заявку на отпуск",
      });
    }
  };

  const handleEditVacation = (vacation: Vacation) => {
    // Admins see approval dialog for pending vacations
    if (isAdmin && vacation.status === 'pending') {
      setApprovalVacation(vacation);
      setShowApprovalDialog(true);
    } else {
      // Users edit their own vacations
      setEditingVacation(vacation);
      setFormData({
        start_date: new Date(vacation.start_date),
        end_date: new Date(vacation.end_date),
        vacation_type: vacation.vacation_type as any,
        description: vacation.description || "",
      });
      setShowEditDialog(true);
    }
  };

  const handleUpdateVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingVacation || !formData.start_date || !formData.end_date) return;

    if (formData.start_date >= formData.end_date) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Дата окончания должна быть позже даты начала",
      });
      return;
    }

    try {
      const vacationData = {
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date.toISOString().split('T')[0],
        vacation_type: formData.vacation_type,
        description: formData.description || null,
      };

      const { error } = await supabase
        .from("vacations")
        .update(vacationData)
        .eq("id", editingVacation.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Заявка на отпуск обновлена",
      });

      resetForm();
      refetchVacations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось обновить заявку на отпуск",
      });
    }
  };

  const handleDeleteVacation = async () => {
    if (!editingVacation) return;
    if (!confirm("Вы уверены, что хотите удалить эту заявку на отпуск?")) return;

    try {
      const { error } = await supabase
        .from("vacations")
        .delete()
        .eq("id", editingVacation.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Заявка на отпуск удалена",
      });

      resetForm();
      refetchVacations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить заявку на отпуск",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      start_date: undefined,
      end_date: undefined,
      vacation_type: "vacation" as const,
      description: "",
    });
    setEditingVacation(null);
    setShowEditDialog(false);
    setShowCreateDialog(false);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy", { locale: ru });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">График отпусков</h1>
          <p className="text-muted-foreground">Планирование и управление отпусками сотрудников</p>
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
          <h1 className="text-3xl font-bold truncate">График отпусков</h1>
          <p className="text-muted-foreground truncate">Планирование и управление отпусками сотрудников</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto flex-shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Подать заявку на отпуск
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Новая заявка на отпуск</DialogTitle>
              <DialogDescription>
                Заполните информацию о предстоящем отпуске
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVacation} className="space-y-4">
              <div className="space-y-2">
                <Label>Дата начала *</Label>
                <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(formData.start_date, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => {
                        setFormData({ ...formData, start_date: date });
                        setStartDatePickerOpen(false);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Дата окончания *</Label>
                <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date ? format(formData.end_date, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => {
                        setFormData({ ...formData, end_date: date });
                        setEndDatePickerOpen(false);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || (formData.start_date && date <= formData.start_date);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vacation_type">Тип отпуска</Label>
                <Select value={formData.vacation_type} onValueChange={(value: any) => setFormData({ ...formData, vacation_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekend">Выходной</SelectItem>
                    <SelectItem value="vacation">Отпуск</SelectItem>
                    <SelectItem value="sick">Больничный</SelectItem>
                    <SelectItem value="personal">Личное</SelectItem>
                    <SelectItem value="fun">Кайфануть</SelectItem>
                    <SelectItem value="study">Учеба</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Примечание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Дополнительная информация..."
                />
              </div>

              <Button type="submit" className="w-full">
                Подать заявку
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for Active and Archive */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'archive')} className="w-full">
        <TabsList className="w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="active" className="whitespace-nowrap">
            Актуальные отпуска
          </TabsTrigger>
          <TabsTrigger value="archive" className="whitespace-nowrap">
            Архив
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4 mt-4">
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Актуальных отпусков</h3>
            </div>
            <div className="text-2xl font-bold">{vacations.length}</div>
            <p className="text-xs text-muted-foreground">
              Текущие и будущие отпуска
            </p>
          </div>

          {vacations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plane className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет актуальных отпусков</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Все отпуска завершены или еще не запланированы
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vacations.map((vacation) => (
            <Card key={vacation.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEditVacation(vacation)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-2">{vacation.employee_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(vacation.status)}>
                      {getStatusLabel(vacation.status)}
                    </Badge>
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <CardDescription>
                  {getVacationTypeLabel(vacation.vacation_type)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(vacation.start_date)} - {formatDate(vacation.end_date)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Дней: {calculateDays(vacation.start_date, vacation.end_date)}
                </div>
                {vacation.description && (
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {vacation.description}
                  </div>
                )}
              </CardContent>
            </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="archive" className="space-y-4 mt-4">
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">В архиве</h3>
            </div>
            <div className="text-2xl font-bold">{vacations.length}</div>
            <p className="text-xs text-muted-foreground">
              Завершенные отпуска
            </p>
          </div>

          {vacations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plane className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Архив пуст</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Нет завершенных отпусков
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vacations.map((vacation) => (
                <Card key={vacation.id} className="cursor-pointer hover:shadow-md transition-shadow opacity-75" onClick={() => handleEditVacation(vacation)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{vacation.employee_name}</CardTitle>
                      <Badge className={getStatusColor(vacation.status)}>
                        {getStatusLabel(vacation.status)}
                      </Badge>
                    </div>
                    <CardDescription>{getVacationTypeLabel(vacation.vacation_type)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Период: </span>
                      <span className="font-medium">
                        {formatDate(vacation.start_date)} - {formatDate(vacation.end_date)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Дней: </span>
                      <span className="font-medium">{calculateDays(vacation.start_date, vacation.end_date)}</span>
                    </div>
                    {vacation.description && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Примечание: </span>
                        <span className="text-xs">{vacation.description}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Диалог редактирования */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать заявку на отпуск</DialogTitle>
            <DialogDescription>
              Изменить информацию о заявке на отпуск
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateVacation} className="space-y-4">
            <div className="space-y-2">
              <Label>Дата начала *</Label>
              <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date) => {
                      setFormData({ ...formData, start_date: date });
                      setStartDatePickerOpen(false);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Дата окончания *</Label>
              <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(formData.end_date, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => {
                      setFormData({ ...formData, end_date: date });
                      setEndDatePickerOpen(false);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || (formData.start_date && date <= formData.start_date);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-vacation_type">Тип отпуска</Label>
              <Select value={formData.vacation_type} onValueChange={(value: any) => setFormData({ ...formData, vacation_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekend">Выходной</SelectItem>
                  <SelectItem value="vacation">Отпуск</SelectItem>
                  <SelectItem value="sick">Больничный</SelectItem>
                  <SelectItem value="personal">Личное</SelectItem>
                  <SelectItem value="fun">Кайфануть</SelectItem>
                  <SelectItem value="study">Учеба</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Примечание</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Дополнительная информация..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Сохранить
              </Button>
              {editingVacation && editingVacation.user_id === user?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteVacation}
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

      {/* Vacation Approval Dialog for Admins */}
      <VacationApprovalDialog
        vacation={approvalVacation}
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        onSuccess={refetchVacations}
      />
    </div>
  );
};

export default VacationSchedule;