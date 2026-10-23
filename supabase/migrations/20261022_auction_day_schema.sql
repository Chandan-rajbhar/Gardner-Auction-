-- ==============================================================================
-- Gardner Auction AF360 Administrative Console
-- Database Migration: Auction Day Schema, Bidders, Alternate Bids & HiBid Stats
-- File: supabase/migrations/20261022_auction_day_schema.sql
-- ==============================================================================

-- 1. Ensure public.bidder_registrations table exists
CREATE TABLE IF NOT EXISTS public.bidder_registrations (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bid_card_number TEXT NOT NULL,
  bidder_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  hear_about_us TEXT,
  username TEXT,
  hibid_reputation TEXT DEFAULT '5.0 ★ (25 reviews)',
  bid_count INT DEFAULT 0,
  permission_text TEXT DEFAULT 'Approved - Standard ($25,000)',
  date_time TEXT,
  site TEXT DEFAULT 'hibid.com',
  notes TEXT,
  shipping_requested BOOLEAN DEFAULT true,
  bidder_notes TEXT,
  is_checked_in BOOLEAN DEFAULT false,
  deposit_amount NUMERIC(14, 2) DEFAULT 0.00,
  deposit_status TEXT DEFAULT 'Pending' CHECK (deposit_status IN ('Collected', 'Pending', 'Refunded', 'Applied', 'Waived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for bidder registrations
CREATE INDEX IF NOT EXISTS idx_registrations_auction_id ON public.bidder_registrations(auction_id);
CREATE INDEX IF NOT EXISTS idx_registrations_bid_card ON public.bidder_registrations(bid_card_number);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON public.bidder_registrations(is_checked_in);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.bidder_registrations(email);

-- 2. Ensure public.alternate_bids table exists
CREATE TABLE IF NOT EXISTS public.alternate_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  lot_number INT NOT NULL,
  bidder_name TEXT NOT NULL,
  paddle_number TEXT NOT NULL,
  bid_type TEXT NOT NULL CHECK (bid_type IN ('Phone', 'Absentee', 'Floor')),
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  max_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Executed', 'Cancelled', 'Rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for alternate bids
CREATE INDEX IF NOT EXISTS idx_alternate_bids_auction_id ON public.alternate_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_alternate_bids_lot_number ON public.alternate_bids(lot_number);
CREATE INDEX IF NOT EXISTS idx_alternate_bids_status ON public.alternate_bids(status);

-- 3. Ensure public.hibid_syndication_stats table exists
CREATE TABLE IF NOT EXISTS public.hibid_syndication_stats (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  site TEXT NOT NULL,
  registrations INT NOT NULL DEFAULT 0,
  cc_auths INT NOT NULL DEFAULT 0,
  views INT NOT NULL DEFAULT 0,
  unique_bidders INT NOT NULL DEFAULT 0,
  unique_bids INT NOT NULL DEFAULT 0,
  total_bids INT NOT NULL DEFAULT 0,
  high_bid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  max_bid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_auction_site UNIQUE(auction_id, site)
);

-- Indexes for HiBid stats
CREATE INDEX IF NOT EXISTS idx_hibid_stats_auction_id ON public.hibid_syndication_stats(auction_id);

-- 4. Ensure public.bids table exists (for live clerking bid history)
CREATE TABLE IF NOT EXISTS public.bids (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  auction_id TEXT REFERENCES public.auctions(id) ON DELETE SET NULL,
  lot_number INT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  paddle_number TEXT NOT NULL,
  bidder_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Floor',
  is_winning BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for bids
CREATE INDEX IF NOT EXISTS idx_bids_lot_id ON public.bids(lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_paddle ON public.bids(paddle_number);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.bidder_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alternate_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hibid_syndication_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Allow authenticated administrative & public select/insert/update
-- Bidder Registrations
DROP POLICY IF EXISTS "Allow select bidder_registrations" ON public.bidder_registrations;
CREATE POLICY "Allow select bidder_registrations" ON public.bidder_registrations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert bidder_registrations" ON public.bidder_registrations;
CREATE POLICY "Allow insert bidder_registrations" ON public.bidder_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update bidder_registrations" ON public.bidder_registrations;
CREATE POLICY "Allow update bidder_registrations" ON public.bidder_registrations
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete bidder_registrations" ON public.bidder_registrations;
CREATE POLICY "Allow delete bidder_registrations" ON public.bidder_registrations
  FOR DELETE TO anon, authenticated USING (true);

-- Alternate Bids
DROP POLICY IF EXISTS "Allow select alternate_bids" ON public.alternate_bids;
CREATE POLICY "Allow select alternate_bids" ON public.alternate_bids
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert alternate_bids" ON public.alternate_bids;
CREATE POLICY "Allow insert alternate_bids" ON public.alternate_bids
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update alternate_bids" ON public.alternate_bids;
CREATE POLICY "Allow update alternate_bids" ON public.alternate_bids
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete alternate_bids" ON public.alternate_bids;
CREATE POLICY "Allow delete alternate_bids" ON public.alternate_bids
  FOR DELETE TO anon, authenticated USING (true);

-- HiBid Syndication Stats
DROP POLICY IF EXISTS "Allow select hibid_syndication_stats" ON public.hibid_syndication_stats;
CREATE POLICY "Allow select hibid_syndication_stats" ON public.hibid_syndication_stats
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert hibid_syndication_stats" ON public.hibid_syndication_stats;
CREATE POLICY "Allow insert hibid_syndication_stats" ON public.hibid_syndication_stats
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update hibid_syndication_stats" ON public.hibid_syndication_stats;
CREATE POLICY "Allow update hibid_syndication_stats" ON public.hibid_syndication_stats
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete hibid_syndication_stats" ON public.hibid_syndication_stats;
CREATE POLICY "Allow delete hibid_syndication_stats" ON public.hibid_syndication_stats
  FOR DELETE TO anon, authenticated USING (true);

-- Bids
DROP POLICY IF EXISTS "Allow select bids" ON public.bids;
CREATE POLICY "Allow select bids" ON public.bids
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert bids" ON public.bids;
CREATE POLICY "Allow insert bids" ON public.bids
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update bids" ON public.bids;
CREATE POLICY "Allow update bids" ON public.bids
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Ensure public.bidder_deposits table exists
CREATE TABLE IF NOT EXISTS public.bidder_deposits (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  registration_id TEXT REFERENCES public.bidder_registrations(id) ON DELETE SET NULL,
  bid_card_number TEXT NOT NULL,
  bidder_name TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  amount_applied NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  amount_remaining NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'Credit Card',
  status TEXT NOT NULL DEFAULT 'Collected' CHECK (status IN ('Collected', 'Pending', 'Refunded', 'Applied')),
  date TEXT NOT NULL,
  reference_number TEXT,
  notes TEXT,
  received_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist if table was already created
ALTER TABLE public.bidder_deposits ADD COLUMN IF NOT EXISTS amount_applied NUMERIC(14, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.bidder_deposits ADD COLUMN IF NOT EXISTS amount_remaining NUMERIC(14, 2) NOT NULL DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_deposits_auction_id ON public.bidder_deposits(auction_id);
CREATE INDEX IF NOT EXISTS idx_deposits_bid_card ON public.bidder_deposits(bid_card_number);

ALTER TABLE public.bidder_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select bidder_deposits" ON public.bidder_deposits;
CREATE POLICY "Allow select bidder_deposits" ON public.bidder_deposits
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert bidder_deposits" ON public.bidder_deposits;
CREATE POLICY "Allow insert bidder_deposits" ON public.bidder_deposits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update bidder_deposits" ON public.bidder_deposits;
CREATE POLICY "Allow update bidder_deposits" ON public.bidder_deposits
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete bidder_deposits" ON public.bidder_deposits;
CREATE POLICY "Allow delete bidder_deposits" ON public.bidder_deposits
  FOR DELETE TO anon, authenticated USING (true);



