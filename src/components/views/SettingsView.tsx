import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sparkles,
  Layers,
  Gavel,
  Mail,
  Edit3,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Award,
  MapPin,
  Phone,
  ArrowRight,
  LayoutGrid,
  Check,
  Compass
} from 'lucide-react';
import {
  getAllSiteContent,
  saveSiteContent
} from '../../services/siteContentService';
import type {
  HomepageHeroContent,
  SiteFooterContent,
  CurrentAuctionsHeroContent,
  EmailListPageContent
} from '../../types/siteContent';
import { HeroEditModal } from '../content-management/HeroEditModal';
import { FooterEditModal } from '../content-management/FooterEditModal';
import { CurrentAuctionsHeroEditModal } from '../content-management/CurrentAuctionsHeroEditModal';
import { EmailListPageEditModal } from '../content-management/EmailListPageEditModal';

// Initial safe fallbacks
const INITIAL_HERO: HomepageHeroContent = {
  brandLabel: 'GARDNER AUCTION · EST. 1982',
  heading: 'Extraordinary Finds. Timeless Historical Value.',
  headingLine1: 'Extraordinary Finds.',
  headingLine2: 'Timeless Historical Value.',
  headingHighlight: 'Timeless',
  description: "Pennsylvania's premier certified auction institution connecting high-caliber estates with discerning collectors worldwide. Accredited specialists in rare gold numismatics, heirloom estate jewelry, colonial Americana, and museum-grade fine art.",
  ctaPrimary: {
    label: 'EXPLORE LIVE AUCTIONS',
    destination: '#auctions',
    targetElementId: 'live-bidding',
    icon: 'ArrowRight'
  },
  ctaSecondary: {
    label: 'BROWSE ALL 1,420 LOTS',
    destination: '#auctions',
    targetElementId: 'auctions',
    icon: 'LayoutGrid'
  },
  trustIndicators: [
    {
      id: 'integrity',
      title: '42 YEARS INTEGRITY',
      description: 'Continuous regional leadership',
      icon: 'Award'
    },
    {
      id: 'guarantee',
      title: 'TITLE GUARANTEE',
      description: '100% Provenance & Authenticity',
      icon: 'ShieldCheck'
    }
  ],
  heroImage: {
    url: '/images/hero_auction_coins.jpg',
    alt: 'Rare United States Gold & Silver Numismatics and Historic Estate Auction Still Life'
  }
};

const INITIAL_FOOTER: SiteFooterContent = {
  brand: {
    name: 'GARDNER AUCTION',
    tagline: 'APPRAISERS & AUCTIONEERS · SINCE 1960',
    logo: {
      url: '/images/gardner_logo.png',
      alt: 'Gardner Auction Since 1960'
    }
  },
  description: "Pennsylvania's premier certified auction institution specializing in rare gold, fine silver, numismatics, and fine estate collections.",
  navigation: {
    title: 'NAVIGATION',
    links: [
      { label: 'Home', destination: '/' },
      { label: 'Current Auctions', destination: '#auctions' },
      { label: 'Past Auctions', destination: '#catalogs' },
      { label: 'Email List', destination: '#email-list' }
    ]
  },
  contact: {
    title: 'GALLERY CONTACT',
    address: {
      text: '4200 Commercial Boulevard, Suite 100, Pittsburgh, PA 15201',
      icon: 'MapPin'
    },
    phone: {
      label: '(412) 555-0199',
      destination: 'tel:4125550199',
      icon: 'Phone'
    },
    email: {
      label: 'info@gardnerauction.com',
      destination: 'mailto:info@gardnerauction.com',
      icon: 'Mail'
    }
  },
  legal: {
    copyright: '© 1960–2026 Gardner Auction LLC. All Rights Reserved. Regulated PA Auctioneer License #AY-002004.',
    licensure: {
      text: 'Commonwealth of Pennsylvania Registered & Bonded Auction House',
      icon: 'ShieldCheck'
    }
  },
  socialLinks: [
    { platform: 'Facebook', url: 'https://facebook.com/gardnerauction' },
    { platform: 'Instagram', url: 'https://instagram.com/gardnerauction' }
  ]
};

const INITIAL_CURRENT_AUCTIONS: CurrentAuctionsHeroContent = {
  eyebrow: 'LIVE & UPCOMING AUCTIONS',
  heading: 'Current & Upcoming Auctions',
  subtitle: 'Browse live auction sessions, explore our catalog of exceptional items, and find your next prized collection.',
  backButton: {
    label: 'Back to Home',
    destination: '/',
    title: 'Return to Homepage',
    icon: 'ArrowLeft'
  },
  supportingText: {
    quote: 'Exceptional Items.\nTrusted Expertise.\nSince 1960.',
    lines: ['Exceptional Items.', 'Trusted Expertise.', 'Since 1960.']
  },
  backgroundImage: {
    url: '/images/current_auction_hero.jpg',
    alt: 'Current & Upcoming Auctions Gavel Hero Background'
  }
};

const INITIAL_EMAIL_LIST: EmailListPageContent = {
  eyebrow: 'AUCTION NOTIFICATIONS',
  heading: 'Join Our Auction Email List',
  description: 'Receive advance catalog releases, private preview invitations, and consignment dates for upcoming gold, silver, and rare coin sales.',
  form: {
    placeholderAuthenticated: 'Enter email address to subscribe...',
    placeholderGuest: 'Log in to subscribe your email...',
    inputAriaLabel: 'Email address for auction catalog notifications',
    submitButtonLabel: 'Join Email List',
    submittingButtonLabel: 'Subscribing...',
    inputIcon: 'Mail',
    submitButtonIcon: 'ArrowRight'
  },
  privacyNotice: {
    text: 'Fiduciary privacy guaranteed. Unsubscribe at any time with one click.',
    icon: 'ShieldCheck'
  },
  trustBadges: [
    { label: 'Advance Catalogs' },
    { label: 'Private Previews' },
    { label: 'No Spam Guaranteed' }
  ],
  successMessage: {
    title: 'Thank You for Subscribing',
    messageTemplate: 'You have been enrolled to receive advance catalog previews at {email}.',
    subtext: 'Private collector communication protocol active.',
    resetButtonLabel: 'Register Another Email Address',
    icon: 'CheckCircle2',
    subtextIcon: 'ShieldCheck'
  },
  authNotice: {
    guestPrompt: 'Guest Mode · Log in to subscribe',
    loginButtonLabel: 'Log In to Subscribe',
    authRequiredMessage: 'Authentication required: You must be logged in to subscribe to the auction email list. Please log in first.'
  }
};

export const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Stored section content states
  const [heroContent, setHeroContent] = useState<HomepageHeroContent>(INITIAL_HERO);
  const [footerContent, setFooterContent] = useState<SiteFooterContent>(INITIAL_FOOTER);
  const [currentAuctionsHero, setCurrentAuctionsHero] = useState<CurrentAuctionsHeroContent>(INITIAL_CURRENT_AUCTIONS);
  const [emailListContent, setEmailListContent] = useState<EmailListPageContent>(INITIAL_EMAIL_LIST);

  // Active modal state
  const [activeModal, setActiveModal] = useState<
    'homepage_hero' | 'site_footer' | 'current_auctions_hero' | 'email_list_page' | null
  >(null);

  // Fetch all live values from Supabase site_content ledger
  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const all = await getAllSiteContent();
      if (all.homepage_hero) setHeroContent(all.homepage_hero);
      if (all.site_footer) setFooterContent(all.site_footer);
      if (all.current_auctions_hero) setCurrentAuctionsHero(all.current_auctions_hero);
      if (all.email_list_page) setEmailListContent(all.email_list_page);
    } catch (err) {
      console.warn('[SettingsView] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllContent();
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // Section save handlers
  const handleSaveHero = async (updated: HomepageHeroContent) => {
    const res = await saveSiteContent('homepage_hero', 'homepage', updated);
    if (res.success) {
      setHeroContent(updated);
      triggerToast('Homepage Hero content saved and published live to website.');
    }
    return res;
  };

  const handleSaveFooter = async (updated: SiteFooterContent) => {
    const res = await saveSiteContent('site_footer', 'footer', updated);
    if (res.success) {
      setFooterContent(updated);
      triggerToast('Footer content & navigation links saved and published live to website.');
    }
    return res;
  };

  const handleSaveCurrentAuctionsHero = async (updated: CurrentAuctionsHeroContent) => {
    const res = await saveSiteContent('current_auctions_hero', 'current_auctions', updated);
    if (res.success) {
      setCurrentAuctionsHero(updated);
      triggerToast('Current Auctions Hero content saved and published live to website.');
    }
    return res;
  };

  const handleSaveEmailList = async (updated: EmailListPageContent) => {
    const res = await saveSiteContent('email_list_page', 'email_list', updated);
    if (res.success) {
      setEmailListContent(updated);
      triggerToast('Email List Page presentation saved and published live to website.');
    }
    return res;
  };

  return (
    <div className="wcm-page-wrapper">
      {/* 1. Executive Modern Page Header */}
      <div className="wcm-header-card">
        <div className="wcm-header-left">
          <div className="wcm-header-icon-box">
            <Globe size={24} />
          </div>
          <div>
            <h2 className="wcm-header-title">
              Website Content Management
            </h2>
            <p className="wcm-header-desc">
              Manage and publish live saleroom portal content across your public website.
            </p>
          </div>
        </div>

        <div className="wcm-header-actions">


          <button
            type="button"
            className="wcm-sync-btn"
            onClick={fetchAllContent}
            disabled={loading}
            title="Sync values from database"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Success Toast Alert */}
      {successToast && (
        <div className="wcm-toast-banner" role="alert">
          <CheckCircle2 size={18} />
          <span>✓ {successToast}</span>
        </div>
      )}

      {/* 3. Four Modernized Responsive Content Cards */}
      <div className="wcm-cards-grid">
        {/* ================= CARD 1: HOMEPAGE HERO ================= */}
        <div className="wcm-content-card">
          <div>
            {/* Header Identity */}
            <div className="wcm-card-header">
              <div className="wcm-card-identity">
                <div className="wcm-card-icon-badge">
                  <Sparkles size={20} />
                </div>
                <div className="wcm-card-title-wrap">
                  <h3 className="wcm-card-title">Homepage Hero Section</h3>
                  <code className="wcm-card-key-pill">key: homepage_hero</code>
                </div>
              </div>
              <span className="wcm-status-tag">
                <span className="wcm-live-pulse-dot" style={{ width: 6, height: 6 }} />
                Published Live
              </span>
            </div>

            <p className="wcm-card-description">
              Brand eyebrow label, main headlines with styled italic gold highlight, introductory summary, conversion CTA buttons, and saleroom trust credentials.
            </p>

            {/* Warm Ivory Content Preview Surface */}
            <div className="wcm-preview-surface">
              <div className="wcm-preview-top-row">
                <div className="wcm-preview-thumb-wrap">
                  <img
                    src={heroContent.heroImage?.url || '/images/hero_auction_coins.jpg'}
                    alt={heroContent.heroImage?.alt || 'Hero Showcase Thumbnail'}
                    className="wcm-preview-thumb-img"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/hero_auction_coins.jpg';
                    }}
                  />
                </div>
                <div className="wcm-preview-info-col">
                  <span className="wcm-preview-eyebrow">
                    {heroContent.brandLabel || 'GARDNER AUCTION · EST. 1982'}
                  </span>
                  <div className="wcm-preview-heading">
                    {heroContent.headingLine1 || 'Extraordinary Finds.'}{' '}
                    {heroContent.headingLine2 || 'Timeless Historical Value.'}
                  </div>
                  <div className="wcm-preview-snippet">
                    Highlight: <span style={{ color: 'var(--gold-primary)', fontStyle: 'italic', fontWeight: 600 }}>{heroContent.headingHighlight || 'Timeless'}</span> · {heroContent.description || 'Estate auctions & rare numismatics'}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="wcm-preview-pills-row">
                <span className="wcm-preview-pill accent">
                  <ArrowRight size={12} />
                  <span>{heroContent.ctaPrimary?.label || 'EXPLORE LIVE AUCTIONS'}</span>
                  <span style={{ opacity: 0.6 }}>({heroContent.ctaPrimary?.destination || '#auctions'})</span>
                </span>
                <span className="wcm-preview-pill">
                  <LayoutGrid size={12} />
                  <span>{heroContent.ctaSecondary?.label || 'BROWSE ALL 1,420 LOTS'}</span>
                </span>
              </div>

              {/* Trust Indicators Line */}
              <div className="wcm-preview-meta-line">
                <ShieldCheck size={13} color="var(--gold-primary)" />
                <span>
                  Trust Credentials: {(heroContent.trustIndicators || []).map(t => t.title).join(' • ') || '42 YEARS INTEGRITY • TITLE GUARANTEE'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="wcm-card-footer">
            <span className="wcm-target-route-label">
              <ExternalLink size={12} />
              <span>Target: Saleroom Portal Header</span>
            </span>
            <button
              type="button"
              className="wcm-edit-btn"
              onClick={() => setActiveModal('homepage_hero')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>

        {/* ================= CARD 2: WEBSITE FOOTER ================= */}
        <div className="wcm-content-card">
          <div>
            {/* Header Identity */}
            <div className="wcm-card-header">
              <div className="wcm-card-identity">
                <div className="wcm-card-icon-badge">
                  <Layers size={20} />
                </div>
                <div className="wcm-card-title-wrap">
                  <h3 className="wcm-card-title">Homepage &amp; Site-Wide Footer</h3>
                  <code className="wcm-card-key-pill">key: site_footer</code>
                </div>
              </div>
              <span className="wcm-status-tag">
                <span className="wcm-live-pulse-dot" style={{ width: 6, height: 6 }} />
                Published Live
              </span>
            </div>

            <p className="wcm-card-description">
              House saleroom branding, brand logo asset, overview summary, 4-item navigation menu, gallery contacts, social media channels, and PA state licensure.
            </p>

            {/* Warm Ivory Content Preview Surface */}
            <div className="wcm-preview-surface">
              <div className="wcm-preview-top-row">
                <div className="wcm-preview-thumb-wrap" style={{ background: '#fdfbf7' }}>
                  <img
                    src={footerContent.brand?.logo?.url || '/images/gardner_logo.png'}
                    alt={footerContent.brand?.logo?.alt || 'Footer Brand Logo'}
                    className="wcm-preview-thumb-logo"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/gardner_logo.png';
                    }}
                  />
                </div>
                <div className="wcm-preview-info-col">
                  <span className="wcm-preview-eyebrow">
                    {footerContent.brand?.tagline || 'APPRAISERS & AUCTIONEERS · SINCE 1960'}
                  </span>
                  <div className="wcm-preview-heading">
                    {footerContent.brand?.name || 'GARDNER AUCTION'}
                  </div>
                  <div className="wcm-preview-snippet">
                    {footerContent.description || "Pennsylvania's premier certified auction institution specializing in rare gold numismatics..."}
                  </div>
                </div>
              </div>

              {/* Navigation Menu Links */}
              <div className="wcm-preview-pills-row">
                {(footerContent.navigation?.links || []).map((link, idx) => (
                  <span key={idx} className="wcm-preview-pill">
                    <Compass size={11} color="var(--gold-primary)" />
                    <span>{link.label}</span>
                  </span>
                ))}
              </div>

              {/* Gallery Contact & Licensure Line */}
              <div className="wcm-preview-meta-line">
                <Phone size={12} color="var(--gold-primary)" />
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {footerContent.contact?.phone?.label || '(412) 555-0199'}
                </span>
                <span>•</span>
                <Mail size={12} color="var(--gold-primary)" />
                <span>{footerContent.contact?.email?.label || 'info@gardnerauction.com'}</span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="wcm-card-footer">
            <span className="wcm-target-route-label">
              <ExternalLink size={12} />
              <span>Target: Site-Wide Shared Footer</span>
            </span>
            <button
              type="button"
              className="wcm-edit-btn"
              onClick={() => setActiveModal('site_footer')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>

        {/* ================= CARD 3: CURRENT AUCTIONS HERO ================= */}
        <div className="wcm-content-card">
          <div>
            {/* Header Identity */}
            <div className="wcm-card-header">
              <div className="wcm-card-identity">
                <div className="wcm-card-icon-badge">
                  <Gavel size={20} />
                </div>
                <div className="wcm-card-title-wrap">
                  <h3 className="wcm-card-title">Current Auctions Hero Section</h3>
                  <code className="wcm-card-key-pill">key: current_auctions_hero</code>
                </div>
              </div>
              <span className="wcm-status-tag">
                <span className="wcm-live-pulse-dot" style={{ width: 6, height: 6 }} />
                Published Live
              </span>
            </div>

            <p className="wcm-card-description">
              Catalog section eyebrow badge, primary page title, subtitle narrative, back-to-home action button, luxury quote dossier, and gavel hero banner image.
            </p>

            {/* Warm Ivory Content Preview Surface */}
            <div className="wcm-preview-surface">
              <div className="wcm-preview-top-row">
                <div className="wcm-preview-thumb-wrap">
                  <img
                    src={currentAuctionsHero.backgroundImage?.url || '/images/current_auction_hero.jpg'}
                    alt={currentAuctionsHero.backgroundImage?.alt || 'Current Auctions Banner'}
                    className="wcm-preview-thumb-img"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/current_auction_hero.jpg';
                    }}
                  />
                </div>
                <div className="wcm-preview-info-col">
                  <span className="wcm-preview-eyebrow">
                    {currentAuctionsHero.eyebrow || 'LIVE & UPCOMING AUCTIONS'}
                  </span>
                  <div className="wcm-preview-heading">
                    {currentAuctionsHero.heading || 'Current & Upcoming Auctions'}
                  </div>
                  <div className="wcm-preview-snippet">
                    {currentAuctionsHero.subtitle || 'Browse live auction sessions, explore our catalog of exceptional items...'}
                  </div>
                </div>
              </div>

              {/* Navigation Action & Quote Highlights */}
              <div className="wcm-preview-pills-row">
                <span className="wcm-preview-pill accent">
                  <span>Action: {currentAuctionsHero.backButton?.label || 'Back to Home'}</span>
                  <span style={{ opacity: 0.6 }}>({currentAuctionsHero.backButton?.destination || '/'})</span>
                </span>
                <span className="wcm-preview-pill">
                  <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                    "{(currentAuctionsHero.supportingText?.lines || ['Exceptional Items.', 'Trusted Expertise.'])[0]}"
                  </span>
                </span>
              </div>

              {/* Quote Dossier Line */}
              <div className="wcm-preview-meta-line">
                <span style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>Quote Dossier:</span>
                <span>
                  {(currentAuctionsHero.supportingText?.lines || []).join(' • ') || 'Exceptional Items. • Trusted Expertise. • Since 1960.'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="wcm-card-footer">
            <span className="wcm-target-route-label">
              <ExternalLink size={12} />
              <span>Target: Current Auctions Catalog Page</span>
            </span>
            <button
              type="button"
              className="wcm-edit-btn"
              onClick={() => setActiveModal('current_auctions_hero')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>

        {/* ================= CARD 4: EMAIL LIST PAGE ================= */}
        <div className="wcm-content-card">
          <div>
            {/* Header Identity */}
            <div className="wcm-card-header">
              <div className="wcm-card-identity">
                <div className="wcm-card-icon-badge">
                  <Mail size={20} />
                </div>
                <div className="wcm-card-title-wrap">
                  <h3 className="wcm-card-title">Email List Page Presentation</h3>
                  <code className="wcm-card-key-pill">key: email_list_page</code>
                </div>
              </div>
              <span className="wcm-status-tag">
                <span className="wcm-live-pulse-dot" style={{ width: 6, height: 6 }} />
                Published Live
              </span>
            </div>

            <p className="wcm-card-description">
              Advance catalog notification headline, supporting narrative, subscription form input placeholders, submit button label, privacy notice, and trust pills.
            </p>

            {/* Warm Ivory Content Preview Surface */}
            <div className="wcm-preview-surface">
              <div className="wcm-preview-top-row">
                <div className="wcm-preview-info-col" style={{ paddingLeft: 2 }}>
                  <span className="wcm-preview-eyebrow">
                    {emailListContent.eyebrow || 'AUCTION NOTIFICATIONS'}
                  </span>
                  <div className="wcm-preview-heading">
                    {emailListContent.heading || 'Join Our Auction Email List'}
                  </div>
                  <div className="wcm-preview-snippet">
                    {emailListContent.description || 'Receive advance catalog releases, private preview invitations, and consignment dates...'}
                  </div>
                </div>
              </div>

              {/* Form Input & Action Simulation */}
              <div className="wcm-preview-pills-row">
                <span className="wcm-preview-pill" style={{ background: '#fdfbf7', color: '#64748b' }}>
                  <Mail size={11} color="var(--gold-primary)" />
                  <span>Placeholder: "{emailListContent.form?.placeholderAuthenticated || 'Enter email address...'}"</span>
                </span>
                <span className="wcm-preview-pill accent">
                  <Check size={11} />
                  <span>Button: {emailListContent.form?.submitButtonLabel || 'Join Email List'}</span>
                </span>
              </div>

              {/* Privacy Notice & Trust Pills */}
              <div className="wcm-preview-meta-line">
                <ShieldCheck size={13} color="var(--gold-primary)" />
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                  {(emailListContent.trustBadges || []).map(b => b.label).join(' • ') || 'Advance Catalogs • Private Previews • No Spam Guaranteed'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="wcm-card-footer">
            <span className="wcm-target-route-label">
              <ExternalLink size={12} />
              <span>Target: Email List Subscription Page</span>
            </span>
            <button
              type="button"
              className="wcm-edit-btn"
              onClick={() => setActiveModal('email_list_page')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= DEDICATED EDITING MODALS ================= */}
      <HeroEditModal
        isOpen={activeModal === 'homepage_hero'}
        onClose={() => setActiveModal(null)}
        initialContent={heroContent}
        onSave={handleSaveHero}
      />

      <FooterEditModal
        isOpen={activeModal === 'site_footer'}
        onClose={() => setActiveModal(null)}
        initialContent={footerContent}
        onSave={handleSaveFooter}
      />

      <CurrentAuctionsHeroEditModal
        isOpen={activeModal === 'current_auctions_hero'}
        onClose={() => setActiveModal(null)}
        initialContent={currentAuctionsHero}
        onSave={handleSaveCurrentAuctionsHero}
      />

      <EmailListPageEditModal
        isOpen={activeModal === 'email_list_page'}
        onClose={() => setActiveModal(null)}
        initialContent={emailListContent}
        onSave={handleSaveEmailList}
      />
    </div>
  );
};
