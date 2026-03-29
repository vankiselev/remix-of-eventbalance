import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home, DollarSign, Plus, CalendarDays, Calendar, ListChecks,
  Package, Users, Cake, Plane, Briefcase, FileText, ClipboardCheck,
  Shield, MoreHorizontal, Settings
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { usePendingTasksCount } from "@/hooks/usePendingTasksCount";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Active tab indicator style:
 *  "pill"   — rounded-xl pill highlight (default)
 *  "circle" — circular outline around the icon
 */
type ActiveTabStyle = "pill" | "circle";
// Use `as ActiveTabStyle` so TS doesn't narrow to a literal and block comparisons
const ACTIVE_TAB_STYLE = "pill" as ActiveTabStyle;

const activeIndicatorClass = (active: boolean): string => {
  if (!active) return "border border-transparent";
  if (ACTIVE_TAB_STYLE === "circle") {
    return "bg-primary/10 border border-primary/25 rounded-full px-2";
  }
  return "bg-primary/10 border border-primary/25";
};

const indicatorBaseClass =
  ACTIVE_TAB_STYLE === "circle"
    ? "flex items-center justify-center rounded-full px-2 py-1 transition-all duration-200"
    : "flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-200";

interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface MobileNavEnhancedProps {
  onOpenCommandPalette: () => void;
}

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
    { path: "/settings", label: "Настройки", shortLabel: "Настройки", icon: Settings },
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
      {/* Fixed bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[60] bg-card/95 backdrop-blur-md border-t border-border/30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around max-w-screen-sm mx-auto">
          {/* Main nav items */}
          {mainNavItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] pt-1.5 pb-1 touch-manipulation transition-all duration-200",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                {/* Pill background for active state */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-200",
                    active
                      ? "bg-primary/10 border border-primary/25"
                      : "border border-transparent"
                    /* Alt: circle style → active ? "bg-primary/10 border border-primary/25 rounded-full px-2" */
                  )}
                >
                  <IconComponent
                    className="h-[20px] w-[20px]"
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    active ? "font-semibold" : "font-medium"
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
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] pt-1.5 pb-1 touch-manipulation transition-all duration-200",
                  isMoreMenuOpen ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-200",
                    isMoreMenuOpen
                      ? "bg-primary/10 border border-primary/25"
                      : "border border-transparent"
                  )}
                >
                  <MoreHorizontal className="h-[20px] w-[20px]" strokeWidth={1.8} />
                </div>
                <span className={cn("text-[10px] leading-tight", isMoreMenuOpen ? "font-semibold" : "font-medium")}>Ещё</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              hideCloseButton
              className="rounded-t-2xl border-t-0 px-4 pt-2 pb-4 mx-0"
              style={{ marginBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-border/50 rounded-full mx-auto mb-4" />

              {/* Icon Grid */}
              <div className="grid grid-cols-4 gap-y-5 gap-x-2">
                {moreMenuItems.map((item) => {
                  const IconComponent = item.icon;
                  const active = isActive(item.path);
                  const badgeCount = getBadgeCount(item.path);

                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className="flex flex-col items-center gap-1.5 outline-none touch-manipulation active:scale-95 transition-transform"
                    >
                      <div className="relative">
                        <div
                          className={cn(
                            "flex items-center justify-center h-12 w-12 rounded-2xl transition-colors",
                            active
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              : "bg-accent/60 text-foreground"
                          )}
                        >
                          <IconComponent className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                        </div>
                        {badgeCount > 0 && (
                          <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1 tabular-nums">
                            {badgeCount}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[11px] text-center leading-tight",
                          active ? "font-semibold text-primary" : "font-medium text-muted-foreground"
                        )}
                      >
                        {item.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer to prevent content from hiding under nav */}
      <div
        className="flex-shrink-0"
        style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      />
    </>
  );
};

export default MobileNavEnhanced;
