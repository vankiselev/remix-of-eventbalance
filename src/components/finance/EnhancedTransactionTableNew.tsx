import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionFilter } from "./TransactionFilter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Eye,
  Paperclip,
  Clock,
  CheckCircle,
  XCircle,
  ZoomIn
} from "lucide-react";
import { TransactionDetailDialog } from './TransactionDetailDialog';
import { ReceiptPreview } from './ReceiptPreview';
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionTableProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: Transaction) => void;
}

export function EnhancedTransactionTable({ userId, isAdmin, onEdit }: TransactionTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use optimized hook with React Query caching
  const { transactions, isLoading } = useTransactions({ userId, isAdmin });

  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [sortField, setSortField] = useState<keyof Transaction>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [tableScale, setTableScale] = useState<string>("100");

  // Compact filters
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [selectedIncomes, setSelectedIncomes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Load scale from localStorage on mount
  useEffect(() => {
    const savedScale = localStorage.getItem('transaction-table-scale');
    if (savedScale) {
      setTableScale(savedScale);
    }
  }, []);

  // Save scale to localStorage when changed
  useEffect(() => {
    localStorage.setItem('transaction-table-scale', tableScale);
  }, [tableScale]);

  // Уникальные даты (конкретные дни)
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    transactions.forEach(t => {
      const dateStr = t.operation_date.split('T')[0];
      dates.add(dateStr);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a)).map(d => ({
      value: d,
      label: format(new Date(d), 'dd.MM.yyyy')
    }));
  }, [transactions]);

  // Уникальные периоды (месяцы)
  const availablePeriods = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const date = new Date(t.operation_date);
      const key = format(date, 'yyyy-MM');
      months.add(key);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)).map(m => {
      const label = format(new Date(m + '-01'), 'LLLL yyyy', { locale: ru });
      return {
        value: m,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      };
    });
  }, [transactions]);

  // Unique projects
  const availableProjects = useMemo(() => {
    const projects = new Set<string>();
    transactions.forEach(t => {
      if (t.static_project_name) projects.add(t.static_project_name);
      if (t.events?.name) projects.add(t.events.name);
    });
    return Array.from(projects).sort().map(p => ({ value: p, label: p }));
  }, [transactions]);

  // Unique expense amounts
  const uniqueExpenses = useMemo(() => {
    const expenses = new Set<number>();
    transactions.forEach(t => {
      if ((t.expense_amount || 0) > 0) expenses.add(t.expense_amount || 0);
    });
    return Array.from(expenses).sort((a, b) => b - a).map(e => ({ 
      value: String(e), 
      label: formatCurrency(e) 
    }));
  }, [transactions]);

  // Unique income amounts
  const uniqueIncomes = useMemo(() => {
    const incomes = new Set<number>();
    transactions.forEach(t => {
      if ((t.income_amount || 0) > 0) incomes.add(t.income_amount || 0);
    });
    return Array.from(incomes).sort((a, b) => b - a).map(i => ({ 
      value: String(i), 
      label: formatCurrency(i) 
    }));
  }, [transactions]);

  // All unique categories for filter
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category));
    return Array.from(cats).sort().map(c => ({ value: c, label: c }));
  }, [transactions]);

  // All unique project owners (wallets) for filter
  const allWallets = useMemo(() => {
    const ws = new Set<string>();
    transactions.forEach(t => {
      if (t.project_owner) ws.add(t.project_owner);
    });
    return Array.from(ws).sort().map(w => ({ value: w, label: w }));
  }, [transactions]);

  // Apply all filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      let filtered = [...transactions];

      // По конкретной дате
      if (selectedDates.length > 0) {
        filtered = filtered.filter(t => {
          const dateStr = t.operation_date.split('T')[0];
          return selectedDates.includes(dateStr);
        });
      }

      // По периоду (месяцу)
      if (selectedPeriods.length > 0) {
        filtered = filtered.filter(t => {
          const month = format(new Date(t.operation_date), 'yyyy-MM');
          return selectedPeriods.includes(month);
        });
      }
      
      // By project
      if (selectedProjects.length > 0) {
        filtered = filtered.filter(t => {
          const project = t.static_project_name || t.events?.name;
          return project && selectedProjects.includes(project);
        });
      }
      
      // By wallet (project owner)
      if (selectedWallets.length > 0) {
        filtered = filtered.filter(t => selectedWallets.includes(t.project_owner));
      }
      
      // By expense amount
      if (selectedExpenses.length > 0) {
        filtered = filtered.filter(t => selectedExpenses.includes(String(t.expense_amount)));
      }
      
      // By income amount
      if (selectedIncomes.length > 0) {
        filtered = filtered.filter(t => selectedIncomes.includes(String(t.income_amount)));
      }
      
      // By category
      if (selectedCategories.length > 0) {
        filtered = filtered.filter(t => selectedCategories.includes(t.category));
      }

      // Apply sorting unless default (created_at asc) to preserve import order
      if (!(sortField === "created_at" && sortDirection === "asc")) {
        filtered.sort((a, b) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;
          
          const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return sortDirection === "asc" ? result : -result;
        });
      }

      setFilteredTransactions(filtered);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [transactions, sortField, sortDirection, selectedDates, selectedPeriods, selectedProjects, 
      selectedWallets, selectedExpenses, selectedIncomes, selectedCategories]);

  // fetchTransactions is now handled by useTransactions hook

  const handleDelete = async (transactionId: string, createdBy: string) => {
    // Allow admins to delete any transaction, or users to delete their own
    if (!isAdmin && createdBy !== user?.id) return;

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

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить транзакцию",
      });
    }
  };

  const canEditTransaction = (transaction: Transaction) => {
    // Admins can edit any transaction, users can edit their own
    return isAdmin || transaction.created_by === user?.id;
  };

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getScaleStyles = () => {
    const scale = parseInt(tableScale) / 100;
    return {
      fontSize: `${scale}rem`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${100 / scale}%`,
    };
  };

  const getScaleClasses = () => {
    const scale = parseInt(tableScale);
    if (scale <= 20) return "text-[10px] leading-tight";
    if (scale <= 40) return "text-xs leading-tight";
    if (scale <= 60) return "text-xs leading-snug";
    if (scale <= 80) return "text-sm leading-snug";
    if (scale <= 100) return "text-sm leading-normal";
    if (scale <= 120) return "text-base leading-normal";
    if (scale <= 140) return "text-base leading-relaxed";
    return "text-lg leading-relaxed";
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const getProjectOwnerDisplay = (transaction: Transaction) => {
    const ownerRaw = transaction.project_owner;
    const category = transaction.category;
    
    if (!ownerRaw) return "—";

    const owner = ownerRaw.trim();

    // If already fully specified, return as is to avoid duplicates
    if (/^(Наличка|Корп\.\s*карта|ИП|Оплатил|Оплатила|Получил|Получила)/i.test(owner)) {
      return owner;
    }

    const baseOwner = owner.replace(/^Наличка\s+/i, '').trim();
    
    // Determine project type based on category and other factors
    if (category.includes("Корп") || category.includes("корп")) {
      return `Корп. карта ${baseOwner}`;
    } else if (category.includes("ИП") || category.includes("ип")) {
      return `ИП ${baseOwner}`;
    } else if (category.includes("клиент") || category.includes("Клиент")) {
      return "Оплатил(а) клиент";
    } else if (category.includes("Оплатил") || category.includes("оплатил")) {
      return `Оплатил${baseOwner === "Настя" || baseOwner === "Лера" ? "а" : ""} ${baseOwner}`;
    } else if (category.includes("Получил") || category.includes("получил")) {
      return `Получил${baseOwner === "Настя" || baseOwner === "Лера" ? "а" : ""} ${baseOwner}`;
    }
    // Default to "Наличка"
    return `Наличка ${baseOwner}`;
  };

  const getCashTypeBadge = (cashType: string | null) => {
    if (!cashType) return null;
    
    const cashTypes = {
      nastya: { label: "Настя", className: "badge-nastya" },
      lera: { label: "Лера", className: "badge-lera" },
      vanya: { label: "Ваня", className: "badge-vanya" }
    };

    const type = cashTypes[cashType as keyof typeof cashTypes];
    if (!type) return null;

    return (
      <Badge variant="outline" className={`${type.className} text-xs`}>
        {type.label}
      </Badge>
    );
  };

  const getUserDisplayName = (profile: { full_name: string; email: string } | null, userId: string) => {
    // Special case for admin user (super admin email)
    if (profile?.email === 'ikiselev@me.com') {
      return 'Иван';
    }
    
    // If we have full_name from profile, use it
    if (profile?.full_name && profile.full_name !== 'User') {
      return profile.full_name;
    }
    
    // Fallback to email prefix
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    
    // Final fallback
    return 'Без имени';
  };

  const getVerificationStatusBadge = (status: string | undefined) => {
    if (!status || status === 'not_required') return null;

    const statusConfig = {
      pending: { label: "На проверке", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      approved: { label: "Утверждено", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-300" },
      rejected: { label: "Отклонено", variant: "destructive" as const, className: "bg-red-100 text-red-800 border-red-300" }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <Badge variant={config.variant} className={`${config.className} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  // Show skeleton while loading initially (no cached data)
  if (isLoading && transactions.length === 0) {
    return (
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <div className="overflow-x-auto">
          <Skeleton className="h-10 w-full mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-1" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <TransactionFilter
          column="date"
          title={selectedDates.length > 0 ? `Дата: ${selectedDates.length}` : "Дата"}
          options={availableDates}
          selectedValues={selectedDates}
          onFilterChange={setSelectedDates}
          onReset={() => setSelectedDates([])}
        />

        <TransactionFilter
          column="project"
          title={selectedProjects.length > 0 ? `Проект: ${selectedProjects.length}` : "Проект"}
          options={availableProjects}
          selectedValues={selectedProjects}
          onFilterChange={setSelectedProjects}
          onReset={() => setSelectedProjects([])}
        />

        <TransactionFilter
          column="wallet"
          title={selectedWallets.length > 0 ? `Кошельки: ${selectedWallets.length}` : "Кошельки"}
          options={allWallets}
          selectedValues={selectedWallets}
          onFilterChange={setSelectedWallets}
          onReset={() => setSelectedWallets([])}
        />

        <TransactionFilter
          column="expense"
          title={selectedExpenses.length > 0 ? `Трата: ${selectedExpenses.length}` : "Трата"}
          options={uniqueExpenses}
          selectedValues={selectedExpenses}
          onFilterChange={setSelectedExpenses}
          onReset={() => setSelectedExpenses([])}
        />

        <TransactionFilter
          column="income"
          title={selectedIncomes.length > 0 ? `Приход: ${selectedIncomes.length}` : "Приход"}
          options={uniqueIncomes}
          selectedValues={selectedIncomes}
          onFilterChange={setSelectedIncomes}
          onReset={() => setSelectedIncomes([])}
        />

        <TransactionFilter
          column="category"
          title={selectedCategories.length > 0 ? `Категория: ${selectedCategories.length}` : "Категория"}
          options={allCategories}
          selectedValues={selectedCategories}
          onFilterChange={setSelectedCategories}
          onReset={() => setSelectedCategories([])}
        />

        <TransactionFilter
          column="period"
          title={selectedPeriods.length > 0 ? `Период: ${selectedPeriods.length}` : "Период"}
          options={availablePeriods}
          selectedValues={selectedPeriods}
          onFilterChange={setSelectedPeriods}
          onReset={() => setSelectedPeriods([])}
        />
      </div>

      {/* Scale Control */}
      <div className="flex justify-end">
        <Select value={tableScale} onValueChange={setTableScale}>
          <SelectTrigger className="w-[120px]">
            <ZoomIn className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Масштаб" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg z-50 max-h-60 overflow-y-auto">
            <SelectItem value="5">5%</SelectItem>
            <SelectItem value="10">10%</SelectItem>
            <SelectItem value="20">20%</SelectItem>
            <SelectItem value="30">30%</SelectItem>
            <SelectItem value="40">40%</SelectItem>
            <SelectItem value="50">50%</SelectItem>
            <SelectItem value="60">60%</SelectItem>
            <SelectItem value="70">70%</SelectItem>
            <SelectItem value="75">75%</SelectItem>
            <SelectItem value="80">80%</SelectItem>
            <SelectItem value="90">90%</SelectItem>
            <SelectItem value="100">100%</SelectItem>
            <SelectItem value="110">110%</SelectItem>
            <SelectItem value="120">120%</SelectItem>
            <SelectItem value="125">125%</SelectItem>
            <SelectItem value="130">130%</SelectItem>
            <SelectItem value="140">140%</SelectItem>
            <SelectItem value="150">150%</SelectItem>
            <SelectItem value="160">160%</SelectItem>
            <SelectItem value="170">170%</SelectItem>
            <SelectItem value="180">180%</SelectItem>
            <SelectItem value="200">200%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modern Table */}
      <div className="card-modern overflow-hidden">
        <div className="overflow-x-auto">
            <div className="min-w-max">
              <table className={`w-full border-collapse border border-border resizable-table ${getScaleClasses()}`}>
              <thead className="sticky top-0 z-10 bg-background">
                <tr>
                  {!userId && (
                    <th 
                      className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                      style={{ resize: 'horizontal', minWidth: '120px', width: '150px' }}
                    >
                      Имя
                    </th>
                  )}
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '120px', width: '140px' }}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("operation_date")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Дата операции
                    </Button>
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '120px', width: '180px' }}
                  >
                    Проект
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '100px', width: '140px' }}
                  >
                    Чей проект
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '200px', width: '300px' }}
                  >
                    Подробное описание
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '100px', width: '120px' }}
                  >
                    Траты
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '100px', width: '120px' }}
                  >
                    Приход
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '150px', width: '200px' }}
                  >
                    Статья прихода/расхода
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '120px', width: '150px' }}
                  >
                    Скриншот чека
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '100px', width: '120px' }}
                  >
                    Статус
                  </th>
                  <th 
                    className="border border-border p-2 text-center text-sm font-medium bg-white resize-x overflow-hidden"
                    style={{ resize: 'horizontal', minWidth: '100px', width: '120px' }}
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={!userId ? 13 : 12} 
                      className="border border-border p-12 text-center text-slate-500"
                    >
                      {(selectedDates.length > 0 || selectedProjects.length > 0 || selectedWallets.length > 0 || 
                        selectedExpenses.length > 0 || selectedIncomes.length > 0 || selectedCategories.length > 0) 
                        ? "Транзакции не найдены" : "Нет транзакций"}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      {!userId && (
                        <td className="border border-border p-2 text-center align-middle bg-white font-medium">
                          {transaction.user_name}
                        </td>
                      )}
                      <td className="border border-border p-2 text-center align-middle bg-white font-medium">
                        {formatDate(transaction.operation_date)}
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white">
                        {transaction.static_project_name || transaction.events?.name || "—"}
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white">
                        {getProjectOwnerDisplay(transaction)}
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white max-w-xs">
                        <div className="truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                        {transaction.notes && (
                          <div className="text-slate-500 mt-1 truncate opacity-75">
                            {transaction.notes}
                          </div>
                        )}
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white text-right font-medium">
                        {transaction.expense_amount 
                          ? <span className="text-red-600">{formatCurrency(transaction.expense_amount)}</span>
                          : "—"
                        }
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white text-right font-medium">
                        {transaction.income_amount 
                          ? <span className="text-green-600">{formatCurrency(transaction.income_amount)}</span>
                          : "—"
                        }
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white">
                        {transaction.category}
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white">
                        <ReceiptPreview
                          transactionId={transaction.id}
                          attachmentsCount={transaction.attachments_count}
                          noReceipt={transaction.no_receipt}
                          noReceiptReason={transaction.no_receipt_reason}
                        />
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white">
                        {getVerificationStatusBadge(transaction.verification_status)}
                      </td>
                      <td className="border border-border p-2 text-center align-middle bg-white">
                        {transaction.category === 'Передано или получено от сотрудника' && transaction.transfer_status && (
                          <div className="flex items-center justify-center gap-1">
                            {transaction.transfer_status === 'pending' && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                <Clock className="h-3 w-3 mr-1" />
                                Ожидает
                              </Badge>
                            )}
                            {transaction.transfer_status === 'accepted' && (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Принято
                              </Badge>
                            )}
                            {transaction.transfer_status === 'rejected' && (
                              <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                                <XCircle className="h-3 w-3 mr-1" />
                                Отклонено
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      {canEditTransaction(transaction) && (
                        <td className="border border-border p-2 text-center align-middle bg-white text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white border border-slate-200 shadow-lg z-50">
                              <DropdownMenuItem 
                                onClick={() => handleViewDetails(transaction)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Просмотр
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onEdit?.(transaction)}
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(transaction.id, transaction.created_by)}
                                className="cursor-pointer text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        isOpen={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        canEdit={selectedTransaction ? canEditTransaction(selectedTransaction) : false}
      />
    </div>
  );
}