import { useState, useEffect } from "react";
import { useFinancesActions } from "@/contexts/FinancesActionsContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu, RussianRuble, Calendar, CalendarDays, UsersRound, BarChart3, PlusCircle, Cake, Plane, FileText, Settings, Download, Upload, Trash2, Contact, UserPlus, ClipboardCheck, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import MobileBottomNav from "@/components/MobileBottomNav";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import EventsImportDialog from "@/components/EventsImportDialog";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut, user, userRole, userProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showEventsImportDialog, setShowEventsImportDialog] = useState(false);
  const { isFinancier } = useFinancierPermissions();
  
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

  const menuItems = [
    { path: "/dashboard", label: t('dashboard'), icon: BarChart3 },
    { path: "/events", label: t('events'), icon: CalendarDays },
    { path: "/calendar", label: t('calendar'), icon: Calendar },
    { path: "/transaction", label: t('transaction'), icon: PlusCircle },
    { path: "/finances", label: t('finances'), icon: RussianRuble },
    ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка транзакций", icon: ClipboardCheck }] : []),
    { path: "/staff", label: t('staff'), icon: UsersRound },
    { path: "/birthdays", label: "Дни рождения", icon: Cake },
    { path: "/vacations", label: "График отпусков", icon: Plane },
    { path: "/contacts", label: t('contacts'), icon: Contact },
    { path: "/reports", label: "Отчеты", icon: FileText },
    ...(userRole === 'admin' ? [{ path: "/administration", label: "Администрирование", icon: Settings }] : []),
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
                {location.pathname === '/finances' && userRole === 'admin' && (
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
                
                {(location.pathname === '/calendar' || location.pathname === '/events') && userRole === 'admin' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-auto px-3 py-1.5 font-normal text-sm hover:bg-accent/50 border-0 flex items-center gap-2"
                    onClick={() => setShowEventsImportDialog(true)}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Импорт мероприятий
                  </Button>
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
                      <span className="text-[10px] text-muted-foreground">
                        {userRole === 'admin' ? 'Администратор' : 'Сотрудник'}
                      </span>
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
                            className={`w-full transition-all duration-200 ${
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
                              <span className="ml-3 truncate">{item.label}</span>
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
              className={`flex-1 flex flex-col transition-all duration-300 overflow-x-hidden ${
                sidebarCollapsed ? "ml-16" : "ml-64"
              }`}
            >
              <div className="flex-1 main-container w-full">
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
          </div>
        </>
      ) : (
        /* Mobile Layout */
        <div className="flex-1 flex flex-col overflow-x-hidden">
          <main className="flex-1 overflow-auto px-4 py-6 pb-28 w-full overflow-x-hidden">
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
    </div>
  );
};

export default Layout;