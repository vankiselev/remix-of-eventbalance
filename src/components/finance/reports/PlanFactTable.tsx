import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";
import type { FinancialReportItem } from "@/hooks/useFinancialReports";

interface PlanFactTableProps {
  items: FinancialReportItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onAddItem?: () => void;
  onEditItem?: (item: FinancialReportItem) => void;
  onDeleteItem?: (id: string) => void;
}

export const PlanFactTable = ({ 
  items, 
  selectedItemId, 
  onSelectItem, 
  onAddItem,
  onEditItem,
  onDeleteItem 
}: PlanFactTableProps) => {
  // Calculate totals for combined actual
  const getActualTotal = (item: FinancialReportItem): number => {
    const income = (item as any).actual_income || 0;
    const expense = (item as any).actual_expense || 0;
    // Legacy support: use actual_amount if new fields are not set
    if (income === 0 && expense === 0 && item.actual_amount > 0) {
      return item.actual_amount;
    }
    return income + expense;
  };

  const getPercentage = (planned: number, actual: number): number => {
    if (planned === 0) return actual > 0 ? 100 : 0;
    return Math.round((actual / planned) * 100);
  };

  const getDeviation = (planned: number, actual: number): number => {
    return actual - planned;
  };

  const getDeviationColor = (deviation: number): string => {
    if (deviation === 0) return 'text-muted-foreground';
    return deviation > 0 ? 'text-red-600' : 'text-green-600';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-green-500';
    return 'bg-primary';
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Удалить статью?')) {
      onDeleteItem?.(id);
    }
  };

  const handleEdit = (e: React.MouseEvent, item: FinancialReportItem) => {
    e.stopPropagation();
    onEditItem?.(item);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">
            <div className="flex items-center justify-between">
              <span>Статья</span>
              {onAddItem && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={onAddItem}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableHead>
          <TableHead className="text-right w-[12%]">План</TableHead>
          <TableHead className="text-right w-[10%]">
            <div className="flex items-center justify-end gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span>Факт</span>
            </div>
          </TableHead>
          <TableHead className="text-right w-[10%]">
            <div className="flex items-center justify-end gap-1">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span>Факт</span>
            </div>
          </TableHead>
          <TableHead className="text-right w-[12%]">Откл.</TableHead>
          <TableHead className="w-[12%]">%</TableHead>
          {(onEditItem || onDeleteItem) && (
            <TableHead className="w-[14%]"></TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={onEditItem || onDeleteItem ? 7 : 6} className="text-center py-8 text-muted-foreground">
              Нет статей. Импортируйте смету или добавьте вручную.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => {
            const actualIncome = (item as any).actual_income || 0;
            const actualExpense = (item as any).actual_expense || 0;
            const actualTotal = getActualTotal(item);
            const percentage = getPercentage(item.planned_amount, actualTotal);
            const deviation = getDeviation(item.planned_amount, actualTotal);
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
                <TableCell className="text-right font-medium text-green-600">
                  {actualIncome > 0 ? formatCurrency(actualIncome) : '—'}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {actualExpense > 0 ? formatCurrency(actualExpense) : '—'}
                </TableCell>
                <TableCell className={cn("text-right font-medium", getDeviationColor(deviation))}>
                  {deviation !== 0 ? (deviation > 0 ? '+' : '') + formatCurrency(deviation) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          getProgressColor(percentage)
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-medium min-w-[3rem] text-right",
                      percentage > 100 && "text-red-600"
                    )}>
                      {percentage}%
                    </span>
                  </div>
                </TableCell>
                {(onEditItem || onDeleteItem) && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {onEditItem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleEdit(e, item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDeleteItem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(e, item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};
