import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface MoneyTransferNotificationProps {
  notificationId: string;
  transactionId: string;
  fromUserName: string;
  amount: number;
  cashType: string;
  description: string;
  onAction: () => void;
}

export const MoneyTransferNotification = ({
  notificationId,
  transactionId,
  fromUserName,
  amount,
  cashType,
  description,
  onAction,
}: MoneyTransferNotificationProps) => {
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action: 'accept' | 'reject') => {
    setProcessing(true);
    try {
      console.log('🔄 Processing money transfer action:', action, { transactionId });
      
      // 1) Get current user
      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes.user?.id;
      console.log('👤 Current user ID:', currentUserId);
      if (!currentUserId) throw new Error('not_authenticated');

      // 2) Load original transaction
      const { data: tx, error: txError } = await supabase
        .from('financial_transactions')
        .select('id, created_by, transfer_to_user_id, expense_amount, cash_type, transfer_status, project_owner')
        .eq('id', transactionId)
        .single();

      console.log('📄 Transaction data:', tx);
      console.log('❌ Transaction error:', txError);

      if (txError || !tx) throw txError || new Error('tx_not_found');

      if (tx.transfer_to_user_id !== currentUserId) {
        throw new Error('not_recipient');
      }

      if (tx.transfer_status && tx.transfer_status !== 'pending') {
        throw new Error('already_processed');
      }

      if (action === 'accept') {
        console.log('✅ Accepting transfer - creating income transaction...');
        
        // Create income transaction for recipient
        const { data: incomeTx, error: incomeErr } = await supabase
          .from('financial_transactions')
          .insert([
            {
              created_by: currentUserId,
              operation_date: new Date().toISOString().split('T')[0],
              income_amount: tx.expense_amount,
              expense_amount: 0,
              category: 'Передано или получено от сотрудника',
              cash_type: tx.cash_type,
              description: `Получено от ${fromUserName || 'сотрудника'}`,
              project_owner: tx.project_owner || 'Не указан',
              transfer_from_user_id: tx.created_by,
              linked_transaction_id: tx.id,
              no_receipt: true,
              no_receipt_reason: 'Внутренняя передача денег между сотрудниками',
            },
          ])
          .select()
          .single();

        console.log('💰 Income transaction result:', incomeTx);
        console.log('❌ Income transaction error:', incomeErr);

        if (incomeErr) throw incomeErr;

        // Update original transaction
        const { error: updateErr } = await supabase
          .from('financial_transactions')
          .update({ transfer_status: 'accepted', linked_transaction_id: incomeTx.id })
          .eq('id', tx.id);
        if (updateErr) throw updateErr;

        // Notify sender
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: tx.created_by,
            title: 'Передача денег подтверждена',
            message: `${fromUserName} подтвердил получение ${tx.expense_amount} ₽`,
            type: 'money_transfer',
            data: { transaction_id: tx.id, status: 'accepted' },
          },
        });
      } else {
        // Reject transfer
        const { error: updateErr } = await supabase
          .from('financial_transactions')
          .update({ transfer_status: 'rejected' })
          .eq('id', tx.id);
        if (updateErr) throw updateErr;

        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: tx.created_by,
            title: 'Передача денег отклонена',
            message: `${fromUserName} отклонил передачу ${tx.expense_amount} ₽`,
            type: 'money_transfer',
            data: { transaction_id: tx.id, status: 'rejected' },
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

  return (
    <div className="space-y-3 p-3 bg-accent/50 rounded-lg">
      <div className="space-y-1">
        <div className="font-medium">От: {fromUserName}</div>
        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
          +{amount.toLocaleString('ru-RU')} ₽
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
        </Button>
        <Button
          onClick={() => handleAction('reject')}
          disabled={processing}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
