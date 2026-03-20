import * as React from "react";
import { X, Search, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  avatarUrl?: string | null;
}

interface SearchableMultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  showAvatars?: boolean;
  renderOptionExtra?: (option: Option) => React.ReactNode;
  getOptionClassName?: (option: Option) => string;
  onConflictClick?: (option: Option) => boolean;
}

const getInitials = (name: string) => {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Поиск...",
  emptyText = "Ничего не найдено",
  showAvatars = false,
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
            <span className="text-xs py-0.5 flex items-center gap-1.5">
              <Search className="h-3 w-3" />
              {placeholder}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((opt) => (
                <Badge
                  key={opt.id}
                  variant="secondary"
                  className="text-xs h-6 gap-1 pl-1 pr-1 font-normal"
                >
                  {showAvatars && (
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={opt.avatarUrl || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {getInitials(opt.label)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="px-0.5">{opt.label}</span>
                  {renderOptionExtra?.(opt)}
                  <span
                    role="button"
                    tabIndex={0}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
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
        <ScrollArea className="max-h-[220px]">
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
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left",
                      isSelected && "bg-accent",
                      extraClassName
                    )}
                    onClick={() => toggle(opt.id)}
                  >
                    {showAvatars ? (
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={opt.avatarUrl || undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                          {getInitials(opt.label)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border flex-shrink-0",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    )}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {showAvatars && isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
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
