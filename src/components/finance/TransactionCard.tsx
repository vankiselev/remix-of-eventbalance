import { formatCurrency } from "@/utils/formatCurrency";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Mic } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatFullName, getInitials } from "@/utils/formatName";

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
    transfer_status?: string | null;
    transfer_rejection_reason?: string | null;
    verification_status?: string | null;
    requires_verification?: boolean | null;
    is_draft?: boolean | null;
    no_receipt_reason?: string | null;
  };
  onClick: () => void;
  verification_status?: string | null;
  ownerProfile?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export const TransactionCard = ({ transaction, onClick, verification_status, ownerProfile }: TransactionCardProps) => {
  const isIncome = transaction.income_amount > 0;
  const amount = isIncome ? transaction.income_amount : transaction.expense_amount;
  const isMoneyTransfer = transaction.category === 'Передано или получено от сотрудника';
  const isRejectedTransfer = isMoneyTransfer && transaction.transfer_status === 'rejected';
  const isPending = verification_status === 'pending' || transaction.verification_status === 'pending';
  const isDraft = transaction.is_draft === true;
  const isVoiceTransaction = transaction.no_receipt_reason?.includes('Siri') || false;
  
  // После категории всегда показываем проект
  const projectName = transaction.static_project_name || transaction.events?.name;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 sm:gap-3 p-3 md:p-4 active:bg-accent/70 hover:bg-accent/50 rounded-lg border cursor-pointer transition-colors touch-manipulation ${
        isDraft ? 'bg-blue-500/5 border-blue-500/30' :
        isPending ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-card border-border'
      }`}
    >
      {/* Owner Avatar and Name */}
      {ownerProfile && (
        <div className="flex flex-col items-center gap-1 shrink-0 w-14 md:w-16">
          <Avatar className="h-8 w-8 md:h-10 md:w-10">
            <AvatarImage src={ownerProfile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(ownerProfile)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] md:text-xs text-center font-medium text-muted-foreground truncate w-full leading-tight">
            {formatFullName(ownerProfile).split(' ')[0]}
          </span>
        </div>
      )}

      {/* Icon */}
      <CategoryIcon category={transaction.category} isIncome={isIncome} />

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isVoiceTransaction && (
            <Mic className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 shrink-0" />
          )}
          <span className="font-medium text-[13px] sm:text-sm md:text-base truncate">
            {transaction.description}
          </span>
          {isDraft && (
            <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 gap-0.5 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 shrink-0 whitespace-nowrap">
              <Mic className="h-2.5 w-2.5" />
              Черновик
            </Badge>
          )}
          {isPending && !isDraft && (
            <Badge variant="outline" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 gap-0.5 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 shrink-0 whitespace-nowrap">
              <Clock className="h-2.5 w-2.5" />
              На проверке
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
          {projectName && (
            <span className="truncate">{projectName}</span>
          )}
          {projectName && <span className="hidden md:inline shrink-0">•</span>}
          <span className="hidden md:inline truncate">{transaction.category}</span>
        </div>
        {isRejectedTransfer && (
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">Получатель отклонил передачу</span>
            </div>
            {transaction.transfer_rejection_reason && (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
                Причина: {transaction.transfer_rejection_reason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="flex flex-col items-end shrink-0 ml-1">
        <div
          className={`font-semibold text-[13px] sm:text-sm md:text-base tabular-nums ${
            isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isIncome ? '+' : '−'}{formatCurrency(amount)}
        </div>
        {transaction.cash_type && (
          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 mt-0.5">
            {walletDisplay(transaction.cash_type)}
          </Badge>
        )}
      </div>
    </div>
  );
};
