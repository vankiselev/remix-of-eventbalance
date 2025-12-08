import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";
import type { FinancialReportItem } from "@/hooks/useFinancialReports";

interface PlanFactTableProps {
  items: FinancialReportItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  type: 'income' | 'expense';
}

export const PlanFactTable = ({ items, selectedItemId, onSelectItem, type }: PlanFactTableProps) => {
  const getPercentage = (planned: number, actual: number): number => {
    if (planned === 0) return actual > 0 ? 100 : 0;
    return Math.round((actual / planned) * 100);
  };

  const getDeviation = (planned: number, actual: number): number => {
    return type === 'expense' ? planned - actual : actual - planned;
  };

  const getDeviationColor = (deviation: number, type: 'income' | 'expense'): string => {
    if (type === 'expense') {
      // For expenses: positive deviation (spent less) is good
      return deviation >= 0 ? 'text-green-600' : 'text-red-600';
    } else {
      // For income: positive deviation (earned more) is good
      return deviation >= 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  const getProgressColor = (percentage: number, type: 'income' | 'expense'): string => {
    if (type === 'expense') {
      // For expenses: over 100% is bad (overspending)
      if (percentage > 100) return 'bg-red-500';
      if (percentage >= 90) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      // For income: under 100% is concerning
      if (percentage < 50) return 'bg-red-500';
      if (percentage < 90) return 'bg-yellow-500';
      return 'bg-green-500';
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Нет статей
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Статья</TableHead>
          <TableHead className="text-right w-[15%]">План</TableHead>
          <TableHead className="text-right w-[15%]">Факт</TableHead>
          <TableHead className="text-right w-[15%]">Откл.</TableHead>
          <TableHead className="w-[15%]">%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const percentage = getPercentage(item.planned_amount, item.actual_amount);
          const deviation = getDeviation(item.planned_amount, item.actual_amount);
          const isSelected = selectedItemId === item.id;

          return (
            <TableRow
              key={item.id}
              className={cn(
                "cursor-pointer transition-colors",
                isSelected && "bg-primary/10 hover:bg-primary/15",
                item.is_matched && !isSelected && "bg-green-500/5"
              )}
              onClick={() => onSelectItem(isSelected ? null : item.id)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  {item.is_matched && (
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.category}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.planned_amount)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {item.actual_amount > 0 ? formatCurrency(item.actual_amount) : '—'}
              </TableCell>
              <TableCell className={cn("text-right font-medium", getDeviationColor(deviation, type))}>
                {deviation > 0 ? '+' : ''}{formatCurrency(deviation)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        getProgressColor(percentage, type)
                      )}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium min-w-[3rem] text-right",
                    percentage > 100 && type === 'expense' && "text-red-600",
                    percentage < 50 && type === 'income' && "text-red-600"
                  )}>
                    {percentage}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
