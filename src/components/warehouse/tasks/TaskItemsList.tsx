import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { WarehouseTaskWithDetails, useWarehouseTasks } from "@/hooks/useWarehouseTasks";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { Package, Check } from "lucide-react";

interface TaskItemsListProps {
  task: WarehouseTaskWithDetails;
}

export const TaskItemsList = ({ task }: TaskItemsListProps) => {
  const { updateTaskItem } = useWarehouseTasks();
  const { items: warehouseItems } = useWarehouseItems();
  const [editingQuantity, setEditingQuantity] = useState<Record<string, number>>({});

  const handleToggleCollected = (itemId: string, isCollected: boolean, currentQuantity: number) => {
    const updates: any = {
      is_collected: isCollected,
      collected_quantity: isCollected ? currentQuantity : 0
    };
    
    updateTaskItem.mutate({ id: itemId, updates });
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setEditingQuantity(prev => ({ ...prev, [itemId]: quantity }));
  };

  const handleSaveQuantity = (itemId: string, taskItemId: string) => {
    const quantity = editingQuantity[itemId];
    if (quantity !== undefined) {
      updateTaskItem.mutate({
        id: taskItemId,
        updates: { collected_quantity: quantity }
      });
      setEditingQuantity(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
    }
  };

  if (!task.items || task.items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Нет товаров в задаче
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {task.items.map((taskItem) => {
        const item = warehouseItems.find(i => i.id === taskItem.item_id);
        const isEditing = editingQuantity[taskItem.item_id] !== undefined;
        
        return (
          <Card key={taskItem.id} className="p-4">
            <div className="flex items-start gap-4">
              <Checkbox
                checked={taskItem.is_collected}
                onCheckedChange={(checked) => 
                  handleToggleCollected(taskItem.id, checked as boolean, taskItem.quantity)
                }
                disabled={task.status === 'completed' || task.status === 'cancelled'}
              />
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item?.name || 'Товар не найден'}</span>
                  </div>
                  {taskItem.is_collected && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Требуется:</span>
                    <span className="font-medium">{taskItem.quantity}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Собрано:</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={taskItem.quantity}
                          value={editingQuantity[taskItem.item_id]}
                          onChange={(e) => handleQuantityChange(taskItem.item_id, parseInt(e.target.value) || 0)}
                          className="w-20 h-8"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveQuantity(taskItem.item_id, taskItem.id)}
                        >
                          Сохранить
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">{taskItem.collected_quantity}</span>
                        {task.status !== 'completed' && task.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuantityChange(taskItem.item_id, taskItem.collected_quantity)}
                          >
                            Изменить
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {taskItem.notes && (
                  <p className="text-sm text-muted-foreground">{taskItem.notes}</p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
