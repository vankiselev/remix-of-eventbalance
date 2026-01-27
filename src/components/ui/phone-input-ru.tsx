import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface PhoneInputRUProps {
  value?: string;
  onChange?: (result: { display: string; e164: string; isValid: boolean }) => void;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

// Утилиты для работы с телефонами
const normalizePhone = (input: string): string => {
  // Удаляем все не-цифры
  const digits = input.replace(/\D/g, '');
  
  // Если начинается с 8, заменяем на 7
  if (digits.startsWith('8') && digits.length === 11) {
    return '7' + digits.slice(1);
  }
  
  // Если начинается с 7 и больше 11 цифр, берем первые 11
  if (digits.startsWith('7') && digits.length > 11) {
    return digits.slice(0, 11);
  }
  
  // Если меньше 11 цифр и не начинается с 7, добавляем 7
  if (digits.length <= 10 && !digits.startsWith('7')) {
    return '7' + digits;
  }
  
  return digits;
};

const formatPhone = (digits: string): string => {
  if (!digits || digits.length < 1) return '+7 (';
  
  const cleaned = digits.startsWith('7') ? digits.slice(1) : digits;
  
  if (cleaned.length === 0) return '+7 (';
  if (cleaned.length <= 3) return `+7 (${cleaned}`;
  if (cleaned.length <= 6) return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  if (cleaned.length <= 8) return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 10)}`;
};

const toE164 = (digits: string): string => {
  const normalized = normalizePhone(digits);
  return normalized.length === 11 && normalized.startsWith('7') ? `+${normalized}` : '';
};

const isValidRussianPhone = (digits: string): boolean => {
  const normalized = normalizePhone(digits);
  return normalized.length === 11 && normalized.startsWith('7');
};

// Извлекаем цифры из отформатированного номера
const extractDigits = (formatted: string | unknown): string => {
  if (typeof formatted !== 'string') return '';
  return formatted.replace(/\D/g, '');
};

export const PhoneInputRU: React.FC<PhoneInputRUProps> = ({
  value = '',
  onChange,
  required = false,
  disabled = false,
  autoFocus = false,
  placeholder = '+7 (___) ___-__-__',
  className,
  error
}) => {
  const [displayValue, setDisplayValue] = useState(() => {
    if (!value) return '';
    const digits = extractDigits(value);
    return formatPhone(digits);
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Обновляем displayValue при изменении value извне
  useEffect(() => {
    if (value !== undefined) {
      const digits = extractDigits(value);
      const formatted = formatPhone(digits);
      if (formatted !== displayValue) {
        setDisplayValue(formatted);
      }
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Если пользователь очистил поле полностью
    if (input === '') {
      setDisplayValue('');
      onChange?.({ display: '', e164: '', isValid: false });
      return;
    }
    
    // Извлекаем цифры из введенного текста
    const inputDigits = extractDigits(input);
    
    // Нормализуем номер
    const normalizedDigits = normalizePhone(inputDigits);
    
    // Форматируем для отображения
    const formatted = formatPhone(normalizedDigits);
    
    // Определяем новую позицию курсора
    let newCursorPosition = cursorPosition;
    
    // Если добавили цифру, нужно правильно позиционировать курсор
    const oldDigitCount = extractDigits(displayValue).length;
    const newDigitCount = normalizedDigits.length;
    
    if (newDigitCount > oldDigitCount) {
      // Добавили цифру - курсор должен быть после неё
      const digitsBeforeCursor = extractDigits(input.slice(0, cursorPosition)).length;
      let pos = 0;
      let digitCount = 0;
      
      for (let i = 0; i < formatted.length && digitCount < digitsBeforeCursor; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
        }
        pos = i + 1;
      }
      newCursorPosition = pos;
    }
    
    setDisplayValue(formatted);
    
    // Создаем результат для onChange
    const e164 = toE164(normalizedDigits);
    const isValid = isValidRussianPhone(normalizedDigits);
    
    onChange?.({
      display: formatted,
      e164,
      isValid
    });
    
    // Устанавливаем позицию курсора после обновления
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, [displayValue, onChange]);

  const handleFocus = useCallback(() => {
    if (!displayValue || displayValue === '') {
      setDisplayValue('+7 (');
      onChange?.({ display: '+7 (', e164: '', isValid: false });
    }
  }, [displayValue, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const cursorPosition = target.selectionStart || 0;
    const currentValue = target.value;
    
    // Backspace обработка
    if (e.key === 'Backspace') {
      // Если курсор в начале или в специальной позиции, не даем удалять служебные символы
      if (cursorPosition <= 4) { // "+7 (" - 4 символа
        e.preventDefault();
        return;
      }
      
      // Находим предыдущую цифру для удаления
      let posToDelete = cursorPosition - 1;
      while (posToDelete > 3 && !/\d/.test(currentValue[posToDelete])) {
        posToDelete--;
      }
      
      if (posToDelete > 3) {
        // Удаляем цифру и переформатируем
        const beforeDelete = currentValue.slice(0, posToDelete);
        const afterDelete = currentValue.slice(posToDelete + 1);
        const newValue = beforeDelete + afterDelete;
        
        const digits = extractDigits(newValue);
        const formatted = formatPhone(digits);
        
        setDisplayValue(formatted);
        
        const e164 = toE164(digits);
        const isValid = isValidRussianPhone(digits);
        
        onChange?.({
          display: formatted,
          e164,
          isValid
        });
        
        e.preventDefault();
      }
    }
    
    // Запрещаем ввод не-цифр (кроме служебных клавиш)
    if (!/\d/.test(e.key) && 
        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
        !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const digits = extractDigits(pastedText);
    const normalized = normalizePhone(digits);
    const formatted = formatPhone(normalized);
    
    setDisplayValue(formatted);
    
    const e164 = toE164(normalized);
    const isValid = isValidRussianPhone(normalized);
    
    onChange?.({
      display: formatted,
      e164,
      isValid
    });
  }, [onChange]);

  // Определяем есть ли ошибка валидации
  const hasValidationError = displayValue && !isValidRussianPhone(extractDigits(displayValue));
  const errorMessage = error || (hasValidationError && required ? 'Введите полный номер телефона' : undefined);

  return (
    <div className="space-y-1">
      <Input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          className,
          errorMessage && "border-destructive focus-visible:ring-destructive"
        )}
      />
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      {displayValue && !errorMessage && !isValidRussianPhone(extractDigits(displayValue)) && (
        <p className="text-xs text-muted-foreground">
          Введите {11 - extractDigits(displayValue).length} цифр
        </p>
      )}
    </div>
  );
};

// Утилиты для компонентов
export { formatPhone, toE164, isValidRussianPhone, normalizePhone };