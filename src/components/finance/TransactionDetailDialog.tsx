import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatCurrency";
import { AttachmentsView } from './AttachmentsView';

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
  events?: { name: string } | null;
  attachments_count?: number;
  created_at: string;
}

interface TransactionDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  canEdit: boolean;
}

export function TransactionDetailDialog({ 
  isOpen, 
  onClose, 
  transaction, 
  canEdit 
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const getCashTypeBadge = (cashType: string | null) => {
    if (!cashType) return null;
    
    const cashTypes = {
      nastya: { label: "Настя", className: "badge-nastya" },
      lera: { label: "Лера", className: "badge-lera" },
      vanya: { label: "Ваня", className: "badge-vanya" }
    };

    const type = cashTypes[cashType as keyof typeof cashTypes];
    if (!type) return null;

    return (
      <Badge variant="outline" className={`${type.className} text-xs`}>
        {type.label}
      </Badge>
    );
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
              <p className="text-sm">
                <Badge variant={isExpense ? "destructive" : "default"}>
                  {isExpense ? "Расход" : "Доход"}
                </Badge>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Проект</label>
              <p className="text-sm">{transaction.events?.name || "—"}</p>
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
              <div className="mt-1">
                {getCashTypeBadge(transaction.cash_type) || <span className="text-sm text-gray-500">—</span>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Категория</label>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {transaction.category}
                </Badge>
              </div>
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
      </DialogContent>
    </Dialog>
  );
}