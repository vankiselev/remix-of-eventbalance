import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "@/components/ui/badge";

interface TransactionCardProps {
  transaction: {
    id: string;
    operation_date: string;
    created_at: string;
    description: string;
    category: string;
    expense_amount: number;
    income_amount: number;
    project_owner?: string;
    cash_type?: string;
    static_project_name?: string;
  };
  onClick: () => void;
}

export const TransactionCard = ({ transaction, onClick }: TransactionCardProps) => {
  const isIncome = transaction.income_amount > 0;
  const amount = isIncome ? transaction.income_amount : transaction.expense_amount;
  const time = format(new Date(transaction.created_at), 'HH:mm');
  
  // Для категории "Передано или получено от сотрудника" показываем проект, иначе - чей проект
  const isTransferCategory = transaction.category === 'Передано или получено от сотрудника';
  const secondaryInfo = isTransferCategory ? transaction.static_project_name : transaction.project_owner;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 md:p-4 bg-card hover:bg-accent/50 rounded-lg border border-border cursor-pointer transition-colors"
    >
      {/* Icon */}
      <CategoryIcon category={transaction.category} isIncome={isIncome} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm md:text-base truncate">
          {transaction.description}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{transaction.category}</span>
          {secondaryInfo && (
            <>
              <span>•</span>
              <span>{secondaryInfo}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount & Time */}
      <div className="flex flex-col items-end gap-1">
        <div
          className={`font-semibold text-sm md:text-base ${
            isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isIncome ? '+' : '−'}{formatCurrency(amount)}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{time}</span>
          {transaction.cash_type && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {transaction.cash_type}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
