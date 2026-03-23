import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useFinancesActions } from "@/contexts/FinancesActionsContext";
import { useCompanyCashSummary } from "@/hooks/useCompanyCashSummary";
import { useUserCashSummary } from "@/hooks/useUserCashSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Mic } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { Badge } from "@/components/ui/badge";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { AdvancesSummaryCard } from "@/components/finance/AdvancesSummaryCard";
import { ImportProgressWindow } from "@/components/finance/ImportProgressWindow";
import { BackgroundImportStatus } from "@/components/finance/BackgroundImportStatus";
import { MoneyTransferRequests } from "@/components/finance/MoneyTransferRequests";
import { EmployeeDetailView } from "@/components/finance/EmployeeDetailView";

// Lazy-loaded heavy tab content and dialogs
const EmployeeList = lazy(() => import("@/components/finance/EmployeeList").then(m => ({ default: m.EmployeeList })));
const EnhancedTransactionTable = lazy(() => import("@/components/finance/EnhancedTransactionTableNew").then(m => ({ default: m.EnhancedTransactionTable })));
const TransactionsCardView = lazy(() => import("@/components/finance/TransactionsCardView").then(m => ({ default: m.TransactionsCardView })));
const ReviewTab = lazy(() => import("@/components/finance/ReviewTab").then(m => ({ default: m.ReviewTab })));
const FinancialReportsTab = lazy(() => import("@/components/finance/reports/FinancialReportsTab").then(m => ({ default: m.FinancialReportsTab })));
const FinancialAuditLog = lazy(() => import("@/components/finance/FinancialAuditLog").then(m => ({ default: m.FinancialAuditLog })));

// Heavy dialogs — only loaded when opened
const TransactionForm = lazy(() => import("@/components/finance/TransactionFormNew").then(m => ({ default: m.TransactionForm })));
const FinancesImportDialog = lazy(() => import("@/components/finance/FinancesImportDialog"));
const VoiceTransactionDialog = lazy(() => import("@/components/finance/VoiceTransactionDialog").then(m => ({ default: m.VoiceTransactionDialog })));
const AlertDialogModule = lazy(() => import("@/components/ui/alert-dialog").then(m => ({
  default: ({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void }) => (
    <m.AlertDialog open={open} onOpenChange={onOpenChange}>
      <m.AlertDialogContent>
        <m.AlertDialogHeader>
          <m.AlertDialogTitle>Подтвердите удаление</m.AlertDialogTitle>
          <m.AlertDialogDescription>
            Вы уверены, что хотите удалить ВСЕ финансовые транзакции? Это действие нельзя отменить.
          </m.AlertDialogDescription>
        </m.AlertDialogHeader>
        <m.AlertDialogFooter>
          <m.AlertDialogCancel>Отмена</m.AlertDialogCancel>
          <m.AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Удалить все
          </m.AlertDialogAction>
        </m.AlertDialogFooter>
      </m.AlertDialogContent>
    </m.AlertDialog>
  )
})));

const TabLoader = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
);

const Finances = () => {
  const { hasPermission } = useUserPermissions();
  const { isFinancier } = useFinancierPermissions();
  const { pendingCount } = usePendingTransactionsCount();
  const { user } = useAuth();
  const { isAdmin } = useUserRbacRoles();
  
  const { data: companySummary = { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 } } = useCompanyCashSummary(isAdmin);
  const { data: userSummary = { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 } } = useUserCashSummary(user?.id);
  
  const [selectedEmployee, setSelectedEmployee] = useState<{id: string, name: string, avatar_url?: string | null} | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("my-transactions");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  const { toast } = useToast();
  const { setActions } = useFinancesActions();
  const queryClient = useQueryClient();

  // Create stable functions with useCallback
  const handleExportClick = useCallback(async () => {
    try {
      const Papa = (await import("papaparse")).default;
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          *,
          events:project_id(name),
          attachments_count:financial_attachments(count)
        `)
        .order("operation_date", { ascending: false });

      if (error) throw error;

      const csvData = (data || []).map((transaction: any) => ({
        'Дата операции': new Date(transaction.operation_date).toLocaleDateString("ru-RU"),
        'Проект': transaction.static_project_name || transaction.events?.name || '',
        'Чей проект': transaction.project_owner || '',
        'Описание': transaction.description || '',
        'Траты': transaction.expense_amount || '',
        'Приход': transaction.income_amount || '',
        'Категория': transaction.category || '',
        'Касса': transaction.cash_type || '',
        'Количество вложений': transaction.attachments_count?.[0]?.count || 0,
        'Нет чека': transaction.no_receipt ? 'Да' : 'Нет',
        'Причина отсутствия чека': transaction.no_receipt_reason || '',
        'Заметки': transaction.notes || '',
        'Дата создания': new Date(transaction.created_at).toLocaleDateString("ru-RU")
      }));

      const csv = Papa.unparse(csvData, { delimiter: ";", header: true, quotes: true });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Успешно", description: "Данные экспортированы в CSV файл" });
    } catch (error) {
      console.error("Error exporting:", error);
      toast({ title: "Ошибка", description: "Не удалось экспортировать данные", variant: "destructive" });
    }
  }, [toast]);

  const handleImportClick = useCallback(() => setShowImportDialog(true), []);
  const handleDeleteClick = useCallback(() => setShowDeleteDialog(true), []);

  // Set actions for the Layout dropdown menu
  useEffect(() => {
    const actions: any = {};
    if (hasPermission('finances.export')) actions.onExport = handleExportClick;
    if (hasPermission('finances.import')) actions.onImport = handleImportClick;
    if (hasPermission('finances.delete_all')) actions.onDeleteAll = handleDeleteClick;
    setActions(actions);
    return () => { setActions({}); };
  }, [setActions, handleExportClick, handleImportClick, handleDeleteClick, hasPermission]);

  const handleDeleteAllTransactions = async () => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      toast({ title: "Успешно удалено", description: "Все транзакции были удалены" });
      queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
    } catch (error: any) {
      console.error("Error deleting all transactions:", error);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось удалить транзакции" });
    }
  };

  const handleEmployeeSelect = (employeeId: string, employeeName: string, avatarUrl?: string | null) => {
    setSelectedEmployee({ id: employeeId, name: employeeName, avatar_url: avatarUrl });
  };

  const handleTransactionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
    queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
    queryClient.invalidateQueries({ queryKey: ['pending-transactions-count'] });
    setEditTransaction(null);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditTransaction(transaction);
    setShowTransactionForm(true);
  };

  // Employee view or employee detail view for admin
  if ((!isAdmin && !isFinancier) || selectedEmployee) {
    return (
      <EmployeeDetailView
        selectedEmployee={selectedEmployee}
        isAdmin={isAdmin}
        onBack={() => setSelectedEmployee(null)}
        onEmployeeSelect={handleEmployeeSelect}
      />
    );
  }

  // Admin dashboard view
  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="space-y-3 sm:space-y-4 w-full">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 w-full">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Финансы</h1>
            <p className="text-muted-foreground hidden md:block truncate">Управление доходами и расходами компании</p>
          </div>
          
          {hasPermission('finances.create') && (
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setShowVoiceDialog(true)} className="h-10">
                <Mic className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Голосом</span>
              </Button>
              <Button onClick={() => setShowTransactionForm(true)} className="w-full sm:w-auto h-10">
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
          <CardHeader className="py-3 sm:py-4 border-b px-3 sm:px-6">
            <TabsList className="w-full overflow-x-auto scrollbar-hide h-9 sm:h-10">
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
          
          <CardContent className="pt-0 w-full overflow-x-auto px-2 sm:px-6">
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
                <Suspense fallback={<TabLoader />}>
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
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="employees" className="mt-0 w-full">
              <Suspense fallback={<TabLoader />}>
                <EmployeeList onEmployeeSelect={handleEmployeeSelect} />
              </Suspense>
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
                <Suspense fallback={<TabLoader />}>
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
                </Suspense>
              </div>
            </TabsContent>

            {isFinancier && (
              <TabsContent value="review" className="mt-0 w-full">
                <Suspense fallback={<TabLoader />}>
                  <ReviewTab enabled={isFinancier && activeTab === 'review'} />
                </Suspense>
              </TabsContent>
            )}

            {(isAdmin || isFinancier) && (
              <TabsContent value="fin-reports" className="mt-0 w-full">
                <div className="pt-4 w-full">
                  <Suspense fallback={<TabLoader />}>
                    <FinancialReportsTab />
                  </Suspense>
                </div>
              </TabsContent>
            )}

            <TabsContent value="audit-log" className="mt-0 w-full">
              <div className="pt-4 w-full">
                <Suspense fallback={<TabLoader />}>
                  <FinancialAuditLog />
                </Suspense>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Lazy dialogs — only loaded when opened */}
      {showTransactionForm && (
        <Suspense fallback={null}>
          <TransactionForm
            isOpen={showTransactionForm}
            onOpenChange={setShowTransactionForm}
            onSuccess={handleTransactionSuccess}
            editTransaction={editTransaction}
          />
        </Suspense>
      )}

      {showImportDialog && (
        <Suspense fallback={null}>
          <FinancesImportDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            onImportComplete={handleTransactionSuccess}
            defaultEmployeeId={selectedEmployee?.id}
          />
        </Suspense>
      )}

      {showDeleteDialog && (
        <Suspense fallback={null}>
          <AlertDialogModule
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={() => {
              handleDeleteAllTransactions();
              setShowDeleteDialog(false);
            }}
          />
        </Suspense>
      )}

      {showVoiceDialog && (
        <Suspense fallback={null}>
          <VoiceTransactionDialog
            isOpen={showVoiceDialog}
            onOpenChange={setShowVoiceDialog}
            onSuccess={handleTransactionSuccess}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Finances;
