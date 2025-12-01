import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pause, Play, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { useImportProgress } from "@/contexts/ImportProgressContext";
import { Badge } from "@/components/ui/badge";
import { useTransactionCategories } from "@/hooks/useTransactionCategories";

interface FinancesImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ColumnMapping {
  [key: string]: string;
}

interface ParsedRow {
  [key: string]: any;
}

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; reason: string; data?: any }>;
}

interface RowValidation {
  rowIndex: number;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
}

// Словарь синонимов для категорий
const categoryAliases: { [key: string]: string[] } = {
  'зп': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'зарплата': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'оклад': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'премия': ['Выплаты (зарплата, оклад, премии, бонусы и т.д.)', 'Зарплата'],
  'еда': ['Еда / Напитки для проекта', 'Еда'],
  'напитки': ['Еда / Напитки для проекта', 'Еда'],
  'доставка': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'трансфер': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'транспорт': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'такси': ['Доставка / Трансфер / Транспорт / Перевозки', 'Доставка'],
  'реквизит': ['Реквизит / Расходники / Материалы', 'Реквизит'],
  'материалы': ['Реквизит / Расходники / Материалы', 'Материалы'],
  'расходники': ['Реквизит / Расходники / Материалы', 'Расходники'],
  'аренда': ['Аренда', 'Аренда оборудования'],
  'оборудование': ['Оборудование', 'Аренда оборудования'],
  'реклама': ['Реклама / Маркетинг', 'Реклама'],
  'маркетинг': ['Реклама / Маркетинг', 'Маркетинг'],
  'связь': ['Связь / Интернет / Телефон', 'Связь'],
  'интернет': ['Связь / Интернет / Телефон', 'Интернет'],
  'телефон': ['Связь / Интернет / Телефон', 'Телефон'],
  'услуги': ['Услуги сторонних организаций', 'Услуги'],
  'подрядчик': ['Услуги сторонних организаций', 'Подрядчики'],
  'разное': ['Разное', 'Прочее'],
  'прочее': ['Разное', 'Прочее'],
};

const FinancesImportDialog = ({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: FinancesImportDialogProps) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [range, setRange] = useState<string>('A5:I');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { startImport, updateProgress, finishImport } = useImportProgress();
  const { categories } = useTransactionCategories();

  // Refs для предотвращения stale closure в async функциях
  const isPausedRef = useRef(false);
  const abortRef = useRef(false);

  // Синхронизируем ref с состоянием
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Сбрасываем abort при открытии диалога
  useEffect(() => {
    if (open) {
      abortRef.current = false;
    }
  }, [open]);

  const fieldOptions = [
    { value: 'skip', label: 'Не импортировать' },
    { value: 'creator_name', label: 'Имя создателя' },
    { value: 'operation_date', label: 'Дата операции' },
    { value: 'project_name', label: 'Проект' },
    { value: 'project_owner', label: 'Чей проект / Касса' },
    { value: 'description', label: 'Подробное описание' },
    { value: 'expense_amount', label: 'Траты' },
    { value: 'income_amount', label: 'Приход' },
    { value: 'category', label: 'Статья прихода/расхода' },
    { value: 'notes', label: 'Примечания' },
  ];

  // Получаем список категорий из БД
  const categoryNames = useMemo(() => {
    return categories?.map(c => c.name) || [];
  }, [categories]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (uploadedFile.name.endsWith('.csv')) {
          processCSVFile(event.target?.result as string);
        } else if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
          const workbookData = XLSX.read(event.target?.result, { type: 'binary' });
          setWorkbook(workbookData);
          setAvailableSheets(workbookData.SheetNames);
          
          // Автоопределение диапазона
          if (workbookData.SheetNames.length > 0) {
            const firstSheet = workbookData.SheetNames[0];
            const autoRange = detectDataRange(workbookData, firstSheet);
            if (autoRange) {
              setRange(autoRange);
            }
          }
          
          if (workbookData.SheetNames.length === 1) {
            setSelectedSheet(workbookData.SheetNames[0]);
            setStep(2);
          } else {
            setStep(2);
          }
        }
      } catch (error: any) {
        console.error("File parsing error:", error);
        toast({
          variant: "destructive",
          title: "Ошибка парсинга файла",
          description: error.message || "Не удалось прочитать файл",
        });
        setStep(1);
      }
    };

    if (uploadedFile.name.endsWith('.csv')) {
      reader.readAsText(uploadedFile, 'utf-8');
    } else {
      reader.readAsBinaryString(uploadedFile);
    }
  };

  // Автоопределение диапазона данных в Excel
  const detectDataRange = (wb: XLSX.WorkBook, sheetName: string): string | null => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet['!ref']) return null;
    
    const fullRange = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Ищем строку с заголовками (обычно содержит "Дата" или "Date")
    for (let row = fullRange.s.r; row <= Math.min(fullRange.s.r + 10, fullRange.e.r); row++) {
      for (let col = fullRange.s.c; col <= fullRange.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddr];
        if (cell && typeof cell.v === 'string') {
          const val = cell.v.toLowerCase();
          if (val.includes('дата') || val.includes('date') || val.includes('операц')) {
            // Нашли заголовки, диапазон начинается с этой строки
            const startCol = XLSX.utils.encode_col(fullRange.s.c);
            const endCol = XLSX.utils.encode_col(fullRange.e.c);
            return `${startCol}${row + 1}:${endCol}`;
          }
        }
      }
    }
    
    return null;
  };

  const processCSVFile = (csvText: string) => {
    const cleanText = csvText.replace(/^\uFEFF/, '');
    
    let parseResult = Papa.parse(cleanText, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      transformHeader: (header: string) => header.trim(),
      transform: (value: any) => typeof value === 'string' ? value.trim() : value
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    const fields = parseResult.meta.fields || [];
    const data = parseResult.data as ParsedRow[];

    setHeaders(fields);
    setParsedData(data);
    setupColumnMapping(fields);
    setStep(3);
  };

  const processExcelSheet = (workbookData: XLSX.WorkBook, sheetName: string, rangeStr: string) => {
    const worksheet = workbookData.Sheets[sheetName];
    
    // Парсим диапазон A5:I в Excel формат
    const rangeObj = XLSX.utils.decode_range(rangeStr + (worksheet['!ref']?.split(':')[1]?.match(/\d+/)?.[0] || '1000'));
    
    // Получаем данные из указанного диапазона
    const rows = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      range: rangeObj,
      defval: ""
    }) as any[][];
    
    console.log('Excel rows from range:', rangeStr, rows);
    
    if (rows.length > 0) {
      // Первая строка - заголовки
      const fileHeaders = (rows[0] || []).map(h => String(h || '').trim());
      const dataRows = rows.slice(1);
      
      console.log('Headers:', fileHeaders);
      console.log('Data rows:', dataRows.length);
      
      // Строим объекты из строк данных
      const data = dataRows.map((row) => {
        const obj: ParsedRow = {};
        fileHeaders.forEach((header, idx) => {
          obj[header] = row[idx] ?? '';
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

      setHeaders(fileHeaders);
      setParsedData(data);
      setupColumnMapping(fileHeaders);
      setStep(3);
    }
  };

  const handleSheetSelect = () => {
    if (!workbook || !selectedSheet) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Выберите лист для импорта",
      });
      return;
    }
    processExcelSheet(workbook, selectedSheet, range);
  };

  const setupColumnMapping = (fileHeaders: string[]) => {
    // Маппинг по ПОЗИЦИИ столбца (индексу), а не по названию!
    // Порядок столбцов: 1. Имя, 2. Дата, 3. Проект, 4. Чей проект, 5. Описание, 6. Траты, 7. Приход, 8. Остаток (ПРОПУСК), 9. Статья
    
    const autoMapping: ColumnMapping = {};
    
    // Маппим по индексу столбца
    if (fileHeaders[0]) autoMapping['creator_name'] = fileHeaders[0];      // 1. Имя
    if (fileHeaders[1]) autoMapping['operation_date'] = fileHeaders[1];    // 2. Дата операции
    if (fileHeaders[2]) autoMapping['project_name'] = fileHeaders[2];      // 3. Проект (static_project_name)
    if (fileHeaders[3]) autoMapping['project_owner'] = fileHeaders[3];     // 4. Чей проект (project_owner)
    if (fileHeaders[4]) autoMapping['description'] = fileHeaders[4];       // 5. Подробное описание
    if (fileHeaders[5]) autoMapping['expense_amount'] = fileHeaders[5];    // 6. Траты
    if (fileHeaders[6]) autoMapping['income_amount'] = fileHeaders[6];     // 7. Приход
    // fileHeaders[7] - Остаток - ПРОПУСКАЕМ
    if (fileHeaders[8]) autoMapping['category'] = fileHeaders[8];          // 9. Статья прихода/расхода
    // Если есть 10-й столбец - это notes
    if (fileHeaders[9]) autoMapping['notes'] = fileHeaders[9];             // 10. Примечания
    
    console.log('Column mapping by position:');
    console.log('1. Имя:', fileHeaders[0], '→ creator_name');
    console.log('2. Дата:', fileHeaders[1], '→ operation_date');
    console.log('3. Проект:', fileHeaders[2], '→ project_name');
    console.log('4. Чей проект:', fileHeaders[3], '→ project_owner');
    console.log('5. Описание:', fileHeaders[4], '→ description');
    console.log('6. Траты:', fileHeaders[5], '→ expense_amount');
    console.log('7. Приход:', fileHeaders[6], '→ income_amount');
    console.log('8. Остаток:', fileHeaders[7], '→ ПРОПУСК');
    console.log('9. Статья:', fileHeaders[8], '→ category');
    console.log('10. Примечания:', fileHeaders[9], '→ notes');
    console.log('Auto-mapped columns:', autoMapping);
    
    setColumnMapping(autoMapping);
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    const s = String(dateStr).trim();
    if (!s) return null;

    // Excel serial numbers
    if (/^\d+(\.\d+)?$/.test(s)) {
      const num = parseFloat(s);
      if (num > 1 && num < 100000) {
        try {
          const excelEpochUTC = Date.UTC(1899, 11, 30);
          const dt = new Date(excelEpochUTC + num * 86400000);
          const y = dt.getUTCFullYear();
          const m = dt.getUTCMonth() + 1;
          const d = dt.getUTCDate();
          return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        } catch (error) {
          console.warn('Error parsing Excel serial date:', s, error);
        }
      }
    }
    
    // Extended date formats
    const formats = [
      { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, order: 'dmy' },           // dd.mm.yyyy
      { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/, order: 'dmy_short' },     // dd.mm.yy
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: 'dmy' },           // dd/mm/yyyy
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, order: 'dmy_short' },     // dd/mm/yy
      { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: 'dmy' },             // dd-mm-yyyy
      { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})/, order: 'ymd' },              // yyyy-mm-dd (ISO, может быть с временем)
      { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, order: 'ymd' },           // yyyy.mm.dd
      { regex: /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/, order: 'dmy' },         // dd mm yyyy
    ];

    for (const { regex, order } of formats) {
      const match = s.match(regex);
      if (match) {
        let year: number, month: number, day: number;
        
        if (order === 'ymd') {
          [, year, month, day] = match.map(Number);
        } else if (order === 'dmy_short') {
          [, day, month, year] = match.map(Number);
          // Преобразуем двузначный год
          year = year < 50 ? 2000 + year : 1900 + year;
        } else { // dmy
          [, day, month, year] = match.map(Number);
        }
        
        if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        }
      }
    }

    return null;
  };

  // Интеллектуальный парсинг суммы с определением формата (RU/US)
  const parseAmount = (amountStr: string | number | null | undefined): number => {
    if (amountStr === null || amountStr === undefined || amountStr === '') return 0;
    
    const s = String(amountStr).trim();
    if (!s) return 0;
    
    // Убираем валютные символы и пробелы
    let cleaned = s.replace(/[₽$€£руб\.rub\s]/gi, '');
    
    // Если это уже число - возвращаем
    if (/^-?\d+$/.test(cleaned)) {
      return Math.abs(parseInt(cleaned));
    }
    
    // Определяем формат по последнему разделителю
    // "1.234,56" → последний разделитель запятая = RU (результат: 1234.56)
    // "1,234.56" → последний разделитель точка = US (результат: 1234.56)
    // "1234.56" → только точка = десятичная
    // "1234,56" → только запятая = десятичная (RU)
    
    const lastCommaIdx = cleaned.lastIndexOf(',');
    const lastDotIdx = cleaned.lastIndexOf('.');
    
    if (lastCommaIdx > lastDotIdx) {
      // Запятая последняя → это десятичный разделитель (RU формат)
      // Убираем точки (разделители тысяч), запятую меняем на точку
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDotIdx > lastCommaIdx) {
      // Точка последняя → это десятичный разделитель (US формат)
      // Убираем запятые (разделители тысяч)
      cleaned = cleaned.replace(/,/g, '');
    } else if (lastCommaIdx === -1 && lastDotIdx === -1) {
      // Нет разделителей - целое число
    } else if (lastCommaIdx !== -1 && lastDotIdx === -1) {
      // Только запятая - это десятичный разделитель (RU)
      cleaned = cleaned.replace(',', '.');
    }
    // Если только точка - оставляем как есть
    
    const num = parseFloat(cleaned) || 0;
    return Math.abs(num); // Всегда положительное число
  };

  const mapCashType = (projectOwner: string): string | null => {
    if (!projectOwner) return null;
    const s = String(projectOwner).toLowerCase().trim();
    
    // Гибкое сопоставление для наличных касс
    if (s.includes('настя') || s === 'наличка настя') return 'Наличка Настя';
    if (s.includes('лера') || s === 'наличка лера') return 'Наличка Лера';
    if (s.includes('ваня') || s === 'наличка ваня') return 'Наличка Ваня';
    
    // Если начинается с "наличка" - попробуем распознать
    if (s.startsWith('наличка')) {
      const name = s.replace('наличка', '').trim();
      if (name) {
        // Капитализируем
        return 'Наличка ' + name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    
    // Если не совпало - это не касса, возвращаем null
    return null;
  };

  // Fuzzy matching для категорий
  const findMatchingCategory = (input: string): string => {
    if (!input) return 'Разное';
    
    const s = String(input).trim();
    const sLower = s.toLowerCase();
    
    // 1. Точное совпадение
    const exactMatch = categoryNames.find(cat => cat.toLowerCase() === sLower);
    if (exactMatch) return exactMatch;
    
    // 2. Поиск по синонимам
    for (const [alias, targets] of Object.entries(categoryAliases)) {
      if (sLower.includes(alias) || alias.includes(sLower)) {
        // Ищем первую подходящую категорию из targets в списке категорий БД
        for (const target of targets) {
          const match = categoryNames.find(cat => 
            cat.toLowerCase().includes(target.toLowerCase()) ||
            target.toLowerCase().includes(cat.toLowerCase())
          );
          if (match) return match;
        }
      }
    }
    
    // 3. Поиск по подстроке
    const substringMatch = categoryNames.find(cat => 
      cat.toLowerCase().includes(sLower) || sLower.includes(cat.toLowerCase())
    );
    if (substringMatch) return substringMatch;
    
    // 4. Поиск по первым буквам / аббревиатуре
    const abbrevMatch = categoryNames.find(cat => {
      const words = cat.split(/\s+/);
      const abbrev = words.map(w => w[0]?.toLowerCase()).join('');
      return abbrev === sLower || sLower === abbrev;
    });
    if (abbrevMatch) return abbrevMatch;
    
    // 5. Fallback
    return s || 'Разное';
  };

  const mapRow = (row: ParsedRow) => {
    // Теперь маппинг: поле БД -> заголовок файла
    const mapped: any = {};
    Object.entries(columnMapping).forEach(([field, header]) => {
      if (header && header !== 'skip') {
        mapped[field] = row[header];
      }
    });
    return mapped;
  };

  // Предварительная валидация всех строк с подсветкой проблем
  const validateAllRows = useMemo(() => {
    const validations: RowValidation[] = [];
    
    parsedData.forEach((row, index) => {
      const mappedRow = mapRow(row);
      const issues: string[] = [];
      let status: 'valid' | 'warning' | 'error' = 'valid';
      
      // Проверяем дату
      const dateValue = mappedRow.operation_date;
      const parsedDate = parseDate(dateValue);
      if (!dateValue || !parsedDate) {
        issues.push('Некорректная дата');
        status = 'error';
      }
      
      // Проверяем суммы
      const expenseAmount = parseAmount(mappedRow.expense_amount);
      const incomeAmount = parseAmount(mappedRow.income_amount);
      
      if (expenseAmount === 0 && incomeAmount === 0) {
        issues.push('Не указана сумма');
        status = 'error';
      }
      
      // Проверяем описание (предупреждение)
      if (!mappedRow.description) {
        issues.push('Пустое описание');
        if (status !== 'error') status = 'warning';
      }
      
      // Проверяем категорию
      const category = mappedRow.category;
      const matchedCategory = findMatchingCategory(category);
      if (category && matchedCategory !== category && matchedCategory !== 'Разное') {
        issues.push(`Категория "${category}" → "${matchedCategory}"`);
        if (status !== 'error') status = 'warning';
      } else if (!category) {
        issues.push('Категория не указана (будет "Разное")');
        if (status !== 'error') status = 'warning';
      }
      
      validations.push({ rowIndex: index, status, issues });
    });
    
    return validations;
  }, [parsedData, columnMapping, categoryNames]);

  // Статистика импорта
  const importStats = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;
    
    parsedData.forEach((row) => {
      const mappedRow = mapRow(row);
      const expense = parseAmount(mappedRow.expense_amount);
      const income = parseAmount(mappedRow.income_amount);
      const date = parseDate(mappedRow.operation_date);
      
      if (expense > 0) {
        totalExpense += expense;
        expenseCount++;
      }
      if (income > 0) {
        totalIncome += income;
        incomeCount++;
      }
      if (date) {
        if (!minDate || date < minDate) minDate = date;
        if (!maxDate || date > maxDate) maxDate = date;
      }
    });
    
    const validCount = validateAllRows.filter(v => v.status !== 'error').length;
    const warningCount = validateAllRows.filter(v => v.status === 'warning').length;
    const errorCount = validateAllRows.filter(v => v.status === 'error').length;
    
    return {
      totalExpense,
      totalIncome,
      expenseCount,
      incomeCount,
      minDate,
      maxDate,
      validCount,
      warningCount,
      errorCount,
    };
  }, [parsedData, columnMapping, validateAllRows]);

  const validateData = () => {
    const errorCount = validateAllRows.filter(v => v.status === 'error').length;
    const validCount = validateAllRows.filter(v => v.status !== 'error').length;

    if (errorCount > 0) {
      toast({
        title: "Предупреждение",
        description: `${errorCount} строк с ошибками будут пропущены. Импорт: ${validCount} записей.`,
      });
    }

    if (validCount === 0) {
      toast({
        variant: "destructive",
        title: "Нет данных для импорта",
        description: "Не найдено ни одной валидной строки",
      });
      return false;
    }

    toast({
      title: "Валидация пройдена",
      description: `Готово к импорту: ${validCount} из ${parsedData.length} записей`,
    });

    return true;
  };

  const handleImport = async () => {
    console.log('[FinancesImport] === НАЧАЛО ИМПОРТА ===');
    console.log('[FinancesImport] Всего строк для импорта:', parsedData.length);
    console.log('[FinancesImport] Маппинг колонок:', columnMapping);
    console.log('[FinancesImport] Пользователь:', user?.id);

    if (!validateData()) {
      console.log('[FinancesImport] Валидация не пройдена, импорт отменён');
      return;
    }

    console.log('[FinancesImport] Валидация пройдена, начинаем импорт...');

    setImporting(true);
    setImportProgress(0);
    setIsPaused(false);
    isPausedRef.current = false;
    abortRef.current = false;
    startImport(parsedData.length);

    const result: ImportResult = {
      total: parsedData.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    try {
      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(parsedData.length / BATCH_SIZE);
      console.log('[FinancesImport] Размер батча:', BATCH_SIZE, '| Всего батчей:', totalBatches);
      
      for (let batchStart = 0; batchStart < parsedData.length; batchStart += BATCH_SIZE) {
        const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
        
        // Проверяем, не отменён ли импорт
        if (abortRef.current) {
          console.log('[FinancesImport] Импорт прерван пользователем на батче', batchNum);
          break;
        }

        // Проверяем, не приостановлен ли импорт (используем ref для актуального значения)
        if (isPausedRef.current) {
          console.log('[FinancesImport] Импорт на паузе, ожидаем...');
        }
        while (isPausedRef.current && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (abortRef.current) {
          console.log('[FinancesImport] Импорт прерван во время паузы');
          break;
        }

        const batchEnd = Math.min(batchStart + BATCH_SIZE, parsedData.length);
        const batch = parsedData.slice(batchStart, batchEnd);
        
        console.log(`[FinancesImport] Батч ${batchNum}/${totalBatches}: строки ${batchStart + 1}-${batchEnd}`);
        
        // Подготовка batch для вставки
        const transactionsToInsert = [];
        
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNum = batchStart + i + 1;
          const mappedRow = mapRow(row);
          
          console.log(`[FinancesImport] Строка ${rowNum}: исходные данные:`, row);
          console.log(`[FinancesImport] Строка ${rowNum}: после маппинга:`, mappedRow);
          
          try {
            const operationDate = parseDate(mappedRow.operation_date);
            const expenseAmount = parseAmount(mappedRow.expense_amount);
            const incomeAmount = parseAmount(mappedRow.income_amount);
            const projectOwner = mappedRow.project_owner || null;
            const cashType = mapCashType(projectOwner);
            const category = findMatchingCategory(mappedRow.category);

            console.log(`[FinancesImport] Строка ${rowNum}: парсинг результатов:`, {
              operationDate,
              expenseAmount,
              incomeAmount,
              projectOwner,
              cashType,
              category
            });

            if (!operationDate || (expenseAmount === 0 && incomeAmount === 0)) {
              console.warn(`[FinancesImport] Строка ${rowNum}: ПРОПУЩЕНА - некорректные данные (дата: ${operationDate}, расход: ${expenseAmount}, приход: ${incomeAmount})`);
              result.failed++;
              result.errors.push({
                row: rowNum,
                reason: `Некорректные данные: дата=${operationDate}, расход=${expenseAmount}, приход=${incomeAmount}`,
                data: mappedRow
              });
              continue;
            }

            // Если есть и доход и расход - создаём две транзакции
            if (expenseAmount > 0 && incomeAmount > 0) {
              console.log(`[FinancesImport] Строка ${rowNum}: создаём 2 транзакции (и расход, и приход)`);
              // Транзакция расхода
              transactionsToInsert.push({
                created_by: user?.id,
                operation_date: operationDate,
                static_project_name: mappedRow.project_name || null,
                project_owner: cashType || projectOwner || 'Без кассы',
                description: mappedRow.description || 'Расход',
                category: category,
                cash_type: cashType,
                expense_amount: expenseAmount,
                income_amount: null,
                notes: mappedRow.notes || null,
                verification_status: 'pending',
                requires_verification: true
              });
              // Транзакция дохода
              transactionsToInsert.push({
                created_by: user?.id,
                operation_date: operationDate,
                static_project_name: mappedRow.project_name || null,
                project_owner: cashType || projectOwner || 'Без кассы',
                description: mappedRow.description || 'Приход',
                category: category,
                cash_type: cashType,
                expense_amount: null,
                income_amount: incomeAmount,
                notes: mappedRow.notes || null,
                verification_status: 'pending',
                requires_verification: true
              });
            } else {
              const txType = expenseAmount > 0 ? 'расход' : 'приход';
              console.log(`[FinancesImport] Строка ${rowNum}: создаём 1 транзакцию (${txType})`);
              transactionsToInsert.push({
                created_by: user?.id,
                operation_date: operationDate,
                static_project_name: mappedRow.project_name || null,
                project_owner: cashType || projectOwner || 'Без кассы',
                description: mappedRow.description || (expenseAmount > 0 ? 'Расход' : 'Приход'),
                category: category,
                cash_type: cashType,
                expense_amount: expenseAmount || null,
                income_amount: incomeAmount || null,
                notes: mappedRow.notes || null,
                verification_status: 'pending',
                requires_verification: true
              });
            }
          } catch (error: any) {
            console.error(`[FinancesImport] Строка ${rowNum}: ОШИБКА обработки:`, error);
            result.failed++;
            result.errors.push({
              row: rowNum,
              reason: error.message || 'Ошибка обработки',
              data: mappedRow
            });
          }
        }

        // Batch-вставка в БД с повторными попытками при таймаутах
        if (transactionsToInsert.length > 0) {
          console.log(`[FinancesImport] Батч ${batchNum}: вставляем ${transactionsToInsert.length} транзакций в БД`);
          console.log(`[FinancesImport] Батч ${batchNum}: данные для вставки:`, transactionsToInsert);
          
          let retries = 3;
          let lastError = null;
          
          while (retries > 0) {
            console.log(`[FinancesImport] Батч ${batchNum}: попытка вставки (осталось попыток: ${retries})`);
            
            const { error } = await supabase
              .from('financial_transactions')
              .insert(transactionsToInsert);

            if (!error) {
              console.log(`[FinancesImport] Батч ${batchNum}: УСПЕХ - вставлено ${transactionsToInsert.length} записей`);
              result.inserted += transactionsToInsert.length;
              lastError = null;
              break;
            } else if (error.message.includes('timeout') || error.message.includes('canceling statement')) {
              retries--;
              lastError = error;
              console.warn(`[FinancesImport] Батч ${batchNum}: ТАЙМАУТ - ${error.message}, осталось попыток: ${retries}`);
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } else {
              console.error(`[FinancesImport] Батч ${batchNum}: ОШИБКА БД:`, error);
              lastError = error;
              break;
            }
          }

          if (lastError) {
            console.error(`[FinancesImport] Батч ${batchNum}: ФИНАЛЬНАЯ ОШИБКА после всех попыток:`, lastError);
            result.failed += transactionsToInsert.length;
            for (let i = 0; i < transactionsToInsert.length; i++) {
              result.errors.push({
                row: batchStart + i + 1,
                reason: lastError.message || 'Ошибка вставки'
              });
            }
          }
        } else {
          console.log(`[FinancesImport] Батч ${batchNum}: нет данных для вставки (все строки пропущены)`);
        }

        // Обновляем прогресс
        const currentProgress = batchEnd;
        const progressPercent = Math.round((currentProgress / parsedData.length) * 100);
        console.log(`[FinancesImport] Прогресс: ${progressPercent}% (${currentProgress}/${parsedData.length})`);
        setImportProgress(progressPercent);
        updateProgress(currentProgress, parsedData.length);
        
        // Добавляем задержку между батчами для предотвращения перегрузки БД
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('[FinancesImport] === ИМПОРТ ЗАВЕРШЁН ===');
      console.log('[FinancesImport] Результат:', result);

      setImportResult(result);
      finishImport(result);
      setStep(4);

      if (result.inserted > 0) {
        onImportComplete();
      }

      toast({
        title: "Импорт завершен",
        description: `Успешно импортировано: ${result.inserted} из ${result.total} записей`,
      });

    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: "Ошибка импорта",
        description: error.message || "Произошла ошибка при импорте данных",
      });
      
      finishImport(result);
    } finally {
      setImporting(false);
      setIsPaused(false);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    setRange('A5:I');
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = () => {
    // Прерываем импорт если он выполняется
    if (importing) {
      abortRef.current = true;
    }
    resetDialog();
    onOpenChange(false);
  };

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт финансовых данных</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file" className="text-base font-semibold">Выберите Excel или CSV файл</Label>
              <div className="mt-4 flex flex-col items-center gap-4 p-8 border-2 border-dashed border-primary/40 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                <input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label 
                  htmlFor="file" 
                  className="cursor-pointer w-full"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary">Нажмите для выбора файла</p>
                      <p className="text-sm text-muted-foreground mt-1">или перетащите файл сюда</p>
                    </div>
                  </div>
                </label>
                {file && (
                  <div className="text-sm text-muted-foreground">
                    Выбран файл: <span className="font-medium text-foreground">{file.name}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Поддерживаются форматы: .xlsx, .xls, .csv
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {availableSheets.length > 1 && (
              <div>
                <Label>Выберите лист</Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите лист" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map(sheet => (
                      <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="range">Диапазон (например: A5:I)</Label>
              <Input
                id="range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="A5:I"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Укажите диапазон колонок, начиная со строки с заголовками. Диапазон определён автоматически.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSheetSelect} disabled={!selectedSheet}>
                Продолжить
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                Назад
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {/* Статистика до импорта */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Статистика данных</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Всего записей</p>
                  <p className="font-semibold text-lg">{parsedData.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Расходы</p>
                  <p className="font-semibold text-lg text-red-500">{formatCurrency(importStats.totalExpense)}</p>
                  <p className="text-xs text-muted-foreground">{importStats.expenseCount} записей</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Доходы</p>
                  <p className="font-semibold text-lg text-green-500">{formatCurrency(importStats.totalIncome)}</p>
                  <p className="text-xs text-muted-foreground">{importStats.incomeCount} записей</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Период</p>
                  <p className="font-semibold">{importStats.minDate || '-'}</p>
                  <p className="text-xs text-muted-foreground">до {importStats.maxDate || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Статус валидации */}
            <div className="flex gap-4 items-center">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {importStats.validCount} валидных
              </Badge>
              {importStats.warningCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  {importStats.warningCount} предупреждений
                </Badge>
              )}
              {importStats.errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="w-3 h-3" />
                  {importStats.errorCount} ошибок
                </Badge>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Настройка соответствия колонок</h3>
              <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                {fieldOptions.filter(f => f.value !== 'skip').map(field => (
                  <div key={field.value} className="space-y-2">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <Select
                      value={columnMapping[field.value] || 'skip'}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [field.value]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите столбец" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Не импортировать</SelectItem>
                        {headers.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {parsedData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Предпросмотр данных</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-auto space-y-2">
                    {parsedData.slice(0, 10).map((row, index) => {
                      const mappedRow = mapRow(row);
                      const validation = validateAllRows[index];
                      
                      return (
                        <div 
                          key={index} 
                          className={`border rounded-lg p-3 text-sm ${
                            validation?.status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                            validation?.status === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' :
                            'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1">
                              <div><span className="text-muted-foreground">Дата:</span> {mappedRow.operation_date || '-'}</div>
                              <div><span className="text-muted-foreground">Проект:</span> {mappedRow.project_name || '-'}</div>
                              <div><span className="text-muted-foreground">Касса:</span> {mappedRow.project_owner || '-'}</div>
                              <div><span className="text-muted-foreground">Категория:</span> {mappedRow.category || '-'}</div>
                              <div><span className="text-muted-foreground">Расход:</span> {mappedRow.expense_amount ? formatCurrency(parseAmount(mappedRow.expense_amount)) : '-'}</div>
                              <div><span className="text-muted-foreground">Доход:</span> {mappedRow.income_amount ? formatCurrency(parseAmount(mappedRow.income_amount)) : '-'}</div>
                              <div className="col-span-2"><span className="text-muted-foreground">Описание:</span> {mappedRow.description || '-'}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {getStatusIcon(validation?.status || 'valid')}
                              {validation?.issues.map((issue, i) => (
                                <span key={i} className="text-xs text-muted-foreground">{issue}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {parsedData.length > 10 && (
                      <p className="text-muted-foreground text-center py-2">...и еще {parsedData.length - 10} записей</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={parsedData.length === 0 || importStats.validCount === 0}>
                Импортировать {importStats.validCount} записей
              </Button>
              <Button variant="outline" onClick={() => setStep(2)}>
                Назад
              </Button>
            </div>
          </div>
        )}

        {step === 4 && importResult && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Результат импорта</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Всего записей:</strong> {importResult.total}</p>
                  <p><strong>Успешно импортировано:</strong> {importResult.inserted}</p>
                  <p><strong>Ошибок:</strong> {importResult.failed}</p>
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Ошибки импорта</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-auto space-y-2">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm">
                        <strong>Строка {error.row}:</strong> {error.reason}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-muted-foreground">...и еще {importResult.errors.length - 10} ошибок</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleClose}>
              Закрыть
            </Button>
          </div>
        )}

        {importing && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Импорт данных...</h3>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                Прогресс: {importProgress}%
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant={isPaused ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Продолжить
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Приостановить
                    </>
                  )}
                </Button>
              </div>
              {isPaused && (
                <p className="text-sm text-warning mt-2">
                  Импорт приостановлен. Нажмите "Продолжить" для возобновления.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FinancesImportDialog;
