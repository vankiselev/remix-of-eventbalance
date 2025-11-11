import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarehouseTask {
  id: string;
  event_id: string | null;
  assigned_to: string | null;
  task_type: 'collection' | 'return';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface WarehouseTaskItem {
  id: string;
  task_id: string;
  item_id: string;
  quantity: number;
  collected_quantity: number;
  is_collected: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseTaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  photo_url: string | null;
  created_at: string;
}

export interface WarehouseTaskWithDetails extends WarehouseTask {
  items?: WarehouseTaskItem[];
  comments?: WarehouseTaskComment[];
  event?: { name: string } | null;
  assigned_to_profile?: { full_name: string } | null;
  created_by_profile?: { full_name: string } | null;
}

export const useWarehouseTasks = () => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['warehouse-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_tasks' as any)
        .select(`
          *,
          event:events(name),
          assigned_to_profile:profiles!warehouse_tasks_assigned_to_fkey(full_name),
          created_by_profile:profiles!warehouse_tasks_created_by_fkey(full_name),
          items:warehouse_task_items(*),
          comments:warehouse_task_comments(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as WarehouseTaskWithDetails[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: Partial<WarehouseTask> & { items: Array<{ item_id: string; quantity: number }> }) => {
      const { items: taskItems, ...taskData } = task;
      
      const { data: newTask, error: taskError } = await supabase
        .from('warehouse_tasks' as any)
        .insert(taskData)
        .select()
        .single();
      
      if (taskError) throw taskError;

      if (taskItems && taskItems.length > 0 && newTask) {
        const itemsData = taskItems.map(item => ({
          task_id: (newTask as any).id,
          item_id: item.item_id,
          quantity: item.quantity,
          collected_quantity: 0,
          is_collected: false
        }));

        const { error: itemsError } = await supabase
          .from('warehouse_task_items' as any)
          .insert(itemsData);
        
        if (itemsError) throw itemsError;
      }
      
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      toast.success('Задача создана');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Ошибка при создании задачи');
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseTask> }) => {
      const { data, error } = await supabase
        .from('warehouse_tasks' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      toast.success('Задача обновлена');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Ошибка при обновлении задачи');
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WarehouseTask['status'] }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('warehouse_tasks' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      toast.success('Статус задачи обновлен');
    },
    onError: (error) => {
      console.error('Error updating task status:', error);
      toast.error('Ошибка при обновлении статуса');
    },
  });

  const updateTaskItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseTaskItem> }) => {
      const { data, error } = await supabase
        .from('warehouse_task_items' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      toast.success('Товар обновлен');
    },
    onError: (error) => {
      console.error('Error updating task item:', error);
      toast.error('Ошибка при обновлении товара');
    },
  });

  const addComment = useMutation({
    mutationFn: async (comment: { task_id: string; comment: string; photo?: File }) => {
      let photo_url = null;
      
      if (comment.photo) {
        photo_url = await uploadCommentPhoto(comment.photo);
      }

      const { data, error } = await supabase
        .from('warehouse_task_comments' as any)
        .insert({
          task_id: comment.task_id,
          comment: comment.comment,
          photo_url
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      toast.success('Комментарий добавлен');
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast.error('Ошибка при добавлении комментария');
    },
  });

  const uploadCommentPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `task-comments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('warehouse-photos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('warehouse-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    updateTaskStatus,
    updateTaskItem,
    addComment,
  };
};
