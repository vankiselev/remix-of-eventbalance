import { format, isPast, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Phone, Users, CheckSquare, Bell, RefreshCw, MoreHorizontal, Calendar, User, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TaskWithDetails, Task, getStatusLabel } from "@/hooks/useTasks";

interface TaskCardProps {
  task: TaskWithDetails;
  onClick?: () => void;
}

const getTaskTypeIcon = (type: Task['task_type']) => {
  switch (type) {
    case 'call': return <Phone className="h-4 w-4" />;
    case 'meeting': return <Users className="h-4 w-4" />;
    case 'task': return <CheckSquare className="h-4 w-4" />;
    case 'reminder': return <Bell className="h-4 w-4" />;
    case 'follow_up': return <RefreshCw className="h-4 w-4" />;
    default: return <MoreHorizontal className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'low': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    case 'medium': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'high': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    case 'urgent': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    default: return 'bg-gray-500/10 text-gray-600';
  }
};

const getStatusColor = (status: Task['status']) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    case 'in_progress': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'completed': return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'cancelled': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    default: return 'bg-gray-500/10 text-gray-600';
  }
};

const getPriorityDot = (priority: Task['priority']) => {
  switch (priority) {
    case 'low': return 'bg-gray-500';
    case 'medium': return 'bg-blue-500';
    case 'high': return 'bg-orange-500';
    case 'urgent': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isOverdue && "border-red-500/50",
        task.status === 'completed' && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Task Type Icon */}
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
            getPriorityColor(task.priority)
          )}>
            {getTaskTypeIcon(task.task_type)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title and Priority */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("w-2 h-2 rounded-full shrink-0", getPriorityDot(task.priority))} />
              <h3 className={cn(
                "font-medium truncate",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>
            </div>

            {/* Description preview */}
            {task.description && (
              <p className="text-sm text-muted-foreground truncate mb-2">
                {task.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {/* Due Date */}
              {task.due_date && (
                <span className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-500 font-medium",
                  isDueToday && !isOverdue && "text-orange-500 font-medium"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), "d MMM", { locale: ru })}
                </span>
              )}

              {/* Client */}
              {task.client && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {task.client.name}
                </span>
              )}

              {/* Assigned To */}
              {task.assigned_user && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={task.assigned_user.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {task.assigned_user.full_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[80px]">{task.assigned_user.full_name}</span>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={cn("text-xs", getStatusColor(task.status))}>
                {getStatusLabel(task.status)}
              </Badge>

              {task.event && (
                <Badge variant="outline" className="text-xs truncate max-w-[120px]">
                  {task.event.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
