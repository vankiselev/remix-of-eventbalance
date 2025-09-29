import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";

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
  const { user } = useAuth();
  const { toast } = useToast();

  const fieldOptions = [
    { value: 'skip', label: 'Не импортировать' },
    { value: 'creator_name', label: 'Имя создателя' },
    { value: 'operation_date', label: 'Дата операции' },
    { value: 'project_name', label: 'Проект' },
    { value: 'cash_type', label: 'Тип кассы (Чей проект)' },
    { value: 'description', label: 'Подробное описание' },
    { value: 'expense_amount', label: 'Траты' },
    { value: 'income_amount', label: 'Приход' },
    { value: 'balance', label: 'Остаток' },
    { value: 'category', label: 'Статья прихода/расхода' },
    { value: 'notes', label: 'Примечания' },
  ];

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
    // Теперь маппинг: поле БД -> заголовок файла
    const autoMapping: ColumnMapping = {};
    
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('чей') || lowerHeader.includes('наличка') || lowerHeader.includes('касс')) {
        // Проверяем "чей проект" ПЕРЕД проверкой просто "проект"
        autoMapping['cash_type'] = header;
      } else if (lowerHeader.includes('имя') || lowerHeader.includes('name')) {
        autoMapping['creator_name'] = header;
      } else if (lowerHeader.includes('дат') || lowerHeader.includes('date') || lowerHeader.includes('операци')) {
        autoMapping['operation_date'] = header;
      } else if (lowerHeader.includes('проект') || lowerHeader.includes('project')) {
        autoMapping['project_name'] = header;
      } else if (lowerHeader.includes('описани') || lowerHeader.includes('подробн')) {
        autoMapping['description'] = header;
      } else if (lowerHeader.includes('трат') || lowerHeader.includes('расход') || lowerHeader.includes('expense')) {
        autoMapping['expense_amount'] = header;
      } else if (lowerHeader.includes('приход') || lowerHeader.includes('доход') || lowerHeader.includes('income')) {
        autoMapping['income_amount'] = header;
      } else if (lowerHeader.includes('остат') || lowerHeader.includes('balance')) {
        autoMapping['balance'] = header;
      } else if (lowerHeader.includes('статья') || lowerHeader.includes('категор') || lowerHeader.includes('category')) {
        autoMapping['category'] = header;
      }
    });
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
    
    // Standard date formats
    const formats = [
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // dd.mm.yyyy
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/mm/yyyy
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // dd-mm-yyyy
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-mm-dd
    ];

    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      const match = s.match(format);
      if (match) {
        let year, month, day;
        if (i === 3) { // yyyy-mm-dd
          [, year, month, day] = match;
        } else { // dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy
          [, day, month, year] = match;
        }
        
        const y = parseInt(year);
        const m = parseInt(month);
        const d = parseInt(day);
        if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        }
      }
    }

    return null;
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr) return 0;
    
    const s = String(amountStr).trim();
    // Убираем валютные символы, пробелы и точки как разделители тысяч
    const cleaned = s.replace(/[₽\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned) || 0;
    return Math.abs(num); // Всегда положительное число
  };

  const mapCashType = (cashTypeStr: string): string => {
    if (!cashTypeStr) return 'nastya';
    
    const s = String(cashTypeStr).toLowerCase();
    if (s.includes('настя') || s.includes('nastya')) return 'nastya';
    if (s.includes('лера') || s.includes('lera')) return 'lera';
    if (s.includes('ваня') || s.includes('vanya')) return 'vanya';
    
    return 'nastya'; // default
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

  const validateData = () => {
    const errors: string[] = [];
    let validRows = 0;

    parsedData.forEach((row, index) => {
      const mappedRow = mapRow(row);
      
      // Проверяем обязательные поля
      if (!mappedRow.operation_date || !parseDate(mappedRow.operation_date)) {
        errors.push(`Строка ${index + 1}: Некорректная дата операции`);
        return;
      }
      
      if (!mappedRow.description) {
        errors.push(`Строка ${index + 1}: Отсутствует описание операции`);
        return;
      }

      const expenseAmount = parseAmount(mappedRow.expense_amount);
      const incomeAmount = parseAmount(mappedRow.income_amount);
      
      if (expenseAmount === 0 && incomeAmount === 0) {
        errors.push(`Строка ${index + 1}: Не указана сумма операции`);
        return;
      }

      if (expenseAmount > 0 && incomeAmount > 0) {
        errors.push(`Строка ${index + 1}: Указаны и доходы и расходы одновременно`);
        return;
      }

      validRows++;
    });

    if (errors.length > 5) {
      toast({
        variant: "destructive",
        title: "Обнаружены ошибки",
        description: `Найдено ${errors.length} ошибок из ${parsedData.length} записей. Будут импортированы только валидные строки.`,
      });
      console.error("Validation errors:", errors.slice(0, 10));
      // Не блокируем импорт, просто показываем предупреждение
    }

    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Ошибки валидации",
        description: errors.slice(0, 3).join('; '),
      });
      console.error("Validation errors:", errors);
      return false;
    }

    if (validRows === 0) {
      toast({
        variant: "destructive",
        title: "Нет данных для импорта",
        description: "Не найдено ни одной валидной строки",
      });
      return false;
    }

    return true;
  };

  const handleImport = async () => {
    if (!validateData()) return;

    setImporting(true);
    setImportProgress(0);

    const result: ImportResult = {
      total: parsedData.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    try {
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const mappedRow = mapRow(row);

        try {
          const operationDate = parseDate(mappedRow.operation_date);
          const expenseAmount = parseAmount(mappedRow.expense_amount);
          const incomeAmount = parseAmount(mappedRow.income_amount);
          const cashType = mapCashType(mappedRow.cash_type);

          if (!operationDate || (expenseAmount === 0 && incomeAmount === 0)) {
            throw new Error("Некорректные данные");
          }

          const transactionData = {
            created_by: user?.id,
            operation_date: operationDate,
            project_owner: mappedRow.project_name || 'Не указан',
            description: mappedRow.description || '',
            category: mappedRow.category || 'Разное',
            cash_type: cashType,
            expense_amount: expenseAmount || null,
            income_amount: incomeAmount || null,
            notes: mappedRow.notes || null
          };

          const { error } = await supabase
            .from('financial_transactions')
            .insert(transactionData);

          if (error) throw error;
          result.inserted++;
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            reason: error.message || 'Неизвестная ошибка',
            data: mappedRow
          });
        }

        setImportProgress(Math.round(((i + 1) / parsedData.length) * 100));
      }

      setImportResult(result);
      setStep(4);

      if (result.inserted > 0) {
        toast({
          title: "Импорт завершен",
          description: `Успешно импортировано ${result.inserted} из ${result.total} записей`,
        });
        onImportComplete();
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: "Ошибка импорта",
        description: error.message || "Произошла ошибка при импорте данных",
      });
    } finally {
      setImporting(false);
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
    resetDialog();
    onOpenChange(false);
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
              <Label htmlFor="file">Выберите Excel или CSV файл</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="mt-2"
              />
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
                Укажите диапазон колонок, начиная со строки с заголовками
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
            <div>
              <h3 className="text-lg font-semibold mb-4">Настройка соответствия колонок</h3>
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
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
                  <CardTitle className="text-base">Предпросмотр данных ({parsedData.length} записей)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-auto">
                    {parsedData.slice(0, 5).map((row, index) => {
                      const mappedRow = mapRow(row);
                      return (
                        <div key={index} className="border-b pb-2 mb-2 text-sm">
                          <div><strong>Дата:</strong> {mappedRow.operation_date}</div>
                          <div><strong>Описание:</strong> {mappedRow.description}</div>
                          <div><strong>Расход:</strong> {mappedRow.expense_amount ? formatCurrency(parseAmount(mappedRow.expense_amount)) : '-'}</div>
                          <div><strong>Доход:</strong> {mappedRow.income_amount ? formatCurrency(parseAmount(mappedRow.income_amount)) : '-'}</div>
                          <div><strong>Касса:</strong> {mapCashType(mappedRow.cash_type)}</div>
                        </div>
                      );
                    })}
                    {parsedData.length > 5 && (
                      <p className="text-muted-foreground">...и еще {parsedData.length - 5} записей</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={parsedData.length === 0}>
                Импортировать {parsedData.length} записей
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FinancesImportDialog;