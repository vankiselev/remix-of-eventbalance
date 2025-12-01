import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TransactionFilter } from "./TransactionFilter";
import { Search, X, CalendarIcon, ChevronDown, Filter } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface TransactionFiltersPanelProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  expenseMin: string;
  expenseMax: string;
  onExpenseMinChange: (value: string) => void;
  onExpenseMaxChange: (value: string) => void;
  incomeMin: string;
  incomeMax: string;
  onIncomeMinChange: (value: string) => void;
  onIncomeMaxChange: (value: string) => void;
  selectedCategories: string[];
  onCategoriesChange: (values: string[]) => void;
  selectedWallets: string[];
  onWalletsChange: (values: string[]) => void;
  categories: FilterOption[];
  wallets: FilterOption[];
  onResetAll: () => void;
}

export const TransactionFiltersPanel = ({
  searchTerm,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  expenseMin,
  expenseMax,
  onExpenseMinChange,
  onExpenseMaxChange,
  incomeMin,
  incomeMax,
  onIncomeMinChange,
  onIncomeMaxChange,
  selectedCategories,
  onCategoriesChange,
  selectedWallets,
  onWalletsChange,
  categories,
  wallets,
  onResetAll
}: TransactionFiltersPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFiltersCount = [
    searchTerm,
    dateFrom,
    dateTo,
    expenseMin,
    expenseMax,
    incomeMin,
    incomeMax,
    selectedCategories.length > 0,
    selectedWallets.length > 0
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Main Search Bar with Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по описанию, заметкам, проекту..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={activeFiltersCount > 0 ? "default" : "outline"}
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Фильтры
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="icon" onClick={onResetAll}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Extended Filters Panel */}
      {isExpanded && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Дата от</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd.MM.yyyy', { locale: ru }) : 'Выберите'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={onDateFromChange}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Дата до</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd.MM.yyyy', { locale: ru }) : 'Выберите'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={onDateToChange}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Amount Ranges */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Трата (руб.)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="От"
                  value={expenseMin}
                  onChange={(e) => onExpenseMinChange(e.target.value)}
                  className="h-9"
                />
                <Input
                  type="number"
                  placeholder="До"
                  value={expenseMax}
                  onChange={(e) => onExpenseMaxChange(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Приход (руб.)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="От"
                  value={incomeMin}
                  onChange={(e) => onIncomeMinChange(e.target.value)}
                  className="h-9"
                />
                <Input
                  type="number"
                  placeholder="До"
                  value={incomeMax}
                  onChange={(e) => onIncomeMaxChange(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Category and Wallet Multi-Select Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Категории</Label>
              <TransactionFilter
                column="category"
                title={selectedCategories.length > 0 ? `Выбрано: ${selectedCategories.length}` : "Все категории"}
                options={categories}
                selectedValues={selectedCategories}
                onFilterChange={onCategoriesChange}
                onReset={() => onCategoriesChange([])}
              />
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Кошельки</Label>
              <TransactionFilter
                column="wallet"
                title={selectedWallets.length > 0 ? `Выбрано: ${selectedWallets.length}` : "Все кошельки"}
                options={wallets}
                selectedValues={selectedWallets}
                onFilterChange={onWalletsChange}
                onReset={() => onWalletsChange([])}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
