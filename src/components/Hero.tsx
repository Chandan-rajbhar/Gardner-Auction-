import React from 'react';
import { ArrowRight, LayoutGrid, Award, ShieldCheck } from 'lucide-react';
import type { LotItem } from '../data/auctionData';
import { useSiteContent } from '../hooks/useSiteContent';
import type { HomepageHeroContent } from '../types/siteContent';

interface HeroProps {
  spotlightLot?: LotItem;
  spotlightTimeFormatted?: string;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (lotId: string) => void;
  onPlaceBid?: (lot: LotItem) => void;
  onViewLot?: (lot: LotItem) => void;
}

const DEFAULT_HERO_CONTENT: HomepageHeroContent = {
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

export const Hero: React.FC<HeroProps> = () => {
  const { content } = useSiteContent('homepage_hero', DEFAULT_HERO_CONTENT);

  const hero = content || DEFAULT_HERO_CONTENT;
  const brandLabel = hero.brandLabel || DEFAULT_HERO_CONTENT.brandLabel;
  const description = hero.description || DEFAULT_HERO_CONTENT.description;
  const ctaPrimary = hero.ctaPrimary || DEFAULT_HERO_CONTENT.ctaPrimary;
  const ctaSecondary = hero.ctaSecondary || DEFAULT_HERO_CONTENT.ctaSecondary;
  const trustIndicators = Array.isArray(hero.trustIndicators) && hero.trustIndicators.length > 0
    ? hero.trustIndicators
    : DEFAULT_HERO_CONTENT.trustIndicators;
  const heroImage = hero.heroImage || DEFAULT_HERO_CONTENT.heroImage;

  // Headline rendering with highlight support
  const line1 = hero.headingLine1 || 'Extraordinary Finds.';
  const line2 = hero.headingLine2 || 'Timeless Historical Value.';
  const highlight = hero.headingHighlight || 'Timeless';

  return (
    <section className="hero-section" id="home">
      <div className="hero-ambient-glow"></div>
      <div className="hero-container container-fluid">
        {/* Left Column: Hero Copy & Credentials */}
        <div className="hero-left-column">
          <div className="hero-est-badge">
            <span className="badge-text">{brandLabel}</span>
          </div>

          <h1 className="hero-headline">
            {line1}<br />
            {highlight && line2.includes(highlight) ? (
              <>
                <em className="hero-highlight">{highlight}</em>
                {line2.replace(highlight, '')}
              </>
            ) : (
              line2
            )}
          </h1>

          <p className="hero-subtext">
            {description}
          </p>

          <div className="hero-cta-group">
            <a
              href={ctaPrimary.destination || '#auctions'}
              className="btn-gold-primary"
              onClick={(e) => {
                e.preventDefault();
                const targetId = ctaPrimary.targetElementId || 'live-bidding';
                const el = document.getElementById(targetId) || document.getElementById('auctions');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>{ctaPrimary.label || 'EXPLORE LIVE AUCTIONS'}</span>
              <ArrowRight size={18} />
            </a>

            <a
              href={ctaSecondary.destination || '#auctions'}
              className="btn-dark-outline"
              onClick={(e) => {
                e.preventDefault();
                const targetId = ctaSecondary.targetElementId || 'auctions';
                const el = document.getElementById(targetId) || document.getElementById('auctions');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>{ctaSecondary.label || 'BROWSE ALL 1,420 LOTS'}</span>
              <LayoutGrid size={16} />
            </a>
          </div>

          <div className="hero-trust-row">
            {trustIndicators.map((seal, idx) => (
              <div key={seal.id || idx} className="trust-seal-item">
                <div className="trust-seal-icon">
                  {seal.icon === 'ShieldCheck' ? <ShieldCheck size={22} /> : <Award size={22} />}
                </div>
                <div className="trust-seal-info">
                  <h4>{seal.title}</h4>
                  <p>{seal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Large Premium Auction Photograph with Golden Radiance */}
        <div className="hero-right-column">
          <div className="hero-image-glow-wrap">
            <div className="hero-behind-glow" aria-hidden="true"></div>
            <div className="hero-image-frame">
              <img
                src={heroImage.url || '/images/hero_auction_coins.jpg'}
                alt={heroImage.alt || 'Gardner Auction Still Life'}
                className="hero-cinematic-img"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
