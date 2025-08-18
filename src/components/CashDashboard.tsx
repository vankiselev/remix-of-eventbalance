import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/currency';
import { CASH_CATEGORIES } from '@/utils/constants';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface CashSummary {
  owner: string;
  total: number;
  income: number;
  expense: number;
}

const CashDashboard = () => {
  const [cashSummaries, setCashSummaries] = useState<CashSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCashSummaries();
  }, []);

  const fetchCashSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('project_owner, income_amount, expense_amount')
        .in('project_owner', CASH_CATEGORIES);

      if (error) throw error;

      // Calculate summaries for each cash category
      const summaries = CASH_CATEGORIES.map(owner => {
        const transactions = data?.filter(t => t.project_owner === owner) || [];
        
        const income = transactions.reduce((sum, t) => sum + (Number(t.income_amount) || 0), 0);
        const expense = transactions.reduce((sum, t) => sum + (Number(t.expense_amount) || 0), 0);
        const total = income - expense;

        return {
          owner,
          total,
          income,
          expense
        };
      });

      setCashSummaries(summaries);
    } catch (error) {
      console.error('Error fetching cash summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCash = cashSummaries.reduce((sum, summary) => sum + summary.total, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[120px] mb-2" />
                <Skeleton className="h-4 w-[80px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Cash Card */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Итого денег на руках
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalCash)}
            </div>
            <p className="text-xs text-muted-foreground">
              Общий баланс наличных
            </p>
          </CardContent>
        </Card>

        {/* Individual Cash Cards */}
        {cashSummaries.map((summary) => (
          <Card key={summary.owner}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {summary.owner}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.total)}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatCurrency(summary.income)}
                </div>
                <div className="flex items-center text-red-600">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {formatCurrency(summary.expense)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Сводка по наличным</CardTitle>
          <CardDescription>
            Детальная информация по движению наличных средств
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashSummaries.map((summary) => (
              <div key={summary.owner} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{summary.owner}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-600">
                      Приход: {formatCurrency(summary.income)}
                    </span>
                    <span className="text-red-600">
                      Расход: {formatCurrency(summary.expense)}
                    </span>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${summary.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.total)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashDashboard;