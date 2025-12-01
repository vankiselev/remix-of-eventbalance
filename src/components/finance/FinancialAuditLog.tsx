import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FileText, Trash2, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  transaction_id: string;
  changed_by: string;
  old_data: any;
  new_data: any;
  changed_at: string;
  action: string;
  change_description: string;
  user_name?: string;
}

export const FinancialAuditLog = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('audit-log-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_audit_log'
        },
        () => {
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data: auditData, error } = await supabase
        .from('financial_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set(auditData?.map(log => log.changed_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const logsWithNames = (auditData || []).map(log => ({
        ...log,
        user_name: profileMap.get(log.changed_by) || 'Неизвестный пользователь'
      }));

      setLogs(logsWithNames);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'создал(а) транзакцию';
      case 'UPDATE':
        return 'обновил(а) транзакцию';
      case 'DELETE':
        return 'удалил(а) транзакцию';
      default:
        return 'изменил(а) транзакцию';
    }
  };

  const getTransactionDescription = (log: AuditLogEntry) => {
    const data = log.new_data || log.old_data || {};
    const amount = data.expense_amount || data.income_amount || 0;
    const type = data.expense_amount ? 'Расход' : 'Приход';
    const category = data.category || '';
    return `${type} ${Number(amount).toLocaleString('ru-RU')} ₽${category ? ` (${category})` : ''}`;
  };

  const handleDeleteOne = async (id: string) => {
    try {
      const { error } = await supabase
        .from('financial_audit_log')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Запись удалена');
      fetchAuditLogs();
    } catch (error) {
      console.error('Error deleting log entry:', error);
      toast.error('Ошибка при удалении записи');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('financial_audit_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast.success('Журнал очищен');
      fetchAuditLogs();
    } catch (error) {
      console.error('Error clearing log:', error);
      toast.error('Ошибка при очистке журнала');
    } finally {
      setDeleteAllDialogOpen(false);
    }
  };

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = format(parseISO(log.changed_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLogEntry[]>);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Загрузка...</div>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет записей в журнале</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Журнал финансовых операций</h2>
          <p className="text-muted-foreground">История всех изменений транзакций</p>
        </div>
        {logs.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setDeleteAllDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Очистить журнал
          </Button>
        )}
      </div>

      <Card>
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="p-6 space-y-6">
            {Object.entries(groupedLogs).map(([date, dayLogs]) => (
              <div key={date} className="space-y-3">
                <div className="sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                  <h3 className="text-lg font-semibold">
                    {format(parseISO(date), 'd MMMM yyyy', { locale: ru })}
                  </h3>
                  <Separator className="mt-2" />
                </div>

                <div className="space-y-2">
                  {dayLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="mt-1">{getActionIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium">{log.user_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {getActionText(log.action)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getTransactionDescription(log)}
                        </p>
                        {log.change_description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.change_description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(parseISO(log.changed_at), 'HH:mm')}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setDeletingId(log.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Delete one entry confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Запись будет удалена из журнала навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDeleteOne(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all entries confirmation */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить весь журнал?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все записи журнала будут удалены навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Очистить журнал
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
