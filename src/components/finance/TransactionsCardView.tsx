import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
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

const normalizeWallet = (s?: string) => (s || '').trim().toLowerCase();
const walletDisplay = (s?: string | null) => {
  const v = normalizeWallet(s || undefined);
  if (v === 'наличка настя' || v === 'nastya') return 'Наличка Настя';
  if (v === 'наличка лера' || v === 'lera') return 'Наличка Лера';
  if (v === 'наличка ваня' || v === 'vanya') return 'Наличка Ваня';
  return s || 'Не указан';
};

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
  static_project_name?: string | null;
  no_receipt: boolean;
  no_receipt_reason: string | null;
  notes: string | null;
  created_by: string;
  events?: { name: string } | null;
  attachments_count?: number;
  transfer_status?: string | null;
  transfer_to_user_id?: string | null;
  transfer_from_user_id?: string | null;
  transfer_to_user?: { full_name: string; email: string } | null;
  transfer_from_user?: { full_name: string; email: string } | null;
}

interface TransactionsCardViewProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: any) => void;
}

export const TransactionsCardView = ({ userId, isAdmin, onEdit }: TransactionsCardViewProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // Все транзакции для определения доступных месяцев
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedWallet, setSelectedWallet] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showExpensesBreakdown, setShowExpensesBreakdown] = useState(false);
  const [showIncomesBreakdown, setShowIncomesBreakdown] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(0);
  const debouncedRefetch = useDebounce(shouldRefetch, 2000); // 2 seconds debounce

  // Fetch transactions on mount and filter changes
  useEffect(() => {
    fetchTransactions();
  }, [userId, isAdmin, selectedPeriod, selectedWallet]);

  // Realtime subscription with debounce
  useEffect(() => {
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
          setShouldRefetch(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Debounced refetch
  useEffect(() => {
    if (debouncedRefetch > 0) {
      fetchTransactions();
    }
  }, [debouncedRefetch]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Сначала получаем все транзакции для определения доступных месяцев
      let allQuery: any = supabase
        .from('financial_transactions')
        .select('operation_date')
        .order('operation_date', { ascending: false });
      
      if (userId) {
        allQuery = allQuery.eq('created_by', userId);
      }
      
      const { data: allDates } = await allQuery;
      setAllTransactions(allDates || []);
      
      // Теперь получаем транзакции с учетом фильтров
      let query: any = supabase
        .from('financial_transactions')
        .select(`
          *,
          events:project_id(name)
        `)
        .order('operation_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by specific user if provided
      if (userId) {
        query = query.eq('created_by', userId);
      }

      // Filter by period
      if (selectedPeriod !== "all" && selectedPeriod !== "current") {
        // Формат: "2025-01" (год-месяц)
        const [year, month] = selectedPeriod.split('-');
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const end = endOfMonth(start);
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        query = query.gte('operation_date', startStr).lte('operation_date', endStr);
      } else if (selectedPeriod === "current") {
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

      // Get transfer user IDs and fetch their profiles
      const transferUserIds = [
        ...(data || []).filter(t => t.transfer_to_user_id).map(t => t.transfer_to_user_id),
        ...(data || []).filter(t => t.transfer_from_user_id).map(t => t.transfer_from_user_id),
      ].filter(Boolean) as string[];

      if (transferUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(new Set(transferUserIds)));

        const userMap = new Map((profilesData || []).map(p => [p.id, p]));

        const enrichedData = (data || []).map(transaction => ({
          ...transaction,
          transfer_to_user: transaction.transfer_to_user_id 
            ? userMap.get(transaction.transfer_to_user_id) || null
            : null,
          transfer_from_user: transaction.transfer_from_user_id
            ? userMap.get(transaction.transfer_from_user_id) || null
            : null,
        }));

        setTransactions(enrichedData);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Ошибка загрузки транзакций');
    } finally {
      setLoading(false);
    }
  };

  const cashWallets = useMemo(() => new Set(['наличка настя','наличка лера','наличка ваня']), []);
  
  // Получаем список доступных месяцев из транзакций
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allTransactions.forEach(t => {
      if (t.operation_date) {
        const date = new Date(t.operation_date);
        const monthKey = format(date, 'yyyy-MM');
        months.add(monthKey);
      }
    });
    
    // Сортируем по убыванию (новые первые)
    return Array.from(months).sort((a, b) => b.localeCompare(a)).map(monthKey => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ];
      return {
        value: monthKey,
        label: `${monthNames[date.getMonth()]} ${year}`
      };
    });
  }, [allTransactions]);

  const transactionsForCashTotals = useMemo(() => (
    transactions.filter(t => t.cash_type != null && cashWallets.has(normalizeWallet(String(t.cash_type))))
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

  // Get unique wallet types from transactions
  const availableWallets = useMemo(() => {
    const wallets = new Set<string>();
    transactions.forEach(t => {
      if (t.cash_type) {
        wallets.add(t.cash_type);
      }
    });
    return Array.from(wallets).sort();
  }, [transactions]);

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
      <div className="flex gap-3 pt-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Текущий месяц</SelectItem>
            <SelectItem value="all">Весь период</SelectItem>
            {availableMonths.map(month => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedWallet} onValueChange={setSelectedWallet}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Кошелек" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кошельки</SelectItem>
            {availableWallets.map(wallet => (
              <SelectItem key={wallet} value={wallet}>
                {walletDisplay(wallet)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-b"></div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
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
