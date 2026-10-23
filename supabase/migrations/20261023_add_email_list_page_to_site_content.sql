-- ==============================================================================
-- Gardner Auction — Email List Page Content Persistence
-- Migration: 20261023_add_email_list_page_to_site_content.sql
-- ==============================================================================

-- Insert or upsert Email List Page content in public.site_content
INSERT INTO public.site_content (key, section, content, updated_at)
VALUES 
(
  'email_list_page',
  'email_list',
  '{
    "eyebrow": "AUCTION NOTIFICATIONS",
    "heading": "Join Our Auction Email List",
    "description": "Receive advance catalog releases, private preview invitations, and consignment dates for upcoming gold, silver, and rare coin sales.",
    "form": {
      "placeholderAuthenticated": "Enter email address to subscribe...",
      "placeholderGuest": "Log in to subscribe your email...",
      "inputAriaLabel": "Email address for auction catalog notifications",
      "submitButtonLabel": "Join Email List",
      "submittingButtonLabel": "Subscribing...",
      "inputIcon": "Mail",
      "submitButtonIcon": "ArrowRight"
    },
    "privacyNotice": {
      "text": "Fiduciary privacy guaranteed. Unsubscribe at any time with one click.",
      "icon": "ShieldCheck"
    },
    "trustBadges": [
      { "label": "Advance Catalogs" },
      { "label": "Private Previews" },
      { "label": "No Spam Guaranteed" }
    ],
    "successMessage": {
      "title": "Thank You for Subscribing",
      "messageTemplate": "You have been enrolled to receive advance catalog previews at {email}.",
      "subtext": "Private collector communication protocol active.",
      "resetButtonLabel": "Register Another Email Address",
      "icon": "CheckCircle2",
      "subtextIcon": "ShieldCheck"
    },
    "authNotice": {
      "guestPrompt": "Guest Mode · Log in to subscribe",
      "loginButtonLabel": "Log In to Subscribe",
      "authRequiredMessage": "Authentication required: You must be logged in to subscribe to the auction email list. Please log in first."
    }
  }'::jsonb,
  timezone('utc'::text, now())
)
ON CONFLICT (key) DO UPDATE SET
  section = EXCLUDED.section,
  content = EXCLUDED.content,
  updated_at = EXCLUDED.updated_at;
