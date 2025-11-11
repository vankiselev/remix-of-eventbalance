import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWarehouseTasks } from "@/hooks/useWarehouseTasks";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { Plus, X } from "lucide-react";

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskEditDialog = ({ open, onOpenChange }: TaskEditDialogProps) => {
  const { createTask } = useWarehouseTasks();
  const { data: events = [] } = useEvents();
  const { data: profiles = [] } = useProfiles();
  const { items: warehouseItems } = useWarehouseItems();

  const [formData, setFormData] = useState({
    event_id: "",
    assigned_to: "",
    task_type: "collection" as "collection" | "return",
    due_date: "",
    notes: "",
  });

  const [taskItems, setTaskItems] = useState<Array<{ item_id: string; quantity: number }>>([]);

  const handleSubmit = () => {
    if (taskItems.length === 0) {
      return;
    }

    createTask.mutate({
      ...formData,
      event_id: formData.event_id || null,
      assigned_to: formData.assigned_to || null,
      due_date: formData.due_date || null,
      items: taskItems,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          event_id: "",
          assigned_to: "",
          task_type: "collection",
          due_date: "",
          notes: "",
        });
        setTaskItems([]);
      }
    });
  };

  const addItem = () => {
    setTaskItems([...taskItems, { item_id: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setTaskItems(taskItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...taskItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setTaskItems(newItems);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать задачу</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Мероприятие</Label>
            <Select value={formData.event_id} onValueChange={(value) => setFormData({ ...formData, event_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите мероприятие" />
              </SelectTrigger>
              <SelectContent>
                {events.filter(e => !e.is_archived).map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Тип задачи</Label>
            <Select value={formData.task_type} onValueChange={(value: any) => setFormData({ ...formData, task_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collection">Сбор</SelectItem>
                <SelectItem value="return">Возврат</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Исполнитель</Label>
            <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите исполнителя" />
              </SelectTrigger>
              <SelectContent>
                {profiles.filter(p => p.employment_status === 'active').map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Срок выполнения</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Товары</Label>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </div>

            {taskItems.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Select
                  value={item.item_id}
                  onValueChange={(value) => updateItem(index, 'item_id', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Выберите товар" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseItems.map((warehouseItem) => (
                      <SelectItem key={warehouseItem.id} value={warehouseItem.id}>
                        {warehouseItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-24"
                  placeholder="Кол-во"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {taskItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Добавьте товары в задачу
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={taskItems.length === 0 || createTask.isPending}
            >
              Создать задачу
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
