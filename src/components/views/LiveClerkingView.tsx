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
  ChevronRight
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

  // Count remaining upcoming lots
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* =======================================================================
          TOP STATUS BAR & ROSTRUM HEADER
          ======================================================================= */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: '#ffffff', 
        padding: '14px 24px', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Status Badge */}
          {clerkingState === 'READY' && (
            <span className="badge badge-ready" style={{ padding: '6px 14px', fontSize: 12 }}>
              <Radio size={14} /> ROSTRUM READY
            </span>
          )}
          {clerkingState === 'LIVE' && (
            <span className="badge badge-live" style={{ padding: '6px 14px', fontSize: 12 }}>
              <span className="status-dot"></span> LIVE BIDDING
            </span>
          )}
          {clerkingState === 'GOING_ONCE' && (
            <span className="badge badge-going-once" style={{ padding: '6px 14px', fontSize: 12 }}>
              <AlertTriangle size={14} /> GOING ONCE
            </span>
          )}
          {clerkingState === 'GOING_TWICE' && (
            <span className="badge badge-going-twice" style={{ padding: '6px 14px', fontSize: 12 }}>
              <AlertTriangle size={14} /> GOING TWICE
            </span>
          )}
          {clerkingState === 'PAUSED' && (
            <span className="badge badge-paused" style={{ padding: '6px 14px', fontSize: 12 }}>
              <Pause size={14} /> ROSTRUM PAUSED
            </span>
          )}
          {clerkingState === 'SOLD' && (
            <span className="badge badge-live" style={{ padding: '6px 14px', fontSize: 12, background: '#ecfdf5', color: '#047857' }}>
              <CheckCircle2 size={14} /> HAMMER DOWN — SOLD
            </span>
          )}
          {clerkingState === 'UNSOLD' && (
            <span className="badge badge-unsold" style={{ padding: '6px 14px', fontSize: 12 }}>
              <XCircle size={14} /> LOT PASSED / UNSOLD
            </span>
          )}

          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Auctioneer in Chair: <strong style={{ color: 'var(--text-main)' }}>Todd Gardner</strong> (AF360 Master Console)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Cadence Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', background: '#f8fafc', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <Clock size={15} color={clerkingState === 'GOING_TWICE' ? '#dc2626' : clerkingState === 'GOING_ONCE' ? '#d97706' : 'var(--gold-primary)'} />
            <span>Cadence Timer: <strong style={{ color: clerkingState === 'GOING_TWICE' ? '#dc2626' : 'var(--text-main)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{countdown}s</strong></span>
          </div>

          {/* Gavel Audio Toggle */}
          <button 
            className="icon-btn" 
            style={{ width: 36, height: 36 }}
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playGavelStrike();
            }}
            title={audioEnabled ? 'Mute Gavel Strike Audio' : 'Enable Gavel Strike Audio'}
          >
            {audioEnabled ? <Volume2 size={17} color="var(--gold-primary)" /> : <VolumeX size={17} />}
          </button>
        </div>
      </div>

      {/* Status or reset notification banner */}
      {statusNotification && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-xs)' }}>
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
          MAIN CONSOLE LAYOUT: BLOCK DISPLAY & TELEMETRY
          ======================================================================= */}
      <div className="clerking-console">
        {/* Left Column: Active Lot on Block */}
        <div className={`block-display-card ${clerkingState === 'GOING_TWICE' ? 'animate-pulse' : ''}`} style={{ borderColor: clerkingState === 'GOING_TWICE' ? '#f43f5e' : clerkingState === 'GOING_ONCE' ? '#f59e0b' : 'var(--border-subtle)' }}>
          
          {/* Sold Fanfare Overlay */}
          {soldFanfare && (
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(16, 185, 129, 0.96)', 
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

          {/* Top Block Header: Lot #, Reserve Badge, Estimate */}
          <div className="block-header-badge">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="badge badge-gold" style={{ fontSize: 13, padding: '5px 14px', background: '#0f172a', color: '#ffffff', border: 'none' }}>
                ON BLOCK: LOT #{currentLot.lotNumber}
              </span>

              {/* Reserve Status Badge */}
              {reserveInfo.status === 'met' && (
                <span className="badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                  <ShieldCheck size={14} /> RESERVE MET
                </span>
              )}
              {reserveInfo.status === 'not_met' && (
                <span className="badge" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                  <ShieldAlert size={14} /> RESERVE NOT MET ({formatCurrency(reserveInfo.diff)} to reserve)
                </span>
              )}
              {reserveInfo.status === 'not_set' && (
                <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
                  <ShieldCheck size={14} /> RESERVE NOT SET
                </span>
              )}
            </div>

            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              Estimate: {formatCurrency(currentLot.estimateLow)} – {formatCurrency(currentLot.estimateHigh)}
            </span>
          </div>

          {/* Lot Header & Visual */}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ height: 150, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#f8fafc' }}>
              <img src={currentLot.image} alt={currentLot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--gold-primary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                {currentLot.category} • {currentLot.certification} {currentLot.grade}
              </div>
              <h2 className="font-sans" style={{ fontSize: 20, color: 'var(--text-main)', margin: '6px 0 8px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                {currentLot.title}
              </h2>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Consignor: <strong style={{ color: 'var(--text-main)' }}>{currentLot.consignorName}</strong> • Opening Bid: <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(currentLot.startingBid)}</span>
              </div>
            </div>
          </div>

          {/* Big Live Bid Banner */}
          <div className="current-bid-banner" style={{ 
            background: clerkingState === 'GOING_TWICE' ? 'linear-gradient(135deg, #881337 0%, #1e1b4b 100%)' :
                        clerkingState === 'GOING_ONCE' ? 'linear-gradient(135deg, #78350f 0%, #0f172a 100%)' :
                        clerkingState === 'SOLD' ? 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)' :
                        clerkingState === 'UNSOLD' ? 'linear-gradient(135deg, #334155 0%, #0f172a 100%)' :
                        'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          }}>
            <div className="label">
              {clerkingState === 'GOING_TWICE' && '🚨 GOING TWICE — FAIR WARNING BEFORE FINAL GAVEL'}
              {clerkingState === 'GOING_ONCE' && '⚠️ GOING ONCE — CALLING THE BID'}
              {clerkingState === 'PAUSED' && '⏸️ ROSTRUM CALLING PAUSED — BIDS TEMPORARILY SUSPENDED'}
              {clerkingState === 'SOLD' && '🔨 SOLD! HAMMER DOWN — FINAL SALE RECORDED'}
              {clerkingState === 'UNSOLD' && '⏹️ LOT PASSED / UNSOLD — RESERVES NOT SATISFIED'}
              {(clerkingState === 'LIVE' || clerkingState === 'READY') && 'CURRENT HIGH BID ON THE ROSTRUM'}
            </div>

            <div className="amount">
              {formatCurrency(currentHigh)}
            </div>

            <div className="bidder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {currentLot.highBidderPaddle ? (
                <>
                  <span>Holding Paddle: <strong style={{ color: '#38bdf8' }}>#{currentLot.highBidderPaddle}</strong> ({currentLot.highBidderName || 'Registered Bidder'})</span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', fontSize: 10 }}>
                    Source: {highBidSource}
                  </span>
                </>
              ) : (
                <span>No bids yet logged on this lot • Ready for opening bid</span>
              )}
            </div>
          </div>

          {/* =======================================================================
              NEXT VALID BID & BIDDER LIMIT CARDS (Directly beneath current high bid)
              ======================================================================= */}
          <div className="clerking-info-grid">
            {/* Card 1: Next Valid Bid */}
            <div className="clerking-info-card active-target">
              <div className="clerking-info-card-header">
                <span className="clerking-info-label">NEXT MINIMUM ACCEPTABLE BID</span>
                <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontSize: 10 }}>
                  +{formatCurrency(minIncrement)} step
                </span>
              </div>
              <div className="clerking-info-val" style={{ color: '#047857' }}>
                {formatCurrency(nextValidBid)}
              </div>
              <div className="clerking-info-subtext">
                <span>Calculated via standard tiered increment ladder</span>
                {clerkingState !== 'SOLD' && clerkingState !== 'UNSOLD' && clerkingState !== 'PAUSED' && (
                  <button 
                    onClick={() => handleExecuteBid(nextValidBid, selectedPaddle, selectedSource)}
                    className="btn btn-secondary" 
                    style={{ marginLeft: 'auto', padding: '3px 9px', fontSize: 11, background: '#ffffff' }}
                    title="Advance directly to next valid increment"
                  >
                    Advance
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Selected Bidder Limit */}
            <div className={`clerking-info-card ${isSelectedBidderExceeding ? 'limit-warning' : ''}`}>
              <div className="clerking-info-card-header">
                <span className="clerking-info-label">PADDLE #{selectedPaddle} BIDDER CREDIT LIMIT</span>
                {hasApprovedLimit ? (
                  <span className="badge" style={{ 
                    background: isSelectedBidderExceeding ? '#fee2e2' : '#ecfdf5', 
                    color: isSelectedBidderExceeding ? '#b91c1c' : '#047857', 
                    fontSize: 10 
                  }}>
                    {isSelectedBidderExceeding ? 'Exceeds Limit' : 'Within Limit'}
                  </span>
                ) : (
                  <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10 }}>
                    Limit Unavailable
                  </span>
                )}
              </div>

              <div className="clerking-info-val" style={{ color: isSelectedBidderExceeding ? '#b91c1c' : 'var(--text-main)' }}>
                {hasApprovedLimit ? formatCurrency(selectedBidder.bidLimit) : 'Limit Unavailable'}
              </div>

              <div className="clerking-info-subtext">
                {hasApprovedLimit ? (
                  <span>
                    Remaining: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(remainingLimit)}</strong> • {selectedBidder.name}
                  </span>
                ) : (
                  <span>Verified ID & CC pre-auth on file • Standard floor limits apply</span>
                )}
              </div>
            </div>
          </div>

          {/* =======================================================================
              BIDDING CONTROLS: PADDLE ASSIGNMENT, SOURCE, CUSTOM BID
              ======================================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 18 }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Floor / Phone Paddle Assignment</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>
                  {bidders.length} Registered Bidders
                </span>
              </label>
              <select 
                value={selectedPaddle} 
                onChange={(e) => {
                  setSelectedPaddle(e.target.value);
                  setValidationError(null);
                }}
                disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD'}
              >
                {bidders.map(b => (
                  <option key={b.id} value={b.paddleNumber}>
                    Paddle #{b.paddleNumber} — {b.name} ({b.siteOrigin}) {b.bidLimit > 0 ? `[Limit: ${formatCurrency(b.bidLimit)}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCustomBidSubmit} className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Custom Bid Entry ($)</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>
                  Min valid: {formatCurrency(nextValidBid)}
                </span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="number" 
                  placeholder={`≥ ${nextValidBid}`}
                  value={customBidAmount}
                  onChange={(e) => {
                    setCustomBidAmount(e.target.value);
                    setValidationError(null);
                  }}
                  disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD' || clerkingState === 'PAUSED'}
                />
                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  style={{ padding: '0 18px', fontWeight: 700 }}
                  disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD' || clerkingState === 'PAUSED'}
                >
                  Post Bid
                </button>
              </div>
            </form>
          </div>

          {/* Source pill selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Incoming Source:
            </span>
            {(['Floor', 'HiBid Online', 'Phone', 'Gardner Web'] as const).map(src => (
              <button
                key={src}
                type="button"
                onClick={() => setSelectedSource(src)}
                className={`filter-pill ${selectedSource === src ? 'active' : ''}`}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                {src}
              </button>
            ))}
          </div>

          {/* Quick Increment Buttons (AF360 Direct Action) */}
          <div style={{ marginBottom: 10, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Quick Dynamic Increment Ladders (AF360 Direct Advance)</span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'none' }}>
              Next acceptable: {formatCurrency(nextValidBid)}
            </span>
          </div>

          <div className="clerk-actions-grid">
            {quickOptions.map((opt, i) => {
              const targetBid = currentHigh + opt.increment;
              const isExceeding = hasApprovedLimit && targetBid > selectedBidder.bidLimit;
              const isDisabled = clerkingState === 'SOLD' || clerkingState === 'UNSOLD' || clerkingState === 'PAUSED' || isExceeding;

              return (
                <button 
                  key={i}
                  className="bid-increment-btn"
                  onClick={() => handleExecuteBid(targetBid, selectedPaddle, opt.source)}
                  disabled={isDisabled}
                  title={isExceeding ? `Exceeds Paddle #${selectedPaddle}'s approved limit` : `Advance bid to ${formatCurrency(targetBid)}`}
                  style={{ opacity: isDisabled ? 0.5 : 1 }}
                >
                  <div style={{ fontSize: 16 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--gold-primary)', fontFamily: 'var(--font-mono)' }}>
                    Total: {formatCurrency(targetBid)}
                  </div>
                  <span className="source">{opt.sublabel}</span>
                </button>
              );
            })}
          </div>

          {/* =======================================================================
              AUCTIONEER CALLING SEQUENCE (State Machine Buttons)
              ======================================================================= */}
          <div className="calling-sequence-container">
            <div className="calling-sequence-label">
              <span>Auctioneer Gavel & Calling Sequence Workflow</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'none' }}>
                State: <strong>{clerkingState}</strong>
              </span>
            </div>

            <div className="calling-sequence-grid">
              {/* 1. Going Once */}
              <button
                type="button"
                className={`calling-btn calling-btn-once ${clerkingState === 'GOING_ONCE' ? 'active' : ''}`}
                onClick={handleGoingOnce}
                disabled={clerkingState === 'GOING_ONCE' || clerkingState === 'GOING_TWICE' || clerkingState === 'SOLD' || clerkingState === 'UNSOLD' || clerkingState === 'PAUSED'}
                title="Move lot to Going Once calling stage"
              >
                <AlertTriangle size={18} />
                <span>Going Once</span>
              </button>

              {/* 2. Going Twice */}
              <button
                type="button"
                className={`calling-btn calling-btn-twice ${clerkingState === 'GOING_TWICE' ? 'active' : ''}`}
                onClick={handleGoingTwice}
                disabled={clerkingState !== 'GOING_ONCE'}
                title={clerkingState === 'GOING_ONCE' ? 'Advance to Going Twice (Fair Warning)' : 'Enable only after Going Once'}
              >
                <AlertTriangle size={18} />
                <span>Going Twice</span>
              </button>

              {/* 3. Pause / Resume */}
              <button
                type="button"
                className={`calling-btn calling-btn-pause ${clerkingState === 'PAUSED' ? 'active' : ''}`}
                onClick={handleTogglePause}
                disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD'}
                title="Pause or resume rostrum calling"
              >
                {clerkingState === 'PAUSED' ? <Play size={18} /> : <Pause size={18} />}
                <span>{clerkingState === 'PAUSED' ? 'Resume' : 'Pause'}</span>
              </button>

              {/* 4. Hammer Down / Sold */}
              <button
                type="button"
                className="calling-btn calling-btn-sold"
                onClick={openHammerSoldDialog}
                disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD' || currentHigh <= 0}
                title="Finalize sale (Hammer Down)"
              >
                <Gavel size={18} />
                <span>Hammer Down</span>
              </button>

              {/* 5. Pass / Unsold */}
              <button
                type="button"
                className="calling-btn calling-btn-pass"
                onClick={openPassLotDialog}
                disabled={clerkingState === 'SOLD' || clerkingState === 'UNSOLD'}
                title="Pass this lot as unsold"
              >
                <XCircle size={18} />
                <span>Pass Lot</span>
              </button>
            </div>

            {/* Reopen Action (Available when lot is SOLD or UNSOLD) */}
            {(clerkingState === 'SOLD' || clerkingState === 'UNSOLD') && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Lot is finalized as <strong>{clerkingState}</strong>. Bidding is closed.
                </span>
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => setIsReopenModalOpen(true)}
                >
                  <RotateCcw size={14} /> Reopen Rostrum for This Lot
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =======================================================================
            RIGHT COLUMN: REAL-TIME LIVE BID TELEMETRY & CATALOG ADVANCE
            ======================================================================= */}
        <div className="bid-feed-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="font-sans" style={{ fontSize: 16, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <Flame size={17} color="var(--gold-primary)" />
              Live Bid Telemetry
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {bids.length} Bids Logged
            </span>
          </div>

          <div className="bid-history-list">
            {bids.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No live bids placed on this lot yet.<br />
                Use quick increments or post a floor bid to start.
              </div>
            ) : (
              bids.map((bid, index) => (
                <div key={bid.id} className={`bid-item-row ${index === 0 ? 'winning' : ''}`}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: index === 0 ? '#059669' : 'var(--text-main)', fontSize: 15 }}>
                        {formatCurrency(bid.amount)}
                      </span>
                      <span className="bid-source-pill">{bid.source}</span>
                      {index === 0 && (
                        <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontSize: 9, padding: '2px 6px' }}>
                          High Bid
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Paddle #{bid.paddleNumber} • {bid.bidderName}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {bid.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Next Catalog Lot Footer Control */}
          <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Catalog Progression:</span>
              <span style={{ fontWeight: 600 }}>{remainingUpcomingCount} Upcoming Lots</span>
            </div>

            <button 
              className="btn btn-gold" 
              style={{ width: '100%', padding: '12px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
              onClick={handleNextLotClick}
            >
              <span>Next Catalog Lot</span>
              <ArrowRight size={16} />
            </button>
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
