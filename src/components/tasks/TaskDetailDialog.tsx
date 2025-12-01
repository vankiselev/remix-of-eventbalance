import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Phone, Users, CheckSquare, Bell, RefreshCw, MoreHorizontal, 
  Calendar, Building2, CalendarDays, User, Plus, Trash2, Send,
  Play, CheckCircle2, XCircle, Edit
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  TaskWithDetails, 
  Task, 
  useTasks, 
  useTaskChecklists, 
  useTaskComments,
  getTaskTypeLabel,
  getPriorityLabel,
  getStatusLabel 
} from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";

interface TaskDetailDialogProps {
  task: TaskWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTaskTypeIcon = (type: Task['task_type']) => {
  switch (type) {
    case 'call': return <Phone className="h-5 w-5" />;
    case 'meeting': return <Users className="h-5 w-5" />;
    case 'task': return <CheckSquare className="h-5 w-5" />;
    case 'reminder': return <Bell className="h-5 w-5" />;
    case 'follow_up': return <RefreshCw className="h-5 w-5" />;
    default: return <MoreHorizontal className="h-5 w-5" />;
  }
};

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'low': return 'bg-gray-500';
    case 'medium': return 'bg-blue-500';
    case 'high': return 'bg-orange-500';
    case 'urgent': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusColor = (status: Task['status']) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/10 text-yellow-600';
    case 'in_progress': return 'bg-blue-500/10 text-blue-600';
    case 'completed': return 'bg-green-500/10 text-green-600';
    case 'cancelled': return 'bg-gray-500/10 text-gray-600';
    default: return 'bg-gray-500/10 text-gray-600';
  }
};

export const TaskDetailDialog = ({ task, open, onOpenChange }: TaskDetailDialogProps) => {
  const { user } = useAuth();
  const { updateTask, deleteTask } = useTasks();
  const { checklists, toggleChecklist, addChecklist, deleteChecklist } = useTaskChecklists(task?.id || '');
  const { comments, addComment } = useTaskComments(task?.id || '');

  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');

  if (!task) return null;

  const handleStatusChange = async (newStatus: Task['status']) => {
    await updateTask.mutateAsync({ id: task.id, status: newStatus });
  };

  const handleAddChecklistItem = async () => {
    if (newChecklistItem.trim()) {
      await addChecklist.mutateAsync(newChecklistItem.trim());
      setNewChecklistItem('');
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim()) {
      await addComment.mutateAsync({ comment: newComment.trim() });
      setNewComment('');
    }
  };

  const handleDelete = async () => {
    if (confirm('Удалить задачу?')) {
      await deleteTask.mutateAsync(task.id);
      onOpenChange(false);
    }
  };

  const completedChecklists = checklists.filter(c => c.is_completed).length;
  const totalChecklists = checklists.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-lg",
              "bg-primary/10 text-primary"
            )}>
              {getTaskTypeIcon(task.task_type)}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getTaskTypeLabel(task.task_type)}
                </Badge>
                <Badge variant="secondary" className={cn("text-xs", getStatusColor(task.status))}>
                  {getStatusLabel(task.status)}
                </Badge>
                <span className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                <span className="text-xs text-muted-foreground">
                  {getPriorityLabel(task.priority)}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-4 pr-4">
            {/* Status Actions */}
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <div className="flex gap-2">
                {task.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('in_progress')}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Взять в работу
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Завершить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('cancelled')}
                  className="flex items-center gap-2 text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  Отменить
                </Button>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {task.due_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Срок:</span>
                  <span>{format(new Date(task.due_date), "d MMMM yyyy, HH:mm", { locale: ru })}</span>
                </div>
              )}

              {task.assigned_user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Исполнитель:</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assigned_user.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {task.assigned_user.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{task.assigned_user.full_name}</span>
                  </div>
                </div>
              )}

              {task.client && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Клиент:</span>
                  <span>{task.client.name}</span>
                </div>
              )}

              {task.event && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Мероприятие:</span>
                  <span>{task.event.name}</span>
                </div>
              )}

              {task.created_user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Автор:</span>
                  <span>{task.created_user.full_name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Создана:</span>
                <span>{format(new Date(task.created_at), "d MMM yyyy", { locale: ru })}</span>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Описание</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <Separator />

            {/* Tabs for Checklist and Comments */}
            <Tabs defaultValue="checklist" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="checklist" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Чек-лист {totalChecklists > 0 && `(${completedChecklists}/${totalChecklists})`}
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  Комментарии {comments.length > 0 && `(${comments.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="space-y-2 mt-4">
                {checklists.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.is_completed}
                      onCheckedChange={(checked) => 
                        toggleChecklist.mutate({ id: item.id, is_completed: checked as boolean })
                      }
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      item.is_completed && "line-through text-muted-foreground"
                    )}>
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteChecklist.mutate(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2 mt-2">
                  <Input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Добавить пункт..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                  />
                  <Button variant="outline" size="icon" onClick={handleAddChecklistItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="comments" className="space-y-4 mt-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {comment.user?.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.user?.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{comment.comment}</p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Написать комментарий..."
                    rows={2}
                    className="resize-none"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Delete Button */}
            <div className="flex justify-end">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить задачу
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
