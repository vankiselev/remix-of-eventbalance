import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { getCategoryColor, CategoryIcon } from "./CategoryIcon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface ExpensesBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown: CategoryBreakdown[];
  totalExpenses: number;
}

export const ExpensesBreakdownDialog = ({
  open,
  onOpenChange,
  breakdown,
  totalExpenses,
}: ExpensesBreakdownDialogProps) => {
  const sortedBreakdown = [...breakdown].sort((a, b) => b.amount - a.amount);

  // Prepare data for pie chart
  const chartData = sortedBreakdown.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
  }));

  // Custom label to show percentage
  const renderLabel = (entry: any) => {
    return `${entry.percentage.toFixed(0)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Траты по категориям</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-1">Всего потрачено</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalExpenses)}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="w-full h-[220px] mb-6 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getCategoryColor(entry.name, false)}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Categories List */}
        <ScrollArea className="max-h-[350px]">
          <div className="grid grid-cols-2 gap-2">
            {sortedBreakdown.map((item) => (
              <div 
                key={item.category} 
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
              >
                <CategoryIcon category={item.category} isIncome={false} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">{item.category}</div>
                  <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
