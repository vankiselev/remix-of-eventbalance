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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let data: ParsedRow[] = [];
        let fileHeaders: string[] = [];

        if (uploadedFile.name.endsWith('.csv')) {
          const csvText = event.target?.result as string;
          
          // Remove BOM if present
          const cleanText = csvText.replace(/^\uFEFF/, '');
          
          // Use PapaParse for reliable CSV parsing
          const parseResult = Papa.parse(cleanText, {
            header: true,
            skipEmptyLines: true,
            delimiter: "", // auto-detect
            transformHeader: (header: string) => header.trim(),
            transform: (value: string) => value.trim()
          });

          if (parseResult.errors.length > 0) {
            throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
          }

          fileHeaders = parseResult.meta.fields || [];
          data = parseResult.data as ParsedRow[];
          
        } else if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
          const workbook = XLSX.read(event.target?.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length > 0) {
            fileHeaders = jsonData[0].map(h => String(h || ''));
            data = jsonData.slice(1).map(row => {
              const rowData: ParsedRow = {};
              fileHeaders.forEach((header, index) => {
                rowData[header] = row[index] || '';
              });
              return rowData;
            }).filter(row => Object.values(row).some(v => v)); // Remove empty rows
          }
        }

        setHeaders(fileHeaders);
        setParsedData(data);
        setStep(2);

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

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    const s = String(dateStr).trim();
    if (!s) return null;

    // Excel serial numbers (numbers greater than 1)
    if (/^\d+(\.\d+)?$/.test(s)) {
      const num = parseFloat(s);
      if (num > 1 && num < 100000) { // reasonable limits for Excel dates
        // Excel epoch: 1899-12-30 (accounting for leap year bug in Excel)
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + num * 86400000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Russian date formats
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
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    return null;
  };

  const validateData = () => {
    const errors: string[] = [];
    let validRows = 0;

    parsedData.forEach((row, index) => {
      const mappedRow = mapRow(row);
      
      if (!mappedRow.title) {
        errors.push(`Строка ${index + 2}: отсутствует название праздника`);
        return;
      }

      if (!mappedRow.event_date || !parseDate(mappedRow.event_date)) {
        errors.push(`Строка ${index + 2}: неверная дата "${mappedRow.event_date}"`);
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
        return mappedRow.title && mappedRow.event_date && parseDate(mappedRow.event_date);
      });

      // Normalize data
      const normalizedRows = validRows.map(row => {
        const mappedRow = mapRow(row);
        const parsedDate = parseDate(mappedRow.event_date);
        
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
              <Label htmlFor="file">Выберите файл (.xlsx, .xls или .csv)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="mt-2"
              />
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

        {step === 2 && (
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

        {step === 3 && importResult && (
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