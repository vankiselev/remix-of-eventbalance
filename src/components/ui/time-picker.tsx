import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>(
  ({ value, onValueChange, className, placeholder = "Выберите время" }, ref) => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    const [selectedHour, selectedMinute] = value ? value.split(':') : ['', ''];

    const handleHourChange = (hour: string) => {
      const newTime = `${hour}:${selectedMinute || '00'}`;
      onValueChange?.(newTime);
    };

    const handleMinuteChange = (minute: string) => {
      const newTime = `${selectedHour || '00'}:${minute}`;
      onValueChange?.(newTime);
    };

    return (
      <div ref={ref} className={cn("flex gap-2", className)}>
        <Select value={selectedHour} onValueChange={handleHourChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="ЧЧ" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center text-muted-foreground">:</span>
        <Select value={selectedMinute} onValueChange={handleMinuteChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="ММ" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

TimePicker.displayName = "TimePicker";