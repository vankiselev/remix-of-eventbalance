import { useState, useEffect } from "react";
import { useFinancesActions } from "@/contexts/FinancesActionsContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu, RussianRuble, Calendar, CalendarDays, UsersRound, BarChart3, PlusCircle, Cake, Plane, FileText, Settings, Download, Upload, Trash2, Contact, UserPlus, ClipboardCheck, FileSpreadsheet, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import MobileBottomNav from "@/components/MobileBottomNav";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EventsImportDialog from "@/components/EventsImportDialog";
import { useChatUnread } from "@/hooks/useChatUnread";
import { cn } from "@/lib/utils";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { RoleBadges } from "@/components/roles/RoleBadge";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut, user, userRole, userProfile } = useAuth();
  const { roles: userRoles, isAdmin: isAdminRbac } = useUserRbacRoles();
  const { isFinancier } = useFinancierPermissions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showEventsImportDialog, setShowEventsImportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { totalUnread } = useChatUnread();
  const { pendingCount } = usePendingTransactionsCount();
  
  const sidebarCollapsed = !sidebarHovered;
  const { onExport, onImport, onDeleteAll } = useFinancesActions();

  const displayName = userProfile?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь';
  const avatarUrl = userProfile?.avatar_url || (user as any)?.user_metadata?.avatar_url || null;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: t('signOut'),
        description: "До встречи!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: "Не удалось выйти из системы",
      });
    }
  };

  const handleEventsExport = async () => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Подготовка данных для экспорта
      const exportData = events?.map(event => ({
        'Дата': event.start_date,
        'Название': event.name,
        'Описание': event.description || '',
        'Время': event.event_time ? `${event.event_time}${event.end_time ? ' - ' + event.end_time : ''}` : '',
        'Место': event.location || '',
        'Статус': event.status,
        'Проект-оуна': event.project_owner || '',
      })) || [];

      // Конвертируем в CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      // Скачиваем файл
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `events_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Экспорт завершен",
        description: `Экспортировано ${events?.length || 0} мероприятий`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать мероприятия",
      });
    }
  };

  const handleDeleteAllEvents = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast({
        title: "Мероприятия удалены",
        description: "Все мероприятия успешно удалены",
      });
      
      setShowDeleteConfirm(false);
      window.location.reload();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка удаления",
        description: "Не удалось удалить мероприятия",
      });
    }
  };

  const menuItems = [
    { path: "/dashboard", label: t('dashboard'), icon: BarChart3 },
    { path: "/messages", label: "Сообщения", icon: MessageSquare, ...(totalUnread > 0 && { badge: totalUnread }) },
    { path: "/events", label: t('events'), icon: CalendarDays },
    { path: "/calendar", label: t('calendar'), icon: Calendar },
    { path: "/transaction", label: t('transaction'), icon: PlusCircle },
    { path: "/finances", label: t('finances'), icon: RussianRuble, ...(isFinancier && pendingCount > 0 && { badge: pendingCount }) },
    { path: "/staff", label: t('staff'), icon: UsersRound },
    { path: "/birthdays", label: "Дни рождения", icon: Cake },
    { path: "/vacations", label: "График отпусков", icon: Plane },
    { path: "/contacts", label: t('contacts'), icon: Contact },
    ...(!isFinancier || isAdminRbac ? [{ path: "/reports", label: "Отчеты", icon: FileText }] : []),
    ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка транзакций", icon: ClipboardCheck, ...(pendingCount > 0 && { badge: pendingCount }) }] : []),
    ...(isAdminRbac ? [{ path: "/administration", label: "Администрирование", icon: Settings }] : []),
  ];

  const getPageTitle = () => {
    const item = menuItems.find(item => item.path === location.pathname);
    return item ? item.label : "EventBalance";
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex flex-col w-full overflow-x-hidden">
      {!isMobile ? (
        <>
          {/* Desktop Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
            <div className="flex h-16 items-center px-6">
              {/* Logo - fixed width matching sidebar with safe zone */}
              <div className={`flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'min-w-[180px]' : 'w-64'}`}>
                <h1 className="text-xl font-bold text-foreground">EventBalance</h1>
              </div>
              
              {/* Menu items */}
              <div className="flex items-center gap-2 flex-1">
                {location.pathname === '/finances' && isAdminRbac && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        onMouseEnter={(e) => {
                          const button = e.currentTarget.querySelector('button');
                          button?.click();
                        }}
                      >
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-auto px-3 py-1.5 font-normal text-sm hover:bg-accent/50 border-0"
                        >
                          Редактирование
                        </Button>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="w-56 bg-background z-50"
                      onMouseLeave={(e) => {
                        const trigger = e.currentTarget.previousElementSibling;
                        if (trigger && !trigger.contains(e.relatedTarget as Node)) {
                          // Close dropdown
                        }
                      }}
                    >
                      <DropdownMenuItem onClick={onExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onImport}>
                        <Upload className="mr-2 h-4 w-4" />
                        Импорт
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={onDeleteAll}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить все транзакции
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {(location.pathname === '/calendar' || location.pathname === '/events') && isAdminRbac && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        onMouseEnter={(e) => {
                          const button = e.currentTarget.querySelector('button');
                          button?.click();
                        }}
                      >
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-auto px-3 py-1.5 font-normal text-sm hover:bg-accent/50 border-0"
                        >
                          Редактирование
                        </Button>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="w-56 bg-background z-50"
                      onMouseLeave={(e) => {
                        const trigger = e.currentTarget.previousElementSibling;
                        if (trigger && !trigger.contains(e.relatedTarget as Node)) {
                          // Close dropdown
                        }
                      }}
                    >
                      <DropdownMenuItem onClick={handleEventsExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowEventsImportDialog(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Импорт мероприятий
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить все мероприятия
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* User Profile & Actions */}
              <div className="flex items-center gap-3">
                <NotificationsMenu />
                {userProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/profile')}
                    className="gap-2"
                  >
                    <Avatar className="h-8 w-8">
                      {avatarUrl && (
                        <AvatarImage src={avatarUrl} alt={displayName} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                        {displayName}
                      </span>
                      <div className="text-[10px]">
                        <RoleBadges roles={userRoles} maxDisplay={1} />
                      </div>
                    </div>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  title="Выйти"
                  className="h-9 w-9"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Layout with Sidebar */}
          <div className="flex flex-1 w-full min-h-0 overflow-x-hidden">
            {/* Collapsible Sidebar - Fixed */}
            <aside
              className={`fixed top-16 left-0 bottom-0 border-r bg-card transition-all duration-300 overflow-y-auto z-40 ${
                sidebarCollapsed ? "w-16" : "w-64"
              }`}
              onMouseEnter={() => setSidebarHovered(true)}
              onMouseLeave={() => setSidebarHovered(false)}
            >
              <div className="flex h-full flex-col">
                {/* Sidebar Navigation */}
                <nav className="flex-1 p-3 overflow-y-auto">
                  <ul className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <li key={item.path}>
                          <Button
                            variant={active ? "secondary" : "ghost"}
                            className={`w-full transition-all duration-200 relative ${
                              sidebarCollapsed
                                ? "justify-center px-2"
                                : "justify-start px-3"
                            } ${
                              active
                                ? "bg-primary/10 text-primary font-medium shadow-sm"
                                : "hover:bg-accent/50"
                            }`}
                            onClick={() => navigate(item.path)}
                            title={sidebarCollapsed ? item.label : undefined}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {!sidebarCollapsed && (
                              <span className="ml-3 truncate flex-1 text-left">{item.label}</span>
                            )}
                             {!sidebarCollapsed && 'badge' in item && item.badge && item.badge > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {item.badge > 9 ? '9+' : item.badge}
                              </Badge>
                            )}
                            {sidebarCollapsed && 'badge' in item && item.badge && item.badge > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
                              >
                                {item.badge > 9 ? '9+' : item.badge}
                              </Badge>
                            )}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </aside>

            {/* Main Content with margin to account for fixed sidebar */}
            <main 
              className={cn(
                "flex-1 flex flex-col transition-all duration-300 overflow-hidden",
                sidebarCollapsed ? "ml-16" : "ml-64"
              )}
              style={{ 
                height: location.pathname === '/messages' ? 'calc(100vh - 4rem)' : 'auto',
                maxHeight: location.pathname === '/messages' ? 'calc(100vh - 4rem)' : 'none'
              }}
            >
              <div className={cn(
                "flex-1 main-container w-full flex flex-col",
                location.pathname === '/messages' ? 'h-full overflow-hidden' : 'overflow-hidden min-h-0'
              )}>
                {children}
              </div>
              
              {/* Footer - hidden on messages page */}
              {location.pathname !== '/messages' && (
                <footer className="border-t bg-card mt-auto">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <p>© 2025 EventBalance. Все права защищены.</p>
                      <div className="flex items-center gap-4">
                        <a href="#" className="hover:text-foreground transition-colors">О компании</a>
                        <a href="#" className="hover:text-foreground transition-colors">Поддержка</a>
                        <a href="#" className="hover:text-foreground transition-colors">Контакты</a>
                      </div>
                    </div>
                  </div>
                </footer>
              )}
            </main>
          </div>
        </>
      ) : (
        /* Mobile Layout */
        <div className="flex-1 flex flex-col overflow-x-hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
            <div className="flex h-14 items-center px-4 justify-between">
              {/* Page Title */}
              <h1 className="text-lg font-semibold text-foreground">
                {getPageTitle()}
              </h1>
              
              {/* Right Actions: Notifications & Profile */}
              <div className="flex items-center gap-2">
                <NotificationsMenu />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="h-9 w-9 p-0 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    {avatarUrl && (
                      <AvatarImage src={avatarUrl} alt={displayName} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </div>
            </div>
          </header>

          <main className={cn(
            "flex-1 w-full overflow-x-hidden",
            location.pathname === '/messages' 
              ? "overflow-hidden flex flex-col min-h-0" 
              : "overflow-auto px-4 py-6 pb-28"
          )}>
            {children}
          </main>
          <MobileBottomNav />
        </div>
      )}
      
      {/* Events Import Dialog */}
      <EventsImportDialog 
        open={showEventsImportDialog}
        onOpenChange={setShowEventsImportDialog}
        onImportComplete={() => {
          setShowEventsImportDialog(false);
          toast({
            title: "Импорт завершен",
            description: "Мероприятия успешно импортированы",
          });
          // Перезагрузка страницы для обновления данных
          window.location.reload();
        }}
      />

      {/* Delete All Events Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить все мероприятия?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все мероприятия будут безвозвратно удалены из базы данных.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllEvents}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить все
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Layout;