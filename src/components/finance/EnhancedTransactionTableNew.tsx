import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Search,
  Paperclip,
  Eye,
  ZoomIn,
  ImageIcon,
  FileIcon
} from "lucide-react";
import { TransactionDetailDialog } from './TransactionDetailDialog';
import { ReceiptPreview } from './ReceiptPreview';

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
  created_at: string;
  user_name?: string;
  static_project_name?: string;
}

interface TransactionTableProps {
  userId?: string;
  isAdmin: boolean;
  onEdit?: (transaction: Transaction) => void;
}

export function EnhancedTransactionTable({ userId, isAdmin, onEdit }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Transaction>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [tableScale, setTableScale] = useState<string>("100");
  const { toast } = useToast();
  const { user } = useAuth();

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

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  // Realtime subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel('transactions-table-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_transactions'
        },
        (payload) => {
          console.log('Transaction table change detected:', payload);
          fetchTransactions(); // Refresh table on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.project_owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.static_project_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.events?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
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
        .order("created_at", { ascending: true });

      // If not admin or specific userId provided, filter by user
      if (!isAdmin || userId) {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique user IDs to fetch their profiles
      const userIds = Array.from(new Set((data || []).map(t => t.created_by)));
      
      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create user map for quick lookup
      const userMap = new Map((profilesData || []).map(profile => [profile.id, profile]));

      // Transform the data to flatten attachments_count and add user name
      const transformedData = (data || []).map(transaction => ({
        ...transaction,
        attachments_count: transaction.attachments_count?.[0]?.count || 0,
        user_name: getUserDisplayName(userMap.get(transaction.created_by) || null, transaction.created_by)
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
    <div className="space-y-4">
      {/* Search and Scale */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по описанию, проекту, категории..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
          />
        </div>

        <Select value={tableScale} onValueChange={setTableScale}>
          <SelectTrigger className="w-full sm:w-[120px]">
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
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={!userId ? 11 : 10} 
                      className="border border-border p-12 text-center text-slate-500"
                    >
                      {searchTerm ? "Транзакции не найдены" : "Нет транзакций"}
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