import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TransactionVerificationDialog } from "@/components/finance/TransactionVerificationDialog";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatFullName, getInitials } from "@/utils/formatName";
import { format } from "date-fns";
import { Search, Filter, CheckCircle, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";

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
        .eq('is_draft', false) // Исключаем черновики из проверки
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
      
      console.log('[TransactionsReviewPage] Loaded profiles:', data?.length);
      return data || [];
    },
    enabled: isFinancier,
  });

  const profilesMap = useMemo(() => {
    const map = new Map();
    profiles?.forEach(p => map.set(p.id, p));
    return map;
  }, [profiles]);

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

  const filteredTransactions = transactions?.filter(t => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      t.description?.toLowerCase().includes(search) ||
      t.category?.toLowerCase().includes(search) ||
      t.static_project_name?.toLowerCase().includes(search)
    );
  });

  const handleTransactionClick = (transaction: any) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
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

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                На проверке
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-2xl font-bold">{stats?.pending || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Утверждено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-2xl font-bold">{stats?.approved || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Отклонено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-2xl font-bold">{stats?.rejected || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Всего
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-2xl font-bold">{stats?.total || 0}</span>
              </div>
            </CardContent>
          </Card>
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
            ) : !filteredTransactions?.length ? (
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
                      onClick={() => handleTransactionClick(transaction)}
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

                      {/* Сумма */}
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
