import { formatCurrency } from "@/utils/formatCurrency";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "@/components/ui/badge";

const normalizeWallet = (s?: string) => (s || '').trim().toLowerCase();
const walletDisplay = (s?: string | null) => {
  const v = normalizeWallet(s || undefined);
  if (v === 'наличка настя' || v === 'nastya') return 'Наличка Настя';
  if (v === 'наличка лера' || v === 'lera') return 'Наличка Лера';
  if (v === 'наличка ваня' || v === 'vanya') return 'Наличка Ваня';
  return s || 'Не указан';
};

interface TransactionCardProps {
  transaction: {
    id: string;
    operation_date: string;
    description: string;
    category: string;
    expense_amount: number;
    income_amount: number;
    project_owner?: string;
    cash_type?: string;
    static_project_name?: string;
    events?: { name: string } | null;
  };
  onClick: () => void;
}

export const TransactionCard = ({ transaction, onClick }: TransactionCardProps) => {
  const isIncome = transaction.income_amount > 0;
  const amount = isIncome ? transaction.income_amount : transaction.expense_amount;
  
  // После категории всегда показываем проект
  const projectName = transaction.static_project_name || transaction.events?.name;

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
          {projectName && (
            <span>{projectName}</span>
          )}
          {projectName && <span className="hidden md:inline">•</span>}
          <span className="hidden md:inline">{transaction.category}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col items-end">
        <div
          className={`font-semibold text-sm md:text-base ${
            isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isIncome ? '+' : '−'}{formatCurrency(amount)}
        </div>
        {transaction.cash_type && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
            {walletDisplay(transaction.cash_type)}
          </Badge>
        )}
      </div>
    </div>
  );
};
