import React from 'react';
import { RotateCw, Clock, Zap, CheckCircle2, Bookmark } from 'lucide-react';
import type { LotItem } from '../data/auctionData';

interface LiveBiddingDeskProps {
  lots: LotItem[];
  timers: Record<string, string>;
  watchlist: string[];
  onToggleWatchlist: (lotId: string) => void;
  onInstantBid: (lot: LotItem) => void;
  onViewLot: (lot: LotItem) => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export const LiveBiddingDesk: React.FC<LiveBiddingDeskProps> = ({
  lots,
  timers,
  watchlist,
  onToggleWatchlist,
  onInstantBid,
  onViewLot,
  onManualRefresh,
  isRefreshing
}) => {
  return (
    <section id="live-bidding" className="live-bidding-section">
      <div className="section-container container-fluid">
        {/* Section Header */}
        <div className="section-header-row">
          <div className="section-header-left">
            <div className="live-desk-badge-wrap">
              <span className="live-square-bullet">■</span>
              <span className="live-desk-label">REAL-TIME BIDDING DESK</span>
            </div>
            <h2 className="section-main-title">Closing Soon — Live Bidding</h2>
            <p className="section-subtitle">
              Lots currently experiencing active live bid extensions and competitive floor activity.
            </p>
          </div>

          <button
            className={`refresh-indicator-btn ${isRefreshing ? 'rotating' : ''}`}
            onClick={onManualRefresh}
            title="Refresh active bid feeds"
          >
            <span>Auto-refreshing every 15s</span>
            <RotateCw size={14} className="refresh-icon" />
          </button>
        </div>

        {/* 4 Lots Grid */}
        <div className="lots-grid">
          {lots.map((lot) => {
            const isWatchlisted = watchlist.includes(lot.id);
            const timeRemaining = timers[lot.id] || '00m 00s';

            return (
              <div key={lot.id} className="lot-card">
                {/* Lot Media Container */}
                <div className="lot-card-media" onClick={() => onViewLot(lot)}>
                  <img src={lot.image} alt={lot.title} className="lot-img" />
                  
                  {/* Overlay Badges */}
                  <div className="lot-badges-overlay">
                    <span className="lot-number-badge">
                      {lot.lotNumber}
                    </span>
                    <span className="lot-timer-badge">
                      <Clock size={12} />
                      <span>{timeRemaining}</span>
                    </span>
                  </div>

                  {/* Bookmark quick button */}
                  <button
                    className={`lot-card-bookmark-btn ${isWatchlisted ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(lot.id);
                    }}
                    title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                    aria-label="Bookmark Lot"
                  >
                    <Bookmark size={15} fill={isWatchlisted ? "#cba135" : "none"} />
                  </button>
                </div>

                {/* Lot Body Info */}
                <div className="lot-card-body">
                  <span className="lot-category-tag">
                    {lot.categoryTag}
                  </span>

                  <h3 className="lot-title" onClick={() => onViewLot(lot)}>
                    {lot.title}
                  </h3>

                  <p className="lot-brief-note">
                    {lot.description}
                  </p>

                  {/* Pricing & Bid Status */}
                  <div className="lot-bid-details">
                    <div className="bid-data-row">
                      <div className="current-bid-wrap">
                        <span className="bid-label-micro">CURRENT BID</span>
                        <span className="current-bid-val">
                          ${lot.currentBid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="reserve-wrap">
                        <span className="reserve-met-badge">
                          <CheckCircle2 size={11} /> RESERVE MET
                        </span>
                      </div>
                    </div>

                    <div className="bids-count-meta">
                      <span>{lot.bidsCount} Bids Placed</span>
                    </div>
                  </div>

                  {/* Instant Bid Action Button */}
                  <button
                    className="btn-instant-bid"
                    onClick={() => onInstantBid(lot)}
                  >
                    <Zap size={15} />
                    <span>⚡ INSTANT BID ${lot.nextBid.toLocaleString()}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
