import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Gavel,
  Mail,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  getSiteContent,
  saveSiteContent,
  getAllSiteContent
} from '../../services/siteContentService';
import type {
  HomepageHeroContent,
  SiteFooterContent,
  CurrentAuctionsHeroContent,
  EmailListPageContent
} from '../../types/siteContent';
import { HeroEditModal } from './HeroEditModal';
import { FooterEditModal } from './FooterEditModal';
import { CurrentAuctionsHeroEditModal } from './CurrentAuctionsHeroEditModal';
import { EmailListPageEditModal } from './EmailListPageEditModal';

// Default initial fallbacks
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
  }
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

export const WebsiteContentManager: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Stored section content states
  const [heroContent, setHeroContent] = useState<HomepageHeroContent>(INITIAL_HERO);
  const [footerContent, setFooterContent] = useState<SiteFooterContent>(INITIAL_FOOTER);
  const [currentAuctionsHero, setCurrentAuctionsHero] = useState<CurrentAuctionsHeroContent>(INITIAL_CURRENT_AUCTIONS);
  const [emailListContent, setEmailListContent] = useState<EmailListPageContent>(INITIAL_EMAIL_LIST);

  // Modal active states
  const [activeModal, setActiveModal] = useState<
    'homepage_hero' | 'site_footer' | 'current_auctions_hero' | 'email_list_page' | null
  >(null);

  // Fetch all live values from Supabase site_content table
  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const all = await getAllSiteContent();
      if (all.homepage_hero) setHeroContent(all.homepage_hero);
      if (all.site_footer) setFooterContent(all.site_footer);
      if (all.current_auctions_hero) setCurrentAuctionsHero(all.current_auctions_hero);
      if (all.email_list_page) setEmailListContent(all.email_list_page);
    } catch (err) {
      console.warn('[WebsiteContentManager] Fetch error:', err);
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

  // Save handlers
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
    <div className="syndication-card" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 className="font-serif" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--text-main)' }}>
            <Globe size={19} color="var(--gold-primary)" />
            Website Content Management
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage and publish live saleroom portal content stored dynamically in the <code>site_content</code> database ledger.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={fetchAllContent}
            disabled={loading}
            title="Refresh values from database"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Sync with Database'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 6,
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid #f59e0b',
          color: '#b45309',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18
        }}>
          <CheckCircle2 size={16} />
          <span>✓ {successToast}</span>
        </div>
      )}

      {/* 4 Responsive Manageable Section Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: 16
      }}>
        {/* Card 1: Homepage Hero */}
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(223, 186, 82, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-primary)'
                }}>
                  <Sparkles size={16} />
                </div>
                <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>Homepage Hero</strong>
              </div>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600
              }}>
                Live in Saleroom
              </span>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Brand label, primary headline, description paragraph, conversion CTA buttons, trust badges, and hero coin imagery.
            </p>

            <div style={{
              fontSize: 11.5,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Headline: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                  {heroContent.headingLine1 || 'Extraordinary Finds.'} {heroContent.headingLine2 || ''}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Primary CTA: </span>
                <span style={{ color: 'var(--gold-primary)' }}>{heroContent.ctaPrimary?.label || 'EXPLORE LIVE AUCTIONS'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Asset: </span>
                <code style={{ fontSize: 10.5, color: '#94a3b8' }}>{heroContent.heroImage?.url || '/images/hero_auction_coins.jpg'}</code>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveModal('homepage_hero')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>

        {/* Card 2: Homepage Footer */}
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(223, 186, 82, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-primary)'
                }}>
                  <Layers size={16} />
                </div>
                <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>Website Footer &amp; Navigation</strong>
              </div>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600
              }}>
                Live in Saleroom
              </span>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              House branding, introductory description, 4 navigation links, gallery contact phone/email/address, and state licensure notice.
            </p>

            <div style={{
              fontSize: 11.5,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Brand: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{footerContent.brand?.name || 'GARDNER AUCTION'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Navigation: </span>
                <span style={{ color: '#94a3b8' }}>{(footerContent.navigation?.links || []).length} Links Configured</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phone: </span>
                <span style={{ color: 'var(--gold-primary)' }}>{footerContent.contact?.phone?.label || '(412) 555-0199'}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveModal('site_footer')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>

        {/* Card 3: Current Auctions Hero */}
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(223, 186, 82, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-primary)'
                }}>
                  <Gavel size={16} />
                </div>
                <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>Current Auctions Hero</strong>
              </div>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600
              }}>
                Live in Saleroom
              </span>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Eyebrow tag, catalog title, supporting subtitle, back navigation button, luxury quote box, and gavel hero background banner.
            </p>

            <div style={{
              fontSize: 11.5,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Eyebrow: </span>
                <span style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>{currentAuctionsHero.eyebrow || 'LIVE & UPCOMING AUCTIONS'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Title: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{currentAuctionsHero.heading || 'Current & Upcoming Auctions'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Banner: </span>
                <code style={{ fontSize: 10.5, color: '#94a3b8' }}>{currentAuctionsHero.backgroundImage?.url || '/images/current_auction_hero.jpg'}</code>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveModal('current_auctions_hero')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>

        {/* Card 4: Email List Page */}
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(223, 186, 82, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-primary)'
                }}>
                  <Mail size={16} />
                </div>
                <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>Email List Page UI</strong>
              </div>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600
              }}>
                Live in Saleroom
              </span>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Notification headline, catalog release description, form input placeholders, subscribe button text, fiduciary privacy guarantee, and trust pills.
            </p>

            <div style={{
              fontSize: 11.5,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Headline: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{emailListContent.heading || 'Join Our Auction Email List'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Button: </span>
                <span style={{ color: 'var(--gold-primary)' }}>{emailListContent.form?.submitButtonLabel || 'Join Email List'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Trust Badges: </span>
                <span style={{ color: '#94a3b8' }}>{(emailListContent.trustBadges || []).length} Badges Configured</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveModal('email_list_page')}
            >
              <Edit3 size={14} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editing Modals */}
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
