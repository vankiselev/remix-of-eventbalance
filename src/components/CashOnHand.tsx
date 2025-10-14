import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/formatCurrency";

interface CashSummary {
  nastya_cash: number;
  lera_cash: number;
  vanya_cash: number;
}

const CashOnHand = () => {
  const [cashSummary, setCashSummary] = useState<CashSummary>({
    nastya_cash: 0,
    lera_cash: 0,
    vanya_cash: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCashSummary();
  }, []);

  const fetchCashSummary = async () => {
    try {
      // Fetch all financial transactions
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("project_owner, income_amount, expense_amount");

      if (error) throw error;

      // Calculate cash on hand for each person
      const summary = {
        nastya_cash: 0,
        lera_cash: 0,
        vanya_cash: 0,
      };

      data?.forEach((transaction) => {
        const income = transaction.income_amount || 0;
        const expense = transaction.expense_amount || 0;
        const netAmount = income - expense;

        if (transaction.project_owner === "Наличка Настя") {
          summary.nastya_cash += netAmount;
        } else if (transaction.project_owner === "Наличка Лера") {
          summary.lera_cash += netAmount;
        } else if (transaction.project_owner === "Наличка Ваня") {
          summary.vanya_cash += netAmount;
        }
      });

      setCashSummary(summary);
    } catch (error) {
      console.error("Error fetching cash summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalCash = cashSummary.nastya_cash + cashSummary.lera_cash + cashSummary.vanya_cash;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Итого денег на руках</h2>
        <p className="text-3xl font-bold text-primary mt-2">
          {formatCurrency(totalCash)}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Наличка Настя</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              cashSummary.nastya_cash >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(cashSummary.nastya_cash)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Наличка Лера</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              cashSummary.lera_cash >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(cashSummary.lera_cash)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Наличка Ваня</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              cashSummary.vanya_cash >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(cashSummary.vanya_cash)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashOnHand;