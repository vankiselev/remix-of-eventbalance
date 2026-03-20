import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// 12 in the middle: 11→00 descending above, then 12, then 13→23 ascending below
const HOURS_ORDERED = [
  "11","10","09","08","07","06","05","04","03","02","01","00",
  "12",
  "13","14","15","16","17","18","19","20","21","22","23",
];
const MINUTES = ["00", "30"];

const CENTER_HOUR = "12";
const CENTER_IDX = HOURS_ORDERED.indexOf(CENTER_HOUR);

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePicker({ value, onChange, placeholder = "Время", className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const normalized = value ? value.substring(0, 5) : "";
  const [selectedHour, selectedMinute] = normalized
    ? normalized.split(":")
    : ["", ""];

  const hourRef = React.useRef<HTMLDivElement>(null);

  // Scroll to 12 (center) when opening
  React.useEffect(() => {
    if (open && hourRef.current) {
      const container = hourRef.current;
      const el = container.children[CENTER_IDX] as HTMLElement;
      if (el) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const containerH = container.clientHeight;
            const elH = el.offsetHeight;
            container.scrollTop = el.offsetTop - (containerH / 2) + (elH / 2);
          });
        });
      }
    }
  }, [open]);

  const selectHour = (h: string) => {
    const min = selectedMinute || "00";
    onChange(`${h}:${min}`);
  };

  const selectMinute = (m: string) => {
    const hr = selectedHour || "12";
    onChange(`${hr}:${m}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm",
            "hover:bg-accent/50 transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !normalized && "text-muted-foreground",
            className
          )}
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span>{normalized || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="flex divide-x border-b px-1 py-1.5">
          <div className="flex-1 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Часы
          </div>
          <div className="flex-1 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Минуты
          </div>
        </div>
        <div className="flex divide-x h-[200px]">
          {/* Hours column */}
          <div
            ref={hourRef}
            className="flex-1 overflow-y-scroll overscroll-contain py-1"
          >
            {HOURS_ORDERED.map((h) => (
              <button
                key={h}
                type="button"
                className={cn(
                  "w-full py-1.5 text-center text-sm transition-colors rounded-sm",
                  selectedHour === h
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent"
                )}
                onClick={() => selectHour(h)}
              >
                {h}
              </button>
            ))}
          </div>
          {/* Minutes column */}
          <div className="flex-1 flex flex-col items-stretch justify-center gap-1 py-1 px-2">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                className={cn(
                  "py-2.5 text-center text-sm rounded-md transition-colors",
                  selectedMinute === m
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent"
                )}
                onClick={() => selectMinute(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
