import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { format, isToday, isYesterday, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { TransactionCard } from "./TransactionCard";
import { ExpensesBreakdownDialog } from "./ExpensesBreakdownDialog";
import { IncomesBreakdownDialog } from "./IncomesBreakdownDialog";
import { TransactionDetailDialog } from "./TransactionDetailDialog";
import { TransactionFilter } from "./TransactionFilter";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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
  verification_status?: string | null;
  requires_verification?: boolean | null;
}

interface TransactionsCardViewProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: any) => void;
  showOwner?: boolean;
  refreshTrigger?: number;
}

export const TransactionsCardView = ({ userId, isAdmin, onEdit, showOwner, refreshTrigger }: TransactionsCardViewProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // Все транзакции для определения доступных месяцев
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showExpensesBreakdown, setShowExpensesBreakdown] = useState(false);
  const [showIncomesBreakdown, setShowIncomesBreakdown] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(0);
  const debouncedRefetch = useDebounce(shouldRefetch, 2000);

  // Compact filters
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [selectedIncomes, setSelectedIncomes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch transactions on mount and when refreshTrigger changes
  useEffect(() => {
    fetchTransactions();
  }, [userId, isAdmin, refreshTrigger]);

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

  // Fetch profiles for transaction owners (only if showOwner is true)
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, avatar_url')
        .eq('employment_status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: showOwner === true,
    staleTime: 5 * 60 * 1000,
  });

  const profilesMap = useMemo(() => {
    const map = new Map();
    profiles?.forEach(p => map.set(p.id, p));
    return map;
  }, [profiles]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      let query: any = supabase
        .from('financial_transactions')
        .select(`
          *,
          events:project_id(name)
        `)
        .order('operation_date', { ascending: false })
        .order('import_row_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('created_by', userId);
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
  
  // Уникальные даты (конкретные дни)
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    transactions.forEach(t => {
      const dateStr = t.operation_date.split('T')[0];
      dates.add(dateStr);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a)).map(d => ({
      value: d,
      label: format(new Date(d), 'dd.MM.yyyy')
    }));
  }, [transactions]);

  // Уникальные периоды (месяцы)
  const availablePeriods = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const date = new Date(t.operation_date);
      const key = format(date, 'yyyy-MM');
      months.add(key);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)).map(m => {
      const label = format(new Date(m + '-01'), 'LLLL yyyy', { locale: ru });
      return {
        value: m,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      };
    });
  }, [transactions]);

  // Unique projects
  const availableProjects = useMemo(() => {
    const projects = new Set<string>();
    transactions.forEach(t => {
      if (t.static_project_name) projects.add(t.static_project_name);
      if (t.events?.name) projects.add(t.events.name);
    });
    return Array.from(projects).sort().map(p => ({ value: p, label: p }));
  }, [transactions]);

  // Unique expense amounts
  const uniqueExpenses = useMemo(() => {
    const expenses = new Set<number>();
    transactions.forEach(t => {
      if (t.expense_amount > 0) expenses.add(t.expense_amount);
    });
    return Array.from(expenses).sort((a, b) => b - a).map(e => ({ 
      value: String(e), 
      label: formatCurrency(e) 
    }));
  }, [transactions]);

  // Unique income amounts
  const uniqueIncomes = useMemo(() => {
    const incomes = new Set<number>();
    transactions.forEach(t => {
      if (t.income_amount > 0) incomes.add(t.income_amount);
    });
    return Array.from(incomes).sort((a, b) => b - a).map(i => ({ 
      value: String(i), 
      label: formatCurrency(i) 
    }));
  }, [transactions]);

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

  // All unique categories for filter
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category));
    return Array.from(cats).sort().map(c => ({ value: c, label: c }));
  }, [transactions]);

  // All unique project owners (wallets) for filter
  const allWallets = useMemo(() => {
    const ws = new Set<string>();
    transactions.forEach(t => {
      if (t.project_owner) ws.add(t.project_owner);
    });
    return Array.from(ws).sort().map(w => ({ value: w, label: walletDisplay(w) }));
  }, [transactions]);

  // Apply compact filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // По конкретной дате
      if (selectedDates.length > 0) {
        const dateStr = t.operation_date.split('T')[0];
        if (!selectedDates.includes(dateStr)) return false;
      }

      // По периоду (месяцу)
      if (selectedPeriods.length > 0) {
        const month = format(new Date(t.operation_date), 'yyyy-MM');
        if (!selectedPeriods.includes(month)) return false;
      }
      
      // By project
      if (selectedProjects.length > 0) {
        const project = t.static_project_name || t.events?.name;
        if (!project || !selectedProjects.includes(project)) return false;
      }
      
      // By wallet (project owner)
      if (selectedWallets.length > 0) {
        if (!selectedWallets.includes(t.project_owner)) return false;
      }
      
      // By expense amount
      if (selectedExpenses.length > 0) {
        if (!selectedExpenses.includes(String(t.expense_amount))) return false;
      }
      
      // By income amount
      if (selectedIncomes.length > 0) {
        if (!selectedIncomes.includes(String(t.income_amount))) return false;
      }
      
      // By category
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(t.category)) return false;
      }
      
      return true;
    });
  }, [transactions, selectedDates, selectedPeriods, selectedProjects, selectedWallets, 
      selectedExpenses, selectedIncomes, selectedCategories]);

  // Group filtered transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    filteredTransactions.forEach(t => {
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
  }, [filteredTransactions]);

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
      {/* Compact Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-4">
        <TransactionFilter
          column="date"
          title={selectedDates.length > 0 ? `Дата: ${selectedDates.length}` : "Дата"}
          options={availableDates}
          selectedValues={selectedDates}
          onFilterChange={setSelectedDates}
          onReset={() => setSelectedDates([])}
        />

        <TransactionFilter
          column="project"
          title={selectedProjects.length > 0 ? `Проект: ${selectedProjects.length}` : "Проект"}
          options={availableProjects}
          selectedValues={selectedProjects}
          onFilterChange={setSelectedProjects}
          onReset={() => setSelectedProjects([])}
        />

        <TransactionFilter
          column="wallet"
          title={selectedWallets.length > 0 ? `Кошельки: ${selectedWallets.length}` : "Кошельки"}
          options={allWallets}
          selectedValues={selectedWallets}
          onFilterChange={setSelectedWallets}
          onReset={() => setSelectedWallets([])}
        />

        <TransactionFilter
          column="expense"
          title={selectedExpenses.length > 0 ? `Трата: ${selectedExpenses.length}` : "Трата"}
          options={uniqueExpenses}
          selectedValues={selectedExpenses}
          onFilterChange={setSelectedExpenses}
          onReset={() => setSelectedExpenses([])}
        />

        <TransactionFilter
          column="income"
          title={selectedIncomes.length > 0 ? `Приход: ${selectedIncomes.length}` : "Приход"}
          options={uniqueIncomes}
          selectedValues={selectedIncomes}
          onFilterChange={setSelectedIncomes}
          onReset={() => setSelectedIncomes([])}
        />

        <TransactionFilter
          column="category"
          title={selectedCategories.length > 0 ? `Категория: ${selectedCategories.length}` : "Категория"}
          options={allCategories}
          selectedValues={selectedCategories}
          onFilterChange={setSelectedCategories}
          onReset={() => setSelectedCategories([])}
        />

        <TransactionFilter
          column="period"
          title={selectedPeriods.length > 0 ? `Период: ${selectedPeriods.length}` : "Период"}
          options={availablePeriods}
          selectedValues={selectedPeriods}
          onFilterChange={setSelectedPeriods}
          onReset={() => setSelectedPeriods([])}
        />
      </div>

      <div className="border-b"></div>

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
                    verification_status={transaction.verification_status}
                    ownerProfile={showOwner ? profilesMap.get(transaction.created_by) : undefined}
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
