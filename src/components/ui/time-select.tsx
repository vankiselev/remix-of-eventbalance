import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Generate time slots with 30-min steps
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimeSelect({ value, onChange, placeholder = "Время", className }: TimeSelectProps) {
  // Normalize value to HH:MM
  const normalized = value ? value.substring(0, 5) : "";
  
  return (
    <Select value={normalized} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", className)}>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[240px]">
        {TIME_SLOTS.map((slot) => (
          <SelectItem key={slot} value={slot} className="text-sm">
            {slot}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
