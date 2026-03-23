import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, ArrowDownLeft, Wallet } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes.user?.id;
      if (!currentUserId) throw new Error('not_authenticated');

      const { data: tx, error: txError } = await supabase
        .from('financial_transactions')
        .select('id, created_by, transfer_to_user_id, expense_amount, cash_type, transfer_status, project_owner')
        .eq('id', transactionId)
        .single();

      if (txError || !tx) throw txError || new Error('tx_not_found');
      if (tx.transfer_to_user_id !== currentUserId) throw new Error('not_recipient');
      if (tx.transfer_status && tx.transfer_status !== 'pending') throw new Error('already_processed');

      if (action === 'accept') {
        const { error: rpcErr } = await supabase.rpc('accept_money_transfer', {
          p_transaction_id: transactionId,
        });
        if (rpcErr) throw rpcErr;

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
        const { error: rpcErr } = await supabase.rpc('reject_money_transfer', {
          p_transaction_id: transactionId,
          p_rejection_reason: rejectionReason.trim(),
        });
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

  // Resolved status — compact info-only display
  if (status === 'accepted' || status === 'rejected') {
    return (
      <div className={cn(
        "flex items-center gap-2.5 p-2.5 rounded-lg",
        status === 'accepted' ? "bg-green-500/10" : "bg-red-500/10"
      )}>
        {status === 'accepted' ? (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <span className={cn(
            "text-sm font-medium",
            status === 'accepted' ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
          )}>
            {status === 'accepted' ? 'Подтверждено' : 'Отклонено'}
          </span>
          <span className="text-sm text-muted-foreground ml-1.5">
            {(amount || 0).toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>
    );
  }

  // Pending — actionable card with clear visual hierarchy
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Transfer details */}
      <div className="p-3 space-y-2">
        {/* Amount — most important */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                От {fromUserName || 'сотрудника'}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-green-600 dark:text-green-400 leading-tight">
              +{(amount || 0).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>

        {/* Wallet + description — secondary info */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wallet className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{cashType}</span>
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      
      {/* Actions — full width, stacked on very narrow widths */}
      <div className="grid grid-cols-2 gap-px bg-border/50">
        <Button
          onClick={() => handleAction('accept')}
          disabled={processing}
          size="sm"
          className="rounded-none rounded-bl-lg h-11 text-sm font-medium"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1.5" />
          )}
          Подтвердить
        </Button>
        <Button
          onClick={() => setRejectDialogOpen(true)}
          disabled={processing}
          variant="ghost"
          size="sm"
          className="rounded-none rounded-br-lg h-11 text-sm font-medium text-muted-foreground hover:text-destructive"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <XCircle className="h-4 w-4 mr-1.5" />
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