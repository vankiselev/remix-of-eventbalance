// @ts-nocheck
import { useState, useEffect } from "react";
import { useWalletNames } from "@/hooks/useWalletNames";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Search,
  ArrowUpDown,
  Paperclip 
} from "lucide-react";

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
  no_receipt: boolean;
  no_receipt_reason: string | null;
  events?: { name: string } | null;
  attachments_count?: number;
}

interface TransactionTableProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionTable({ userId, isAdmin, onEdit }: TransactionTableProps) {
  const { getWalletDisplayName } = useWalletNames();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Transaction>("operation_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  useEffect(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.project_owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.events?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === "asc" ? result : -result;
    });

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, sortField, sortDirection]);

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          events:project_id(name),
          attachments_count:financial_attachments(count)
        `)
        .order("operation_date", { ascending: false });

      // If not admin or specific userId provided, filter by user
      if (!isAdmin || userId) {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to flatten attachments_count
      const transformedData = (data || []).map(transaction => ({
        ...transaction,
        attachments_count: transaction.attachments_count?.[0]?.count || 0
      }));

      setTransactions(transformedData);
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
    }
  };

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const getCashTypeBadge = (cashType: string | null) => {
    if (!cashType) return null;
    const displayName = getWalletDisplayName(cashType);
    return (
      <Badge variant="outline" className="text-xs">
        {displayName}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="bg-muted h-10 w-full rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-muted h-16 w-full rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по описанию, проекту, категории..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* Modern Table */}
      <div className="card-modern overflow-hidden">
        <Table className="table-zebra">
          <TableHeader>
            <TableRow className="table-header border-0">
              {!userId && (
                <TableHead className="font-semibold text-slate-700">Имя</TableHead>
              )}
              <TableHead className="font-semibold text-slate-700">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("operation_date")}
                  className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                >
                  Дата операции
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="font-semibold text-slate-700">Проект</TableHead>
              <TableHead className="font-semibold text-slate-700">Чей проект</TableHead>
              <TableHead className="font-semibold text-slate-700">Подробное описание</TableHead>
              <TableHead className="font-semibold text-slate-700 text-center">Вложения</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Траты</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Приход</TableHead>
              <TableHead className="font-semibold text-slate-700">Статья прихода/расхода</TableHead>
              {isAdmin && <TableHead className="text-right font-semibold text-slate-700">Действия</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={!userId ? (isAdmin ? 10 : 9) : (isAdmin ? 9 : 8)} 
                  className="text-center py-12 text-slate-500"
                >
                  {searchTerm ? "Транзакции не найдены" : "Нет транзакций"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="border-slate-100 hover:bg-slate-50/50">
                  {!userId && (
                    <TableCell className="text-sm font-medium">
                      {/* TODO: Add user name from profiles */}
                      Пользователь
                    </TableCell>
                  )}
                  <TableCell className="text-sm font-medium">
                    {formatDate(transaction.operation_date)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {transaction.events?.name || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {transaction.project_owner}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate text-sm" title={transaction.description}>
                      {transaction.description}
                    </div>
                    {transaction.notes && (
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {transaction.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(transaction.attachments_count && transaction.attachments_count > 0) || transaction.no_receipt ? (
                      <div className="flex items-center justify-center gap-1">
                        {transaction.attachments_count && transaction.attachments_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-gray-600">{transaction.attachments_count}</span>
                          </div>
                        )}
                        {transaction.no_receipt && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50">
                            Нет чека
                          </Badge>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {transaction.expense_amount 
                      ? <span className="text-red-600">{formatCurrency(transaction.expense_amount)}</span>
                      : "—"
                    }
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {transaction.income_amount 
                      ? <span className="text-green-600">{formatCurrency(transaction.income_amount)}</span>
                      : "—"
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => onEdit?.(transaction)}
                            className="cursor-pointer text-sm"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(transaction.id)}
                            className="cursor-pointer text-red-600 text-sm"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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