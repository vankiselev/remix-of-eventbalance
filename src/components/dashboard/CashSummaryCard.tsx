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
      <Card className="card-modern p-3 border border-border/50">
        <div className="animate-pulse">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-5 h-5 bg-slate-200 rounded-lg"></div>
            <div className="h-5 bg-slate-200 rounded w-32"></div>
          </div>
          <div className="h-8 bg-slate-200 rounded w-24 mb-3"></div>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-3 bg-slate-200 rounded w-12 mx-auto mb-0.5"></div>
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-modern p-3 bg-gradient-to-br from-white to-slate-50 border border-border/50">
      {/* Main Title */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Wallet className="w-3 h-3 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          💰 Итого денег на руках
        </h2>
      </div>

      {/* Total Amount */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-slate-900 mb-0.5">
          {formatCurrency(totalCash)}
        </div>
        <p className="text-slate-500 text-[10px]">
          Общая сумма наличных средств
        </p>
      </div>

      {/* Individual Cash Holders */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[9px] font-medium text-blue-600 mb-0.5 uppercase tracking-wide">
            Наличка Настя
          </div>
          <div className="text-sm font-semibold text-blue-700">
            {formatCurrency(cashNastya)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-[9px] font-medium text-green-600 mb-0.5 uppercase tracking-wide">
            Наличка Лера
          </div>
          <div className="text-sm font-semibold text-green-700">
            {formatCurrency(cashLera)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-[9px] font-medium text-purple-600 mb-0.5 uppercase tracking-wide">
            Наличка Ваня
          </div>
          <div className="text-sm font-semibold text-purple-700">
            {formatCurrency(cashVanya)}
          </div>
        </div>
      </div>
    </Card>
  );
}