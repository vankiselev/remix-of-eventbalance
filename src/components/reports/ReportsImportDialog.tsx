import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ReportsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ColumnMapping {
  project_name: number | null;
  preparation_work: number | null;
  onsite_work: number | null;
}

interface ParsedRow {
  [key: string]: any;
}

interface ImportResult {
  total: number;
  inserted: number;
  failed: number;
  errors: Array<{ row: number; reason: string; data?: any }>;
}

export const ReportsImportDialog = ({ open, onOpenChange, onImportComplete }: ReportsImportDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    project_name: null,
    preparation_work: null,
    onsite_work: null,
  });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const fileType = uploadedFile.name.split('.').pop()?.toLowerCase();
    
    if (!['xlsx', 'xls', 'csv'].includes(fileType || '')) {
      toast({
        title: 'Ошибка',
        description: 'Поддерживаются только файлы Excel (.xlsx, .xls) и CSV',
        variant: 'destructive',
      });
      return;
    }

    setFile(uploadedFile);

    try {
      if (fileType === 'csv') {
        await processCSVFile(uploadedFile);
        setStep(3); // Skip sheet selection for CSV
      } else {
        await loadExcelWorkbook(uploadedFile);
        setStep(2); // Show sheet selection for Excel
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обработать файл',
        variant: 'destructive',
      });
    }
  };

  const processCSVFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const data = results.data as string[][];
            const headerRow = data[0];
            setHeaders(headerRow);
            
            const rows = data.slice(1).filter(row => row.some(cell => cell && cell.trim()));
            const parsedRows = rows.map(row => {
              const obj: ParsedRow = {};
              headerRow.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });
            
            setParsedData(parsedRows);
            setupColumnMapping(headerRow);
            resolve();
          } else {
            reject(new Error('Файл пуст'));
          }
        },
        error: (error) => reject(error),
      });
    });
  };

  const loadExcelWorkbook = async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    setWorkbook(wb);
    
    // Auto-select first sheet if only one exists
    if (wb.SheetNames.length === 1) {
      setSelectedSheet(wb.SheetNames[0]);
      await processExcelSheet(wb, wb.SheetNames[0]);
      setStep(3);
    }
  };

  const processExcelSheet = async (wb: XLSX.WorkBook, sheetName: string) => {
    const sheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) {
      throw new Error('Лист пуст');
    }

    const headerRow = jsonData[0].map(String);
    setHeaders(headerRow);
    
    const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim()));
    const parsedRows = rows.map(row => {
      const obj: ParsedRow = {};
      headerRow.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    setParsedData(parsedRows);
    setupColumnMapping(headerRow);
  };

  const handleSheetSelect = async () => {
    if (!workbook || !selectedSheet) {
      toast({
        title: 'Ошибка',
        description: 'Выберите лист для импорта',
        variant: 'destructive',
      });
      return;
    }

    try {
      await processExcelSheet(workbook, selectedSheet);
      setStep(3);
    } catch (error) {
      console.error('Error processing sheet:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обработать лист',
        variant: 'destructive',
      });
    }
  };

  const setupColumnMapping = (headers: string[]) => {
    const mapping: ColumnMapping = {
      project_name: null,
      preparation_work: null,
      onsite_work: null,
    };

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      
      if (lowerHeader.includes('проект') || lowerHeader.includes('project')) {
        mapping.project_name = index;
      } else if (lowerHeader.includes('подготов') || lowerHeader.includes('preparation')) {
        mapping.preparation_work = index;
      } else if (lowerHeader.includes('площадк') || lowerHeader.includes('onsite')) {
        mapping.onsite_work = index;
      }
    });

    setColumnMapping(mapping);
  };

  const validateData = (): string[] => {
    const errors: string[] = [];

    if (columnMapping.project_name === null) {
      errors.push('Не выбран столбец "Проект"');
    }
    if (columnMapping.preparation_work === null) {
      errors.push('Не выбран столбец "Работа по подготовке"');
    }
    if (columnMapping.onsite_work === null) {
      errors.push('Не выбран столбец "Работа на площадке"');
    }

    return errors;
  };

  const handleImport = async () => {
    const validationErrors = validateData();
    if (validationErrors.length > 0) {
      toast({
        title: 'Ошибка валидации',
        description: validationErrors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setStep(4);
    setImportProgress(0);

    const result: ImportResult = {
      total: parsedData.length,
      inserted: 0,
      failed: 0,
      errors: [],
    };

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь не авторизован',
        variant: 'destructive',
      });
      setImporting(false);
      return;
    }

    const userId = userData.user.id;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      
      try {
        const projectName = columnMapping.project_name !== null ? String(row[headers[columnMapping.project_name]] || '').trim() : '';
        const preparationWork = columnMapping.preparation_work !== null ? String(row[headers[columnMapping.preparation_work]] || '').trim() : '';
        const onsiteWork = columnMapping.onsite_work !== null ? String(row[headers[columnMapping.onsite_work]] || '').trim() : '';

        if (!projectName || !preparationWork || !onsiteWork) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            reason: 'Отсутствуют обязательные поля',
            data: { projectName, preparationWork, onsiteWork }
          });
          continue;
        }

        const { error } = await supabase
          .from('event_reports')
          .insert({
            user_id: userId,
            project_name: projectName,
            preparation_work: preparationWork,
            onsite_work: onsiteWork,
            start_time: '00:00',
            end_time: '00:00',
            without_car: true,
          });

        if (error) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            reason: error.message,
            data: row
          });
        } else {
          result.inserted++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 2,
          reason: error.message || 'Неизвестная ошибка',
          data: row
        });
      }

      setImportProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setImportResult(result);
    setImporting(false);
    setStep(5);

    if (result.inserted > 0) {
      toast({
        title: 'Импорт завершен',
        description: `Импортировано: ${result.inserted}, ошибок: ${result.failed}`,
      });
      onImportComplete();
    }
  };

  const resetDialog = () => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setSelectedSheet('');
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({
      project_name: null,
      preparation_work: null,
      onsite_work: null,
    });
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = () => {
    if (!importing) {
      resetDialog();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Импорт отчетов
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Поддерживаемые форматы: Excel (.xlsx, .xls) и CSV. Файл должен содержать столбцы:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Проект</li>
                  <li>Работа по подготовке мероприятия</li>
                  <li>Работа на площадке</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Нажмите для выбора файла или перетащите его сюда
                </p>
              </label>
            </div>
          </div>
        )}

        {step === 2 && workbook && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Выберите лист для импорта. Найдено листов: {workbook.SheetNames.length}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Лист Excel *</Label>
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите лист" />
                </SelectTrigger>
                <SelectContent>
                  {workbook.SheetNames.map((sheetName) => (
                    <SelectItem key={sheetName} value={sheetName}>
                      {sheetName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button onClick={handleSheetSelect} disabled={!selectedSheet}>
                Продолжить
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Найдено строк: {parsedData.length}. Сопоставьте столбцы файла с полями отчета.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Проект *</Label>
                  <Select
                    value={columnMapping.project_name?.toString()}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, project_name: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите столбец" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Работа по подготовке мероприятия *</Label>
                  <Select
                    value={columnMapping.preparation_work?.toString()}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, preparation_work: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите столбец" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Работа на площадке *</Label>
                  <Select
                    value={columnMapping.onsite_work?.toString()}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, onsite_work: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите столбец" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Предпросмотр данных (первые 5 строк)</Label>
                <ScrollArea className="h-[200px] w-full border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((header, index) => (
                          <TableHead key={index}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {headers.map((header, colIndex) => (
                            <TableCell key={colIndex}>{String(row[header] || '')}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button onClick={handleImport}>
                Начать импорт
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Импортируется...</span>
            </div>
            <Progress value={importProgress} />
            <p className="text-sm text-muted-foreground text-center">
              {importProgress}% завершено
            </p>
          </div>
        )}

        {step === 5 && importResult && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>Импорт завершен!</p>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Всего</p>
                      <p className="text-2xl font-bold">{importResult.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Импортировано</p>
                      <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ошибок</p>
                      <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <Label>Ошибки импорта:</Label>
                <ScrollArea className="h-[200px] w-full border rounded-md p-4">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="mb-2 text-sm">
                      <span className="font-semibold">Строка {error.row}:</span> {error.reason}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button onClick={handleClose}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
