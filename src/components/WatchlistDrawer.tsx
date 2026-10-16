import React from 'react';
import { X, Trash2, Zap, ArrowRight, Bookmark } from 'lucide-react';
import type { LotItem } from '../data/auctionData';

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistLots: LotItem[];
  timers: Record<string, string>;
  onRemoveFromWatchlist: (lotId: string) => void;
  onPlaceBid: (lot: LotItem) => void;
  onViewLot: (lot: LotItem) => void;
}

export const WatchlistDrawer: React.FC<WatchlistDrawerProps> = ({
  isOpen,
  onClose,
  watchlistLots,
  timers,
  onRemoveFromWatchlist,
  onPlaceBid,
  onViewLot
}) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <Bookmark size={20} className="gold-icon" />
            <h3>Your Watchlist &amp; Registered Paddles</h3>
            <span className="drawer-count-tag">{watchlistLots.length} Lots</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close watchlist">
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {watchlistLots.length === 0 ? (
            <div className="drawer-empty-state">
              <Bookmark size={40} className="empty-icon" />
              <h4>Your Watchlist is Empty</h4>
              <p>Click the bookmark icon on any lot across our auctions to monitor real-time bids and closing countdowns.</p>
            </div>
          ) : (
            <div className="drawer-lots-list">
              {watchlistLots.map((lot) => {
                const timeRemaining = timers[lot.id] || 'Closing Soon';

                return (
                  <div key={lot.id} className="drawer-lot-card">
                    <img
                      src={lot.image}
                      alt={lot.title}
                      className="drawer-lot-thumb"
                      onClick={() => onViewLot(lot)}
                    />
                    <div className="drawer-lot-info">
                      <div className="drawer-lot-meta">
                        <span className="drawer-lot-num">{lot.lotNumber}</span>
                        <span className="drawer-lot-timer">{timeRemaining}</span>
                      </div>
                      <h4
                        className="drawer-lot-title"
                        onClick={() => onViewLot(lot)}
                      >
                        {lot.title}
                      </h4>
                      <div className="drawer-bid-pricing">
                        <span>Current: <strong>${lot.currentBid.toLocaleString()}</strong></span>
                      </div>
                      <div className="drawer-card-actions">
                        <button
                          className="drawer-bid-btn"
                          onClick={() => {
                            onClose();
                            onPlaceBid(lot);
                          }}
                        >
                          <Zap size={14} /> Bid ${lot.nextBid.toLocaleString()}
                        </button>
                        <button
                          className="drawer-remove-btn"
                          onClick={() => onRemoveFromWatchlist(lot.id)}
                          title="Remove from watchlist"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {watchlistLots.length > 0 && (
          <div className="drawer-footer">
            <a href="#live-bidding" className="btn-gold-primary full-w" onClick={onClose}>
              <span>EXPLORE ALL LIVE LOTS</span>
              <ArrowRight size={16} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
