import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface FinancialTrendsChartProps {
  data: Array<{
    date: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
  isLoading?: boolean;
}

export function FinancialTrendsChart({ data, isLoading = false }: FinancialTrendsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Финансовая динамика</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const totalProfit = totalIncome - totalExpenses;
  const profitPercentage = totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(1) : "0.0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Финансовая динамика</CardTitle>
        <div className="flex gap-6 mt-4">
          <div>
            <div className="text-sm text-muted-foreground">Прибыль</div>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCompactCurrency(totalProfit)}
            </div>
            <div className="text-xs text-muted-foreground">
              Рост на {profitPercentage}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), "d MMM", { locale: ru })}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tickFormatter={(value) => formatCompactCurrency(value)}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <div className="text-sm font-medium mb-2">
                      {format(new Date(payload[0].payload.date), "d MMMM yyyy", { locale: ru })}
                    </div>
                    {payload.map((entry: any) => (
                      <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
                        <span className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name === "income" ? "Доход" : "Расход"}
                        </span>
                        <span className="font-medium">{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="income"
              stroke="hsl(var(--chart-1))"
              fill="url(#colorIncome)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="expenses"
              stroke="hsl(var(--chart-2))"
              fill="url(#colorExpenses)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
