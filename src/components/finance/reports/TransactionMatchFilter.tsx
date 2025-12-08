import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, CalendarDays, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export interface TransactionFilters {
  search: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  amountMin: number | null;
  amountMax: number | null;
  unmatchedOnly: boolean;
}

interface TransactionMatchFilterProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export const getDefaultFilters = (): TransactionFilters => ({
  search: "",
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  unmatchedOnly: false,
});

export const TransactionMatchFilter = ({ filters, onChange }: TransactionMatchFilterProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const hasActiveFilters = 
    filters.search || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.amountMin !== null || 
    filters.amountMax !== null ||
    filters.unmatchedOnly;

  const clearFilters = () => {
    onChange(getDefaultFilters());
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по описанию..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        
        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant={hasActiveFilters ? "secondary" : "outline"} size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="font-medium">Расширенные фильтры</div>
              
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm">Период</Label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, 'dd.MM.yy') : 'От'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom || undefined}
                        onSelect={(date) => onChange({ ...filters, dateFrom: date || null })}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">—</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, 'dd.MM.yy') : 'До'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo || undefined}
                        onSelect={(date) => onChange({ ...filters, dateTo: date || null })}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Amount Range */}
              <div className="space-y-2">
                <Label className="text-sm">Сумма</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="От"
                    value={filters.amountMin ?? ''}
                    onChange={(e) => onChange({ ...filters, amountMin: e.target.value ? Number(e.target.value) : null })}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="number"
                    placeholder="До"
                    value={filters.amountMax ?? ''}
                    onChange={(e) => onChange({ ...filters, amountMax: e.target.value ? Number(e.target.value) : null })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              {/* Unmatched Only */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unmatchedOnly"
                  checked={filters.unmatchedOnly}
                  onCheckedChange={(checked) => onChange({ ...filters, unmatchedOnly: !!checked })}
                />
                <Label htmlFor="unmatchedOnly" className="text-sm cursor-pointer">
                  Только несопоставленные
                </Label>
              </div>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                  <X className="mr-2 h-4 w-4" />
                  Сбросить фильтры
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="unmatchedOnlyQuick"
          checked={filters.unmatchedOnly}
          onCheckedChange={(checked) => onChange({ ...filters, unmatchedOnly: !!checked })}
        />
        <Label htmlFor="unmatchedOnlyQuick" className="text-sm cursor-pointer text-muted-foreground">
          Только несопоставленные
        </Label>
      </div>
    </div>
  );
};
