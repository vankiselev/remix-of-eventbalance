import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { Wallet, DollarSign } from "lucide-react";

interface CashSummaryProps {
  totalCash: number;
  cashNastya: number;
  cashLera: number;
  cashVanya: number;
  isCompanyWide?: boolean;
}

export function CashSummary({ totalCash, cashNastya, cashLera, cashVanya, isCompanyWide = false }: CashSummaryProps) {
  const title = isCompanyWide ? "Сводка по компании" : "Ваши наличные";

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid gap-2 md:grid-cols-4">
        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-3 pt-2">
            <CardTitle className="text-[10px] font-medium">Общая сумма на руках</CardTitle>
            <Wallet className="h-2.5 w-2.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="text-sm font-bold">
              {formatCurrency(totalCash)}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-3 pt-2">
            <CardTitle className="text-[10px] font-medium">Наличка Настя</CardTitle>
            <DollarSign className="h-2.5 w-2.5 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="text-sm font-bold text-green-600">
              {formatCurrency(cashNastya)}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-3 pt-2">
            <CardTitle className="text-[10px] font-medium">Наличка Лера</CardTitle>
            <DollarSign className="h-2.5 w-2.5 text-blue-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="text-sm font-bold text-blue-600">
              {formatCurrency(cashLera)}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-3 pt-2">
            <CardTitle className="text-[10px] font-medium">Наличка Ваня</CardTitle>
            <DollarSign className="h-2.5 w-2.5 text-purple-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="text-sm font-bold text-purple-600">
              {formatCurrency(cashVanya)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}