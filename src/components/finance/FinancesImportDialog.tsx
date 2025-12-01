import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pause, Play, AlertTriangle, CheckCircle2, XCircle, CloudUpload, Loader2, Wallet } from "lucide-react";
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
import { useImportJobs } from "@/hooks/useImportJobs";
import { useProfiles } from "@/hooks/useProfiles";

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
  const [backgroundImportStarted, setBackgroundImportStarted] = useState(false);
  const [startingBackgroundImport, setStartingBackgroundImport] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { startImport, updateProgress, finishImport } = useImportProgress();
  const { createJob } = useImportJobs();
  const { categories } = useTransactionCategories();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { data: profiles } = useProfiles();

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

  // Интеллектуальный парсинг суммы с округлением до целых рублей
  const parseAmount = (amountStr: string | number | null | undefined): number => {
    if (amountStr === null || amountStr === undefined || amountStr === '') return 0;
    
    // Если это уже число - сразу округляем и возвращаем (сохраняя знак)
    if (typeof amountStr === 'number') {
      return Math.round(amountStr);
    }
    
    const s = String(amountStr).trim();
    if (!s) return 0;
    
    // Убираем валютные символы
    let cleaned = s.replace(/[₽$€£руб\.rub]/gi, '');
    
    // Убираем пробелы (разделители тысяч)
    cleaned = cleaned.replace(/\s/g, '');
    
    // Если это целое число без разделителей - возвращаем (сохраняя знак)
    if (/^-?\d+$/.test(cleaned)) {
      return parseInt(cleaned);
    }
    
    // Определяем формат по последнему разделителю
    const lastCommaIdx = cleaned.lastIndexOf(',');
    const lastDotIdx = cleaned.lastIndexOf('.');
    
    // Проверяем количество цифр после последнего разделителя
    // Если 1-2 цифры после разделителя - это копейки (дробная часть)
    // Если 3+ цифры - это разделитель тысяч
    
    if (lastCommaIdx > lastDotIdx) {
      // Запятая последняя
      const afterComma = cleaned.substring(lastCommaIdx + 1);
      if (afterComma.length <= 2) {
        // Это копейки (дробная часть) - убираем точки как разделители тысяч
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Это разделитель тысяч - просто убираем запятую
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (lastDotIdx > lastCommaIdx) {
      // Точка последняя
      const afterDot = cleaned.substring(lastDotIdx + 1);
      if (afterDot.length <= 2) {
        // Это десятичная часть - убираем запятые как разделители тысяч
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // Это разделитель тысяч - убираем точку
        cleaned = cleaned.replace(/\./g, '');
      }
    } else if (lastCommaIdx !== -1) {
      // Только запятая
      const afterComma = cleaned.substring(lastCommaIdx + 1);
      if (afterComma.length <= 2) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(',', '');
      }
    }
    // Если только точка - оставляем как есть
    
    const num = parseFloat(cleaned) || 0;
    
    // ВСЕГДА округляем до целых рублей (сохраняя знак)
    return Math.round(num);
  };

  // Полный список типов кошельков
  const WALLET_TYPES = [
    'Наличка Настя',
    'Наличка Лера', 
    'Наличка Ваня',
    'Корп. карта Настя',
    'Корп. карта Лера',
    'ИП Настя',
    'ИП Лера',
    'Оплатил(а) клиент',
    'Оплатила Настя',
    'Оплатила Лера',
    'Получила Лера',
    'Получила Настя'
  ];

  const mapCashType = (projectOwner: string): string | null => {
    if (!projectOwner) return null;
    const input = String(projectOwner).trim();
    const inputLower = input.toLowerCase();
    
    // 1. Точное совпадение
    const exactMatch = WALLET_TYPES.find(w => w.toLowerCase() === inputLower);
    if (exactMatch) return exactMatch;
    
    // 2. Частичное совпадение (input содержится в названии или наоборот)
    const partialMatch = WALLET_TYPES.find(w => 
      w.toLowerCase().includes(inputLower) || 
      inputLower.includes(w.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // 3. Синонимы и сокращения
    if (inputLower.includes('корп') && inputLower.includes('настя')) return 'Корп. карта Настя';
    if (inputLower.includes('корп') && inputLower.includes('лера')) return 'Корп. карта Лера';
    if (inputLower.includes('карта') && inputLower.includes('настя')) return 'Корп. карта Настя';
    if (inputLower.includes('карта') && inputLower.includes('лера')) return 'Корп. карта Лера';
    if (inputLower.includes('ип') && inputLower.includes('настя')) return 'ИП Настя';
    if (inputLower.includes('ип') && inputLower.includes('лера')) return 'ИП Лера';
    if (inputLower.includes('клиент')) return 'Оплатил(а) клиент';
    if (inputLower.includes('оплатил') && inputLower.includes('настя')) return 'Оплатила Настя';
    if (inputLower.includes('оплатил') && inputLower.includes('лера')) return 'Оплатила Лера';
    if (inputLower.includes('получил') && inputLower.includes('настя')) return 'Получила Настя';
    if (inputLower.includes('получил') && inputLower.includes('лера')) return 'Получила Лера';
    if (inputLower.includes('наличк') && inputLower.includes('настя')) return 'Наличка Настя';
    if (inputLower.includes('наличк') && inputLower.includes('лера')) return 'Наличка Лера';
    if (inputLower.includes('наличк') && inputLower.includes('ваня')) return 'Наличка Ваня';
    
    // 4. Если ничего не подошло - возвращаем как есть
    return input;
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

  // Статистика форматов дат для диагностики
  const dateFormatStats = useMemo(() => {
    const stats = {
      total: 0,
      parsed: 0,
      unparsed: 0,
      excelSerial: 0,
      ddmmyyyy: 0,
      iso: 0,
      other: 0,
      examples: {
        unparsed: [] as string[],
        parsed: [] as { raw: string; result: string }[]
      }
    };

    parsedData.forEach((row) => {
      const mappedRow = mapRow(row);
      const dateValue = String(mappedRow.operation_date || '').trim();
      
      if (!dateValue) {
        stats.unparsed++;
        if (stats.examples.unparsed.length < 5) {
          stats.examples.unparsed.push('(пусто)');
        }
        return;
      }
      
      stats.total++;
      const parsed = parseDate(dateValue);
      
      if (parsed) {
        stats.parsed++;
        // Определяем формат
        if (/^\d+(\.\d+)?$/.test(dateValue)) {
          stats.excelSerial++;
        } else if (/^\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4}$/.test(dateValue)) {
          stats.ddmmyyyy++;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
          stats.iso++;
        } else {
          stats.other++;
        }
        if (stats.examples.parsed.length < 3) {
          stats.examples.parsed.push({ raw: dateValue, result: parsed });
        }
      } else {
        stats.unparsed++;
        if (stats.examples.unparsed.length < 5) {
          stats.examples.unparsed.push(dateValue.substring(0, 30));
        }
      }
    });

    return stats;
  }, [parsedData, columnMapping]);

  // Статистика импорта
  const importStats = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;
    
    // Группировка ошибок по типу
    const errorsByType = {
      invalidDate: 0,
      zeroAmount: 0,
      emptyDescription: 0
    };
    
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
      } else {
        errorsByType.invalidDate++;
      }
      
      if (expense === 0 && income === 0) {
        errorsByType.zeroAmount++;
      }
    });
    
    const validCount = validateAllRows.filter(v => v.status !== 'error').length;
    const warningCount = validateAllRows.filter(v => v.status === 'warning').length;
    const errorCount = validateAllRows.filter(v => v.status === 'error').length;
    
    // Подсчёт подозрительно больших сумм (> 500 000 ₽)
    let largeSumsCount = 0;
    parsedData.forEach(row => {
      const mappedRow = mapRow(row);
      const expense = parseAmount(mappedRow.expense_amount);
      const income = parseAmount(mappedRow.income_amount);
      if (expense > 500000 || income > 500000) {
        largeSumsCount++;
      }
    });
    
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
      errorsByType,
      largeSumsCount,
    };
  }, [parsedData, columnMapping, validateAllRows]);

  // Статистика уникальных кошельков для предпросмотра маппинга
  const walletMappingStats = useMemo(() => {
    const mappings = new Map<string, { 
      source: string; 
      target: string | null; 
      count: number; 
      isValid: boolean;
    }>();
    
    parsedData.forEach((row) => {
      const mappedRow = mapRow(row);
      const source = String(mappedRow.project_owner || '').trim();
      if (!source) return;
      
      const existing = mappings.get(source);
      if (existing) {
        existing.count++;
      } else {
        const target = mapCashType(source);
        mappings.set(source, {
          source,
          target,
          count: 1,
          isValid: target !== null && WALLET_TYPES.includes(target)
        });
      }
    });
    
    return Array.from(mappings.values())
      .sort((a, b) => b.count - a.count);
  }, [parsedData, columnMapping]);

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

  // Проверка дубликатов в БД
  const checkDuplicates = async (transactions: any[]): Promise<Set<string>> => {
    const duplicateKeys = new Set<string>();
    
    // Создаём ключи для проверки: дата + описание + сумма
    const keysToCheck = transactions.map(t => ({
      date: t.operation_date,
      description: t.description,
      expense: t.expense_amount || 0,
      income: t.income_amount || 0
    }));

    // Получаем уникальные даты для фильтрации
    const uniqueDates = [...new Set(keysToCheck.map(k => k.date))];
    
    if (uniqueDates.length === 0) return duplicateKeys;

    try {
      const { data: existingTx } = await supabase
        .from('financial_transactions')
        .select('operation_date, description, expense_amount, income_amount')
        .in('operation_date', uniqueDates);

      if (existingTx) {
        existingTx.forEach(tx => {
          const key = `${tx.operation_date}|${tx.description || ''}|${tx.expense_amount || 0}|${tx.income_amount || 0}`;
          duplicateKeys.add(key);
        });
      }
    } catch (error) {
      console.warn('[FinancesImport] Ошибка проверки дубликатов:', error);
    }

    return duplicateKeys;
  };

  const handleImport = async () => {
    console.log('[FinancesImport] === НАЧАЛО ИМПОРТА ===');
    console.log('[FinancesImport] Всего строк для импорта:', parsedData.length);
    console.log('[FinancesImport] Маппинг колонок:', columnMapping);
    console.log('[FinancesImport] Пользователь:', user?.id);
    console.log('[FinancesImport] Статистика дат:', dateFormatStats);

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

    const result: ImportResult & { skipped: number } = {
      total: parsedData.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
      skipped: 0
    };

    try {
      // Сначала подготовим все транзакции для проверки дубликатов
      const allPreparedTransactions: any[] = [];
      const rowToTransactionMap: Map<number, number[]> = new Map(); // rowNum -> [txIndex, ...]
      
      console.log('[FinancesImport] Подготовка транзакций...');
      
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const rowNum = i + 1;
        const mappedRow = mapRow(row);
        
        try {
          const operationDate = parseDate(mappedRow.operation_date);
          const expenseAmount = parseAmount(mappedRow.expense_amount);
          const incomeAmount = parseAmount(mappedRow.income_amount);
          const projectOwner = mappedRow.project_owner || null;
          const cashType = mapCashType(projectOwner);
          const category = findMatchingCategory(mappedRow.category);

          if (!operationDate || (expenseAmount === 0 && incomeAmount === 0)) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              reason: `Некорректные данные: дата=${mappedRow.operation_date}→${operationDate}, расход=${expenseAmount}, приход=${incomeAmount}`,
              data: mappedRow
            });
            continue;
          }

          const txIndices: number[] = [];
          
          if (expenseAmount > 0 && incomeAmount > 0) {
            txIndices.push(allPreparedTransactions.length);
            allPreparedTransactions.push({
              created_by: selectedEmployeeId || user?.id,
              operation_date: operationDate,
              static_project_name: mappedRow.project_name || null,
              project_owner: cashType || projectOwner || 'Без кассы',
              description: mappedRow.description || 'Расход',
              category: category,
              cash_type: cashType,
              expense_amount: expenseAmount,
              income_amount: null,
              notes: mappedRow.notes || null,
              verification_status: 'approved',
              requires_verification: false,
              _rowNum: rowNum
            });
            
            txIndices.push(allPreparedTransactions.length);
            allPreparedTransactions.push({
              created_by: selectedEmployeeId || user?.id,
              operation_date: operationDate,
              static_project_name: mappedRow.project_name || null,
              project_owner: cashType || projectOwner || 'Без кассы',
              description: mappedRow.description || 'Приход',
              category: category,
              cash_type: cashType,
              expense_amount: null,
              income_amount: incomeAmount,
              notes: mappedRow.notes || null,
              verification_status: 'approved',
              requires_verification: false,
              _rowNum: rowNum
            });
          } else {
            txIndices.push(allPreparedTransactions.length);
            allPreparedTransactions.push({
              created_by: selectedEmployeeId || user?.id,
              operation_date: operationDate,
              static_project_name: mappedRow.project_name || null,
              project_owner: cashType || projectOwner || 'Без кассы',
              description: mappedRow.description || (expenseAmount > 0 ? 'Расход' : 'Приход'),
              category: category,
              cash_type: cashType,
              expense_amount: expenseAmount || null,
              income_amount: incomeAmount || null,
              notes: mappedRow.notes || null,
              verification_status: 'approved',
              requires_verification: false,
              _rowNum: rowNum
            });
          }
          
          rowToTransactionMap.set(rowNum, txIndices);
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            reason: error.message || 'Ошибка обработки',
            data: mappedRow
          });
        }
      }

      console.log(`[FinancesImport] Подготовлено ${allPreparedTransactions.length} транзакций из ${parsedData.length} строк`);
      console.log(`[FinancesImport] Ошибок при подготовке: ${result.failed}`);

      // Проверяем дубликаты
      console.log('[FinancesImport] Проверка дубликатов в БД...');
      const duplicateKeys = await checkDuplicates(allPreparedTransactions);
      console.log(`[FinancesImport] Найдено ${duplicateKeys.size} существующих записей в БД`);

      // Фильтруем дубликаты
      const transactionsToInsert = allPreparedTransactions.filter(tx => {
        const key = `${tx.operation_date}|${tx.description || ''}|${tx.expense_amount || 0}|${tx.income_amount || 0}`;
        if (duplicateKeys.has(key)) {
          console.log(`[FinancesImport] Строка ${tx._rowNum}: ДУБЛИКАТ - пропускаем`);
          result.skipped++;
          return false;
        }
        return true;
      });

      console.log(`[FinancesImport] После фильтрации дубликатов: ${transactionsToInsert.length} транзакций для вставки`);

      if (transactionsToInsert.length === 0) {
        toast({
          title: "Нет новых данных",
          description: `Все ${allPreparedTransactions.length} записей уже существуют в базе данных`,
        });
        setImporting(false);
        result.total = parsedData.length;
        setImportResult(result as ImportResult);
        finishImport(result);
        setStep(4);
        return;
      }

      // Батч-импорт с продолжением при ошибках
      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(transactionsToInsert.length / BATCH_SIZE);
      let processedCount = 0;

      console.log('[FinancesImport] Размер батча:', BATCH_SIZE, '| Всего батчей:', totalBatches);
      
      for (let batchStart = 0; batchStart < transactionsToInsert.length; batchStart += BATCH_SIZE) {
        const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
        
        if (abortRef.current) {
          console.log('[FinancesImport] Импорт прерван пользователем на батче', batchNum);
          break;
        }

        while (isPausedRef.current && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (abortRef.current) break;

        const batchEnd = Math.min(batchStart + BATCH_SIZE, transactionsToInsert.length);
        const batch = transactionsToInsert.slice(batchStart, batchEnd);
        
        // Убираем служебное поле _rowNum перед вставкой
        const cleanBatch = batch.map(({ _rowNum, ...tx }) => tx);
        
        console.log(`[FinancesImport] Батч ${batchNum}/${totalBatches}: вставляем ${cleanBatch.length} транзакций`);

        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          const { error } = await supabase
            .from('financial_transactions')
            .insert(cleanBatch);

          if (!error) {
            console.log(`[FinancesImport] Батч ${batchNum}: УСПЕХ - вставлено ${cleanBatch.length} записей`);
            result.inserted += cleanBatch.length;
            success = true;
          } else if (error.message.includes('timeout') || error.message.includes('canceling statement')) {
            retries--;
            console.warn(`[FinancesImport] Батч ${batchNum}: ТАЙМАУТ, осталось попыток: ${retries}`);
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            console.error(`[FinancesImport] Батч ${batchNum}: ОШИБКА БД:`, error);
            // НЕ ОСТАНАВЛИВАЕМ импорт - продолжаем со следующим батчем
            result.failed += cleanBatch.length;
            batch.forEach(tx => {
              result.errors.push({
                row: tx._rowNum,
                reason: error.message || 'Ошибка вставки в БД'
              });
            });
            break;
          }
        }
        
        // Если все попытки исчерпаны
        if (retries === 0 && !success) {
          console.error(`[FinancesImport] Батч ${batchNum}: все попытки исчерпаны, продолжаем...`);
          result.failed += cleanBatch.length;
          batch.forEach(tx => {
            result.errors.push({
              row: tx._rowNum,
              reason: 'Таймаут после 3 попыток'
            });
          });
        }

        processedCount = batchEnd;
        const progressPercent = Math.round((processedCount / transactionsToInsert.length) * 100);
        setImportProgress(progressPercent);
        updateProgress(processedCount, transactionsToInsert.length);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('[FinancesImport] === ИМПОРТ ЗАВЕРШЁН ===');
      console.log('[FinancesImport] Результат:', result);

      setImportResult(result as ImportResult);
      finishImport(result);
      setStep(4);

      if (result.inserted > 0) {
        onImportComplete();
      }

      toast({
        title: "Импорт завершен",
        description: `Добавлено: ${result.inserted}, пропущено дубликатов: ${result.skipped}, ошибок: ${result.failed}`,
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

  // Фоновый импорт - отправка данных на сервер
  const handleBackgroundImport = async () => {
    console.log('[FinancesImport] === ФОНОВЫЙ ИМПОРТ ===');
    
    if (!validateData()) {
      console.log('[FinancesImport] Валидация не пройдена');
      return;
    }

    setStartingBackgroundImport(true);

    try {
      // Подготавливаем данные для отправки
      const rowsToSend = parsedData.map(row => {
        const mappedRow = mapRow(row);
        return {
          operation_date: mappedRow.operation_date,
          project_name: mappedRow.project_name || null,
          project_owner: mappedRow.project_owner || null,
          description: mappedRow.description || null,
          expense_amount: parseAmount(mappedRow.expense_amount),
          income_amount: parseAmount(mappedRow.income_amount),
          category: mappedRow.category || null,
          notes: mappedRow.notes || null,
        };
      });

      // Создаём job для отслеживания
      const jobId = await createJob('finances', rowsToSend.length);
      if (!jobId) {
        throw new Error('Не удалось создать задачу импорта');
      }

      console.log('[FinancesImport] Создана задача:', jobId);

      // Сохраняем данные для возможности продолжения импорта
      const { error: updateError } = await supabase
        .from('import_jobs')
        .update({ 
          import_data: rowsToSend // Сохраняем исходные данные
        })
        .eq('id', jobId);

      if (updateError) {
        console.warn('[FinancesImport] Не удалось сохранить import_data:', updateError);
      }

      // Отправляем на edge function
      const { data, error } = await supabase.functions.invoke('finances-import', {
        body: {
          rows: rowsToSend,
          user_id: user?.id,
          target_user_id: selectedEmployeeId || user?.id,
          background_mode: true,
          job_id: jobId
        }
      });

      if (error) throw error;

      console.log('[FinancesImport] Ответ от сервера:', data);

      setBackgroundImportStarted(true);
      setStep(5); // Новый шаг - "импорт запущен"
      
      toast({
        title: "Импорт запущен",
        description: "Вы можете закрыть это окно. Импорт продолжится в фоновом режиме.",
      });

    } catch (error: any) {
      console.error('[FinancesImport] Ошибка запуска фонового импорта:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось запустить фоновый импорт",
      });
    } finally {
      setStartingBackgroundImport(false);
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
    setBackgroundImportStarted(false);
    setStartingBackgroundImport(false);
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

            {/* Диагностика форматов дат */}
            {dateFormatStats.unparsed > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Диагностика дат ({dateFormatStats.parsed} из {dateFormatStats.total} распознано)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {dateFormatStats.excelSerial > 0 && (
                      <Badge variant="outline">Excel serial: {dateFormatStats.excelSerial}</Badge>
                    )}
                    {dateFormatStats.ddmmyyyy > 0 && (
                      <Badge variant="outline">ДД.ММ.ГГГГ: {dateFormatStats.ddmmyyyy}</Badge>
                    )}
                    {dateFormatStats.iso > 0 && (
                      <Badge variant="outline">ISO: {dateFormatStats.iso}</Badge>
                    )}
                    {dateFormatStats.unparsed > 0 && (
                      <Badge variant="destructive">Не распознано: {dateFormatStats.unparsed}</Badge>
                    )}
                  </div>
                  {dateFormatStats.examples.unparsed.length > 0 && (
                    <div className="mt-2">
                      <p className="text-muted-foreground text-xs mb-1">Примеры нераспознанных дат:</p>
                      <div className="flex flex-wrap gap-1">
                        {dateFormatStats.examples.unparsed.map((ex, i) => (
                          <code key={i} className="text-xs bg-destructive/10 px-1 rounded">{ex}</code>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Предпросмотр маппинга кошельков */}
            {walletMappingStats.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Предпросмотр кошельков ({walletMappingStats.length} уникальных)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left py-1 px-2">В файле</th>
                          <th className="text-center py-1 px-1">→</th>
                          <th className="text-left py-1 px-2">В системе</th>
                          <th className="text-right py-1 px-2">Кол-во</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletMappingStats.map((item, index) => (
                          <tr 
                            key={index} 
                            className={!item.isValid ? 'bg-yellow-500/10' : ''}
                          >
                            <td className="py-1 px-2 text-muted-foreground">{item.source}</td>
                            <td className="py-1 px-1 text-center text-muted-foreground">→</td>
                            <td className="py-1 px-2 font-medium">
                              {item.target || <span className="text-muted-foreground">(без кассы)</span>}
                              {item.isValid && <CheckCircle2 className="inline w-3 h-3 text-green-500 ml-1" />}
                              {!item.isValid && item.target && <AlertTriangle className="inline w-3 h-3 text-yellow-500 ml-1" />}
                            </td>
                            <td className="text-right py-1 px-2">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {walletMappingStats.some(w => !w.isValid) && (
                    <p className="text-xs text-yellow-600 mt-2">
                      ⚠️ Некоторые кошельки не распознаны и будут сохранены как есть
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Предупреждение о подозрительно больших суммах */}
            {importStats.largeSumsCount > 0 && (
              <Card className="border-yellow-500 bg-yellow-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    Внимание: {importStats.largeSumsCount} транзакций с суммой &gt; 500 тыс ₽
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Проверьте эти суммы - возможно числа неправильно распознались из Excel.
                    Например, "26 246,37" могло быть прочитано как "26 246 367".
                  </p>
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {parsedData.map((row, idx) => {
                      const mappedRow = mapRow(row);
                      const expense = parseAmount(mappedRow.expense_amount);
                      const income = parseAmount(mappedRow.income_amount);
                      
                      if (expense <= 500000 && income <= 500000) return null;
                      
                      return (
                        <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-background/50 rounded border border-yellow-500/20 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{mappedRow.description || '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {mappedRow.operation_date} • {mappedRow.cash_type || '—'}
                            </div>
                          </div>
                          <div className="text-right font-mono whitespace-nowrap">
                            {expense > 0 && (
                              <div className="text-red-600">−{formatCurrency(expense)}</div>
                            )}
                            {income > 0 && (
                              <div className="text-green-600">+{formatCurrency(income)}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Детализация ошибок */}
            {importStats.errorCount > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    Причины ошибок
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex flex-wrap gap-2">
                    {importStats.errorsByType.invalidDate > 0 && (
                      <Badge variant="outline" className="border-destructive/50">
                        Некорректная дата: {importStats.errorsByType.invalidDate}
                      </Badge>
                    )}
                    {importStats.errorsByType.zeroAmount > 0 && (
                      <Badge variant="outline" className="border-destructive/50">
                        Нулевая сумма: {importStats.errorsByType.zeroAmount}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Статус валидации */}
            <div className="flex gap-4 items-center flex-wrap">
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
                  {importStats.errorCount} ошибок (будут пропущены)
                </Badge>
              )}
            </div>

            {/* Выбор сотрудника для импорта */}
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Импортировать транзакции для сотрудника</Label>
              <Select
                value={selectedEmployeeId || 'me'}
                onValueChange={(value) => setSelectedEmployeeId(value === 'me' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Для себя ({user?.email})</SelectItem>
                  {profiles?.filter(p => p.employment_status === 'active').map((profile: any) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Все импортированные транзакции будут созданы от имени выбранного сотрудника и автоматически проверены
              </p>
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
                        {headers.filter(h => h && h.trim() !== '').map(header => (
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
                              <div>
                                <span className="text-muted-foreground">Касса:</span>{' '}
                                {mappedRow.project_owner ? (
                                  <>
                                    <span className="text-muted-foreground text-xs line-through mr-1">
                                      {mappedRow.project_owner}
                                    </span>
                                    <span className="font-medium">
                                      {mapCashType(mappedRow.project_owner) || '(без кассы)'}
                                    </span>
                                  </>
                                ) : '-'}
                              </div>
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

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleImport} disabled={parsedData.length === 0 || importStats.validCount === 0 || importing}>
                Импортировать {importStats.validCount} записей
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleBackgroundImport} 
                disabled={parsedData.length === 0 || importStats.validCount === 0 || startingBackgroundImport}
              >
                {startingBackgroundImport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Запуск...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 mr-2" />
                    Импорт в фоне
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setStep(2)}>
                Назад
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              "Импорт в фоне" позволяет закрыть окно — импорт продолжится на сервере
            </p>
          </div>
        )}

        {step === 4 && importResult && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Результат импорта</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-sm">Всего записей</p>
                  <p className="font-semibold text-lg">{importResult.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <p className="text-muted-foreground text-sm">Импортировано</p>
                  <p className="font-semibold text-lg text-green-600">{importResult.inserted}</p>
                </div>
                {'skipped' in importResult && (importResult as any).skipped > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10">
                    <p className="text-muted-foreground text-sm">Дубликатов</p>
                    <p className="font-semibold text-lg text-yellow-600">{(importResult as any).skipped}</p>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <p className="text-muted-foreground text-sm">Ошибок</p>
                    <p className="font-semibold text-lg text-destructive">{importResult.failed}</p>
                  </div>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Ошибки импорта</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-auto space-y-2">
                    {importResult.errors.slice(0, 20).map((error, index) => (
                      <div key={index} className="text-sm border-b border-border/50 pb-1">
                        <strong>Строка {error.row}:</strong> {error.reason}
                      </div>
                    ))}
                    {importResult.errors.length > 20 && (
                      <p className="text-muted-foreground">...и еще {importResult.errors.length - 20} ошибок</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleClose}>
                Закрыть
              </Button>
              {importResult.failed > 0 && (
                <Button variant="outline" onClick={() => { setStep(3); setImportResult(null); }}>
                  Повторить импорт
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CloudUpload className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Импорт запущен!</h3>
              <p className="text-muted-foreground max-w-md">
                Данные отправлены на сервер и обрабатываются в фоновом режиме. 
                Вы можете закрыть это окно — импорт продолжится автоматически.
              </p>
            </div>
            
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Записей для импорта</p>
                    <p className="font-semibold text-lg">{parsedData.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Статус</p>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="font-medium">Обработка...</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center">
              Результаты импорта будут видны при следующем открытии страницы финансов
            </p>

            <div className="flex justify-center">
              <Button onClick={handleClose}>
                Закрыть
              </Button>
            </div>
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
