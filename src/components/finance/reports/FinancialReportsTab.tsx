import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FileText } from "lucide-react";
import { useFinancialReports } from "@/hooks/useFinancialReports";
import { FinancialReportCard } from "./FinancialReportCard";
import { FinancialReportCreateDialog } from "./FinancialReportCreateDialog";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const FinancialReportsTab = () => {
  const navigate = useNavigate();
  const { reports, isLoading } = useFinancialReports();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    
    return reports.filter(report => {
      const matchesSearch = !searchQuery || 
        report.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchQuery, statusFilter]);

  // Group reports by month
  const groupedReports = useMemo(() => {
    const groups: { [key: string]: typeof filteredReports } = {};
    
    filteredReports.forEach(report => {
      const date = report.event_date || report.created_at;
      const monthKey = format(parseISO(date), 'LLLL yyyy', { locale: ru });
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(report);
    });

    return groups;
  }, [filteredReports]);

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="draft">Черновик</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="completed">Завершён</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать финотчёт
        </Button>
      </div>

      {/* Reports list grouped by month */}
      {Object.keys(groupedReports).length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Финотчёты не найдены</p>
          <Button variant="outline" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
            Создать первый финотчёт
          </Button>
        </div>
      ) : (
        Object.entries(groupedReports).map(([month, monthReports]) => (
          <div key={month} className="space-y-3">
            <h3 className="text-lg font-semibold capitalize sticky top-0 bg-background py-2 z-10">
              {month}
            </h3>
            <div className="grid gap-3">
              {monthReports.map(report => (
                <FinancialReportCard
                  key={report.id}
                  report={report}
                  onClick={() => navigate(`/finances/report/${report.id}`)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <FinancialReportCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};
