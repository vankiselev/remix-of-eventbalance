import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Package, MessageSquare } from "lucide-react";
import { WarehouseTaskWithDetails } from "@/hooks/useWarehouseTasks";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { formatDisplayName } from "@/utils/formatName";

interface TaskCardProps {
  task: WarehouseTaskWithDetails;
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
  cancelled: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const statusLabels = {
  pending: "Ожидает",
  in_progress: "В работе",
  completed: "Завершено",
  cancelled: "Отменено",
};

const typeLabels = {
  collection: "Сбор",
  return: "Возврат",
};

export const TaskCard = ({ task }: TaskCardProps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const totalItems = task.items?.length || 0;
  const collectedItems = task.items?.filter(item => item.is_collected).length || 0;
  const progress = totalItems > 0 ? (collectedItems / totalItems) * 100 : 0;

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsDetailOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">
              {task.event?.name || "Задача склада"}
            </CardTitle>
            <Badge className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="font-medium">{typeLabels[task.task_type]}</span>
          </div>

          {task.assigned_to_profile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{formatDisplayName(task.assigned_to_profile.full_name)}</span>
            </div>
          )}

          {task.due_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(task.due_date), "d MMMM yyyy", { locale: ru })}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-medium">{collectedItems} / {totalItems}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{task.comments.length} {task.comments.length === 1 ? 'комментарий' : 'комментариев'}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailDialog
        task={task}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  );
};
