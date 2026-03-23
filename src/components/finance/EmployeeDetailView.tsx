import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, ArrowLeft, Upload, Trash2, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { getInitials } from "@/utils/formatName";

import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { EnhancedTransactionTable } from "@/components/finance/EnhancedTransactionTableNew";
import { TransactionForm } from "@/components/finance/TransactionFormNew";
import FinancesImportDialog from "@/components/finance/FinancesImportDialog";
import { TransactionsCardView } from "@/components/finance/TransactionsCardView";
import { ImportProgressWindow } from "@/components/finance/ImportProgressWindow";
import { MoneyTransferRequests } from "@/components/finance/MoneyTransferRequests";
import { BackgroundImportStatus } from "@/components/finance/BackgroundImportStatus";
import { AdvancesSummaryCard } from "@/components/finance/AdvancesSummaryCard";
import { useUserCashSummary } from "@/hooks/useUserCashSummary";
import { VoiceTransactionDialog } from "@/components/finance/VoiceTransactionDialog";

interface SelectedEmployee {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface EmployeeDetailViewProps {
  selectedEmployee: SelectedEmployee | null;
  isAdmin: boolean;
  onBack: () => void;
  onEmployeeSelect: (id: string, name: string, avatarUrl?: string | null) => void;
}

export const EmployeeDetailView = ({ selectedEmployee, isAdmin, onBack, onEmployeeSelect }: EmployeeDetailViewProps) => {
  const { user } = useAuth();
  const { hasPermission } = useUserPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);

  const currentUserId = selectedEmployee?.id || user?.id;
  const { data: summary = { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 } } = useUserCashSummary(currentUserId);

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

  const handleDeleteEmployeeTransactions = async () => {
    if (!selectedEmployee) return;
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('created_by', selectedEmployee.id);
      if (error) throw error;
      toast({ title: "Транзакции удалены" });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Ошибка", description: error.message });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 w-full">
      {selectedEmployee && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="outline"
              onClick={onBack}
              size="sm"
              className="flex-shrink-0"
            >
              <ArrowLeft className="mr-1 h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
              <AvatarImage src={selectedEmployee.avatar_url || undefined} alt={selectedEmployee.name} />
              <AvatarFallback>{getInitials({ full_name: selectedEmployee.name })}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-semibold truncate">
                {selectedEmployee.name}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Персональные финансы
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="flex-shrink-0">
                <Upload className="mr-1 h-4 w-4" />
                Импорт
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive flex-shrink-0">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Удалить
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
                      onClick={handleDeleteEmployeeTransactions}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Да, удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="outline" onClick={() => setShowVoiceDialog(true)} className="flex-shrink-0">
                <Mic className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Голос</span>
              </Button>
              <Button size="sm" onClick={() => setShowTransactionForm(true)} className="flex-shrink-0">
                <Plus className="mr-1 h-4 w-4" />
                Добавить
              </Button>
            </div>
          )}
        </div>
      )}

      {!selectedEmployee && !isAdmin && hasPermission('finances.create') && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowVoiceDialog(true)}>
            <Mic className="mr-2 h-4 w-4" />
            Голосом
          </Button>
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
            summary={summary} 
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
};
