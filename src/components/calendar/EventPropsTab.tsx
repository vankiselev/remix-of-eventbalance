import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreatePropsTaskDialog } from "./CreatePropsTaskDialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface EventPropsTabProps {
  eventId: string | null;
  eventName: string;
  eventDate: string;
}

interface TaskWithDetails {
  id: string;
  task_type: 'collection' | 'return';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  notes: string | null;
  assigned_to_profile?: { full_name: string } | null;
  items?: Array<{
    id: string;
    quantity: number;
    collected_quantity: number;
    is_collected: boolean;
    warehouse_items: { name: string } | null;
  }>;
}

export const EventPropsTab = ({ eventId, eventName, eventDate }: EventPropsTabProps) => {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadTasks();
    }
  }, [eventId]);

  const loadTasks = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_tasks' as any)
        .select(`
          *,
          assigned_to_profile:profiles!warehouse_tasks_assigned_to_fkey(full_name),
          items:warehouse_task_items(
            id,
            quantity,
            collected_quantity,
            is_collected,
            warehouse_items!warehouse_task_items_item_id_fkey(name)
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data || []) as any);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Выполнена';
      case 'in_progress': return 'В работе';
      case 'cancelled': return 'Отменена';
      default: return 'Ожидает';
    }
  };

  const getTaskTypeText = (type: string) => {
    return type === 'collection' ? 'Сбор реквизита' : 'Возврат реквизита';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Реквизит для мероприятия</h3>
          <p className="text-sm text-muted-foreground">
            Управление задачами на сбор и возврат реквизита
          </p>
        </div>
        {eventId && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать задачу
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка задач...
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                Нет задач для этого мероприятия.
                <br />
                Создайте задачу на сбор реквизита.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {getTaskTypeText(task.task_type)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {task.assigned_to_profile && (
                          <span>Исполнитель: {task.assigned_to_profile.full_name}</span>
                        )}
                        {task.due_date && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(task.due_date), 'd MMMM yyyy', { locale: ru })}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusText(task.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {task.notes && (
                    <p className="text-sm text-muted-foreground mb-3">{task.notes}</p>
                  )}
                  {task.items && task.items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Товары:</p>
                      <div className="space-y-1">
                        {task.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center text-sm p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              {item.is_collected ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              )}
                              <span>
                                {item.warehouse_items?.name || 'Товар не найден'}
                              </span>
                            </div>
                            <span className="text-muted-foreground">
                              {item.collected_quantity} / {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <CreatePropsTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        eventId={eventId}
        eventName={eventName}
        eventDate={eventDate}
        onSuccess={loadTasks}
      />
    </div>
  );
};
