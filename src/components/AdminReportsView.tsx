import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, DollarSign, Clock, User, Filter, Eye, FileText, Car, MapPin } from "lucide-react";
import { formatDate } from "@/utils/dateFormat";

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
  const [reports, setReports] = useState<ReportWithEmployee[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [projects, setProjects] = useState<string[]>([]);
  const [employees, setEmployees] = useState<string[]>([]);
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
  const salaryTypes = ["ЗП", "ПРОЦЕНТ/БОНУС"];

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
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch salaries for all reports
      const reportIds = data?.map(r => r.id) || [];
      const { data: salaries, error: salariesError } = await supabase
        .from("event_report_salaries")
        .select("*")
        .in("report_id", reportIds);

      if (salariesError) throw salariesError;

      const reportsWithEmployees: ReportWithEmployee[] = (data || []).map(report => {
        const profile = profiles?.find(p => p.id === report.user_id);
        return {
          ...report,
          employee_name: profile?.full_name || "Неизвестно",
          employee_email: profile?.email || "",
          salary: salaries?.find(s => s.report_id === report.id && s.employee_user_id === report.user_id),
        };
      });

      setReports(reportsWithEmployees);
      setFilteredReports(reportsWithEmployees);

      // Extract unique projects and employees
      const uniqueProjects = [...new Set(reportsWithEmployees.map(r => r.project_name))].sort();
      const uniqueEmployees = [...new Set(reportsWithEmployees.map(r => r.employee_name))].sort();
      setProjects(uniqueProjects);
      setEmployees(uniqueEmployees);
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
  }, []);

  useEffect(() => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(
        report =>
          report.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.employee_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (projectFilter && projectFilter !== "all") {
      filtered = filtered.filter(report => report.project_name === projectFilter);
    }

    if (employeeFilter && employeeFilter !== "all") {
      filtered = filtered.filter(report => report.employee_name === employeeFilter);
    }

    setFilteredReports(filtered);
  }, [searchTerm, projectFilter, employeeFilter, reports]);

  const createFinancialTransaction = async (report: ReportWithEmployee, amount: number, walletType: string, salaryType: string) => {
    try {
      const { error } = await supabase
        .from("financial_transactions")
        .insert({
          operation_date: new Date().toISOString().split('T')[0],
          project_owner: walletType.replace("Наличка ", ""),
          description: `${salaryType} ${report.employee_name} за проект "${report.project_name}"`,
          category: "Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)",
          expense_amount: amount,
          income_amount: 0,
          cash_type: walletType,
          static_project_name: report.project_name,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error creating financial transaction:", error);
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
      
      // Create or update salary record
      const { error: salaryError } = await supabase
        .from("event_report_salaries")
        .upsert({
          report_id: selectedReport.id,
          employee_user_id: selectedReport.user_id,
          amount: amount,
          wallet_type: salaryForm.wallet_type,
          salary_type: salaryForm.salary_type,
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (salaryError) throw salaryError;

      // Create financial transaction
      await createFinancialTransaction(selectedReport, amount, salaryForm.wallet_type, salaryForm.salary_type);

      toast({
        title: "Успешно",
        description: "Зарплата назначена и добавлена в финансы",
      });

      setSalaryDialog(false);
      setSalaryForm({ amount: "", wallet_type: "", salary_type: "ЗП" });
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error("Error assigning salary:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось назначить зарплату",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openSalaryDialog = (report: ReportWithEmployee) => {
    setSelectedReport(report);
    setSalaryForm({
      amount: report.salary?.amount?.toString() || "",
      wallet_type: report.salary?.wallet_type || "",
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Поиск по сотруднику, проекту или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Все проекты" />
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
        <Select value={employeeFilter} onValueChange={(value) => setEmployeeFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Все сотрудники" />
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

      <Card>
        <CardHeader>
          <CardTitle>Отчеты сотрудников</CardTitle>
          <CardDescription>
            Управление зарплатами по отчетам мероприятий
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Отчеты не найдены</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <div className="min-w-max">
                <table className="w-full border-collapse border border-border">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr>
                      <th
                        className="border border-border p-2 text-left text-sm font-medium bg-white resize-x overflow-hidden"
                        style={{ resize: 'horizontal', minWidth: '120px', width: '200px' }}
                      >
                        Сотрудник
                      </th>
                      <th
                        className="border border-border p-2 text-left text-sm font-medium bg-white resize-x overflow-hidden"
                        style={{ resize: 'horizontal', minWidth: '100px', width: '160px' }}
                      >
                        Проект
                      </th>
                      <th
                        className="border border-border p-2 text-left text-sm font-medium bg-white resize-x overflow-hidden"
                        style={{ resize: 'horizontal', minWidth: '80px', width: '120px' }}
                      >
                        Время на площадке
                      </th>
                      <th
                        className="border border-border p-2 text-left text-sm font-medium bg-white resize-x overflow-hidden"
                        style={{ resize: 'horizontal', minWidth: '150px', width: '300px' }}
                      >
                        Подготовка
                      </th>
                      <th
                        className="border border-border p-2 text-left text-sm font-medium bg-white resize-x overflow-hidden"
                        style={{ resize: 'horizontal', minWidth: '150px', width: '300px' }}
                      >
                        На площадке
                      </th>
                      <th
                        className="border border-border p-2 text-left text-sm font-medium bg-white resize-x overflow-hidden"
                        style={{ resize: 'horizontal', minWidth: '100px', width: '160px' }}
                      >
                        Зарплата
                      </th>
                      <th
                        className="border border-border p-2 text-left text-sm font-medium bg-white resize-x overflow-hidden"
                        style={{ resize: 'horizontal', minWidth: '80px', width: '120px' }}
                      >
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report, index) => (
                      <tr key={report.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <td className="border border-border p-2 align-top bg-white">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="font-medium">{report.employee_name}</div>
                          </div>
                        </td>
                        <td className="border border-border p-2 align-top bg-white">
                          <div className="font-medium">{report.project_name}</div>
                        </td>
                        <td className="border border-border p-2 align-top bg-white">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatTime(report.start_time)} - {formatTime(report.end_time)}</span>
                          </div>
                        </td>
                        <td className="border border-border p-2 align-top bg-white">
                          <div className="text-sm whitespace-pre-wrap">{report.preparation_work}</div>
                        </td>
                        <td className="border border-border p-2 align-top bg-white">
                          <div className="text-sm whitespace-pre-wrap">{report.onsite_work}</div>
                        </td>
                        <td className="border border-border p-2 align-top bg-white">
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
                        <td className="border border-border p-2 align-top bg-white">
                          <div className="flex flex-col gap-1">
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
          )}
        </CardContent>
      </Card>

      <Dialog open={salaryDialog} onOpenChange={setSalaryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить зарплату</DialogTitle>
            <DialogDescription>
              Назначение зарплаты сотруднику {selectedReport?.employee_name} за проект "{selectedReport?.project_name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Сумма</label>
              <Input
                type="number"
                placeholder="Введите сумму"
                value={salaryForm.amount}
                onChange={(e) => setSalaryForm({...salaryForm, amount: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Тип выплаты</label>
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
              <label className="text-sm font-medium">Кошелек</label>
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
            
            <Button onClick={handleAssignSalary} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Назначить зарплату
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Отчет по мероприятию
            </DialogTitle>
            <DialogDescription>
              Подробная информация об отчете сотрудника {viewingReport?.employee_name}
            </DialogDescription>
          </DialogHeader>
          
          {viewingReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Проект</h4>
                  <p className="text-lg">{viewingReport.project_name}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Дата создания</h4>
                  <p className="text-sm text-muted-foreground">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Время на площадке
                  </h4>
                  <p>{formatTime(viewingReport.start_time)} - {formatTime(viewingReport.end_time)}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Сотрудник</h4>
                  <div>
                    <p>{viewingReport.employee_name}</p>
                    <p className="text-sm text-muted-foreground">{viewingReport.employee_email}</p>
                  </div>
                </div>
              </div>

              {(viewingReport.car_kilometers || viewingReport.without_car) && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Информация о поездке:</span>
                  </div>
                  {viewingReport.without_car ? (
                    <div className="text-sm text-blue-700">Работал без машины</div>
                  ) : viewingReport.car_kilometers ? (
                    <div className="text-sm text-blue-700">Пробег: {viewingReport.car_kilometers} км</div>
                  ) : null}
                </div>
              )}

              {viewingReport.salary && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Назначенная выплата:</span>
                  </div>
                  <div className="text-sm text-green-700">
                    {viewingReport.salary.salary_type}: {viewingReport.salary.amount.toLocaleString('ru-RU')} ₽ ({viewingReport.salary.wallet_type})
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Работа по подготовке мероприятия:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{viewingReport.preparation_work}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Работа на площадке:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{viewingReport.onsite_work}</p>
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