import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useImportProgress } from '@/contexts/ImportProgressContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';

export const ImportProgressWindow = () => {
  const { isImporting, progress, result, resetImport } = useImportProgress();
  const { toast } = useToast();

  useEffect(() => {
    // Показываем уведомление когда импорт завершен
    if (result && !isImporting) {
      toast({
        title: '✅ Импорт завершен',
        description: `Импортировано ${result.inserted} из ${result.total} записей`,
        duration: 5000,
      });
    }
  }, [result, isImporting, toast]);

  // Не показываем окно если нет активного импорта и результатов
  if (!isImporting && !result) {
    return null;
  }

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {isImporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Импорт транзакций...
            </>
          ) : result ? (
            <>
              {result.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Импорт завершен
            </>
          ) : null}
        </CardTitle>
        {!isImporting && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetImport}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {result && (
          <div className="space-y-2 pt-2 border-t">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Всего записей</div>
                <div className="text-lg font-semibold">{result.total}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Импортировано</div>
                <div className="text-lg font-semibold text-green-600">
                  {result.inserted}
                </div>
              </div>
              {result.updated > 0 && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">Обновлено</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {result.updated}
                  </div>
                </div>
              )}
              {result.failed > 0 && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">Ошибок</div>
                  <div className="text-lg font-semibold text-red-600">
                    {result.failed}
                  </div>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-medium text-destructive">
                  Ошибки импорта:
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-muted-foreground">
                  {result.errors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="p-2 bg-destructive/10 rounded">
                      <span className="font-medium">Строка {error.row}:</span>{' '}
                      {error.reason}
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="text-center py-1 text-muted-foreground">
                      ... и еще {result.errors.length - 5} ошибок
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
