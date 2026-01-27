import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { sendNotification } from "@/utils/notifications";

// Типы задач включают складские (collection, return)
export type TaskType = 'call' | 'meeting' | 'task' | 'reminder' | 'follow_up' | 'collection' | 'return' | 'other';

// Товар в складской задаче
export interface TaskItem {
  item_id: string;
  item_name: string;
  quantity: number;
  collected_quantity: number;
  is_collected: boolean;
  notes?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string | null;
  created_by: string;
  client_id: string | null;
  event_id: string | null;
  due_date: string | null;
  reminder_at: string | null;
  tags: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  items: TaskItem[] | null;  // Товары для складских задач
}

export interface TaskWithDetails extends Task {
  assigned_user?: { id: string; full_name: string; avatar_url: string | null } | null;
  created_user?: { id: string; full_name: string; avatar_url: string | null } | null;
  client?: { id: string; name: string } | null;
  event?: { id: string; name: string } | null;
  checklists?: TaskChecklist[];
  comments?: TaskComment[];
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  text: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string | null;
  attachment_url: string | null;
  created_at: string;
  user?: { full_name: string; avatar_url: string | null };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  task_type?: TaskType;
  priority?: Task['priority'];
  assigned_to?: string | null;
  client_id?: string | null;
  event_id?: string | null;
  due_date?: string | null;
  reminder_at?: string | null;
  tags?: string[];
  checklists?: { text: string }[];
  items?: TaskItem[];  // Товары для складских задач
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  task_type?: TaskType;
  priority?: Task['priority'];
  status?: Task['status'];
  assigned_to?: string | null;
  client_id?: string | null;
  event_id?: string | null;
  due_date?: string | null;
  reminder_at?: string | null;
  tags?: string[];
  completed_at?: string | null;
  items?: TaskItem[];  // Товары для складских задач
}

export const useTasks = (filter?: { assignedTo?: string; status?: string; showAll?: boolean }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter?.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }

      if (filter?.assignedTo) {
        query = query.eq('assigned_to', filter.assignedTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTasks] Error fetching tasks:', error);
        throw error;
      }

      // Fetch related data
      const userIds = new Set<string>();
      const clientIds = new Set<string>();
      const eventIds = new Set<string>();

      data?.forEach(task => {
        if (task.assigned_to) userIds.add(task.assigned_to);
        if (task.created_by) userIds.add(task.created_by);
        if (task.client_id) clientIds.add(task.client_id);
        if (task.event_id) eventIds.add(task.event_id);
      });

      const [profilesRes, clientsRes, eventsRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(userIds))
          : { data: [] },
        clientIds.size > 0
          ? supabase.from('clients').select('id, name').in('id', Array.from(clientIds))
          : { data: [] },
        eventIds.size > 0
          ? supabase.from('events').select('id, name').in('id', Array.from(eventIds))
          : { data: [] },
      ]);

      const profilesMap = new Map<string, typeof profilesRes.data[0]>(
        (profilesRes.data || []).map(p => [p.id, p] as [string, typeof p])
      );
      const clientsMap = new Map<string, typeof clientsRes.data[0]>(
        (clientsRes.data || []).map(c => [c.id, c] as [string, typeof c])
      );
      const eventsMap = new Map<string, typeof eventsRes.data[0]>(
        (eventsRes.data || []).map(e => [e.id, e] as [string, typeof e])
      );

      return (data || []).map(task => ({
        ...task,
        items: Array.isArray(task.items) ? (task.items as unknown as TaskItem[]) : [],
        assigned_user: task.assigned_to ? profilesMap.get(task.assigned_to) : null,
        created_user: task.created_by ? profilesMap.get(task.created_by) : null,
        client: task.client_id ? clientsMap.get(task.client_id) : null,
        event: task.event_id ? eventsMap.get(task.event_id) : null,
      })) as TaskWithDetails[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { checklists, items, ...taskData } = input;

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          items: items ? JSON.parse(JSON.stringify(items)) : [],
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Create checklists if provided
      if (checklists && checklists.length > 0) {
        const checklistItems = checklists.map((item, index) => ({
          task_id: task.id,
          text: item.text,
          sort_order: index,
        }));

        const { error: checklistError } = await supabase
          .from('task_checklists')
          .insert(checklistItems);

        if (checklistError) {
          console.error('Error creating checklists:', checklistError);
        }
      }

      return task;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      toast.success('Задача создана');

      // Send notification to assigned user
      if (variables.assigned_to && variables.assigned_to !== user?.id) {
        try {
          await sendNotification({
            userId: variables.assigned_to,
            title: getTaskTypeEmoji(variables.task_type || 'task') + ' Новая задача',
            message: variables.title,
            type: 'task',
            data: {
              task_id: data.id,
              task_type: variables.task_type,
              due_date: variables.due_date,
            },
          });
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      }
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Ошибка при создании задачи');
    },
  });

  const updateTask = useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, items, ...restData } = input;

      // If status is being changed to completed, set completed_at
      const updateData: any = { ...restData };
      if (updateData.status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      if (items !== undefined) {
        updateData.items = JSON.parse(JSON.stringify(items));
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      toast.success('Задача обновлена');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Ошибка при обновлении задачи');
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      toast.success('Задача удалена');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Ошибка при удалении задачи');
    },
  });

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
};

// Hook for task checklists
export const useTaskChecklists = (taskId: string) => {
  const queryClient = useQueryClient();

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['task-checklists', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_checklists')
        .select('*')
        .eq('task_id', taskId)
        .order('sort_order');

      if (error) throw error;
      return data as TaskChecklist[];
    },
    enabled: !!taskId,
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('task_checklists')
        .update({ is_completed })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', taskId] });
    },
  });

  const addChecklist = useMutation({
    mutationFn: async (text: string) => {
      const maxOrder = checklists.reduce((max, c) => Math.max(max, c.sort_order), -1);
      
      const { error } = await supabase
        .from('task_checklists')
        .insert({
          task_id: taskId,
          text,
          sort_order: maxOrder + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', taskId] });
    },
  });

  const deleteChecklist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_checklists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', taskId] });
    },
  });

  return {
    checklists,
    isLoading,
    toggleChecklist,
    addChecklist,
    deleteChecklist,
  };
};

// Hook for task comments
export const useTaskComments = (taskId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user profiles
      const userIds = new Set(data?.map(c => c.user_id) || []);
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIds));

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return data?.map(comment => ({
          ...comment,
          user: profilesMap.get(comment.user_id),
        })) as TaskComment[];
      }

      return data as TaskComment[];
    },
    enabled: !!taskId,
  });

  const addComment = useMutation({
    mutationFn: async ({ comment, attachment_url }: { comment?: string; attachment_url?: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          comment,
          attachment_url,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  return {
    comments,
    isLoading,
    addComment,
    deleteComment,
  };
};

// Helper function for task type emoji
export const getTaskTypeEmoji = (type: TaskType) => {
  switch (type) {
    case 'call': return '📞';
    case 'meeting': return '🤝';
    case 'task': return '📋';
    case 'reminder': return '⏰';
    case 'follow_up': return '🔄';
    case 'collection': return '📦';
    case 'return': return '↩️';
    default: return '📌';
  }
};

export const getTaskTypeLabel = (type: TaskType) => {
  switch (type) {
    case 'call': return 'Звонок';
    case 'meeting': return 'Встреча';
    case 'task': return 'Задача';
    case 'reminder': return 'Напоминание';
    case 'follow_up': return 'Повторный контакт';
    case 'collection': return 'Сбор реквизита';
    case 'return': return 'Возврат реквизита';
    default: return 'Другое';
  }
};

export const getPriorityLabel = (priority: Task['priority']) => {
  switch (priority) {
    case 'low': return 'Низкий';
    case 'medium': return 'Средний';
    case 'high': return 'Высокий';
    case 'urgent': return 'Срочный';
    default: return priority;
  }
};

export const getStatusLabel = (status: Task['status']) => {
  switch (status) {
    case 'pending': return 'Ожидает';
    case 'in_progress': return 'В работе';
    case 'completed': return 'Завершена';
    case 'cancelled': return 'Отменена';
    default: return status;
  }
};

// Проверка, является ли задача складской
export const isWarehouseTask = (type: TaskType) => {
  return type === 'collection' || type === 'return';
};
