import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatCurrency";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  LucideIcon
} from "lucide-react";

interface StatItem {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "blue" | "green" | "red" | "purple";
  format?: "currency" | "number";
}

interface DashboardStatsProps {
  stats: {
    totalEvents: number;
    totalIncome: number;
    totalExpenses: number;
    profit: number;
  };
  isLoading?: boolean;
}

export function DashboardStats({ stats, isLoading = false }: DashboardStatsProps) {
  const statItems: StatItem[] = [
    {
      title: "Всего мероприятий",
      value: stats.totalEvents,
      icon: Calendar,
      color: "blue",
      format: "number"
    },
    {
      title: "Общий доход",
      value: stats.totalIncome,
      icon: TrendingUp,
      color: "green",
      format: "currency"
    },
    {
      title: "Общие расходы",
      value: stats.totalExpenses,
      icon: TrendingDown,
      color: "red",
      format: "currency"
    },
    {
      title: "Прибыль",
      value: stats.profit,
      icon: DollarSign,
      color: stats.profit >= 0 ? "green" : "red",
      format: "currency"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "bg-blue-50",
        icon: "text-blue-600",
        text: "text-blue-700"
      },
      green: {
        bg: "bg-green-50",
        icon: "text-green-600",
        text: "text-green-700"
      },
      red: {
        bg: "bg-red-50",
        icon: "text-red-600",
        text: "text-red-700"
      },
      purple: {
        bg: "bg-purple-50",
        icon: "text-purple-600",
        text: "text-purple-700"
      }
    };
    return colors[color as keyof typeof colors];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-stats">
            <CardContent className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                <div className="w-4 h-4 bg-slate-200 rounded"></div>
              </div>
              <div className="h-8 bg-slate-200 rounded w-20 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        const colors = getColorClasses(item.color);
        
        return (
          <Card key={index} className="card-stats group">
            <CardContent>
              {/* Header with icon */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
              </div>

              {/* Value */}
              <div className="mb-2">
                <div className={`text-2xl font-bold ${colors.text}`}>
                  {item.format === "currency" 
                    ? formatCompactCurrency(item.value)
                    : item.value.toLocaleString('ru-RU')
                  }
                </div>
              </div>

              {/* Title */}
              <div className="text-sm font-medium text-slate-600">
                {item.title}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}