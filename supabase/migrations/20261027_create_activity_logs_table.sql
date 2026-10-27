-- ==============================================================================
-- Gardner Auction AF360 Administrative Console
-- Database Migration: Dedicated Administrative Audit & Activity Log Table
-- File: supabase/migrations/20261027_create_activity_logs_table.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id                  TEXT PRIMARY KEY,
  timestamp           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  operator_service    TEXT NOT NULL DEFAULT 'System',
  category            TEXT NOT NULL DEFAULT 'Clerking',
  event_action        TEXT NOT NULL DEFAULT '',
  audit_details       TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'SUCCESS',
  related_record_type TEXT, -- 'auction', 'lot', 'bidder', 'invoice', 'settlement'
  related_record_id   TEXT, -- Target ID for one-click deep navigation
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category   ON public.activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status     ON public.activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_related    ON public.activity_logs(related_record_type, related_record_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for Administrative & Authorized Read/Write
DROP POLICY IF EXISTS "Allow select activity_logs" ON public.activity_logs;
CREATE POLICY "Allow select activity_logs" ON public.activity_logs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert activity_logs" ON public.activity_logs;
CREATE POLICY "Allow insert activity_logs" ON public.activity_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update activity_logs" ON public.activity_logs;
CREATE POLICY "Allow update activity_logs" ON public.activity_logs
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete activity_logs" ON public.activity_logs;
CREATE POLICY "Allow delete activity_logs" ON public.activity_logs
  FOR DELETE TO anon, authenticated USING (true);
