import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { useImportJobs } from "@/hooks/useImportJobs";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export const BackgroundImportStatus = () => {
  const { activeJobs, recentCompletedJobs, deleteJob } = useImportJobs();

  // Don't render if no active or recent completed jobs
  if (activeJobs.length === 0 && recentCompletedJobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Active imports */}
      {activeJobs.map((job) => {
        const progress = job.total_rows ? (job.processed_rows / job.total_rows) * 100 : 0;
        const isProcessing = job.status === 'processing';

        return (
          <Card key={job.id} className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Фоновый импорт транзакций
                </CardTitle>
                {!isProcessing && job.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteJob(job.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Прогресс</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Обработано: {job.processed_rows} из {job.total_rows}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Вставлено</div>
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    {job.inserted_rows}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Пропущено</div>
                  <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    {job.skipped_rows}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Ошибок</div>
                  <div className="text-sm font-medium text-red-600 dark:text-red-400">
                    {job.failed_rows}
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="text-xs text-muted-foreground pt-2">
                  Началось {job.started_at ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true, locale: ru }) : 'недавно'}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Recently completed imports */}
      {recentCompletedJobs.map((job) => {
        const hasErrors = (job.failed_rows || 0) > 0;
        const isSuccess = job.status === 'completed' && !hasErrors;
        const isFailed = job.status === 'failed' || hasErrors;

        return (
          <Card key={job.id} className={`border ${
            isSuccess ? 'border-green-500/20 bg-green-500/5' : 
            isFailed ? 'border-red-500/20 bg-red-500/5' : 
            'border-border'
          }`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {isSuccess ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="font-medium text-sm">
                        {isSuccess ? 'Импорт завершён успешно' : 'Импорт завершён с ошибками'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.completed_at && formatDistanceToNow(new Date(job.completed_at), { addSuffix: true, locale: ru })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="text-green-600 dark:text-green-400">
                        Вставлено: {job.inserted_rows}
                      </span>
                      {(job.skipped_rows || 0) > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Пропущено: {job.skipped_rows}
                        </span>
                      )}
                      {(job.failed_rows || 0) > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          Ошибок: {job.failed_rows}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteJob(job.id)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
