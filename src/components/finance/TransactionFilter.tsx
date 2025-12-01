import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Search, X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface TransactionFilterProps {
  column: string;
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onFilterChange: (values: string[]) => void;
  onReset: () => void;
}

export const TransactionFilter = ({
  column,
  title,
  options,
  selectedValues,
  onFilterChange,
  onReset
}: TransactionFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<FilterOption[]>(options);

  useEffect(() => {
    if (searchTerm) {
      const normalizedSearch = normalizeForSearch(searchTerm);
      // Если поиск состоит только из цифр — ищем с начала строки
      const isNumericSearch = /^\d+$/.test(normalizedSearch);
      
      setFilteredOptions(
        options.filter(option => {
          const normalizedLabel = normalizeForSearch(option.label);
          const normalizedValue = normalizeForSearch(option.value);
          
          if (isNumericSearch) {
            // Для чисел — только совпадение с начала
            return normalizedLabel.startsWith(normalizedSearch) || 
                   normalizedValue.startsWith(normalizedSearch);
          } else {
            // Для текста — поиск в любом месте
            return normalizedLabel.includes(normalizedSearch) || 
                   normalizedValue.includes(normalizedSearch);
          }
        })
      );
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options]);

  const handleSelectAll = () => {
    onFilterChange(filteredOptions.map(option => option.value));
  };

  const handleDeselectAll = () => {
    onFilterChange([]);
  };

  const handleValueChange = (value: string, checked: boolean) => {
    if (checked) {
      onFilterChange([...selectedValues, value]);
    } else {
      onFilterChange(selectedValues.filter(v => v !== value));
    }
  };

  const normalizeForSearch = (str: string) => {
    return str.replace(/\s/g, '').replace(/₽/g, '').replace(/,/g, '').toLowerCase();
  };

  const hasActiveFilters = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`flex-1 justify-between text-xs font-medium h-9 ${
            hasActiveFilters ? 'border-primary bg-primary/5 text-primary' : ''
          }`}
        >
          <span className="truncate">{title}</span>
          <div className="flex items-center gap-1 ml-1">
            {hasActiveFilters && (
              <div className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                {selectedValues.length}
              </div>
            )}
            <ChevronDown className="h-3 w-3" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] sm:w-[500px] max-w-[500px] p-0" align="start" side="bottom">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <div className="p-2 border-b flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1 min-h-[44px]"
          >
            Выбрать все
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            className="flex-1 min-h-[44px]"
          >
            Сбросить
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="px-2 min-h-[44px] min-w-[44px]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-60" style={{ overscrollBehavior: 'contain' }}>
          <div className="p-2 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Ничего не найдено
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 hover:bg-muted/50 p-2 rounded"
                >
                  <Checkbox
                    id={`${column}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleValueChange(option.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`${column}-${option.value}`}
                    className="text-sm flex-1 cursor-pointer truncate"
                    title={option.label}
                  >
                    {option.label}
                  </label>
                  {option.count !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      ({option.count})
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};