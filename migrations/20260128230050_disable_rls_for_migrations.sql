-- Disable RLS on key tables to allow migrations to work
-- This allows supabase_auth_admin to create users and profiles

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_definitions DISABLE ROW LEVEL SECURITY;

-- Grant full privileges to supabase_auth_admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
