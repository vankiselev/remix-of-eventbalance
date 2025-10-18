import { useState, useEffect, useCallback, useRef } from "react";
import { useFinancesActions } from "@/contexts/FinancesActionsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Upload, Trash2 } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";

import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { EmployeeList } from "@/components/finance/EmployeeList";
import { EnhancedTransactionTable } from "@/components/finance/EnhancedTransactionTableNew";
import { TransactionForm } from "@/components/finance/TransactionFormNew";
import FinancesImportDialog from "@/components/finance/FinancesImportDialog";
import { TransactionsCardView } from "@/components/finance/TransactionsCardView";
import { ImportProgressWindow } from "@/components/finance/ImportProgressWindow";

interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

const Finances = () => {
  const { hasPermission } = useUserPermissions();
  const [companySummary, setCompanySummary] = useState<CashSummary>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0,
  });
  const [userSummary, setUserSummary] = useState<CashSummary>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{id: string, name: string} | null>(null);
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
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { setActions } = useFinancesActions();

  // Create stable functions with useCallback
  const handleExportClick = useCallback(async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const Papa = (await import("papaparse")).default;
      
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          events:project_id(name),
          attachments_count:financial_attachments(count)
        `)
        .order("operation_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const transactions = (data || []).map(transaction => ({
        ...transaction,
        attachments_count: transaction.attachments_count?.[0]?.count || 0
      }));
      
      // Prepare data for CSV export
      const csvData = transactions.map(transaction => ({
        'Дата операции': new Date(transaction.operation_date).toLocaleDateString("ru-RU"),
        'Проект': transaction.static_project_name || transaction.events?.name || '',
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
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading) {
      fetchData();
    }
  }, [user, isAdmin, loading]);

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

  // Realtime subscription for automatic updates with instant optimistic totals
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('financial-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions'
        },
        (payload) => {
          try {
            const calc = (row: any) => {
              if (!row) return { total: 0, nastya: 0, lera: 0, vanya: 0, created_by: undefined };
              const raw = (row.cash_type as string | undefined) || '';
              const cashType = raw.trim().toLowerCase();
              // Учитываем только наличные кошельки (регистр не важен)
              const isNastya = cashType === 'наличка настя' || raw === 'Наличка Настя';
              const isLera = cashType === 'наличка лера' || raw === 'Наличка Лера';
              const isVanya = cashType === 'наличка ваня' || raw === 'Наличка Ваня';
              if (!isNastya && !isLera && !isVanya) {
                return { total: 0, nastya: 0, lera: 0, vanya: 0, created_by: row.created_by };
              }
              const income = Number(row.income_amount || 0);
              const expense = Number(row.expense_amount || 0);
              const delta = income - expense; // дельта по транзакции
              const nastya = isNastya ? delta : 0;
              const lera = isLera ? delta : 0;
              const vanya = isVanya ? delta : 0;
              const total = nastya + lera + vanya; // сумма дельт по кошелькам
              return { total, nastya, lera, vanya, created_by: row.created_by };
            };

            let d = { total: 0, nastya: 0, lera: 0, vanya: 0, created_by: undefined as string | undefined };
            if (payload.eventType === 'INSERT') {
              d = calc(payload.new);
            } else if (payload.eventType === 'DELETE') {
              const x = calc(payload.old);
              d = { ...x, total: -x.total, nastya: -x.nastya, lera: -x.lera, vanya: -x.vanya };
            } else if (payload.eventType === 'UPDATE') {
              const n = calc(payload.new);
              const o = calc(payload.old);
              d = { total: n.total - o.total, nastya: n.nastya - o.nastya, lera: n.lera - o.lera, vanya: n.vanya - o.vanya, created_by: payload.new?.created_by } as any;
            }

            // Update personal summary instantly
            if (d.created_by && d.created_by === user.id) {
              setUserSummary(prev => ({
                total_cash: prev.total_cash + d.total,
                cash_nastya: prev.cash_nastya + d.nastya,
                cash_lera: prev.cash_lera + d.lera,
                cash_vanya: prev.cash_vanya + d.vanya,
              }));
            }

            // Update selected employee summary instantly (for admin viewing employee)
            if (selectedEmployee?.id && d.created_by === selectedEmployee.id) {
              setSelectedEmployeeSummary(prev => ({
                total_cash: prev.total_cash + d.total,
                cash_nastya: prev.cash_nastya + d.nastya,
                cash_lera: prev.cash_lera + d.lera,
                cash_vanya: prev.cash_vanya + d.vanya,
              }));
            }

            // Update company summary instantly for admins
            if (isAdmin) {
              setCompanySummary(prev => ({
                total_cash: prev.total_cash + d.total,
                cash_nastya: prev.cash_nastya + d.nastya,
                cash_lera: prev.cash_lera + d.lera,
                cash_vanya: prev.cash_vanya + d.vanya,
              }));
            }
          } catch (e) {
            console.error('Realtime delta apply failed:', e);
            // Only refetch on error to reconcile
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, selectedEmployee]);

  const checkUserRole = async () => {
    try {
      const { data: profile, error } = await supabase
        .rpc("get_user_basic_profile")
        .single();

      if (error) throw error;
      const isUserAdmin = profile?.role === "admin";
      setIsAdmin(isUserAdmin);
      setLoading(false);
    } catch (error) {
      console.error("Error checking user role:", error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Helper to normalize cash type
      const norm = (v?: string) => (v || '').trim().toLowerCase();
      const reduceTotals = (rows: any[]) => {
        let nastya = 0, lera = 0, vanya = 0;
        for (const r of rows) {
          const delta = Number(r.income_amount || 0) - Number(r.expense_amount || 0);
          const ct = norm(r.cash_type as string);
          if (ct === 'наличка настя') nastya += delta;
          else if (ct === 'наличка лера') lera += delta;
          else if (ct === 'наличка ваня') vanya += delta;
        }
        return {
          total_cash: nastya + lera + vanya,
          cash_nastya: nastya,
          cash_lera: lera,
          cash_vanya: vanya,
        };
      };

      // Company summary
      if (isAdmin) {
        const { data: summary, error } = await supabase.rpc('get_company_cash_summary');
        if (error) {
          console.warn('get_company_cash_summary failed, using fallback:', error.message);
        }
        if (summary && summary.length > 0) {
          setCompanySummary(summary[0]);
        } else {
          // Fallback: compute on client
          const { data: rows } = await supabase
            .from('financial_transactions')
            .select('cash_type,income_amount,expense_amount')
            .limit(5000);
          if (rows) setCompanySummary(reduceTotals(rows));
        }
      }

      // Personal summary
      const { data: userSummaryData } = await supabase
        .rpc('calculate_user_cash_totals', { user_uuid: user?.id });
      if (userSummaryData && userSummaryData.length > 0) {
        setUserSummary(userSummaryData[0]);
      } else if (user?.id) {
        const { data: rows } = await supabase
          .from('financial_transactions')
          .select('cash_type,income_amount,expense_amount,created_by')
          .eq('created_by', user.id)
          .limit(5000);
        if (rows) setUserSummary(reduceTotals(rows));
      }
    } catch (error: any) {
      console.error('Error fetching financial data:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить финансовые данные',
      });
    }
  };

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

      fetchData(); // Обновляем данные после удаления
    } catch (error: any) {
      console.error("Error deleting all transactions:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить транзакции",
      });
    }
  };

  const handleEmployeeSelect = async (employeeId: string, employeeName: string) => {
    setSelectedEmployee({ id: employeeId, name: employeeName });
    
    // Загружаем данные выбранного сотрудника
    try {
      const { data: employeeSummaryData, error } = await supabase
        .rpc("calculate_user_cash_totals", { user_uuid: employeeId });

      if (error) throw error;

      if (employeeSummaryData && employeeSummaryData.length > 0) {
        setSelectedEmployeeSummary(employeeSummaryData[0]);
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

  const handleTransactionSuccess = () => {
    fetchData();
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
  if (!isAdmin || selectedEmployee) {
    const currentUserId = selectedEmployee?.id || user?.id;

  return (
    <div className="space-y-4">
      {selectedEmployee && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToMain}
              className="min-h-[44px] min-w-[44px] px-4 py-2 flex items-center justify-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Назад</span>
            </Button>
            <div>
              <h2 className="text-xl font-semibold">
                {selectedEmployee.name}
              </h2>
              <p className="text-sm text-muted-foreground">
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

      <div className="sticky top-0 z-10 bg-background pb-2 space-y-4">
        <FinanceSummaryCards 
          summary={selectedEmployee ? selectedEmployeeSummary : userSummary} 
          isLoading={false} 
        />
        <ImportProgressWindow />
      </div>

      <Card>
        <CardHeader className="space-y-0 py-4 border-b">
          <CardTitle className="text-lg">Транзакции</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-center py-4 border-b">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')}>
              <TabsList className="grid w-full max-w-[280px] grid-cols-2 h-10">
                <TabsTrigger value="cards" className="text-sm">Карточки</TabsTrigger>
                <TabsTrigger value="table" className="text-sm">Таблица</TabsTrigger>
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
    </div>
  );
  }

  // Admin dashboard view
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Финансы</h1>
            <p className="text-muted-foreground hidden md:block">Управление доходами и расходами компании</p>
          </div>
          
          {hasPermission('finances.create') && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowTransactionForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить транзакцию
              </Button>
            </div>
          )}
        </div>

        {/* Show user summary for "my-transactions", company summary for "all-transactions" */}
        <FinanceSummaryCards 
          summary={activeTab === 'all-transactions' ? companySummary : userSummary} 
          isLoading={false} 
        />
        
        <ImportProgressWindow />
      </div>

      <Card>
        <Tabs defaultValue="my-transactions" className="w-full" onValueChange={setActiveTab}>
          <CardHeader className="py-4 border-b">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger 
                value="my-transactions" 
                className="text-xs md:text-sm"
              >
                Мои транзакции
              </TabsTrigger>
              <TabsTrigger 
                value="employees" 
                className="text-xs md:text-sm"
              >
                Сотрудники
              </TabsTrigger>
              <TabsTrigger 
                value="all-transactions" 
                className="text-xs md:text-sm"
              >
                Все транзакции
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-0">
            <TabsContent value="my-transactions" className="mt-0">
              <div className="flex justify-center py-4 border-b">
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')}>
                  <TabsList className="grid w-full max-w-[280px] grid-cols-2 h-10">
                    <TabsTrigger value="cards" className="text-sm">Карточки</TabsTrigger>
                    <TabsTrigger value="table" className="text-sm">Таблица</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="pt-4">
              {viewMode === 'cards' ? (
                <TransactionsCardView
                  userId={user?.id}
                  isAdmin={true}
                  onEdit={handleEditTransaction}
                />
              ) : (
                <EnhancedTransactionTable
                  userId={user?.id}
                  isAdmin={true}
                  onEdit={handleEditTransaction}
                />
              )}
              </div>
            </TabsContent>

            <TabsContent value="employees" className="mt-0">
              <EmployeeList onEmployeeSelect={handleEmployeeSelect} />
            </TabsContent>
            
            <TabsContent value="all-transactions" className="mt-0">
              <div className="flex justify-center py-4 border-b">
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')}>
                  <TabsList className="grid w-full max-w-[280px] grid-cols-2 h-10">
                    <TabsTrigger value="cards" className="text-sm">Карточки</TabsTrigger>
                    <TabsTrigger value="table" className="text-sm">Таблица</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="pt-4">
              {viewMode === 'cards' ? (
                <TransactionsCardView
                  isAdmin={true}
                  onEdit={handleEditTransaction}
                />
              ) : (
                <EnhancedTransactionTable
                  isAdmin={true}
                  onEdit={handleEditTransaction}
                />
              )}
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