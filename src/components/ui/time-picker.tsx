import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Hours ordered starting from 12 for convenience
const HOURS_ORDERED = [
  "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23",
  "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11",
];
const MINUTES = ["00", "30"];

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

  // Scroll to selected hour (or default 12) when opening
  React.useEffect(() => {
    if (open && hourRef.current) {
      const target = selectedHour || "12";
      const idx = HOURS_ORDERED.indexOf(target);
      if (idx >= 0) {
        requestAnimationFrame(() => {
          const el = hourRef.current?.children[idx] as HTMLElement;
          if (el) {
            el.scrollIntoView({ block: "center", behavior: "instant" });
          }
        });
      }
    }
  }, [open, selectedHour]);

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
        <div className="flex divide-x" style={{ height: 200 }}>
          {/* Hours column */}
          <div
            ref={hourRef}
            className="flex-1 overflow-y-auto py-1"
            style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
          >
            {HOURS_ORDERED.map((h) => (
              <button
                key={h}
                type="button"
                className={cn(
                  "w-full py-1.5 text-center text-sm transition-colors rounded-sm mx-auto",
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
