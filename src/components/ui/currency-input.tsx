import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { formatCurrency, formatAmount } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

interface CurrencyInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder,
  disabled,
  className,
  onBlur,
  onFocus,
  ...props 
}: CurrencyInputProps) {
  const { t } = useTranslation();
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when value prop changes
  useEffect(() => {
    if (isFocused) {
      // When focused, show raw number without formatting
      setDisplayValue(value && value > 0 ? value.toString() : "");
    } else {
      // When not focused, show formatted value with currency
      if (value && value > 0) {
        setDisplayValue(formatCurrency(value));
      } else {
        setDisplayValue("");
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Clear field if it shows 0 or format with currency
    const rawValue = value && value > 0 ? value.toString() : "";
    setDisplayValue(rawValue);
    
    // Select all content for quick replacement
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
    
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Format the value on blur
    if (value && value > 0) {
      setDisplayValue(formatCurrency(value));
    } else {
      setDisplayValue("");
    }
    
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Only allow digits and one decimal separator
    const cleanValue = inputValue.replace(/[^\d.,]/g, '').replace(',', '.');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Prevent leading zeros (except for 0.xx)
    if (cleanValue.length > 1 && cleanValue[0] === '0' && cleanValue[1] !== '.') {
      return;
    }

    setDisplayValue(cleanValue);
    
    // Convert to number and call onChange
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue) || numValue <= 0) {
      onChange(undefined);
    } else {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent minus sign
    if (e.key === '-') {
      e.preventDefault();
      return;
    }
    
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    
    // Ensure that it is a number or decimal point and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105) && e.keyCode !== 190 && e.keyCode !== 188) {
      e.preventDefault();
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      pattern="[0-9]*"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder || t('enterAmount')}
      disabled={disabled}
      className={className}
      {...props}
    />
  );
}