import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Calendar, TrendingUp, Users } from "lucide-react";

interface DashboardStats {
  totalEvents: number;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    profit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch events count
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });

        // Fetch total revenue
        const { data: incomes } = await supabase
          .from("incomes")
          .select("amount");

        // Fetch total expenses
        const { data: expenses } = await supabase
          .from("expenses")
          .select("amount");

        const totalRevenue = incomes?.reduce((sum, income) => sum + Number(income.amount), 0) || 0;
        const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

        setStats({
          totalEvents: eventsCount || 0,
          totalRevenue,
          totalExpenses,
          profit: totalRevenue - totalExpenses,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
    }).format(amount);
  };

  const statsCards = [
    {
      title: "Всего мероприятий",
      value: stats.totalEvents.toString(),
      icon: Calendar,
      description: "Активные и завершенные",
    },
    {
      title: "Общий доход",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: "За все время",
    },
    {
      title: "Общие расходы",
      value: formatCurrency(stats.totalExpenses),
      icon: TrendingUp,
      description: "За все время",
    },
    {
      title: "Прибыль",
      value: formatCurrency(stats.profit),
      icon: Users,
      description: "Доход - Расходы",
      valueColor: stats.profit >= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Панель управления</h1>
          <p className="text-muted-foreground">Обзор вашей финансовой деятельности</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium bg-muted h-4 w-24 rounded"></CardTitle>
                <div className="bg-muted h-4 w-4 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted h-6 w-16 rounded mb-1"></div>
                <div className="bg-muted h-3 w-20 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Панель управления</h1>
        <p className="text-muted-foreground">Обзор вашей финансовой деятельности</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.valueColor || ""}`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние мероприятия</CardTitle>
            <CardDescription>
              Недавно созданные или обновленные мероприятия
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              Данные загружаются...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Финансовая сводка</CardTitle>
            <CardDescription>
              Краткий обзор доходов и расходов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Доходы:</span>
                <span className="text-green-600 font-medium">
                  {formatCurrency(stats.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Расходы:</span>
                <span className="text-red-600 font-medium">
                  {formatCurrency(stats.totalExpenses)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Итого:</span>
                <span className={stats.profit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(stats.profit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;