import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft } from "lucide-react";
import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { EmployeeList } from "@/components/finance/EmployeeList";
import { EnhancedTransactionTable } from "@/components/finance/EnhancedTransactionTable";
import { TransactionForm } from "@/components/finance/TransactionFormNew";

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
        <h1 className="text-3xl font-bold">Финансы</h1>
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
              size="sm"
              onClick={handleBackToMain}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
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
            <Button onClick={() => setShowTransactionForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить транзакцию
            </Button>
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

      <div className="sticky top-0 z-10 bg-background pb-4">
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Управление финансами компании</p>
        </div>
        <Button onClick={() => setShowTransactionForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить транзакцию
        </Button>
      </div>

      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="mb-2">
          <h2 className="text-lg font-semibold">Сводка по компании</h2>
        </div>
        <FinanceSummaryCards summary={companySummary} isLoading={false} />
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/60 rounded-lg p-1">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Все транзакции</TabsTrigger>
          <TabsTrigger value="employees" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Сотрудники</TabsTrigger>
        </TabsList>
        
        <TabsContent value="employees" className="space-y-4 mt-4">
          <EmployeeList onEmployeeSelect={handleEmployeeSelect} />
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Все транзакции</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <EnhancedTransactionTable
                isAdmin={true}
                onEdit={handleEditTransaction}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TransactionForm
        isOpen={showTransactionForm}
        onOpenChange={setShowTransactionForm}
        onSuccess={handleTransactionSuccess}
        editTransaction={editTransaction}
      />
    </div>
  );
};

export default Finances;