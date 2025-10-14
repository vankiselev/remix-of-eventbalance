import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Upload, Trash2, MoreVertical, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { EmployeeList } from "@/components/finance/EmployeeList";
import { EnhancedTransactionTable } from "@/components/finance/EnhancedTransactionTableNew";
import { TransactionForm } from "@/components/finance/TransactionFormNew";
import { TransactionExport } from './finance/TransactionExport';
import FinancesImportDialog from "@/components/finance/FinancesImportDialog";

interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

const Finances = () => {
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
  
  const { user } = useAuth();
  const { toast } = useToast();

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
              const income = Number(row.income_amount || 0);
              const expense = Number(row.expense_amount || 0);
              const delta = income - expense; // дельта по транзакции
              const cashType = row.cash_type as string | undefined;
              const nastya = cashType === 'Наличка Настя' ? delta : 0;
              const lera = cashType === 'Наличка Лера' ? delta : 0;
              const vanya = cashType === 'Наличка Ваня' ? delta : 0;
              // ВАЖНО: total = сумма дельт по кошелькам, чтобы он всегда соответствовал их сумме
              const total = nastya + lera + vanya;
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
      if (isAdmin) {
        const { data: summary, error } = await supabase
          .rpc("get_company_cash_summary");

        if (error) throw error;
        
        if (summary && summary.length > 0) {
          setCompanySummary(summary[0]);
        }
      }

      const { data: userSummaryData, error: userError } = await supabase
        .rpc("calculate_user_cash_totals", { user_uuid: user?.id });

      if (userError) throw userError;

      if (userSummaryData && userSummaryData.length > 0) {
        setUserSummary(userSummaryData[0]);
      }
    } catch (error: any) {
      console.error("Error fetching financial data:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить финансовые данные",
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
              <TransactionExport userId={selectedEmployee?.id} isAdmin={isAdmin} />
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

      {!selectedEmployee && !isAdmin && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Ваши персональные финансы
          </p>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-background pb-2">
        <FinanceSummaryCards 
          summary={selectedEmployee ? selectedEmployeeSummary : userSummary} 
          isLoading={false} 
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Транзакции</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <EnhancedTransactionTable
            userId={currentUserId}
            isAdmin={isAdmin}
            onEdit={handleEditTransaction}
          />
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">Финансы</h1>
            <p className="text-muted-foreground">Управление доходами и расходами компании</p>
          </div>
          <FinanceSummaryCards summary={companySummary} isLoading={false} />
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowTransactionForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить транзакцию
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4 mr-2" />
                Редактирование
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background z-50">
              <TransactionExport isAdmin={true} />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Импорт
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить все транзакции
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <Tabs defaultValue="my-transactions" className="w-full">
          <CardHeader className="pb-0 border-b border-border">
            <TabsList className="flex items-center justify-center gap-3 bg-transparent p-0 h-auto overflow-x-auto -webkit-overflow-scrolling-touch">
              <TabsTrigger 
                value="my-transactions" 
                className="px-4 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md border border-transparent data-[state=active]:border-border"
              >
                Мои транзакции
              </TabsTrigger>
              <TabsTrigger 
                value="employees" 
                className="px-4 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md border border-transparent data-[state=active]:border-border"
              >
                Сотрудники
              </TabsTrigger>
              <TabsTrigger 
                value="all-transactions" 
                className="px-4 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md border border-transparent data-[state=active]:border-border"
              >
                Все транзакции
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-4">
            <TabsContent value="my-transactions" className="mt-0">
              <EnhancedTransactionTable
                userId={user?.id}
                isAdmin={true}
                onEdit={handleEditTransaction}
              />
            </TabsContent>

            <TabsContent value="employees" className="mt-0">
              <EmployeeList onEmployeeSelect={handleEmployeeSelect} />
            </TabsContent>
            
            <TabsContent value="all-transactions" className="mt-0">
              <EnhancedTransactionTable
                isAdmin={true}
                onEdit={handleEditTransaction}
              />
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