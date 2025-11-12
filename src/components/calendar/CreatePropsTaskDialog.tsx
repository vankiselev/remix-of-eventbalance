import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { useWarehouseLocations } from "@/hooks/useWarehouseLocations";
import { useEmployees } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { Plus, Trash2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface CreatePropsTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  eventName: string;
  eventDate: string;
  onSuccess: () => void;
}

interface TaskItem {
  item_id: string;
  item_name: string;
  quantity: number;
}

export const CreatePropsTaskDialog = ({
  open,
  onOpenChange,
  eventId,
  eventName,
  eventDate,
  onSuccess,
}: CreatePropsTaskDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items } = useWarehouseItems();
  const { locations } = useWarehouseLocations();
  const { data: employees } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<TaskItem[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [formData, setFormData] = useState({
    assigned_to: "",
    location_id: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    if (open && eventDate) {
      // Auto-fill due date as one day before event
      const eventDateObj = new Date(eventDate);
      const dueDate = addDays(eventDateObj, -1);
      setFormData(prev => ({
        ...prev,
        due_date: format(dueDate, 'yyyy-MM-dd'),
      }));
    }
  }, [open, eventDate]);

  const handleReset = () => {
    setFormData({
      assigned_to: "",
      location_id: "",
      due_date: "",
      notes: "",
    });
    setSelectedItems([]);
    setSearchQuery("");
  };

  const addItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const exists = selectedItems.find(i => i.item_id === itemId);
    if (exists) {
      toast({
        variant: "destructive",
        title: "Товар уже добавлен",
      });
      return;
    }

    setSelectedItems([
      ...selectedItems,
      { item_id: itemId, item_name: item.name, quantity: 1 },
    ]);
    setSearchQuery("");
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.item_id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(
      selectedItems.map(i =>
        i.item_id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i
      )
    );
  };

  const handleSubmit = async () => {
    if (!user || !eventId) return;

    if (selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Добавьте хотя бы один товар",
      });
      return;
    }

    if (!formData.assigned_to) {
      toast({
        variant: "destructive",
        title: "Выберите исполнителя",
      });
      return;
    }

    setLoading(true);
    try {
      // Create collection task
      const { data: task, error: taskError } = await supabase
        .from('warehouse_tasks' as any)
        .insert({
          event_id: eventId,
          assigned_to: formData.assigned_to,
          task_type: 'collection',
          status: 'pending',
          due_date: formData.due_date || null,
          notes: formData.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Add items to task
      const taskItems = selectedItems.map(item => ({
        task_id: (task as any).id,
        item_id: item.item_id,
        quantity: item.quantity,
        collected_quantity: 0,
        is_collected: false,
      }));

      const { error: itemsError } = await supabase
        .from('warehouse_task_items' as any)
        .insert(taskItems);

      if (itemsError) throw itemsError;

      // Create automatic return task (one day after event)
      const returnDate = addDays(new Date(eventDate), 1);
      
      const { data: returnTask, error: returnTaskError } = await supabase
        .from('warehouse_tasks' as any)
        .insert({
          event_id: eventId,
          assigned_to: formData.assigned_to,
          task_type: 'return',
          status: 'pending',
          due_date: format(returnDate, 'yyyy-MM-dd'),
          notes: `Автоматически созданная задача возврата для мероприятия "${eventName}"`,
          created_by: user.id,
        })
        .select()
        .single();

      if (returnTaskError) throw returnTaskError;

      // Add same items to return task
      const returnTaskItems = selectedItems.map(item => ({
        task_id: (returnTask as any).id,
        item_id: item.item_id,
        quantity: item.quantity,
        collected_quantity: 0,
        is_collected: false,
      }));

      const { error: returnItemsError } = await supabase
        .from('warehouse_task_items' as any)
        .insert(returnTaskItems);

      if (returnItemsError) throw returnItemsError;

      toast({
        title: "Успешно!",
        description: "Задачи на сбор и возврат реквизита созданы",
      });

      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось создать задачу",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Создать задачу на сбор реквизита</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Мероприятие</Label>
              <Input value={eventName} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Исполнитель *</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Срок выполнения</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Дополнительная информация для исполнителя"
              />
            </div>

            <div className="space-y-2">
              <Label>Товары *</Label>
              
              {/* Search and add items */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск товаров по названию или артикулу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="pl-9"
                />
              </div>

              {(searchQuery || isSearchFocused) && (
                <Card>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[120px]">
                      {filteredItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Товары не найдены
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {filteredItems.slice(0, 10).map((item) => (
                            <Button
                              key={item.id}
                              variant="ghost"
                              className="w-full justify-start h-auto py-2"
                              onClick={() => addItem(item.id)}
                            >
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  SKU: {item.sku} • В наличии: {item.total_quantity || 0}
                                </span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Selected items */}
              {selectedItems.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm font-medium">Выбрано товаров: {selectedItems.length}</p>
                  {selectedItems.map((item) => (
                    <div
                      key={item.item_id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.item_name}</p>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.item_id, parseInt(e.target.value) || 1)
                        }
                        className="w-20"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.item_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="font-medium mb-1">ℹ️ Автоматическое создание задачи возврата</p>
              <p>
                После создания задачи на сбор будет автоматически создана задача на возврат
                реквизита на следующий день после мероприятия.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedItems.length === 0 || !formData.assigned_to}
          >
            {loading ? "Создание..." : "Создать задачи"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
