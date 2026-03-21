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
import { Loader2, Plus, Clock, FileText, Check, ChevronsUpDown, Users, User, Grid, List, Banknote, Car, MapPin, Pencil, Trash2, Upload, X, CheckSquare } from "lucide-react";
import { ReportsImportDialog } from "./reports/ReportsImportDialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";
import AdminReportsView from "./AdminReportsView";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useTenant } from "@/contexts/TenantContext";

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
  const { currentTenant } = useTenant();
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

    // Real-time subscription for salary changes
    const channel = supabase
      .channel('event-reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_report_salaries'
        },
        (payload) => {
          console.log('Real-time salary update:', payload);
          fetchReports();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_reports'
        },
        (payload) => {
          console.log('Real-time report update:', payload);
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatReportError = (error: unknown) => {
    if (!error || typeof error !== "object") return "Не удалось создать отчет";

    const dbError = error as { message?: string; code?: string };

    if (dbError.code === "23502" && dbError.message?.includes("tenant_id")) {
      return "Не выбрана компания: tenant_id пустой. Переключитесь на компанию и повторите.";
    }

    return dbError.message || "Не удалось создать отчет";
  };

  const resolveTenantId = async (userId: string) => {
    if (currentTenant?.id) return currentTenant.id;

    const { data, error } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.tenant_id ?? null;
  };

  const onSubmit = async (data: ReportFormData) => {
    setSubmitting(true);
    try {
      const userData = await supabase.auth.getUser();
      const userId = userData.data.user?.id;

      if (!userId) {
        throw new Error("Пользователь не авторизован");
      }

      const tenantId = await resolveTenantId(userId);
      if (!tenantId) {
        throw new Error("Не выбрана компания: tenant_id не найден");
      }

      const basePayload: Record<string, unknown> = {
        project_name: data.project_name,
        start_time: data.start_time,
        end_time: data.end_time,
        preparation_work: data.preparation_work,
        onsite_work: data.onsite_work,
        car_kilometers: data.car_kilometers || null,
        without_car: data.without_car || false,
        user_id: userId,
        tenant_id: tenantId,
      };

      let { error } = await supabase
        .from("event_reports")
        .insert(basePayload as any);

      // Fallback: if columns don't exist yet, retry without car fields
      if (error && (error.message?.includes("car_kilometers") || error.message?.includes("without_car") || error.code === "42703")) {
        const { car_kilometers, without_car, ...fallbackPayload } = basePayload;
        const result = await supabase
          .from("event_reports")
          .insert(fallbackPayload as any);
        error = result.error;
      }

      if (error) throw error;

      // Send notification to admins
      const { sendNotificationToAdmins } = await import("@/utils/notifications");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      await sendNotificationToAdmins(
        "Новый отчет",
        `${profile?.full_name || "Сотрудник"} создал отчет по проекту "${data.project_name}"`,
        "report",
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
        description: formatReportError(error),
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
      const updatePayload: Record<string, unknown> = {
        project_name: data.project_name,
        start_time: data.start_time,
        end_time: data.end_time,
        preparation_work: data.preparation_work,
        onsite_work: data.onsite_work,
        car_kilometers: data.car_kilometers || null,
        without_car: data.without_car || false,
      };

      let { error } = await supabase
        .from("event_reports")
        .update(updatePayload as any)
        .eq("id", editingReport.id);

      // Fallback: if columns don't exist yet, retry without car fields
      if (error && (error.message?.includes('car_kilometers') || error.message?.includes('without_car') || error.code === '42703')) {
        const { car_kilometers, without_car, ...fallbackPayload } = updatePayload;
        const result = await supabase
          .from("event_reports")
          .update(fallbackPayload as any)
          .eq("id", editingReport.id);
        error = result.error;
      }

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

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_reports")
        .delete()
        .in("id", selectedReports);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Удалено отчетов: ${selectedReports.length}`,
      });

      setBulkDeleteDialogOpen(false);
      setSelectedReports([]);
      fetchReports();
    } catch (error) {
      console.error("Error deleting reports:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить отчеты",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(r => r.id));
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedReports([]);
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
    <div className="p-3 md:p-6 space-y-4 md:space-y-8 w-full max-w-none overflow-x-hidden">
      <div className="flex items-center gap-2 md:gap-3 w-full">
        <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-3xl font-bold truncate">Отчеты по мероприятиям</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
            {isAdmin ? 'Управление отчетами и зарплатами' : 'Ваши отчеты о проведенных мероприятиях'}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="my-reports" className="w-full">
          <TabsList className="w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="my-reports" className="flex items-center gap-2 whitespace-nowrap">
              <User className="h-4 w-4" />
              Мои отчеты
            </TabsTrigger>
            <TabsTrigger value="all-reports" className="flex items-center gap-2 whitespace-nowrap">
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
              importDialogOpen={importDialogOpen}
              setImportDialogOpen={setImportDialogOpen}
              fetchReports={fetchReports}
              selectedReports={selectedReports}
              toggleReportSelection={toggleReportSelection}
              toggleSelectAll={toggleSelectAll}
              bulkDeleteDialogOpen={bulkDeleteDialogOpen}
              setBulkDeleteDialogOpen={setBulkDeleteDialogOpen}
              handleBulkDelete={handleBulkDelete}
              isSelectionMode={isSelectionMode}
              toggleSelectionMode={toggleSelectionMode}
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
          importDialogOpen={importDialogOpen}
          setImportDialogOpen={setImportDialogOpen}
          fetchReports={fetchReports}
        selectedReports={selectedReports}
        toggleReportSelection={toggleReportSelection}
        toggleSelectAll={toggleSelectAll}
        bulkDeleteDialogOpen={bulkDeleteDialogOpen}
        setBulkDeleteDialogOpen={setBulkDeleteDialogOpen}
        handleBulkDelete={handleBulkDelete}
        isSelectionMode={isSelectionMode}
        toggleSelectionMode={toggleSelectionMode}
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
  setViewMode,
  importDialogOpen,
  setImportDialogOpen,
  fetchReports,
  selectedReports,
  toggleReportSelection,
  toggleSelectAll,
  bulkDeleteDialogOpen,
  setBulkDeleteDialogOpen,
  handleBulkDelete,
  isSelectionMode,
  toggleSelectionMode
}: any) => {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-semibold">Мои отчеты</h2>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            {selectedReports.length > 0 
              ? `Выбрано отчетов: ${selectedReports.length}` 
              : 'Создавайте и управляйте своими отчетами'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 justify-between sm:justify-end">
          <Button 
            variant={isSelectionMode ? "default" : "outline"}
            size="sm" 
            onClick={toggleSelectionMode}
            className="flex-1 sm:flex-none"
          >
            {isSelectionMode ? (
              <>
                <X className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Отмена</span>
              </>
            ) : (
              <>
                <CheckSquare className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Выбрать</span>
              </>
            )}
          </Button>

          {isSelectionMode && selectedReports.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Удалить ({selectedReports.length})</span>
            </Button>
          )}
          
          <div className="hidden md:flex border rounded-lg">
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
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setImportDialogOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Upload className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="text-xs md:text-sm">Импорт</span>
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex-1 sm:flex-none">
              <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Добавить</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Новый отчет по мероприятию</DialogTitle>
              <DialogDescription className="text-xs md:text-sm">
                Заполните информацию о проведенном мероприятии
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                <FormField
                  control={form.control}
                  name="project_name"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base">Проект</FormLabel>
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
                        <FormLabel className="flex items-center gap-2 text-sm md:text-base">
                          <Clock className="h-3 w-3 md:h-4 md:w-4" />
                          Время начала
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
                        <FormLabel className="flex items-center gap-2 text-sm md:text-base">
                          <Clock className="h-3 w-3 md:h-4 md:w-4" />
                          Время окончания
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
                    <FormLabel className="text-sm md:text-base">Работа по подготовке мероприятия</FormLabel>
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
                    <FormLabel className="text-sm md:text-base">Работа на площадке</FormLabel>
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
                        <FormLabel className="flex items-center gap-2 text-sm md:text-base">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                          Пробег (км)
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 md:p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm md:text-base">
                            Был без машины
                          </FormLabel>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Отметьте, если работали без автомобиля
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full text-sm md:text-base">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                      Создать отчет
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
          </Dialog>

          <ReportsImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            onImportComplete={fetchReports}
          />
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 md:py-12">
            <FileText className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold mb-2">Нет отчетов</h3>
            <p className="text-xs md:text-sm text-muted-foreground text-center mb-3 md:mb-4">
              Вы еще не создали ни одного отчета по мероприятиям
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Создать первый отчет
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {isSelectionMode && reports.length > 0 && (
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
              <Checkbox
                checked={selectedReports.length === reports.length}
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer">
                Выбрать все
              </label>
            </div>
          )}
          
          {reports.map((report: any) => (
            <Card 
              key={report.id} 
              className={cn(
                "transition-colors",
                selectedReports.includes(report.id) && "ring-2 ring-primary",
                isSelectionMode && "cursor-pointer"
              )}
              onClick={() => isSelectionMode && toggleReportSelection(report.id)}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex gap-3">
                  {isSelectionMode && (
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedReports.includes(report.id)}
                        onCheckedChange={() => toggleReportSelection(report.id)}
                        id={`report-${report.id}`}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 md:mb-4">
                      <h3 className="text-base md:text-xl font-semibold line-clamp-2">{report.project_name}</h3>
                      <span className="text-xs md:text-sm text-muted-foreground shrink-0">
                        {new Date(report.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                
                <div className="space-y-2 mb-3 md:mb-4">
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Время:</span>
                    <span>{report.start_time.substring(0, 5)} - {report.end_time.substring(0, 5)}</span>
                  </div>
                  
                  {(report.car_kilometers || report.without_car) && (
                    <div className="text-xs md:text-sm">
                      <span className="font-medium">Информация о поездке:</span>{' '}
                      {report.without_car ? (
                        <span>без машины</span>
                      ) : report.car_kilometers ? (
                        <span>{report.car_kilometers} км</span>
                      ) : null}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-0">
                  <div className="md:pr-4">
                    <h4 className="text-sm md:text-base font-medium mb-1 md:mb-2">Работа по подготовке мероприятия:</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">{report.preparation_work}</p>
                  </div>
                  <Separator orientation="vertical" className="hidden md:block mx-2 h-auto" />
                  <Separator className="md:hidden" />
                  <div className="md:pl-4">
                    <h4 className="text-sm md:text-base font-medium mb-1 md:mb-2">Работа на площадке:</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">{report.onsite_work}</p>
                  </div>
                </div>

                {report.salaries && report.salaries.length > 0 && (
                  <>
                    <Separator className="my-3 md:my-4" />
                    <div>
                      <h4 className="text-sm md:text-base font-medium mb-2">Назначенные выплаты:</h4>
                      <div className="space-y-1">
                        {report.salaries.map((salary: any, index: number) => (
                          <div key={index} className="text-xs md:text-sm text-muted-foreground">
                            {salary.salary_type}: {formatCurrency(salary.amount)} ({salary.wallet_type})
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(report)}
                    className="flex-1 text-xs md:text-sm"
                  >
                    <Pencil className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden xs:inline">Редактировать</span>
                    <span className="xs:hidden">Ред.</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeletingReport(report);
                      setDeleteDialogOpen(true);
                    }}
                    className="flex-1 text-xs md:text-sm text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden xs:inline">Удалить</span>
                    <span className="xs:hidden">Удал.</span>
                  </Button>
                </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Редактировать отчет</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Внесите изменения в отчет по мероприятию
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-4 md:space-y-6">
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

              <Button type="submit" disabled={submitting} className="w-full text-sm md:text-base">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-3 w-3 md:h-4 md:w-4" />
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
        <AlertDialogContent className="w-[90vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base md:text-lg">Удалить отчет?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-sm">
              Вы уверены, что хотите удалить отчет по проекту "{deletingReport?.project_name}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto text-xs md:text-sm">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs md:text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="w-[90vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base md:text-lg">Удалить отчеты?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-sm">
              Вы уверены, что хотите удалить {selectedReports.length} {
                selectedReports.length === 1 ? 'отчет' : 
                selectedReports.length < 5 ? 'отчета' : 'отчетов'
              }? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto text-xs md:text-sm">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs md:text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить все'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reports;