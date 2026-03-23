import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WarehouseTaskWithDetails } from "@/hooks/useWarehouseTasks";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Package, Calendar } from "lucide-react";

interface IssuedItemsProps {
  tasks: WarehouseTaskWithDetails[];
}

interface ItemDetail {
  name: string;
  quantity: number;
  collected_quantity: number;
}

export const IssuedItems = ({ tasks }: IssuedItemsProps) => {

  // Filter for active collection tasks
  const activeTasks = tasks.filter(
    task => task.task_type === 'collection' && 
           (task.status === 'in_progress' || task.status === 'pending')
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Выданные товары</CardTitle>
            <CardDescription>
              {activeTasks.length} активных задач на сбор реквизита
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Нет активных задач на сбор реквизита
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <div key={task.id} className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {task.event?.name || 'Мероприятие'}
                      </p>
                      <Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'}>
                        {task.status === 'in_progress' ? 'В работе' : 'Ожидает'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {task.assigned_to_profile && (
                        <span>Исполнитель: {task.assigned_to_profile.full_name}</span>
                      )}
                      {task.due_date && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(task.due_date), 'd MMMM', { locale: ru })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {task.items && task.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Товары:</p>
                    <div className="space-y-1">
                      {task.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-sm p-2 rounded bg-muted/50"
                        >
                          <span>
                            {(item as any).warehouse_items?.name || 'Товар не найден'}
                          </span>
                          <span className="font-medium">
                            {item.collected_quantity} / {item.quantity} шт
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
