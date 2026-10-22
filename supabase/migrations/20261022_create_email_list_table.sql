-- ==============================================================================
-- Gardner Auction — Email List Subscription Schema & RLS Policies
-- Migration: 20261022_create_email_list_table.sql
-- ==============================================================================

-- 1. Create email-list table
CREATE TABLE IF NOT EXISTS public."email-list" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Add Unique Index / Constraint on normalized lowercase email
CREATE UNIQUE INDEX IF NOT EXISTS "email_list_lower_email_idx" 
ON public."email-list" (lower(trim(email)));

-- Also ensure unique constraint for PostgREST upsert resolution if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_list_email_unique'
  ) THEN
    ALTER TABLE public."email-list" ADD CONSTRAINT "email_list_email_unique" UNIQUE (email);
  END IF;
END $$;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public."email-list" ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Policy 1: Authenticated users can insert their own subscriptions
DROP POLICY IF EXISTS "Authenticated users can insert own subscription" ON public."email-list";
CREATE POLICY "Authenticated users can insert own subscription"
ON public."email-list"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Policy 2: Authenticated users can select their own subscriptions
DROP POLICY IF EXISTS "Authenticated users can select own subscriptions" ON public."email-list";
CREATE POLICY "Authenticated users can select own subscriptions"
ON public."email-list"
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- Policy 3: Authenticated users can update their own subscriptions
DROP POLICY IF EXISTS "Authenticated users can update own subscriptions" ON public."email-list";
CREATE POLICY "Authenticated users can update own subscriptions"
ON public."email-list"
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Policy 4: Authenticated users can delete their own subscriptions
DROP POLICY IF EXISTS "Authenticated users can delete own subscriptions" ON public."email-list";
CREATE POLICY "Authenticated users can delete own subscriptions"
ON public."email-list"
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

-- 5. Helper function for checking if an email is already subscribed platform-wide
CREATE OR REPLACE FUNCTION public.check_email_subscribed(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."email-list"
    WHERE lower(trim(email)) = lower(trim(p_email))
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_email_subscribed(TEXT) TO authenticated;
