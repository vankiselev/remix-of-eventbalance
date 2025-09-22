import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  selectedMonth: number;
  selectedYear: number;
}

interface ColumnMapping {
  [key: string]: string;
}

interface ParsedRow {
  [key: string]: any;
}

const ImportDialog = ({ 
  open, 
  onOpenChange, 
  onImportComplete,
  selectedMonth,
  selectedYear 
}: ImportDialogProps) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update' | 'create'>('skip');
  const [importing, setImporting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fieldOptions = [
    { value: '', label: 'Не импортировать' },
    { value: 'name', label: 'Праздник' },
    { value: 'start_date', label: 'Дата' },
    { value: 'project_owner', label: 'Чей проект?' },
    { value: 'managers', label: 'Менеджеры' },
    { value: 'location', label: 'Место' },
    { value: 'event_time', label: 'Время' },
    { value: 'animators', label: 'Аниматоры' },
    { value: 'show_program', label: 'Шоу/Программа' },
    { value: 'contractors', label: 'Подрядчики' },
    { value: 'photo_video', label: 'Фото/Видео' },
    { value: 'notes', label: 'Примечания' },
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
          
          // Удаляем BOM если есть
          const cleanText = csvText.replace(/^\uFEFF/, '');
          
          // Используем PapaParse для надежного парсинга CSV
          const parseResult = Papa.parse(cleanText, {
            header: true,
            skipEmptyLines: true,
            delimiter: "", // автоопределение
            transformHeader: (header: string) => header.trim(),
            transform: (value: string) => value.trim()
          });

          if (parseResult.errors.length > 0) {
            throw new Error(`Ошибки парсинга CSV: ${parseResult.errors.map(e => e.message).join(', ')}`);
          }

          fileHeaders = parseResult.meta.fields || [];
          data = parseResult.data as ParsedRow[];
          
        } else if (uploadedFile.name.endsWith('.xlsx')) {
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
            }).filter(row => Object.values(row).some(v => v)); // Убираем пустые строки
          }
        }

        setHeaders(fileHeaders);
        setParsedData(data);
        setStep(2);

        // Автоматическое сопоставление по похожим названиям
        const autoMapping: ColumnMapping = {};
        fileHeaders.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('дат') || lowerHeader.includes('date')) {
            autoMapping[header] = 'start_date';
          } else if (lowerHeader.includes('праздник') || lowerHeader.includes('название') || lowerHeader.includes('name')) {
            autoMapping[header] = 'name';
          } else if (lowerHeader.includes('проект') || lowerHeader.includes('owner')) {
            autoMapping[header] = 'project_owner';
          } else if (lowerHeader.includes('менеджер') || lowerHeader.includes('manager')) {
            autoMapping[header] = 'managers';
          } else if (lowerHeader.includes('место') || lowerHeader.includes('location')) {
            autoMapping[header] = 'location';
          } else if (lowerHeader.includes('время') || lowerHeader.includes('time')) {
            autoMapping[header] = 'event_time';
          } else if (lowerHeader.includes('аниматор') || lowerHeader.includes('animator')) {
            autoMapping[header] = 'animators';
          } else if (lowerHeader.includes('шоу') || lowerHeader.includes('программа') || lowerHeader.includes('program')) {
            autoMapping[header] = 'show_program';
          } else if (lowerHeader.includes('подрядчик') || lowerHeader.includes('contractor')) {
            autoMapping[header] = 'contractors';
          } else if (lowerHeader.includes('фото') || lowerHeader.includes('видео') || lowerHeader.includes('photo') || lowerHeader.includes('video')) {
            autoMapping[header] = 'photo_video';
          } else if (lowerHeader.includes('примечани') || lowerHeader.includes('note')) {
            autoMapping[header] = 'notes';
          }
        });
        setColumnMapping(autoMapping);

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "Не удалось прочитать файл",
        });
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

    // Excel серийные номера (числа больше 1)
    if (/^\d+(\.\d+)?$/.test(s)) {
      const num = parseFloat(s);
      if (num > 1 && num < 100000) { // разумные пределы для Excel дат
        // Excel epoch: 1899-12-30 (учитываем leap year bug в Excel)
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + num * 86400000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Русские форматы дат
    const formats = [
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // дд.мм.гггг
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // дд/мм/гггг
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // дд-мм-гггг
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // гггг-мм-дд
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
      
      if (!mappedRow.name) {
        errors.push(`Строка ${index + 2}: отсутствует название праздника`);
        return;
      }

      if (!mappedRow.start_date || !parseDate(mappedRow.start_date)) {
        errors.push(`Строка ${index + 2}: неверная дата "${mappedRow.start_date}"`);
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
      if (dbField && row[fileColumn] !== undefined) {
        mapped[dbField] = row[fileColumn];
      }
    });
    return mapped;
  };

  const performImport = async () => {
    if (!user) return;
    
    setImporting(true);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      // Обрабатываем данные чанками по 100 записей
      const CHUNK_SIZE = 100;
      const validRows = parsedData.filter(row => {
        const mappedRow = mapRow(row);
        return mappedRow.name && mappedRow.start_date && parseDate(mappedRow.start_date);
      });

      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        
        for (const row of chunk) {
          try {
            const mappedRow = mapRow(row);
            const parsedDate = parseDate(mappedRow.start_date);
            if (!parsedDate) continue;

            // Очищаем данные
            const cleanEventData = {
              name: String(mappedRow.name || '').trim(),
              start_date: parsedDate,
              project_owner: mappedRow.project_owner ? String(mappedRow.project_owner).trim() : null,
              managers: mappedRow.managers ? String(mappedRow.managers).trim() : null,
              location: mappedRow.location ? String(mappedRow.location).trim() : null,
              event_time: mappedRow.event_time ? String(mappedRow.event_time).trim() : null,
              animators: mappedRow.animators ? String(mappedRow.animators).trim() : null,
              show_program: mappedRow.show_program ? String(mappedRow.show_program).trim() : null,
              contractors: mappedRow.contractors ? String(mappedRow.contractors).trim() : null,
              photo_video: mappedRow.photo_video ? String(mappedRow.photo_video).trim() : null,
              notes: mappedRow.notes ? String(mappedRow.notes).trim() : null,
              created_by: user.id,
            };

            // Проверяем дубликаты
            const { data: existingEvents, error: selectError } = await supabase
              .from("events")
              .select("id")
              .eq("start_date", parsedDate)
              .eq("name", cleanEventData.name);

            if (selectError) {
              errors.push(`Ошибка поиска дубликата: ${selectError.message}`);
              continue;
            }

            if (existingEvents && existingEvents.length > 0) {
              if (duplicateAction === 'skip') {
                skipped++;
              } else if (duplicateAction === 'update') {
                const { error: updateError } = await supabase
                  .from("events")
                  .update(cleanEventData)
                  .eq("id", existingEvents[0].id);
                
                if (updateError) {
                  errors.push(`Ошибка обновления: ${updateError.message}`);
                } else {
                  updated++;
                }
              } else if (duplicateAction === 'create') {
                const { error: insertError } = await supabase
                  .from("events")
                  .insert(cleanEventData);
                
                if (insertError) {
                  errors.push(`Ошибка создания дубликата: ${insertError.message}`);
                } else {
                  created++;
                }
              }
            } else {
              const { error: insertError } = await supabase
                .from("events")
                .insert(cleanEventData);
              
              if (insertError) {
                errors.push(`Ошибка создания записи: ${insertError.message}`);
              } else {
                created++;
              }
            }
          } catch (rowError: any) {
            errors.push(`Ошибка обработки строки: ${rowError.message}`);
          }
        }

        // Показываем прогресс
        if (chunk.length > 0) {
          toast({
            title: "Импорт в процессе",
            description: `Обработано ${Math.min(i + CHUNK_SIZE, validRows.length)} из ${validRows.length} записей...`,
          });
        }
      }

      if (errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Импорт завершен с ошибками",
          description: `Создано: ${created}, Обновлено: ${updated}, Пропущено: ${skipped}. Ошибок: ${errors.length}`,
        });
        console.error("Ошибки импорта:", errors);
      } else {
        toast({
          title: "Импорт успешно завершен",
          description: `Создано: ${created}, Обновлено: ${updated}, Пропущено: ${skipped}`,
        });
      }

      onImportComplete();
      handleClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Критическая ошибка импорта",
        description: error.message || "Неизвестная ошибка",
      });
      console.error("Критическая ошибка импорта:", error);
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
    setDuplicateAction('skip');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт из Excel/CSV - Шаг {step}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Выберите файл (.xlsx или .csv)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileUpload}
                className="mt-2"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Поддерживаемые форматы:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Excel файлы (.xlsx) - поддержка серийных дат Excel</li>
                <li>CSV файлы (.csv) с разделителями ; или , - автоопределение, обработка BOM</li>
                <li>Первая строка должна содержать заголовки столбцов</li>
                <li>Даты: ДД.ММ.ГГГГ, ДД/ММ/ГГГГ, ДД-ММ-ГГГГ или серийные номера Excel</li>
                <li>Обработка чанками по 100 записей для больших файлов</li>
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
                      value={columnMapping[header] || ''}
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
                <h4 className="font-medium mb-2">Превью данных (первые 5 строк):</h4>
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
                      {parsedData.slice(0, 5).map((row, index) => (
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

            <div>
              <Label>Действие при дубликатах (по Дате + Празднику)</Label>
              <RadioGroup value={duplicateAction} onValueChange={(value: any) => setDuplicateAction(value)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip">Пропускать дубликаты</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update">Обновлять существующие</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create">Создавать копии</Label>
                </div>
              </RadioGroup>
            </div>

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
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;