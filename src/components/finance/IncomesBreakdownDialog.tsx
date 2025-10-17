import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { getCategoryColor } from "./CategoryIcon";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Доходы по категориям</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="text-sm text-muted-foreground">Всего получено</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalIncomes)}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {sortedBreakdown.map((item) => (
              <div key={item.category} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getCategoryColor(item.category, true) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.category}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="font-semibold text-green-600 dark:text-green-400">
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
