import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BarChart3,
  CalendarDays,
  Calendar,
  PlusCircle,
  RussianRuble,
  Package,
  ListChecks,
  UsersRound,
  Cake,
  Plane,
  Contact,
  FileText,
  Settings,
  UserPlus,
  ClipboardCheck,
  Search,
  History,
  Star,
  Zap,
} from "lucide-react";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { Badge } from "@/components/ui/badge";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { usePendingTasksCount } from "@/hooks/usePendingTasksCount";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  badge?: number;
  group: "main" | "work" | "finance" | "warehouse" | "admin" | "quick";
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
}

const RECENT_PAGES_KEY = "eventbalance_recent_pages";
const FAVORITES_KEY = "eventbalance_favorites";
const MAX_RECENT = 5;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { isFinancier } = useFinancierPermissions();
  const { isAdmin } = useUserRbacRoles();
  const { pendingCount } = usePendingTransactionsCount();
  const { pendingTasksCount } = usePendingTasksCount();
  
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load recent pages and favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    if (stored) {
      setRecentPages(JSON.parse(stored));
    }
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }
  }, []);

  const navigationItems: NavigationItem[] = [
    // Main
    { path: "/dashboard", label: "Главная", icon: BarChart3, keywords: ["дашборд", "главная", "home", "dashboard"], group: "main" },
    { path: "/settings", label: "Настройки", icon: Settings, keywords: ["настройки", "settings"], group: "quick" },
    
    // Work
    { path: "/events", label: "Мероприятия", icon: CalendarDays, keywords: ["мероприятия", "события", "events"], group: "work" },
    { path: "/calendar", label: "Календарь", icon: Calendar, keywords: ["календарь", "calendar"], group: "work" },
    { path: "/tasks", label: "Мои задачи", icon: ListChecks, keywords: ["задачи", "tasks", "todo"], badge: pendingTasksCount > 0 ? pendingTasksCount : undefined, group: "work" },
    { path: "/staff", label: "Сотрудники", icon: UsersRound, keywords: ["сотрудники", "команда", "staff"], group: "work" },
    { path: "/birthdays", label: "Дни рождения", icon: Cake, keywords: ["дни рождения", "birthdays"], group: "work" },
    { path: "/vacations", label: "Отпуска", icon: Plane, keywords: ["отпуска", "vacations"], group: "work" },
    { path: "/contacts", label: "Контакты", icon: Contact, keywords: ["контакты", "contacts"], group: "work" },
    
    // Finance
    { path: "/transaction", label: "Новая транзакция", icon: PlusCircle, keywords: ["транзакция", "расход", "приход", "transaction"], group: "finance" },
    { path: "/finances", label: "Финансы", icon: RussianRuble, keywords: ["финансы", "деньги", "finances"], group: "finance" },
    ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка транзакций", icon: ClipboardCheck, keywords: ["проверка", "review"], badge: pendingCount > 0 ? pendingCount : undefined, group: "finance" as const }] : []),
    ...(!isFinancier || isAdmin ? [{ path: "/reports", label: "Отчеты", icon: FileText, keywords: ["отчеты", "reports"], group: "finance" as const }] : []),
    
    // Warehouse
    { path: "/warehouse", label: "Склад", icon: Package, keywords: ["склад", "warehouse", "товары"], group: "warehouse" },
    
    // Admin
    ...(isAdmin ? [{ path: "/administration", label: "Администрирование", icon: UserPlus, keywords: ["админ", "administration"], group: "admin" as const }] : []),
  ];

  const quickActions: QuickAction[] = [
    {
      id: "new-transaction",
      label: "Создать транзакцию",
      icon: PlusCircle,
      action: () => navigate("/transaction"),
      keywords: ["создать", "новый", "транзакция"],
    },
    {
      id: "new-task",
      label: "Создать задачу",
      icon: ListChecks,
      action: () => navigate("/tasks?create=true"),
      keywords: ["создать", "задача", "task"],
    },
  ];

  const handleSelect = useCallback((path: string) => {
    // Update recent pages
    const newRecent = [path, ...recentPages.filter(p => p !== path)].slice(0, MAX_RECENT);
    setRecentPages(newRecent);
    localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(newRecent));
    
    navigate(path);
    onOpenChange(false);
  }, [navigate, onOpenChange, recentPages]);

  const handleQuickAction = useCallback((action: () => void) => {
    action();
    onOpenChange(false);
  }, [onOpenChange]);

  const toggleFavorite = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(path)
      ? favorites.filter(p => p !== path)
      : [...favorites, path];
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  }, [favorites]);

  const getItemByPath = (path: string) => navigationItems.find(item => item.path === path);

  const groupLabels: Record<string, string> = {
    main: "Главное",
    work: "Работа",
    finance: "Финансы",
    warehouse: "Склад",
    admin: "Администрирование",
  };

  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Поиск страниц и действий..." />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Быстрые действия">
          {quickActions.map((action) => (
            <CommandItem
              key={action.id}
              onSelect={() => handleQuickAction(action.action)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Zap className="h-4 w-4 text-warning" />
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Favorites */}
        {favorites.length > 0 && (
          <>
            <CommandGroup heading="Избранное">
              {favorites.map((path) => {
                const item = getItemByPath(path);
                if (!item) return null;
                return (
                  <CommandItem
                    key={`fav-${path}`}
                    onSelect={() => handleSelect(path)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Recent Pages */}
        {recentPages.length > 0 && (
          <>
            <CommandGroup heading="Недавние">
              {recentPages.map((path) => {
                const item = getItemByPath(path);
                if (!item) return null;
                return (
                  <CommandItem
                    key={`recent-${path}`}
                    onSelect={() => handleSelect(path)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <History className="h-4 w-4 text-muted-foreground" />
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    <button
                      onClick={(e) => toggleFavorite(path, e)}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          favorites.includes(path)
                            ? "text-warning fill-warning"
                            : "text-muted-foreground hover:text-warning"
                        }`}
                      />
                    </button>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation Groups */}
        {Object.entries(groupedItems).map(([group, items]) => (
          <CommandGroup key={group} heading={groupLabels[group]}>
            {items.map((item) => (
              <CommandItem
                key={item.path}
                onSelect={() => handleSelect(item.path)}
                className="flex items-center gap-3 cursor-pointer group"
                keywords={item.keywords}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
                <button
                  onClick={(e) => toggleFavorite(item.path, e)}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star
                    className={`h-4 w-4 ${
                      favorites.includes(item.path)
                        ? "text-warning fill-warning"
                        : "text-muted-foreground hover:text-warning"
                    }`}
                  />
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
