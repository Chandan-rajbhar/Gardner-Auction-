-- ==============================================================================
-- Gardner Auction AF360 Administrative Console
-- Database Migration: Dedicated Notifications Table
-- File: supabase/migrations/20261027_create_notifications_table.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'system', -- 'auction', 'bidder', 'clerking', 'settlement', 'system', 'security'
  recipient_id        TEXT,                           -- User ID or 'all' / 'admin'
  recipient_role      TEXT DEFAULT 'admin',           -- 'admin', 'clerk', 'consignor_manager', 'super_admin', 'all'
  related_module      TEXT,                           -- 'auctions', 'lots', 'users', 'payments', 'reports', 'logs', 'settings'
  related_record_id   TEXT,                           -- ID of auction, lot, bidder, invoice, etc.
  action_url          TEXT,                           -- Navigation URL e.g. '/auctions/auc-001', '/payments', '/users'
  is_read             BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient  ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related    ON public.notifications(related_module, related_record_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for Administrative & Authorized Read/Write
DROP POLICY IF EXISTS "Allow select notifications" ON public.notifications;
CREATE POLICY "Allow select notifications" ON public.notifications
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert notifications" ON public.notifications;
CREATE POLICY "Allow insert notifications" ON public.notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update notifications" ON public.notifications;
CREATE POLICY "Allow update notifications" ON public.notifications
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete notifications" ON public.notifications;
CREATE POLICY "Allow delete notifications" ON public.notifications
  FOR DELETE TO anon, authenticated USING (true);
