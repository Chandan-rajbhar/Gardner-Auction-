import React, { useState } from 'react';
import { History, Shield } from 'lucide-react';
import type { BidRecord } from './types';

interface BidHistoryFeedProps {
  bids: BidRecord[];
  currentBid: number;
  totalBidsCount: number;
  lastAnimationTrigger: number;
}

export const BidHistoryFeed: React.FC<BidHistoryFeedProps> = ({
  bids,
  currentBid: _currentBid,
  totalBidsCount,
  lastAnimationTrigger
}) => {
  const [filter, setFilter] = useState<'all' | 'webcast' | 'floor' | 'phone'>('all');
  const [isFresh, setIsFresh] = useState<boolean>(false);

  React.useEffect(() => {
    if (lastAnimationTrigger > 0) {
      const animTimer = setTimeout(() => setIsFresh(true), 0);
      const resetTimer = setTimeout(() => setIsFresh(false), 2500);
      return () => {
        clearTimeout(animTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [lastAnimationTrigger]);

  const filteredBids = bids.filter((b) => {
    if (filter === 'all') return true;
    return b.origin === filter;
  });

  return (
    <div className="cap-history-card">
      {/* Feed Header */}
      <div className="cap-history-header">
        <div className="cap-history-title">
          <History size={15} className="cap-gold-icon" />
          <h4>LIVE FLOOR &amp; WEBCAST BID LEDGER</h4>
          <span className="cap-history-count-badge">
            ({totalBidsCount} BIDS TOTAL)
          </span>
        </div>

        {/* Channel Filter Pills */}
        <div className="cap-history-filters" role="tablist" aria-label="Filter bid history by origin">
          <button
            type="button"
            className={`cap-filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            ALL
          </button>
          <button
            type="button"
            className={`cap-filter-pill ${filter === 'floor' ? 'active' : ''}`}
            onClick={() => setFilter('floor')}
          >
            FLOOR
          </button>
          <button
            type="button"
            className={`cap-filter-pill ${filter === 'webcast' ? 'active' : ''}`}
            onClick={() => setFilter('webcast')}
          >
            WEBCAST
          </button>
          <button
            type="button"
            className={`cap-filter-pill ${filter === 'phone' ? 'active' : ''}`}
            onClick={() => setFilter('phone')}
          >
            PHONE
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="cap-history-list" role="log" aria-live="polite" aria-label="Chronological bid ledger">
        {filteredBids.length === 0 ? (
          <div className="cap-history-empty">
            <p>No bids found for selected channel filter.</p>
          </div>
        ) : (
          filteredBids.map((bid, index) => {
            const isTop = index === 0;
            const isFreshRow = isTop && isFresh;

            // Format origin label matching screenshot
            let originLabel = bid.origin.toUpperCase();
            if (bid.origin === 'phone') originLabel = 'PHONE DESK';
            if (bid.origin === 'absentee') originLabel = 'ABSENTEE APP';

            return (
              <div
                key={bid.id || `${bid.amount}-${index}`}
                className={`cap-history-row ${isTop ? 'leading-row' : ''} ${isFreshRow ? 'fresh-bid-pulse' : ''} ${bid.isCurrentUser ? 'user-bid-row' : ''}`}
              >
                {/* Left: Paddle, Origin Badge, Time */}
                <div className="cap-bid-left">
                  <span className="cap-bid-paddle">
                    {bid.bidderPaddle ? `Paddle ${bid.bidderPaddle}` : bid.bidderMasked}
                  </span>

                  <span className={`cap-origin-badge ${bid.origin}`}>
                    {originLabel}
                  </span>

                  <span className="cap-bid-time">
                    {bid.timestamp}
                  </span>
                </div>

                {/* Right: Status Pill & Amount */}
                <div className="cap-bid-right">
                  {isTop && (
                    <span className="cap-leading-badge">
                      <span>HIGH BID</span>
                    </span>
                  )}

                  <div className={`cap-bid-amount ${isTop ? 'gold-bold' : ''}`}>
                    ${bid.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Audit Notice with Live count indicator */}
      <div className="cap-history-footer">
        <div className="cap-history-audit-left">
          <Shield size={12} className="cap-gold-icon" />
          <span>Authoritative webcast auditing · 28-bit FIPS Timestamped</span>
        </div>
        <div className="cap-history-count-indicator">
          <span>Live {Math.min(filteredBids.length, 5)}/{totalBidsCount} Bids ⬇</span>
        </div>
      </div>
    </div>
  );
};
