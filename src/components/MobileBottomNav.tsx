import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import * as LucideIcons from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { usePendingTasksCount } from "@/hooks/usePendingTasksCount";

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const MobileBottomNav = () => {
  const { isAdmin } = useUserRbacRoles();
  const { isFinancier } = useFinancierPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { pendingCount } = usePendingTransactionsCount();
  const { pendingTasksCount } = usePendingTasksCount();
  const mainNavItems: NavItem[] = [
    { path: "/dashboard", label: "Главная", icon: "Home" },
    { path: "/finances", label: "Финансы", icon: "DollarSign" },
    { path: "/transaction", label: "Траты/Приход", icon: "Plus" },
    { path: "/events", label: "Мероприятия", icon: "CalendarDays" },
  ];

  const moreMenuItems = [
    { path: "/calendar", label: "Календарь", shortLabel: "Календарь", icon: "Calendar" },
    { path: "/tasks", label: "Мои задачи", shortLabel: "Задачи", icon: "ListChecks" },
    { path: "/warehouse", label: "Склад", shortLabel: "Склад", icon: "Package" },
    { path: "/staff", label: "Сотрудники", shortLabel: "Сотрудн.", icon: "Users" },
    { path: "/birthdays", label: "Дни рождения", shortLabel: "Дни рожд.", icon: "Cake" },
    { path: "/vacations", label: "График отпусков", shortLabel: "Отпуска", icon: "Plane" },
    { path: "/contacts", label: "Контакты", shortLabel: "Контакты", icon: "Briefcase" },
    ...(!isFinancier || isAdmin ? [{ path: "/reports", label: "Отчеты", shortLabel: "Отчёты", icon: "FileText" }] : []),
    ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка транзакций", shortLabel: "Проверка", icon: "ClipboardCheck" }] : []),
    { path: "/settings", label: "Настройки", shortLabel: "Настройки", icon: "Settings" },
    ...(isAdmin ? [{ path: "/administration", label: "Администрирование", shortLabel: "Админ", icon: "Shield" }] : []),
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
              <SheetContent side="bottom" className="rounded-t-2xl border-t border-border/20 px-4 pb-8 pt-6">
                <div className="grid grid-cols-4 gap-3">
                  {moreMenuItems.map((item) => {
                    const IconComponent = getIconComponent(item.icon);
                    const showBadge = (item.path === '/transactions-review' && pendingCount > 0) ||
                                      (item.path === '/tasks' && pendingTasksCount > 0);
                    const badgeCount = item.path === '/tasks' ? pendingTasksCount : pendingCount;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div className="relative">
                          <div
                            className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-200 active:scale-95 ${
                              isActive(item.path) 
                                ? "border-2 border-primary text-primary bg-primary/5" 
                                : "border-2 border-border/30 text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                            }`}
                          >
                            <IconComponent className="h-5 w-5" strokeWidth={2} />
                          </div>
                          {showBadge && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] rounded-full"
                            >
                              {badgeCount}
                            </Badge>
                          )}
                        </div>
                        <span className={`text-[11px] font-medium text-center leading-tight ${
                          isActive(item.path) ? "text-primary" : "text-muted-foreground"
                        }`}>{item.shortLabel}</span>
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
