import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ListFilter, LayoutGrid } from "lucide-react";
import { useTasks, TaskWithDetails, Task } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export default function CRMTasksPage() {
  const { user } = useAuth();
  const { isAdmin } = useUserPermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { tasks, isLoading } = useTasks({
    assignedTo: viewMode === 'my' ? user?.id : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.client?.name.toLowerCase().includes(query) ||
      task.event?.name.toLowerCase().includes(query)
    );
  });

  // Group tasks by status
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const renderTaskList = (taskList: TaskWithDetails[], emptyMessage: string) => {
    if (taskList.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {taskList.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onClick={() => handleTaskClick(task)}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Задачи</h1>
            <p className="text-muted-foreground">Управление задачами и поручениями</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая задача
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск задач..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode */}
          {isAdmin && (
            <Select value={viewMode} onValueChange={(v: 'my' | 'all') => setViewMode(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">Мои задачи</SelectItem>
                <SelectItem value="all">Все задачи</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <ListFilter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="completed">Завершена</SelectItem>
              <SelectItem value="cancelled">Отменена</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-lg" />
            ))}
          </div>
        ) : (
          /* Tasks by Status Tabs */
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                Ожидает
                {pendingTasks.length > 0 && (
                  <span className="bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full text-xs">
                    {pendingTasks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="flex items-center gap-2">
                В работе
                {inProgressTasks.length > 0 && (
                  <span className="bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                    {inProgressTasks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                Завершено
                {completedTasks.length > 0 && (
                  <span className="bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full text-xs">
                    {completedTasks.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {renderTaskList(pendingTasks, "Нет задач в ожидании")}
            </TabsContent>

            <TabsContent value="in_progress" className="mt-4">
              {renderTaskList(inProgressTasks, "Нет задач в работе")}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {renderTaskList(completedTasks, "Нет завершённых задач")}
            </TabsContent>
          </Tabs>
        )}

        {/* Dialogs */}
        <TaskCreateDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        <TaskDetailDialog
          task={selectedTask}
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
        />
      </div>
    </Layout>
  );
}
