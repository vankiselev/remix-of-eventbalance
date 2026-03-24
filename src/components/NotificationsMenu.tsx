import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Bell, Check, Trash2, X, FileText, Wallet, Calendar, 
  Palmtree, ArrowLeftRight, Settings, DollarSign, BellRing 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MoneyTransferNotification } from '@/components/MoneyTransferNotification';

const iconConfig: Record<string, { icon: typeof Bell; bg: string; color: string }> = {
  report:         { icon: FileText,       bg: 'bg-blue-500/15',   color: 'text-blue-500' },
  salary:         { icon: Wallet,         bg: 'bg-emerald-500/15', color: 'text-emerald-500' },
  event:          { icon: Calendar,       bg: 'bg-violet-500/15', color: 'text-violet-500' },
  vacation:       { icon: Palmtree,       bg: 'bg-amber-500/15',  color: 'text-amber-500' },
  transaction:    { icon: DollarSign,     bg: 'bg-green-500/15',  color: 'text-green-500' },
  money_transfer: { icon: ArrowLeftRight, bg: 'bg-orange-500/15', color: 'text-orange-500' },
  system:         { icon: Settings,       bg: 'bg-muted',         color: 'text-muted-foreground' },
};

const getIconConfig = (type: string) => iconConfig[type] || { icon: BellRing, bg: 'bg-muted', color: 'text-muted-foreground' };

type DateGroup = { label: string; items: Notification[] };

const groupByDate = (notifications: Notification[]): DateGroup[] => {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (isToday(d)) today.push(n);
    else if (isYesterday(d)) yesterday.push(n);
    else earlier.push(n);
  }

  const groups: DateGroup[] = [];
  if (today.length) groups.push({ label: 'Сегодня', items: today });
  if (yesterday.length) groups.push({ label: 'Вчера', items: yesterday });
  if (earlier.length) groups.push({ label: 'Ранее', items: earlier });
  return groups;
};

export const NotificationsMenu = () => {
  const [open, setOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  const handleNotificationClick = async (id: string, read: boolean) => {
    if (!read) await markAsRead(id);
  };

  const handleDeleteAll = async () => {
    await deleteAllNotifications();
    setDeleteAllDialogOpen(false);
    setOpen(false);
  };

  const filtered = useMemo(() => ({
    all: notifications,
    unread: notifications.filter(n => !n.read),
    transfers: notifications.filter(n => n.type === 'money_transfer'),
    system: notifications.filter(n => n.type === 'system'),
  }), [notifications]);

  const renderNotification = (n: Notification) => {
    const cfg = getIconConfig(n.type);
    const Icon = cfg.icon;
    const isTransferWithActions = n.type === 'money_transfer' && n.data && !n.read;

    return (
      <div
        key={n.id}
        className={cn(
          'relative flex gap-2.5 px-3 py-2.5 rounded-lg transition-colors group',
          !isTransferWithActions && 'cursor-pointer active:bg-muted/80 hover:bg-muted/60',
          !n.read && 'border-l-[3px] border-l-primary bg-primary/5',
          n.read && 'border-l-[3px] border-l-transparent'
        )}
        onClick={() => !isTransferWithActions && handleNotificationClick(n.id, n.read)}
      >
        {/* Icon — vertically centered with first line of text */}
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          cfg.bg
        )}>
          <Icon className={cn('h-4 w-4', cfg.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              'text-[13px] leading-[1.3] flex-1 min-w-0 break-words',
              !n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
            )}>
              {n.title}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-0.5 rounded-full"
              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          
          {/* Message — hide for actionable transfers */}
          {!isTransferWithActions && (
            <p className="text-xs leading-[1.4] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
          )}
          
          <p className="text-[10px] text-muted-foreground/50 mt-1 leading-none">
            {format(new Date(n.created_at), 'HH:mm · d MMM', { locale: ru })}
          </p>

          {/* Money transfer actions */}
          {isTransferWithActions && (
            <div className="mt-2">
              <MoneyTransferNotification
                notificationId={n.id}
                transactionId={n.data.transaction_id}
                fromUserName={n.data.from_user_name}
                amount={n.data.amount}
                cashType={n.data.cash_type}
                description={n.data.description}
                status={n.data.status}
                onAction={() => {
                  queryClient.invalidateQueries({ queryKey: ['transactions'] });
                  queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
                  queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
                }}
              />
            </div>
          )}

          {/* Non-actionable transfer status */}
          {n.type === 'money_transfer' && n.data && n.read && n.data.status && (
            <div className="mt-2">
              <MoneyTransferNotification
                notificationId={n.id}
                transactionId={n.data.transaction_id}
                fromUserName={n.data.from_user_name}
                amount={n.data.amount}
                cashType={n.data.cash_type}
                description={n.data.description}
                status={n.data.status}
                onAction={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderList = (items: Notification[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 px-4">
          <Bell className="h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Нет уведомлений</p>
        </div>
      );
    }

    const groups = groupByDate(items);

    return (
      <div className="space-y-0.5 p-1.5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 pt-3 pb-1">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map(renderNotification)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1 tabular-nums"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-[420px] flex flex-col gap-0 p-0" hideCloseButton>
          {/* Header */}
          <div
            className="flex items-center justify-between gap-2 px-4 pb-2 border-b border-border/50"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
          >
            <SheetTitle className="text-base font-bold flex-shrink-0">Уведомления</SheetTitle>
            <div className="flex items-center gap-1 flex-shrink-0">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 px-2 text-xs">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Прочитать</span>
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteAllDialogOpen(true)}
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Очистить</span>
                </Button>
              )}
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </SheetClose>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2">
              <TabsList className="h-8 w-full grid grid-cols-4">
                <TabsTrigger value="all" className="text-[11px] px-1">
                  Все
                  {notifications.length > 0 && (
                    <span className="ml-0.5 text-muted-foreground">({notifications.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-[11px] px-1">
                  Новые
                  {unreadCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none px-1 tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="transfers" className="text-[11px] px-1">Переводы</TabsTrigger>
                <TabsTrigger value="system" className="text-[11px] px-1">Система</TabsTrigger>
              </TabsList>
            </div>

            {(['all', 'unread', 'transfers', 'system'] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="flex-1 mt-0 min-h-0">
                <ScrollArea className="h-full max-h-[calc(100vh-140px)]">
                  {renderList(filtered[tab])}
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить все уведомления?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие удалит все уведомления без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить все
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
