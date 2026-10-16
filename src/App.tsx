import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';

import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { SearchBar } from './components/SearchBar';
import { CuratedEvents } from './components/CuratedEvents';
import { LiveBiddingDesk } from './components/LiveBiddingDesk';
import { DepartmentDirectory } from './components/DepartmentDirectory';
import { BidderTrustProtocol } from './components/BidderTrustProtocol';
import { Footer } from './components/Footer';
import { BiddingModal } from './components/BiddingModal';
import { LotDetailModal } from './components/LotDetailModal';
import { ConditionReportModal } from './components/ConditionReportModal';
import { WatchlistDrawer } from './components/WatchlistDrawer';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';

import {
  SPOTLIGHT_LOT,
  LIVE_LOTS
} from './data/auctionData';
import type { LotItem, CuratedEvent } from './data/auctionData';
import { playBidSuccessSound } from './utils/sound';

export const App: React.FC = () => {
  // State: Lots & Live Data
  const [spotlightLot, setSpotlightLot] = useState<LotItem>(SPOTLIGHT_LOT);
  const [liveLots, setLiveLots] = useState<LotItem[]>(LIVE_LOTS);
  const [watchlist, setWatchlist] = useState<string[]>(['spotlight-104']);

  // Timers: seconds remaining map
  const [secondsMap, setSecondsMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {
      [SPOTLIGHT_LOT.id]: SPOTLIGHT_LOT.timeRemainingSeconds
    };
    LIVE_LOTS.forEach((l) => {
      map[l.id] = l.timeRemainingSeconds;
    });
    return map;
  });

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals & Drawers
  const [activeBiddingLot, setActiveBiddingLot] = useState<LotItem | null>(null);
  const [activeDetailLot, setActiveDetailLot] = useState<LotItem | null>(null);
  const [activeConditionEvent, setActiveConditionEvent] = useState<CuratedEvent | null>(null);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Real-time 1s Clock Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsMap((prev) => {
        const next: Record<string, number> = {};
        for (const [id, secs] of Object.entries(prev)) {
          next[id] = Math.max(0, secs - 1);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format seconds into display strings
  const formatTime = (totalSeconds: number, formatHour = false): string => {
    if (totalSeconds <= 0) return 'CLOSING NOW';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (formatHour || hours > 0) {
      return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(minutes)}m ${pad(seconds)}s`;
  };

  // Pre-calculated timer strings
  const spotlightTimeFormatted = useMemo(() => {
    return formatTime(secondsMap[spotlightLot.id] || 0, true);
  }, [secondsMap, spotlightLot.id]);

  const timers = useMemo(() => {
    const map: Record<string, string> = {};
    liveLots.forEach((l) => {
      map[l.id] = formatTime(secondsMap[l.id] || 0, false);
    });
    map[spotlightLot.id] = spotlightTimeFormatted;
    return map;
  }, [secondsMap, liveLots, spotlightLot.id, spotlightTimeFormatted]);

  // Periodic Auto-Refresh Simulation (every 15s)
  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, []);

  useEffect(() => {
    const refreshTimer = setInterval(triggerRefresh, 15000);
    return () => clearInterval(refreshTimer);
  }, [triggerRefresh]);

  // Watchlist Actions
  const handleToggleWatchlist = (lotId: string) => {
    setWatchlist((prev) => {
      const exists = prev.includes(lotId);
      if (exists) {
        addToast('info', 'Removed from Watchlist', 'Lot removed from your monitored catalog.');
        return prev.filter((id) => id !== lotId);
      } else {
        addToast('success', 'Added to Watchlist', 'Lot is now monitored in your active watchlist.');
        return [...prev, lotId];
      }
    });
  };

  // Instant Bidding / Modal Bid Confirmation
  const handleConfirmBid = (lotId: string, amount: number) => {
    playBidSuccessSound();

    if (lotId === spotlightLot.id) {
      const nextIncrement = amount + spotlightLot.bidIncrement;
      setSpotlightLot((prev) => ({
        ...prev,
        currentBid: amount,
        nextBid: nextIncrement,
        bidsCount: prev.bidsCount + 1,
        reserveMet: true
      }));
      addToast(
        'success',
        `Bid Placed: $${amount.toLocaleString()}`,
        `You are now high bidder on Lot 104 (${spotlightLot.title}).`
      );
    } else {
      setLiveLots((prevLots) =>
        prevLots.map((lot) => {
          if (lot.id === lotId) {
            const nextIncrement = amount + lot.bidIncrement;
            return {
              ...lot,
              currentBid: amount,
              nextBid: nextIncrement,
              bidsCount: lot.bidsCount + 1,
              reserveMet: true
            };
          }
          return lot;
        })
      );

      const targetLot = liveLots.find((l) => l.id === lotId);
      addToast(
        'success',
        `Bid Confirmed: $${amount.toLocaleString()}`,
        `High bid recorded on ${targetLot ? targetLot.lotNumber : 'lot'}. Floor acknowledgment transmitted.`
      );
    }
  };

  const handleInstantBidDirect = (lot: LotItem) => {
    // Open bid confirmation dialog
    setActiveBiddingLot(lot);
  };

  // Filtered Lots for Search & Categories
  const filteredLots = useMemo(() => {
    return liveLots.filter((lot) => {
      const matchesSearch =
        !searchTerm.trim() ||
        lot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.categoryTag.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        lot.department.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [liveLots, searchTerm, selectedCategory]);

  // Watchlisted Lot Objects
  const watchlistLots = useMemo(() => {
    const all = [spotlightLot, ...liveLots];
    return all.filter((l) => watchlist.includes(l.id));
  }, [watchlist, spotlightLot, liveLots]);

  return (
    <div className="app-root">
      {/* 1. Header with Ticker, Monogram Logo, Navigation & Search */}
      <Header
        watchlistCount={watchlist.length}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        onSearch={(term) => {
          setSearchTerm(term);
          const el = document.getElementById('live-bidding');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <main>
        {/* 2. Dark Hero Section with 1907 Saint-Gaudens High Relief Spotlight Lot */}
        <Hero
          spotlightLot={spotlightLot}
          spotlightTimeFormatted={spotlightTimeFormatted}
          isWatchlisted={watchlist.includes(spotlightLot.id)}
          onToggleWatchlist={handleToggleWatchlist}
          onPlaceBid={(lot) => setActiveBiddingLot(lot)}
          onViewLot={(lot) => setActiveDetailLot(lot)}
        />

        {/* 3. Floating Search and Filter Bar */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedEvent={selectedEvent}
          onEventChange={setSelectedEvent}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onSearchSubmit={() => {
            const el = document.getElementById('live-bidding');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 4. Curated Bidder Events: Auctions Worth Discovering */}
        <CuratedEvents
          onEventClick={(event) => {
            addToast('info', event.title, `Opening catalog for ${event.title}.`);
          }}
          onRequestCondition={(event) => {
            setActiveConditionEvent(event);
          }}
        />

        {/* 5. Real-Time Bidding Desk: Closing Soon - Live Bidding */}
        <LiveBiddingDesk
          lots={filteredLots}
          timers={timers}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
          onInstantBid={handleInstantBidDirect}
          onViewLot={(lot) => setActiveDetailLot(lot)}
          onManualRefresh={triggerRefresh}
          isRefreshing={isRefreshing}
        />

        {/* 6. Catalog Directory: Browse by Department */}
        <DepartmentDirectory
          selectedDepartment={selectedCategory}
          onSelectDepartment={(dept) => {
            setSelectedCategory(dept);
            const el = document.getElementById('live-bidding');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 7. Bidder Trust Protocol: Participating with Confidence & Licensure Seals */}
        <BidderTrustProtocol />
      </main>

      {/* 8. Luxury Footer with Licensure, Departments, Services, and PA Commonwealth Keystone */}
      <Footer />

      {/* Modals & Slide-overs */}
      {activeBiddingLot && (
        <BiddingModal
          lot={activeBiddingLot}
          onClose={() => setActiveBiddingLot(null)}
          onConfirmBid={handleConfirmBid}
        />
      )}

      {activeDetailLot && (
        <LotDetailModal
          lot={activeDetailLot}
          timeRemaining={timers[activeDetailLot.id] || 'Closing Soon'}
          isWatchlisted={watchlist.includes(activeDetailLot.id)}
          onToggleWatchlist={handleToggleWatchlist}
          onPlaceBid={(lot) => setActiveBiddingLot(lot)}
          onClose={() => setActiveDetailLot(null)}
        />
      )}

      {activeConditionEvent && (
        <ConditionReportModal
          event={activeConditionEvent}
          onClose={() => setActiveConditionEvent(null)}
          onSubmitReport={(email) => {
            addToast(
              'success',
              'Condition Dossier Dispatched',
              `Accredited condition report for ${activeConditionEvent.title} has been forwarded to ${email}.`
            );
          }}
        />
      )}

      <WatchlistDrawer
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        watchlistLots={watchlistLots}
        timers={timers}
        onRemoveFromWatchlist={handleToggleWatchlist}
        onPlaceBid={(lot) => setActiveBiddingLot(lot)}
        onViewLot={(lot) => setActiveDetailLot(lot)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(name: string) => {
          addToast('success', `Welcome, ${name}!`, 'Bidder credentials verified for live session participation.');
        }}
      />

      {/* Toast Feed */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
