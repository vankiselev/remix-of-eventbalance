import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDisplayName } from "@/utils/formatName";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

      // Update notification status to read
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('type', 'money_transfer')
        .contains('data', { transaction_id: transactionId });

      if (notifError) {
        console.error('Error updating notification:', notifError);
      }

      toast.success('Перевод принят');
      fetchPendingTransfers();
    } catch (error: any) {
      console.error('Error accepting transfer:', error);
      toast.error('Ошибка при принятии перевода');
    }
  };

  const handleRejectClick = (transactionId: string) => {
    setSelectedTransferId(transactionId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedTransferId || rejectionReason.trim().length < 10) {
      toast.error('Причина отклонения должна содержать минимум 10 символов');
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_money_transfer', {
        p_transaction_id: selectedTransferId,
        p_rejection_reason: rejectionReason.trim()
      });

      if (error) throw error;

      // Update notification status to read
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('type', 'money_transfer')
        .contains('data', { transaction_id: selectedTransferId });

      if (notifError) {
        console.error('Error updating notification:', notifError);
      }

      toast.success('Перевод отклонен');
      setRejectDialogOpen(false);
      setSelectedTransferId(null);
      setRejectionReason("");
      fetchPendingTransfers();
    } catch (error: any) {
      console.error('Error rejecting transfer:', error);
      toast.error(error.message || 'Ошибка при отклонении перевода');
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
          <h3 className="font-semibold">Подтвердите перевод наличных вам</h3>
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
                        {formatDisplayName(transfer.transfer_from_user?.full_name)
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
                    onClick={() => handleRejectClick(transfer.id)}
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

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Причина отклонения</AlertDialogTitle>
            <AlertDialogDescription>
              Пожалуйста, укажите причину отклонения перевода (минимум 10 символов).
              Эта информация будет отправлена отправителю.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Например: Неверная сумма, не получал деньги, ошибка в кошельке..."
              className="min-h-[100px]"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              {rejectionReason.trim().length}/10 символов
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason("");
              setSelectedTransferId(null);
            }}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={rejectionReason.trim().length < 10}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Отклонить перевод
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
