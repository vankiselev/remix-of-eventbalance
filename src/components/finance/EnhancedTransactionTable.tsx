import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { Edit, Trash2, RefreshCw, FilterX } from "lucide-react";
import { TransactionFilter } from "./TransactionFilter";

interface Transaction {
  id: string;
  operation_date: string;
  project_owner: string;
  description: string;
  expense_amount: number | null;
  income_amount: number | null;
  category: string;
  cash_type: string | null;
  notes: string | null;
  created_by: string;
  project_id: string | null;
  type: 'income' | 'expense';
  amount: number;
}

interface TransactionTableProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: Transaction) => void;
}

export function EnhancedTransactionTable({ userId, isAdmin, onEdit }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<Record<string, string[]>>({
    category: [],
    project_owner: [],
    cash_type: [],
    type: [],
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [userId, isAdmin]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("financial_transactions")
        .select(`
          id,
          description,
          category,
          income_amount,
          expense_amount,
          operation_date,
          project_owner,
          cash_type,
          notes,
          created_at,
          created_by,
          project_id
        `)
        .order("operation_date", { ascending: false });

      // Apply user-specific filtering if not admin
      if (userId && !isAdmin) {
        query = query.eq("created_by", userId);
      } else if (userId && isAdmin) {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error details:", error);
        throw error;
      }

      const processedTransactions = (data || []).map(transaction => ({
        ...transaction,
        type: (transaction.income_amount && transaction.income_amount > 0) ? 'income' as const : 'expense' as const,
        amount: (transaction.income_amount && transaction.income_amount > 0) ? transaction.income_amount : (transaction.expense_amount || 0),
      }));

      setTransactions(processedTransactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить транзакции",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!isAdmin) return;

    setDeletingId(transactionId);
    try {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Транзакция удалена",
      });

      fetchTransactions();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить транзакцию",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter and memo logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      for (const [column, selectedValues] of Object.entries(filters)) {
        if (selectedValues.length === 0) continue;
        
        let value = '';
        switch (column) {
          case 'category':
            value = transaction.category;
            break;
          case 'project_owner':
            value = transaction.project_owner;
            break;
          case 'cash_type':
            value = transaction.cash_type || '';
            break;
          case 'type':
            value = transaction.type;
            break;
          default:
            continue;
        }
        
        if (!selectedValues.includes(value)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, filters]);

  // Generate filter options
  const filterOptions = useMemo(() => {
    const options: Record<string, Array<{value: string, label: string, count: number}>> = {
      category: [],
      project_owner: [],
      cash_type: [],
      type: [],
    };

    // Count occurrences
    const counts: Record<string, Record<string, number>> = {
      category: {},
      project_owner: {},
      cash_type: {},
      type: {},
    };

    transactions.forEach(transaction => {
      counts.category[transaction.category] = (counts.category[transaction.category] || 0) + 1;
      counts.project_owner[transaction.project_owner] = (counts.project_owner[transaction.project_owner] || 0) + 1;
      if (transaction.cash_type) {
        counts.cash_type[transaction.cash_type] = (counts.cash_type[transaction.cash_type] || 0) + 1;
      }
      counts.type[transaction.type] = (counts.type[transaction.type] || 0) + 1;
    });

    // Generate options
    Object.entries(counts.category).forEach(([value, count]) => {
      options.category.push({ value, label: value, count });
    });
    
    Object.entries(counts.project_owner).forEach(([value, count]) => {
      options.project_owner.push({ value, label: value, count });
    });
    
    Object.entries(counts.cash_type).forEach(([value, count]) => {
      if (value !== 'undefined' && value) {
        options.cash_type.push({ value, label: value, count });
      }
    });
    
    Object.entries(counts.type).forEach(([value, count]) => {
      const label = value === 'income' ? 'Доход' : 'Расход';
      options.type.push({ value, label, count });
    });

    // Sort options by label
    Object.keys(options).forEach(key => {
      options[key].sort((a, b) => a.label.localeCompare(b.label));
    });

    return options;
  }, [transactions]);

  const handleFilterChange = (column: string, values: string[]) => {
    setFilters(prev => ({ ...prev, [column]: values }));
  };

  const handleResetFilter = (column: string) => {
    setFilters(prev => ({ ...prev, [column]: [] }));
  };

  const handleResetAllFilters = () => {
    setFilters({
      category: [],
      project_owner: [],
      cash_type: [],
      type: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter.length > 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Фильтры:</span>
          
          <TransactionFilter
            column="category"
            title="Категория"
            options={filterOptions.category}
            selectedValues={filters.category}
            onFilterChange={(values) => handleFilterChange('category', values)}
            onReset={() => handleResetFilter('category')}
          />
          
          <TransactionFilter
            column="project_owner"
            title="Проект"
            options={filterOptions.project_owner}
            selectedValues={filters.project_owner}
            onFilterChange={(values) => handleFilterChange('project_owner', values)}
            onReset={() => handleResetFilter('project_owner')}
          />
          
          <TransactionFilter
            column="cash_type"
            title="Кошелек"
            options={filterOptions.cash_type}
            selectedValues={filters.cash_type}
            onFilterChange={(values) => handleFilterChange('cash_type', values)}
            onReset={() => handleResetFilter('cash_type')}
          />
          
          <TransactionFilter
            column="type"
            title="Тип"
            options={filterOptions.type}
            selectedValues={filters.type}
            onFilterChange={(values) => handleFilterChange('type', values)}
            onReset={() => handleResetFilter('type')}
          />
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAllFilters}
              className="text-xs"
            >
              <FilterX className="w-3 h-3 mr-1" />
              Сбросить все фильтры
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchTransactions}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Показано {filteredTransactions.length} из {transactions.length} транзакций
        {hasActiveFilters && " (отфильтровано)"}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {!userId && (
                <TableHead>Имя</TableHead>
              )}
              <TableHead>Дата операции</TableHead>
              <TableHead>Проект</TableHead>
              <TableHead>Чей проект</TableHead>
              <TableHead>Подробное описание</TableHead>
              <TableHead className="text-right">Траты</TableHead>
              <TableHead className="text-right">Приход</TableHead>
              <TableHead>Статья прихода/расхода</TableHead>
              {(isAdmin || onEdit) && <TableHead className="w-20">Действия</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={!userId ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  {transactions.length === 0 ? "Транзакций пока нет" : "Нет транзакций, соответствующих фильтрам"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/30">
                  {!userId && (
                    <TableCell>
                      {/* TODO: Add user name from profiles */}
                      Пользователь
                    </TableCell>
                  )}
                  <TableCell>
                    {new Date(transaction.operation_date).toLocaleDateString("ru-RU")}
                  </TableCell>
                  <TableCell>
                    {/* TODO: Get project name from events table */}
                    —
                  </TableCell>
                  <TableCell>{transaction.project_owner}</TableCell>
                  <TableCell className="max-w-48">
                    <div className="truncate" title={transaction.description}>
                      {transaction.description}
                    </div>
                    {transaction.notes && (
                      <div className="text-xs text-muted-foreground mt-1 truncate" title={transaction.notes}>
                        {transaction.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.expense_amount 
                      ? <span className="text-red-600">{formatCurrency(transaction.expense_amount)}</span>
                      : "—"
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.income_amount 
                      ? <span className="text-green-600">{formatCurrency(transaction.income_amount)}</span>
                      : "—"
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.category}</Badge>
                  </TableCell>
                  {(isAdmin || onEdit) && (
                    <TableCell>
                      <div className="flex gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(transaction)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === transaction.id}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить транзакцию?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие нельзя отменить. Транзакция будет удалена безвозвратно.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(transaction.id)}
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}