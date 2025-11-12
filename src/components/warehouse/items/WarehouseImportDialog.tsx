import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { parseWarehouseExcelFile, generateImportTemplate, ParsedExcelItem, ExcelParseResult } from "@/utils/warehouseExcelUtils";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WarehouseImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStage = 'upload' | 'preview' | 'importing' | 'results';

export const WarehouseImportDialog = ({
  open,
  onOpenChange,
}: WarehouseImportDialogProps) => {
  const { createItem } = useWarehouseItems();
  const [stage, setStage] = useState<ImportStage>('upload');
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }>({ success: 0, failed: 0, errors: [] });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      toast.loading("Обработка файла...");
      const result = await parseWarehouseExcelFile(file);
      setParseResult(result);
      setStage('preview');
      toast.dismiss();
      toast.success(`Обработано ${result.totalRows} строк`);
    } catch (error) {
      toast.dismiss();
      toast.error("Ошибка при чтении файла: " + (error as Error).message);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!parseResult) return;

    setStage('importing');
    setImportProgress(0);

    const validItems = parseResult.items.filter(item => item.errors.length === 0);
    const results = { success: 0, failed: 0, errors: [] as Array<{ row: number; error: string }> };

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      try {
        await createItem.mutateAsync({
          sku: item.sku,
          name: item.name,
          description: item.description,
          category_id: null, // Категория не импортируется, нужно будет добавить маппинг
          unit: item.unit,
          price: item.price,
          min_stock: item.min_stock,
          photo_url: item.photo_url,
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: item.rowNumber,
          error: (error as Error).message,
        });
      }
      setImportProgress(((i + 1) / validItems.length) * 100);
    }

    setImportResults(results);
    setStage('results');
  };

  const handleReset = () => {
    setStage('upload');
    setParseResult(null);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Импорт товаров из Excel</DialogTitle>
          <DialogDescription>
            {stage === 'upload' && 'Загрузите Excel файл с товарами'}
            {stage === 'preview' && 'Проверьте данные перед импортом'}
            {stage === 'importing' && 'Импортируем товары...'}
            {stage === 'results' && 'Результаты импорта'}
          </DialogDescription>
        </DialogHeader>

        {/* Этап 1: Загрузка файла */}
        {stage === 'upload' && (
          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Отпустите файл здесь</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Перетащите Excel файл сюда
                  </p>
                  <p className="text-sm text-muted-foreground">
                    или нажмите для выбора файла
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Поддерживаются форматы: .xlsx, .xls, .csv
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={generateImportTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Скачать шаблон для импорта
              </Button>
            </div>

            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                <strong>Формат файла:</strong> Первая строка должна содержать заголовки:
                Артикул (SKU), Название, Категория, Описание, Единица измерения,
                Цена за единицу, Минимальный остаток, Штрих-код
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Этап 2: Предпросмотр */}
        {stage === 'preview' && parseResult && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{parseResult.totalRows}</div>
                <div className="text-sm text-muted-foreground">Всего строк</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {parseResult.validRows}
                </div>
                <div className="text-sm text-muted-foreground">Готовы к импорту</div>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive">
                  {parseResult.errorRows}
                </div>
                <div className="text-sm text-muted-foreground">С ошибками</div>
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Артикул</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Единица</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Мин. остаток</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.items.map((item) => (
                    <TableRow key={item.rowNumber}>
                      <TableCell className="font-mono text-xs">
                        {item.rowNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.price} ₽</TableCell>
                      <TableCell>{item.min_stock}</TableCell>
                      <TableCell>
                        {item.errors.length === 0 ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            {item.errors.length}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleReset}>
                Отмена
              </Button>
              <Button
                onClick={handleImport}
                disabled={parseResult.validRows === 0}
              >
                Импортировать {parseResult.validRows} товаров
              </Button>
            </div>
          </div>
        )}

        {/* Этап 3: Процесс импорта */}
        {stage === 'importing' && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{Math.round(importProgress)}%</div>
              <p className="text-muted-foreground">Импортируем товары...</p>
            </div>
            <Progress value={importProgress} className="w-full" />
          </div>
        )}

        {/* Этап 4: Результаты */}
        {stage === 'results' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-6 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {importResults.success}
                </div>
                <div className="text-sm text-muted-foreground">Успешно импортировано</div>
              </div>
              <div className="text-center p-6 bg-destructive/10 rounded-lg">
                <XCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
                <div className="text-3xl font-bold text-destructive">
                  {importResults.failed}
                </div>
                <div className="text-sm text-muted-foreground">Ошибок</div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Ошибки при импорте:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {importResults.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Строка {err.row}: {err.error}
                      </li>
                    ))}
                    {importResults.errors.length > 5 && (
                      <li>и ещё {importResults.errors.length - 5} ошибок...</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3">
              <Button onClick={handleClose}>Закрыть</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
