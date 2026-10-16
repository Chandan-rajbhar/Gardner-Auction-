import React from 'react';
import { Clock, CheckCircle2, Zap, LayoutGrid, Eye, Bookmark } from 'lucide-react';
import type { EnrichedLotItem } from './types';

interface SessionLotsCardGridProps {
  lots: EnrichedLotItem[];
  selectedLotId: string;
  onSelectLot: (lotId: string) => void;
  watchlist: string[];
  onToggleWatchlist: (lotId: string) => void;
}

export const SessionLotsCardGrid: React.FC<SessionLotsCardGridProps> = ({
  lots,
  selectedLotId,
  onSelectLot,
  watchlist,
  onToggleWatchlist
}) => {
  const handleLotClick = (lotId: string) => {
    onSelectLot(lotId);
    const el = document.getElementById('cap-live-workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="cap-session-catalog-section" aria-label="Session 1 Catalog Lots">
      <div className="cap-catalog-header-row">
        <div className="cap-catalog-header-left">
          <div className="cap-catalog-badge">
            <span className="cap-gold-bullet">■</span>
            <span className="cap-catalog-badge-text">SESSION 1 LIVE CATALOG</span>
          </div>
          <h2 className="cap-catalog-main-title">
            All Lots in Current Session ({lots.length} Lots Available)
          </h2>
          <p className="cap-catalog-subtitle">
            Browse all lots in this live session. Click any lot card to inspect specimens, view real-time charts, or participate in live floor bidding.
          </p>
        </div>

        <div className="cap-catalog-header-right">
          <div className="cap-catalog-stat-pill">
            <LayoutGrid size={14} className="cap-gold-icon" />
            <span>{lots.length} Certified Catalog Lots</span>
          </div>
        </div>
      </div>

      {/* Grid of Full Lot Cards */}
      <div className="cap-catalog-cards-grid">
        {lots.map((lot) => {
          const isSelected = lot.id === selectedLotId;
          const isWatchlisted = watchlist.includes(lot.id);
          const thumb = lot.images[0]?.url || '/images/hero_coin.jpg';

          return (
            <div
              key={lot.id}
              className={`cap-catalog-lot-card ${isSelected ? 'is-active-on-block' : ''}`}
              onClick={() => handleLotClick(lot.id)}
            >
              {/* Media Stage */}
              <div className="cap-card-media-wrap">
                <img src={thumb} alt={lot.title} className="cap-card-img" />

                {/* Overlay Badges */}
                <div className="cap-card-overlay-badges">
                  <span className="cap-card-lot-badge">
                    {lot.lotNumber}
                  </span>

                  <span className="cap-card-timer-badge">
                    <Clock size={11} />
                    <span>{lot.isClosed ? 'CLOSED' : `${Math.floor(lot.timeRemainingSeconds / 60)}m left`}</span>
                  </span>
                </div>

                {/* Active Indicator Badge if currently loaded in the live desk */}
                {isSelected && (
                  <div className="cap-card-active-flag">
                    <span className="cap-active-dot"></span>
                    <span>ACTIVE ON LIVE BLOCK</span>
                  </div>
                )}

                {/* Bookmark quick button */}
                <button
                  type="button"
                  className={`cap-card-bookmark-btn ${isWatchlisted ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(lot.id);
                  }}
                  title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  aria-label="Bookmark Lot"
                >
                  <Bookmark size={14} fill={isWatchlisted ? '#cba135' : 'none'} />
                </button>
              </div>

              {/* Card Body */}
              <div className="cap-card-body">
                <span className="cap-card-category">{lot.categoryTag}</span>
                <h3 className="cap-card-title">{lot.title}</h3>
                <p className="cap-card-desc">{lot.description}</p>

                {/* Bidding Information */}
                <div className="cap-card-bid-row">
                  <div className="cap-card-bid-col">
                    <span className="cap-card-bid-label">CURRENT BID</span>
                    <span className="cap-card-bid-val">${lot.currentBid.toLocaleString()}</span>
                  </div>

                  <div className="cap-card-reserve-col">
                    {lot.reserveMet ? (
                      <span className="cap-card-reserve-badge met">
                        <CheckCircle2 size={11} /> RESERVE MET
                      </span>
                    ) : (
                      <span className="cap-card-reserve-badge unmet">
                        RESERVE NOT MET
                      </span>
                    )}
                    <span className="cap-card-bids-count">{lot.bidsCount} Bids</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="cap-card-action-wrap">
                  {isSelected ? (
                    <button
                      type="button"
                      className="cap-btn-card-active"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLotClick(lot.id);
                      }}
                    >
                      <Eye size={14} />
                      <span>CURRENTLY ACTIVE ABOVE</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cap-btn-card-bid"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLotClick(lot.id);
                      }}
                    >
                      <Zap size={14} />
                      <span>BID LIVE (${lot.nextBid.toLocaleString()})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
