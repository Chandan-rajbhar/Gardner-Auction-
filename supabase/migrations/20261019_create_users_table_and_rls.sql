-- ==============================================================================
-- Gardner Auction AF360 Administrative Console
-- Database Migration: Users Profile Table, RBAC & Row Level Security (RLS)
-- File: supabase/migrations/20261019_create_users_table_and_rls.sql
-- ==============================================================================

-- 1. Ensure public.users table exists with correct columns
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'clerk', 'consignor_manager', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Remove foreign key constraint if present so client & trigger inserts never fail
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. Indexes for fast query resolution
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Allow anon & authenticated roles to INSERT, SELECT, and UPDATE
DROP POLICY IF EXISTS "Allow public insert" ON public.users;
CREATE POLICY "Allow public insert"
  ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select" ON public.users;
CREATE POLICY "Allow public select"
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public update" ON public.users;
CREATE POLICY "Allow public update"
  ON public.users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Trigger on auth.users for Automatic Profile Creation in public.users
-- The very first user to register becomes 'super_admin'.
-- All subsequent registrations receive 'user'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := 'user';
  v_full_name TEXT;
  v_super_admin_count INT;
BEGIN
  -- Extract full_name from metadata or email prefix
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Operator'
  );

  -- First account created is super_admin, others are standard user
  SELECT COUNT(*) INTO v_super_admin_count FROM public.users WHERE role = 'super_admin';
  IF v_super_admin_count = 0 THEN
    v_role := 'super_admin';
  ELSE
    v_role := 'user';
  END IF;

  -- Insert profile record
  INSERT INTO public.users (id, full_name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_role,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Immediate Sync: Copy any users already present in auth.users into public.users
INSERT INTO public.users (id, full_name, email, role, created_at, updated_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1), 'Operator'),
  email,
  'user',
  created_at,
  now()
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- End of Migration
-- ==============================================================================
