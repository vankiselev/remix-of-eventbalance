import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { CashSummary } from "./CashSummary";
import { EmployeeList } from "./EmployeeList";
import { TransactionsTable } from "./TransactionsTable";
import { TransactionDialog } from "./TransactionDialog";

interface CashSummaryData {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: string;
  totalCash: number;
}

interface Transaction {
  id: string;
  operation_date: string;
  project_owner: string;
  description: string;
  income_amount: number;
  expense_amount: number;
  category: string;
  cash_type?: string;
  project_id?: string;
  events?: { name: string };
}

const Finances = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>('employee');

  const employeeId = searchParams.get('employeeId');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchData();
    }
  }, [user, employeeId]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const [loading, setLoading] = useState(true);
  const [companySummary, setCompanySummary] = useState<CashSummaryData>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0
  });
  const [userSummary, setUserSummary] = useState<CashSummaryData>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    if (user) {
      fetchData();
    }
  }, [user, employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (isAdmin) {
        // Admin: fetch company-wide data
        await fetchCompanySummary();
        
        if (employeeId) {
          // Viewing specific employee
          await fetchEmployeeDetails(employeeId);
          await fetchEmployeeTransactions(employeeId);
        } else {
          // Admin dashboard
          await fetchEmployees();
        }
      } else {
        // Employee: fetch only their data
        await fetchUserSummary();
        await fetchUserTransactions();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить финансовые данные",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanySummary = async () => {
    const { data, error } = await supabase
      .rpc('get_company_cash_summary');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      setCompanySummary({
        total_cash: data[0].total_cash || 0,
        cash_nastya: data[0].cash_nastya || 0,
        cash_lera: data[0].cash_lera || 0,
        cash_vanya: data[0].cash_vanya || 0
      });
    }
  };

  const fetchUserSummary = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .rpc('calculate_user_cash_totals', { user_uuid: user.id });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      setUserSummary({
        total_cash: data[0].total_cash || 0,
        cash_nastya: data[0].cash_nastya || 0,
        cash_lera: data[0].cash_lera || 0,
        cash_vanya: data[0].cash_vanya || 0
      });
    }
  };

  const fetchEmployees = async () => {
    const { data: profilesData, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role');

    if (error) throw error;

    // Calculate cash totals for each employee
    const employeesWithCash = await Promise.all(
      (profilesData || []).map(async (employee) => {
        const { data: cashData } = await supabase
          .rpc('calculate_user_cash_totals', { user_uuid: employee.id });
        
        return {
          ...employee,
          totalCash: cashData?.[0]?.total_cash || 0
        };
      })
    );

    setEmployees(employeesWithCash);
  };

  const fetchEmployeeDetails = async (empId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', empId)
      .single();

    if (error) throw error;

    if (data) {
      const { data: cashData } = await supabase
        .rpc('calculate_user_cash_totals', { user_uuid: empId });

      setSelectedEmployee({
        ...data,
        totalCash: cashData?.[0]?.total_cash || 0
      });

      // Fetch employee's individual summary
      if (cashData && cashData.length > 0) {
        setUserSummary({
          total_cash: cashData[0].total_cash || 0,
          cash_nastya: cashData[0].cash_nastya || 0,
          cash_lera: cashData[0].cash_lera || 0,
          cash_vanya: cashData[0].cash_vanya || 0
        });
      }
    }
  };

  const fetchEmployeeTransactions = async (empId: string) => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        events(name)
      `)
      .eq('created_by', empId)
      .order('operation_date', { ascending: false });

    if (error) throw error;
    setTransactions(data || []);
  };

  const fetchUserTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        events(name)
      `)
      .eq('created_by', user.id)
      .order('operation_date', { ascending: false });

    if (error) throw error;
    setTransactions(data || []);
  };

  const handleEmployeeClick = (empId: string) => {
    navigate(`/finances?employeeId=${empId}`);
  };

  const handleBackToEmployees = () => {
    navigate('/finances');
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionDialog(true);
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransactionId || !user) return;

    try {
      // Get transaction data for audit log
      const { data: transactionData } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', deletingTransactionId)
        .single();

      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', deletingTransactionId);

      if (error) throw error;

      // Log audit trail for deletion
      if (transactionData) {
        await supabase.from("financial_audit_log").insert({
          transaction_id: deletingTransactionId,
          changed_by: user.id,
          action: "deleted",
          old_data: transactionData,
          change_description: `Deleted transaction: ${transactionData.description}`,
        });
      }

      toast({
        title: "Успешно!",
        description: "Транзакция удалена",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить транзакцию",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingTransactionId(null);
    }
  };

  const confirmDeleteTransaction = (transactionId: string) => {
    setDeletingTransactionId(transactionId);
    setDeleteDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    setEditingTransaction(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Финансы</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted h-24 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Admin viewing specific employee
  if (isAdmin && employeeId && selectedEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBackToEmployees}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к списку
            </Button>
            <h1 className="text-3xl font-bold">Финансы - {selectedEmployee.full_name}</h1>
          </div>
        </div>

        <CashSummary 
          totalCash={userSummary.total_cash}
          cashNastya={userSummary.cash_nastya}
          cashLera={userSummary.cash_lera}
          cashVanya={userSummary.cash_vanya}
        />

        <TransactionsTable
          transactions={transactions}
          canEdit={true}
          onEdit={handleEditTransaction}
          onDelete={confirmDeleteTransaction}
          onAdd={() => setShowTransactionDialog(true)}
          userName={selectedEmployee.full_name}
        />

        <TransactionDialog
          open={showTransactionDialog}
          onOpenChange={setShowTransactionDialog}
          transaction={editingTransaction}
          onSuccess={handleTransactionSuccess}
          targetUserId={employeeId}
        />

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Подтвердите удаление</DialogTitle>
              <DialogDescription>
                Вы уверены, что хотите удалить эту транзакцию? Это действие нельзя отменить.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Отмена
              </Button>
              <Button variant="destructive" onClick={handleDeleteTransaction}>
                Удалить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Admin dashboard
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Финансы</h1>
            <p className="text-muted-foreground">Управление финансами компании</p>
          </div>
        </div>

        <CashSummary 
          totalCash={companySummary.total_cash}
          cashNastya={companySummary.cash_nastya}
          cashLera={companySummary.cash_lera}
          cashVanya={companySummary.cash_vanya}
          isCompanyWide={true}
        />
        <EmployeeList employees={employees} onEmployeeClick={handleEmployeeClick} />
      </div>
    );
  }

  // Employee view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Финансы</h1>
          <p className="text-muted-foreground">Ваши личные финансы</p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Вы можете только просматривать свои транзакции. Для редактирования обратитесь к администратору.
        </AlertDescription>
      </Alert>

      <CashSummary 
        totalCash={userSummary.total_cash}
        cashNastya={userSummary.cash_nastya}
        cashLera={userSummary.cash_lera}
        cashVanya={userSummary.cash_vanya}
      />

      <TransactionsTable
        transactions={transactions}
        canEdit={false}
      />
    </div>
  );
};

export default Finances;