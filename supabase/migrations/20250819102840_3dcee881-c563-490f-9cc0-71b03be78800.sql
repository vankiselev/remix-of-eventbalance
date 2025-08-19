-- Create contractors table
CREATE TABLE public.contractors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  description text,
  specialization text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create venues table  
CREATE TABLE public.venues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  contact_person text,
  phone text,
  email text,
  capacity integer,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create animators table
CREATE TABLE public.animators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  specialization text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  company text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Update events table structure
ALTER TABLE public.events 
DROP COLUMN IF EXISTS budget,
DROP COLUMN IF EXISTS actual_cost,
DROP COLUMN IF EXISTS end_date,
DROP COLUMN IF EXISTS show_program,
DROP COLUMN IF EXISTS contractors,
DROP COLUMN IF EXISTS animators,
DROP COLUMN IF EXISTS managers;

-- Add new fields to events table
ALTER TABLE public.events
ADD COLUMN venue_id uuid REFERENCES public.venues(id),
ADD COLUMN contractor_ids uuid[],
ADD COLUMN responsible_manager_ids uuid[],
ADD COLUMN manager_ids uuid[];

-- Enable RLS on new tables
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contractors
CREATE POLICY "All authenticated users can view contractors" 
ON public.contractors FOR SELECT 
USING (true);

CREATE POLICY "All authenticated users can create contractors" 
ON public.contractors FOR INSERT 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update contractors" 
ON public.contractors FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete contractors" 
ON public.contractors FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create RLS policies for venues
CREATE POLICY "All authenticated users can view venues" 
ON public.venues FOR SELECT 
USING (true);

CREATE POLICY "All authenticated users can create venues" 
ON public.venues FOR INSERT 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update venues" 
ON public.venues FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete venues" 
ON public.venues FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create RLS policies for animators
CREATE POLICY "All authenticated users can view animators" 
ON public.animators FOR SELECT 
USING (true);

CREATE POLICY "All authenticated users can create animators" 
ON public.animators FOR INSERT 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update animators" 
ON public.animators FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete animators" 
ON public.animators FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create RLS policies for clients
CREATE POLICY "All authenticated users can view clients" 
ON public.clients FOR SELECT 
USING (true);

CREATE POLICY "All authenticated users can create clients" 
ON public.clients FOR INSERT 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update clients" 
ON public.clients FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete clients" 
ON public.clients FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Add policy for deleting events
CREATE POLICY "Users can delete events they created" 
ON public.events FOR DELETE 
USING (auth.uid() = created_by);

-- Create update triggers for new tables
CREATE TRIGGER update_contractors_updated_at
BEFORE UPDATE ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venues_updated_at
BEFORE UPDATE ON public.venues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_animators_updated_at
BEFORE UPDATE ON public.animators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();