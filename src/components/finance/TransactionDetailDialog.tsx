// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, History, Plus, RefreshCw, Send, Mic } from "lucide-react";
import { ReceiptVerificationPanel } from './ReceiptVerificationPanel';
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDisplayName } from "@/utils/formatName";
import { AttachmentsView } from './AttachmentsView';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

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
  transfer_status?: string | null;
  transfer_to_user_id?: string | null;
  transfer_from_user_id?: string | null;
  transfer_to_user?: { full_name: string; email: string } | null;
  transfer_from_user?: { full_name: string; email: string } | null;
  transfer_rejection_reason?: string | null;
  is_draft?: boolean | null;
}

interface TransactionDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  canEdit: boolean;
  onEdit?: (transaction: Transaction) => void;
}

interface AuditLogEntry {
  id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  change_description: string | null;
  user_name: string | null;
}

export function TransactionDetailDialog({ 
  isOpen, 
  onClose, 
  transaction, 
  canEdit,
  onEdit
}: TransactionDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useUserPermissions();
  const isAdmin = hasPermission('transactions.view_all');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [auditHistoryLoaded, setAuditHistoryLoaded] = useState(false);
  
  if (!transaction) return null;

  // Load audit history ONLY when user expands the collapsible (lazy loading)
  const loadAuditHistory = async () => {
    if (auditHistoryLoaded || !isAdmin || !transaction.id) return;
    
    setIsLoadingHistory(true);
    try {
      // Use JOIN to get user names in single query (performance optimization)
      const { data: auditLogs, error } = await supabase
        .from('financial_audit_log')
        .select(`
          id,
          action,
          changed_by,
          changed_at,
          change_description,
          profiles!financial_audit_log_changed_by_fkey (
            full_name
          )
        `)
        .eq('transaction_id', transaction.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      if (auditLogs && auditLogs.length > 0) {
        const enrichedLogs: AuditLogEntry[] = auditLogs.map(log => ({
          id: log.id,
          action: log.action,
          changed_by: log.changed_by,
          changed_at: log.changed_at,
          change_description: log.change_description,
          user_name: formatDisplayName((log.profiles as any)?.full_name) || 'Неизвестный пользователь'
        }));

        setAuditHistory(enrichedLogs);
        setAuditHistoryLoaded(true);
      }
    } catch (error) {
      console.error('Error loading audit history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(transaction);
      onClose();
    }
  };

  const handlePublishDraft = async () => {
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          is_draft: false,
          requires_verification: true,
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Транзакция отправлена на проверку",
      });

      onClose();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (error) {
      console.error('Error publishing draft:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить на проверку",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResendTransfer = async () => {
    setIsResending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Resending transfer via button...', {
        transactionId: transaction.id,
        recipientId: transaction.transfer_to_user_id,
      });

      // Update existing transaction status back to pending and clear rejection reason
      const { error: updateError } = await supabase
        .from('financial_transactions')
        .update({
          transfer_status: 'pending',
          transfer_rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      // Log audit entry
      await supabase
        .from('financial_audit_log')
        .insert([{
          transaction_id: transaction.id,
          action: 'RESEND',
          changed_by: user.id,
          change_description: 'Rejected transfer manually re-sent via button'
        }]);

      // Send notification to recipient
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: transaction.transfer_to_user_id,
          title: 'Вам переведены деньги',
          message: `${formatDisplayName(profile?.full_name) || 'Сотрудник'} передал вам ${transaction.expense_amount} ₽`,
          type: 'money_transfer',
          data: {
            transaction_id: transaction.id,
            from_user_name: formatDisplayName(profile?.full_name) || 'Сотрудник',
            amount: transaction.expense_amount,
            cash_type: transaction.cash_type,
            description: transaction.description,
            status: 'pending',
          },
        },
      });

      console.log('✅ Transfer resent successfully via button');

      toast({
        title: "Успешно",
        description: "Запрос на передачу денег отправлен повторно",
      });

      onClose();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (error) {
      console.error('❌ Error resending transfer:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить запрос повторно",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
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
      
      // Invalidate queries to refresh data in real-time
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
  const isMoneyTransfer = transaction.category === 'Передано или получено от сотрудника';
  const isDraft = transaction.is_draft === true;
  const isVoiceTransaction = transaction.no_receipt_reason?.includes('Siri') || false;
  
  // For the resend button: show only if current user is the sender (created_by) AND status is rejected
  const isRejectedTransfer = isMoneyTransfer && 
    transaction.transfer_status === 'rejected' && 
    transaction.transfer_to_user_id && 
    isExpense; // Expense means this user sent money

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] sm:max-h-[85vh] flex flex-col overflow-hidden p-0 sm:p-6 gap-0">
        {/* Mobile-optimized header */}
        <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3 sm:px-0 sm:pt-0 sm:pb-0 border-b sm:border-b-0">
          <DialogHeader className="space-y-0.5 sm:space-y-1.5 pr-8">
            <DialogTitle className="flex items-center gap-1.5 text-base sm:text-lg">
              {isVoiceTransaction && <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />}
              {isDraft ? 'Черновик' : 'Детали транзакции'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm leading-tight">
              {isDraft 
                ? 'Проверьте и отправьте на проверку'
                : 'Информация о финансовой операции'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-6 px-4 py-3 sm:px-0 sm:py-0">
          {/* Money Transfer Status - Show if it's a transfer */}
          {isMoneyTransfer && (
            <div className={`p-3 sm:p-4 rounded-lg border ${
              transaction.transfer_status === 'pending' 
                ? 'bg-yellow-50 border-yellow-300' 
                : transaction.transfer_status === 'accepted'
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start gap-2 sm:gap-3">
                <span className="text-lg sm:text-2xl">💸</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold mb-1">
                    {transaction.transfer_status === 'pending' && '⏳ Ожидает подтверждения'}
                    {transaction.transfer_status === 'accepted' && '✅ Передача подтверждена'}
                    {transaction.transfer_status === 'rejected' && '❌ Передача отклонена'}
                  </h3>
                  {transaction.transfer_to_user && (
                    <p className="text-xs text-muted-foreground">
                      Получатель: {formatDisplayName(transaction.transfer_to_user.full_name)}
                    </p>
                  )}
                  {transaction.transfer_from_user && (
                    <p className="text-xs text-muted-foreground">
                      Отправитель: {formatDisplayName(transaction.transfer_from_user.full_name)}
                    </p>
                  )}
                  {transaction.transfer_status === 'rejected' && transaction.transfer_rejection_reason && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-800">
                      <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Причина отклонения:</p>
                      <p className="text-xs">{transaction.transfer_rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Amount highlight */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 sm:p-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Сумма</p>
              <p className={`text-lg sm:text-xl font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                {isExpense ? '−' : '+'}{formatCurrency(amount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Тип</p>
              <Badge variant={isExpense ? "destructive" : "default"} className="text-xs">
                {isExpense ? "Расход" : "Доход"}
              </Badge>
            </div>
          </div>

          {/* Compact info grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-4">
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Дата</p>
              <p className="text-xs sm:text-sm font-medium">{formatDate(transaction.operation_date)}</p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Категория</p>
              <p className="text-xs sm:text-sm font-medium truncate">{transaction.category || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Проект</p>
              <p className="text-xs sm:text-sm font-medium truncate">{transaction.static_project_name || transaction.events?.name || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Чей проект</p>
              <p className="text-xs sm:text-sm font-medium truncate">{transaction.project_owner || "—"}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Описание</p>
            <p className="text-xs sm:text-sm bg-muted/30 p-2.5 sm:p-3 rounded-lg leading-relaxed">{transaction.description}</p>
          </div>

          {transaction.notes && (
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Заметки</p>
              <p className="text-xs sm:text-sm bg-muted/30 p-2.5 sm:p-3 rounded-lg leading-relaxed">{transaction.notes}</p>
            </div>
          )}

          {/* Attachments */}
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-1.5">Вложения</p>
            <AttachmentsView
              transactionId={transaction.id}
              noReceipt={transaction.no_receipt}
              noReceiptReason={transaction.no_receipt_reason}
              canDelete={canEdit}
              onAttachmentsChange={() => {}}
            />
          </div>

          {/* Receipt Verification via ФНС */}
          {isExpense && !transaction.no_receipt && (
            <ReceiptVerificationPanel
              transactionId={transaction.id}
              expenseAmount={transaction.expense_amount}
            />
          )}

          {/* Audit History */}
          {isAdmin && (
            <div className="border-t border-border pt-3 sm:pt-4">
              <Collapsible defaultOpen={false} onOpenChange={(open) => {
                if (open && !auditHistoryLoaded) loadAuditHistory();
              }}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs sm:text-sm font-medium hover:underline w-full">
                  <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  История изменений
                  {auditHistory.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] sm:text-xs">{auditHistory.length}</Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                  {isLoadingHistory ? (
                    <div className="text-center py-3 text-xs text-muted-foreground">Загрузка...</div>
                  ) : auditHistory.length === 0 ? (
                    <div className="text-center py-3 text-xs text-muted-foreground">История пуста</div>
                  ) : (
                    auditHistory.map(log => {
                      const actionIcon = {
                        'CREATE': <Plus className="h-3 w-3 text-green-600" />,
                        'UPDATE': <Pencil className="h-3 w-3 text-blue-600" />,
                        'DELETE': <Trash2 className="h-3 w-3 text-red-600" />,
                        'RESEND': <RefreshCw className="h-3 w-3 text-orange-600" />
                      }[log.action] || <History className="h-3 w-3" />;
                      const actionText = {
                        'CREATE': 'создал', 'UPDATE': 'обновил', 'DELETE': 'удалил', 'RESEND': 'повторил'
                      }[log.action] || log.action;
                      return (
                        <div key={log.id} className="flex items-start gap-1.5 text-[11px] sm:text-xs bg-muted/30 p-1.5 sm:p-2 rounded">
                          {actionIcon}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{log.user_name}</span> {actionText}
                            {log.change_description && (
                              <span className="text-muted-foreground block mt-0.5 text-[10px] sm:text-[11px]">{log.change_description}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap text-[10px] sm:text-[11px]">
                            {format(parseISO(log.changed_at), 'd MMM HH:mm', { locale: ru })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Meta */}
          <div className="border-t border-border pt-2 sm:pt-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Создано: {new Date(transaction.created_at).toLocaleString("ru-RU")}
            </p>
          </div>
        </div>

        {/* Action Buttons — mobile-friendly sticky footer */}
        {(canEdit || isRejectedTransfer || isDraft) && (
          <div className="flex-shrink-0 border-t border-border px-4 py-3 sm:px-0 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4 flex flex-col sm:flex-row gap-2 sm:justify-end bg-background">
            {isDraft && (
              <Button onClick={handlePublishDraft} disabled={isPublishing} size="sm" className="w-full sm:w-auto h-10 sm:h-9 text-sm">
                <Send className="mr-1.5 h-4 w-4" />
                {isPublishing ? "Отправка..." : "На проверку"}
              </Button>
            )}
            {isRejectedTransfer && (
              <Button onClick={handleResendTransfer} disabled={isResending} size="sm" className="w-full sm:w-auto h-10 sm:h-9 text-sm">
                {isResending ? "Отправка..." : "Отправить снова"}
              </Button>
            )}
            {canEdit && (
              <>
                {onEdit && (
                  <Button onClick={handleEdit} variant="outline" size="sm" className="w-full sm:w-auto h-10 sm:h-9 text-sm">
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Редактировать
                  </Button>
                )}
                <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" size="sm" className="w-full sm:w-auto h-10 sm:h-9 text-sm">
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Удалить
                </Button>
              </>
            )}
          </div>
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
