import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

interface AdvancesSummaryCardProps {
  employeeId?: string;
}

export const AdvancesSummaryCard = ({ employeeId }: AdvancesSummaryCardProps) => {
  const { isAdmin } = useUserRbacRoles();
  const { user } = useAuth();
  const { data: allAdvances, isLoading: isLoadingAll } = useAllAdvances();
  
  // For employee view: show target employee's advance (or own if no employeeId)
  const targetUserId = employeeId || (!isAdmin ? user?.id : undefined);
  const { data: advanceInfo, isLoading: isLoadingMy } = useMyAdvance(targetUserId);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | undefined>();
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Loading state
  if ((isAdmin && !employeeId && isLoadingAll) || isLoadingMy) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Admin viewing a specific employee OR non-admin viewing own advance
  if (employeeId || !isAdmin) {
    const amount = advanceInfo?.amount || 0;
    const issuedByName = advanceInfo?.issuedByName;
    const issuedAt = advanceInfo?.issuedAt;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {employeeId ? "Аванс сотрудника" : "Выданный мне аванс"}
          </CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {amount > 0 ? (
            <>
              <div className="text-2xl font-bold">
                {formatCurrency(amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {issuedByName 
                  ? `Выдал(а): ${issuedByName}`
                  : "Выдано"}
                {issuedAt && (
                  <span className="ml-1">
                    · {format(new Date(issuedAt), 'd MMM yyyy', { locale: ru })}
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Аванс пока не выдан
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Admin overview (no specific employee selected)
  if (isAdmin && allAdvances) {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Выданные авансы
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0"
              onClick={handleAddNew}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(allAdvances.total)}
            </div>
            
            {allAdvances.employees.length > 0 ? (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between mt-2 text-xs"
                  >
                    <span>{allAdvances.employees.length} сотрудник(ов)</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-2">
                  {allAdvances.employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent group"
                    >
                      <span className="text-foreground">
                        {formatDisplayName(employee.full_name)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatCurrency(employee.advance_balance)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEdit(employee.id, employee.advance_balance)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
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
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Нет выданных авансов. Нажмите "+" чтобы добавить первый.
              </p>
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

  return null;
};
