import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { AttachmentsView } from "./AttachmentsView";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";

interface Transaction {
  id: string;
  operation_date: string;
  description: string;
  income_amount: number | null;
  expense_amount: number | null;
  category: string;
  cash_type: string | null;
  verification_status: string;
  verification_comment: string | null;
  created_by: string;
  static_project_name?: string | null;
}

interface TransactionVerificationDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TransactionVerificationDialog = ({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: TransactionVerificationDialogProps) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!transaction) return null;

  const handleVerify = async (action: 'approved' | 'rejected' | 'requested_changes') => {
    setIsSubmitting(true);
    try {
      const newStatus = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'pending';
      
      // Обновить статус транзакции
      const { error: updateError } = await supabase
        .from('financial_transactions')
        .update({
          verification_status: newStatus,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString(),
          verification_comment: comment || null,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      // Записать в историю проверок
      const { error: historyError } = await supabase
        .from('transaction_verifications')
        .insert({
          transaction_id: transaction.id,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          action,
          comment: comment || null,
          old_status: transaction.verification_status,
          new_status: newStatus,
        });

      if (historyError) throw historyError;

      // Send notification to transaction creator
      let notificationTitle: string;
      let notificationMessage: string;
      
      if (action === 'approved') {
        notificationTitle = 'Транзакция одобрена';
        notificationMessage = `Ваша транзакция на сумму ${formatCurrency(amount)} одобрена финансистом`;
        if (comment) {
          notificationMessage += `\nКомментарий: ${comment}`;
        }
      } else if (action === 'rejected') {
        notificationTitle = 'Транзакция отклонена';
        notificationMessage = `Ваша транзакция на сумму ${formatCurrency(amount)} отклонена`;
        if (comment) {
          notificationMessage += `\nПричина: ${comment}`;
        }
      } else {
        notificationTitle = 'Требуется дополнительная информация';
        notificationMessage = `По вашей транзакции на сумму ${formatCurrency(amount)} запрошена дополнительная информация`;
        if (comment) {
          notificationMessage += `\nКомментарий: ${comment}`;
        }
      }

      // Send notification
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          user_id: transaction.created_by,
          title: notificationTitle,
          message: notificationMessage,
          type: 'transaction',
          data: {
            transaction_id: transaction.id,
            action,
            amount: amount,
            category: transaction.category,
            verification_comment: comment || null,
          },
        });

      if (notifyError) {
        console.error('Notification error:', notifyError);
      }

      toast.success(
        action === 'approved' 
          ? 'Транзакция утверждена' 
          : action === 'rejected'
          ? 'Транзакция отклонена'
          : 'Запрошена дополнительная информация'
      );

      setComment("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error verifying transaction:', error);
      toast.error('Ошибка при проверке транзакции');
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = transaction.income_amount || transaction.expense_amount || 0;
  const isIncome = !!transaction.income_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Проверка транзакции</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Дата</p>
              <p className="font-medium">{format(new Date(transaction.operation_date), 'dd.MM.yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Категория</p>
              <p className="font-medium">{transaction.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сумма</p>
              <p className={`font-bold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                {isIncome ? '+' : '-'} {formatCurrency(amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Тип наличных</p>
              <p className="font-medium">{transaction.cash_type || '—'}</p>
            </div>
            {transaction.static_project_name && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Проект</p>
                <p className="font-medium">{transaction.static_project_name}</p>
              </div>
            )}
          </div>

          {/* Описание */}
          {transaction.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Описание</p>
              <p className="text-sm border rounded-md p-3 bg-muted/50">
                {transaction.description}
              </p>
            </div>
          )}

          {/* Прикрепленные файлы */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Прикрепленные чеки</p>
            <AttachmentsView transactionId={transaction.id} />
          </div>

          {/* Текущий статус */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Текущий статус</p>
            <Badge variant={
              transaction.verification_status === 'approved' ? 'default' :
              transaction.verification_status === 'rejected' ? 'destructive' : 'secondary'
            }>
              {transaction.verification_status === 'pending' && 'На проверке'}
              {transaction.verification_status === 'approved' && 'Утверждено'}
              {transaction.verification_status === 'rejected' && 'Отклонено'}
            </Badge>
          </div>

          {/* Комментарий финансиста */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Комментарий</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавьте комментарий (необязательно)"
              rows={3}
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => handleVerify('approved')}
              disabled={isSubmitting}
              className="flex-1"
              variant="default"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Утвердить
            </Button>
            <Button
              onClick={() => handleVerify('rejected')}
              disabled={isSubmitting}
              className="flex-1"
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Отклонить
            </Button>
            <Button
              onClick={() => handleVerify('requested_changes')}
              disabled={isSubmitting}
              className="flex-1"
              variant="outline"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Запросить изменения
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
