import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MoneyTransferNotificationProps {
  notificationId: string;
  transactionId: string;
  fromUserName: string;
  amount: number;
  cashType: string;
  description: string;
  status?: string;
  onAction: () => void;
}

export const MoneyTransferNotification = ({
  notificationId,
  transactionId,
  fromUserName,
  amount,
  cashType,
  description,
  status,
  onAction,
}: MoneyTransferNotificationProps) => {
  const [processing, setProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleAction = async (action: 'accept' | 'reject') => {
    setProcessing(true);
    try {
      
      
      // 1) Get current user
      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes.user?.id;
      
      if (!currentUserId) throw new Error('not_authenticated');

      // 2) Load original transaction
      const { data: tx, error: txError } = await supabase
        .from('financial_transactions')
        .select('id, created_by, transfer_to_user_id, expense_amount, cash_type, transfer_status, project_owner')
        .eq('id', transactionId)
        .single();


      if (txError || !tx) throw txError || new Error('tx_not_found');

      if (tx.transfer_to_user_id !== currentUserId) {
        throw new Error('not_recipient');
      }

      if (tx.transfer_status && tx.transfer_status !== 'pending') {
        throw new Error('already_processed');
      }

      if (action === 'accept') {
        
        const { error: rpcErr } = await supabase.rpc('accept_money_transfer', {
          p_transaction_id: transactionId,
        });
        console.log('🔁 RPC accept error:', rpcErr);
        if (rpcErr) throw rpcErr;

        // Notify sender
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: tx.created_by,
            title: 'Передача денег подтверждена',
            message: `${fromUserName} подтвердил получение ${tx.expense_amount} ₽`,
            type: 'money_transfer',
            data: { 
              transaction_id: tx.id, 
              status: 'accepted',
              amount: tx.expense_amount,
              cash_type: tx.cash_type
            },
          },
        });
      } else {
        // Reject transfer via RPC with rejection reason
        const { error: rpcErr } = await supabase.rpc('reject_money_transfer', {
          p_transaction_id: transactionId,
          p_rejection_reason: rejectionReason.trim(),
        });
        console.log('🔁 RPC reject error:', rpcErr);
        if (rpcErr) throw rpcErr;

        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: tx.created_by,
            title: 'Передача денег отклонена',
            message: `${fromUserName} отклонил передачу ${tx.expense_amount} ₽`,
            type: 'money_transfer',
            data: { 
              transaction_id: tx.id, 
              status: 'rejected',
              amount: tx.expense_amount,
              cash_type: tx.cash_type
            },
          },
        });
      }

      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      toast({
        title: action === 'accept' ? 'Получение подтверждено' : 'Передача отклонена',
        description: action === 'accept' 
          ? 'Деньги добавлены в ваш кошелек'
          : 'Передача денег отклонена',
      });

      onAction();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать передачу денег",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // If status is accepted or rejected, show info-only message
  if (status === 'accepted' || status === 'rejected') {
    return (
      <div className="space-y-2 p-3 bg-accent/50 rounded-lg">
        <div className="flex items-center gap-2">
          {status === 'accepted' ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <div className="font-medium">
            {status === 'accepted' ? 'Получение подтверждено' : 'Передача отклонена'}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Сумма: {(amount || 0).toLocaleString('ru-RU')} ₽
        </div>
      </div>
    );
  }

  // For pending status, show action buttons
  return (
    <div className="space-y-3 p-3 bg-accent/50 rounded-lg">
      <div className="space-y-1">
        <div className="font-medium">От: {fromUserName}</div>
        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
          +{(amount || 0).toLocaleString('ru-RU')} ₽
        </div>
        <div className="text-sm text-muted-foreground">
          Кошелек: {cashType}
        </div>
        {description && (
          <div className="text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => handleAction('accept')}
          disabled={processing}
          size="sm"
          className="w-full"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Подтвердить получение
        </Button>
        <Button
          onClick={() => setRejectDialogOpen(true)}
          disabled={processing}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Отклонить
        </Button>
      </div>

      {/* Rejection Reason Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Причина отклонения</AlertDialogTitle>
            <AlertDialogDescription>
              Пожалуйста, укажите причину, по которой вы отклоняете передачу денег.
              Отправитель увидит это сообщение.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Причина отклонения *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Например: Неверная сумма, не получал деньги..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Минимум 10 символов ({rejectionReason.trim().length}/10)
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRejectDialogOpen(false);
                handleAction('reject');
              }}
              disabled={processing || rejectionReason.trim().length < 10}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Отклонение...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Отклонить
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
