-- ==============================================================================
-- Gardner Auction AF360 Administrative Console
-- Database Migration: Settlement & Invoices Module (Invoices & Seller Settlements)
-- File: supabase/migrations/20261023_settlement_and_invoices_schema.sql
-- ==============================================================================

-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  auction_code TEXT,
  paddle_number TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  items_count INT DEFAULT 0,
  hammer_subtotal NUMERIC(14, 2) DEFAULT 0.00,
  buyers_premium NUMERIC(14, 2) DEFAULT 0.00,
  tax_amount NUMERIC(14, 2) DEFAULT 0.00,
  shipping_fee NUMERIC(14, 2) DEFAULT 0.00,
  total_due NUMERIC(14, 2) DEFAULT 0.00,
  balance NUMERIC(14, 2) DEFAULT 0.00,
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Pending Wire', 'Card Authorized', 'Check Received', 'Unpaid')),
  payment_method TEXT,
  payment_date TEXT,
  is_cash_buyer BOOLEAN DEFAULT false,
  is_shipped BOOLEAN DEFAULT false,
  shipped_count INT DEFAULT 0,
  total_lots_count INT DEFAULT 0,
  shipping_requested BOOLEAN DEFAULT true,
  tracking_number TEXT,
  shipping_carrier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_auction_id ON public.invoices(auction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paddle ON public.invoices(paddle_number);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);

-- 2. Seller Settlements Table
CREATE TABLE IF NOT EXISTS public.seller_settlements (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  consignor_code TEXT NOT NULL,
  consignor_name TEXT NOT NULL,
  auction_code TEXT,
  total_lots_sold INT DEFAULT 0,
  gross_hammer NUMERIC(14, 2) DEFAULT 0.00,
  commission_rate NUMERIC(6, 2) DEFAULT 10.00,
  commission_amount NUMERIC(14, 2) DEFAULT 0.00,
  photography_fees NUMERIC(14, 2) DEFAULT 0.00,
  net_payout NUMERIC(14, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'Pending Review' CHECK (status IN ('Paid', 'Ready for Payout', 'Pending Review')),
  check_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_seller_settlements_auction_id ON public.seller_settlements(auction_id);
CREATE INDEX IF NOT EXISTS idx_seller_settlements_code ON public.seller_settlements(consignor_code);
CREATE INDEX IF NOT EXISTS idx_seller_settlements_status ON public.seller_settlements(status);

-- 3. Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_settlements ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Invoices
DROP POLICY IF EXISTS "Allow select invoices" ON public.invoices;
CREATE POLICY "Allow select invoices" ON public.invoices
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert invoices" ON public.invoices;
CREATE POLICY "Allow insert invoices" ON public.invoices
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update invoices" ON public.invoices;
CREATE POLICY "Allow update invoices" ON public.invoices
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete invoices" ON public.invoices;
CREATE POLICY "Allow delete invoices" ON public.invoices
  FOR DELETE TO anon, authenticated USING (true);

-- 5. RLS Policies for Seller Settlements
DROP POLICY IF EXISTS "Allow select seller_settlements" ON public.seller_settlements;
CREATE POLICY "Allow select seller_settlements" ON public.seller_settlements
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert seller_settlements" ON public.seller_settlements;
CREATE POLICY "Allow insert seller_settlements" ON public.seller_settlements
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update seller_settlements" ON public.seller_settlements;
CREATE POLICY "Allow update seller_settlements" ON public.seller_settlements
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete seller_settlements" ON public.seller_settlements;
CREATE POLICY "Allow delete seller_settlements" ON public.seller_settlements
  FOR DELETE TO anon, authenticated USING (true);
