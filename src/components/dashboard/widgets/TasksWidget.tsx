import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface TasksWidgetProps {
  compact?: boolean;
}

export function TasksWidget({ compact }: TasksWidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, isLoading } = useTasks();

  const myTasks = tasks?.filter(t => 
    t.assigned_to === user?.id && 
    t.status !== 'completed' && 
    t.status !== 'cancelled'
  ).slice(0, compact ? 3 : 5) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Мои задачи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Мои задачи
          {myTasks.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{myTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        {myTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет активных задач
          </p>
        ) : (
          <div className="space-y-2">
            {myTasks.map(task => (
              <div
                key={task.id}
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate('/tasks')}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                  <Badge variant={getPriorityColor(task.priority)} className="shrink-0 text-xs">
                    {task.priority === 'urgent' ? 'Срочно' : 
                     task.priority === 'high' ? 'Высокий' :
                     task.priority === 'medium' ? 'Средний' : 'Низкий'}
                  </Badge>
                </div>
                {task.due_date && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(task.due_date), 'd MMM HH:mm', { locale: ru })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
