import React from 'react';
import { ArrowRight, LayoutGrid, Award, ShieldCheck } from 'lucide-react';
import type { LotItem } from '../data/auctionData';

interface HeroProps {
  spotlightLot?: LotItem;
  spotlightTimeFormatted?: string;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (lotId: string) => void;
  onPlaceBid?: (lot: LotItem) => void;
  onViewLot?: (lot: LotItem) => void;
}

export const Hero: React.FC<HeroProps> = () => {
  return (
    <section className="hero-section" id="home">
      <div className="hero-ambient-glow"></div>
      <div className="hero-container container-fluid">
        {/* Left Column: Hero Copy & Credentials (Preserved Verbatim) */}
        <div className="hero-left-column">
          <div className="hero-est-badge">
            <span className="gold-dash">——</span>
            <span className="badge-text">GARDNER AUCTION · EST. 1982</span>
          </div>

          <h1 className="hero-headline">
            Extraordinary Finds.<br />
            <em className="hero-highlight">Timeless</em> Historical Value.
          </h1>

          <p className="hero-subtext">
            Pennsylvania's premier certified auction institution connecting high-caliber
            estates with discerning collectors worldwide. Accredited specialists in rare
            gold numismatics, heirloom estate jewelry, colonial Americana, and museum-grade fine art.
          </p>

          <div className="hero-cta-group">
            <a
              href="#auctions"
              className="btn-gold-primary"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('live-bidding') || document.getElementById('auctions');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>EXPLORE LIVE AUCTIONS</span>
              <ArrowRight size={18} />
            </a>

            <a
              href="#auctions"
              className="btn-dark-outline"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('auctions');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>BROWSE ALL 1,420 LOTS</span>
              <LayoutGrid size={16} />
            </a>
          </div>

          <div className="hero-trust-row">
            <div className="trust-seal-item">
              <div className="trust-seal-icon">
                <Award size={22} />
              </div>
              <div className="trust-seal-info">
                <h4>42 YEARS INTEGRITY</h4>
                <p>Continuous regional leadership</p>
              </div>
            </div>

            <div className="trust-seal-item">
              <div className="trust-seal-icon">
                <ShieldCheck size={22} />
              </div>
              <div className="trust-seal-info">
                <h4>TITLE GUARANTEE</h4>
                <p>100% Provenance &amp; Authenticity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Large Premium Auction Photograph with Golden Radiance */}
        <div className="hero-right-column">
          <div className="hero-image-glow-wrap">
            <div className="hero-behind-glow" aria-hidden="true"></div>
            <div className="hero-image-frame">
              <img
                src="/images/hero_auction_coins.jpg"
                alt="Rare United States Gold &amp; Silver Numismatics and Historic Estate Auction Still Life"
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
