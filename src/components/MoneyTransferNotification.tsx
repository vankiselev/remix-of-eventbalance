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
      const { error } = await supabase.functions.invoke('handle-money-transfer', {
        body: {
          transaction_id: transactionId,
          action,
        },
      });

      if (error) throw error;

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
      
      <div className="flex gap-2">
        <Button
          onClick={() => handleAction('accept')}
          disabled={processing}
          className="flex-1"
          size="sm"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Подтвердить получение
        </Button>
        <Button
          onClick={() => handleAction('reject')}
          disabled={processing}
          variant="outline"
          className="flex-1"
          size="sm"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Отклонить
        </Button>
      </div>
    </div>
  );
};
