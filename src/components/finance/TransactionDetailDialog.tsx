import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { AttachmentsView } from './AttachmentsView';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  operation_date: string;
  project_owner: string;
  description: string;
  expense_amount: number | null;
  income_amount: number | null;
  category: string;
  cash_type: string | null;
  notes: string | null;
  no_receipt: boolean;
  no_receipt_reason: string | null;
  created_by: string;
  project_id: string | null;
  static_project_name?: string | null;
  events?: { name: string } | null;
  attachments_count?: number;
  created_at: string;
}

interface TransactionDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  canEdit: boolean;
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionDetailDialog({ 
  isOpen, 
  onClose, 
  transaction, 
  canEdit,
  onEdit
}: TransactionDetailDialogProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!transaction) return null;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(transaction);
      onClose();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete the transaction (attachments will be cascade deleted due to foreign key)
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Транзакция успешно удалена",
      });

      setDeleteDialogOpen(false);
      onClose();
      
      // Reload the page to refresh the list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить транзакцию",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const getCashTypeLabel = (cashType: string | null) => {
    if (!cashType) return null;
    
    const cashTypes: Record<string, string> = {
      nastya: "Настя",
      lera: "Лера",
      vanya: "Ваня",
      "Наличка Настя": "Настя",
      "Наличка Лера": "Лера",
      "Наличка Ваня": "Ваня"
    };

    return cashTypes[cashType] || cashType;
  };

  const isExpense = transaction.expense_amount && transaction.expense_amount > 0;
  const amount = transaction.expense_amount || transaction.income_amount || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали транзакции</DialogTitle>
          <DialogDescription>
            Подробная информация о финансовой операции
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Дата операции</label>
              <p className="text-sm">{formatDate(transaction.operation_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Тип операции</label>
              <p className={`text-sm font-medium ${isExpense ? 'text-red-600' : 'text-blue-600'}`}>
                {isExpense ? "Расход" : "Доход"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Проект</label>
              <p className="text-sm">{transaction.static_project_name || transaction.events?.name || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Чей проект</label>
              <p className="text-sm">{transaction.project_owner || "—"}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Описание</label>
            <p className="text-sm bg-gray-50 p-3 rounded-lg">{transaction.description}</p>
          </div>

          {transaction.notes && (
            <div>
              <label className="text-sm font-medium text-gray-600">Дополнительные заметки</label>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">{transaction.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Сумма</label>
              <p className={`text-lg font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                {isExpense ? '-' : '+'}{formatCurrency(amount)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Касса</label>
              <p className="text-sm">
                {getCashTypeLabel(transaction.cash_type) || "—"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Категория</label>
              <p className="text-sm">
                {transaction.category}
              </p>
            </div>
          </div>

          {/* Attachments Section */}
          <div>
            <label className="text-sm font-medium text-gray-600 mb-3 block">Вложения</label>
            <AttachmentsView
              transactionId={transaction.id}
              noReceipt={transaction.no_receipt}
              noReceiptReason={transaction.no_receipt_reason}
              canDelete={canEdit}
              onAttachmentsChange={() => {
                // Refresh parent component if needed
              }}
            />
          </div>

          {/* Meta Info */}
          <div className="border-t pt-4">
            <div className="text-xs text-gray-500">
              Создано: {new Date(transaction.created_at).toLocaleString("ru-RU")}
            </div>
          </div>
        </div>

        {canEdit && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {onEdit && (
              <Button onClick={handleEdit} className="w-full sm:w-auto" variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            )}
            <Button 
              onClick={() => setDeleteDialogOpen(true)} 
              className="w-full sm:w-auto"
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить транзакцию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Транзакция и все прикрепленные файлы будут удалены безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}