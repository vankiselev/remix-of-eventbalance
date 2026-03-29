import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { Wallet, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useOwnerColors } from "@/hooks/useOwnerColors";
import { useWalletNames } from "@/hooks/useWalletNames";

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
  const { colors } = useOwnerColors();
  const { getWalletDisplayName } = useWalletNames();

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-border/50 h-11">
            <CardContent className="p-3 animate-pulse flex items-center justify-between">
              <div className="bg-muted h-3 w-20 rounded"></div>
              <div className="bg-muted h-4 w-16 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const ownerCards = [
    { key: 'nastya' as const, walletKey: 'cash_nastya', value: summary.cash_nastya },
    { key: 'lera' as const, walletKey: 'cash_lera', value: summary.cash_lera },
    { key: 'vanya' as const, walletKey: 'cash_vanya', value: summary.cash_vanya },
  ];

  return (
    <div className="space-y-1 w-full">
      {/* Total card */}
      <Card className="border border-border/50 h-11 shadow-sm hover:shadow-md transition-all duration-200 w-full">
        <CardContent className="p-3 flex items-center justify-between h-full min-w-0 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-5 h-5 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
              <Wallet className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate">
              Итого на руках
            </span>
          </div>
          <div className="text-sm font-bold text-foreground flex-shrink-0 ml-2">
            {formatCurrency(summary.total_cash)}
          </div>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      {/* Owner cards */}
      {ownerCards.map(({ key, walletKey, value }) => (
        <Card key={key} className="border border-border/50 h-11 shadow-sm hover:shadow-md transition-all duration-200 w-full">
          <CardContent className="p-3 flex items-center justify-between h-full min-w-0 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${colors[key].hex}14` }}
              >
                <User className="h-3 w-3" style={{ color: colors[key].hex }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground truncate">
                {getWalletDisplayName(walletKey)}
              </span>
            </div>
            <div
              className="text-sm font-bold flex-shrink-0 ml-2"
              style={{ color: colors[key].hex }}
            >
              {formatCurrency(value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
