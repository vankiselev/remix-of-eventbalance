import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { Wallet, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
      <div className="space-y-1">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-border/50 h-11">
            <CardContent className="p-3 animate-pulse flex items-center justify-between">
              <div className="bg-slate-200 h-3 w-20 rounded"></div>
              <div className="bg-slate-200 h-4 w-16 rounded"></div>
            </CardContent>
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
    <div className="space-y-1 w-full">
      {cards.map((card, index) => (
        <div key={index} className="w-full">
          <Card className="border border-border/50 h-11 shadow-sm hover:shadow-md transition-all duration-200 w-full">
            <CardContent className="p-3 flex items-center justify-between h-full min-w-0 w-full">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-5 h-5 ${card.bgColor} rounded-md flex items-center justify-center flex-shrink-0`}>
                  <card.icon className={`h-3 w-3 ${card.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-slate-600 truncate">
                  {card.title}
                </span>
              </div>
              <div className={`text-sm font-bold ${card.textColor} flex-shrink-0 ml-2`}>
                {formatCurrency(card.value)}
              </div>
            </CardContent>
          </Card>
          {index === 0 && <Separator className="my-2" />}
        </div>
      ))}
    </div>
  );
}