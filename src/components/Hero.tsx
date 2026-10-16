import React from 'react';
import { ArrowRight, LayoutGrid, Award, ShieldCheck, Zap, Bookmark, Clock, Eye } from 'lucide-react';
import type { LotItem } from '../data/auctionData';

interface HeroProps {
  spotlightLot: LotItem;
  spotlightTimeFormatted: string;
  isWatchlisted: boolean;
  onToggleWatchlist: (lotId: string) => void;
  onPlaceBid: (lot: LotItem) => void;
  onViewLot: (lot: LotItem) => void;
}

export const Hero: React.FC<HeroProps> = ({
  spotlightLot,
  spotlightTimeFormatted,
  isWatchlisted,
  onToggleWatchlist,
  onPlaceBid,
  onViewLot
}) => {
  return (
    <section className="hero-section">
      <div className="hero-ambient-glow"></div>
      <div className="hero-container container-fluid">
        {/* Left Column: Hero Copy & Credentials */}
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
            <a href="#live-bidding" className="btn-gold-primary">
              <span>EXPLORE LIVE AUCTIONS</span>
              <ArrowRight size={18} />
            </a>

            <a href="#departments" className="btn-dark-outline">
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

        {/* Right Column: Spotlight Lot Card */}
        <div className="hero-right-column">
          <div className="spotlight-card">
            {/* Top Badges Header */}
            <div className="spotlight-card-header">
              <span className="badge-spotlight-lot">
                {spotlightLot.lotNumber} – SPOTLIGHT
              </span>
              <span className="badge-closing-today">
                <span className="pulse-dot-red"></span> CLOSING TODAY
              </span>
            </div>

            {/* Spotlight Image Container */}
            <div
              className="spotlight-image-wrap"
              onClick={() => onViewLot(spotlightLot)}
              title="Click to view high-resolution specimen"
            >
              <img
                src={spotlightLot.image}
                alt={spotlightLot.title}
                className="spotlight-img"
              />
              <div className="spotlight-image-hover-overlay">
                <Eye size={20} />
                <span>Inspect Specimen</span>
              </div>
            </div>

            {/* Spotlight Metadata & Description */}
            <div className="spotlight-content">
              <span className="spotlight-category-tag">
                {spotlightLot.categoryTag}
              </span>
              <h3
                className="spotlight-title"
                onClick={() => onViewLot(spotlightLot)}
              >
                {spotlightLot.title}
              </h3>
              <p className="spotlight-desc">
                {spotlightLot.description}
              </p>

              {/* Bidding Summary Box */}
              <div className="spotlight-bid-box">
                <div className="bid-box-col">
                  <span className="bid-label">CURRENT HIGH BID</span>
                  <span className="bid-amount">
                    ${spotlightLot.currentBid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="estimate-text">
                    Est. ${spotlightLot.estimateLow.toLocaleString()} – ${spotlightLot.estimateHigh.toLocaleString()}
                  </span>
                </div>

                <div className="bid-box-col right">
                  <span className="bid-label">TIME REMAINING</span>
                  <div className="time-remaining-value">
                    <Clock size={15} />
                    <span>{spotlightTimeFormatted}</span>
                  </div>
                  <span className="reserve-tag">
                    ✓ RESERVE MET
                  </span>
                </div>
              </div>

              {/* Spotlight Actions */}
              <div className="spotlight-actions">
                <button
                  className="btn-place-bid-gold"
                  onClick={() => onPlaceBid(spotlightLot)}
                >
                  <Zap size={18} />
                  <span>PLACE BID (${spotlightLot.nextBid.toLocaleString()})</span>
                </button>

                <button
                  className={`btn-watchlist-toggle ${isWatchlisted ? 'active' : ''}`}
                  onClick={() => onToggleWatchlist(spotlightLot.id)}
                  title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                  aria-label="Toggle Watchlist"
                >
                  <Bookmark size={20} fill={isWatchlisted ? "#cba135" : "none"} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
