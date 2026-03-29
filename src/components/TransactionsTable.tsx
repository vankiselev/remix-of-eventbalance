import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatCurrency";
import { Edit, Trash2, Search, Filter, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletNames } from "@/hooks/useWalletNames";

interface Transaction {
  id: string;
  operation_date: string;
  project_owner: string;
  description: string;
  income_amount: number;
  expense_amount: number;
  category: string;
  cash_type?: string;
  project_id?: string;
  events?: { name: string };
}

interface TransactionsTableProps {
  transactions: Transaction[];
  canEdit?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  onAdd?: () => void;
  userName?: string;
}

export function TransactionsTable({ 
  transactions, 
  canEdit = false, 
  onEdit, 
  onDelete,
  onAdd,
  userName
}: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<"operation_date" | "amount">("operation_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { user } = useAuth();

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.project_owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.events?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === "operation_date") {
        aValue = new Date(a.operation_date).getTime();
        bValue = new Date(b.operation_date).getTime();
      } else {
        aValue = a.income_amount > 0 ? a.income_amount : a.expense_amount;
        bValue = b.income_amount > 0 ? b.income_amount : b.expense_amount;
      }
      
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  const getCashTypeDisplay = (cashType?: string) => {
    return getWalletDisplayName(cashType);
  };

  const getCategoryDisplay = (category: string) => {
    const categories: Record<string, string> = {
      'catering': 'Кейтеринг',
      'venue': 'Аренда площадки',
      'equipment': 'Оборудование',
      'decoration': 'Декор',
      'staff': 'Персонал',
      'marketing': 'Маркетинг',
      'transport': 'Транспорт',
      'materials': 'Материалы',
      'services': 'Услуги',
      'other': 'Прочее'
    };
    return categories[category] || category;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>
              {userName ? `Транзакции сотрудника: ${userName}` : "Ваши транзакции"}
            </CardTitle>
            <CardDescription>
              {canEdit ? "Вы можете редактировать и удалять записи" : "Просмотр транзакций"}
            </CardDescription>
          </div>
          {canEdit && onAdd && (
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить транзакцию
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по описанию, проекту..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Фильтр по категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="catering">Кейтеринг</SelectItem>
              <SelectItem value="venue">Аренда площадки</SelectItem>
              <SelectItem value="equipment">Оборудование</SelectItem>
              <SelectItem value="decoration">Декор</SelectItem>
              <SelectItem value="staff">Персонал</SelectItem>
              <SelectItem value="marketing">Маркетинг</SelectItem>
              <SelectItem value="transport">Транспорт</SelectItem>
              <SelectItem value="materials">Материалы</SelectItem>
              <SelectItem value="services">Услуги</SelectItem>
              <SelectItem value="other">Прочее</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortField}-${sortDirection}`} onValueChange={(value) => {
            const [field, direction] = value.split('-');
            setSortField(field as "operation_date" | "amount");
            setSortDirection(direction as "asc" | "desc");
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operation_date-desc">Дата (новые)</SelectItem>
              <SelectItem value="operation_date-asc">Дата (старые)</SelectItem>
              <SelectItem value="amount-desc">Сумма (больше)</SelectItem>
              <SelectItem value="amount-asc">Сумма (меньше)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата операции</TableHead>
                <TableHead>Проект</TableHead>
                <TableHead>Чей проект</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Тип наличных</TableHead>
                <TableHead>Статья</TableHead>
                <TableHead className="text-right">Траты</TableHead>
                <TableHead className="text-right">Приход</TableHead>
                {canEdit && <TableHead className="text-right">Действия</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 8} className="text-center py-8 text-muted-foreground">
                    Транзакции не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.operation_date)}</TableCell>
                    <TableCell>
                      {transaction.events?.name || "Без проекта"}
                    </TableCell>
                    <TableCell>{transaction.project_owner}</TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCashTypeDisplay(transaction.cash_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getCategoryDisplay(transaction.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.expense_amount > 0 && (
                        <span className="text-red-600 font-medium">
                          -{formatCurrency(transaction.expense_amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.income_amount > 0 && (
                        <span className="text-green-600 font-medium">
                          +{formatCurrency(transaction.income_amount)}
                        </span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(transaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </CardContent>
    </Card>
  );
}