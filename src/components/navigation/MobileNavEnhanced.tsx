import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import * as LucideIcons from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { usePendingTasksCount } from "@/hooks/usePendingTasksCount";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, ChevronRight, Zap } from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    work: true,
    finance: true,
  });
  const { pendingCount } = usePendingTransactionsCount();
  const { pendingTasksCount } = usePendingTasksCount();

  const mainNavItems: NavItem[] = [
    { path: "/dashboard", label: "Главная", icon: "Home" },
    { path: "/finances", label: "Финансы", icon: "DollarSign" },
    { path: "/transaction", label: "Траты", icon: "Plus" },
    { path: "/events", label: "События", icon: "CalendarDays" },
  ];

  const navGroups: NavGroup[] = [
    {
      id: "work",
      label: "Работа",
      icon: "Briefcase",
      items: [
        { path: "/calendar", label: "Календарь", icon: "Calendar" },
        { path: "/tasks", label: "Мои задачи", icon: "ListChecks", badge: pendingTasksCount > 0 ? pendingTasksCount : undefined },
        { path: "/staff", label: "Сотрудники", icon: "Users" },
        { path: "/birthdays", label: "Дни рождения", icon: "Cake" },
        { path: "/vacations", label: "Отпуска", icon: "Plane" },
        { path: "/contacts", label: "Контакты", icon: "Briefcase" },
      ],
    },
    {
      id: "finance",
      label: "Финансы",
      icon: "Wallet",
      items: [
        ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка", icon: "ClipboardCheck", badge: pendingCount > 0 ? pendingCount : undefined }] : []),
        ...(!isFinancier || isAdmin ? [{ path: "/reports", label: "Отчеты", icon: "FileText" }] : []),
      ],
    },
    {
      id: "warehouse",
      label: "Склад",
      icon: "Package",
      items: [
        { path: "/warehouse", label: "Склад", icon: "Package" },
      ],
    },
    {
      id: "settings",
      label: "Настройки",
      icon: "Settings",
      items: [
        { path: "/settings", label: "Настройки", icon: "Settings" },
        ...(isAdmin ? [{ path: "/administration", label: "Администрирование", icon: "Shield" }] : []),
      ],
    },
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const getGroupBadge = (group: NavGroup) => {
    return group.items.reduce((sum, item) => sum + (item.badge || 0), 0);
  };

  return (
    <>
      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border/20 backdrop-blur-lg safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-3 max-w-screen-sm mx-auto">
          {/* Main nav items */}
          {mainNavItems.map((item) => {
            const IconComponent = getIconComponent(item.icon);
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[60px] py-1 rounded-xl transition-all duration-300",
                  active && "scale-110"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <IconComponent className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Menu */}
          <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1 min-w-[60px] py-1">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl text-foreground hover:bg-accent transition-all duration-300">
                  <LucideIcons.MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Ещё</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl border-t-0 max-h-[85vh] overflow-hidden">
              <div className="w-12 h-1.5 bg-border/60 rounded-full mx-auto mb-4" />
              
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">Меню</SheetTitle>
              </SheetHeader>

              {/* Search button */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 mb-4 h-12"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenCommandPalette();
                }}
              >
                <Search className="h-4 w-4" />
                <span>Поиск...</span>
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              {/* Quick Actions */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  className="flex-1 h-12 gap-2"
                  onClick={() => handleNavigation("/transaction")}
                >
                  <Zap className="h-4 w-4 text-warning" />
                  <span>Новая транзакция</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 gap-2"
                  onClick={() => handleNavigation("/tasks?create=true")}
                >
                  <Zap className="h-4 w-4 text-warning" />
                  <span>Новая задача</span>
                </Button>
              </div>

              {/* Navigation Groups */}
              <div className="overflow-y-auto max-h-[50vh] pb-6 space-y-2">
                {navGroups.map((group) => {
                  if (group.items.length === 0) return null;
                  
                  const GroupIcon = getIconComponent(group.icon);
                  const isExpanded = expandedGroups[group.id] ?? false;
                  const groupBadge = getGroupBadge(group);

                  return (
                    <Collapsible
                      key={group.id}
                      open={isExpanded}
                      onOpenChange={() => toggleGroup(group.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between px-3 py-3 h-auto font-medium"
                        >
                          <div className="flex items-center gap-3">
                            <GroupIcon className="h-5 w-5" />
                            <span>{group.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {groupBadge > 0 && (
                              <Badge variant="destructive" className="text-[10px] animate-pulse">
                                {groupBadge}
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-accordion-down">
                        <div className="ml-4 border-l border-border/50 pl-3 space-y-1">
                          {group.items.map((item) => {
                            const IconComponent = getIconComponent(item.icon);
                            const active = isActive(item.path);
                            return (
                              <button
                                key={item.path}
                                onClick={() => handleNavigation(item.path)}
                                className={cn(
                                  "w-full flex items-center gap-3 h-11 px-3 rounded-lg transition-all duration-200",
                                  active
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-accent/50 text-foreground"
                                )}
                              >
                                <IconComponent className="h-4 w-4" />
                                <span>{item.label}</span>
                                {item.badge && item.badge > 0 && (
                                  <Badge variant="destructive" className="ml-auto text-[10px]">
                                    {item.badge}
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
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

export default MobileNavEnhanced;
