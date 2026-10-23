/**
-- ==============================================================================
-- Gardner Auction — Site Content TypeScript Type Definitions
-- ==============================================================================
*/

export interface TrustIndicator {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface CtaButton {
  label: string;
  destination: string;
  targetElementId?: string;
  icon?: string;
}

export interface HomepageHeroContent {
  brandLabel: string;
  heading: string;
  headingLine1: string;
  headingLine2: string;
  headingHighlight: string;
  description: string;
  ctaPrimary: CtaButton;
  ctaSecondary: CtaButton;
  trustIndicators: TrustIndicator[];
  heroImage: {
    url: string;
    alt: string;
  };
}

export interface FooterNavLink {
  label: string;
  destination: string;
}

export interface SiteFooterContent {
  brand: {
    name: string;
    tagline: string;
    logo: {
      url: string;
      alt: string;
    };
  };
  description: string;
  navigation: {
    title: string;
    links: FooterNavLink[];
  };
  contact: {
    title: string;
    address: {
      text: string;
      icon: string;
    };
    phone: {
      label: string;
      destination: string;
      icon: string;
    };
    email: {
      label: string;
      destination: string;
      icon: string;
    };
  };
  legal: {
    copyright: string;
    licensure: {
      text: string;
      icon: string;
    };
  };
}

export interface CurrentAuctionsHeroContent {
  eyebrow: string;
  heading: string;
  subtitle: string;
  backButton: {
    label: string;
    destination: string;
    title?: string;
    icon?: string;
    contextualRoutes?: {
      auctionDetails?: {
        label: string;
        destinationPattern: string;
      };
      currentAuctions?: {
        label: string;
        destination: string;
      };
    };
  };
  supportingText: {
    quote: string;
    lines: string[];
  };
  backgroundImage: {
    url: string;
    alt: string;
  };
}

export interface EmailListPageContent {
  eyebrow: string;
  heading: string;
  description: string;
  form: {
    placeholderAuthenticated: string;
    placeholderGuest: string;
    inputAriaLabel: string;
    submitButtonLabel: string;
    submittingButtonLabel: string;
    inputIcon?: string;
    submitButtonIcon?: string;
  };
  privacyNotice: {
    text: string;
    icon?: string;
  };
  trustBadges: Array<{
    label: string;
  }>;
  successMessage: {
    title: string;
    messageTemplate: string;
    subtext: string;
    resetButtonLabel: string;
    icon?: string;
    subtextIcon?: string;
  };
  authNotice: {
    guestPrompt: string;
    loginButtonLabel: string;
    authRequiredMessage: string;
  };
}

export interface SiteContentRecord<
  T = HomepageHeroContent | SiteFooterContent | CurrentAuctionsHeroContent | EmailListPageContent
> {
  id: string;
  key: 'homepage_hero' | 'site_footer' | 'current_auctions_hero' | 'email_list_page' | string;
  section: 'homepage' | 'footer' | 'current_auctions' | 'email_list' | string;
  content: T;
  created_at: string;
  updated_at: string;
}
