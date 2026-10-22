-- ==============================================================================
-- Gardner Auction AF360 Administrative Console
-- Database Migration: Profile Protection, Role/Email Immutability & Avatar Storage RLS
-- File: supabase/migrations/20261021_protect_profile_and_avatar_storage.sql
-- ==============================================================================

-- 1. Ensure avatar_url, phone, and title columns exist on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. Database-level trigger to strictly prevent modifying email and role via updates
-- This ensures that client-side manipulation of requests cannot alter authentication identity or role assignments.
CREATE OR REPLACE FUNCTION public.protect_user_immutable_fields()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent changing email address
  IF (OLD.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email) THEN
    RAISE EXCEPTION 'Email address is an immutable authentication identity and cannot be updated via the profile form.';
  END IF;

  -- Prevent unauthorized role changes / privilege escalation
  IF (OLD.role IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role) THEN
    -- Only allow service_role / internal database admin to change role
    IF (auth.jwt()->>'role' != 'service_role') THEN
      RAISE EXCEPTION 'Role and permission level cannot be modified through administrative profile updates.';
    END IF;
  END IF;

  -- Update timestamp automatically
  NEW.updated_at := timezone('utc'::text, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_user_immutable_fields ON public.users;
CREATE TRIGGER trg_protect_user_immutable_fields
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_immutable_fields();

-- 3. Row Level Security (RLS) Policies on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- CRITICAL FIX FOR INFINITE RECURSION:
-- Drop all existing policies on public.users to clear any recursive subqueries
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;

-- Clean, non-recursive SELECT policy: Anyone authenticated or anon can read profile records
CREATE POLICY "users_select_policy"
  ON public.users
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Clean, non-recursive INSERT policy: Allow profile insertion
CREATE POLICY "users_insert_policy"
  ON public.users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Clean, non-recursive UPDATE policy: Allow updating own record (direct comparison without subqueries)
CREATE POLICY "users_update_policy"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR email = (auth.jwt()->>'email'))
  WITH CHECK (id = auth.uid() OR email = (auth.jwt()->>'email'));

-- 4. SECURITY DEFINER RPC function to update user avatar safely with ZERO RLS recursion
CREATE OR REPLACE FUNCTION public.update_user_avatar(p_avatar_url TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := auth.jwt()->>'email';
  v_row public.users%ROWTYPE;
BEGIN
  UPDATE public.users
  SET 
    avatar_url = p_avatar_url,
    updated_at = timezone('utc'::text, now())
  WHERE (v_uid IS NOT NULL AND id = v_uid)
     OR (v_email IS NOT NULL AND email = v_email)
  RETURNING * INTO v_row;

  IF v_row.id IS NULL AND v_uid IS NOT NULL THEN
    -- If row did not exist, insert it
    INSERT INTO public.users (id, full_name, email, role, avatar_url, created_at, updated_at)
    VALUES (
      v_uid, 
      COALESCE(auth.jwt()->>'full_name', split_part(v_email, '@', 1), 'Operator'),
      v_email, 
      'super_admin', 
      p_avatar_url, 
      now(), 
      now()
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_avatar(TEXT) TO authenticated;

-- 5. Supabase Storage: 'avatars' Bucket Configuration & Storage RLS
-- Ensure the avatars bucket is configured with 10 MB limit and allowed image MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  10485760, -- 10 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage RLS: Public Read Access for avatars
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Storage RLS: Authenticated Upload to avatars bucket
DROP POLICY IF EXISTS "Authenticated Upload Avatars" ON storage.objects;
CREATE POLICY "Authenticated Upload Avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Storage RLS: Authenticated Update to avatars bucket
DROP POLICY IF EXISTS "Authenticated Update Avatars" ON storage.objects;
CREATE POLICY "Authenticated Update Avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- ==============================================================================
-- End of Migration
-- ==============================================================================
