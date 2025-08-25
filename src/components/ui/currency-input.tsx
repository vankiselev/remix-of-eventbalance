import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

// Format number as currency with live mask
const formatLiveCurrency = (value: string): string => {
  // Remove all non-digits except decimal separator
  const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
  
  if (!cleanValue || cleanValue === '.') return '';
  
  // Split by decimal point
  const parts = cleanValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Format integer part with spaces for thousands
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  // Combine with decimal part if exists
  let result = formattedInteger;
  if (decimalPart !== undefined) {
    result += '.' + decimalPart.slice(0, 2); // Limit to 2 decimal places
  }
  
  return result + ' ₽';
};

// Extract numeric value from formatted string
const extractNumericValue = (formatted: string): number | undefined => {
  const cleaned = formatted.replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? undefined : num;
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when value prop changes
  useEffect(() => {
    if (value && value > 0) {
      setDisplayValue(formatCurrency(value));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    // Format the final value on blur
    if (value && value > 0) {
      setDisplayValue(formatCurrency(value));
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
    
    // Remove currency symbol and spaces for processing
    const cleanForProcessing = inputValue.replace(/[₽\s]/g, '');
    
    // Only allow digits and one decimal separator
    const cleanValue = cleanForProcessing.replace(/[^\d.,]/g, '').replace(',', '.');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Prevent leading zeros (except for 0.xx)
    if (cleanValue.length > 1 && cleanValue[0] === '0' && cleanValue[1] !== '.') {
      return;
    }
    
    // Format with live mask
    const formatted = formatLiveCurrency(cleanValue);
    setDisplayValue(formatted);
    
    // Extract numeric value and call onChange
    const numValue = extractNumericValue(formatted);
    onChange(numValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent minus sign
    if (e.key === '-') {
      e.preventDefault();
      return;
    }
    
    // Allow backspace, delete, tab, escape, enter, arrows
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
        (e.ctrlKey && [65, 67, 86, 88, 90].indexOf(e.keyCode) !== -1)) {
      return;
    }
    
    // Allow digits and decimal separators
    if (!((e.keyCode >= 48 && e.keyCode <= 57) || // Numbers 0-9
           (e.keyCode >= 96 && e.keyCode <= 105) || // Numpad 0-9
           e.keyCode === 190 || e.keyCode === 188)) { // Decimal point and comma
      e.preventDefault();
    }
  };

  return (
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
      className={cn("text-base font-medium", className)} // Ensure font-size >= 16px for iOS
      style={{ fontSize: '16px' }} // Explicitly set font-size to prevent zoom on iOS
      {...props}
    />
  );
}