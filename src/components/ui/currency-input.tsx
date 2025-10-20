import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface CurrencyInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

// Format number with spaces for thousands (no currency symbol)
const formatLiveCurrency = (value: string): string => {
  // Remove all non-digits
  const cleanValue = value.replace(/\D/g, '');
  
  if (!cleanValue) return '';
  
  // Format with spaces for thousands
  const formatted = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return formatted;
};

// Extract numeric value from formatted string (supports negative values)
const extractNumericValue = (formatted: string): number | undefined => {
  const cleaned = formatted.replace(/\D/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? undefined : num;
};

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "Введите сумму",
  disabled,
  className,
  onBlur,
  onFocus,
  ...props 
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when value prop changes (only if not focused)
  useEffect(() => {
    if (!isFocused) {
      if (value !== undefined && value !== 0) {
        const formatted = Math.abs(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        setDisplayValue(formatted + (value < 0 ? ' (-)' : ''));
      } else {
        setDisplayValue("");
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the final value on blur
    if (value !== undefined && value !== 0) {
      const formatted = Math.abs(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      setDisplayValue(formatted + (value < 0 ? ' (-)' : ''));
    } else {
      setDisplayValue("");
    }
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('');
      onChange(undefined);
      return;
    }
    
    // Check for negative indicator
    const isNegative = inputValue.includes('-') || inputValue.includes('(-)');
    
    // Remove currency symbol, spaces, and negative indicators for processing
    const cleanForProcessing = inputValue.replace(/[₽\s()-]/g, '');
    
    // Only allow digits (no decimals)
    const cleanValue = cleanForProcessing.replace(/\D/g, '');
    
    // Prevent leading zeros
    if (cleanValue.length > 1 && cleanValue[0] === '0') {
      return;
    }
    
    // Format with live mask
    const formatted = formatLiveCurrency(cleanValue);
    setDisplayValue(formatted + (isNegative ? ' (-)' : ''));
    
    // Extract numeric value and call onChange
    let numValue = extractNumericValue(formatted);
    if (numValue !== undefined && isNegative) {
      numValue = -Math.abs(numValue);
    }
    onChange(numValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow minus sign
    if (e.key === '-') {
      return;
    }
    
    // Allow backspace, delete, tab, escape, enter, arrows
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
        (e.ctrlKey && [65, 67, 86, 88, 90].indexOf(e.keyCode) !== -1)) {
      return;
    }
    
    // Allow only digits (no decimal separators)
    if (!((e.keyCode >= 48 && e.keyCode <= 57) || // Numbers 0-9
           (e.keyCode >= 96 && e.keyCode <= 105) || // Numpad 0-9
           e.keyCode === 189 || e.keyCode === 109)) { // Minus sign (regular and numpad)
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("text-base font-medium pr-8", className)} // Add padding for suffix
        style={{ fontSize: '16px' }} // Explicitly set font-size to prevent zoom on iOS
        {...props}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        ₽
      </span>
    </div>
  );
}