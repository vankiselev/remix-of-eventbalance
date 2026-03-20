import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TransactionVerificationDialog } from "@/components/finance/TransactionVerificationDialog";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatFullName, getInitials } from "@/utils/formatName";
import { format } from "date-fns";
import { Search, Filter, CheckCircle, XCircle, Clock, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function TransactionsReviewPage() {
  const { isFinancier, isLoading: permissionsLoading } = useFinancierPermissions();
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['transactions-review', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('is_draft', false)
        .order('operation_date', { ascending: false })
        .limit(100000);

      if (statusFilter !== 'all') {
        query = query.eq('verification_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFinancier,
  });

  const { data: stats } = useQuery({
    queryKey: ['verification-stats'],
    queryFn: async () => {
      const [pendingResult, approvedResult, rejectedResult, totalResult] = await Promise.all([
        supabase
          .from('financial_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('is_draft', false)
          .eq('verification_status', 'pending'),
        supabase
          .from('financial_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('is_draft', false)
          .eq('verification_status', 'approved'),
        supabase
          .from('financial_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('is_draft', false)
          .eq('verification_status', 'rejected'),
        supabase
          .from('financial_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('is_draft', false),
      ]);

      return {
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        rejected: rejectedResult.count || 0,
        total: totalResult.count || 0,
      };
    },
    enabled: isFinancier,
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, avatar_url')
        .eq('employment_status', 'active');
      
      if (error) {
        console.error('[TransactionsReviewPage] Error fetching profiles:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: isFinancier,
  });

  const profilesMap = useMemo(() => {
    const map = new Map();
    profiles?.forEach(p => map.set(p.id, p));
    return map;
  }, [profiles]);

  // Group linked transactions together
  const groupedTransactions = useMemo(() => {
    if (!transactions) return [];

    const linkedMap = new Map<string, any[]>();
    const standalone: any[] = [];
    const processedIds = new Set<string>();

    // First pass: find all linked pairs
    for (const t of transactions) {
      if (processedIds.has(t.id)) continue;

      if (t.linked_transaction_id) {
        const linkedTx = transactions.find(
          (other) => other.id === t.linked_transaction_id
        );
        if (linkedTx && !processedIds.has(linkedTx.id)) {
          // Expense first, then income
          const pair = t.expense_amount && !t.income_amount
            ? [t, linkedTx]
            : [linkedTx, t];
          linkedMap.set(t.id, pair);
          processedIds.add(t.id);
          processedIds.add(linkedTx.id);
          continue;
        }
      }

      // Check if another transaction links to this one
      const linker = transactions.find(
        (other) => other.linked_transaction_id === t.id && !processedIds.has(other.id)
      );
      if (linker) {
        const pair = linker.expense_amount && !linker.income_amount
          ? [linker, t]
          : [t, linker];
        linkedMap.set(t.id, pair);
        processedIds.add(t.id);
        processedIds.add(linker.id);
        continue;
      }
    }

    // Second pass: collect standalone
    for (const t of transactions) {
      if (!processedIds.has(t.id)) {
        standalone.push(t);
      }
    }

    // Build final list: groups and standalone items interleaved by date
    const items: Array<{ type: 'single'; tx: any } | { type: 'linked'; pair: any[] }> = [];

    // Merge standalone and groups by first item date
    const allEntries: Array<{ date: string; item: any }> = [];

    for (const tx of standalone) {
      allEntries.push({ date: tx.operation_date, item: { type: 'single', tx } });
    }
    for (const [, pair] of linkedMap) {
      allEntries.push({ date: pair[0].operation_date, item: { type: 'linked', pair } });
    }

    allEntries.sort((a, b) => b.date.localeCompare(a.date));
    return allEntries.map(e => e.item);
  }, [transactions]);

  // Apply search filter
  const filteredGrouped = useMemo(() => {
    if (!searchQuery) return groupedTransactions;
    const search = searchQuery.toLowerCase();
    return groupedTransactions.filter(item => {
      const txList = item.type === 'single' ? [item.tx] : item.pair;
      return txList.some(t =>
        t.description?.toLowerCase().includes(search) ||
        t.category?.toLowerCase().includes(search) ||
        t.static_project_name?.toLowerCase().includes(search)
      );
    });
  }, [groupedTransactions, searchQuery]);

  if (permissionsLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!isFinancier) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTransactionClick = (transaction: any) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };

  const statCards = [
    { key: 'pending', label: 'На проверке', value: stats?.pending || 0, icon: Clock, color: 'text-yellow-600', bgActive: 'ring-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30' },
    { key: 'approved', label: 'Утверждено', value: stats?.approved || 0, icon: CheckCircle, color: 'text-green-600', bgActive: 'ring-green-500/50 bg-green-50 dark:bg-green-950/30' },
    { key: 'rejected', label: 'Отклонено', value: stats?.rejected || 0, icon: XCircle, color: 'text-red-600', bgActive: 'ring-red-500/50 bg-red-50 dark:bg-red-950/30' },
    { key: 'all', label: 'Всего', value: stats?.total || 0, icon: Filter, color: 'text-blue-600', bgActive: 'ring-blue-500/50 bg-blue-50 dark:bg-blue-950/30' },
  ];

  const renderTransactionRow = (transaction: any, isPartOfLinked = false, position?: 'top' | 'bottom') => {
    const amount = transaction.income_amount || transaction.expense_amount || 0;
    const isIncome = !!transaction.income_amount;

    return (
      <div
        key={transaction.id}
        className={cn(
          "flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
          !isPartOfLinked && "border rounded-lg",
          isPartOfLinked && position === 'top' && "border-t border-x rounded-t-lg",
          isPartOfLinked && position === 'bottom' && "border-b border-x rounded-b-lg",
        )}
        onClick={() => handleTransactionClick(transaction)}
      >
        {/* Author */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-20">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profilesMap.get(transaction.created_by)?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(profilesMap.get(transaction.created_by) || {})}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-center font-medium text-primary truncate w-full">
            {profilesMap.get(transaction.created_by)
              ? formatFullName(profilesMap.get(transaction.created_by))
              : 'Неизвестно'}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{transaction.description}</p>
            <Badge variant={
              transaction.verification_status === 'approved' ? 'default' :
              transaction.verification_status === 'rejected' ? 'destructive' : 'secondary'
            } className="shrink-0">
              {transaction.verification_status === 'pending' && 'На проверке'}
              {transaction.verification_status === 'approved' && 'Утверждено'}
              {transaction.verification_status === 'rejected' && 'Отклонено'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{format(new Date(transaction.operation_date), 'dd.MM.yyyy')}</span>
            <span>{transaction.category}</span>
            {transaction.static_project_name && (
              <span>• {transaction.static_project_name}</span>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0 ml-4">
          <p className={`font-bold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            {isIncome ? '+' : '-'} {formatCurrency(amount)}
          </p>
          {transaction.cash_type && (
            <p className="text-xs text-muted-foreground">{transaction.cash_type}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Проверка транзакций</h1>
          <p className="text-muted-foreground">
            Просмотр и утверждение финансовых операций
          </p>
        </div>

        {/* Stat cards as clickable filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const isActive = statusFilter === card.key;
            return (
              <Card
                key={card.key}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md select-none",
                  isActive && `ring-2 ${card.bgActive}`
                )}
                onClick={() => setStatusFilter(card.key)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", card.color)} />
                    <span className="text-2xl font-bold">{card.value}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по описанию, категории, проекту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transaction list */}
        <Card>
          <CardHeader>
            <CardTitle>Транзакции</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !filteredGrouped?.length ? (
              <p className="text-center text-muted-foreground py-8">
                Транзакции не найдены
              </p>
            ) : (
              <div className="space-y-2">
                {filteredGrouped.map((item, idx) => {
                  if (item.type === 'single') {
                    return renderTransactionRow(item.tx);
                  }

                  // Linked pair
                  const [expense, income] = item.pair;
                  const senderProfile = profilesMap.get(expense.created_by);
                  const recipientProfile = profilesMap.get(income.created_by);
                  const senderName = senderProfile ? formatFullName(senderProfile) : 'Сотрудник';
                  const recipientName = recipientProfile ? formatFullName(recipientProfile) : 'Сотрудник';

                  return (
                    <div key={`linked-${expense.id}`} className="relative">
                      {/* Link label */}
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/60 border border-b-0 rounded-t-lg">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Передача денег: {senderName} → {recipientName}
                        </span>
                        {expense.transfer_status && (
                          <Badge variant={
                            expense.transfer_status === 'accepted' ? 'default' :
                            expense.transfer_status === 'rejected' ? 'destructive' : 'secondary'
                          } className="text-[10px] h-5">
                            {expense.transfer_status === 'pending' && 'Ожидает'}
                            {expense.transfer_status === 'accepted' && 'Принят'}
                            {expense.transfer_status === 'rejected' && 'Отклонён'}
                          </Badge>
                        )}
                      </div>

                      {/* Linked bracket decoration */}
                      <div className="relative flex">
                        {/* Vertical bracket line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/30 rounded-full" />

                        <div className="flex-1 pl-2">
                          {renderTransactionRow(expense, true, 'top')}
                          <div className="border-x border-dashed border-primary/20" />
                          {renderTransactionRow(income, true, 'bottom')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionVerificationDialog
        transaction={selectedTransaction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
    </Layout>
  );
}