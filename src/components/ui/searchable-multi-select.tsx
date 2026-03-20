import * as React from "react";
import { X, Search, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableMultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  /** Render extra content after each option (e.g. conflict badge) */
  renderOptionExtra?: (option: Option) => React.ReactNode;
  /** Custom border class for specific options (e.g. conflict highlight) */
  getOptionClassName?: (option: Option) => string;
  /** Called when clicking an unselected option that has a conflict */
  onConflictClick?: (option: Option) => boolean; // return true to prevent toggle
}

export function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Поиск...",
  emptyText = "Ничего не найдено",
  renderOptionExtra,
  getOptionClassName,
  onConflictClick,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOptions = options.filter((o) => selected.includes(o.id));

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      const opt = options.find((o) => o.id === id);
      if (opt && onConflictClick && onConflictClick(opt)) return;
      onChange([...selected, id]);
    }
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-[36px] w-full items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background",
            "hover:bg-accent/50 transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selectedOptions.length === 0 && "text-muted-foreground"
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-xs py-0.5">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((opt) => (
                <Badge
                  key={opt.id}
                  variant="secondary"
                  className="text-xs h-6 gap-1 pl-2 pr-1 font-normal"
                >
                  {opt.label}
                  {renderOptionExtra?.(opt)}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                    onClick={(e) => remove(opt.id, e)}
                    onKeyDown={(e) => { if (e.key === 'Enter') remove(opt.id, e as any); }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="max-h-[200px]">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">{emptyText}</div>
          ) : (
            <div className="p-1">
              {filtered.map((opt) => {
                const isSelected = selected.includes(opt.id);
                const extraClassName = getOptionClassName?.(opt) || "";
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left",
                      isSelected && "bg-accent",
                      extraClassName
                    )}
                    onClick={() => toggle(opt.id)}
                  >
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border flex-shrink-0",
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="flex-1 truncate">{opt.label}</span>
                    {renderOptionExtra?.(opt)}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
