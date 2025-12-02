import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { formatCurrency } from "@/utils/formatCurrency";

interface EstimateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: EstimateItem[]) => void;
}

export interface EstimateItem {
  item_type: 'income' | 'expense';
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
  type: 'expense' | 'income' | 'skip';
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
    if (typeof value === 'number') return Math.round(value);
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

    return Math.round(parseFloat(normalized) || 0);
  };

  const isSkipRow = (name: string): boolean => {
    const lower = name.toLowerCase();
    return lower.includes('итого') || lower.includes('всего') || lower.includes('total');
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { header: 1 });
        
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
          const row = jsonData[i] as any[];
          const nonEmptyCells = row?.filter(cell => cell !== undefined && cell !== null && cell !== '').length || 0;
          if (nonEmptyCells >= 2) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = (jsonData[headerRowIndex] as any[])?.map((h, i) => String(h || `Колонка ${i + 1}`)) || [];
        const rows = jsonData.slice(headerRowIndex + 1).map((row: any[]) => {
          const obj: ParsedRow = {};
          headers.forEach((header, i) => {
            obj[header] = row?.[i];
          });
          return obj;
        }).filter(row => Object.values(row).some(v => v !== undefined && v !== null && v !== ''));

        setColumns(headers);
        setParsedData(rows);
        
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
    };
    reader.readAsBinaryString(file);
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
        type: autoSkipped ? 'skip' : 'expense',
        autoSkipped,
      });
    });

    setPreviewRows(rows);
    setStep('preview');
  };

  const updateRowType = (index: number, type: 'expense' | 'income' | 'skip') => {
    setPreviewRows(prev => prev.map((row, i) => 
      i === index ? { ...row, type, included: type !== 'skip' } : row
    ));
  };

  const updateRowIncluded = (index: number, included: boolean) => {
    setPreviewRows(prev => prev.map((row, i) => 
      i === index ? { ...row, included, type: included ? (row.type === 'skip' ? 'expense' : row.type) : 'skip' } : row
    ));
  };

  const stats = useMemo(() => {
    const included = previewRows.filter(r => r.included && r.type !== 'skip');
    const expenses = included.filter(r => r.type === 'expense');
    const incomes = included.filter(r => r.type === 'income');
    const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
    const totalIncome = incomes.reduce((s, r) => s + r.amount, 0);
    return {
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      totalExpense,
      totalIncome,
      profit: totalIncome - totalExpense,
    };
  }, [previewRows]);

  const handleImport = () => {
    const items: EstimateItem[] = previewRows
      .filter(r => r.included && r.type !== 'skip')
      .map(r => ({
        item_type: r.type as 'income' | 'expense',
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

  const markAllAsExpense = () => {
    setPreviewRows(prev => prev.map(row => 
      row.included ? { ...row, type: 'expense' } : row
    ));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && "Загрузка сметы"}
            {step === 'mapping' && "Сопоставление колонок"}
            {step === 'preview' && "Разметка строк"}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Загрузите Excel файл со сметой мероприятия"}
            {step === 'mapping' && "Укажите какие колонки содержат данные"}
            {step === 'preview' && "Выберите тип для каждой строки: расход, доход или пропустить"}
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
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markAllAsExpense}>
                  Все как расходы
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-red-600">
                  Расходы: {stats.expenseCount}
                </Badge>
                <Badge variant="outline" className="text-green-600">
                  Доходы: {stats.incomeCount}
                </Badge>
              </div>
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
                            row.autoSkipped ? row : { ...row, included: !!checked, type: checked ? (row.type === 'skip' ? 'expense' : row.type) : 'skip' }
                          ));
                        }}
                      />
                    </TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead className="text-right w-32">Сумма</TableHead>
                    <TableHead className="w-36">Тип</TableHead>
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
                          <span className={row.type === 'skip' ? 'text-muted-foreground line-through' : ''}>
                            {row.name}
                          </span>
                          {row.description && (
                            <p className="text-xs text-muted-foreground">{row.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        row.type === 'income' ? 'text-green-600' : 
                        row.type === 'expense' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={row.type} 
                          onValueChange={(v) => updateRowType(i, v as 'expense' | 'income' | 'skip')}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Расход</SelectItem>
                            <SelectItem value="income">Доход</SelectItem>
                            <SelectItem value="skip">Пропуск</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Расходы</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalExpense)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Доходы</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Прибыль</p>
                <p className={`text-xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.profit)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => {
            if (step === 'upload') handleClose(false);
            else if (step === 'mapping') setStep('upload');
            else if (step === 'preview') setStep('mapping');
          }}>
            {step === 'upload' ? 'Отмена' : 'Назад'}
          </Button>

          {step === 'mapping' && (
            <Button onClick={handleMappingNext} disabled={!mapping.name || !mapping.amount}>
              Далее
            </Button>
          )}

          {step === 'preview' && (
            <Button onClick={handleImport} disabled={stats.expenseCount + stats.incomeCount === 0}>
              <Check className="mr-2 h-4 w-4" />
              Импортировать {stats.expenseCount + stats.incomeCount} статей
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
