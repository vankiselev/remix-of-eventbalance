import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { useWarehouseTasks, WarehouseTaskWithDetails } from "@/hooks/useWarehouseTasks";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { TaskDetailDialog } from "@/components/warehouse/tasks/TaskDetailDialog";
import { statusColors, statusLabels, typeIcons, typeFullLabels } from "@/components/warehouse/tasks/taskConstants";

const TasksPage = () => {
  const { user } = useAuth();
  const { tasks, isLoading } = useWarehouseTasks();
  const [selectedTask, setSelectedTask] = useState<WarehouseTaskWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Single-pass: filter for user + group by status
  const { myTasks, pendingTasks, inProgressTasks, completedTasks } = useMemo(() => {
    const my: WarehouseTaskWithDetails[] = [];
    const pending: WarehouseTaskWithDetails[] = [];
    const inProgress: WarehouseTaskWithDetails[] = [];
    const completed: WarehouseTaskWithDetails[] = [];

    for (const task of tasks || []) {
      if (task.assigned_to !== user?.id) continue;
      my.push(task);
      switch (task.status) {
        case 'pending': pending.push(task); break;
        case 'in_progress': inProgress.push(task); break;
        case 'completed': completed.push(task); break;
      }
    }

    return { myTasks: my, pendingTasks: pending, inProgressTasks: inProgress, completedTasks: completed };
  }, [tasks, user?.id]);

  const handleTaskClick = (task: WarehouseTaskWithDetails) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const renderTaskCard = (task: WarehouseTaskWithDetails) => {
    const completedItems = task.items?.filter(item => item.is_collected).length || 0;
    const totalItems = task.items?.length || 0;

    return (
      <Card 
        key={task.id} 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleTaskClick(task)}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{typeIcons[task.task_type]}</span>
                {typeFullLabels[task.task_type]}
              </CardTitle>
              <CardDescription className="space-y-1">
                {task.event && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{task.event.name}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(task.due_date), 'd MMMM yyyy', { locale: ru })}
                    </span>
                  </div>
                )}
              </CardDescription>
            </div>
            <Badge className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {task.notes && (
            <p className="text-sm text-muted-foreground mb-3">{task.notes}</p>
          )}
          {totalItems > 0 && (
            <div className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Товары: {completedItems} / {totalItems}</span>
              </div>
              {completedItems === totalItems ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 overflow-x-hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Мои задачи</h1>
          <p className="text-muted-foreground">
            Задачи на сбор и возврат реквизита для мероприятий
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка задач...
          </div>
        ) : myTasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет задач</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                У вас пока нет назначенных задач на сбор или возврат реквизита.
                Задачи будут отображаться здесь, когда менеджер назначит их на вас.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="gap-2">
                Ожидают
                {pendingTasks.length > 0 && (
                  <Badge variant="secondary">{pendingTasks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="gap-2">
                В работе
                {inProgressTasks.length > 0 && (
                  <Badge variant="secondary">{inProgressTasks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                Выполнены
                {completedTasks.length > 0 && (
                  <Badge variant="secondary">{completedTasks.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Нет задач, ожидающих выполнения
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingTasks.map(renderTaskCard)
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-3 mt-4">
              {inProgressTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Нет задач в работе
                    </p>
                  </CardContent>
                </Card>
              ) : (
                inProgressTasks.map(renderTaskCard)
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {completedTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Нет выполненных задач
                    </p>
                  </CardContent>
                </Card>
              ) : (
                completedTasks.map(renderTaskCard)
              )}
            </TabsContent>
          </Tabs>
        )}

        {selectedTask && (
          <TaskDetailDialog
            task={selectedTask}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />
        )}
      </div>
    </Layout>
  );
};

export default TasksPage;
