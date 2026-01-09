-- Fix the employees table to properly reference profiles
ALTER TABLE public.employees 
ADD CONSTRAINT fk_employees_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add new fields to events table for the calendar
ALTER TABLE public.events 
ADD COLUMN project_owner TEXT,
ADD COLUMN managers TEXT[],
ADD COLUMN location TEXT,
ADD COLUMN event_time TIME,
ADD COLUMN animators TEXT[],
ADD COLUMN show_program TEXT,
ADD COLUMN contractors TEXT[],
ADD COLUMN photos TEXT[],
ADD COLUMN videos TEXT[],
ADD COLUMN notes TEXT;