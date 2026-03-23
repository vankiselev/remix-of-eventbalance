import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, DollarSign, Clock, User, Filter, Eye, FileText, Car, MapPin } from "lucide-react";
import { formatDate } from "@/utils/dateFormat";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDisplayName } from "@/utils/formatName";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/contexts/TenantContext";

interface ReportWithEmployee {
  id: string;
  project_name: string;
  start_time: string;
  end_time: string;
  preparation_work: string;
  onsite_work: string;
  created_at: string;
  user_id: string;
  employee_name: string;
  employee_email: string;
  employee_avatar_url?: string;
  car_kilometers?: number;
  without_car?: boolean;
  salary?: {
    id: string;
    amount: number;
    wallet_type: string;
    salary_type: string;
  };
}

const AdminReportsView = () => {
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const [reports, setReports] = useState<ReportWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportWithEmployee | null>(null);
  const [salaryDialog, setSalaryDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingReport, setViewingReport] = useState<ReportWithEmployee | null>(null);
  const [salaryForm, setSalaryForm] = useState({
    amount: "",
    wallet_type: "",
    salary_type: "ЗП",
  });
  const [submitting, setSubmitting] = useState(false);

  const walletTypes = ["Наличка Настя", "Наличка Лера", "Наличка Ваня"];
  const salaryTypes = ["ЗП", "Оклад", "ПРОЦЕНТ/БОНУС"];

  // Format time without seconds
  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("event_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch salaries for all reports
      const reportIds = data?.map(r => r.id) || [];
      const { data: salaries, error: salariesError } = await supabase
        .from("event_report_salaries")
        .select("*")
        .in("report_id", reportIds);

      if (salariesError) throw salariesError;

      // O(1) lookups via Maps
      const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const salariesMap = new Map((salaries || []).map(s => [`${s.report_id}_${s.employee_user_id}`, s]));

      const reportsWithEmployees: ReportWithEmployee[] = (data || []).map(report => {
        const profile = profilesMap.get(report.user_id) as any;
        return {
          ...report,
          employee_name: formatDisplayName(profile?.full_name) || "Неизвестно",
          employee_email: profile?.email || "",
          employee_avatar_url: profile?.avatar_url,
          salary: salariesMap.get(`${report.id}_${report.user_id}`),
        };
      });

      setReports(reportsWithEmployees);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить отчеты",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Real-time subscription for reports and salary changes
    const channel = supabase
      .channel('admin-reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_report_salaries'
        },
        () => {
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
          console.log('Real-time report update (admin):', payload);
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Derive projects/employees lists from reports
  const projects = useMemo(() => 
    [...new Set(reports.map(r => r.project_name))].sort(), 
    [reports]
  );
  const employees = useMemo(() => 
    [...new Set(reports.map(r => r.employee_name))].sort(), 
    [reports]
  );

  // Single-pass filtering via useMemo instead of useEffect+setState
  const filteredReports = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return reports.filter(report => {
      if (search && 
          !report.employee_name.toLowerCase().includes(search) &&
          !report.project_name.toLowerCase().includes(search) &&
          !report.employee_email.toLowerCase().includes(search)) {
        return false;
      }
      if (projectFilter && projectFilter !== "all" && report.project_name !== projectFilter) return false;
      if (employeeFilter && employeeFilter !== "all" && report.employee_name !== employeeFilter) return false;
      return true;
    });
  }, [searchTerm, projectFilter, employeeFilter, reports]);

  const createFinancialTransaction = async (report: ReportWithEmployee, amount: number, walletType: string, salaryType: string, userId?: string) => {
    try {
      const createdBy = userId || (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from("financial_transactions")
        .insert({
          operation_date: new Date().toISOString().split('T')[0],
          project_owner: walletType.replace("Наличка ", ""),
          description: `${salaryType} ${report.employee_name}`,
          category: "Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)",
          expense_amount: amount,
          income_amount: 0,
          cash_type: walletType,
          static_project_name: report.project_name,
          created_by: createdBy,
          tenant_id: currentTenant?.id || null,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error creating financial transaction:", error);
      throw error;
    }
  };

  const updateFinancialTransaction = async (report: ReportWithEmployee, amount: number, walletType: string, salaryType: string, userId?: string) => {
    try {
      // Find existing transaction for this salary
      const { data: existingTransactions } = await supabase
        .from("financial_transactions")
        .select("id")
        .eq("description", `${report.salary?.salary_type || "ЗП"} ${report.employee_name}`)
        .eq("category", "Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)")
        .eq("static_project_name", report.project_name)
        .limit(1);

      if (existingTransactions && existingTransactions.length > 0) {
        // Update existing transaction
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            expense_amount: amount,
            cash_type: walletType,
            project_owner: walletType.replace("Наличка ", ""),
            description: `${salaryType} ${report.employee_name}`,
          })
          .eq("id", existingTransactions[0].id);

        if (error) throw error;
      } else {
        // Create new transaction if not found
        await createFinancialTransaction(report, amount, walletType, salaryType, userId);
      }
    } catch (error) {
      console.error("Error updating financial transaction:", error);
      throw error;
    }
  };

  const handleAssignSalary = async () => {
    if (!selectedReport || !salaryForm.amount || !salaryForm.wallet_type) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const amount = parseFloat(salaryForm.amount);
      const isExistingSalary = selectedReport.salary;

      // Resolve tenant_id
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      let tenantId = currentTenant?.id;
      if (!tenantId && userId) {
        const { data: tm } = await supabase
          .from("tenant_memberships")
          .select("tenant_id")
          .eq("user_id", userId)
          .maybeSingle();
        tenantId = tm?.tenant_id;
      }
      
      // Create or update salary record
      const { error: salaryError } = await supabase
        .from("event_report_salaries")
        .upsert({
          report_id: selectedReport.id,
          employee_user_id: selectedReport.user_id,
          amount: amount,
          wallet_type: salaryForm.wallet_type,
          salary_type: salaryForm.salary_type,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        }, {
          onConflict: 'report_id,employee_user_id'
        });

      if (salaryError) throw salaryError;

      // Always check if financial transaction exists and create/update accordingly
      await updateFinancialTransaction(selectedReport, amount, salaryForm.wallet_type, salaryForm.salary_type, userId);

      // Send notification to employee
      try {
        const { sendNotification } = await import('@/utils/notifications');
        await sendNotification({
          userId: selectedReport.user_id,
          title: isExistingSalary ? 'Зарплата обновлена' : 'Зарплата назначена',
          message: `${salaryForm.salary_type} ${amount.toLocaleString('ru-RU')} ₽ за отчет "${selectedReport.project_name}"`,
          type: 'salary',
          data: { 
            report_id: selectedReport.id,
            amount,
            wallet_type: salaryForm.wallet_type,
            salary_type: salaryForm.salary_type
          }
        });
      } catch (notifyErr) {
        console.error('Failed to send salary notification:', notifyErr);
      }

      toast({
        title: "Успешно",
        description: isExistingSalary ? "Зарплата обновлена и синхронизирована с финансами" : "Зарплата назначена и добавлена в финансы",
      });

      setSalaryDialog(false);
      setSalaryForm({ amount: "", wallet_type: "", salary_type: "ЗП" });
      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      console.error("Error assigning salary:", error);
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось назначить зарплату",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resolveWalletFromProject = async (projectName: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from("events")
        .select("project_owner")
        .ilike("name", projectName)
        .limit(1)
        .maybeSingle();

      const owner = data?.project_owner;
      if (!owner) return "";

      const ownerLower = owner.toLowerCase();
      if (ownerLower.includes("настя")) return "Наличка Настя";
      if (ownerLower.includes("лера")) return "Наличка Лера";
      if (ownerLower.includes("ваня") || ownerLower.includes("иван")) return "Наличка Ваня";

      const match = walletTypes.find(w => w.toLowerCase().includes(ownerLower));
      return match || "";
    } catch {
      return "";
    }
  };

  const openSalaryDialog = async (report: ReportWithEmployee) => {
    setSelectedReport(report);

    const existingWallet = report.salary?.wallet_type || "";
    const autoWallet = existingWallet || await resolveWalletFromProject(report.project_name);

    setSalaryForm({
      amount: report.salary?.amount?.toString() || "",
      wallet_type: autoWallet,
      salary_type: report.salary?.salary_type || "ЗП",
    });
    setSalaryDialog(true);
  };

  const openViewDialog = (report: ReportWithEmployee) => {
    setViewingReport(report);
    setViewDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-0">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm md:text-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={projectFilter || "all"} onValueChange={(value) => setProjectFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="text-xs md:text-sm">
              <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <SelectValue placeholder="Проекты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все проекты</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={employeeFilter || "all"} onValueChange={(value) => setEmployeeFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="text-xs md:text-sm">
              <User className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <SelectValue placeholder="Сотрудники" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee} value={employee}>
                  {employee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 px-1">Отчеты сотрудников</h3>
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 md:py-12">
              <FileText className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4 mx-auto" />
              <p className="text-sm md:text-base text-muted-foreground">Отчеты не найдены</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={report.employee_avatar_url} />
                          <AvatarFallback className="text-xs">
                            {report.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{report.employee_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{report.project_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openViewDialog(report)}
                        className="shrink-0 h-8 px-2"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{formatTime(report.start_time)} - {formatTime(report.end_time)}</span>
                      </div>

                      {(report.car_kilometers || report.without_car) && (
                        <div className="text-xs">
                          <span className="font-medium">Поездка:</span>{' '}
                          {report.without_car ? 'без машины' : `${report.car_kilometers} км`}
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium mb-1">Подготовка:</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{report.preparation_work}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium mb-1">На площадке:</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{report.onsite_work}</p>
                      </div>

                      {report.salary ? (
                        <>
                          <Separator />
                          <div>
                            <p className="text-xs font-medium mb-1">Назначенная выплата:</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{formatCurrency(report.salary.amount)}</span>
                              <Badge variant="outline" className="text-xs">{report.salary.wallet_type}</Badge>
                              <Badge variant="secondary" className="text-xs">{report.salary.salary_type}</Badge>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Separator />
                          <Badge variant="secondary" className="text-xs">Зарплата не назначена</Badge>
                        </>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSalaryDialog(report)}
                        className="w-full mt-2 text-xs"
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        {report.salary ? "Изменить выплату" : "Назначить выплату"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <div className="min-w-max">
                      <table className="w-full border-collapse border border-border">
                        <thead className="sticky top-0 z-10 bg-background">
                          <tr>
                            <th className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden" style={{ resize: 'horizontal', minWidth: '120px', width: '200px' }}>
                              Сотрудник
                            </th>
                            <th className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden" style={{ resize: 'horizontal', minWidth: '100px', width: '160px' }}>
                              Проект
                            </th>
                            <th className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden" style={{ resize: 'horizontal', minWidth: '80px', width: '120px' }}>
                              Время
                            </th>
                            <th className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden" style={{ resize: 'horizontal', minWidth: '150px', width: '300px' }}>
                              Подготовка
                            </th>
                            <th className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden" style={{ resize: 'horizontal', minWidth: '150px', width: '300px' }}>
                              На площадке
                            </th>
                            <th className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden" style={{ resize: 'horizontal', minWidth: '100px', width: '160px' }}>
                              Зарплата
                            </th>
                            <th className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden" style={{ resize: 'horizontal', minWidth: '80px', width: '120px' }}>
                              Действия
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReports.map((report, index) => (
                            <tr key={report.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                              <td className="border border-border p-2 text-center align-middle bg-white">
                                <div className="flex items-center justify-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={report.employee_avatar_url} />
                                    <AvatarFallback className="text-xs">
                                      {report.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="font-medium">{report.employee_name}</div>
                                </div>
                              </td>
                              <td className="border border-border p-2 text-center align-middle bg-white">
                                <div className="font-medium">{report.project_name}</div>
                              </td>
                              <td className="border border-border p-2 text-center align-middle bg-white">
                                <div className="flex items-center justify-center gap-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{formatTime(report.start_time)} - {formatTime(report.end_time)}</span>
                                </div>
                              </td>
                              <td className="border border-border p-2 text-center align-middle bg-white">
                                <div className="text-sm whitespace-pre-wrap">{report.preparation_work}</div>
                              </td>
                              <td className="border border-border p-2 text-center align-middle bg-white">
                                <div className="text-sm whitespace-pre-wrap">{report.onsite_work}</div>
                              </td>
                              <td className="border border-border p-2 text-center align-middle bg-white">
                                {report.salary ? (
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">{report.salary.amount.toLocaleString('ru-RU')} ₽</div>
                                    <div className="flex flex-col gap-1">
                                      <Badge variant="outline" className="text-xs w-fit">
                                        {report.salary.wallet_type}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs w-fit">
                                        {report.salary.salary_type}
                                      </Badge>
                                    </div>
                                  </div>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Не назначена</Badge>
                                )}
                              </td>
                              <td className="border border-border p-2 text-center align-middle bg-white">
                                <div className="flex flex-col gap-1 items-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openViewDialog(report)}
                                    className="text-xs h-7"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Просмотр
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openSalaryDialog(report)}
                                    className="text-xs h-7"
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    {report.salary ? "Изменить" : "Назначить"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <Dialog open={salaryDialog} onOpenChange={setSalaryDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Назначить зарплату</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Назначение зарплаты сотруднику {selectedReport?.employee_name} за проект "{selectedReport?.project_name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="text-xs md:text-sm font-medium">Сумма</label>
              <Input
                type="number"
                placeholder="Введите сумму"
                value={salaryForm.amount}
                onChange={(e) => setSalaryForm({...salaryForm, amount: e.target.value})}
                className="text-sm md:text-base"
              />
            </div>
            
            <div>
              <label className="text-xs md:text-sm font-medium">Тип выплаты</label>
              <Select value={salaryForm.salary_type} onValueChange={(value) => setSalaryForm({...salaryForm, salary_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  {salaryTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs md:text-sm font-medium">Кошелек</label>
              <Select value={salaryForm.wallet_type} onValueChange={(value) => setSalaryForm({...salaryForm, wallet_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите кошелек" />
                </SelectTrigger>
                <SelectContent>
                  {walletTypes.map((wallet) => (
                    <SelectItem key={wallet} value={wallet}>
                      {wallet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleAssignSalary} disabled={submitting} className="w-full text-xs md:text-sm">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Назначить зарплату
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
              Отчет по мероприятию
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Подробная информация об отчете сотрудника {viewingReport?.employee_name}
            </DialogDescription>
          </DialogHeader>
          
          {viewingReport && (
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <h4 className="text-sm md:text-base font-medium mb-2">Проект</h4>
                  <p className="text-base md:text-lg">{viewingReport.project_name}</p>
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-medium mb-2">Дата создания</h4>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {new Date(viewingReport.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <h4 className="text-sm md:text-base font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-3 w-3 md:h-4 md:w-4" />
                    Время на площадке
                  </h4>
                  <p className="text-sm md:text-base">{formatTime(viewingReport.start_time)} - {formatTime(viewingReport.end_time)}</p>
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-medium mb-2">Сотрудник</h4>
                  <div>
                    <p className="text-sm md:text-base">{viewingReport.employee_name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{viewingReport.employee_email}</p>
                  </div>
                </div>
              </div>

              {(viewingReport.car_kilometers || viewingReport.without_car) && (
                <div className="text-sm">
                  <span className="font-medium">Информация о поездке:</span>{' '}
                  {viewingReport.without_car ? (
                    <span>без машины</span>
                  ) : viewingReport.car_kilometers ? (
                    <span>{viewingReport.car_kilometers} км</span>
                  ) : null}
                </div>
              )}

              {viewingReport.salary && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm md:text-base font-medium mb-2">Назначенная выплата:</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base md:text-lg font-medium">{formatCurrency(viewingReport.salary.amount)}</span>
                      <Badge variant="outline" className="text-xs">{viewingReport.salary.wallet_type}</Badge>
                      <Badge variant="secondary" className="text-xs">{viewingReport.salary.salary_type}</Badge>
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-3 md:space-y-4">
                <div>
                  <h4 className="text-sm md:text-base font-medium mb-2">Работа по подготовке мероприятия:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs md:text-sm whitespace-pre-wrap">{viewingReport.preparation_work}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-medium mb-2">Работа на площадке:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs md:text-sm whitespace-pre-wrap">{viewingReport.onsite_work}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsView;