import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, DollarSign, Clock, User, Filter } from "lucide-react";
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
  salary?: {
    id: string;
    amount: number;
    wallet_type: string;
    notes?: string;
  };
}

const AdminReportsView = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportWithEmployee[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportWithEmployee | null>(null);
  const [salaryDialog, setSalaryDialog] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    amount: "",
    wallet_type: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const walletTypes = ["Наличка Настя", "Наличка Лера", "Наличка Ваня"];

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

      // Extract unique projects
      const uniqueProjects = [...new Set(reportsWithEmployees.map(r => r.project_name))].sort();
      setProjects(uniqueProjects);
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

    setFilteredReports(filtered);
  }, [searchTerm, projectFilter, reports]);

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
      const { error } = await supabase
        .from("event_report_salaries")
        .upsert({
          report_id: selectedReport.id,
          employee_user_id: selectedReport.user_id,
          amount: parseFloat(salaryForm.amount),
          wallet_type: salaryForm.wallet_type,
          notes: salaryForm.notes,
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Зарплата назначена",
      });

      setSalaryDialog(false);
      setSalaryForm({ amount: "", wallet_type: "", notes: "" });
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
      notes: report.salary?.notes || "",
    });
    setSalaryDialog(true);
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Проект</TableHead>
                    <TableHead>Время на площадке</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead>Зарплата</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{report.employee_name}</div>
                            <div className="text-sm text-muted-foreground">{report.employee_email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{report.project_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {report.start_time} - {report.end_time}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(report.created_at)}</TableCell>
                      <TableCell>
                        {report.salary ? (
                          <div className="space-y-1">
                            <div className="font-medium">{report.salary.amount.toLocaleString('ru-RU')} ₽</div>
                            <Badge variant="outline" className="text-xs">
                              {report.salary.wallet_type}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary">Не назначена</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSalaryDialog(report)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          {report.salary ? "Изменить" : "Назначить"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            
            <div>
              <label className="text-sm font-medium">Примечания (необязательно)</label>
              <Input
                placeholder="Дополнительные заметки"
                value={salaryForm.notes}
                onChange={(e) => setSalaryForm({...salaryForm, notes: e.target.value})}
              />
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
    </div>
  );
};

export default AdminReportsView;