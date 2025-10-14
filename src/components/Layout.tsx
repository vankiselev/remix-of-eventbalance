import { useState, useEffect } from "react";
import { useFinancesActions } from "@/contexts/FinancesActionsContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu, DollarSign, Calendar, CalendarDays, Users, BarChart3, PlusCircle, ChevronLeft, ChevronRight, Cake, Plane, FileText, Settings, Download, Upload, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import MobileBottomNav from "@/components/MobileBottomNav";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { onExport, onImport, onDeleteAll } = useFinancesActions();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .rpc("get_user_basic_profile")
          .single();
        setUserRole(data?.role || 'employee');
      }
    };
    fetchUserRole();
  }, [user]);

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
    { path: "/finances", label: t('finances'), icon: DollarSign },
    { path: "/staff", label: t('staff'), icon: Users },
    { path: "/birthdays", label: "Дни рождения", icon: Cake },
    { path: "/vacations", label: "График отпусков", icon: Plane },
    { path: "/contacts", label: t('contacts'), icon: Users },
    { path: "/reports", label: "Отчеты", icon: FileText },
    ...(userRole === 'admin' ? [{ path: "/invitations", label: t('invitations'), icon: Users }] : []),
  ];

  const getPageTitle = () => {
    const item = menuItems.find(item => item.path === location.pathname);
    return item ? item.label : "EventBalance";
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen-safe bg-background flex flex-col w-full">
      {!isMobile ? (
        <>
          {/* Desktop Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
            <div className="flex h-16 items-center justify-between px-6">
              {/* Logo and Menu */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">EventBalance</h1>
                
                {location.pathname === '/finances' && userRole === 'admin' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-auto px-3 py-1.5 font-normal text-sm hover:bg-accent/50 border-0 ml-4"
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
              </div>

              {/* User Profile & Actions */}
              <div className="flex items-center gap-3">
                <NotificationsMenu />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="gap-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                      {user?.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {userRole === 'admin' ? 'Администратор' : 'Сотрудник'}
                    </span>
                  </div>
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

          {/* Main Layout with Sidebar */}
          <div className="flex flex-1 w-full overflow-hidden">
            {/* Collapsible Sidebar */}
            <aside
              className={`border-r bg-card transition-all duration-300 ${
                sidebarCollapsed ? "w-16" : "w-64"
              }`}
            >
              <div className="flex h-full flex-col">
                {/* Sidebar Header with Toggle */}
                <div className="flex items-center justify-between p-3 border-b">
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium text-muted-foreground">Меню</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="h-8 w-8 ml-auto"
                  >
                    {sidebarCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>

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

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="main-container">
                {children}
              </div>
            </main>
          </div>

          {/* Footer */}
          <footer className="border-t bg-card">
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
        </>
      ) : (
        /* Mobile Layout */
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-auto px-4 py-6 pb-28">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      )}
    </div>
  );
};

export default Layout;