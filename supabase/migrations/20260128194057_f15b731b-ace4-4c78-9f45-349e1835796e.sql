-- Add missing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS description text;

-- Add missing columns to animators table  
ALTER TABLE public.animators
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS specialization text;

-- Add missing columns to contractors table
ALTER TABLE public.contractors
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS specialization text;