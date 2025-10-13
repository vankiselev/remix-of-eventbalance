import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu, X, DollarSign, Calendar, CalendarDays, Users, BarChart3, PlusCircle, ChevronLeft, ChevronRight, Cake, Plane, FileText, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import MobileBottomNav from "@/components/MobileBottomNav";
import { NotificationsMenu } from "@/components/NotificationsMenu";

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
    <div className="min-h-screen-safe bg-background flex w-full">
      {/* Desktop sidebar - hidden on mobile */}
      {!isMobile && (
        <>
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-50 bg-card border-r transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0 ${
              sidebarCollapsed ? "w-16" : "w-64"
            } ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0`}
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex h-14 items-center justify-between px-4 border-b">
                {!sidebarCollapsed && (
                  <h1 className="text-lg font-semibold">EventBalance</h1>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:flex h-8 w-8"
                  >
                    {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-3">
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
                          onClick={() => {
                            navigate(item.path);
                            setSidebarOpen(false);
                          }}
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

              {/* User info and logout */}
              <div className="border-t p-3">
                <div className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center flex-col" : "justify-between"}`}>
                  {!sidebarCollapsed && (
                    <div className="text-sm min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{user?.email}</p>
                      <p className="text-muted-foreground text-xs">
                        {userRole === 'admin' ? 'Администратор' : 'Сотрудник'}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate('/profile')}
                      className="h-8 w-8 flex-shrink-0"
                      title="Настройки профиля"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleSignOut}
                      className="h-8 w-8 flex-shrink-0"
                      title="Выйти"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar - hidden on mobile */}
        {!isMobile && (
          <div className="flex h-14 items-center justify-between border-b bg-card px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden h-8 w-8"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">
                {getPageTitle()}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <NotificationsMenu />
            </div>
          </div>
        )}

        {/* Page content with mobile responsive container */}
        <main className={`flex-1 overflow-auto w-full ${isMobile ? 'px-4 py-6 pb-28' : 'main-container'}`}>
          {children}
        </main>

        {/* Mobile bottom navigation */}
        {isMobile && (
          <MobileBottomNav />
        )}
      </div>
    </div>
  );
};

export default Layout;