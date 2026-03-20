import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays, TrendingUp, TrendingDown, Link2, Unlink, Wand2, Trash2, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { formatCurrency } from "@/utils/formatCurrency";
import { useFinancialReports, useFinancialReportItems, useMatchingTransactions, type FinancialReport, type FinancialReportItem } from "@/hooks/useFinancialReports";
import type { EstimateItem } from "@/components/finance/reports/EstimateImportDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { PlanFactTable } from "@/components/finance/reports/PlanFactTable";
import { TransactionMatchFilter, getDefaultFilters, type TransactionFilters } from "@/components/finance/reports/TransactionMatchFilter";
import { AddReportItemDialog } from "@/components/finance/reports/AddReportItemDialog";
import { EditReportItemDialog } from "@/components/finance/reports/EditReportItemDialog";
import { EstimateImportDialog } from "@/components/finance/reports/EstimateImportDialog";
import Layout from "@/components/Layout";

const statusOptions = [
  { value: 'draft', label: 'Черновик' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Завершён' },
];

const FinancialReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reports, updateReport, deleteReport } = useFinancialReports();
  const report = reports?.find(r => r.id === id) || null;
  const { items, updateItem, deleteItem, addItems } = useFinancialReportItems(id || null);
  const { data: matchingTransactions } = useMatchingTransactions(report?.name || null);
  const { isAdmin } = useUserRbacRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(getDefaultFilters());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialReportItem | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Reset selection and filters when report changes
  useEffect(() => {
    setSelectedItemId(null);
    setFilters(getDefaultFilters());
  }, [id]);

  // Get all matched transaction IDs
  const matchedTransactionIds = useMemo(() => {
    const ids = new Set<string>();
    items?.forEach(item => {
      item.matched_transaction_ids?.forEach(id => ids.add(id));
    });
    return ids;
  }, [items]);

  // All transactions (both income and expense)
  const allTransactions = useMemo(() => matchingTransactions || [], [matchingTransactions]);

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          t.description?.toLowerCase().includes(searchLower) ||
          t.category?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      if (filters.dateFrom) {
        const transactionDate = new Date(t.operation_date);
        if (transactionDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const transactionDate = new Date(t.operation_date);
        if (transactionDate > filters.dateTo) return false;
      }
      
      const amount = t.income_amount || t.expense_amount || 0;
      if (filters.amountMin !== null && amount < filters.amountMin) return false;
      if (filters.amountMax !== null && amount > filters.amountMax) return false;
      
      if (filters.unmatchedOnly && matchedTransactionIds.has(t.id)) return false;
      
      return true;
    });
  }, [allTransactions, filters, matchedTransactionIds]);

  // Calculations based on new structure
  const totals = useMemo(() => {
    const planned = (items || []).reduce((s, i) => s + (i.planned_amount || 0), 0);
    
    let actualIncome = 0;
    let actualExpense = 0;
    
    (items || []).forEach(item => {
      actualIncome += (item as any).actual_income || 0;
      actualExpense += (item as any).actual_expense || 0;
      if (!(item as any).actual_income && !(item as any).actual_expense && item.actual_amount > 0) {
        if (item.item_type === 'income') {
          actualIncome += item.actual_amount;
        } else {
          actualExpense += item.actual_amount;
        }
      }
    });
    
    return {
      planned,
      actualIncome,
      actualExpense,
      profit: actualIncome - actualExpense,
    };
  }, [items]);

  const handleMatchTransaction = async (transactionId: string) => {
    if (!selectedItemId) return;

    const item = items?.find(i => i.id === selectedItemId);
    if (!item) return;

    const transaction = matchingTransactions?.find(t => t.id === transactionId);
    if (!transaction) return;

    const isIncome = transaction.income_amount > 0;
    const amount = transaction.income_amount || transaction.expense_amount || 0;
    
    const newMatchedIds = [...(item.matched_transaction_ids || []), transactionId];
    const currentActualIncome = (item as any).actual_income || 0;
    const currentActualExpense = (item as any).actual_expense || 0;

    await updateItem.mutateAsync({
      id: selectedItemId,
      matched_transaction_ids: newMatchedIds,
      actual_income: isIncome ? currentActualIncome + amount : currentActualIncome,
      actual_expense: !isIncome ? currentActualExpense + amount : currentActualExpense,
      is_matched: true,
    } as any);

    await updateReportTotals();
    toast({ title: "Транзакция сопоставлена" });
  };

  const handleUnmatchTransaction = async (itemId: string, transactionId: string) => {
    const item = items?.find(i => i.id === itemId);
    if (!item) return;

    const transaction = matchingTransactions?.find(t => t.id === transactionId);
    if (!transaction) return;

    const isIncome = transaction.income_amount > 0;
    const amount = transaction.income_amount || transaction.expense_amount || 0;

    const newMatchedIds = (item.matched_transaction_ids || []).filter(id => id !== transactionId);
    const currentActualIncome = (item as any).actual_income || 0;
    const currentActualExpense = (item as any).actual_expense || 0;

    await updateItem.mutateAsync({
      id: itemId,
      matched_transaction_ids: newMatchedIds,
      actual_income: isIncome ? Math.max(0, currentActualIncome - amount) : currentActualIncome,
      actual_expense: !isIncome ? Math.max(0, currentActualExpense - amount) : currentActualExpense,
      is_matched: newMatchedIds.length > 0,
    } as any);

    await updateReportTotals();
    toast({ title: "Сопоставление отменено" });
  };

  const handleAutoMatch = async () => {
    if (!items || !matchingTransactions) return;

    let matchCount = 0;

    for (const item of items) {
      if (item.is_matched) continue;

      const candidates = matchingTransactions.filter(t => {
        const notMatched = !matchedTransactionIds.has(t.id);
        const categoryMatch = t.category?.toLowerCase().includes(item.category.toLowerCase()) ||
                              item.category.toLowerCase().includes(t.category?.toLowerCase() || '');
        return notMatched && categoryMatch;
      });

      if (candidates.length === 1) {
        const transaction = candidates[0];
        const isIncome = transaction.income_amount > 0;
        const amount = transaction.income_amount || transaction.expense_amount || 0;
        
        await updateItem.mutateAsync({
          id: item.id,
          matched_transaction_ids: [transaction.id],
          actual_income: isIncome ? amount : 0,
          actual_expense: !isIncome ? amount : 0,
          is_matched: true,
        } as any);
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

    let totalActualIncome = 0;
    let totalActualExpense = 0;

    updatedItems.forEach(item => {
      totalActualIncome += (item as any).actual_income || 0;
      totalActualExpense += (item as any).actual_expense || 0;
    });

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
    navigate('/finances');
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

    const totalPlanned = updatedItems.reduce((s, i) => s + (i.planned_amount || 0), 0);

    await updateReport.mutateAsync({
      id: report.id,
      total_planned_income: totalPlanned,
      total_planned_expense: 0,
    });
  };

  if (!report) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Финотчёт не найден</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/finances')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{report.name}</h1>
              {report.event_date && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4" />
                  <span>{format(parseISO(report.event_date), 'd MMMM yyyy', { locale: ru })}</span>
                </div>
              )}
            </div>
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

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b flex-shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase">План (смета)</p>
            <p className="text-lg font-bold">{formatCurrency(totals.planned)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              Факт доходы
            </p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.actualIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-600" />
              Факт расходы
            </p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totals.actualExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Прибыль</p>
            <p className={`text-lg font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.profit)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between py-3 flex-shrink-0">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Загрузить смету
          </Button>
          <Button variant="outline" onClick={handleAutoMatch}>
            <Wand2 className="mr-2 h-4 w-4" />
            Автосопоставить
          </Button>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
          {/* Plan (estimate items) */}
          <Card className="flex flex-col overflow-hidden lg:col-span-3">
            <CardHeader className="py-3 flex-shrink-0">
              <CardTitle className="text-sm">Статьи сметы</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <PlanFactTable
                items={items || []}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                onAddItem={() => setIsAddDialogOpen(true)}
                onEditItem={setEditingItem}
                onDeleteItem={handleDeleteItem}
              />
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card className="flex flex-col overflow-hidden lg:col-span-2">
            <CardHeader className="py-3 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Транзакции ({filteredTransactions.length})
                </CardTitle>
                {selectedItemId && (
                  <Badge variant="outline" className="text-xs">Кликните для сопоставления</Badge>
                )}
              </div>
              <TransactionMatchFilter filters={filters} onChange={setFilters} />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="space-y-2 p-4">
                {filteredTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Нет подходящих транзакций
                  </p>
                ) : (
                  filteredTransactions.map(transaction => {
                    const isMatched = matchedTransactionIds.has(transaction.id);
                    const matchedItem = items?.find(i => 
                      i.matched_transaction_ids?.includes(transaction.id)
                    );
                    const isIncome = transaction.income_amount > 0;
                    const amount = transaction.income_amount || transaction.expense_amount || 0;

                    return (
                      <div
                        key={transaction.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          isMatched 
                            ? "bg-green-500/5 border-green-500/20" 
                            : "hover:bg-accent cursor-pointer",
                          selectedItemId && !isMatched && "ring-2 ring-primary/20"
                        )}
                        onClick={() => !isMatched && selectedItemId && handleMatchTransaction(transaction.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isIncome ? (
                                <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                              )}
                              <p className="font-medium truncate">{transaction.description}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(transaction.operation_date), 'd MMM yyyy', { locale: ru })} · {transaction.category}
                            </p>
                            {isMatched && matchedItem && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                → {matchedItem.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-bold whitespace-nowrap",
                              isIncome ? "text-green-600" : "text-red-600"
                            )}>
                              {isIncome ? '+' : '-'}{formatCurrency(amount)}
                            </span>
                            {isMatched ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (matchedItem) {
                                    handleUnmatchTransaction(matchedItem.id, transaction.id);
                                  }
                                }}
                              >
                                <Unlink className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            ) : selectedItemId && (
                              <Link2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        <AddReportItemDialog
          reportId={report.id}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={handleItemChanged}
        />

        <EditReportItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSuccess={handleItemChanged}
        />

        <EstimateImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImport={async (estimateItems: EstimateItem[]) => {
            await addItems.mutateAsync(
              estimateItems.map((item, index) => ({
                report_id: report.id,
                category: item.category,
                description: item.description,
                planned_amount: item.planned_amount,
                sort_order: index,
              }))
            );
            await updatePlannedTotals();
            setIsImportDialogOpen(false);
          }}
        />
      </div>
    </Layout>
  );
};

export default FinancialReportPage;
