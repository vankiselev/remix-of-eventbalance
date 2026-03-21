import { useState, useEffect, useCallback, useMemo } from "react";
import { useFinancesActions } from "@/contexts/FinancesActionsContext";
import { useCompanyCashSummary } from "@/hooks/useCompanyCashSummary";
import { useUserCashSummary } from "@/hooks/useUserCashSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Upload, Trash2, CheckCircle, XCircle, Clock, Search, Filter } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatFullName, getInitials } from "@/utils/formatName";

import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { EmployeeList } from "@/components/finance/EmployeeList";
import { EnhancedTransactionTable } from "@/components/finance/EnhancedTransactionTableNew";
import { TransactionForm } from "@/components/finance/TransactionFormNew";
import FinancesImportDialog from "@/components/finance/FinancesImportDialog";
import { TransactionsCardView } from "@/components/finance/TransactionsCardView";
import { ImportProgressWindow } from "@/components/finance/ImportProgressWindow";
import { MoneyTransferRequests } from "@/components/finance/MoneyTransferRequests";
import { FinancialAuditLog } from "@/components/finance/FinancialAuditLog";
import { TransactionVerificationDialog } from "@/components/finance/TransactionVerificationDialog";
import { BackgroundImportStatus } from "@/components/finance/BackgroundImportStatus";
import { formatCurrency } from "@/utils/formatCurrency";
import { AdvancesSummaryCard } from "@/components/finance/AdvancesSummaryCard";
import { FinancialReportsTab } from "@/components/finance/reports/FinancialReportsTab";

interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

const Finances = () => {
  const { hasPermission } = useUserPermissions();
  const { isFinancier, canReview, canApprove } = useFinancierPermissions();
  const { pendingCount } = usePendingTransactionsCount();
  const { user } = useAuth();
  const { isAdmin: isAdminRbac } = useUserRbacRoles();
  
  console.log('[Finances] isFinancier status:', isFinancier, { canReview, canApprove });
  
  // Use React Query hooks for cash summaries
  const { data: companySummary = { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 } } = useCompanyCashSummary(isAdminRbac);
  const { data: userSummary = { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 } } = useUserCashSummary(user?.id);
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{id: string, name: string, avatar_url?: string | null} | null>(null);
  const [selectedEmployeeSummary, setSelectedEmployeeSummary] = useState<CashSummary>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0,
  });
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("my-transactions");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  
  // Review tab state
  const [selectedReviewTransaction, setSelectedReviewTransaction] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { toast } = useToast();
  const { setActions } = useFinancesActions();
  const queryClient = useQueryClient();

  // Fetch transactions for review (exclude drafts)
  const { data: reviewTransactions, isLoading: reviewLoading, refetch: refetchReview } = useQuery({
    queryKey: ['transactions-review', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('is_draft', false) // Исключаем черновики
        .order('operation_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('verification_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFinancier && activeTab === 'review',
  });

  // Fetch verification stats with COUNT queries (exclude drafts)
  const { data: reviewStats } = useQuery({
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
    enabled: isFinancier && activeTab === 'review',
  });

  // Fetch profiles for review tab
  const { data: reviewProfiles } = useQuery({
    queryKey: ['profiles-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, avatar_url')
        .eq('employment_status', 'active');
      
      if (error) {
        console.error('[Finances] Error fetching profiles:', error);
        throw error;
      }
      
      console.log('[Finances] Loaded profiles:', data?.length);
      return data || [];
    },
    enabled: isFinancier && activeTab === 'review',
  });

  const profilesMap = useMemo(() => {
    const map = new Map();
    reviewProfiles?.forEach(p => map.set(p.id, p));
    return map;
  }, [reviewProfiles]);

  // Create stable functions with useCallback
  const handleExportClick = useCallback(async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const Papa = (await import("papaparse")).default;
      
      let query = (supabase
        .from("financial_transactions") as any)
        .select(`
          *,
          events:project_id(name),
          attachments_count:financial_attachments(count)
        `)
        .order("operation_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const transactions = (data || []).map((transaction: any) => ({
        ...transaction,
        attachments_count: transaction.attachments_count?.[0]?.count || 0
      }));
      
      // Prepare data for CSV export
      const csvData = transactions.map((transaction: any) => ({
        'Дата операции': new Date(transaction.operation_date).toLocaleDateString("ru-RU"),
        'Проект': transaction.static_project_name || (transaction.events as any)?.name || '',
        'Чей проект': transaction.project_owner || '',
        'Описание': transaction.description || '',
        'Траты': transaction.expense_amount || '',
        'Приход': transaction.income_amount || '',
        'Категория': transaction.category || '',
        'Касса': transaction.cash_type || '',
        'Количество вложений': transaction.attachments_count || 0,
        'Нет чека': transaction.no_receipt ? 'Да' : 'Нет',
        'Причина отсутствия чека': transaction.no_receipt_reason || '',
        'Заметки': transaction.notes || '',
        'Дата создания': new Date(transaction.created_at).toLocaleDateString("ru-RU")
      }));

      // Use papaparse for proper CSV formatting
      const csv = Papa.unparse(csvData, {
        delimiter: ";",
        header: true,
        quotes: true,
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Успешно",
        description: "Данные экспортированы в CSV файл"
      });
    } catch (error) {
      console.error("Error exporting:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleImportClick = useCallback(() => {
    setShowImportDialog(true);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  useEffect(() => {
    if (user) {
      setIsAdmin(isAdminRbac);
      setLoading(false);
    }
  }, [user, isAdminRbac]);

  // Removed useEffect that called fetchData - React Query hooks handle this

  // Set actions for the Layout dropdown menu without causing render loops
  useEffect(() => {
    const canExport = hasPermission('finances.export');
    const canImport = hasPermission('finances.import');
    const canDelete = hasPermission('finances.delete_all');

    const actions: any = {};
    if (canExport) actions.onExport = handleExportClick;
    if (canImport) actions.onImport = handleImportClick;
    if (canDelete) actions.onDeleteAll = handleDeleteClick;

    setActions(actions);
    return () => {
      setActions({});
    };
  }, [setActions, handleExportClick, handleImportClick, handleDeleteClick]);

  // Removed old realtime subscription - React Query handles caching and updates

  const checkUserRole = async () => {
    try {
      const { data: profile, error } = await supabase
        .rpc("get_user_basic_profile")
        .single();

      if (error) throw error;
      // Check admin status from rbac_roles via context instead
      setLoading(false);
    } catch (error) {
      console.error("Error checking user role:", error);
      setLoading(false);
    }
  };

  // Removed fetchData - now using React Query hooks

  const handleDeleteAllTransactions = async () => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all transactions

      if (error) throw error;

      toast({
        title: "Успешно удалено",
        description: "Все транзакции были удалены",
      });

      // Invalidate caches to refetch data
      queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
    } catch (error: any) {
      console.error("Error deleting all transactions:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить транзакции",
      });
    }
  };

  const handleEmployeeSelect = async (employeeId: string, employeeName: string, avatarUrl?: string | null) => {
    setSelectedEmployee({ id: employeeId, name: employeeName, avatar_url: avatarUrl });
    
    // Загружаем данные выбранного сотрудника
    try {
      const { data: employeeSummaryData, error } = await supabase
        .rpc("calculate_user_cash_totals", { user_uuid: employeeId });

      if (error) throw error;

      if (employeeSummaryData && employeeSummaryData.length > 0) {
        setSelectedEmployeeSummary(employeeSummaryData[0] as any);
      }
    } catch (error: any) {
      console.error("Error fetching employee financial data:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные сотрудника",
      });
    }
  };

  const handleBackToMain = () => {
    setSelectedEmployee(null);
  };

  const refreshEmployeeSummary = async (employeeId: string) => {
    try {
      const { data: employeeSummaryData, error } = await supabase
        .rpc("calculate_user_cash_totals", { user_uuid: employeeId });

      if (error) throw error;

      if (employeeSummaryData && employeeSummaryData.length > 0) {
        setSelectedEmployeeSummary(employeeSummaryData[0] as any);
      }
    } catch (error: any) {
      console.error("Error refreshing employee summary:", error);
    }
  };

  const handleTransactionSuccess = () => {
    // Invalidate caches to refetch data - React Query handles the rest
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
    queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
    // Ensure the "Проверка" badge updates immediately after creating a pending transaction
    queryClient.invalidateQueries({ queryKey: ['pending-transactions-count'] });
    
    // Refresh selected employee summary if viewing employee details
    if (selectedEmployee) {
      refreshEmployeeSummary(selectedEmployee.id);
    }
    
    setEditTransaction(null);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditTransaction(transaction);
    setShowTransactionForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Финансы</h1>
          <p className="text-muted-foreground">Управление доходами и расходами компании</p>
        </div>
        <FinanceSummaryCards summary={companySummary} isLoading={true} />
      </div>
    );
  }

  // Employee view or employee detail view for admin
  if ((!isAdmin && !isFinancier) || selectedEmployee) {
    const currentUserId = selectedEmployee?.id || user?.id;

  return (
    <div className="space-y-4 w-full">
      {selectedEmployee && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button
              variant="outline"
              onClick={handleBackToMain}
              className="min-h-[44px] min-w-[44px] px-4 py-2 flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={selectedEmployee.avatar_url || undefined} alt={selectedEmployee.name} />
              <AvatarFallback>{getInitials({ full_name: selectedEmployee.name })}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold truncate">
                {selectedEmployee.name}
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                Персональные финансы сотрудника
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Импорт
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить все
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить транзакции сотрудника?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Все транзакции {selectedEmployee.name} будут удалены. Это действие необратимо!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('financial_transactions')
                            .delete()
                            .eq('created_by', selectedEmployee.id);
                          if (error) throw error;
                          toast({ title: "Транзакции удалены" });
                          queryClient.invalidateQueries({ queryKey: ['transactions'] });
                          queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
                          queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
                          queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
                          // Refresh employee summary
                          handleEmployeeSelect(selectedEmployee.id, selectedEmployee.name, selectedEmployee.avatar_url);
                        } catch (error: any) {
                          toast({ variant: "destructive", title: "Ошибка", description: error.message });
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Да, удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setShowTransactionForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить транзакцию
              </Button>
            </div>
          )}
        </div>
      )}

      {!selectedEmployee && !isAdmin && hasPermission('finances.create') && (
        <div className="flex justify-end">
          <Button onClick={() => setShowTransactionForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить транзакцию
          </Button>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-background pb-2 space-y-4 w-full">
        <div className="grid gap-4 md:grid-cols-2 w-full">
          <AdvancesSummaryCard employeeId={selectedEmployee?.id} />
          <FinanceSummaryCards 
            summary={selectedEmployee ? selectedEmployeeSummary : userSummary} 
            isLoading={false} 
          />
        </div>
        <ImportProgressWindow />
        <BackgroundImportStatus />
      </div>

      <MoneyTransferRequests />

      <Card className="w-full">
        <CardHeader className="space-y-0 py-4 border-b">
          <CardTitle className="text-lg">Транзакции</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 w-full overflow-x-auto">
          <div className="flex justify-center py-4 border-b w-full">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')} className="w-full">
              <TabsList className="w-full overflow-x-auto scrollbar-hide">
                <TabsTrigger value="cards" className="whitespace-nowrap">Карточки</TabsTrigger>
                <TabsTrigger value="table" className="whitespace-nowrap">Таблица</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="pt-4">
          {viewMode === 'cards' ? (
            <TransactionsCardView
              userId={currentUserId}
              isAdmin={isAdmin}
              onEdit={handleEditTransaction}
            />
          ) : (
            <EnhancedTransactionTable
              userId={currentUserId}
              isAdmin={isAdmin}
              onEdit={handleEditTransaction}
            />
          )}
          </div>
        </CardContent>
      </Card>

      <TransactionForm
        isOpen={showTransactionForm}
        onOpenChange={setShowTransactionForm}
        onSuccess={handleTransactionSuccess}
        editTransaction={editTransaction}
      />

      <FinancesImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={handleTransactionSuccess}
        defaultEmployeeId={selectedEmployee?.id}
      />
    </div>
  );
  }

  // Admin dashboard view
  return (
    <div className="space-y-6 w-full">
      <div className="space-y-4 w-full">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 w-full">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold truncate">Финансы</h1>
            <p className="text-muted-foreground hidden md:block truncate">Управление доходами и расходами компании</p>
          </div>
          
          {hasPermission('finances.create') && (
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button onClick={() => setShowTransactionForm(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Добавить транзакцию
              </Button>
            </div>
          )}
        </div>

        {/* Summary cards with advances */}
        <div className="grid gap-4 md:grid-cols-2 w-full">
          <AdvancesSummaryCard />
          <FinanceSummaryCards 
            summary={activeTab === 'all-transactions' ? companySummary : userSummary} 
            isLoading={false} 
          />
        </div>
        
        <ImportProgressWindow />
        <BackgroundImportStatus />
      </div>

      <MoneyTransferRequests />

      <Card className="w-full">
        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
          <CardHeader className="py-4 border-b">
            <TabsList className="w-full overflow-x-auto scrollbar-hide">
              <TabsTrigger value="my-transactions" className="whitespace-nowrap">
                Мои транзакции
              </TabsTrigger>
              <TabsTrigger value="employees" className="whitespace-nowrap">
                Сотрудники
              </TabsTrigger>
              <TabsTrigger value="all-transactions" className="whitespace-nowrap">
                Все транзакции
              </TabsTrigger>
              {isFinancier && (
                <TabsTrigger value="review" className="whitespace-nowrap relative">
                  Проверка
                  {pendingCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] rounded-full"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {(isAdmin || isFinancier) && (
                <TabsTrigger value="fin-reports" className="whitespace-nowrap">
                  Финотчёты
                </TabsTrigger>
              )}
              <TabsTrigger value="audit-log" className="whitespace-nowrap">
                Журнал
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-0 w-full overflow-x-auto">
            <TabsContent value="my-transactions" className="mt-0 w-full">
              <div className="flex justify-center py-4 border-b w-full">
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')} className="w-full">
                  <TabsList className="w-full overflow-x-auto scrollbar-hide">
                    <TabsTrigger value="cards" className="whitespace-nowrap">Карточки</TabsTrigger>
                    <TabsTrigger value="table" className="whitespace-nowrap">Таблица</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="pt-4 w-full">
              {viewMode === 'cards' ? (
                <TransactionsCardView
                  userId={user?.id}
                  isAdmin={isAdmin}
                  onEdit={handleEditTransaction}
                />
              ) : (
                <EnhancedTransactionTable
                  userId={user?.id}
                  isAdmin={isAdmin}
                  onEdit={handleEditTransaction}
                />
              )}
              </div>
            </TabsContent>

            <TabsContent value="employees" className="mt-0 w-full">
              <EmployeeList onEmployeeSelect={handleEmployeeSelect} />
            </TabsContent>
            
            <TabsContent value="all-transactions" className="mt-0 w-full">
              <div className="flex justify-center py-4 border-b w-full">
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')} className="w-full">
                  <TabsList className="w-full overflow-x-auto scrollbar-hide">
                    <TabsTrigger value="cards" className="whitespace-nowrap">Карточки</TabsTrigger>
                    <TabsTrigger value="table" className="whitespace-nowrap">Таблица</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="pt-4 w-full">
              {viewMode === 'cards' ? (
                <TransactionsCardView
                  isAdmin={isAdmin}
                  onEdit={handleEditTransaction}
                  showOwner={true}
                />
              ) : (
                <EnhancedTransactionTable
                  isAdmin={isAdmin}
                  onEdit={handleEditTransaction}
                />
              )}
              </div>
            </TabsContent>

            {isFinancier && (
              <TabsContent value="review" className="mt-0 w-full">
                <div className="space-y-4 pt-4">
                  {/* Статистика */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card 
                      className={`cursor-pointer transition-colors hover:border-yellow-500 ${statusFilter === "pending" ? "border-2 border-yellow-500" : ""}`}
                      onClick={() => setStatusFilter("pending")}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          На проверке
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          <span className="text-2xl font-bold">{reviewStats?.pending || 0}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-colors hover:border-green-500 ${statusFilter === "approved" ? "border-2 border-green-500" : ""}`}
                      onClick={() => setStatusFilter("approved")}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Утверждено
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-2xl font-bold">{reviewStats?.approved || 0}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-colors hover:border-red-500 ${statusFilter === "rejected" ? "border-2 border-red-500" : ""}`}
                      onClick={() => setStatusFilter("rejected")}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Отклонено
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-2xl font-bold">{reviewStats?.rejected || 0}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-colors hover:border-blue-500 ${statusFilter === "all" ? "border-2 border-blue-500" : ""}`}
                      onClick={() => setStatusFilter("all")}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Всего
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-blue-600" />
                          <span className="text-2xl font-bold">{reviewStats?.total || 0}</span>
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
                  {reviewLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : !reviewTransactions?.filter(t => {
                    if (!searchQuery) return true;
                    const search = searchQuery.toLowerCase();
                    return (
                      t.description?.toLowerCase().includes(search) ||
                      t.category?.toLowerCase().includes(search) ||
                      t.static_project_name?.toLowerCase().includes(search)
                    );
                  }).length ? (
                    <p className="text-center text-muted-foreground py-8">
                      Транзакции не найдены
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {reviewTransactions?.filter(t => {
                        if (!searchQuery) return true;
                        const search = searchQuery.toLowerCase();
                        return (
                          t.description?.toLowerCase().includes(search) ||
                          t.category?.toLowerCase().includes(search) ||
                          t.static_project_name?.toLowerCase().includes(search)
                        );
                      }).map((transaction) => {
                        const amount = transaction.income_amount || transaction.expense_amount || 0;
                        const isIncome = !!transaction.income_amount;

                        return (
                          <div
                            key={transaction.id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedReviewTransaction(transaction);
                              setReviewDialogOpen(true);
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
                                <p className="text-xs text-muted-foreground">{transaction.cash_type}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {(isAdmin || isFinancier) && (
              <TabsContent value="fin-reports" className="mt-0 w-full">
                <div className="pt-4 w-full">
                  <FinancialReportsTab />
                </div>
              </TabsContent>
            )}

            <TabsContent value="audit-log" className="mt-0 w-full">
              <div className="pt-4 w-full">
                <FinancialAuditLog />
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <TransactionVerificationDialog
        transaction={selectedReviewTransaction}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onSuccess={refetchReview}
      />

      <TransactionForm
        isOpen={showTransactionForm}
        onOpenChange={setShowTransactionForm}
        onSuccess={handleTransactionSuccess}
        editTransaction={editTransaction}
      />

      <FinancesImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={handleTransactionSuccess}
        defaultEmployeeId={selectedEmployee?.id}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить ВСЕ финансовые транзакции? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                handleDeleteAllTransactions();
                setShowDeleteDialog(false);
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить все
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Finances;