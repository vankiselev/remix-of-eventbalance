import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarehouseTaskWithDetails, useWarehouseTasks } from "@/hooks/useWarehouseTasks";
import { TaskItemsList } from "./TaskItemsList";
import { TaskComments } from "./TaskComments";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, User, Package, CheckCircle, XCircle, PlayCircle } from "lucide-react";

interface TaskDetailDialogProps {
  task: WarehouseTaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const TaskDetailDialog = ({ task, open, onOpenChange }: TaskDetailDialogProps) => {
  const { updateTaskStatus } = useWarehouseTasks();
  const [activeTab, setActiveTab] = useState("items");

  const handleStatusChange = (status: typeof task.status) => {
    updateTaskStatus.mutate({ id: task.id, status });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <DialogTitle className="text-xl">
                {task.event?.name || "Задача склада"}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">{typeLabels[task.task_type]}</span>
                </div>
                {task.assigned_to_profile && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{task.assigned_to_profile.full_name}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(task.due_date), "d MMMM yyyy", { locale: ru })}</span>
                  </div>
                )}
              </div>
            </div>
            <Badge className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
          </div>
        </DialogHeader>

        {task.notes && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
          </div>
        )}

        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <div className="flex flex-wrap gap-2">
            {task.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                disabled={updateTaskStatus.isPending}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Начать работу
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('completed')}
                disabled={updateTaskStatus.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Завершить
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleStatusChange('cancelled')}
              disabled={updateTaskStatus.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Отменить
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="items" className="flex-1">
              Товары ({task.items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">
              Комментарии ({task.comments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <TaskItemsList task={task} />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <TaskComments task={task} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
