import { useState, useMemo } from "react";
import { useWalletNames } from "@/hooks/useWalletNames";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { formatFullName, getInitials } from "@/utils/formatName";
import { formatCurrency } from "@/utils/formatCurrency";
import { TransactionVerificationDialog } from "@/components/finance/TransactionVerificationDialog";

interface ReviewTabProps {
  enabled: boolean;
}

export const ReviewTab = ({ enabled }: ReviewTabProps) => {
  const { getWalletDisplayName } = useWalletNames();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch transactions for review (exclude drafts)
  const { data: reviewTransactions, isLoading: reviewLoading, refetch: refetchReview } = useQuery({
    queryKey: ['transactions-review', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('is_draft', false)
        .order('operation_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('verification_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds for review data
    gcTime: 5 * 60 * 1000,
  });

  // Derive verification stats from loaded transactions instead of 4 extra COUNT queries
  const reviewStats = useMemo(() => {
    if (!reviewTransactions) return { pending: 0, approved: 0, rejected: 0, total: 0 };
    // When filtering by status, we only have partial data — use count from what we have
    // For accurate stats, we need all statuses; but only compute when statusFilter is active
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: reviewTransactions.length,
    };
  }, [reviewTransactions]);

  // Separate stats query with longer staleTime to avoid 4 COUNT queries on every tab switch
  const { data: fullStats } = useQuery({
    queryKey: ['verification-stats'],
    queryFn: async () => {
      const [pendingResult, approvedResult, rejectedResult, totalResult] = await Promise.all([
        supabase.from('financial_transactions').select('*', { count: 'exact', head: true }).eq('is_draft', false).eq('verification_status', 'pending'),
        supabase.from('financial_transactions').select('*', { count: 'exact', head: true }).eq('is_draft', false).eq('verification_status', 'approved'),
        supabase.from('financial_transactions').select('*', { count: 'exact', head: true }).eq('is_draft', false).eq('verification_status', 'rejected'),
        supabase.from('financial_transactions').select('*', { count: 'exact', head: true }).eq('is_draft', false),
      ]);
      
      return {
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        rejected: rejectedResult.count || 0,
        total: totalResult.count || 0,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 min - stats don't need to be instant
    gcTime: 10 * 60 * 1000,
  });

  // Fetch profiles for review tab
  const { data: reviewProfiles } = useQuery({
    queryKey: ['profiles-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, avatar_url');
      
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const profilesMap = useMemo(() => {
    const map = new Map();
    reviewProfiles?.forEach(p => map.set(p.id, p));
    return map;
  }, [reviewProfiles]);

  const filteredTransactions = useMemo(() => {
    if (!reviewTransactions) return [];
    if (!searchQuery) return reviewTransactions;
    const search = searchQuery.toLowerCase();
    return reviewTransactions.filter(t =>
      t.description?.toLowerCase().includes(search) ||
      t.category?.toLowerCase().includes(search) ||
      t.static_project_name?.toLowerCase().includes(search)
    );
  }, [reviewTransactions, searchQuery]);

  const displayStats = fullStats || reviewStats;

  const statCards = [
    { key: "pending", label: "На проверке", icon: Clock, color: "yellow", count: displayStats?.pending || 0 },
    { key: "approved", label: "Утверждено", icon: CheckCircle, color: "green", count: displayStats?.approved || 0 },
    { key: "rejected", label: "Отклонено", icon: XCircle, color: "red", count: displayStats?.rejected || 0 },
    { key: "all", label: "Всего", icon: Filter, color: "blue", count: displayStats?.total || 0 },
  ];

  return (
    <div className="space-y-4 pt-4">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, color, count }) => (
          <Card 
            key={key}
            className={`cursor-pointer transition-colors hover:border-${color}-500 ${statusFilter === key ? `border-2 border-${color}-500` : ""}`}
            onClick={() => setStatusFilter(key)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 text-${color}-600`} />
                <span className="text-2xl font-bold">{count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по описанию, категории, проекту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">На проверке</SelectItem>
                <SelectItem value="approved">Утверждено</SelectItem>
                <SelectItem value="rejected">Отклонено</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Список транзакций */}
      {reviewLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !filteredTransactions.length ? (
        <p className="text-center text-muted-foreground py-8">
          Транзакции не найдены
        </p>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((transaction) => {
            const amount = transaction.income_amount || transaction.expense_amount || 0;
            const isIncome = !!transaction.income_amount;

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedTransaction(transaction);
                  setDialogOpen(true);
                }}
              >
                {/* Автор транзакции */}
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
                
                {/* Информация о транзакции */}
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
                
                {/* Сумма транзакции */}
                <div className="text-right shrink-0 ml-4">
                  <p className={`font-bold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncome ? '+' : '-'} {formatCurrency(amount)}
                  </p>
                  {transaction.cash_type && (
                    <p className="text-xs text-muted-foreground">{getWalletDisplayName(transaction.cash_type)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TransactionVerificationDialog
        transaction={selectedTransaction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetchReview}
      />
    </div>
  );
};
