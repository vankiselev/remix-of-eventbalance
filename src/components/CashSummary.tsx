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
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium">Общая сумма на руках</CardTitle>
            <Wallet className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">
              {formatCurrency(totalCash)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium">Наличка Настя</CardTitle>
            <DollarSign className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(cashNastya)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium">Наличка Лера</CardTitle>
            <DollarSign className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(cashLera)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium">Наличка Ваня</CardTitle>
            <DollarSign className="h-3 w-3 text-purple-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(cashVanya)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}