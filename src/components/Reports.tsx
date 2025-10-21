import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Clock, FileText, Check, ChevronsUpDown, Users, User, Grid, List, Banknote, Car, MapPin, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminReportsView from "./AdminReportsView";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

const reportSchema = z.object({
  project_name: z.string().min(1, "Выберите проект"),
  start_time: z.string().min(1, "Укажите время начала"),
  end_time: z.string().min(1, "Укажите время окончания"),
  preparation_work: z.string().min(1, "Опишите работу по подготовке"),
  onsite_work: z.string().min(1, "Опишите работу на площадке"),
  car_kilometers: z.number().min(0, "Количество километров не может быть отрицательным").optional(),
  without_car: z.boolean().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface Report {
  id: string;
  project_name: string;
  start_time: string;
  end_time: string;
  preparation_work: string;
  onsite_work: string;
  created_at: string;
  car_kilometers?: number;
  without_car?: boolean;
  salaries?: {
    amount: number;
    wallet_type: string;
    salary_type: string;
  }[];
}

const Reports = () => {
  const { toast } = useToast();
  const { isAdmin } = useUserRbacRoles();
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      project_name: "",
      start_time: "",
      end_time: "",
      preparation_work: "",
      onsite_work: "",
      car_kilometers: 0,
      without_car: false,
    },
  });

  const fetchReports = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      const { data: reportsData, error } = await supabase
        .from("event_reports")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Получаем информацию о зарплатах для каждого отчета
      if (reportsData && reportsData.length > 0) {
        const { data: salariesData, error: salariesError } = await supabase
          .from("event_report_salaries")
          .select("report_id, amount, wallet_type, salary_type")
          .in("report_id", reportsData.map(r => r.id))
          .eq("employee_user_id", user.user.id);

        if (salariesError) throw salariesError;

        // Группируем зарплаты по report_id
        const salariesByReport = (salariesData || []).reduce((acc, salary) => {
          if (!acc[salary.report_id]) {
            acc[salary.report_id] = [];
          }
          acc[salary.report_id].push(salary);
          return acc;
        }, {} as Record<string, any[]>);

        // Добавляем информацию о зарплатах к отчетам
        const reportsWithSalaries = reportsData.map(report => ({
          ...report,
          salaries: salariesByReport[report.id] || []
        }));

        setReports(reportsWithSalaries);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить отчеты",
        variant: "destructive",
      });
    }
  };

  const fetchProjects = async () => {
    try {
      // Получаем статические проекты из financial_transactions
      const { data: staticProjects, error: staticError } = await supabase
        .from("financial_transactions")
        .select("static_project_name")
        .not("static_project_name", "is", null);

      if (staticError) throw staticError;

      // Получаем проекты из events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("name");

      if (eventsError) throw eventsError;

      const allProjects = [
        ...new Set([
          ...(staticProjects?.map(p => p.static_project_name).filter(Boolean) || []),
          ...(events?.map(e => e.name).filter(Boolean) || []),
        ])
      ].sort();

      setProjects(allProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список проектов",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchReports(), fetchProjects()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const onSubmit = async (data: ReportFormData) => {
    setSubmitting(true);
    try {
      const userData = await supabase.auth.getUser();
      const { error } = await supabase
        .from("event_reports")
        .insert({
          project_name: data.project_name,
          start_time: data.start_time,
          end_time: data.end_time,
          preparation_work: data.preparation_work,
          onsite_work: data.onsite_work,
          car_kilometers: data.car_kilometers || null,
          without_car: data.without_car || false,
          user_id: userData.data.user?.id,
        });

      if (error) throw error;

      // Send notification to admins
      const { sendNotificationToAdmins } = await import('@/utils/notifications');
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userData.data.user?.id)
        .single();

      await sendNotificationToAdmins(
        'Новый отчет',
        `${profile?.full_name || 'Сотрудник'} создал отчет по проекту "${data.project_name}"`,
        'report',
        { project_name: data.project_name }
      );

      toast({
        title: "Успешно",
        description: "Отчет создан",
      });

      form.reset();
      setDialogOpen(false);
      fetchReports();
    } catch (error) {
      console.error("Error creating report:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать отчет",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    form.reset({
      project_name: report.project_name,
      start_time: report.start_time,
      end_time: report.end_time,
      preparation_work: report.preparation_work,
      onsite_work: report.onsite_work,
      car_kilometers: report.car_kilometers || 0,
      without_car: report.without_car || false,
    });
    setEditDialogOpen(true);
  };

  const onUpdate = async (data: ReportFormData) => {
    if (!editingReport) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_reports")
        .update({
          project_name: data.project_name,
          start_time: data.start_time,
          end_time: data.end_time,
          preparation_work: data.preparation_work,
          onsite_work: data.onsite_work,
          car_kilometers: data.car_kilometers || null,
          without_car: data.without_car || false,
        })
        .eq("id", editingReport.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Отчет обновлен",
      });

      form.reset();
      setEditDialogOpen(false);
      setEditingReport(null);
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить отчет",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReport) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_reports")
        .delete()
        .eq("id", deletingReport.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Отчет удален",
      });

      setDeleteDialogOpen(false);
      setDeletingReport(null);
      fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить отчет",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 w-full max-w-none overflow-x-hidden">
      <div className="flex items-center gap-3 w-full">
        <FileText className="h-8 w-8 text-primary flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold truncate">Отчеты по мероприятиям</h1>
          <p className="text-muted-foreground truncate">
            {isAdmin ? 'Управление отчетами и зарплатами' : 'Ваши отчеты о проведенных мероприятиях'}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="my-reports" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-reports" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Мои отчеты
            </TabsTrigger>
            <TabsTrigger value="all-reports" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Все отчеты
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-reports">
            <EmployeeReportsView 
              reports={reports} 
              dialogOpen={dialogOpen} 
              setDialogOpen={setDialogOpen}
              editDialogOpen={editDialogOpen}
              setEditDialogOpen={setEditDialogOpen}
              deleteDialogOpen={deleteDialogOpen}
              setDeleteDialogOpen={setDeleteDialogOpen}
              editingReport={editingReport}
              deletingReport={deletingReport}
              setDeletingReport={setDeletingReport}
              form={form}
              onSubmit={onSubmit}
              onUpdate={onUpdate}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              submitting={submitting}
              projects={projects}
              projectOpen={projectOpen}
              setProjectOpen={setProjectOpen}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </TabsContent>
          
          <TabsContent value="all-reports">
            <AdminReportsView />
          </TabsContent>
        </Tabs>
      ) : (
        <EmployeeReportsView 
          reports={reports} 
          dialogOpen={dialogOpen} 
          setDialogOpen={setDialogOpen}
          editDialogOpen={editDialogOpen}
          setEditDialogOpen={setEditDialogOpen}
          deleteDialogOpen={deleteDialogOpen}
          setDeleteDialogOpen={setDeleteDialogOpen}
          editingReport={editingReport}
          deletingReport={deletingReport}
          setDeletingReport={setDeletingReport}
          form={form}
          onSubmit={onSubmit}
          onUpdate={onUpdate}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          submitting={submitting}
          projects={projects}
          projectOpen={projectOpen}
          setProjectOpen={setProjectOpen}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}
    </div>
  );
};

const EmployeeReportsView = ({ 
  reports, 
  dialogOpen, 
  setDialogOpen,
  editDialogOpen,
  setEditDialogOpen,
  deleteDialogOpen,
  setDeleteDialogOpen,
  editingReport,
  deletingReport,
  setDeletingReport,
  form, 
  onSubmit,
  onUpdate,
  handleEdit,
  handleDelete,
  submitting, 
  projects, 
  projectOpen, 
  setProjectOpen,
  viewMode,
  setViewMode
}: any) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Мои отчеты</h2>
          <p className="text-muted-foreground">Создавайте и управляйте своими отчетами</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить отчет
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новый отчет по мероприятию</DialogTitle>
              <DialogDescription>
                Заполните информацию о проведенном мероприятии
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="project_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Проект</FormLabel>
                      <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? projects.find((project: string) => project === field.value)
                                : "Выберите проект"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Поиск проекта..." />
                            <CommandList>
                              <CommandEmpty>Проект не найден.</CommandEmpty>
                              <CommandGroup>
                                {projects.map((project: string) => (
                                  <CommandItem
                                    value={project}
                                    key={project}
                                    onSelect={() => {
                                      form.setValue("project_name", project);
                                      setProjectOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        project === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {project}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Время начала на площадке
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select value={field.value?.split(':')[0] || ""} onValueChange={(hour) => {
                              const minute = field.value?.split(':')[1] || "00";
                              field.onChange(`${hour}:${minute}`);
                            }}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="ЧЧ" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                                  <SelectItem key={hour} value={hour}>
                                    {hour}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center text-muted-foreground">:</span>
                            <Select value={field.value?.split(':')[1] || ""} onValueChange={(minute) => {
                              const hour = field.value?.split(':')[0] || "00";
                              field.onChange(`${hour}:${minute}`);
                            }}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="ММ" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((minute) => (
                                  <SelectItem key={minute} value={minute}>
                                    {minute}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Время окончания на площадке
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select value={field.value?.split(':')[0] || ""} onValueChange={(hour) => {
                              const minute = field.value?.split(':')[1] || "00";
                              field.onChange(`${hour}:${minute}`);
                            }}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="ЧЧ" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                                  <SelectItem key={hour} value={hour}>
                                    {hour}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center text-muted-foreground">:</span>
                            <Select value={field.value?.split(':')[1] || ""} onValueChange={(minute) => {
                              const hour = field.value?.split(':')[0] || "00";
                              field.onChange(`${hour}:${minute}`);
                            }}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="ММ" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((minute) => (
                                  <SelectItem key={minute} value={minute}>
                                    {minute}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="preparation_work"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Работа по подготовке мероприятия</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Опишите что было сделано для подготовки мероприятия..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onsite_work"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Работа на площадке</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Опишите работу, проделанную на площадке..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="car_kilometers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Пробег на машине (км)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Введите количество километров"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="without_car"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Был без машины
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Отметьте, если работали без использования автомобиля
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Создать отчет
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет отчетов</h3>
            <p className="text-muted-foreground text-center mb-4">
              Вы еще не создали ни одного отчета по мероприятиям
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать первый отчет
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {reports.map((report: any) => (
            <Card key={report.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{report.project_name}</h3>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {report.start_time.substring(0, 5)} - {report.end_time.substring(0, 5)}
                  </span>
                </div>

                {report.salaries && report.salaries.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Назначенные выплаты:</span>
                    </div>
                    {report.salaries.map((salary: any, index: number) => (
                      <div key={index} className="text-sm text-green-700">
                        {salary.salary_type}: {salary.amount.toLocaleString('ru-RU')} ₽ ({salary.wallet_type})
                      </div>
                    ))}
                  </div>
                )}
                
                {(report.car_kilometers || report.without_car) && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Информация о поездке:</span>
                    </div>
                    {report.without_car ? (
                      <div className="text-sm text-blue-700">Работал без машины</div>
                    ) : report.car_kilometers ? (
                      <div className="text-sm text-blue-700">Пробег: {report.car_kilometers} км</div>
                    ) : null}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Работа по подготовке мероприятия:</h4>
                    <p className="text-sm text-muted-foreground">{report.preparation_work}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Работа на площадке:</h4>
                    <p className="text-sm text-muted-foreground">{report.onsite_work}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(report)}
                    className="flex-1"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeletingReport(report);
                      setDeleteDialogOpen(true);
                    }}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать отчет</DialogTitle>
            <DialogDescription>
              Внесите изменения в отчет по мероприятию
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-6">
              <FormField
                control={form.control}
                name="project_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>
                    <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? projects.find((project: string) => project === field.value)
                              : "Выберите проект"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Поиск проекта..." />
                          <CommandList>
                            <CommandEmpty>Проект не найден.</CommandEmpty>
                            <CommandGroup>
                              {projects.map((project: string) => (
                                <CommandItem
                                  value={project}
                                  key={project}
                                  onSelect={() => {
                                    form.setValue("project_name", project);
                                    setProjectOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      project === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {project}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Время начала на площадке
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Select value={field.value?.split(':')[0] || ""} onValueChange={(hour) => {
                            const minute = field.value?.split(':')[1] || "00";
                            field.onChange(`${hour}:${minute}`);
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="ЧЧ" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="flex items-center text-muted-foreground">:</span>
                          <Select value={field.value?.split(':')[1] || ""} onValueChange={(minute) => {
                            const hour = field.value?.split(':')[0] || "00";
                            field.onChange(`${hour}:${minute}`);
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="ММ" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  {minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Время окончания на площадке
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Select value={field.value?.split(':')[0] || ""} onValueChange={(hour) => {
                            const minute = field.value?.split(':')[1] || "00";
                            field.onChange(`${hour}:${minute}`);
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="ЧЧ" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="flex items-center text-muted-foreground">:</span>
                          <Select value={field.value?.split(':')[1] || ""} onValueChange={(minute) => {
                            const hour = field.value?.split(':')[0] || "00";
                            field.onChange(`${hour}:${minute}`);
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="ММ" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  {minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preparation_work"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Работа по подготовке мероприятия</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Опишите что было сделано для подготовки мероприятия..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onsite_work"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Работа на площадке</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Опишите работу, проделанную на площадке..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="car_kilometers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Пробег на машине (км)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Введите количество километров"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="without_car"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Был без машины
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Отметьте, если работали без использования автомобиля
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Сохранить изменения
                  </>
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить отчет?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить отчет по проекту "{deletingReport?.project_name}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reports;