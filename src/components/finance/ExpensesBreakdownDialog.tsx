import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { CategoryIcon } from "./CategoryIcon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useCategoryIcons } from "@/hooks/useCategoryIcons";

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
  const { categoryIcons } = useCategoryIcons();
  const sortedBreakdown = [...breakdown].sort((a, b) => b.amount - a.amount);

  // Get color for category from database
  const getCategoryColorFromDB = (categoryName: string): string => {
    const icon = categoryIcons.find(icon => icon.category_name === categoryName);
    if (icon && icon.bg_color) {
      // Extract color from bg_color class (e.g., "bg-blue-500/10" -> "hsl(217, 91%, 60%)")
      // For now, we'll use a mapping or the bg_color directly if it's a valid color
      const colorMap: Record<string, string> = {
        'Выплаты (зарплаты/аванс/бонусы)': '#4F46E5',
        'Передано или получено от коллеги': '#10B981',
        'Аниматоры / Шоу / Кукольники': '#EC4899',
        'Закупки / Оплаты партнёрам': '#F97316',
        'Агентская комиссия': '#8B5CF6',
        'Производство (декор, рекв)': '#6B7280',
        'Доставка / Транспорт': '#06B6D4',
        'Накладные расходы / Связь / Проч.': '#EF4444',
        'Комиссия за перевод': '#64748B',
      };
      return colorMap[categoryName] || '#6B7280';
    }
    return '#6B7280'; // default gray
  };

  // Prepare data for pie chart
  const chartData = sortedBreakdown.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: getCategoryColorFromDB(item.category),
  }));

  // Custom label to show percentage outside with line
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
        <div className="w-full h-[280px] mb-6 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                label={renderLabel}
                labelLine={true}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="white"
                    strokeWidth={2}
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
                  <div className="text-xs text-muted-foreground">
                    {item.percentage.toFixed(0)}%
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
