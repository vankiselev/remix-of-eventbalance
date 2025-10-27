import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { getCategoryColor } from "./CategoryIcon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface IncomesBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown: CategoryBreakdown[];
  totalIncomes: number;
}

export const IncomesBreakdownDialog = ({
  open,
  onOpenChange,
  breakdown,
  totalIncomes,
}: IncomesBreakdownDialogProps) => {
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
          <DialogTitle>Доходы по категориям</DialogTitle>
        </DialogHeader>

        <div className="mb-2">
          <div className="text-sm text-muted-foreground">Всего получено</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalIncomes)}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="w-full h-[240px] my-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getCategoryColor(entry.name, true)}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Categories List */}
        <ScrollArea className="max-h-[300px]">
          <div className="grid grid-cols-1 gap-2">
            {sortedBreakdown.map((item) => (
              <div 
                key={item.category} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getCategoryColor(item.category, true) + '20' }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getCategoryColor(item.category, true) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.category}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="font-semibold text-sm text-green-600 dark:text-green-400 whitespace-nowrap">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
