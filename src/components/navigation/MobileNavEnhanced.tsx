import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home, DollarSign, Plus, CalendarDays, Calendar, ListChecks,
  Package, Users, Cake, Plane, Briefcase, FileText, ClipboardCheck,
  Shield, MoreHorizontal, Circle
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { usePendingTasksCount } from "@/hooks/usePendingTasksCount";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface MobileNavEnhancedProps {
  onOpenCommandPalette: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  Home, DollarSign, Plus, CalendarDays, Calendar, ListChecks,
  Package, Users, Cake, Plane, Briefcase, FileText, ClipboardCheck,
  Shield, MoreHorizontal,
};

const MobileNavEnhanced = ({ onOpenCommandPalette }: MobileNavEnhancedProps) => {
  const { isAdmin } = useUserRbacRoles();
  const { isFinancier } = useFinancierPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { pendingCount } = usePendingTransactionsCount();
  const { pendingTasksCount } = usePendingTasksCount();

  const mainNavItems: NavItem[] = [
    { path: "/dashboard", label: "Главная", shortLabel: "Главная", icon: Home },
    { path: "/finances", label: "Финансы", shortLabel: "Финансы", icon: DollarSign },
    { path: "/transaction", label: "Траты", shortLabel: "Траты", icon: Plus },
    { path: "/events", label: "События", shortLabel: "События", icon: CalendarDays },
  ];

  const moreMenuItems: NavItem[] = [
    { path: "/calendar", label: "Календарь", shortLabel: "Календарь", icon: Calendar },
    { path: "/tasks", label: "Мои задачи", shortLabel: "Задачи", icon: ListChecks },
    { path: "/warehouse", label: "Склад", shortLabel: "Склад", icon: Package },
    { path: "/staff", label: "Сотрудники", shortLabel: "Сотрудн.", icon: Users },
    { path: "/birthdays", label: "Дни рождения", shortLabel: "Дни рожд.", icon: Cake },
    { path: "/vacations", label: "График отпусков", shortLabel: "Отпуска", icon: Plane },
    { path: "/contacts", label: "Контакты", shortLabel: "Контакты", icon: Briefcase },
    ...(!isFinancier || isAdmin ? [{ path: "/reports", label: "Отчеты", shortLabel: "Отчёты", icon: FileText }] : []),
    ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка транзакций", shortLabel: "Проверка", icon: ClipboardCheck }] : []),
    ...(isAdmin ? [{ path: "/administration", label: "Администрирование", shortLabel: "Админ", icon: Shield }] : []),
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMoreMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const getBadgeCount = (path: string) => {
    if (path === '/tasks') return pendingTasksCount;
    if (path === '/transactions-review') return pendingCount;
    return 0;
  };

  return (
    <>
      {/* Fixed bottom navigation - z-[60] to stay above Sheet overlay */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border/20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-1 py-2 max-w-screen-sm mx-auto">
          {/* Main nav items */}
          {mainNavItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 min-w-[56px] py-1 rounded-xl transition-all duration-300",
                  active && "scale-105"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-300",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <IconComponent className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-200 leading-tight",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {/* More Menu */}
          <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 min-w-[56px] py-1">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl text-foreground hover:bg-accent transition-all duration-300">
                  <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground leading-tight">Ещё</span>
              </button>
            </SheetTrigger>
            <SheetContent 
              side="bottom" 
              hideCloseButton
              className="rounded-t-3xl border-t-0 px-4 pb-4 pt-2 mb-[calc(88px+env(safe-area-inset-bottom))] mx-2 rounded-b-2xl"
            >
              <div className="w-12 h-1.5 bg-border/60 rounded-full mx-auto mb-4" />
              
              {/* Icon Grid */}
              <div className="grid grid-cols-4 gap-4">
                {moreMenuItems.map((item) => {
                  const IconComponent = item.icon;
                  const active = isActive(item.path);
                  const badgeCount = getBadgeCount(item.path);
                  
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className="flex flex-col items-center gap-1.5 outline-none focus:outline-none focus-visible:ring-0"
                    >
                      <div className="relative">
                        <div
                          className={cn(
                            "flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-200 active:scale-95",
                            active
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                              : "bg-accent/50 text-foreground hover:bg-accent"
                          )}
                        >
                          <IconComponent className="h-5 w-5" strokeWidth={2} />
                        </div>
                        {badgeCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] rounded-full"
                          >
                            {badgeCount}
                          </Badge>
                        )}
                      </div>
                      <span className={cn(
                        "text-[11px] font-medium text-center leading-tight",
                        active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Bottom padding to prevent content overlap */}
      <div className="h-20 flex-shrink-0" />
    </>
  );
};

export default MobileNavEnhanced;
