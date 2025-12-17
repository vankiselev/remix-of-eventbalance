import { Wallet, Banknote } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { useCompanyCashSummary } from "@/hooks/useCompanyCashSummary";
import { useUserCashSummary } from "@/hooks/useUserCashSummary";
import { useAllAdvances, useMyAdvance } from "@/hooks/useAdvances";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export const QuickStatsRow = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRbacRoles();
  const { data: companyCash, isLoading: isLoadingCompany } = useCompanyCashSummary();
  const { data: userCash, isLoading: isLoadingUser } = useUserCashSummary(user?.id);
  const { data: allAdvances, isLoading: isLoadingAdvances } = useAllAdvances();
  const { data: myAdvance, isLoading: isLoadingMyAdvance } = useMyAdvance();

  const isLoading = isLoadingCompany || isLoadingUser || isLoadingAdvances || isLoadingMyAdvance;

  // Determine which cash data to show
  const cashData = isAdmin ? companyCash : userCash;
  const cashLabel = isAdmin ? "Всего на руках" : "Мои деньги";
  
  // Determine which advance data to show
  const advanceAmount = isAdmin ? allAdvances?.total : myAdvance;
  const advanceLabel = isAdmin ? "Выданные авансы" : "Мой аванс";
  const showAdvance = advanceAmount && advanceAmount > 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${showAdvance ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {/* Cash on Hand */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              {cashLabel}
            </p>
            <p className={`text-2xl font-bold mt-1 ${(cashData?.total_cash || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(cashData?.total_cash || 0)}
            </p>
          </div>
        </div>
        {isAdmin && cashData && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="bg-background/60 px-2 py-1 rounded">
              Н: {formatCurrency(cashData.cash_nastya || 0)}
            </span>
            <span className="bg-background/60 px-2 py-1 rounded">
              Л: {formatCurrency(cashData.cash_lera || 0)}
            </span>
            <span className="bg-background/60 px-2 py-1 rounded">
              В: {formatCurrency(cashData.cash_vanya || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Advances - only show if there are advances */}
      {showAdvance && (
        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-600" />
                {advanceLabel}
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {formatCurrency(advanceAmount || 0)}
              </p>
            </div>
          </div>
          {isAdmin && allAdvances && allAdvances.employees.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              {allAdvances.employees.slice(0, 2).map((e, i) => (
                <span key={e.id} className="inline-block mr-2">
                  {e.full_name.split(' ')[0]}: {formatCurrency(e.advance_balance)}
                </span>
              ))}
              {allAdvances.employees.length > 2 && (
                <span>+{allAdvances.employees.length - 2}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
