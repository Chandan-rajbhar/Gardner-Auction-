-- ==============================================================================
-- Gardner Auction — Site Content Schema & Initial Hero / Footer Persistence
-- Migration: 20261023_create_site_content_table.sql
-- ==============================================================================

-- 1. Create site_content table
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create index on section and key for fast lookup
CREATE INDEX IF NOT EXISTS site_content_key_idx ON public.site_content (key);
CREATE INDEX IF NOT EXISTS site_content_section_idx ON public.site_content (section);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Policy 1: Allow public read access to site content
DROP POLICY IF EXISTS "Public can view site content" ON public.site_content;
CREATE POLICY "Public can view site content"
ON public.site_content
FOR SELECT
TO public
USING (true);

-- Policy 2: Allow authenticated users to manage site content
DROP POLICY IF EXISTS "Authenticated users can insert site content" ON public.site_content;
CREATE POLICY "Authenticated users can insert site content"
ON public.site_content
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update site content" ON public.site_content;
CREATE POLICY "Authenticated users can update site content"
ON public.site_content
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Seed / Initial Persistence for Homepage Hero & Site Footer
INSERT INTO public.site_content (key, section, content, updated_at)
VALUES 
(
  'homepage_hero',
  'homepage',
  '{
    "brandLabel": "GARDNER AUCTION · EST. 1982",
    "heading": "Extraordinary Finds. Timeless Historical Value.",
    "headingLine1": "Extraordinary Finds.",
    "headingLine2": "Timeless Historical Value.",
    "headingHighlight": "Timeless",
    "description": "Pennsylvania''s premier certified auction institution connecting high-caliber estates with discerning collectors worldwide. Accredited specialists in rare gold numismatics, heirloom estate jewelry, colonial Americana, and museum-grade fine art.",
    "ctaPrimary": {
      "label": "EXPLORE LIVE AUCTIONS",
      "destination": "#auctions",
      "targetElementId": "live-bidding",
      "icon": "ArrowRight"
    },
    "ctaSecondary": {
      "label": "BROWSE ALL 1,420 LOTS",
      "destination": "#auctions",
      "targetElementId": "auctions",
      "icon": "LayoutGrid"
    },
    "trustIndicators": [
      {
        "id": "integrity",
        "title": "42 YEARS INTEGRITY",
        "description": "Continuous regional leadership",
        "icon": "Award"
      },
      {
        "id": "guarantee",
        "title": "TITLE GUARANTEE",
        "description": "100% Provenance & Authenticity",
        "icon": "ShieldCheck"
      }
    ],
    "heroImage": {
      "url": "/images/hero_auction_coins.jpg",
      "alt": "Rare United States Gold & Silver Numismatics and Historic Estate Auction Still Life"
    }
  }'::jsonb,
  timezone('utc'::text, now())
),
(
  'site_footer',
  'footer',
  '{
    "brand": {
      "name": "GARDNER AUCTION",
      "tagline": "APPRAISERS & AUCTIONEERS",
      "logo": {
        "url": "/images/gardner_logo.png",
        "alt": "Gardner Auction Since 1960"
      }
    },
    "description": "Pennsylvania''s premier certified auction institution specializing in rare gold, fine silver, numismatics, and fine estate collections.",
    "navigation": {
      "title": "NAVIGATION",
      "links": [
        {
          "label": "Home",
          "destination": "/"
        },
        {
          "label": "Current Auctions",
          "destination": "#auctions"
        },
        {
          "label": "Past Auctions",
          "destination": "#catalogs"
        },
        {
          "label": "Email List",
          "destination": "#email-list"
        }
      ]
    },
    "contact": {
      "title": "GALLERY CONTACT",
      "address": {
        "text": "4200 Commercial Boulevard, Suite 100, Pittsburgh, PA 15201",
        "icon": "MapPin"
      },
      "phone": {
        "label": "(412) 555-0199",
        "destination": "tel:4125550199",
        "icon": "Phone"
      },
      "email": {
        "label": "info@gardnerauction.com",
        "destination": "mailto:info@gardnerauction.com",
        "icon": "Mail"
      }
    },
    "legal": {
      "copyright": "© 1960–2026 Gardner Auction LLC. All Rights Reserved. Regulated PA Auctioneer License #AY-002004.",
      "licensure": {
        "text": "Commonwealth of Pennsylvania Registered & Bonded Auction House",
        "icon": "ShieldCheck"
      }
    }
  }'::jsonb,
  timezone('utc'::text, now())
)
ON CONFLICT (key) DO UPDATE SET
  section = EXCLUDED.section,
  content = EXCLUDED.content,
  updated_at = EXCLUDED.updated_at;
