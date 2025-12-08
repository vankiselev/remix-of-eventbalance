import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, TrendingUp, TrendingDown, Link2, Unlink, Wand2, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { formatCurrency } from "@/utils/formatCurrency";
import { useFinancialReports, useFinancialReportItems, useMatchingTransactions, type FinancialReport, type FinancialReportItem } from "@/hooks/useFinancialReports";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { PlanFactTable } from "./PlanFactTable";
import { TransactionMatchFilter, getDefaultFilters, type TransactionFilters } from "./TransactionMatchFilter";
import { AddReportItemDialog } from "./AddReportItemDialog";
import { EditReportItemDialog } from "./EditReportItemDialog";

interface FinancialReportDetailDialogProps {
  report: FinancialReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: 'draft', label: 'Черновик' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Завершён' },
];

export const FinancialReportDetailDialog = ({ report, open, onOpenChange }: FinancialReportDetailDialogProps) => {
  const { updateReport, deleteReport } = useFinancialReports();
  const { items, updateItem, deleteItem } = useFinancialReportItems(report?.id || null);
  const { data: matchingTransactions } = useMatchingTransactions(report?.name || null);
  const { isAdmin } = useUserRbacRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(getDefaultFilters());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialReportItem | null>(null);

  // Reset selection and filters when report changes
  useEffect(() => {
    setSelectedItemId(null);
    setFilters(getDefaultFilters());
  }, [report?.id]);

  // Get all matched transaction IDs
  const matchedTransactionIds = useMemo(() => {
    const ids = new Set<string>();
    items?.forEach(item => {
      item.matched_transaction_ids?.forEach(id => ids.add(id));
    });
    return ids;
  }, [items]);

  // Filter transactions by type
  const incomeTransactions = useMemo(() => 
    matchingTransactions?.filter(t => t.income_amount > 0) || [], 
    [matchingTransactions]
  );

  const expenseTransactions = useMemo(() => 
    matchingTransactions?.filter(t => t.expense_amount > 0) || [], 
    [matchingTransactions]
  );

  // Filter items by type
  const incomeItems = useMemo(() => items?.filter(i => i.item_type === 'income') || [], [items]);
  const expenseItems = useMemo(() => items?.filter(i => i.item_type === 'expense') || [], [items]);

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    const baseTransactions = activeTab === 'income' ? incomeTransactions : expenseTransactions;
    
    return baseTransactions.filter(t => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          t.description?.toLowerCase().includes(searchLower) ||
          t.category?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Date filters
      if (filters.dateFrom) {
        const transactionDate = new Date(t.operation_date);
        if (transactionDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const transactionDate = new Date(t.operation_date);
        if (transactionDate > filters.dateTo) return false;
      }
      
      // Amount filters
      const amount = t.income_amount || t.expense_amount || 0;
      if (filters.amountMin !== null && amount < filters.amountMin) return false;
      if (filters.amountMax !== null && amount > filters.amountMax) return false;
      
      // Unmatched only
      if (filters.unmatchedOnly && matchedTransactionIds.has(t.id)) return false;
      
      return true;
    });
  }, [activeTab, incomeTransactions, expenseTransactions, filters, matchedTransactionIds]);

  // Calculations
  const totals = useMemo(() => {
    const plannedIncome = incomeItems.reduce((s, i) => s + i.planned_amount, 0);
    const plannedExpense = expenseItems.reduce((s, i) => s + i.planned_amount, 0);
    const actualIncome = incomeTransactions.reduce((s, t) => s + t.income_amount, 0);
    const actualExpense = expenseTransactions.reduce((s, t) => s + t.expense_amount, 0);
    
    return {
      plannedIncome,
      plannedExpense,
      actualIncome,
      actualExpense,
      plannedProfit: plannedIncome - plannedExpense,
      actualProfit: actualIncome - actualExpense,
    };
  }, [incomeItems, expenseItems, incomeTransactions, expenseTransactions]);

  const handleMatchTransaction = async (transactionId: string) => {
    if (!selectedItemId) return;

    const item = items?.find(i => i.id === selectedItemId);
    if (!item) return;

    const transaction = matchingTransactions?.find(t => t.id === transactionId);
    if (!transaction) return;

    const newMatchedIds = [...(item.matched_transaction_ids || []), transactionId];
    const newActualAmount = item.actual_amount + (transaction.income_amount || transaction.expense_amount || 0);

    await updateItem.mutateAsync({
      id: selectedItemId,
      matched_transaction_ids: newMatchedIds,
      actual_amount: newActualAmount,
      is_matched: true,
    });

    await updateReportTotals();
    toast({ title: "Транзакция сопоставлена" });
  };

  const handleUnmatchTransaction = async (itemId: string, transactionId: string) => {
    const item = items?.find(i => i.id === itemId);
    if (!item) return;

    const transaction = matchingTransactions?.find(t => t.id === transactionId);
    if (!transaction) return;

    const newMatchedIds = (item.matched_transaction_ids || []).filter(id => id !== transactionId);
    const newActualAmount = Math.max(0, item.actual_amount - (transaction.income_amount || transaction.expense_amount || 0));

    await updateItem.mutateAsync({
      id: itemId,
      matched_transaction_ids: newMatchedIds,
      actual_amount: newActualAmount,
      is_matched: newMatchedIds.length > 0,
    });

    await updateReportTotals();
    toast({ title: "Сопоставление отменено" });
  };

  const handleAutoMatch = async () => {
    if (!items || !matchingTransactions) return;

    let matchCount = 0;

    for (const item of items) {
      if (item.is_matched) continue;

      const candidates = matchingTransactions.filter(t => {
        const isRightType = item.item_type === 'income' ? t.income_amount > 0 : t.expense_amount > 0;
        const notMatched = !matchedTransactionIds.has(t.id);
        const categoryMatch = t.category?.toLowerCase().includes(item.category.toLowerCase()) ||
                              item.category.toLowerCase().includes(t.category?.toLowerCase() || '');
        return isRightType && notMatched && categoryMatch;
      });

      if (candidates.length === 1) {
        const transaction = candidates[0];
        await updateItem.mutateAsync({
          id: item.id,
          matched_transaction_ids: [transaction.id],
          actual_amount: transaction.income_amount || transaction.expense_amount || 0,
          is_matched: true,
        });
        matchCount++;
      }
    }

    await updateReportTotals();
    toast({ title: `Автосопоставлено ${matchCount} статей` });
  };

  const updateReportTotals = async () => {
    if (!report) return;

    const updatedItems = await queryClient.fetchQuery({
      queryKey: ['financial-report-items', report.id],
    }) as FinancialReportItem[];

    const totalActualIncome = updatedItems
      .filter(i => i.item_type === 'income')
      .reduce((s, i) => s + i.actual_amount, 0);

    const totalActualExpense = updatedItems
      .filter(i => i.item_type === 'expense')
      .reduce((s, i) => s + i.actual_amount, 0);

    await updateReport.mutateAsync({
      id: report.id,
      total_actual_income: totalActualIncome,
      total_actual_expense: totalActualExpense,
      profit: totalActualIncome - totalActualExpense,
    });
  };

  const handleStatusChange = async (status: string) => {
    if (!report) return;
    await updateReport.mutateAsync({ id: report.id, status });
  };

  const handleDelete = async () => {
    if (!report) return;
    if (!confirm('Удалить финотчёт? Это действие нельзя отменить.')) return;
    
    await deleteReport.mutateAsync(report.id);
    onOpenChange(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem.mutateAsync(itemId);
    await updatePlannedTotals();
    toast({ title: "Статья удалена" });
  };

  const handleItemChanged = async () => {
    await updatePlannedTotals();
  };

  const updatePlannedTotals = async () => {
    if (!report) return;

    const updatedItems = await queryClient.fetchQuery({
      queryKey: ['financial-report-items', report.id],
    }) as FinancialReportItem[];

    const totalPlannedIncome = updatedItems
      .filter(i => i.item_type === 'income')
      .reduce((s, i) => s + i.planned_amount, 0);

    const totalPlannedExpense = updatedItems
      .filter(i => i.item_type === 'expense')
      .reduce((s, i) => s + i.planned_amount, 0);

    await updateReport.mutateAsync({
      id: report.id,
      total_planned_income: totalPlannedIncome,
      total_planned_expense: totalPlannedExpense,
    });
  };

  if (!report) return null;

  const currentItems = activeTab === 'income' ? incomeItems : expenseItems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "overflow-hidden flex flex-col transition-all duration-200",
        isFullscreen 
          ? "w-screen h-screen max-w-none max-h-none rounded-none" 
          : "max-w-6xl max-h-[90vh]"
      )}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{report.name}</DialogTitle>
              {report.event_date && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <CalendarDays className="w-4 h-4" />
                  <span>{format(parseISO(report.event_date), 'd MMMM yyyy', { locale: ru })}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={report.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Свернуть" : "Развернуть"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              {isAdmin && (
                <Button variant="destructive" size="icon" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0 py-4 border-y">
          <div>
            <p className="text-xs text-muted-foreground uppercase">План доходы</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.plannedIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">План расходы</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totals.plannedExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Факт доходы</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.actualIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Факт расходы</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totals.actualExpense)}</p>
          </div>
        </div>

        {/* Profit summary */}
        <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">План прибыль</p>
              <p className={`font-bold ${totals.plannedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.plannedProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Факт прибыль</p>
              <p className={`font-bold ${totals.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.actualProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Разница</p>
              <p className={`font-bold ${totals.actualProfit >= totals.plannedProfit ? 'text-green-600' : 'text-red-600'}`}>
                {totals.actualProfit >= totals.plannedProfit ? '+' : ''}{formatCurrency(totals.actualProfit - totals.plannedProfit)}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleAutoMatch}>
            <Wand2 className="mr-2 h-4 w-4" />
            Автосопоставить
          </Button>
        </div>

        {/* Matching interface */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'income' | 'expense')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="expense" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Расходы ({expenseItems.length})
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Доходы ({incomeItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 overflow-hidden mt-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Plan (estimate items) - Table view */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="py-3 flex-shrink-0">
                  <CardTitle className="text-sm">План (смета)</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className={cn("h-full", isFullscreen ? "max-h-[calc(100vh-380px)]" : "max-h-[300px]")}>
                    <div className="px-2">
                      <PlanFactTable
                        items={currentItems}
                        selectedItemId={selectedItemId}
                        onSelectItem={setSelectedItemId}
                        type={activeTab}
                        onAddItem={() => setIsAddDialogOpen(true)}
                        onEditItem={setEditingItem}
                        onDeleteItem={handleDeleteItem}
                      />
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Actual (transactions) with filters */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="py-3 flex-shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Факт (транзакции)
                    </CardTitle>
                    {selectedItemId && (
                      <Badge variant="outline" className="text-xs">Выберите для сопоставления</Badge>
                    )}
                  </div>
                  <TransactionMatchFilter filters={filters} onChange={setFilters} />
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className={cn("h-full", isFullscreen ? "max-h-[calc(100vh-450px)]" : "max-h-[250px]")}>
                    <div className="space-y-1 p-4">
                      {filteredTransactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {filters.search || filters.unmatchedOnly || filters.dateFrom || filters.dateTo || filters.amountMin || filters.amountMax
                            ? 'Нет транзакций по заданным фильтрам'
                            : 'Транзакции не найдены'
                          }
                        </p>
                      ) : (
                        filteredTransactions.map(transaction => {
                          const isMatched = matchedTransactionIds.has(transaction.id);
                          const matchedItem = items?.find(i => i.matched_transaction_ids?.includes(transaction.id));
                          const amount = transaction.income_amount || transaction.expense_amount || 0;

                          return (
                            <div
                              key={transaction.id}
                              className={cn(
                                "p-3 rounded-lg border transition-colors",
                                isMatched ? "border-green-500/50 bg-green-500/5" : "hover:bg-muted/50",
                                selectedItemId && !isMatched && "cursor-pointer hover:border-primary"
                              )}
                              onClick={() => {
                                if (selectedItemId && !isMatched) {
                                  handleMatchTransaction(transaction.id);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{transaction.description}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{format(new Date(transaction.operation_date), 'dd.MM.yyyy')}</span>
                                    <span>• {transaction.category}</span>
                                  </div>
                                </div>
                                <div className="text-right ml-2">
                                  <p className={`font-medium ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(amount)}
                                  </p>
                                </div>
                              </div>
                              {isMatched && matchedItem && (
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-1">
                                    <Link2 className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-600">{matchedItem.category}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnmatchTransaction(matchedItem.id, transaction.id);
                                    }}
                                  >
                                    <Unlink className="w-3 h-3 mr-1" />
                                    Отвязать
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Item Dialog */}
        <AddReportItemDialog
          reportId={report.id}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          defaultType={activeTab}
          onSuccess={handleItemChanged}
        />

        {/* Edit Item Dialog */}
        <EditReportItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSuccess={handleItemChanged}
        />
      </DialogContent>
    </Dialog>
  );
};
