import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronRight,
  Briefcase,
  Wallet,
  Boxes,
  Shield,
  Mic,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancierPermissions } from "@/hooks/useFinancierPermissions";
import { usePendingTransactionsCount } from "@/hooks/usePendingTransactionsCount";
import { usePendingTasksCount } from "@/hooks/usePendingTasksCount";
import { VoiceTransactionDialog } from "@/components/finance/VoiceTransactionDialog";

interface NavigationGroupsProps {
  isCollapsed: boolean;
  isAdmin: boolean;
}

interface NavItem {
  path?: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  action?: () => void;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const EXPANDED_GROUPS_KEY = "eventbalance_nav_groups_expanded";

export function NavigationGroups({ isCollapsed, isAdmin }: NavigationGroupsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFinancier } = useFinancierPermissions();
  const { pendingCount } = usePendingTransactionsCount();
  const { pendingTasksCount } = usePendingTasksCount();
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(EXPANDED_GROUPS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { main: true, work: true, finance: true, warehouse: true, admin: true };
  });

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const isActive = (path: string) => location.pathname === path;

  const navGroups: NavGroup[] = [
    {
      id: "main",
      label: "Главное",
      icon: BarChart3,
      items: [
        { path: "/dashboard", label: "Главная", icon: BarChart3 },
      ],
    },
    {
      id: "work",
      label: "Работа",
      icon: Briefcase,
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
      icon: Wallet,
      items: [
        { path: "/transaction", label: "Новая транзакция", icon: PlusCircle },
        { label: "Голосовой ввод", icon: Mic, action: () => setVoiceDialogOpen(true) },
        { path: "/finances", label: "Финансы", icon: RussianRuble },
        ...(isFinancier ? [{ path: "/transactions-review", label: "Проверка", icon: ClipboardCheck, badge: pendingCount > 0 ? pendingCount : undefined }] : []),
        ...(!isFinancier || isAdmin ? [{ path: "/reports", label: "Отчеты", icon: FileText }] : []),
      ],
    },
    {
      id: "warehouse",
      label: "Склад",
      icon: Boxes,
      items: [
        { path: "/warehouse", label: "Склад", icon: Package },
      ],
    },
    ...(isAdmin ? [{
      id: "admin",
      label: "Админ",
      icon: Shield,
      items: [
        { path: "/administration", label: "Администрирование", icon: UserPlus },
      ],
    }] : []),
  ];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Check if any item in group is active
  const isGroupActive = (group: NavGroup) => group.items.some(item => item.path && isActive(item.path));

  // Get total badge count for group
  const getGroupBadge = (group: NavGroup) => {
    return group.items.reduce((sum, item) => sum + (item.badge || 0), 0);
  };

  if (isCollapsed) {
    // Collapsed view - just show icons
    return (
      <>
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {navGroups.flatMap(group => group.items).map((item, index) => {
              const active = item.path ? isActive(item.path) : false;
              const key = item.path || `action-${index}`;
              return (
                <li key={key}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    size="icon"
                    className={cn(
                      "w-full h-10 relative transition-all duration-200",
                      active
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => item.action ? item.action() : item.path && navigate(item.path)}
                    title={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.badge && item.badge > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full animate-pulse"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
        <VoiceTransactionDialog 
          isOpen={voiceDialogOpen} 
          onOpenChange={setVoiceDialogOpen}
          onSuccess={() => navigate('/finances')}
        />
      </>
    );
  }

  // Expanded view with groups
  return (
    <nav className="flex-1 p-3 overflow-y-auto">
      <div className="space-y-2">
        {navGroups.map((group) => {
          const groupActive = isGroupActive(group);
          const groupBadge = getGroupBadge(group);
          const isExpanded = expandedGroups[group.id] ?? true;

          return (
            <Collapsible
              key={group.id}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between px-3 py-2 h-auto font-medium text-sm transition-all duration-200",
                    groupActive && "text-primary",
                    "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="h-4 w-4" />
                    <span>{group.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {groupBadge > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 animate-pulse">
                        {groupBadge}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-accordion-down">
                <ul className="mt-1 ml-4 space-y-0.5 border-l border-border/50 pl-2">
                  {group.items.map((item, index) => {
                    const active = item.path ? isActive(item.path) : false;
                    const key = item.path || `action-${group.id}-${index}`;
                    return (
                      <li key={key}>
                        <Button
                          variant={active ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start px-3 py-1.5 h-auto text-sm transition-all duration-200",
                            active
                              ? "bg-primary/10 text-primary font-medium shadow-sm"
                              : "hover:bg-accent/50 hover:translate-x-1"
                          )}
                          onClick={() => item.action ? item.action() : item.path && navigate(item.path)}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-4">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      <VoiceTransactionDialog 
        isOpen={voiceDialogOpen} 
        onOpenChange={setVoiceDialogOpen}
        onSuccess={() => navigate('/finances')}
      />
    </nav>
  );
}
