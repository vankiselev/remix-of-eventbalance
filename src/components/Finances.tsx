import { useState, useEffect, useCallback } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { Badge } from "@/components/ui/badge";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { EmployeeList } from "@/components/finance/EmployeeList";
import { EnhancedTransactionTable } from "@/components/finance/EnhancedTransactionTableNew";
import { TransactionForm } from "@/components/finance/TransactionFormNew";
import FinancesImportDialog from "@/components/finance/FinancesImportDialog";
import { TransactionsCardView } from "@/components/finance/TransactionsCardView";
import { ImportProgressWindow } from "@/components/finance/ImportProgressWindow";
import { MoneyTransferRequests } from "@/components/finance/MoneyTransferRequests";
import { FinancialAuditLog } from "@/components/finance/FinancialAuditLog";
import { BackgroundImportStatus } from "@/components/finance/BackgroundImportStatus";
import { AdvancesSummaryCard } from "@/components/finance/AdvancesSummaryCard";
import { FinancialReportsTab } from "@/components/finance/reports/FinancialReportsTab";
import { ReviewTab } from "@/components/finance/ReviewTab";
import { EmployeeDetailView } from "@/components/finance/EmployeeDetailView";

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
                <ReviewTab enabled={isFinancier && activeTab === 'review'} />
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
