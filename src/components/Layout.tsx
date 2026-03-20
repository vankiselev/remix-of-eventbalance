import { useState, useEffect, useMemo } from "react";
import { useFinancesActions } from "@/contexts/FinancesActionsContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Download, Upload, Trash2, FileSpreadsheet, Settings } from "lucide-react";
import logoFull from "@/assets/logo-full.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import MobileNavEnhanced from "@/components/navigation/MobileNavEnhanced";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EventsImportDialog from "@/components/EventsImportDialog";

import { RoleBadges } from "@/components/roles/RoleBadge";
import { formatFullName, getInitials } from "@/utils/formatName";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { TopNavigation } from "@/components/navigation/TopNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut, user, userProfile, rbacRoles, isAdmin: isAdminRbac } = useAuth();
  const { isFinancier } = useFinancierPermissions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [showEventsImportDialog, setShowEventsImportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Enable real-time updates globally
  useRealtimeUpdates();
  
  const { onExport, onImport, onDeleteAll } = useFinancesActions();

  const displayName = userProfile ? formatFullName(userProfile) : user?.email?.split('@')[0] || 'Пользователь';
  const avatarUrl = userProfile?.avatar_url || (user as any)?.user_metadata?.avatar_url || null;
  const initials = userProfile ? getInitials(userProfile) : displayName.charAt(0).toUpperCase();

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

  const getPageTitle = () => {
    const pageTitles: Record<string, string> = {
      '/dashboard': 'Главная',
      '/events': 'Мероприятия',
      '/calendar': 'Календарь',
      '/transaction': 'Новая транзакция',
      '/finances': 'Финансы',
      '/warehouse': 'Склад',
      '/tasks': 'Мои задачи',
      '/staff': 'Сотрудники',
      '/birthdays': 'Дни рождения',
      '/vacations': 'Отпуска',
      '/contacts': 'Контакты',
      '/reports': 'Отчёты',
      '/settings': 'Настройки',
      '/administration': 'Администрирование',
      '/profile': 'Профиль',
      '/transactions-review': 'Проверка транзакций',
    };
    return pageTitles[location.pathname] || 'EventBalance';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {!isMobile ? (
        <>
          {/* Desktop Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
            <div className="flex h-16 items-center px-6 gap-4">
              {/* Logo */}
              <img 
                src={logoFull} 
                alt="EventBalance" 
                className="h-8 flex-shrink-0 cursor-pointer" 
                onClick={() => navigate('/dashboard')}
              />
              
              {/* Top Navigation */}
              <TopNavigation isAdmin={isAdminRbac} />
              
              {/* Context menus for specific pages */}
              <div className="flex items-center gap-2">
                {location.pathname === '/finances' && isAdminRbac && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-auto px-3 py-1.5 font-normal text-sm hover:bg-accent/50 border-0"
                      >
                        Редактирование
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-background z-50">
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-auto px-3 py-1.5 font-normal text-sm hover:bg-accent/50 border-0"
                      >
                        Редактирование
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-background z-50">
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

              {/* Spacer */}
              <div className="flex-1" />

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
                        <RoleBadges roles={rbacRoles} maxDisplay={1} />
                      </div>
                    </div>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/settings')}
                  title="Настройки"
                  className="h-9 w-9"
                >
                  <Settings className="h-4 w-4" />
                </Button>
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

          {/* Main Content - Full Width */}
          <main className="flex-1 flex flex-col w-full min-h-0">
            <div className="flex-1 w-full flex flex-col min-h-0 main-container">
              {children}
            </div>
            
            {/* Footer */}
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
          </main>
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

          <main className="flex-1 w-full overflow-x-hidden overflow-auto px-4 py-6 pb-28">
            {children}
          </main>
          
          <MobileNavEnhanced onOpenCommandPalette={() => {}} />
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
