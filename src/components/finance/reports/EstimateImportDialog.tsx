import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import ExcelJS from "exceljs";
import { formatCurrency } from "@/utils/formatCurrency";

interface EstimateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: EstimateItem[]) => void;
}

export interface EstimateItem {
  category: string;
  description?: string;
  planned_amount: number;
}

interface ParsedRow {
  [key: string]: any;
}

interface PreviewRow {
  originalIndex: number;
  name: string;
  amount: number;
  description?: string;
  included: boolean;
  autoSkipped: boolean;
}

export const EstimateImportDialog = ({ open, onOpenChange, onImport }: EstimateImportDialogProps) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    name: "",
    amount: "",
    description: "",
  });
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);

  const parseAmount = (value: any): number => {
    if (typeof value === 'number') return Math.round(Math.abs(value));
    if (!value) return 0;
    
    const str = String(value).replace(/[^\d,.\-]/g, '');
    if (!str) return 0;

    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    let normalized = str;
    if (lastComma > lastDot && lastComma > str.length - 4) {
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma && lastDot > str.length - 4) {
      normalized = str.replace(/,/g, '');
    } else {
      normalized = str.replace(/,/g, '');
    }

    return Math.round(Math.abs(parseFloat(normalized) || 0));
  };

  const isSkipRow = (name: string): boolean => {
    const lower = name.toLowerCase();
    return lower.includes('итого') || lower.includes('всего') || lower.includes('total');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        console.error('No worksheet found');
        return;
      }

      // Get all rows as arrays
      const rows: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const rowValues: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowValues[colNumber - 1] = cell.value;
        });
        rows.push(rowValues);
      });

      if (rows.length === 0) {
        console.error('No data in worksheet');
        return;
      }

      // Find header row
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        const nonEmptyCells = row?.filter(cell => cell !== undefined && cell !== null && cell !== '').length || 0;
        if (nonEmptyCells >= 2) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = (rows[headerRowIndex] || []).map((h, i) => String(h || `Колонка ${i + 1}`));
      const dataRows = rows.slice(headerRowIndex + 1).map((row: any[]) => {
        const obj: ParsedRow = {};
        headers.forEach((header, i) => {
          obj[header] = row?.[i];
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v !== undefined && v !== null && v !== ''));

      setColumns(headers);
      setParsedData(dataRows);
      
      // Auto-detect column mapping
      const lowerHeaders = headers.map(h => h.toLowerCase());
      const autoMapping = { name: "", amount: "", description: "" };
      
      lowerHeaders.forEach((h, i) => {
        if (h.includes('наименование') || h.includes('название') || h.includes('статья') || h.includes('категор')) {
          if (!autoMapping.name) autoMapping.name = headers[i];
        }
        if (h.includes('стоимость') || h.includes('сумма') || h.includes('цена') || h.includes('итого')) {
          if (!autoMapping.amount) autoMapping.amount = headers[i];
        }
        if (h.includes('описание') || h.includes('примечание') || h.includes('комментарий')) {
          if (!autoMapping.description) autoMapping.description = headers[i];
        }
      });
      
      setMapping(autoMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing Excel:', error);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleMappingNext = () => {
    const rows: PreviewRow[] = [];
    
    parsedData.forEach((row, index) => {
      const name = String(row[mapping.name] || '').trim();
      if (!name) return;

      const amount = parseAmount(row[mapping.amount]);
      const description = mapping.description ? String(row[mapping.description] || '').trim() : undefined;
      
      const autoSkipped = isSkipRow(name) || amount === 0;
      
      rows.push({
        originalIndex: index,
        name,
        amount,
        description: description || undefined,
        included: !autoSkipped,
        autoSkipped,
      });
    });

    setPreviewRows(rows);
    setStep('preview');
  };

  const updateRowIncluded = (index: number, included: boolean) => {
    setPreviewRows(prev => prev.map((row, i) => 
      i === index ? { ...row, included } : row
    ));
  };

  const stats = useMemo(() => {
    const included = previewRows.filter(r => r.included);
    const total = included.reduce((s, r) => s + r.amount, 0);
    return {
      count: included.length,
      total,
    };
  }, [previewRows]);

  const handleImport = () => {
    const items: EstimateItem[] = previewRows
      .filter(r => r.included)
      .map(r => ({
        category: r.name,
        description: r.description,
        planned_amount: r.amount,
      }));
    
    onImport(items);
    resetDialog();
  };

  const resetDialog = () => {
    setStep('upload');
    setFileName("");
    setParsedData([]);
    setColumns([]);
    setMapping({ name: "", amount: "", description: "" });
    setPreviewRows([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetDialog();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && "Загрузка сметы"}
            {step === 'mapping' && "Сопоставление колонок"}
            {step === 'preview' && "Предпросмотр статей"}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Загрузите Excel файл со сметой мероприятия"}
            {step === 'mapping' && "Укажите какие колонки содержат данные"}
            {step === 'preview' && "Проверьте статьи перед импортом. Тип (доход/расход) определится при сопоставлении с транзакциями."}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isDragActive ? "Отпустите файл здесь..." : "Перетащите Excel файл или нажмите для выбора"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Поддерживаемые форматы: .xlsx, .xls</p>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              <span>{fileName}</span>
              <Badge variant="secondary">{parsedData.length} строк</Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Наименование *</Label>
                <Select value={mapping.name || "__none__"} onValueChange={(v) => setMapping(m => ({ ...m, name: v === "__none__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите колонку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не выбрано</SelectItem>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Сумма *</Label>
                <Select value={mapping.amount || "__none__"} onValueChange={(v) => setMapping(m => ({ ...m, amount: v === "__none__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите колонку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не выбрано</SelectItem>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Select value={mapping.description || "__none__"} onValueChange={(v) => setMapping(m => ({ ...m, description: v === "__none__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите колонку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не использовать</SelectItem>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(!mapping.name || !mapping.amount) && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span>Выберите колонки с наименованием и суммой</span>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {stats.count} статей на сумму {formatCurrency(stats.total)}
              </Badge>
            </div>

            <div className="border rounded-md max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={previewRows.every(r => r.included || r.autoSkipped)}
                        onCheckedChange={(checked) => {
                          setPreviewRows(prev => prev.map(row => 
                            row.autoSkipped ? row : { ...row, included: !!checked }
                          ));
                        }}
                      />
                    </TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead className="text-right w-32">Плановая сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i} className={row.autoSkipped ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={row.included}
                          onCheckedChange={(checked) => updateRowIncluded(i, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className={!row.included ? 'text-muted-foreground line-through' : ''}>
                            {row.name}
                          </span>
                          {row.description && (
                            <p className="text-xs text-muted-foreground">{row.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Итого: <span className="font-bold text-foreground">{formatCurrency(stats.total)}</span> ({stats.count} статей)
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => {
            if (step === 'upload') handleClose(false);
            else if (step === 'mapping') setStep('upload');
            else setStep('mapping');
          }}>
            {step === 'upload' ? 'Отмена' : 'Назад'}
          </Button>

          {step === 'mapping' && (
            <Button 
              onClick={handleMappingNext}
              disabled={!mapping.name || !mapping.amount}
            >
              Далее
            </Button>
          )}

          {step === 'preview' && (
            <Button onClick={handleImport} disabled={stats.count === 0}>
              Импортировать {stats.count} статей
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
