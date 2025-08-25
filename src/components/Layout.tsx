import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu, X, DollarSign, Calendar, CalendarDays, Users, BarChart3, PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from "@/hooks/use-mobile";
import MobileBottomNav from "@/components/MobileBottomNav";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout = ({ children, activeTab, onTabChange }: LayoutProps) => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
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
    { id: "dashboard", label: t('dashboard'), icon: BarChart3 },
    { id: "events", label: t('events'), icon: Calendar },
    { id: "calendar", label: t('calendar'), icon: CalendarDays },
    { id: "transaction", label: t('transaction'), icon: PlusCircle },
    { id: "finances", label: t('finances'), icon: DollarSign },
    { id: "staff", label: t('staff'), icon: Users },
    { id: "contacts", label: t('contacts'), icon: Users },
    ...(userRole === 'admin' ? [{ id: "invitations", label: t('invitations'), icon: Users }] : []),
  ];

  const getPageTitle = (activeTab: string) => {
    const item = menuItems.find(item => item.id === activeTab);
    return item ? item.label : "EventBalance";
  };

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
            className={`fixed inset-y-0 left-0 z-50 bg-card border-r transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
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
                    return (
                      <li key={item.id}>
                        <Button
                          variant={activeTab === item.id ? "secondary" : "ghost"}
                          className={`w-full transition-all duration-200 ${
                            sidebarCollapsed 
                              ? "justify-center px-2" 
                              : "justify-start px-3"
                          } ${
                            activeTab === item.id 
                              ? "bg-primary/10 text-primary font-medium shadow-sm" 
                              : "hover:bg-accent/50"
                          }`}
                          onClick={() => {
                            onTabChange(item.id);
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
                <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
                  {!sidebarCollapsed && (
                    <div className="text-sm min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{user?.email}</p>
                      <p className="text-muted-foreground text-xs">
                        {userRole === 'admin' ? 'Администратор' : 'Сотрудник'}
                      </p>
                    </div>
                  )}
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
                {getPageTitle(activeTab)}
              </h1>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className={`flex-1 main-container overflow-auto ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>

        {/* Mobile bottom navigation */}
        {isMobile && (
          <MobileBottomNav activeTab={activeTab} onTabChange={onTabChange} />
        )}
      </div>
    </div>
  );
};

export default Layout;