import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface PendingTransfer {
  id: string;
  operation_date: string;
  description: string;
  expense_amount: number;
  cash_type: string;
  created_by: string;
  transfer_from_user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export const MoneyTransferRequests = () => {
  const { user } = useAuth();
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchPendingTransfers();
      
      // Realtime subscription
      const channel = supabase
        .channel('pending_transfers')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'financial_transactions',
            filter: `transfer_to_user_id=eq.${user.id}`
          },
          () => {
            fetchPendingTransfers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchPendingTransfers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('transfer_to_user_id', user?.id)
        .eq('transfer_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(t => t.created_by).filter(Boolean))];
      
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', senderIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        const enrichedData = (data || []).map(t => ({
          id: t.id,
          operation_date: t.operation_date,
          description: t.description,
          expense_amount: t.expense_amount,
          cash_type: t.cash_type,
          created_by: t.created_by,
          transfer_from_user: profileMap.get(t.created_by) || undefined,
        }));

        setPendingTransfers(enrichedData);
      } else {
        setPendingTransfers((data || []).map(t => ({
          id: t.id,
          operation_date: t.operation_date,
          description: t.description,
          expense_amount: t.expense_amount,
          cash_type: t.cash_type,
          created_by: t.created_by,
        })));
      }
    } catch (error) {
      console.error('Error fetching pending transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (transactionId: string) => {
    try {
      const { error } = await supabase.rpc('accept_money_transfer', {
        p_transaction_id: transactionId
      });

      if (error) throw error;

      toast.success('Перевод принят');
      fetchPendingTransfers();
    } catch (error: any) {
      console.error('Error accepting transfer:', error);
      toast.error('Ошибка при принятии перевода');
    }
  };

  const handleReject = async (transactionId: string) => {
    try {
      const { error } = await supabase.rpc('reject_money_transfer', {
        p_transaction_id: transactionId
      });

      if (error) throw error;

      toast.success('Перевод отклонен');
      fetchPendingTransfers();
    } catch (error: any) {
      console.error('Error rejecting transfer:', error);
      toast.error('Ошибка при отклонении перевода');
    }
  };

  // Don't render anything if no pending transfers
  if (loading || pendingTransfers.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="font-semibold">Запросы на перевод денег</h3>
        </div>

        <div className="space-y-2">
          {pendingTransfers.map((transfer) => (
            <Card key={transfer.id} className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={transfer.transfer_from_user?.avatar_url} />
                      <AvatarFallback>
                        {transfer.transfer_from_user?.full_name
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase() || 'С'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {transfer.transfer_from_user?.full_name || transfer.transfer_from_user?.email || 'Сотрудник'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transfer.operation_date), 'd MMMM', { locale: ru })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(transfer.expense_amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transfer.cash_type}
                    </div>
                  </div>
                </div>

                {transfer.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {transfer.description}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAccept(transfer.id)}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Принять
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(transfer.id)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Отклонить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
