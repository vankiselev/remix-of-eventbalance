import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, User, Banknote, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDisplayName } from "@/utils/formatName";
import { useAllAdvances, useMyAdvance } from "@/hooks/useAdvances";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { AdvanceEditDialog } from "./AdvanceEditDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface CashSummary {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

interface FinanceHeaderCardProps {
  summary: CashSummary;
  isLoading?: boolean;
  employeeId?: string;
}

export function FinanceHeaderCard({ summary, isLoading, employeeId }: FinanceHeaderCardProps) {
  const { isAdmin } = useUserRbacRoles();
  const { user } = useAuth();
  const { data: allAdvances, isLoading: isLoadingAll } = useAllAdvances();

  const targetUserId = employeeId || (!isAdmin ? user?.id : undefined);
  const { data: advanceInfo, isLoading: isLoadingMy } = useMyAdvance(targetUserId);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | undefined>();
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [isAdvancesExpanded, setIsAdvancesExpanded] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async (empId: string, name: string) => {
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ advance_balance: 0, advance_issued_by: null, advance_issued_at: null })
        .eq('id', empId);
      if (error) throw error;
      toast({ title: "Аванс удалён", description: `Аванс у ${name} обнулён` });
      queryClient.invalidateQueries({ queryKey: ['all-advances'] });
      queryClient.invalidateQueries({ queryKey: ['my-advance'] });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  const handleAddNew = () => {
    setEditingEmployeeId(undefined);
    setEditingAmount(0);
    setIsEditDialogOpen(true);
  };

  const handleEdit = (empId: string, amount: number) => {
    setEditingEmployeeId(empId);
    setEditingAmount(amount);
    setIsEditDialogOpen(true);
  };

  const advancesLoading = (isAdmin && !employeeId && isLoadingAll) || isLoadingMy;

  if (isLoading || advancesLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-3 sm:p-4 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  // Determine advance info
  const isAdminOverview = isAdmin && !employeeId;
  const advanceTotal = isAdminOverview
    ? (allAdvances?.total || 0)
    : (advanceInfo?.amount || 0);
  const advanceEmployees = isAdminOverview ? (allAdvances?.employees || []) : [];
  const hasAdvanceDetails = isAdminOverview && advanceEmployees.length > 0;

  const walletDefs = [
    { key: 'nastya' as const, dataKey: 'cash_nastya' as const },
    { key: 'lera' as const, dataKey: 'cash_lera' as const },
    { key: 'vanya' as const, dataKey: 'cash_vanya' as const },
  ];
  const wallets = walletDefs.map(w => ({
    label: DEFAULT_OWNER_COLORS[w.key].label,
    value: summary[w.dataKey],
    hex: DEFAULT_OWNER_COLORS[w.key].hex,
  }));

  return (
    <>
      <Card className="border-border/50 shadow-sm rounded-xl">
        <CardContent className="p-3 sm:p-4">
          {/* Row 1: Total + advance badge + add button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Итого на руках</p>
                <p className="text-xl font-bold text-foreground leading-tight">{formatCurrency(summary.total_cash)}</p>
              </div>
            </div>

            {/* Advance badge + add button */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-muted/60 rounded-xl px-2.5 py-1.5">
                <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Авансы:</span>
                <span className="text-xs font-semibold text-foreground">{formatCurrency(advanceTotal)}</span>
              </div>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 rounded-xl touch-manipulation"
                  onClick={handleAddNew}
                  aria-label="Добавить аванс"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Row 2: Wallet chips — equal height, clean wrap */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {wallets.map((w) => (
              <div
                key={w.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5",
                  w.bg
                )}
              >
                <User className={cn("h-3 w-3 flex-shrink-0", w.color)} />
                <span className={cn("text-xs whitespace-nowrap", w.color)}>
                  {w.label}
                </span>
                <span className={cn("text-xs font-semibold whitespace-nowrap", w.color)}>
                  {formatCurrency(w.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Row 3: Expandable advance details — only when there are advances */}
          {hasAdvanceDetails && (
            <>
              <Separator className="my-2.5" />
              <Collapsible open={isAdvancesExpanded} onOpenChange={setIsAdvancesExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between min-h-[44px] text-xs text-muted-foreground px-1 rounded-xl touch-manipulation"
                  >
                    <span>Подробнее · {advanceEmployees.length} сотр.</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isAdvancesExpanded && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="space-y-0.5 pt-1">
                    {advanceEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between text-sm min-h-[44px] px-1 rounded-xl hover:bg-accent/50 group"
                      >
                        <span className="text-foreground text-xs">
                          {formatDisplayName(employee.full_name)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium">
                            {formatCurrency(employee.advance_balance)}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                            onClick={() => handleEdit(employee.id, employee.advance_balance)}
                            aria-label="Редактировать аванс"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive touch-manipulation"
                                aria-label="Удалить аванс"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить аванс?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Аванс у {formatDisplayName(employee.full_name)} ({formatCurrency(employee.advance_balance)}) будет обнулён.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(employee.id, formatDisplayName(employee.full_name))}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Employee/self advance detail (non-admin or specific employee view) */}
          {!isAdminOverview && advanceTotal > 0 && (
            <>
              <Separator className="my-2.5" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {advanceInfo?.issuedByName
                    ? `Выдал(а): ${advanceInfo.issuedByName}`
                    : "Выдано"}
                  {advanceInfo?.issuedAt && (
                    <span className="ml-1">
                      · {format(new Date(advanceInfo.issuedAt), 'd MMM yyyy', { locale: ru })}
                    </span>
                  )}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdvanceEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        employeeId={editingEmployeeId}
        currentAmount={editingAmount}
      />
    </>
  );
}
