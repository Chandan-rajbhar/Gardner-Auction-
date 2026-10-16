import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { EnrichedLotItem, BidRecord, SettlementBreakdown } from './types';
import { INITIAL_AUCTION_LOTS } from './mockRealtimeData';
import { playBidSuccessSound } from '../../utils/sound';

interface UseAuctionSessionReturn {
  activeLot: EnrichedLotItem;
  allLots: EnrichedLotItem[];
  selectedLotId: string;
  selectLot: (lotId: string) => void;
  // Timer & Auto-Extend
  secondsRemaining: number;
  timeFormatted: string;
  isUrgent: boolean;
  isCritical: boolean;
  isClosed: boolean;
  isAutoExtended: boolean;
  autoExtendCount: number;
  // Live Bidding
  bids: BidRecord[];
  isSubmittingBid: boolean;
  bidError: string | null;
  placeBid: (amount: number, isProxy?: boolean) => Promise<{ success: boolean; message?: string }>;
  settlement: SettlementBreakdown;
  calculateSettlement: (hammerAmount: number) => SettlementBreakdown;
  userIsLeading: boolean;
  // Live Viewers & Activity
  viewerCount: number;
  lastBidAnimationTrigger: number;
  // Sound
  isSoundMuted: boolean;
  toggleSound: () => void;
  // Notification Callback
  latestNotification: { id: string; type: 'success' | 'warning' | 'info'; title: string; message: string } | null;
  clearNotification: () => void;
}

const BUYERS_PREMIUM_RATE = 0.15; // 15% standard Gardner Auction premium

// Pure initialization helper
const createInitialLotsMap = (): Record<string, EnrichedLotItem> => {
  const map: Record<string, EnrichedLotItem> = {};
  INITIAL_AUCTION_LOTS.forEach((lot) => {
    map[lot.id] = { ...lot };
  });
  return map;
};

export const useAuctionSession = (): UseAuctionSessionReturn => {
  // 1. Lots State Map
  const [lotsMap, setLotsMap] = useState<Record<string, EnrichedLotItem>>(createInitialLotsMap);
  const [selectedLotId, setSelectedLotId] = useState<string>('lot-704');
  const activeLot = lotsMap[selectedLotId] || INITIAL_AUCTION_LOTS.find((l) => l.id === 'lot-704') || INITIAL_AUCTION_LOTS[0];

  // 2. Authoritative Target End Timestamps in Ref
  const targetEndTimesRef = useRef<Record<string, number>>({});

  // Initialize target end times once on mount
  useEffect(() => {
    const now = Date.now();
    const targets: Record<string, number> = {};
    INITIAL_AUCTION_LOTS.forEach((lot) => {
      targets[lot.id] = now + lot.timeRemainingSeconds * 1000;
    });
    targetEndTimesRef.current = targets;
  }, []);

  // Seconds remaining state initialized with active lot's configured time
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const initialLot = INITIAL_AUCTION_LOTS.find((l) => l.id === 'lot-704') || INITIAL_AUCTION_LOTS[0];
    return initialLot.timeRemainingSeconds;
  });

  // Animation & Audio State
  const [lastBidAnimationTrigger, setLastBidAnimationTrigger] = useState<number>(0);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [isSubmittingBid, setIsSubmittingBid] = useState<boolean>(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<{ id: string; type: 'success' | 'warning' | 'info'; title: string; message: string } | null>(null);

  // Live Viewers State: Calibrated authentic audience
  const [viewerCount, setViewerCount] = useState<number>(16);

  // BroadcastChannel for cross-tab real-time synchronization
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const clearNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  // Handle incoming external bid
  const handleExternalBidReceived = useCallback((lotId: string, newBid: BidRecord, extended: boolean) => {
    setLotsMap((prev) => {
      const targetLot = prev[lotId];
      if (!targetLot) return prev;
      const updatedBids = [newBid, ...targetLot.initialBids.map((b) => ({ ...b, isLeading: false }))];
      const nextBidAmount = newBid.amount + targetLot.bidIncrement;

      return {
        ...prev,
        [lotId]: {
          ...targetLot,
          currentBid: newBid.amount,
          nextBid: nextBidAmount,
          bidsCount: targetLot.bidsCount + 1,
          initialBids: updatedBids,
          autoExtendCount: extended ? targetLot.autoExtendCount + 1 : targetLot.autoExtendCount,
          lastExtensionTimestamp: extended ? Date.now() : targetLot.lastExtensionTimestamp
        }
      };
    });

    if (lotId === selectedLotId) {
      setLastBidAnimationTrigger(Date.now());
      if (!isSoundMuted) {
        playBidSuccessSound();
      }
    }
  }, [selectedLotId, isSoundMuted]);

  // Keep a ref to the latest callback to avoid circular useEffect dependencies
  const handleExternalBidRef = useRef(handleExternalBidReceived);
  useEffect(() => {
    handleExternalBidRef.current = handleExternalBidReceived;
  }, [handleExternalBidReceived]);

  // Setup BroadcastChannel on mount
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('gardner_live_auction_channel');
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const { type, payload } = event.data;
          if (type === 'NEW_BID' && payload) {
            handleExternalBidRef.current(payload.lotId, payload.bid, payload.extended);
          } else if (type === 'VIEWER_PING') {
            setViewerCount((prev) => Math.min(prev + 1, 35));
          }
        };

        // Notify other tabs of new viewer session
        channel.postMessage({ type: 'VIEWER_PING' });
      } catch {
        // Fallback gracefully
      }
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Update countdown clock every second based on wall clock
  useEffect(() => {
    const updateCountdown = () => {
      const target = targetEndTimesRef.current[selectedLotId];
      if (!target) return;
      const now = Date.now();
      const diffSecs = Math.max(0, Math.round((target - now) / 1000));
      setSecondsRemaining(diffSecs);

      // Check if lot closed
      if (diffSecs <= 0) {
        setLotsMap((prev) => {
          const current = prev[selectedLotId];
          if (current && !current.isClosed) {
            return {
              ...prev,
              [selectedLotId]: {
                ...current,
                isClosed: true,
                hammerPrice: current.currentBid
              }
            };
          }
          return prev;
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedLotId]);

  // Handle lot change
  const selectLot = useCallback((lotId: string) => {
    setSelectedLotId(lotId);
    setBidError(null);
    const target = targetEndTimesRef.current[lotId];
    if (target) {
      setSecondsRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    }
  }, []);

  // Settlement breakdown helper
  const calculateSettlement = useCallback((hammerAmount: number): SettlementBreakdown => {
    const buyersPremium = Math.round(hammerAmount * BUYERS_PREMIUM_RATE);
    return {
      hammerPrice: hammerAmount,
      buyersPremium,
      buyersPremiumRate: BUYERS_PREMIUM_RATE,
      estimatedTax: 0,
      estimatedTotal: hammerAmount + buyersPremium
    };
  }, []);

  const settlement = useMemo(() => {
    return calculateSettlement(activeLot.nextBid);
  }, [activeLot.nextBid, calculateSettlement]);

  // Place a Bid (Server-Authoritative Validation Simulation)
  const placeBid = useCallback(async (amount: number, isProxy = false): Promise<{ success: boolean; message?: string }> => {
    setIsSubmittingBid(true);
    setBidError(null);

    // 1. Authoritative Validation
    if (activeLot.isClosed || secondsRemaining <= 0) {
      setIsSubmittingBid(false);
      setBidError('Auction session for this lot has already concluded.');
      return { success: false, message: 'Lot is closed.' };
    }

    if (amount < activeLot.nextBid) {
      setIsSubmittingBid(false);
      const msg = `Minimum acceptable bid is $${activeLot.nextBid.toLocaleString()}. Your bid of $${amount.toLocaleString()} was rejected.`;
      setBidError(msg);
      return { success: false, message: msg };
    }

    // 2. Network transmission latency simulation (260ms)
    await new Promise((r) => setTimeout(r, 260));

    // 3. Check anti-sniping trigger: If under 120 seconds, extend by 120 seconds!
    let didExtend = false;
    const currentRemaining = Math.max(0, Math.round(((targetEndTimesRef.current[activeLot.id] || Date.now()) - Date.now()) / 1000));
    if (activeLot.isAutoExtendEnabled && currentRemaining <= 120) {
      if (targetEndTimesRef.current[activeLot.id]) {
        targetEndTimesRef.current[activeLot.id] += 120 * 1000;
        didExtend = true;
      }
    }

    // 4. Construct Accepted Bid Record
    const userBidRecord: BidRecord = {
      id: `bid-usr-${Date.now()}`,
      lotId: activeLot.id,
      amount,
      bidderMasked: 'You (Paddle #782)',
      bidderPaddle: '#782',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' EST',
      timeSecondsAgo: 0,
      origin: 'webcast',
      isLeading: true,
      isCurrentUser: true
    };

    // 5. Update State Atomically
    setLotsMap((prev) => {
      const lot = prev[activeLot.id];
      if (!lot) return prev;
      const updatedBids = [
        userBidRecord,
        ...lot.initialBids.map((b) => ({ ...b, isLeading: false }))
      ];
      const nextAccepted = amount + lot.bidIncrement;

      return {
        ...prev,
        [activeLot.id]: {
          ...lot,
          currentBid: amount,
          nextBid: nextAccepted,
          bidsCount: lot.bidsCount + 1,
          reserveMet: true,
          initialBids: updatedBids,
          autoExtendCount: didExtend ? lot.autoExtendCount + 1 : lot.autoExtendCount,
          lastExtensionTimestamp: didExtend ? Date.now() : lot.lastExtensionTimestamp
        }
      };
    });

    // 6. Broadcast across tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'NEW_BID',
          payload: { lotId: activeLot.id, bid: userBidRecord, extended: didExtend }
        });
      } catch {
        // Broadcast failed
      }
    }

    // 7. Audio & Animation Trigger
    setLastBidAnimationTrigger(Date.now());
    if (!isSoundMuted) {
      playBidSuccessSound();
    }

    setIsSubmittingBid(false);

    // 8. Notification
    const notifTitle = isProxy
      ? `Ceiling Bid Recorded: $${amount.toLocaleString()}`
      : `Bid Accepted: $${amount.toLocaleString()}`;
    const notifMsg = didExtend
      ? `Floor transmission verified. Auto-Extend triggered: closing time extended by +2:00!`
      : `Floor transmission verified. You are now the leading bidder on ${activeLot.lotNumber}.`;

    setLatestNotification({
      id: Date.now().toString(),
      type: 'success',
      title: notifTitle,
      message: notifMsg
    });

    return { success: true };
  }, [activeLot, secondsRemaining, isSoundMuted]);

  // Format time display
  const timeFormatted = useMemo(() => {
    if (secondsRemaining <= 0) return 'AUCTION CLOSED';
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}H ${pad(minutes)}M ${pad(seconds)}S`;
    }
    return `${pad(minutes)}M ${pad(seconds)}S`;
  }, [secondsRemaining]);

  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 120;
  const isCritical = secondsRemaining > 0 && secondsRemaining <= 15;
  const isClosed = secondsRemaining <= 0 || Boolean(activeLot.isClosed);
  const isAutoExtended = activeLot.autoExtendCount > 0;

  const userIsLeading = useMemo(() => {
    const topBid = activeLot.initialBids[0];
    return Boolean(topBid && topBid.isCurrentUser && topBid.isLeading);
  }, [activeLot.initialBids]);

  const toggleSound = useCallback(() => {
    setIsSoundMuted((prev) => !prev);
  }, []);

  const allLots = useMemo(() => Object.values(lotsMap), [lotsMap]);

  return {
    activeLot,
    allLots,
    selectedLotId,
    selectLot,
    secondsRemaining,
    timeFormatted,
    isUrgent,
    isCritical,
    isClosed,
    isAutoExtended,
    autoExtendCount: activeLot.autoExtendCount,
    bids: activeLot.initialBids,
    isSubmittingBid,
    bidError,
    placeBid,
    settlement,
    calculateSettlement,
    userIsLeading,
    viewerCount,
    lastBidAnimationTrigger,
    isSoundMuted,
    toggleSound,
    latestNotification,
    clearNotification
  };
};
