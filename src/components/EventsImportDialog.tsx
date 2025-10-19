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

interface EventsImportDialogProps {
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

const EventsImportDialog = ({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: EventsImportDialogProps) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
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
    { value: 'event_date', label: 'Дата' },
    { value: 'title', label: 'Праздник' },
    { value: 'project_owner', label: 'Чей проект?' },
    { value: 'managers', label: 'Менеджеры' },
    { value: 'place', label: 'Место' },
    { value: 'time_range', label: 'Время' },
    { value: 'animators', label: 'Аниматоры' },
    { value: 'show_program', label: 'Шоу/Программа' },
    { value: 'contractors', label: 'Подрядчики' },
    { value: 'photo', label: 'Фото' },
    { value: 'video', label: 'Видео' },
    { value: 'notes', label: 'Примечания' },
    { value: 'source_event_id', label: 'ID источника' },
  ];

  // Heuristic header detection for Excel/CSV with top banner rows
  const headerKeywords = ['дат','date','праздник','название','name','проект','owner','менеджер','manager','место','location','place','время','time','аниматор','animator','шоу','программа','program','подрядчик','contractor','фото','photo','видео','video','примечан','note','?'];
  const findHeaderRow = (rows: any[][]) => {
    const limit = Math.min(15, rows.length);
    for (let i = 0; i < limit; i++) {
      const row = (rows[i] || []).map(v => String(v ?? '').trim());
      const nonEmpty = row.filter(Boolean);
      if (nonEmpty.length < 2) continue;
      const hit = nonEmpty.some(cell => {
        const lc = cell.toLowerCase();
        return headerKeywords.some(k => lc.includes(k));
      });
      if (hit) return { index: i, headers: row };
    }
    for (let i = 0; i < limit; i++) {
      const row = (rows[i] || []).map(v => String(v ?? '').trim());
      if (row.filter(Boolean).length >= 2) return { index: i, headers: row };
    }
    return { index: 0, headers: (rows[0] || []).map(v => String(v ?? '').trim()) };
  };

  const buildObjectsFromRows = (rows: any[][], headerIndex: number, headersRow: string[]) => {
    const objects = rows.slice(headerIndex + 1).map((row) => {
      const obj: ParsedRow = {};
      headersRow.forEach((header, idx) => {
        obj[header] = row[idx] ?? '';
      });
      return obj;
    }).filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));
    return objects;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (uploadedFile.name.endsWith('.csv')) {
          // Для CSV файлов обрабатываем сразу
          processCSVFile(event.target?.result as string);
        } else if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
          // Для Excel файлов сначала показываем выбор листов
          const workbookData = XLSX.read(event.target?.result, { type: 'binary' });
          setWorkbook(workbookData);
          setAvailableSheets(workbookData.SheetNames);
          if (workbookData.SheetNames.length === 1) {
            // Если только один лист, выбираем его автоматически
            setSelectedSheet(workbookData.SheetNames[0]);
            processExcelSheet(workbookData, workbookData.SheetNames[0]);
          } else {
            // Показываем выбор листа
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
    // Remove BOM if present
    const cleanText = csvText.replace(/^\uFEFF/, '');
    
    // Use PapaParse for reliable CSV parsing
    let parseResult = Papa.parse(cleanText, {
      header: true,
      skipEmptyLines: true,
      delimiter: "", // auto-detect
      transformHeader: (header: string) => header.trim(),
      transform: (value: any) => typeof value === 'string' ? value.trim() : value
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    const fields = parseResult.meta.fields || [];
    const hasKnown = fields.some(h => headerKeywords.some(k => (h || '').toLowerCase().includes(k)));
    let data: ParsedRow[] = [];
    let fileHeaders: string[] = [];

    if (!hasKnown || fields.length <= 1) {
      // Fallback: parse without headers and auto-detect
      const rowsResult = Papa.parse(cleanText, {
        header: false,
        skipEmptyLines: true,
        delimiter: "",
      });
      const rows = rowsResult.data as any[][];
      const { index, headers: hdr } = findHeaderRow(rows);
      fileHeaders = hdr;
      data = buildObjectsFromRows(rows, index, fileHeaders);
      toast({ title: 'Определены заголовки', description: `Найдены на строке ${index + 1}` });
    } else {
      fileHeaders = fields;
      data = parseResult.data as ParsedRow[];
    }

    setHeaders(fileHeaders);
    setParsedData(data);
    setupColumnMapping(fileHeaders);
    setStep(3);
  };

  const processExcelSheet = (workbookData: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbookData.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    console.log('Original Excel rows:', rows);
    
    if (rows.length > 0) {
      const { index, headers: hdr } = findHeaderRow(rows);
      const fileHeaders = hdr.map(h => String(h || '').trim());
      
      console.log('Headers found at row', index + 1, ':', fileHeaders);
      
      // Специальная обработка для объединенных ячеек
      const processedRows = handleMergedCells(rows, index, fileHeaders);
      console.log('Processed rows after handling merged cells:', processedRows);
      
      const data = buildObjectsFromRows(processedRows, index, fileHeaders);
      console.log('Final data objects:', data);
      
      if (index > 0) {
        toast({ title: 'Определены заголовки', description: `Найдены на строке ${index + 1}` });
      }

      setHeaders(fileHeaders);
      setParsedData(data);
      setupColumnMapping(fileHeaders);
      setStep(3);
    }
  };

  const handleMergedCells = (rows: any[][], headerIndex: number, fileHeaders: string[]) => {
    const dateColumnIndex = fileHeaders.findIndex(header => 
      header.toLowerCase().includes('дат') || header.toLowerCase().includes('date')
    );
    
    if (dateColumnIndex === -1) return rows;
    
    // Копируем массив для безопасного изменения
    const processedRows = rows.map(row => [...row]);
    let lastValidDate: any = null;
    
    // Обрабатываем строки начиная с данных (после заголовка)
    for (let i = headerIndex + 1; i < processedRows.length; i++) {
      const currentRow = processedRows[i];
      const dateValue = currentRow[dateColumnIndex];
      
      if (dateValue !== undefined && dateValue !== null && String(dateValue).trim() !== '') {
        lastValidDate = dateValue; // запомним последнее непустое значение даты (число/строка)
      } else if (lastValidDate && hasEventData(currentRow, fileHeaders, dateColumnIndex)) {
        // Если дата пуста, но есть данные события, используем последнюю валидную дату
        currentRow[dateColumnIndex] = lastValidDate;
      }
    }
    
    // Нормализуем все значения даты в ISO (yyyy-mm-dd), чтобы и предпросмотр, и валидация видели уже корректные даты
    for (let i = headerIndex + 1; i < processedRows.length; i++) {
      const raw = processedRows[i][dateColumnIndex];
      const normalized = parseDate(raw);
      if (normalized) processedRows[i][dateColumnIndex] = normalized;
    }

    return processedRows;
  };

  const hasEventData = (row: any[], fileHeaders: string[], dateColumnIndex: number) => {
    // Проверяем, есть ли данные в других колонках (кроме даты)
    return row.some((value, index) => {
      if (index === dateColumnIndex) return false; // Пропускаем колонку с датой
      return value && String(value).trim() !== '';
    });
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
    processExcelSheet(workbook, selectedSheet);
  };

  const setupColumnMapping = (fileHeaders: string[]) => {
    // Auto-mapping by similar column names
    const autoMapping: ColumnMapping = {};
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('дат') || lowerHeader.includes('date')) {
        autoMapping[header] = 'event_date';
      } else if (lowerHeader.includes('праздник') || lowerHeader.includes('название') || lowerHeader.includes('name')) {
        autoMapping[header] = 'title';
      } else if (lowerHeader.includes('проект') || lowerHeader.includes('owner') || lowerHeader === '?') {
        autoMapping[header] = 'project_owner';
      } else if (lowerHeader.includes('менеджер') || lowerHeader.includes('manager')) {
        autoMapping[header] = 'managers';
      } else if (lowerHeader.includes('место') || lowerHeader.includes('location') || lowerHeader.includes('place')) {
        autoMapping[header] = 'place';
      } else if (lowerHeader.includes('время') || lowerHeader.includes('time')) {
        autoMapping[header] = 'time_range';
      } else if (lowerHeader.includes('аниматор') || lowerHeader.includes('animator')) {
        autoMapping[header] = 'animators';
      } else if (lowerHeader.includes('шоу') || lowerHeader.includes('программа') || lowerHeader.includes('program')) {
        autoMapping[header] = 'show_program';
      } else if (lowerHeader.includes('подрядчик') || lowerHeader.includes('contractor')) {
        autoMapping[header] = 'contractors';
      } else if (lowerHeader.includes('фото') || lowerHeader.includes('photo')) {
        autoMapping[header] = 'photo';
      } else if (lowerHeader.includes('видео') || lowerHeader.includes('video')) {
        autoMapping[header] = 'video';
      } else if (lowerHeader.includes('примечани') || lowerHeader.includes('note')) {
        autoMapping[header] = 'notes';
      } else {
        autoMapping[header] = 'skip';
      }
    });
    setColumnMapping(autoMapping);
  };

  const formatYMD = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    const s = String(dateStr).trim();
    if (!s) return null;

    console.log('Parsing date:', s);

    // Excel serial numbers (numbers greater than 1)
    if (/^\d+(\.\d+)?$/.test(s)) {
      const num = parseFloat(s);
      console.log('Found numeric date:', num);
      
      if (num > 1 && num < 100000) { // reasonable limits for Excel dates
        try {
          // Excel epoch UTC: 1899-12-30
          const excelEpochUTC = Date.UTC(1899, 11, 30);
          const dt = new Date(excelEpochUTC + num * 86400000);
          const y = dt.getUTCFullYear();
          const m = dt.getUTCMonth() + 1;
          const d = dt.getUTCDate();
          const result = formatYMD(y, m, d);
          console.log('Excel serial date converted to:', result);
          return result;
        } catch (error) {
          console.warn('Error parsing Excel serial date:', s, error);
        }
      }
    }
    
    // Попробуем распарсить текстовые даты на русском языке
    const russianMonths = {
      'январ': 1, 'феврал': 2, 'март': 3, 'апрел': 4, 'ма': 5, 'июн': 6,
      'июл': 7, 'август': 8, 'сентябр': 9, 'октябр': 10, 'ноябр': 11, 'декабр': 12
    };
    
    // Попробуем найти русские названия месяцев (например "1 сентября", "10 сентября")
    const russianDateMatch = s.toLowerCase().match(/(\d{1,2})\s*([а-яё]+)/);
    if (russianDateMatch) {
      const day = parseInt(russianDateMatch[1]);
      const monthStr = russianDateMatch[2];
      console.log('Found Russian date pattern:', day, monthStr);
      
      for (const [monthName, monthNum] of Object.entries(russianMonths)) {
        if (monthStr.includes(monthName)) {
          const currentYear = new Date().getFullYear();
          const result = formatYMD(currentYear, monthNum as number, day);
          console.log('Russian date converted to:', result);
          return result;
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
          const result = formatYMD(y, m, d);
          console.log('Standard date converted to:', result);
          return result;
        }
      }
    }

    console.log('Date parsing failed for:', s);
    return null;
  };

  // Fallback: parse date from title prefix like "0209 ..." => 2 сентября
  const parseDateFromTitle = (title: string): string | null => {
    if (!title) return null;
    const t = String(title).trim();
    const m = t.match(/^(\d{2})(\d{2})\b/);
    if (!m) return null;
    const day = parseInt(m[1], 10);   // Первые 2 цифры = день
    const month = parseInt(m[2], 10); // Вторые 2 цифры = месяц
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const year = new Date().getFullYear();
    // ВАЖНО: не используем toISOString() — это сдвигает дату на -1 день в UTC
    return formatYMD(year, month, day);
  };

  const validateData = () => {
    const errors: string[] = [];
    let validRows = 0;

    console.log('Validating data:', parsedData.length, 'rows');

    parsedData.forEach((row, index) => {
      const mappedRow = mapRow(row);
      const dateFromTitle = parseDateFromTitle(mappedRow.title);
      const dateFromCell = parseDate(mappedRow.event_date);
      const finalDate = dateFromTitle || dateFromCell;
      
      console.log(`Row ${index + 2}:`, { 
        originalDate: mappedRow.event_date, 
        dateFromCell, dateFromTitle,
        finalDate,
        title: mappedRow.title 
      });
      
      if (!mappedRow.title) {
        errors.push(`Строка ${index + 2}: отсутствует название праздника`);
        return;
      }

      if (!finalDate) {
        errors.push(`Строка ${index + 2}: неверная дата (столбец пуст, не удалось определить из названия "${mappedRow.title}")`);
        return;
      }

      validRows++;
    });

    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Ошибки валидации",
        description: `Найдено ошибок: ${errors.length}. Первые 5: ${errors.slice(0, 5).join(', ')}`,
      });
      return false;
    }

    toast({
      title: "Валидация прошла успешно",
      description: `Готово к импорту: ${validRows} записей`,
    });
    return true;
  };

  const mapRow = (row: ParsedRow): any => {
    const mapped: any = {};
    Object.entries(columnMapping).forEach(([fileColumn, dbField]) => {
      if (dbField && dbField !== 'skip' && row[fileColumn] !== undefined) {
        mapped[dbField] = row[fileColumn];
      }
    });
    return mapped;
  };

  const performImport = async () => {
    if (!user) return;
    
    setImporting(true);
    setImportProgress(0);

    try {
      // Process data in chunks
      const validRows = parsedData.filter(row => {
        const mappedRow = mapRow(row);
        const finalDate = parseDateFromTitle(mappedRow.title) || parseDate(mappedRow.event_date);
        return mappedRow.title && finalDate;
      });

      // Normalize data
      const normalizedRows = validRows.map(row => {
        const mappedRow = mapRow(row);
        const parsedDate = parseDateFromTitle(mappedRow.title) || parseDate(mappedRow.event_date);
        
        return {
          event_date: parsedDate,
          title: String(mappedRow.title || '').trim(),
          project_owner: mappedRow.project_owner ? String(mappedRow.project_owner).trim() : null,
          managers: mappedRow.managers ? String(mappedRow.managers).trim() : null,
          place: mappedRow.place ? String(mappedRow.place).trim() : null,
          time_range: mappedRow.time_range ? String(mappedRow.time_range).trim() : null,
          animators: mappedRow.animators ? String(mappedRow.animators).trim() : null,
          show_program: mappedRow.show_program ? String(mappedRow.show_program).trim() : null,
          contractors: mappedRow.contractors ? String(mappedRow.contractors).trim() : null,
          photo: mappedRow.photo ? String(mappedRow.photo).trim() : null,
          video: mappedRow.video ? String(mappedRow.video).trim() : null,
          notes: mappedRow.notes ? String(mappedRow.notes).trim() : null,
          source_event_id: mappedRow.source_event_id || null,
        };
      });

      // Process in chunks of 500
      const CHUNK_SIZE = 500;
      let totalResult: ImportResult = {
        total: normalizedRows.length,
        inserted: 0,
        updated: 0,
        failed: 0,
        errors: []
      };

      for (let i = 0; i < normalizedRows.length; i += CHUNK_SIZE) {
        const chunk = normalizedRows.slice(i, i + CHUNK_SIZE);
        
        const { data, error } = await supabase.functions.invoke('events-import', {
          body: {
            rows: chunk,
            user_id: user.id
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          totalResult.inserted += data.inserted || 0;
          totalResult.updated += data.updated || 0;
          totalResult.failed += data.failed || 0;
          totalResult.errors.push(...(data.errors || []));
        }

        // Update progress
        const progress = Math.min(((i + CHUNK_SIZE) / normalizedRows.length) * 100, 100);
        setImportProgress(progress);
      }

      setImportResult(totalResult);
      setStep(3);

      toast({
        title: "Импорт завершен",
        description: `Создано: ${totalResult.inserted}, Обновлено: ${totalResult.updated}, Ошибок: ${totalResult.failed}`,
      });

      onImportComplete();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка импорта",
        description: error.message || "Неизвестная ошибка",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт мероприятий из Excel/CSV - Шаг {step}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
          <div>
            <Label htmlFor="file" className="text-base font-semibold">Выберите файл (.xlsx, .xls или .csv)</Label>
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
            <div className="text-sm text-muted-foreground">
              <p>Поддерживаемые форматы:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Excel файлы (.xlsx, .xls) - поддержка серийных дат Excel</li>
                <li>CSV файлы (.csv) с разделителями ; или , - автоопределение, обработка BOM</li>
                <li>Первая строка должна содержать заголовки столбцов</li>
                <li>Обязательные поля: Дата и Праздник</li>
                <li>Даты: ДД.ММ.ГГГГ, ДД/ММ/ГГГГ, ДД-ММ-ГГГГ или серийные номера Excel</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && availableSheets.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Выберите лист для импорта</h3>
              <Label htmlFor="sheet-select">Доступные листы в файле:</Label>
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Выберите лист" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheetName) => (
                    <SelectItem key={sheetName} value={sheetName}>
                      {sheetName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSheetSelect} disabled={!selectedSheet}>
                Продолжить
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Сопоставление столбцов</h3>
              <div className="grid gap-4">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="w-48 text-sm font-medium">{header}</div>
                    <Select
                      value={columnMapping[header] || 'skip'}
                      onValueChange={(value) => 
                        setColumnMapping({ ...columnMapping, [header]: value })
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Выберите поле" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {parsedData.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Превью данных (первые 10 строк):</h4>
                <div className="border rounded overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {headers.map((header) => (
                          <th key={header} className="p-2 text-left border-r">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t">
                          {headers.map((header) => (
                            <td key={header} className="p-2 border-r">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={validateData}>Валидировать данные</Button>
              <Button onClick={performImport} disabled={importing} variant="default">
                {importing ? "Импортирую..." : `Импортировать (${parsedData.length} записей)`}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
            </div>
          </div>
        )}

        {step === 4 && importResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Результат импорта</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold text-green-600">{importResult.inserted}</div>
                <div className="text-sm text-muted-foreground">Создано</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                <div className="text-sm text-muted-foreground">Обновлено</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold text-gray-600">{importResult.total - importResult.failed}</div>
                <div className="text-sm text-muted-foreground">Обработано</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-muted-foreground">Ошибок</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Ошибки (первые 10):</h4>
                <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-red-600">
                      Строка {error.row}: {error.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Закрыть
            </Button>
          </div>
        )}

        {importing && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Импорт в процессе...</div>
            <Progress value={importProgress} className="w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventsImportDialog;