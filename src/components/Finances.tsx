import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Upload, Trash2 } from "lucide-react";
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
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
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
  }, [user, isAdmin]);

  // Realtime subscription for automatic updates
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
          console.log('Transaction change detected:', payload);
          fetchData(); // Refresh data on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

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

  const handleEmployeeSelect = (employeeId: string, employeeName: string) => {
    setSelectedEmployee({ id: employeeId, name: employeeName });
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
          summary={selectedEmployee ? companySummary : userSummary} 
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
      <div>
        <h1 className="text-3xl font-bold">Финансы</h1>
        <p className="text-muted-foreground">Управление доходами и расходами компании</p>
      </div>

      <div className="flex justify-end items-center">
        <div className="flex items-center gap-2">
          <TransactionExport isAdmin={true} />
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Импорт
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить все транзакции
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены, что хотите удалить ВСЕ финансовые транзакции? Это действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllTransactions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Удалить все
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => setShowTransactionForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить транзакцию
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-background pb-2">
        <div className="mb-1">
          <h2 className="text-lg font-semibold">Сводка по компании</h2>
        </div>
        <FinanceSummaryCards summary={companySummary} isLoading={false} />
      </div>

      <Card>
        <Tabs defaultValue="transactions" className="w-full">
          <CardHeader className="pb-0 border-b border-border">
            <TabsList className="flex items-center gap-3 bg-transparent p-0 h-auto overflow-x-auto -webkit-overflow-scrolling-touch">
              <TabsTrigger 
                value="transactions" 
                className="px-4 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md border border-transparent data-[state=active]:border-border"
              >
                Все транзакции
              </TabsTrigger>
              <TabsTrigger 
                value="employees" 
                className="px-4 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md border border-transparent data-[state=active]:border-border"
              >
                Сотрудники
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-4">
            <TabsContent value="employees" className="mt-0">
              <EmployeeList onEmployeeSelect={handleEmployeeSelect} />
            </TabsContent>
            
            <TabsContent value="transactions" className="mt-0">
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
    </div>
  );
};

export default Finances;