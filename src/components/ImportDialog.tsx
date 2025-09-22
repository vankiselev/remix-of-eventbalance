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
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length > 0) {
            // Определяем разделитель (; или ,)
            const separator = lines[0].includes(';') ? ';' : ',';
            fileHeaders = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
            
            data = lines.slice(1).map(line => {
              const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
              const row: ParsedRow = {};
              fileHeaders.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              return row;
            });
          }
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
    
    // Пробуем разные форматы дат
    const formats = [
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // дд.мм.гггг
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // дд/мм/гггг
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // гггг-мм-дд
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        if (format === formats[2]) { // yyyy-mm-dd
          [, year, month, day] = match;
        } else { // dd.mm.yyyy or dd/mm/yyyy
          [, day, month, year] = match;
        }
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
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

    try {
      for (const row of parsedData) {
        const mappedRow = mapRow(row);
        if (!mappedRow.name || !mappedRow.start_date) continue;

        const parsedDate = parseDate(mappedRow.start_date);
        if (!parsedDate) continue;

        // Проверяем на дубликаты по дате + название
        const { data: existingEvents } = await supabase
          .from("events")
          .select("id")
          .eq("start_date", parsedDate)
          .eq("name", mappedRow.name);

        const eventData = {
          name: mappedRow.name,
          start_date: parsedDate,
          project_owner: mappedRow.project_owner || null,
          managers: mappedRow.managers || null,
          location: mappedRow.location || null,
          event_time: mappedRow.event_time || null,
          animators: mappedRow.animators || null,
          show_program: mappedRow.show_program || null,
          contractors: mappedRow.contractors || null,
          photo_video: mappedRow.photo_video || null,
          notes: mappedRow.notes || null,
          created_by: user.id,
        };

        if (existingEvents && existingEvents.length > 0) {
          if (duplicateAction === 'skip') {
            skipped++;
          } else if (duplicateAction === 'update') {
            await supabase
              .from("events")
              .update(eventData)
              .eq("id", existingEvents[0].id);
            updated++;
          } else if (duplicateAction === 'create') {
            await supabase
              .from("events")
              .insert(eventData);
            created++;
          }
        } else {
          await supabase
            .from("events")
            .insert(eventData);
          created++;
        }
      }

      toast({
        title: "Импорт завершен",
        description: `Создано: ${created}, Обновлено: ${updated}, Пропущено: ${skipped}`,
      });

      onImportComplete();
      handleClose();
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
                <li>Excel файлы (.xlsx)</li>
                <li>CSV файлы (.csv) с разделителями ; или ,</li>
                <li>Первая строка должна содержать заголовки столбцов</li>
                <li>Даты в формате ДД.ММ.ГГГГ или ДД/ММ/ГГГГ</li>
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