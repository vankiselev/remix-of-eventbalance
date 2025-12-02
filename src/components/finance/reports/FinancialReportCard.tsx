import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { formatCurrency } from "@/utils/formatCurrency";
import type { FinancialReport } from "@/hooks/useFinancialReports";

interface FinancialReportCardProps {
  report: FinancialReport;
  onClick: () => void;
}

const statusConfig = {
  draft: { label: "Черновик", variant: "secondary" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  completed: { label: "Завершён", variant: "outline" as const },
};

export const FinancialReportCard = ({ report, onClick }: FinancialReportCardProps) => {
  const profit = report.total_actual_income - report.total_actual_expense;
  const plannedProfit = report.total_planned_income - report.total_planned_expense;
  const status = statusConfig[report.status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Name and date */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate">{report.name}</h4>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {report.event_date && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>{format(parseISO(report.event_date), 'd MMMM yyyy', { locale: ru })}</span>
              </div>
            )}
          </div>

          {/* Center: Plan vs Actual */}
          <div className="flex flex-wrap gap-4 md:gap-6">
            {/* Plan */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">План</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatCurrency(report.total_planned_income)}</span>
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatCurrency(report.total_planned_expense)}</span>
                </div>
              </div>
            </div>

            {/* Actual */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Факт</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatCurrency(report.total_actual_income)}</span>
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatCurrency(report.total_actual_expense)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Profit */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Прибыль</p>
            <div className="flex items-center gap-2">
              <DollarSign className={`w-5 h-5 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
              </span>
            </div>
            {plannedProfit !== profit && (
              <span className={`text-xs ${profit >= plannedProfit ? 'text-green-600' : 'text-red-600'}`}>
                План: {formatCurrency(plannedProfit)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
