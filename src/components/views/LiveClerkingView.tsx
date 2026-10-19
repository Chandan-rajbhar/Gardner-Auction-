import React, { useState, useEffect, useRef } from 'react';
import { LotItem, LiveBid, UserBidder, ClerkingState } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { 
  getStandardBidIncrement, 
  getNextValidBid, 
  getQuickIncrementOptions, 
  calculateReserveStatus, 
  validateProposedBid 
} from '../../utils/biddingRules';
import { 
  Gavel, 
  Radio, 
  Flame, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  ShieldAlert,
  Clock,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  UserCheck,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface LiveClerkingViewProps {
  currentLot: LotItem | undefined;
  allLots?: LotItem[];
  bids: LiveBid[];
  allBids?: LiveBid[];
  bidders: UserBidder[];
  onPlaceBid: (amount: number, paddleNumber: string, bidderName: string, source: LiveBid['source']) => void;
  onHammerSold: (lotId: string, finalAmount: number, paddleNumber: string, overrideReserve?: boolean) => void;
  onPassLot: (lotId: string, reason?: string) => void;
  onReopenLot?: (lotId: string) => void;
  onNextLot: () => void;
  onSelectLot?: (lotId: string) => void;
}

export const LiveClerkingView: React.FC<LiveClerkingViewProps> = ({
  currentLot,
  allLots = [],
  bids,
  allBids = [],
  bidders,
  onPlaceBid,
  onHammerSold,
  onPassLot,
  onReopenLot,
  onNextLot,
  onSelectLot
}) => {
  // --- Clerking Lifecycle State Machine ---
  const [clerkingState, setClerkingState] = useState<ClerkingState>('READY');
  const [previousActiveState, setPreviousActiveState] = useState<ClerkingState>('LIVE');
  const [countdown, setCountdown] = useState<number>(30);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  
  // --- Bidding Inputs ---
  const [selectedPaddle, setSelectedPaddle] = useState<string>('104');
  const [selectedSource, setSelectedSource] = useState<LiveBid['source']>('Floor');
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // --- Modals ---
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isUnresolvedModalOpen, setIsUnresolvedModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  // --- Form & Override Controls ---
  const [reserveOverrideConfirmed, setReserveOverrideConfirmed] = useState(false);
  const [passReason, setPassReason] = useState<string>('Reserve Not Met');
  const [passNotes, setPassNotes] = useState<string>('');
  const [soldFanfare, setSoldFanfare] = useState(false);

  // Track current lot ID to reset state when a new lot is mounted
  const currentLotIdRef = useRef<string | null>(null);

  // --- Synthesize Authentic Wooden Gavel Sound ---
  const playGavelStrike = () => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Impact primary transient
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(160, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0.9, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      // Sounding board echo
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(95, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.22);
          gain2.gain.setValueAtTime(0.4, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.25);
        } catch {}
      }, 35);
    } catch {}
  };

  // --- Sync clerking state when currentLot changes ---
  useEffect(() => {
    if (!currentLot) return;

    if (currentLotIdRef.current !== currentLot.id) {
      currentLotIdRef.current = currentLot.id;
      // Reset lot-specific temporary form values
      setCustomBidAmount('');
      setValidationError(null);
      setStatusNotification(null);
      setIsSoldModalOpen(false);
      setIsPassModalOpen(false);
      setIsUnresolvedModalOpen(false);
      setIsReopenModalOpen(false);
      setReserveOverrideConfirmed(false);
      setSoldFanfare(false);

      // Determine initial lifecycle state
      if (currentLot.status === 'sold') {
        setClerkingState('SOLD');
      } else if (currentLot.status === 'passed') {
        setClerkingState('UNSOLD');
      } else {
        // If lot already has bids or was on block
        if (currentLot.bidsCount > 0 || currentLot.currentBid > currentLot.startingBid) {
          setClerkingState('LIVE');
          setCountdown(30);
        } else {
          setClerkingState('READY');
          setCountdown(30);
        }
      }

      // Pre-select high bidder or first verified bidder
      if (currentLot.highBidderPaddle) {
        setSelectedPaddle(currentLot.highBidderPaddle);
      } else {
        setSelectedPaddle(bidders[0]?.paddleNumber || '104');
      }
    }
  }, [currentLot?.id, currentLot?.status]);

  // --- Cadence Countdown Timer ---
  useEffect(() => {
    if (clerkingState === 'PAUSED' || clerkingState === 'SOLD' || clerkingState === 'UNSOLD') {
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // If in Going Twice, auto-hold on 0s
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [clerkingState]);

  if (!currentLot) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <Gavel size={54} color="var(--gold-primary)" style={{ margin: '0 auto 16px' }} />
        <h3 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)', marginBottom: 8, fontWeight: 700 }}>
          No Active Lot on the Rostrum Block
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 460, margin: '0 auto 24px' }}>
          All previous lots have been settled or cataloging is in session. Select an upcoming catalog lot to open rostrum bidding.
        </p>
        <button className="btn btn-gold" onClick={onNextLot} style={{ padding: '12px 24px', fontSize: 14 }}>
          Load Next Upcoming Catalog Lot <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // --- Computations for Active Lot ---
  const currentHigh = currentLot.currentBid;
  const reserveInfo = calculateReserveStatus(currentHigh, currentLot.reservePrice);
  const minIncrement = getStandardBidIncrement(currentHigh);
  const nextValidBid = getNextValidBid(currentHigh);
  const quickOptions = getQuickIncrementOptions(currentHigh);

  // Selected Bidder profile
  const selectedBidder = bidders.find(b => b.paddleNumber === selectedPaddle) || bidders[0];
  const hasApprovedLimit = selectedBidder && selectedBidder.bidLimit > 0;
  const remainingLimit = hasApprovedLimit ? selectedBidder.bidLimit - (selectedBidder.totalSpent || 0) : 0;
  const isSelectedBidderExceeding = hasApprovedLimit && nextValidBid > selectedBidder.bidLimit;

  // Active lot winning bidder source
  const lastWinningBid = bids.find(b => b.isWinning) || bids[0];
  const highBidSource: LiveBid['source'] = lastWinningBid?.source || 'Floor';

  // Count remaining upcoming lots and upcoming lot reference
  const currentIndex = allLots.findIndex(l => l.id === currentLot.id);
  const upcomingLot = (currentIndex !== -1 && allLots[currentIndex + 1]) || 
                      allLots.find(l => l.status === 'upcoming' && l.id !== currentLot.id) ||
                      allLots.find(l => l.id !== currentLot.id);
  const remainingUpcomingCount = allLots.filter(l => l.status === 'upcoming' && l.id !== currentLot.id).length;

  // --- Handlers: Placing Bids ---
  const handleExecuteBid = (amount: number, paddleNum: string, source: LiveBid['source']) => {
    setValidationError(null);
    setStatusNotification(null);

    const bidder = bidders.find(b => b.paddleNumber === paddleNum) || selectedBidder;

    // Validate bid with full business logic engine
    const check = validateProposedBid({
      proposedBid: amount,
      currentBid: currentHigh,
      clerkingState,
      selectedPaddle: paddleNum,
      currentHighPaddle: currentLot.highBidderPaddle,
      bidderLimit: bidder?.bidLimit,
      bidderName: bidder?.name
    });

    if (!check.isValid) {
      setValidationError(check.error || 'Invalid bid.');
      return;
    }

    // Valid bid placed!
    onPlaceBid(amount, bidder.paddleNumber, bidder.name, source);
    playGavelStrike();

    // Reset calling sequence back to LIVE per requirement:
    // "A new valid bid during the calling sequence should return the lot to LIVE and reset the calling sequence."
    if (clerkingState === 'GOING_ONCE' || clerkingState === 'GOING_TWICE' || clerkingState === 'READY') {
      setStatusNotification(`Bid of ${formatCurrency(amount)} accepted from Paddle #${paddleNum}! Calling sequence reset to LIVE.`);
      setTimeout(() => setStatusNotification(null), 4000);
    }

    setClerkingState('LIVE');
    setCountdown(30);
    setCustomBidAmount('');
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customBidAmount.replace(/[^0-9.]/g, ''));
    if (!val) {
      setValidationError('Please enter a valid numeric bid amount.');
      return;
    }
    handleExecuteBid(val, selectedPaddle, selectedSource);
  };

  // --- Handlers: Calling Sequence State Machine ---
  const handleGoingOnce = () => {
    if (clerkingState === 'PAUSED' || clerkingState === 'SOLD' || clerkingState === 'UNSOLD') return;
    setClerkingState('GOING_ONCE');
    setCountdown(15);
    setValidationError(null);
    setStatusNotification(`Lot #${currentLot.lotNumber} is GOING ONCE at ${formatCurrency(currentHigh)}.`);
  };

  const handleGoingTwice = () => {
    // Only enabled after Going Once per requirement: "Enable only after Going Once"
    if (clerkingState !== 'GOING_ONCE') return;
    setClerkingState('GOING_TWICE');
    setCountdown(10);
    setValidationError(null);
    setStatusNotification(`FAIR WARNING! Lot #${currentLot.lotNumber} is GOING TWICE at ${formatCurrency(currentHigh)}.`);
  };

  const handleTogglePause = () => {
    if (clerkingState === 'PAUSED') {
      // Resume
      setClerkingState(previousActiveState);
      setStatusNotification('Auction rostrum resumed.');
    } else {
      // Pause
      setPreviousActiveState(clerkingState);
      setClerkingState('PAUSED');
      setStatusNotification('Auction rostrum is PAUSED. Bidding is suspended.');
    }
  };

  // --- Handlers: Hammer Down / Sold ---
  const openHammerSoldDialog = () => {
    setValidationError(null);
    // Validation: Do not mark as SOLD if there is no valid winning bid
    if (currentHigh <= 0 || !currentLot.highBidderPaddle) {
      setValidationError('Cannot mark lot as SOLD: No valid winning bid has been recorded on this lot.');
      return;
    }
    setIsSoldModalOpen(true);
  };

  const handleConfirmSold = () => {
    // Check reserve enforcement
    if (reserveInfo.status === 'not_met' && !reserveOverrideConfirmed) {
      setValidationError('Selling below reserve requires checking the Authorized Reserve Override box.');
      return;
    }

    playGavelStrike();
    setSoldFanfare(true);
    setIsSoldModalOpen(false);

    // Finalize sale exactly once
    setClerkingState('SOLD');
    onHammerSold(
      currentLot.id,
      currentHigh,
      currentLot.highBidderPaddle || selectedPaddle,
      reserveOverrideConfirmed
    );

    setTimeout(() => {
      setSoldFanfare(false);
    }, 2000);
  };

  // --- Handlers: Pass / Unsold ---
  const openPassLotDialog = () => {
    setValidationError(null);
    setIsPassModalOpen(true);
  };

  const handleConfirmPass = () => {
    setIsPassModalOpen(false);
    setClerkingState('UNSOLD');
    onPassLot(currentLot.id, passReason);
  };

  // --- Handlers: Next Catalog Lot ---
  const handleNextLotClick = () => {
    setValidationError(null);
    // If lot is currently in active bidding (READY, LIVE, GOING_ONCE, GOING_TWICE, PAUSED)
    if (clerkingState === 'LIVE' || clerkingState === 'GOING_ONCE' || clerkingState === 'GOING_TWICE' || clerkingState === 'PAUSED') {
      setIsUnresolvedModalOpen(true);
      return;
    }

    onNextLot();
  };

  const handleForceAdvanceWithPass = () => {
    setIsUnresolvedModalOpen(false);
    onPassLot(currentLot.id, 'Unresolved rostrum advance');
    onNextLot();
  };

  const handleForceAdvanceKeepUpcoming = () => {
    setIsUnresolvedModalOpen(false);
    onNextLot();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status or reset notification banner */}
      {statusNotification && (
        <div style={{ background: '#fefce8', border: '1px solid #fde047', color: '#b45309', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-xs)' }}>
          <Sparkles size={16} />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Validation alert banner */}
      {validationError && (
        <div className="validation-alert-banner">
          <AlertCircle size={17} />
          <span>{validationError}</span>
          <button 
            onClick={() => setValidationError(null)} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* =======================================================================
          MAIN CONSOLE LAYOUT: AUTHENTIC 3-STEP AF360 CLERKING ROSTRUM
          ======================================================================= */}
      <div className="clerking-layout-grid">
        {/* Left Column: 3 Primary Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
          
          {/* Sold Fanfare Overlay */}
          {soldFanfare && (
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(217, 119, 6, 0.96)', 
              borderRadius: 'var(--radius-lg)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 50,
              color: '#ffffff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)'
            }}>
              <Gavel size={68} />
              <h2 className="font-serif" style={{ fontSize: 36, marginTop: 14, letterSpacing: 1.5, fontWeight: 800 }}>SOLD! HAMMER DOWN</h2>
              <p style={{ fontSize: 20, fontFamily: 'var(--font-mono)', marginTop: 8 }}>
                {formatCurrency(currentHigh)} to Paddle #{currentLot.highBidderPaddle || selectedPaddle}
              </p>
              <span style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>Invoice generated in Settlement Console</span>
            </div>
          )}

          {/* CARD 1: ACTIVE LOT HERO CARD */}
          <div className="clerking-lot-hero-card">
            <div className="clerking-hero-top-row">
              <span className="clerking-hero-item-pill">
                ITEM #{currentLot.lotNumber}
              </span>
            </div>

            <div className="clerking-hero-body-row">
              <div className="clerking-hero-thumbnail">
                <img src={currentLot.image} alt={currentLot.title} />
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--gold-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span>{currentLot.category} • {currentLot.certification} {currentLot.grade}</span>
                </div>

                <h2 className="font-serif" style={{ fontSize: 21, color: 'var(--text-main)', margin: '4px 0 8px', fontWeight: 700 }}>
                  {currentLot.title}
                </h2>

                <div className="clerking-hero-meta-row">
                  <span>Started at <strong>{formatCurrency(currentLot.startingBid)}</strong></span>
                  <span>•</span>
                  <span>Total Bids placed: <strong>{bids.length} Bids</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: CURRENT HIGHEST BID BANNER */}
          <div className="current-bid-banner-hero" style={{ 
            background: clerkingState === 'GOING_TWICE' ? 'linear-gradient(135deg, #881337 0%, #1e1b4b 100%)' :
                        clerkingState === 'GOING_ONCE' ? 'linear-gradient(135deg, #78350f 0%, #0f172a 100%)' :
                        clerkingState === 'SOLD' ? 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)' :
                        'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          }}>
            <div className="top-badge">
              💡 CURRENT HIGHEST BID
            </div>

            <div className="big-val">
              {formatCurrency(currentHigh)}
            </div>

            <div className="bottom-bidder-row">
              <span>Leading Bidder</span>
              <span className="bidder-pill">
                👤 {currentLot.highBidderName || selectedBidder.name} (Bidder #{currentLot.highBidderPaddle || selectedPaddle})
              </span>
              <span style={{ opacity: 0.85 }}>bidding via {highBidSource.toLowerCase()}</span>
            </div>
          </div>

          {/* ROSTRUM CALLING & SALE CONTROLS (Gardner Auction Luxury Theme) */}
          <div className="rostrum-console-card">
            <div className="rostrum-console-header">
              <div>
                <div className="rostrum-console-title">
                  <Gavel size={16} color="var(--gold-primary)" />
                  <span>Auction Rostrum Controls</span>
                </div>
                <div className="rostrum-console-subtitle">
                  Monitor live website bidding, issue warnings, and finalize the gavel knock-down.
                </div>
              </div>

              <span className="rostrum-status-pill" style={{ 
                background: clerkingState === 'LIVE' ? '#ecfdf5' : clerkingState === 'GOING_ONCE' ? '#fefce8' : clerkingState === 'GOING_TWICE' ? '#fff7ed' : clerkingState === 'PAUSED' ? '#f1f5f9' : '#ecfdf5',
                color: clerkingState === 'LIVE' ? '#047857' : clerkingState === 'GOING_ONCE' ? '#b45309' : clerkingState === 'GOING_TWICE' ? '#c2410c' : clerkingState === 'PAUSED' ? '#475569' : '#047857',
                border: `1px solid ${clerkingState === 'LIVE' ? '#a7f3d0' : clerkingState === 'GOING_ONCE' ? '#fde047' : clerkingState === 'GOING_TWICE' ? '#fed7aa' : clerkingState === 'PAUSED' ? '#cbd5e1' : '#a7f3d0'}`
              }}>
                ● {clerkingState === 'LIVE' ? 'Bidding Open' : clerkingState === 'GOING_ONCE' ? 'Going Once' : clerkingState === 'GOING_TWICE' ? 'Going Twice (Final)' : clerkingState === 'PAUSED' ? 'Paused' : clerkingState === 'SOLD' ? 'Sold' : clerkingState}
              </span>
            </div>

            <div className="rostrum-actions-grid">
              {/* 1. Going Once */}
              <button 
                type="button"
                className={`rostrum-call-btn once ${clerkingState === 'GOING_ONCE' ? 'active' : ''}`} 
                onClick={handleGoingOnce} 
                disabled={clerkingState === 'GOING_ONCE' || clerkingState === 'GOING_TWICE' || clerkingState === 'SOLD' || clerkingState === 'UNSOLD' || clerkingState === 'PAUSED'}
                title="Move lot to Going Once calling stage"
              >
                <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  GOING ONCE...
                </span>
                <span style={{ fontSize: 11.5, opacity: 0.85 }}>Start warning online bidders</span>
              </button>

              {/* 2. Going Twice */}
              <button 
                type="button"
                className={`rostrum-call-btn twice ${clerkingState === 'GOING_TWICE' ? 'active' : ''}`} 
                onClick={handleGoingTwice} 
                disabled={clerkingState !== 'GOING_ONCE'}
                title={clerkingState === 'GOING_ONCE' ? 'Advance to Going Twice (Fair Warning)' : 'Enable only after Going Once'}
              >
                <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  GOING TWICE...
                </span>
                <span style={{ fontSize: 11.5, opacity: 0.85 }}>Last chance notice</span>
              </button>

              {/* 3. Sold / Hammer Down */}
              <button 
                type="button"
                className="rostrum-call-btn sold" 
                onClick={openHammerSoldDialog} 
                disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD' || currentHigh <= 0}
                title="Finalize sale (Hammer Down)"
              >
                <span style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.02em' }}>
                  <Gavel size={18} /> SOLD! HAMMER DOWN
                </span>
                <span style={{ fontSize: 11.5, opacity: 0.92 }}>
                  Sell to {currentLot.highBidderName || selectedBidder.name} for {formatCurrency(currentHigh)}
                </span>
              </button>
            </div>

            {/* Bottom Footer Control Buttons */}
            <div className="rostrum-footer-links">
              <button 
                type="button"
                className={`rostrum-footer-btn pause ${clerkingState === 'PAUSED' ? 'paused' : ''}`}
                onClick={handleTogglePause} 
                disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD'}
              >
                {clerkingState === 'PAUSED' ? <><Play size={14} /> Resume Auction</> : <><Pause size={14} /> Pause Auction</>}
              </button>

              <button 
                type="button"
                className="rostrum-footer-btn pass" 
                onClick={openPassLotDialog} 
                disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD'}
              >
                <XCircle size={14} /> Pass Item (Not Sold)
              </button>

              {(clerkingState === 'SOLD' || clerkingState === 'UNSOLD') && (
                <button 
                  type="button"
                  className="rostrum-footer-btn reopen" 
                  onClick={() => setIsReopenModalOpen(true)} 
                >
                  <RotateCcw size={14} /> Reopen Rostrum for This Lot
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Feeds & Next Lot */}
        <div className="clerking-sidebar-col">
          {/* Card 1: Recent Bids History */}
          <div className="recent-bids-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 className="font-sans" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={16} color="var(--gold-primary)" /> Recent Bids History
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {bids.length} Total
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
              {bids.length === 0 ? (
                <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                  No bids placed on this lot yet.
                </div>
              ) : (
                bids.map((b, idx) => (
                  <div 
                    key={b.id} 
                    style={{ 
                      background: idx === 0 ? '#ecfdf5' : '#ffffff', 
                      border: idx === 0 ? '1.5px solid #6ee7b7' : '1px solid var(--border-subtle)', 
                      borderRadius: 8, 
                      padding: '10px 14px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: idx === 0 ? '#059669' : 'var(--text-main)' }}>
                        {formatCurrency(b.amount)}
                      </span>
                      {idx === 0 ? (
                        <span className="badge" style={{ background: '#059669', color: '#ffffff', fontSize: 9, padding: '2px 7px' }}>
                          HIGHEST BID
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {b.source} Bid
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                      <span>{b.bidderName} (#{b.paddleNumber})</span>
                      <span>{b.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 2: Coming Up Next */}
          <div className="coming-up-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                COMING UP NEXT
              </span>
              <span className="badge" style={{ background: '#eff6ff', color: '#2563eb', fontSize: 10 }}>
                Item #{upcomingLot?.lotNumber || '—'}
              </span>
            </div>

            {upcomingLot ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)', flexShrink: 0, background: '#f8fafc' }}>
                    <img src={upcomingLot.image} alt={upcomingLot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.25 }}>
                      {upcomingLot.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      Est. Value: {formatCurrency(upcomingLot.estimateLow)} – {formatCurrency(upcomingLot.estimateHigh)}
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '10px 14px', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                  onClick={handleNextLotClick}
                >
                  <span>GO TO NEXT ITEM</span>
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                All catalog lots presented on rostrum.
              </div>
            )}
          </div>

          {/* Card 3: Easy Step-by-Step Guide */}
          <div className="easy-guide-card">
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span> Live Clerking Rostrum Guide:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div>• Online bids arrive automatically from the website in real-time</div>
              <div>• When bidding slows down, click <strong>Going Once</strong>, then <strong>Going Twice</strong></div>
              <div>• When no higher bids arrive, click <strong>SOLD! Hammer Down</strong> to finalize</div>
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================================
          CONFIRMATION MODAL: HAMMER DOWN / SOLD
          ======================================================================= */}
      {isSoldModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSoldModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gavel size={20} color="var(--gold-primary)" /> Confirm Hammer Down (Final Sale)
              </h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setIsSoldModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Sale Lot #{currentLot.lotNumber}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>
                  {currentLot.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Consignor: {currentLot.consignorName}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '14px 18px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 11, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>FINAL HAMMER PRICE</span>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#166534', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {formatCurrency(currentHigh)}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid var(--border-medium)', padding: '14px 18px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>WINNING BIDDER</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                    Paddle #{currentLot.highBidderPaddle || selectedPaddle}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {currentLot.highBidderName || selectedBidder.name} ({highBidSource})
                  </div>
                </div>
              </div>

              {/* Invoicing calculation preview */}
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>15% Standard Buyer's Premium:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(currentHigh * 0.15)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Sales Tax (7.5%):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(currentHigh * 0.075)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-subtle)', fontWeight: 700, color: 'var(--text-main)' }}>
                  <span>Total Settlement Invoice Due:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{formatCurrency(currentHigh * 1.225 + 250)}</span>
                </div>
              </div>

              {/* Reserve Warning & Override Checkbox */}
              {reserveInfo.status === 'not_met' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 16, borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 700, fontSize: 13 }}>
                    <AlertTriangle size={18} />
                    <span>WARNING: Hammer price is below configured Reserve Price!</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#92400e', lineHeight: 1.4 }}>
                    The current bid of <strong>{formatCurrency(currentHigh)}</strong> is <strong>{formatCurrency(reserveInfo.diff)}</strong> below the reserve price of <strong>{formatCurrency(reserveInfo.reservePrice)}</strong>. Selling below reserve requires explicit consignor authorization.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#78350f', marginTop: 4 }}>
                    <input 
                      type="checkbox" 
                      checked={reserveOverrideConfirmed} 
                      onChange={e => setReserveOverrideConfirmed(e.target.checked)} 
                      style={{ width: 17, height: 17 }}
                    />
                    <span>I confirm and authorize selling Lot #{currentLot.lotNumber} below reserve.</span>
                  </label>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsSoldModalOpen(false)}>
                Back to Rostrum
              </button>
              <button 
                className="btn btn-gold" 
                onClick={handleConfirmSold}
                disabled={reserveInfo.status === 'not_met' && !reserveOverrideConfirmed}
                style={{ background: '#059669', borderColor: '#059669', color: '#ffffff' }}
              >
                <Gavel size={16} /> Confirm Hammer Down & Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          CONFIRMATION MODAL: PASS / UNSOLD
          ======================================================================= */}
      {isPassModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPassModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={20} color="#dc2626" /> Confirm Passing Lot #{currentLot.lotNumber}
              </h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setIsPassModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Are you sure you want to pass <strong>Lot #{currentLot.lotNumber} ({currentLot.title})</strong> as unsold? Bidding will be ceased on the rostrum and portal nodes.
              </p>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>High Bid Reached</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                    {formatCurrency(currentHigh)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Reserve Ceiling</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                    {currentLot.reservePrice > 0 ? formatCurrency(currentLot.reservePrice) : 'Reserve Not Set'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Passing Lot</label>
                <select value={passReason} onChange={e => setPassReason(e.target.value)}>
                  <option value="Reserve Not Met">Reserve Price Not Met by Saleroom / Web</option>
                  <option value="No Opening Bids Logged">No Opening Bids Logged</option>
                  <option value="Consignor Directed Hold">Consignor Directed Hold</option>
                  <option value="Catalog Specification Re-examination">Catalog Specification Re-examination</option>
                </select>
              </div>

              <div className="form-group">
                <label>Clerk Notes (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Counter-offer under discussion with consignor"
                  value={passNotes}
                  onChange={e => setPassNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsPassModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmPass}
              >
                Confirm Pass Lot as Unsold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          CONFIRMATION MODAL: UNRESOLVED LOT ADVANCE
          ======================================================================= */}
      {isUnresolvedModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUnresolvedModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#f59e0b" /> Lot #{currentLot.lotNumber} Is Still Active
              </h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setIsUnresolvedModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Lot #{currentLot.lotNumber} currently has an unresolved rostrum calling state (<strong>{clerkingState}</strong> with current bid of {formatCurrency(currentHigh)}).
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Advancing will take the next catalog lot onto the block. How would you like to handle Lot #{currentLot.lotNumber}?
              </p>
            </div>

            <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
              <button 
                className="btn btn-gold" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleForceAdvanceWithPass}
              >
                Pass Current Lot (#{currentLot.lotNumber}) and Advance to Next Lot
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleForceAdvanceKeepUpcoming}
              >
                Keep as Upcoming & Advance to Next Lot
              </button>
              <button 
                className="btn" 
                style={{ width: '100%', justifyContent: 'center', color: 'var(--text-muted)' }}
                onClick={() => setIsUnresolvedModalOpen(false)}
              >
                Stay on Current Lot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          CONFIRMATION MODAL: REOPEN LOT
          ======================================================================= */}
      {isReopenModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReopenModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} color="var(--gold-primary)" /> Reopen Lot #{currentLot.lotNumber}
              </h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setIsReopenModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Are you sure you want to reopen <strong>Lot #{currentLot.lotNumber}</strong> back to the live rostrum? This will reactivate bidding on the floor and portal feeds.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsReopenModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-gold" 
                onClick={() => {
                  setIsReopenModalOpen(false);
                  setClerkingState('LIVE');
                  if (onReopenLot) onReopenLot(currentLot.id);
                }}
              >
                Reopen Lot to Rostrum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
