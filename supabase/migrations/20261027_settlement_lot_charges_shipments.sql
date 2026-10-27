-- ==============================================================================
-- Gardner Auction AF360 Administrative Console
-- Database Migration: Settlement Lot Items, Charges & Shipment Records
-- File: supabase/migrations/20261027_settlement_lot_charges_shipments.sql
-- ==============================================================================

-- 1. invoice_lots — individual lot line items belonging to an invoice
--    Each row represents one lot won by the bidder, with a JSONB "entries"
--    array for the Hammer, Buyer's Premium, Tax and any per-lot fee entries.
CREATE TABLE IF NOT EXISTS public.invoice_lots (
  id            TEXT PRIMARY KEY,
  invoice_id    TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  auction_id    TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  lot_id        TEXT,                             -- FK to lots.id when available
  lot_number    INT  NOT NULL DEFAULT 0,
  title         TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Sold'
                  CHECK (status IN ('Sold', 'Unsold', 'Passed')),
  qty_sold      INT  NOT NULL DEFAULT 1,
  is_shipped    BOOLEAN NOT NULL DEFAULT false,
  -- entries is a JSON array: [{id, type, label, amount, isRefundable?}]
  entries       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoice_lots_invoice_id  ON public.invoice_lots(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lots_auction_id  ON public.invoice_lots(auction_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lots_lot_id      ON public.invoice_lots(lot_id);

-- 2. invoice_charges — named charges that supplement lot totals
--    (e.g. shipping & handling surcharge, photography fee, storage)
CREATE TABLE IF NOT EXISTS public.invoice_charges (
  id            TEXT PRIMARY KEY,
  invoice_id    TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  auction_id    TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  account       TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  amount        NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  charge_type   TEXT NOT NULL DEFAULT 'buyer'
                  CHECK (charge_type IN ('buyer', 'seller')),
  charge_date   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoice_charges_invoice_id ON public.invoice_charges(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_charges_auction_id ON public.invoice_charges(auction_id);

-- 3. shipment_records — per-lot / per-invoice shipment tracking
CREATE TABLE IF NOT EXISTS public.shipment_records (
  id              TEXT PRIMARY KEY,
  invoice_id      TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  auction_id      TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  invoice_lot_id  TEXT REFERENCES public.invoice_lots(id) ON DELETE SET NULL,
  carrier         TEXT,
  tracking_number TEXT,
  ship_date       TEXT,
  shipped_by      TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Shipped', 'Picked Up', 'Returned')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shipment_records_invoice_id     ON public.shipment_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_shipment_records_auction_id     ON public.shipment_records(auction_id);
CREATE INDEX IF NOT EXISTS idx_shipment_records_invoice_lot_id ON public.shipment_records(invoice_lot_id);

-- 4. Enable RLS on all three new tables
ALTER TABLE public.invoice_lots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_charges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_records ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies -- invoice_lots
DROP POLICY IF EXISTS "Allow select invoice_lots"  ON public.invoice_lots;
CREATE POLICY "Allow select invoice_lots" ON public.invoice_lots
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert invoice_lots"  ON public.invoice_lots;
CREATE POLICY "Allow insert invoice_lots" ON public.invoice_lots
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update invoice_lots"  ON public.invoice_lots;
CREATE POLICY "Allow update invoice_lots" ON public.invoice_lots
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete invoice_lots"  ON public.invoice_lots;
CREATE POLICY "Allow delete invoice_lots" ON public.invoice_lots
  FOR DELETE TO anon, authenticated USING (true);

-- 6. RLS Policies -- invoice_charges
DROP POLICY IF EXISTS "Allow select invoice_charges"  ON public.invoice_charges;
CREATE POLICY "Allow select invoice_charges" ON public.invoice_charges
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert invoice_charges"  ON public.invoice_charges;
CREATE POLICY "Allow insert invoice_charges" ON public.invoice_charges
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update invoice_charges"  ON public.invoice_charges;
CREATE POLICY "Allow update invoice_charges" ON public.invoice_charges
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete invoice_charges"  ON public.invoice_charges;
CREATE POLICY "Allow delete invoice_charges" ON public.invoice_charges
  FOR DELETE TO anon, authenticated USING (true);

-- 7. RLS Policies -- shipment_records
DROP POLICY IF EXISTS "Allow select shipment_records"  ON public.shipment_records;
CREATE POLICY "Allow select shipment_records" ON public.shipment_records
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert shipment_records"  ON public.shipment_records;
CREATE POLICY "Allow insert shipment_records" ON public.shipment_records
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update shipment_records"  ON public.shipment_records;
CREATE POLICY "Allow update shipment_records" ON public.shipment_records
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete shipment_records"  ON public.shipment_records;
CREATE POLICY "Allow delete shipment_records" ON public.shipment_records
  FOR DELETE TO anon, authenticated USING (true);
