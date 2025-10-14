import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { CashSummaryCard } from "@/components/dashboard/CashSummaryCard";
import TodayEventsCard from "@/components/dashboard/TodayEventsCard";
import TodayBirthdaysCard from "@/components/dashboard/TodayBirthdaysCard";
import TodayVacationsCard from "@/components/dashboard/TodayVacationsCard";
import CashOnHandCard from "@/components/dashboard/CashOnHandCard";
import { useAuth } from "@/contexts/AuthContext";

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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch events count
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });

        // Fetch financial data
        const { data: transactions } = await supabase
          .from("financial_transactions")
          .select("income_amount, expense_amount, cash_type");

        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;
        let cashNastya = 0;
        let cashLera = 0;
        let cashVanya = 0;

        transactions?.forEach(t => {
          if (t.income_amount) totalIncome += t.income_amount;
          if (t.expense_amount) totalExpenses += t.expense_amount;
          
          const netAmount = (t.income_amount || 0) - (t.expense_amount || 0);
          if (t.cash_type === 'nastya') cashNastya += netAmount;
          else if (t.cash_type === 'lera') cashLera += netAmount;
          else if (t.cash_type === 'vanya') cashVanya += netAmount;
        });

        const totalCash = cashNastya + cashLera + cashVanya;
        const profit = totalIncome - totalExpenses;

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
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Главная</h1>
        <p className="text-muted-foreground">
          Добро пожаловать в EventBalance! Система управления ивентами
        </p>
      </div>

      {/* Cash on hand - full width */}
      <div className="w-full">
        <CashOnHandCard />
      </div>

      {/* Today's information */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
        <TodayEventsCard />
        <TodayBirthdaysCard />
        <TodayVacationsCard />
      </div>
    </div>
  );
};

export default Dashboard;