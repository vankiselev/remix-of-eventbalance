import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, isYesterday, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { TransactionCard } from "./TransactionCard";
import { ExpensesSummaryCard } from "./ExpensesSummaryCard";
import { IncomesSummaryCard } from "./IncomesSummaryCard";
import { ExpensesBreakdownDialog } from "./ExpensesBreakdownDialog";
import { IncomesBreakdownDialog } from "./IncomesBreakdownDialog";
import { TransactionDetailDialog } from "./TransactionDetailDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";

interface Transaction {
  id: string;
  operation_date: string;
  created_at: string;
  description: string;
  category: string;
  expense_amount: number;
  income_amount: number;
  project_owner: string;
  cash_type: string | null;
  project_id: string | null;
  no_receipt: boolean;
  no_receipt_reason: string | null;
  notes: string | null;
  created_by: string;
  events?: { name: string } | null;
  attachments_count?: number;
}

interface TransactionsCardViewProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: any) => void;
}

export const TransactionsCardView = ({ userId, isAdmin, onEdit }: TransactionsCardViewProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedWallet, setSelectedWallet] = useState<string>("all");
  const [showTransfers, setShowTransfers] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showExpensesBreakdown, setShowExpensesBreakdown] = useState(false);
  const [showIncomesBreakdown, setShowIncomesBreakdown] = useState(false);

  // Fetch transactions
  useEffect(() => {
    fetchTransactions();
    
    // Realtime subscription
    const channel = supabase
      .channel('financial_transactions_cards')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions'
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, selectedPeriod, selectedWallet, showTransfers]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      let query: any = supabase
        .from('financial_transactions')
        .select('*')
        .order('operation_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by specific user if provided
      if (userId) {
        query = query.eq('created_by', userId);
      }

      // Filter by period
      if (selectedPeriod === "current") {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        query = query.gte('operation_date', startStr).lte('operation_date', endStr);
      }

      // Filter by wallet
      if (selectedWallet !== "all") {
        query = query.eq('cash_type', selectedWallet);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Ошибка загрузки транзакций');
    } finally {
      setLoading(false);
    }
  };

  // Only cash wallets counted in totals/breakdowns
  const cashWallets = useMemo(() => new Set(['Наличка Настя','Наличка Лера','Наличка Ваня']), []);

  const transactionsForCashTotals = useMemo(() => (
    transactions.filter(t => t.cash_type != null && cashWallets.has(String(t.cash_type)))
  ), [transactions, cashWallets]);

  const expensesBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    let total = 0;

    transactionsForCashTotals.forEach(t => {
      if (t.expense_amount > 0) {
        totals[t.category] = (totals[t.category] || 0) + t.expense_amount;
        total += t.expense_amount;
      }
    });

    return Object.entries(totals).map(([category, amount]) => ({
      category,
      amount,
      percentage: total ? (amount / total) * 100 : 0,
    }));
  }, [transactionsForCashTotals]);

  const incomesBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    let total = 0;

    transactionsForCashTotals.forEach(t => {
      if (t.income_amount > 0) {
        totals[t.category] = (totals[t.category] || 0) + t.income_amount;
        total += t.income_amount;
      }
    });

    return Object.entries(totals).map(([category, amount]) => ({
      category,
      amount,
      percentage: total ? (amount / total) * 100 : 0,
    }));
  }, [transactionsForCashTotals]);

  const totalExpenses = useMemo(() => 
    transactionsForCashTotals.reduce((sum, t) => sum + t.expense_amount, 0), 
    [transactionsForCashTotals]
  );

  const totalIncomes = useMemo(() => 
    transactionsForCashTotals.reduce((sum, t) => sum + t.income_amount, 0), 
    [transactionsForCashTotals]
  );

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    transactions.forEach(t => {
      const date = new Date(t.operation_date);
      let label: string;

      if (isToday(date)) {
        label = 'Сегодня';
      } else if (isYesterday(date)) {
        label = 'Вчера';
      } else {
        label = format(date, 'd MMMM', { locale: ru });
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(t);
    });

    return groups;
  }, [transactions]);

  // Calculate daily totals
  const getDailyTotal = (transactions: Transaction[]) => {
    const total = transactions.reduce((sum, t) => 
      sum + t.income_amount - t.expense_amount, 0
    );
    return total;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Текущий месяц</SelectItem>
            <SelectItem value="all">Весь период</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedWallet} onValueChange={setSelectedWallet}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Кошелек" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кошельки</SelectItem>
            <SelectItem value="Наличка Настя">Наличка Настя</SelectItem>
            <SelectItem value="Наличка Лера">Наличка Лера</SelectItem>
            <SelectItem value="Наличка Ваня">Наличка Ваня</SelectItem>
            <SelectItem value="Корп. карта Настя">Корп. карта Настя</SelectItem>
            <SelectItem value="Корп. карта Лера">Корп. карта Лера</SelectItem>
            <SelectItem value="ИП Настя">ИП Настя</SelectItem>
            <SelectItem value="ИП Лера">ИП Лера</SelectItem>
            <SelectItem value="Оплатил(а) клиент">Оплатил(а) клиент</SelectItem>
            <SelectItem value="Оплатила Настя">Оплатила Настя</SelectItem>
            <SelectItem value="Оплатила Лера">Оплатила Лера</SelectItem>
            <SelectItem value="Получила Лера">Получила Лера</SelectItem>
            <SelectItem value="Получила Настя">Получила Настя</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showTransfers ? "default" : "outline"}
          onClick={() => setShowTransfers(!showTransfers)}
          className="w-full md:w-auto"
        >
          {showTransfers ? "Все операции" : "Без переводов"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExpensesSummaryCard
          totalExpenses={totalExpenses}
          breakdown={expensesBreakdown}
          onClick={() => setShowExpensesBreakdown(true)}
        />
        <IncomesSummaryCard
          totalIncomes={totalIncomes}
          breakdown={incomesBreakdown}
          onClick={() => setShowIncomesBreakdown(true)}
        />
      </div>

      {/* Grouped Transactions */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions).map(([dateLabel, dayTransactions]) => {
          const dailyTotal = getDailyTotal(dayTransactions);
          const totalColorClass = dailyTotal > 0 
            ? 'text-green-600 dark:text-green-400' 
            : dailyTotal < 0 
            ? 'text-red-600 dark:text-red-400' 
            : 'text-muted-foreground';

          return (
            <div key={dateLabel} className="space-y-2">
              {/* Date header */}
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                  {dateLabel}
                </h3>
                <span className={`text-sm font-semibold ${totalColorClass}`}>
                  {dailyTotal > 0 && '+'}{dailyTotal !== 0 && formatCurrency(Math.abs(dailyTotal))}
                </span>
              </div>

              {/* Transaction cards */}
              <div className="space-y-2">
                {dayTransactions.map(transaction => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onClick={() => setSelectedTransaction(transaction)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <ExpensesBreakdownDialog
        open={showExpensesBreakdown}
        onOpenChange={setShowExpensesBreakdown}
        breakdown={expensesBreakdown}
        totalExpenses={totalExpenses}
      />

      <IncomesBreakdownDialog
        open={showIncomesBreakdown}
        onOpenChange={setShowIncomesBreakdown}
        breakdown={incomesBreakdown}
        totalIncomes={totalIncomes}
      />

      {selectedTransaction && (
        <TransactionDetailDialog
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          canEdit={isAdmin || selectedTransaction.created_by === user?.id}
          onEdit={onEdit}
        />
      )}
    </div>
  );
};
