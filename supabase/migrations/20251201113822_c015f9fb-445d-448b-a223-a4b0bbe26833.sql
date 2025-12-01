
-- Create tasks table (universal CRM tasks)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'task', -- 'call', 'meeting', 'task', 'reminder', 'follow_up', 'other'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  tags TEXT[],
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_checklists table
CREATE TABLE public.task_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_checklists_task_id ON public.task_checklists(task_id);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks assigned to them or created by them"
ON public.tasks FOR SELECT
USING (auth.uid() = assigned_to OR auth.uid() = created_by OR is_admin_user(auth.uid()));

CREATE POLICY "Users can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tasks or tasks assigned to them"
ON public.tasks FOR UPDATE
USING (auth.uid() = assigned_to OR auth.uid() = created_by OR is_admin_user(auth.uid()));

CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
USING (auth.uid() = created_by OR is_admin_user(auth.uid()));

-- RLS Policies for task_checklists
CREATE POLICY "Users can view checklists for their tasks"
ON public.task_checklists FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = task_checklists.task_id 
  AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid() OR is_admin_user(auth.uid()))
));

CREATE POLICY "Users can manage checklists for their tasks"
ON public.task_checklists FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = task_checklists.task_id 
  AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid() OR is_admin_user(auth.uid()))
));

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments for their tasks"
ON public.task_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = task_comments.task_id 
  AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid() OR is_admin_user(auth.uid()))
));

CREATE POLICY "Users can add comments to their tasks"
ON public.task_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_comments.task_id 
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid() OR is_admin_user(auth.uid()))
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.task_comments FOR DELETE
USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_checklists_updated_at
  BEFORE UPDATE ON public.task_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
