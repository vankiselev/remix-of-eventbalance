import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import TodayEventsCard from "@/components/dashboard/TodayEventsCard";
import TodayBirthdaysCard from "@/components/dashboard/TodayBirthdaysCard";
import TodayVacationsCard from "@/components/dashboard/TodayVacationsCard";
import CashOnHandCard from "@/components/dashboard/CashOnHandCard";
import { FinancialTrendsChart } from "@/components/dashboard/FinancialTrendsChart";
import { CategoryBreakdownChart } from "@/components/dashboard/CategoryBreakdownChart";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, format } from "date-fns";

interface DashboardData {
  totalEvents: number;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  totalCash: number;
  cashNastya: number;
  cashLera: number;
  cashVanya: number;
}

interface TrendData {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData>({
    totalEvents: 0,
    totalIncome: 0,
    totalExpenses: 0,
    profit: 0,
    totalCash: 0,
    cashNastya: 0,
    cashLera: 0,
    cashVanya: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch events count
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });

        // Get last 30 days date range
        const endDate = new Date();
        const startDate = subDays(endDate, 30);

        // Fetch financial data
        const { data: transactions } = await supabase
          .from("financial_transactions")
          .select("income_amount, expense_amount, cash_type, operation_date, category")
          .gte("operation_date", format(startDate, "yyyy-MM-dd"))
          .lte("operation_date", format(endDate, "yyyy-MM-dd"))
          .order("operation_date");

        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;
        let cashNastya = 0;
        let cashLera = 0;
        let cashVanya = 0;

        // Group by date for trend chart
        const trendMap = new Map<string, { income: number; expenses: number }>();
        
        // Track category expenses
        const categoryMap = new Map<string, number>();

        transactions?.forEach(t => {
          if (t.income_amount) totalIncome += t.income_amount;
          if (t.expense_amount) totalExpenses += t.expense_amount;
          
          const netAmount = (t.income_amount || 0) - (t.expense_amount || 0);
          if (t.cash_type === 'nastya') cashNastya += netAmount;
          else if (t.cash_type === 'lera') cashLera += netAmount;
          else if (t.cash_type === 'vanya') cashVanya += netAmount;

          // Aggregate by date
          const dateKey = t.operation_date;
          const existing = trendMap.get(dateKey) || { income: 0, expenses: 0 };
          trendMap.set(dateKey, {
            income: existing.income + (t.income_amount || 0),
            expenses: existing.expenses + (t.expense_amount || 0),
          });

          // Aggregate by category (only expenses)
          if (t.expense_amount && t.category) {
            const categoryAmount = categoryMap.get(t.category) || 0;
            categoryMap.set(t.category, categoryAmount + t.expense_amount);
          }
        });

        const totalCash = cashNastya + cashLera + cashVanya;
        const profit = totalIncome - totalExpenses;

        // Build trend data
        const trends: TrendData[] = Array.from(trendMap.entries())
          .map(([date, values]) => ({
            date,
            income: values.income,
            expenses: values.expenses,
            profit: values.income - values.expenses,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Build category data
        const categories: CategoryData[] = Array.from(categoryMap.entries())
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5); // Top 5 categories

        setData({
          totalEvents: eventsCount || 0,
          totalIncome,
          totalExpenses,
          profit,
          totalCash,
          cashNastya,
          cashLera,
          cashVanya,
        });
        setTrendData(trends);
        setCategoryData(categories);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-3xl font-bold truncate">Главная</h1>
        <p className="text-muted-foreground truncate">
          Добро пожаловать в EventBalance! Система управления ивентами
        </p>
      </div>

      {/* Stats Cards */}
      <DashboardStats
        stats={{
          totalEvents: data.totalEvents,
          totalIncome: data.totalIncome,
          totalExpenses: data.totalExpenses,
          profit: data.profit,
        }}
        isLoading={loading}
      />

      {/* Cash on hand - full width */}
      <div className="w-full">
        <CashOnHandCard />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2 w-full">
        <FinancialTrendsChart data={trendData} isLoading={loading} />
        <CategoryBreakdownChart data={categoryData} isLoading={loading} />
      </div>

      {/* Today's information */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr w-full">
        <TodayEventsCard />
        <TodayBirthdaysCard />
        <TodayVacationsCard />
      </div>
    </div>
  );
};

export default Dashboard;