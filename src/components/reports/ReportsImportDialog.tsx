import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';

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

interface ExcelWorkbookData {
  sheetNames: string[];
  sheets: Map<string, { headers: string[]; rows: any[][] }>;
}

export const ReportsImportDialog = ({ open, onOpenChange, onImportComplete }: ReportsImportDialogProps) => {
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbookData, setWorkbookData] = useState<ExcelWorkbookData | null>(null);
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
        const csvText = await uploadedFile.text();
        processCSVFile(csvText);
        setStep(3); // Skip sheet selection for CSV
      } else {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        await loadExcelWorkbook(arrayBuffer);
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

  const getColumnLetter = (index: number): string => {
    let letter = '';
    let i = index;
    while (i >= 0) {
      letter = String.fromCharCode((i % 26) + 65) + letter;
      i = Math.floor(i / 26) - 1;
    }
    return letter;
  };

  const processCSVFile = (csvText: string) => {
    const cleanText = csvText.replace(/^\uFEFF/, '');
    
    const results = Papa.parse(cleanText, {
      header: false,
      skipEmptyLines: true,
    });
    
    if (results.data && results.data.length > 0) {
      const data = results.data as string[][];

      // Create headers with column letters
      const headerRow = data[0].map((cell: string, index: number) => {
        const columnLetter = getColumnLetter(index);
        const cellValue = cell ? String(cell).trim() : '';
        return cellValue ? `${columnLetter}: ${cellValue}` : `Столбец ${columnLetter}`;
      });
      
      setHeaders(headerRow);
      
      const rows = data.slice(1).filter(row => row.some(cell => cell && String(cell).trim()));
      const parsedRows = rows.map(row => {
        const obj: ParsedRow = {};
        headerRow.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
      
      setParsedData(parsedRows);
      setupColumnMapping(headerRow);
    }
  };

  const loadExcelWorkbook = async (arrayBuffer: ArrayBuffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const sheets = new Map<string, { headers: string[]; rows: any[][] }>();
    const sheetNames: string[] = [];
    
    workbook.eachSheet((worksheet) => {
      sheetNames.push(worksheet.name);
      const rows: any[][] = [];
      
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const rowValues: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let value = cell.value;
          if (value && typeof value === 'object') {
            if ('richText' in value) {
              value = (value as any).richText.map((rt: any) => rt.text).join('');
            } else if ('result' in value) {
              value = (value as any).result;
            }
          }
          rowValues[colNumber - 1] = value;
        });
        rows.push(rowValues);
      });
      
      const headers = rows[0]?.map(h => String(h || '').trim()) || [];
      sheets.set(worksheet.name, { headers, rows });
    });
    
    setWorkbookData({ sheetNames, sheets });
    
    // Auto-select first sheet if only one exists
    if (sheetNames.length === 1) {
      setSelectedSheet(sheetNames[0]);
      processExcelSheet(sheets, sheetNames[0]);
      setStep(3);
    }
  };

  const processExcelSheet = (sheets: Map<string, { headers: string[]; rows: any[][] }>, sheetName: string) => {
    const sheetData = sheets.get(sheetName);
    if (!sheetData) return;
    
    const { rows } = sheetData;
    
    if (rows.length === 0) {
      throw new Error('Лист пуст');
    }

    // Get column letters (A, B, C, etc.)
    const getColumnLetter = (index: number): string => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    // Create headers with column letters
    const headerRow = rows[0].map((cell: any, index: number) => {
      const columnLetter = getColumnLetter(index);
      const cellValue = cell ? String(cell).trim() : '';
      return cellValue ? `${columnLetter}: ${cellValue}` : `Столбец ${columnLetter}`;
    });
    
    setHeaders(headerRow);
    
    const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim()));
    const parsedRows = dataRows.map(row => {
      const obj: ParsedRow = {};
      headerRow.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    setParsedData(parsedRows);
    setupColumnMapping(headerRow);
  };

  const handleSheetSelect = () => {
    if (!workbookData || !selectedSheet) {
      toast({
        title: 'Ошибка',
        description: 'Выберите лист для импорта',
        variant: 'destructive',
      });
      return;
    }

    try {
      processExcelSheet(workbookData.sheets, selectedSheet);
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
      project_name: headers.length > 1 ? 1 : null,  // Столбец B (индекс 1)
      preparation_work: headers.length > 3 ? 3 : null,  // Столбец D (индекс 3)
      onsite_work: headers.length > 4 ? 4 : null,  // Столбец E (индекс 4)
    };

    setColumnMapping(mapping);
  };

  const validateData = (): string[] => {
    const errors: string[] = [];

    if (columnMapping.project_name === null) {
      errors.push('Не выбран столбец "Проект"');
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

    let tenantId = currentTenant?.id || null;
    if (!tenantId) {
      const { data: membership, error: membershipError } = await supabase
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        toast({
          title: 'Ошибка',
          description: membershipError.message,
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      tenantId = membership?.tenant_id || null;
    }

    if (!tenantId) {
      toast({
        title: 'Ошибка',
        description: 'Не выбрана компания: tenant_id не найден',
        variant: 'destructive',
      });
      setImporting(false);
      return;
    }

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      
      try {
        const projectName = columnMapping.project_name !== null ? String(row[headers[columnMapping.project_name]] || '').trim() : '';
        const preparationWork = columnMapping.preparation_work !== null ? String(row[headers[columnMapping.preparation_work]] || '').trim() : '';
        const onsiteWork = columnMapping.onsite_work !== null ? String(row[headers[columnMapping.onsite_work]] || '').trim() : '';

        // Проверяем только наличие проекта
        if (!projectName) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            reason: 'Отсутствует название проекта',
            data: { projectName, preparationWork, onsiteWork }
          });
          continue;
        }

        const { error } = await supabase
          .from('event_reports')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            project_name: projectName,
            preparation_work: preparationWork || '',
            onsite_work: onsiteWork || '',
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
    setWorkbookData(null);
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
                  <li><strong>Проект</strong> (обязательно)</li>
                  <li>Работа по подготовке мероприятия (опционально)</li>
                  <li>Работа на площадке (опционально)</li>
                </ul>
                <p className="mt-2 text-xs">Будут импортированы все строки, где указан проект, даже если другие поля пустые.</p>
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

        {step === 2 && workbookData && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Выберите лист для импорта. Найдено листов: {workbookData.sheetNames.length}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Лист Excel *</Label>
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите лист" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-popover">
                  {workbookData.sheetNames.map((sheetName) => (
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
                    <SelectContent className="z-[100] bg-popover">
                      {headers.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Работа по подготовке мероприятия</Label>
                  <Select
                    value={columnMapping.preparation_work?.toString()}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, preparation_work: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите столбец (опционально)" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
                      {headers.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Работа на площадке</Label>
                  <Select
                    value={columnMapping.onsite_work?.toString()}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, onsite_work: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите столбец (опционально)" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
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
