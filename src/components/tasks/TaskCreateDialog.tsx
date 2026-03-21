import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Phone, Users, CheckSquare, Bell, RefreshCw, MoreHorizontal, Package, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/utils/formatName";
import { useTasks, CreateTaskInput, Task, TaskType, TaskItem } from "@/hooks/useTasks";
import { useProfiles } from "@/hooks/useProfiles";
import { useClients } from "@/hooks/useClients";
import { useEvents } from "@/hooks/useEvents";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  defaultEventId?: string;
  defaultAssignedTo?: string;
}

const taskTypes: { value: TaskType; label: string; icon: React.ReactNode }[] = [
  { value: 'call', label: 'Звонок', icon: <Phone className="h-4 w-4" /> },
  { value: 'meeting', label: 'Встреча', icon: <Users className="h-4 w-4" /> },
  { value: 'task', label: 'Задача', icon: <CheckSquare className="h-4 w-4" /> },
  { value: 'reminder', label: 'Напоминание', icon: <Bell className="h-4 w-4" /> },
  { value: 'follow_up', label: 'Повторный контакт', icon: <RefreshCw className="h-4 w-4" /> },
  { value: 'collection', label: 'Сбор реквизита', icon: <Package className="h-4 w-4" /> },
  { value: 'return', label: 'Возврат реквизита', icon: <Undo2 className="h-4 w-4" /> },
  { value: 'other', label: 'Другое', icon: <MoreHorizontal className="h-4 w-4" /> },
];

const priorities: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Низкий', color: 'bg-gray-500' },
  { value: 'medium', label: 'Средний', color: 'bg-blue-500' },
  { value: 'high', label: 'Высокий', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Срочный', color: 'bg-red-500' },
];

export const TaskCreateDialog = ({
  open,
  onOpenChange,
  defaultClientId,
  defaultEventId,
  defaultAssignedTo,
}: TaskCreateDialogProps) => {
  const { createTask } = useTasks();
  const { data: profiles } = useProfiles();
  const { data: clients } = useClients();
  const { data: events } = useEvents();
  const { items: warehouseItems } = useWarehouseItems();

  const isWarehouseTask = (type: TaskType) => type === 'collection' || type === 'return';

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    task_type: 'task',
    priority: 'medium',
    assigned_to: defaultAssignedTo || null,
    client_id: defaultClientId || null,
    event_id: defaultEventId || null,
    due_date: null,
    checklists: [],
    items: [],
  });

  // Для добавления товаров в складские задачи
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [selectedHour, setSelectedHour] = useState<string>('12');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const updateDueDateTime = (date: Date | undefined, hour: string, minute: string) => {
    if (!date) {
      setFormData(prev => ({ ...prev, due_date: null }));
      return;
    }
    const newDate = new Date(date);
    newDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
    setFormData(prev => ({ ...prev, due_date: newDate.toISOString() }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    updateDueDateTime(date, selectedHour, selectedMinute);
  };

  const handleHourChange = (hour: string) => {
    setSelectedHour(hour);
    const currentDate = formData.due_date ? new Date(formData.due_date) : new Date();
    updateDueDateTime(currentDate, hour, selectedMinute);
  };

  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute);
    const currentDate = formData.due_date ? new Date(formData.due_date) : new Date();
    updateDueDateTime(currentDate, selectedHour, minute);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    await createTask.mutateAsync(formData);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'task',
      priority: 'medium',
      assigned_to: defaultAssignedTo || null,
      client_id: defaultClientId || null,
      event_id: defaultEventId || null,
      due_date: null,
      checklists: [],
      items: [],
    });
    setNewChecklistItem('');
    setSelectedItemId('');
  };

  // Добавление товара в задачу
  const addItem = () => {
    if (!selectedItemId) return;
    const item = warehouseItems?.find(i => i.id === selectedItemId);
    if (!item) return;
    
    // Проверяем, не добавлен ли уже этот товар
    if (formData.items?.some(i => i.item_id === selectedItemId)) {
      setSelectedItemId('');
      return;
    }

    const newItem: TaskItem = {
      item_id: item.id,
      item_name: item.name,
      quantity: 1,
      collected_quantity: 0,
      is_collected: false,
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
    setSelectedItemId('');
  };

  // Удаление товара из задачи
  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(i => i.item_id !== itemId),
    }));
  };

  // Изменение количества товара
  const updateItemQuantity = (itemId: string, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(i => 
        i.item_id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i
      ),
    }));
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklists: [...(prev.checklists || []), { text: newChecklistItem.trim() }],
      }));
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists?.filter((_, i) => i !== index),
    }));
  };

  const activeProfiles = profiles?.filter(p => p.employment_status === 'active') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Введите заголовок задачи"
                required
              />
            </div>

            {/* Task Type */}
            <div className="space-y-2">
              <Label>Тип задачи</Label>
              <div className="grid grid-cols-3 gap-2">
                {taskTypes.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.task_type === type.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setFormData(prev => ({ ...prev, task_type: type.value }))}
                  >
                    {type.icon}
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <div className="flex gap-2">
                {priorities.map((p) => (
                  <Button
                    key={p.value}
                    type="button"
                    variant={formData.priority === p.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                  >
                    <span className={cn("w-2 h-2 rounded-full", p.color)} />
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label>Исполнитель</Label>
              <Select
                value={formData.assigned_to || 'none'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  assigned_to: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {activeProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {formatDisplayName(profile.full_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Срок выполнения</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !formData.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date
                        ? format(new Date(formData.due_date), "d MMM yyyy", { locale: ru })
                        : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.due_date ? new Date(formData.due_date) : undefined}
                      onSelect={handleDateSelect}
                      locale={ru}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Select value={selectedHour} onValueChange={handleHourChange}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center text-muted-foreground">:</span>
                <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label>Клиент</Label>
              <Select
                value={formData.client_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  client_id: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не привязан</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event */}
            <div className="space-y-2">
              <Label>Мероприятие</Label>
              <Select
                value={formData.event_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  event_id: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите мероприятие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не привязано</SelectItem>
                  {events?.filter(e => !e.is_archived).slice(0, 50).map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание задачи..."
                rows={3}
              />
            </div>

            {/* Items for warehouse tasks */}
            {isWarehouseTask(formData.task_type as TaskType) && (
              <div className="space-y-2">
                <Label>Товары для {formData.task_type === 'collection' ? 'сбора' : 'возврата'}</Label>
                <div className="space-y-2">
                  {formData.items?.map((item) => (
                    <div key={item.item_id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{item.item_name}</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.item_id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeItem(item.item_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите товар..." />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseItems?.filter(item => 
                          !formData.items?.some(i => i.item_id === item.id)
                        ).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} {item.sku ? `(${item.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={addItem} disabled={!selectedItemId}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {(!formData.items || formData.items.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      Добавьте товары, которые нужно {formData.task_type === 'collection' ? 'собрать' : 'вернуть'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Checklist (only for non-warehouse tasks) */}
            {!isWarehouseTask(formData.task_type as TaskType) && (
              <div className="space-y-2">
                <Label>Чек-лист</Label>
                <div className="space-y-2">
                  {formData.checklists?.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{item.text}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeChecklistItem(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Добавить пункт..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addChecklistItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Создание...' : 'Создать задачу'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
