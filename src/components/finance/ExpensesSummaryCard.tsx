import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { getCategoryColor } from "./CategoryIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface ExpensesSummaryCardProps {
  totalExpenses: number;
  breakdown: CategoryBreakdown[];
  onClick: () => void;
}

export const ExpensesSummaryCard = ({ totalExpenses, breakdown, onClick }: ExpensesSummaryCardProps) => {
  return (
    <Card
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <h3 className="text-sm font-medium text-muted-foreground">Траты</h3>
          <span className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">
            −{formatCurrency(totalExpenses)}
          </span>
        </div>

        {/* Multi-colored progress bar */}
        <TooltipProvider>
          <div className="h-2 flex rounded-full overflow-hidden bg-muted">
            {breakdown.map((item, index) => (
              <Tooltip key={item.category}>
                <TooltipTrigger asChild>
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: getCategoryColor(item.category, false),
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
