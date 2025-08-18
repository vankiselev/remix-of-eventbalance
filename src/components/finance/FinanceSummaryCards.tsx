import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { Wallet, User } from "lucide-react";

interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

interface FinanceSummaryCardsProps {
  summary: CashSummary;
  isLoading?: boolean;
}

export function FinanceSummaryCards({ summary, isLoading }: FinanceSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-modern">
            <CardHeader className="pb-3">
              <div className="animate-pulse">
                <div className="bg-slate-200 h-4 w-24 rounded mb-2"></div>
                <div className="bg-slate-200 h-8 w-32 rounded"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Итого на руках",
      value: summary.total_cash,
      icon: Wallet,
      color: "slate",
      bgColor: "bg-slate-50",
      iconColor: "text-slate-600",
      textColor: "text-slate-900"
    },
    {
      title: "Наличка Настя",
      value: summary.cash_nastya,
      icon: User,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      textColor: "text-blue-700"
    },
    {
      title: "Наличка Лера",
      value: summary.cash_lera,
      icon: User,
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      textColor: "text-green-700"
    },
    {
      title: "Наличка Ваня",
      value: summary.cash_vanya,
      icon: User,
      color: "purple",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      textColor: "text-purple-700"
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <Card key={index} className="card-modern hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {card.title}
                </CardTitle>
                <div className={`w-8 h-8 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl font-bold ${card.textColor}`}>
                {formatCurrency(card.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}