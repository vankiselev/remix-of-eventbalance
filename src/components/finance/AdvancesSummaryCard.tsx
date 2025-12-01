import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, Plus, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAllAdvances, useMyAdvance } from "@/hooks/useAdvances";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { AdvanceEditDialog } from "./AdvanceEditDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const AdvancesSummaryCard = () => {
  const { isAdmin } = useUserRbacRoles();
  const { data: allAdvances, isLoading: isLoadingAll } = useAllAdvances();
  const { data: myAdvance, isLoading: isLoadingMy } = useMyAdvance();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | undefined>();
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render for non-admin users without advances
  if (!isAdmin && !isLoadingMy && (!myAdvance || myAdvance === 0)) {
    return null;
  }

  const handleAddNew = () => {
    setEditingEmployeeId(undefined);
    setEditingAmount(0);
    setIsEditDialogOpen(true);
  };

  const handleEdit = (employeeId: string, amount: number) => {
    setEditingEmployeeId(employeeId);
    setEditingAmount(amount);
    setIsEditDialogOpen(true);
  };

  if (isLoadingAll || isLoadingMy) {
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

  if (isAdmin && allAdvances) {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Выданные авансы
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleAddNew}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
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
                        {employee.full_name}
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

  // Employee view
  if (myAdvance && myAdvance > 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Мой аванс
          </CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(myAdvance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Выдано администратором
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
};
