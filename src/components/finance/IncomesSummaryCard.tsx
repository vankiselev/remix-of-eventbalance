import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { getCategoryColor } from "./CategoryIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface IncomesSummaryCardProps {
  totalIncomes: number;
  breakdown: CategoryBreakdown[];
  onClick: () => void;
}

export const IncomesSummaryCard = ({ totalIncomes, breakdown, onClick }: IncomesSummaryCardProps) => {
  return (
    <Card
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Доходы</h3>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            +{formatCurrency(totalIncomes)}
          </span>
        </div>

        {/* Multi-colored progress bar for income sources */}
        <TooltipProvider>
          <div className="h-2 flex rounded-full overflow-hidden bg-muted">
            {breakdown.map((item) => (
              <Tooltip key={item.category}>
                <TooltipTrigger asChild>
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: getCategoryColor(item.category, true),
                    }}
                    className="h-full transition-all hover:opacity-80"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{item.category}</p>
                  <p className="text-sm">{formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>
    </Card>
  );
};
