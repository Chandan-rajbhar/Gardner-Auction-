-- ==============================================================================
-- Gardner Auction — Current Auctions Hero Persistence
-- Migration: 20261023_add_current_auctions_hero_to_site_content.sql
-- ==============================================================================

-- Insert or upsert Current Auctions Hero content in public.site_content
INSERT INTO public.site_content (key, section, content, updated_at)
VALUES 
(
  'current_auctions_hero',
  'current_auctions',
  '{
    "eyebrow": "LIVE & UPCOMING AUCTIONS",
    "heading": "Current & Upcoming Auctions",
    "subtitle": "Browse live auction sessions, explore our catalog of exceptional items, and find your next prized collection.",
    "backButton": {
      "label": "Back to Home",
      "destination": "/",
      "title": "Return to Homepage",
      "icon": "ArrowLeft",
      "contextualRoutes": {
        "auctionDetails": {
          "label": "Back to Auction Details",
          "destinationPattern": "#auction/:id"
        },
        "currentAuctions": {
          "label": "Back to Current Auctions",
          "destination": "#current-auction?tab=auctions"
        }
      }
    },
    "supportingText": {
      "quote": "Exceptional Items.\nTrusted Expertise.\nSince 1960.",
      "lines": [
        "Exceptional Items.",
        "Trusted Expertise.",
        "Since 1960."
      ]
    },
    "backgroundImage": {
      "url": "/images/current_auction_hero.jpg",
      "alt": "Current & Upcoming Auctions Gavel Hero Background"
    }
  }'::jsonb,
  timezone('utc'::text, now())
)
ON CONFLICT (key) DO UPDATE SET
  section = EXCLUDED.section,
  content = EXCLUDED.content,
  updated_at = EXCLUDED.updated_at;
