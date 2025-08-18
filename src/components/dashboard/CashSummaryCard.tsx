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
      <Card className="card-modern p-8">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
            <div className="h-7 bg-slate-200 rounded w-48"></div>
          </div>
          <div className="h-12 bg-slate-200 rounded w-40 mb-8"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-5 bg-slate-200 rounded w-20 mx-auto mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-24 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-modern p-8 bg-gradient-to-br from-white to-slate-50">
      {/* Main Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Wallet className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          💰 Итого денег на руках
        </h2>
      </div>

      {/* Total Amount */}
      <div className="mb-8">
        <div className="text-4xl font-bold text-slate-900 mb-2">
          {formatCurrency(totalCash)}
        </div>
        <p className="text-slate-500 text-sm">
          Общая сумма наличных средств
        </p>
      </div>

      {/* Individual Cash Holders */}
      <div className="grid grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-xs font-medium text-blue-600 mb-2 uppercase tracking-wide">
            Наличка Настя
          </div>
          <div className="text-xl font-semibold text-blue-700">
            {formatCurrency(cashNastya)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wide">
            Наличка Лера
          </div>
          <div className="text-xl font-semibold text-green-700">
            {formatCurrency(cashLera)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs font-medium text-purple-600 mb-2 uppercase tracking-wide">
            Наличка Ваня
          </div>
          <div className="text-xl font-semibold text-purple-700">
            {formatCurrency(cashVanya)}
          </div>
        </div>
      </div>
    </Card>
  );
}