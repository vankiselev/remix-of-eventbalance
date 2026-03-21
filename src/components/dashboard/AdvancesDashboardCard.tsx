import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDisplayName } from "@/utils/formatName";
import { useAllAdvances, useMyAdvance } from "@/hooks/useAdvances";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { Skeleton } from "@/components/ui/skeleton";

export const AdvancesDashboardCard = () => {
  const { isAdmin } = useUserRbacRoles();
  const { data: allAdvances, isLoading: isLoadingAll } = useAllAdvances();
  const { data: advanceInfo, isLoading: isLoadingMy } = useMyAdvance();

  // Don't render for non-admin users without advances
  if (!isAdmin && !isLoadingMy && (!advanceInfo || advanceInfo.amount === 0)) {
    return null;
  }

  // Don't render for admin if no advances exist
  if (isAdmin && !isLoadingAll && (!allAdvances || allAdvances.total === 0)) {
    return null;
  }

  if (isLoadingAll || isLoadingMy) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (isAdmin && allAdvances) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
            Выданные авансы
          </CardTitle>
          <Banknote className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {formatCurrency(allAdvances.total)}
          </div>
          {allAdvances.employees.length > 0 && (
            <div className="mt-3 space-y-1">
              {allAdvances.employees.slice(0, 3).map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-orange-700 dark:text-orange-300 truncate mr-2">
                    {employee.full_name}
                  </span>
                  <span className="font-medium text-orange-900 dark:text-orange-100 whitespace-nowrap">
                    {formatCurrency(employee.advance_balance)}
                  </span>
                </div>
              ))}
              {allAdvances.employees.length > 3 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  +{allAdvances.employees.length - 3} ещё
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Employee view
  if (advanceInfo && advanceInfo.amount > 0) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Мой аванс
          </CardTitle>
          <Banknote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {formatCurrency(advanceInfo.amount)}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {advanceInfo.issuedByName
              ? `Выдал(а): ${advanceInfo.issuedByName}`
              : "Выдано"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
};
