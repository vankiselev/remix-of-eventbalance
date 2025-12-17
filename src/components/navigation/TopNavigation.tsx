import { useLocation, useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  CalendarDays, 
  Calendar,
  ListChecks,
  UsersRound,
  Cake,
  Plane,
  Contact,
  RussianRuble,
  PlusCircle,
  ClipboardCheck,
  FileText,
  Package,
  Settings,
  UserPlus,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { usePendingTasksCount } from "@/hooks/usePendingTasksCount";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
  financierOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface TopNavigationProps {
  isAdmin: boolean;
}

export const TopNavigation = ({ isAdmin }: TopNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isFinancier } = useFinancierPermissions();
  const { pendingCount } = usePendingTransactionsCount();
  const { pendingTasksCount } = usePendingTasksCount();

  const navGroups: NavGroup[] = [
    {
      id: "main",
      label: "Главное",
      items: [
        { path: "/dashboard", label: "Главная", icon: BarChart3 },
        { path: "/settings", label: "Настройки", icon: Settings },
      ],
    },
    {
      id: "work",
      label: "Работа",
      items: [
        { path: "/events", label: "Мероприятия", icon: CalendarDays },
        { path: "/calendar", label: "Календарь", icon: Calendar },
        { path: "/tasks", label: "Мои задачи", icon: ListChecks, badge: pendingTasksCount > 0 ? pendingTasksCount : undefined },
        { path: "/staff", label: "Сотрудники", icon: UsersRound },
        { path: "/birthdays", label: "Дни рождения", icon: Cake },
        { path: "/vacations", label: "Отпуска", icon: Plane },
        { path: "/contacts", label: "Контакты", icon: Contact },
      ],
    },
    {
      id: "finance",
      label: "Финансы",
      items: [
        { path: "/transaction", label: "Новая транзакция", icon: PlusCircle },
        { path: "/finances", label: "Финансы", icon: RussianRuble },
        { path: "/transactions-review", label: "Проверка", icon: ClipboardCheck, badge: pendingCount > 0 ? pendingCount : undefined, financierOnly: true },
        { path: "/reports", label: "Отчёты", icon: FileText },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.path));
  };

  const getGroupBadge = (group: NavGroup): number => {
    return group.items.reduce((total, item) => total + (item.badge || 0), 0);
  };

  const filterItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.financierOnly && !isFinancier && !isAdmin) return false;
      return true;
    });
  };

  return (
    <nav className="flex items-center gap-1">
      {navGroups.map((group) => {
        const filteredItems = filterItems(group.items);
        if (filteredItems.length === 0) return null;
        
        const groupBadge = getGroupBadge({ ...group, items: filteredItems });
        const active = isGroupActive({ ...group, items: filteredItems });

        return (
          <DropdownMenu key={group.id}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-3 gap-1.5 font-medium text-sm",
                  active && "bg-accent text-accent-foreground"
                )}
              >
                {group.label}
                {groupBadge > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                    {groupBadge}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 bg-background">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "cursor-pointer gap-2",
                      isActive(item.path) && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}

      {/* Склад - direct link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/warehouse")}
        className={cn(
          "h-9 px-3 font-medium text-sm",
          isActive("/warehouse") && "bg-accent text-accent-foreground"
        )}
      >
        <Package className="h-4 w-4 mr-1.5" />
        Склад
      </Button>

      {/* Админ - only for admins */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/administration")}
          className={cn(
            "h-9 px-3 font-medium text-sm",
            isActive("/administration") && "bg-accent text-accent-foreground"
          )}
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Админ
        </Button>
      )}
    </nav>
  );
};
