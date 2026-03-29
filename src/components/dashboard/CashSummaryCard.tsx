import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { Wallet } from "lucide-react";
import { useOwnerColors } from "@/hooks/useOwnerColors";
import { useWalletNames } from "@/hooks/useWalletNames";

interface CashSummaryCardProps {
  totalCash: number;
  cashNastya: number;
  cashLera: number;
  cashVanya: number;
  isLoading?: boolean;
}

export function CashSummaryCard({ 
  totalCash, 
  cashNastya, 
  cashLera, 
  cashVanya, 
  isLoading = false 
}: CashSummaryCardProps) {
  const { colors } = useOwnerColors();
  const { getWalletDisplayName } = useWalletNames();

  if (isLoading) {
    return (
      <Card className="card-modern p-3 border border-border/50">
        <div className="animate-pulse">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-5 h-5 bg-muted rounded-lg"></div>
            <div className="h-5 bg-muted rounded w-32"></div>
          </div>
          <div className="h-8 bg-muted rounded w-24 mb-3"></div>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-3 bg-muted rounded w-12 mx-auto mb-0.5"></div>
                <div className="h-4 bg-muted rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const owners = [
    { key: 'nastya' as const, walletKey: 'cash_nastya', value: cashNastya },
    { key: 'lera' as const, walletKey: 'cash_lera', value: cashLera },
    { key: 'vanya' as const, walletKey: 'cash_vanya', value: cashVanya },
  ];

  return (
    <Card className="card-modern p-3 bg-gradient-to-br from-background to-muted/30 border border-border/50">
      {/* Main Title */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center">
          <Wallet className="w-3 h-3 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          💰 Итого денег на руках
        </h2>
      </div>

      {/* Total Amount */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-foreground mb-0.5">
          {formatCurrency(totalCash)}
        </div>
        <p className="text-muted-foreground text-[10px]">
          Общая сумма наличных средств
        </p>
      </div>

      {/* Individual Cash Holders */}
      <div className="grid grid-cols-3 gap-2">
        {owners.map(({ key, walletKey, value }) => (
          <div key={key} className="text-center">
            <div
              className="text-[9px] font-medium mb-0.5 uppercase tracking-wide"
              style={{ color: colors[key].hex }}
            >
              {getWalletDisplayName(walletKey)}
            </div>
            <div
              className="text-sm font-semibold"
              style={{ color: colors[key].hex }}
            >
              {formatCurrency(value)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
