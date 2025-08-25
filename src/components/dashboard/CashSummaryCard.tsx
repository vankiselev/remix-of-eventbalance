import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { Wallet } from "lucide-react";

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
  if (isLoading) {
    return (
      <Card className="card-modern p-5">
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-slate-200 rounded-lg"></div>
            <div className="h-6 bg-slate-200 rounded w-40"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded w-32 mb-5"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto mb-1"></div>
                <div className="h-6 bg-slate-200 rounded w-20 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-modern p-5 bg-gradient-to-br from-white to-slate-50">
      {/* Main Title */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Wallet className="w-4 h-4 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          💰 Итого денег на руках
        </h2>
      </div>

      {/* Total Amount */}
      <div className="mb-5">
        <div className="text-3xl font-bold text-slate-900 mb-1">
          {formatCurrency(totalCash)}
        </div>
        <p className="text-slate-500 text-xs">
          Общая сумма наличных средств
        </p>
      </div>

      {/* Individual Cash Holders */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-[10px] font-medium text-blue-600 mb-1 uppercase tracking-wide">
            Наличка Настя
          </div>
          <div className="text-lg font-semibold text-blue-700">
            {formatCurrency(cashNastya)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-[10px] font-medium text-green-600 mb-1 uppercase tracking-wide">
            Наличка Лера
          </div>
          <div className="text-lg font-semibold text-green-700">
            {formatCurrency(cashLera)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-[10px] font-medium text-purple-600 mb-1 uppercase tracking-wide">
            Наличка Ваня
          </div>
          <div className="text-lg font-semibold text-purple-700">
            {formatCurrency(cashVanya)}
          </div>
        </div>
      </div>
    </Card>
  );
}