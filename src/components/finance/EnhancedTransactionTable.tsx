import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  User
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
  events?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

interface TransactionTableProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: Transaction) => void;
}

interface SortConfig {
  field: keyof Transaction | 'project_name' | 'creator_name';
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string[];
}

export function EnhancedTransactionTable({ userId, isAdmin, onEdit }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "operation_date", direction: "desc" });
  const [filters, setFilters] = useState<FilterConfig>({});
  const { toast } = useToast();

  // Get unique values for filters
  const getUniqueValues = (field: string) => {
    const values = transactions.map(t => {
      switch (field) {
        case 'project_name':
          return t.events?.name || 'Без проекта';
        case 'project_owner':
          return t.project_owner;
        case 'category':
          return t.category;
        case 'cash_type':
          return t.cash_type ? getCashTypeDisplay(t.cash_type) : 'Не указано';
        case 'creator_name':
          return t.profiles?.full_name || 'Неизвестно';
        default:
          return '';
      }
    }).filter(Boolean);
    return [...new Set(values)].sort();
  };

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [transactions, searchTerm, sortConfig, filters]);

  const fetchTransactions = async () => {
    try {
      setError(null);
      setLoading(true);
      
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          events:project_id(name)
        `)
        .order("operation_date", { ascending: false });

      // If specific userId provided, filter by that user
      if (userId) {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names separately for admin view
      const transactionsWithProfiles = isAdmin && !userId ? await Promise.all(
        (data || []).map(async (transaction) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", transaction.created_by)
            .single();
          
          return {
            ...transaction,
            profiles: profile ? { full_name: profile.full_name } : null
          };
        })
      ) : (data || []).map(item => ({ ...item, profiles: null }));

      setTransactions(transactionsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      setError(null); // Don't show error state, just show empty state
      setTransactions([]);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить транзакции",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.project_owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.events?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([field, selectedValues]) => {
      if (selectedValues.length > 0) {
        filtered = filtered.filter(transaction => {
          let value = '';
          switch (field) {
            case 'project_name':
              value = transaction.events?.name || 'Без проекта';
              break;
            case 'project_owner':
              value = transaction.project_owner;
              break;
            case 'category':
              value = transaction.category;
              break;
            case 'cash_type':
              value = transaction.cash_type ? getCashTypeDisplay(transaction.cash_type) : 'Не указано';
              break;
            case 'creator_name':
              value = transaction.profiles?.full_name || 'Неизвестно';
              break;
          }
          return selectedValues.includes(value);
        });
      }
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'project_name':
          aValue = a.events?.name || '';
          bValue = b.events?.name || '';
          break;
        case 'creator_name':
          aValue = a.profiles?.full_name || '';
          bValue = b.profiles?.full_name || '';
          break;
        case 'expense_amount':
          aValue = a.expense_amount || 0;
          bValue = b.expense_amount || 0;
          break;
        case 'income_amount':
          aValue = a.income_amount || 0;
          bValue = b.income_amount || 0;
          break;
        default:
          aValue = a[sortConfig.field as keyof Transaction];
          bValue = b[sortConfig.field as keyof Transaction];
      }
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortConfig.direction === "asc" ? result : -result;
    });

    setFilteredTransactions(filtered);
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

  const handleSort = (field: keyof Transaction | 'project_name' | 'creator_name') => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleFilterChange = (field: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const fieldFilters = prev[field] || [];
      if (checked) {
        return { ...prev, [field]: [...fieldFilters, value] };
      } else {
        return { ...prev, [field]: fieldFilters.filter(v => v !== value) };
      }
    });
  };

  const clearFilter = (field: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const getCashTypeDisplay = (cashType: string) => {
    const types = {
      nastya: "Настя",
      lera: "Лера", 
      vanya: "Ваня"
    };
    return types[cashType as keyof typeof types] || cashType;
  };

  const getCashTypeBadge = (cashType: string | null) => {
    if (!cashType) return <span className="text-muted-foreground">—</span>;
    
    const cashTypes = {
      nastya: { label: "Настя", className: "bg-blue-100 text-blue-800" },
      lera: { label: "Лера", className: "bg-green-100 text-green-800" },
      vanya: { label: "Ваня", className: "bg-purple-100 text-purple-800" }
    };

    const type = cashTypes[cashType as keyof typeof cashTypes];
    if (!type) return <span className="text-muted-foreground">{cashType}</span>;

    return (
      <Badge variant="outline" className={`${type.className} text-xs`}>
        {type.label}
      </Badge>
    );
  };

  const SortableHeader = ({ 
    field, 
    children, 
    className = "" 
  }: { 
    field: keyof Transaction | 'project_name' | 'creator_name'; 
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortConfig.field === field;
    return (
      <TableHead className={`${className}`}>
        <Button
          variant="ghost"
          onClick={() => handleSort(field)}
          className="h-auto p-0 font-semibold text-black hover:text-gray-700 justify-start"
        >
          {children}
          {isActive ? (
            sortConfig.direction === "asc" ? 
            <ArrowUp className="ml-2 h-4 w-4" /> : 
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-40" />
          )}
        </Button>
      </TableHead>
    );
  };

  const FilterDropdown = ({ field, label }: { field: string; label: string }) => {
    const uniqueValues = getUniqueValues(field);
    const activeFilters = filters[field] || [];
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className={`h-6 w-6 p-0 ${activeFilters.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Filter className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{label}</p>
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter(field)}
                  className="h-auto p-0 text-xs text-muted-foreground"
                >
                  Очистить
                </Button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {uniqueValues.map(value => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field}-${value}`}
                    checked={activeFilters.includes(value)}
                    onCheckedChange={(checked) => 
                      handleFilterChange(field, value, checked as boolean)
                    }
                  />
                  <label 
                    htmlFor={`${field}-${value}`}
                    className="text-sm cursor-pointer truncate"
                  >
                    {value}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по описанию, проекту, категории, имени..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {isAdmin && (
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold text-black">Имя</span>
                    <FilterDropdown field="creator_name" label="Фильтр по имени" />
                  </div>
                </TableHead>
              )}
              <SortableHeader field="operation_date" className="text-center">
                Дата операции
              </SortableHeader>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-semibold text-black">Проект</span>
                  <FilterDropdown field="project_name" label="Фильтр по проекту" />
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-semibold text-black">Чей проект</span>
                  <FilterDropdown field="project_owner" label="Фильтр по владельцу" />
                </div>
              </TableHead>
              <SortableHeader field="description" className="text-center">
                Подробное описание
              </SortableHeader>
              <SortableHeader field="expense_amount" className="text-center">
                Траты
              </SortableHeader>
              <SortableHeader field="income_amount" className="text-center">
                Приход
              </SortableHeader>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-semibold text-black">Статья прихода/расхода</span>
                  <FilterDropdown field="category" label="Фильтр по категории" />
                </div>
              </TableHead>
              {isAdmin && <TableHead className="text-center font-semibold text-black">Действия</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell 
                  colSpan={isAdmin ? 9 : 7} 
                  className="text-center py-12 text-red-600"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={isAdmin ? 9 : 7} 
                  className="text-center py-12 text-muted-foreground"
                >
                  {searchTerm || Object.keys(filters).length > 0 ? "Транзакции не найдены" : "Транзакций пока нет"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/30">
                  {isAdmin && (
                    <TableCell className="text-center align-middle">
                      <div className="text-sm font-medium">
                        {transaction.profiles?.full_name || "Неизвестно"}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-center align-middle">
                    <div className="text-sm font-medium">
                      {formatDate(transaction.operation_date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <div className="text-sm">
                      {transaction.events?.name || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <div className="text-sm">
                      {transaction.project_owner}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle max-w-xs">
                    <div className="text-sm" title={transaction.description}>
                      {transaction.description}
                    </div>
                    {transaction.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {transaction.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    {transaction.expense_amount 
                      ? <span className="text-red-600 font-medium">{formatCurrency(transaction.expense_amount)}</span>
                      : "—"
                    }
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    {transaction.income_amount 
                      ? <span className="text-green-600 font-medium">{formatCurrency(transaction.income_amount)}</span>
                      : "—"
                    }
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <Badge variant="outline" className="text-xs">
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-white">
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