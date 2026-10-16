import React, { useState } from 'react';
import {
  Zap,
  Clock,
  Volume2,
  VolumeX,
  Bookmark,
  Share2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { EnrichedLotItem, SettlementBreakdown } from './types';

interface LiveBiddingPanelProps {
  lot: EnrichedLotItem;
  secondsRemaining: number;
  timeFormatted: string;
  isUrgent: boolean;
  isCritical: boolean;
  isClosed: boolean;
  viewerCount: number;
  userIsLeading: boolean;
  isSubmittingBid: boolean;
  bidError: string | null;
  settlement: SettlementBreakdown;
  calculateSettlement: (hammerAmount: number) => SettlementBreakdown;
  onOpenConfirmModal: (amount: number, isProxy?: boolean) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: () => void;
  onShareLot: () => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
  lastAnimationTrigger: number;
}

export const LiveBiddingPanel: React.FC<LiveBiddingPanelProps> = ({
  lot,
  secondsRemaining: _secondsRemaining,
  timeFormatted,
  isUrgent,
  isCritical,
  isClosed,
  viewerCount,
  userIsLeading,
  isSubmittingBid,
  bidError,
  calculateSettlement: _calculateSettlement,
  onOpenConfirmModal,
  isWatchlisted,
  onToggleWatchlist,
  onShareLot,
  isSoundMuted,
  onToggleSound,
  lastAnimationTrigger
}) => {
  // State tracking for lot changes
  const [prevLotId, setPrevLotId] = useState<string>(lot.id);
  const [prevNextBid, setPrevNextBid] = useState<number>(lot.nextBid);
  const [customBid, setCustomBid] = useState<string>(lot.nextBid.toString());
  const [inputError, setInputError] = useState<string | null>(null);
  const [isFreshPrice, setIsFreshPrice] = useState<boolean>(false);

  // Synchronize state when lot or nextBid changes during render
  if (lot.id !== prevLotId || lot.nextBid !== prevNextBid) {
    setPrevLotId(lot.id);
    setPrevNextBid(lot.nextBid);
    setCustomBid(lot.nextBid.toString());
    setInputError(null);
  }

  // Animation trigger effect
  React.useEffect(() => {
    if (lastAnimationTrigger > 0) {
      const animTimer = setTimeout(() => setIsFreshPrice(true), 0);
      const resetTimer = setTimeout(() => setIsFreshPrice(false), 2500);
      return () => {
        clearTimeout(animTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [lastAnimationTrigger]);

  // Quick bid buttons matching screenshot exactly:
  // 1: Next Minimum Bid ($6,500)
  // 2: +$300 Increment ($6,800)
  // 3: +$600 Advance ($7,100)
  // 4: Jump to Estimate ($8,000)
  const quickIncrements = [
    { label: 'NEXT MINIMUM BID', amount: lot.nextBid },
    { label: `+$${(lot.bidIncrement).toLocaleString()} INCREMENT`, amount: lot.nextBid + lot.bidIncrement },
    { label: `+$${(lot.bidIncrement * 2).toLocaleString()} ADVANCE`, amount: lot.nextBid + lot.bidIncrement * 2 },
    { label: 'JUMP TO ESTIMATE', amount: Math.max(lot.estimateLow, lot.nextBid + lot.bidIncrement * 5) }
  ];

  const parsedCustomBid = parseFloat(customBid) || 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setCustomBid(raw);
    const num = parseFloat(raw) || 0;
    if (num < lot.nextBid) {
      setInputError(`Minimum next bid is $${lot.nextBid.toLocaleString()}`);
    } else {
      setInputError(null);
    }
  };

  const handleQuickSelect = (amt: number) => {
    setCustomBid(amt.toString());
    setInputError(null);
  };

  const handleSubmitBid = (isProxy = false) => {
    const num = parseFloat(customBid) || 0;
    if (num < lot.nextBid) {
      setInputError(`Minimum acceptable bid is $${lot.nextBid.toLocaleString()}`);
      return;
    }
    setInputError(null);
    onOpenConfirmModal(num, isProxy);
  };

  // Two steps past calculation
  const twoStepsPast = Math.max(lot.startingBid, lot.currentBid - lot.bidIncrement);

  return (
    <aside className="cap-bid-panel" aria-label="Live Bidding Panel">
      {/* Panel Top Utilities: Live Viewers, Audio, Share, Watchlist */}
      <div className="cap-panel-meta-bar">
        <div className="cap-viewers-badge" title="Live authenticated terminals and room attendees">
          <span className="cap-viewer-pulse-dot"></span>
          <span className="cap-viewers-text">
            <strong>{viewerCount} ACTIVE BIDDERS</strong> Floor &amp; Webcast
          </span>
        </div>

        <div className="cap-panel-controls">
          <button
            type="button"
            className="cap-icon-btn"
            onClick={onToggleSound}
            title={isSoundMuted ? 'Unmute auction floor audio chimes' : 'Mute auction floor audio chimes'}
            aria-label={isSoundMuted ? 'Unmute auction chimes' : 'Mute auction chimes'}
          >
            {isSoundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            className="cap-icon-btn"
            onClick={onShareLot}
            title="Share this lot link"
            aria-label="Share lot link"
          >
            <Share2 size={15} />
          </button>

          <button
            type="button"
            className={`cap-icon-btn ${isWatchlisted ? 'bookmarked' : ''}`}
            onClick={onToggleWatchlist}
            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Bookmark size={15} fill={isWatchlisted ? '#cba135' : 'none'} />
          </button>
        </div>
      </div>

      {/* Authoritative Live Countdown Clock */}
      <div className={`cap-countdown-card ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''} ${isClosed ? 'closed' : ''}`}>
        <div className="cap-countdown-header">
          <div className="cap-countdown-label-group">
            <Clock size={13} className={isCritical ? 'pulse-icon' : ''} />
            <span className="cap-countdown-label">
              FLOOR 4S COUNTDOWN — EST / NEW YORK
            </span>
          </div>
        </div>

        <div className="cap-countdown-digits" aria-live="off">
          {timeFormatted}
        </div>

        <div className="cap-closing-details">
          <ShieldCheck size={12} className="cap-gold-icon" />
          <span>2S AUTO-EXTEND ACTIVE: Bids within 2mins extend clock by 2mins</span>
        </div>
      </div>

      {/* Leading Bidder Live Banner */}
      {userIsLeading && !isClosed && (
        <div className="cap-user-winning-banner" role="alert">
          <CheckCircle2 size={15} className="cap-green-icon" />
          <span>You are currently the high bidder on this lot!</span>
        </div>
      )}

      {/* Main Pricing Box */}
      <div className="cap-pricing-box">
        <div className="cap-price-top-row">
          <div className="cap-price-meta-col">
            <span className="cap-micro-label">CURRENT RECOGNIZED HIGH BID</span>
            <div className={`cap-price-display ${isFreshPrice ? 'pulse-gold' : ''}`}>
              <span className="cap-price-number">${lot.currentBid.toLocaleString()}</span>
              <span className="cap-currency-symbol">USD</span>
            </div>
          </div>

          <div className="cap-reserve-col">
            <span className="cap-reserve-met-pill">
              <Zap size={11} /> RESERVE MET
            </span>
            <span className="cap-bids-count-pill">{lot.bidsCount} Confirmed Bids</span>
          </div>
        </div>

        <div className="cap-price-sub-row">
          <div className="cap-sub-stat">
            <span className="cap-sub-label">TWO STEPS PAST</span>
            <span className="cap-sub-val">${twoStepsPast.toLocaleString()}</span>
          </div>
          <div className="cap-sub-stat">
            <span className="cap-sub-label">SPECULATIVE ESTIMATE</span>
            <span className="cap-sub-val">${lot.estimateLow.toLocaleString()} - ${lot.estimateHigh.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* One-Touch Quick Presets */}
      {!isClosed ? (
        <div className="cap-quick-bids-section">
          <div className="cap-presets-header">
            <span>OR ONE-TOUCH QUICK PRESETS</span>
          </div>
          <div className="cap-quick-grid">
            {quickIncrements.map((btn, i) => (
              <button
                key={i}
                type="button"
                className={`cap-quick-btn ${parsedCustomBid === btn.amount ? 'active' : ''}`}
                onClick={() => handleQuickSelect(btn.amount)}
              >
                <span className="cap-quick-amt">${btn.amount.toLocaleString()}</span>
                <span className="cap-quick-sub">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Custom Bid Input & Actions */}
      {!isClosed ? (
        <div className="cap-bid-input-section">
          <label htmlFor="custom-bid-input" className="cap-section-subtitle">
            CEILING OR OFF-LADDER BID (MIN. ${lot.nextBid.toLocaleString()})
          </label>

          <div className="cap-input-submit-row">
            <div className="cap-input-wrapper">
              <span className="cap-input-prefix">$</span>
              <input
                id="custom-bid-input"
                type="text"
                inputMode="numeric"
                className={`cap-bid-input ${inputError ? 'has-error' : ''}`}
                value={customBid ? parseInt(customBid, 10).toLocaleString() : ''}
                onChange={handleInputChange}
                placeholder={lot.nextBid.toLocaleString()}
                disabled={isSubmittingBid}
              />
            </div>

            <button
              type="button"
              className="cap-btn-submit-gold"
              onClick={() => handleSubmitBid(false)}
              disabled={isSubmittingBid || Boolean(inputError)}
            >
              <span>{isSubmittingBid ? 'SUBMITTING...' : 'SUBMIT BID'}</span>
            </button>
          </div>

          {inputError && (
            <div className="cap-input-error-msg" role="alert">
              <AlertCircle size={13} />
              <span>{inputError}</span>
            </div>
          )}

          {bidError && (
            <div className="cap-bid-server-error" role="alert">
              <AlertCircle size={13} />
              <span>{bidError}</span>
            </div>
          )}
        </div>
      ) : (
        /* Closed State Banner */
        <div className="cap-panel-closed-notice">
          <Clock size={20} className="cap-gold-icon" />
          <h4>Bidding Closed for this Lot</h4>
          <p>This lot has ended. Final hammer price: <strong>${lot.currentBid.toLocaleString()}</strong>.</p>
        </div>
      )}
    </aside>
  );
};
