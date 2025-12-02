import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, TrendingUp, TrendingDown, Link2, Unlink, Wand2, Check, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { formatCurrency } from "@/utils/formatCurrency";
import { useFinancialReports, useFinancialReportItems, useMatchingTransactions, type FinancialReport, type FinancialReportItem } from "@/hooks/useFinancialReports";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

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
  const { items, updateItem } = useFinancialReportItems(report?.id || null);
  const { data: matchingTransactions } = useMatchingTransactions(report?.name || null);
  const { isAdmin } = useUserRbacRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');

  // Reset selection when report changes
  useEffect(() => {
    setSelectedItemId(null);
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

    // Update report totals
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

      // Try to find transaction with similar category
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

    // Recalculate totals from items
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

  if (!report) return null;

  const currentItems = activeTab === 'income' ? incomeItems : expenseItems;
  const currentTransactions = activeTab === 'income' ? incomeTransactions : expenseTransactions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
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
              {/* Plan (estimate items) */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="py-3 flex-shrink-0">
                  <CardTitle className="text-sm">План (смета)</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full max-h-[300px]">
                    <div className="space-y-1 p-4">
                      {currentItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Нет статей</p>
                      ) : (
                        currentItems.map(item => (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedItemId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                              item.is_matched && "border-green-500/50 bg-green-500/5"
                            )}
                            onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.category}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                )}
                              </div>
                              <div className="text-right ml-2">
                                <p className="font-medium">{formatCurrency(item.planned_amount)}</p>
                                {item.is_matched && (
                                  <p className="text-xs text-green-600">Факт: {formatCurrency(item.actual_amount)}</p>
                                )}
                              </div>
                            </div>
                            {item.is_matched && (
                              <div className="flex items-center gap-1 mt-2">
                                <Check className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-green-600">
                                  {item.matched_transaction_ids?.length} транзакций
                                </span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Actual (transactions) */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="py-3 flex-shrink-0">
                  <CardTitle className="text-sm">
                    Факт (транзакции)
                    {selectedItemId && (
                      <Badge variant="outline" className="ml-2">Выберите для сопоставления</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full max-h-[300px]">
                    <div className="space-y-1 p-4">
                      {currentTransactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Транзакции не найдены
                        </p>
                      ) : (
                        currentTransactions.map(transaction => {
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
      </DialogContent>
    </Dialog>
  );
};
