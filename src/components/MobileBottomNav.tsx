import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import * as LucideIcons from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useChatUnread } from "@/hooks/useChatUnread";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";

interface NavItem {
  path: string;
  label: string;
  icon: string;
  enabled: boolean;
}

const MobileBottomNav = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRbacRoles();
  const { isFinancier } = useFinancierPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { totalUnread } = useChatUnread();
  const [mainNavItems, setMainNavItems] = useState<NavItem[]>([
    { path: "/dashboard", label: "Главная", icon: "BarChart3", enabled: true },
    { path: "/messages", label: "Сообщения", icon: "MessageSquare", enabled: true },
    { path: "/transaction", label: "Создать", icon: "Plus", enabled: true },
    { path: "/finances", label: "Финансы", icon: "DollarSign", enabled: true },
  ]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        // Load custom nav settings
        const { data: profileData } = await supabase
          .from('profiles')
          .select('mobile_nav_settings')
          .eq('id', user.id)
          .single();

        if (profileData?.mobile_nav_settings) {
          const customSettings = profileData.mobile_nav_settings as unknown as NavItem[];
          setMainNavItems(customSettings.filter(item => item.enabled));
        }
      }
    };
    fetchUserData();
  }, [user]);

  const moreMenuItems = [
    { path: "/profile", label: "Профиль", icon: "User" },
    { path: "/events", label: "Мероприятия", icon: "CalendarDays" },
    { path: "/calendar", label: "Календарь", icon: "Calendar" },
    { path: "/staff", label: "Сотрудники", icon: "Users" },
    { path: "/birthdays", label: "Дни рождения", icon: "Cake" },
    { path: "/vacations", label: "График отпусков", icon: "Plane" },
    { path: "/contacts", label: "Контакты", icon: "Briefcase" },
    { path: "/reports", label: "Отчеты", icon: "FileText" },
    ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка транзакций", icon: "ClipboardCheck" }] : []),
    ...(isAdmin ? [{ path: "/administration", label: "Администрирование", icon: "Settings" }] : []),
  ];

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMoreMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border/20 backdrop-blur-lg safe-area-inset-bottom">
        <div className="flex items-center justify-around px-4 py-4 max-w-screen-sm mx-auto">
          {/* Dynamic main nav items */}
          {mainNavItems.slice(0, 4).map((item) => {
            const IconComponent = getIconComponent(item.icon);
            const showBadge = item.path === '/messages' && totalUnread > 0;
            return (
              <div key={item.path} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-200 active:scale-95 ${
                      isActive(item.path) 
                        ? "border-2 border-primary text-primary bg-primary/5" 
                        : "border-2 border-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    <IconComponent className="h-5 w-5" strokeWidth={2} />
                  </button>
                  {showBadge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
                    >
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </Badge>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isActive(item.path) ? "text-primary" : "text-foreground"
                }`}>{item.label}</span>
              </div>
            );
          })}

          {/* More Menu - Always show */}
          <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
            <SheetTrigger asChild>
              <div className="flex flex-col items-center gap-1.5">
                <button className="flex items-center justify-center h-12 w-12 rounded-full border-2 border-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 active:scale-95">
                  {(() => {
                    const MoreIcon = getIconComponent("MoreHorizontal");
                    return <MoreIcon className="h-5 w-5" strokeWidth={2} />;
                  })()}
                </button>
                <span className="text-xs font-medium text-foreground">Ещё</span>
              </div>
            </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl border-t border-border/20">
                <SheetHeader className="pb-4">
                  <SheetTitle>Меню</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2 pb-6">
                  {moreMenuItems.map((item) => {
                    const IconComponent = getIconComponent(item.icon);
                    const showBadge = item.path === '/messages' && totalUnread > 0;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={`w-full flex items-center justify-start gap-3 h-12 px-4 rounded-lg transition-all duration-200 active:scale-98 relative ${
                          isActive(item.path) 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-accent/50 text-foreground"
                        }`}
                      >
                         <IconComponent className="h-5 w-5" strokeWidth={2} />
                         <span className="font-medium">{item.label}</span>
                         {showBadge && (
                           <Badge 
                             variant="destructive" 
                             className="ml-auto h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] rounded-full"
                           >
                             {totalUnread > 9 ? '9+' : totalUnread}
                           </Badge>
                         )}
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
        </div>
      </div>

      {/* Bottom padding to prevent content overlap */}
      <div className="h-24 flex-shrink-0" />
    </>
  );
};

export default MobileBottomNav;