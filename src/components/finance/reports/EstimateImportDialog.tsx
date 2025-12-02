import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, X, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { formatCurrency } from "@/utils/formatCurrency";

interface EstimateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: EstimateItem[]) => void;
}

interface EstimateItem {
  item_type: 'income' | 'expense';
  category: string;
  description?: string;
  planned_amount: number;
}

interface ParsedRow {
  [key: string]: any;
}

export const EstimateImportDialog = ({ open, onOpenChange, onImport }: EstimateImportDialogProps) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    category: "",
    description: "",
    income: "",
    expense: "",
  });
  const [previewItems, setPreviewItems] = useState<EstimateItem[]>([]);

  const parseAmount = (value: any): number => {
    if (typeof value === 'number') return Math.round(value);
    if (!value) return 0;
    
    const str = String(value).replace(/[^\d,.\-]/g, '');
    if (!str) return 0;

    // Handle EU format (1.234,56) vs US format (1,234.56)
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    let normalized = str;
    if (lastComma > lastDot && lastComma > str.length - 4) {
      // EU format: 1.234,56
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma && lastDot > str.length - 4) {
      // US format: 1,234.56
      normalized = str.replace(/,/g, '');
    } else {
      // Simple format or thousands separator only
      normalized = str.replace(/,/g, '');
    }

    return Math.round(parseFloat(normalized) || 0);
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
        
        // Find header row (first row with multiple non-empty cells)
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
        
        // Try to auto-detect column mapping
        const lowerHeaders = headers.map(h => h.toLowerCase());
        const autoMapping = { ...mapping };
        
        lowerHeaders.forEach((h, i) => {
          if (h.includes('категор') || h.includes('статья') || h.includes('наименование') || h.includes('название')) {
            autoMapping.category = headers[i];
          }
          if (h.includes('описание') || h.includes('примечание') || h.includes('комментарий')) {
            autoMapping.description = headers[i];
          }
          if (h.includes('доход') || h.includes('приход') || h.includes('поступлен')) {
            autoMapping.income = headers[i];
          }
          if (h.includes('расход') || h.includes('затрат') || h.includes('трата') || h.includes('сумма')) {
            autoMapping.expense = headers[i];
          }
        });
        
        setMapping(autoMapping);
        setStep('mapping');
      } catch (error) {
        console.error('Error parsing Excel:', error);
      }
    };
    reader.readAsBinaryString(file);
  }, [mapping]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleMappingNext = () => {
    const items: EstimateItem[] = [];
    
    parsedData.forEach(row => {
      const category = String(row[mapping.category] || '').trim();
      if (!category) return;

      const description = mapping.description ? String(row[mapping.description] || '').trim() : undefined;
      const incomeAmount = mapping.income ? parseAmount(row[mapping.income]) : 0;
      const expenseAmount = mapping.expense ? parseAmount(row[mapping.expense]) : 0;

      if (incomeAmount > 0) {
        items.push({
          item_type: 'income',
          category,
          description,
          planned_amount: incomeAmount,
        });
      }

      if (expenseAmount > 0) {
        items.push({
          item_type: 'expense',
          category,
          description,
          planned_amount: expenseAmount,
        });
      }
    });

    setPreviewItems(items);
    setStep('preview');
  };

  const handleImport = () => {
    onImport(previewItems);
    resetDialog();
  };

  const resetDialog = () => {
    setStep('upload');
    setFileName("");
    setParsedData([]);
    setColumns([]);
    setMapping({ category: "", description: "", income: "", expense: "" });
    setPreviewItems([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetDialog();
    onOpenChange(open);
  };

  const totalIncome = previewItems.filter(i => i.item_type === 'income').reduce((s, i) => s + i.planned_amount, 0);
  const totalExpense = previewItems.filter(i => i.item_type === 'expense').reduce((s, i) => s + i.planned_amount, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && "Загрузка сметы"}
            {step === 'mapping' && "Сопоставление колонок"}
            {step === 'preview' && "Предпросмотр данных"}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Загрузите Excel файл со сметой мероприятия"}
            {step === 'mapping' && "Укажите какие колонки соответствуют полям"}
            {step === 'preview' && "Проверьте данные перед импортом"}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Категория / Статья *</Label>
                <Select value={mapping.category} onValueChange={(v) => setMapping(m => ({ ...m, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите колонку" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
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

              <div className="space-y-2">
                <Label>Доходы</Label>
                <Select value={mapping.income || "__none__"} onValueChange={(v) => setMapping(m => ({ ...m, income: v === "__none__" ? "" : v }))}>
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

              <div className="space-y-2">
                <Label>Расходы</Label>
                <Select value={mapping.expense || "__none__"} onValueChange={(v) => setMapping(m => ({ ...m, expense: v === "__none__" ? "" : v }))}>
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

            {!mapping.category && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span>Выберите колонку с категорией/статьёй</span>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-green-600">
                  Доходы: {previewItems.filter(i => i.item_type === 'income').length} статей
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  Расходы: {previewItems.filter(i => i.item_type === 'expense').length} статей
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Прибыль (план)</p>
                <p className={`font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalIncome - totalExpense)}
                </p>
              </div>
            </div>

            <div className="border rounded-md max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={item.item_type === 'income' ? 'default' : 'destructive'}>
                          {item.item_type === 'income' ? 'Доход' : 'Расход'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || '—'}</TableCell>
                      <TableCell className={`text-right font-medium ${item.item_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.planned_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Итого доходов</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Итого расходов</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
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
            <Button onClick={handleMappingNext} disabled={!mapping.category}>
              Далее
            </Button>
          )}

          {step === 'preview' && (
            <Button onClick={handleImport} disabled={previewItems.length === 0}>
              <Check className="mr-2 h-4 w-4" />
              Импортировать {previewItems.length} статей
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
