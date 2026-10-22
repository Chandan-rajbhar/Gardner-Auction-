import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';

import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { LiveBiddingDesk } from './components/LiveBiddingDesk';
import { PastAuctionsSection } from './components/PastAuctionsSection';
import { TrustSection } from './components/TrustSection';
import { EmailListPage } from './components/EmailListPage';
import { Footer } from './components/Footer';
import { BiddingModal } from './components/BiddingModal';
import { LotDetailModal } from './components/LotDetailModal';
import { ConditionReportModal } from './components/ConditionReportModal';
import { WatchlistDrawer } from './components/WatchlistDrawer';
import { AuthModal } from './components/AuthModal';
import { ProfilePage } from './components/ProfilePage';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';

import {
  AuctionSearchControls,
  type BrowsingMode,
  type DisplayMode
} from './components/AuctionSearchControls';
import { PastCatalogsPage } from './components/PastCatalogsPage';
import { AuctionDetailsPage } from './components/AuctionDetailsPage';
import './components/AuctionDetailsPage.css';
import { CatalogLotsPage } from './components/CatalogLotsPage';
import { LotDetailPage } from './components/LotDetailPage';

import {
  SPOTLIGHT_LOT
} from './data/auctionData';
import type { LotItem, CuratedEvent } from './data/auctionData';
import {
  CURRENT_AUCTION_LOT_ITEMS
} from './data/currentAuctionData';
import type { CurrentAuction } from './data/currentAuctionData';
import { supabase } from './lib/supabase';
import { playBidSuccessSound } from './utils/sound';
import {
  Bookmark,
  Clock,
  CheckCircle2,
  Zap,
  Eye,
  Building,
  MapPin,
  Phone,
  Compass,
  ArrowRight
} from 'lucide-react';

import { CurrentAuctionPage } from './components/CurrentAuction/CurrentAuctionPage';
import type { EnrichedLotItem } from './components/CurrentAuction/types';

const CATEGORIES = [
  'Coins & Currency',
  'Gold & Bullion',
  'Fine Jewelry & Watches',
  'Americana & Antiques',
  'Fine Art & Prints'
];

export type AppRoute =
  | { view: 'home' }
  | { view: 'current-auction'; initialAuctionId?: string; initialTab?: 'auctions' | 'lots' }
  | { view: 'email-list' }
  | { view: 'catalogs' }
  | { view: 'profile' }
  | { view: 'auction-details'; auctionId: string }
  | { view: 'catalog-lots'; auctionId: string }
  | { view: 'lot-detail'; lotId: string; auctionId?: string };

export const App: React.FC = () => {
  // State: Dynamic Auctions & Lots from Supabase
  const [allAuctions, setAllAuctions] = useState<CurrentAuction[]>([]);
  const [spotlightLot, setSpotlightLot] = useState<LotItem>(SPOTLIGHT_LOT);
  const [liveLots, setLiveLots] = useState<LotItem[]>(CURRENT_AUCTION_LOT_ITEMS);
  const [watchlist, setWatchlist] = useState<string[]>(['spotlight-104']);

  // Timers: seconds remaining map
  const [secondsMap, setSecondsMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {
      [SPOTLIGHT_LOT.id]: SPOTLIGHT_LOT.timeRemainingSeconds
    };
    CURRENT_AUCTION_LOT_ITEMS.forEach((l) => {
      map[l.id] = l.timeRemainingSeconds;
    });
    return map;
  });

  // Search & Filtering & View Modes State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [browsingMode, setBrowsingMode] = useState<BrowsingMode>('auctions');
  const [sortOrder, setSortOrder] = useState<string>('upcoming');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [itemsPerPage, setItemsPerPage] = useState<number>(4);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Drawers
  const [activeBiddingLot, setActiveBiddingLot] = useState<LotItem | null>(null);
  const [activeDetailLot, setActiveDetailLot] = useState<LotItem | null>(null);
  const [activeConditionEvent, setActiveConditionEvent] = useState<CuratedEvent | null>(null);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
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

  // Route resolution supporting both hash routing and top-level pages
  const parseRoute = (pathname: string, hash: string): AppRoute => {
    const clean = hash.replace(/^#\/?/, '').trim();

    if (clean === 'email-list' || pathname === '/email-list') {
      return { view: 'email-list' };
    }

    if (
      clean === 'profile' ||
      clean === 'my-profile' ||
      clean.startsWith('profile') ||
      pathname === '/profile' ||
      pathname === '/my-profile'
    ) {
      return { view: 'profile' };
    }

    if (
      clean === 'auctions' ||
      clean === 'current-auction' ||
      clean.startsWith('current-auction') ||
      clean.startsWith('auctions') ||
      pathname === '/current-auction' ||
      pathname === '/auctions'
    ) {
      let initialAuctionId: string | undefined;
      let initialTab: 'auctions' | 'lots' = 'auctions';
      const q = clean.includes('?') ? clean.split('?')[1] : (typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '');
      if (q) {
        const p = new URLSearchParams(q);
        const aId = p.get('auction') || p.get('catalog') || p.get('id');
        if (aId) initialAuctionId = aId;
        if (p.get('tab') === 'lots' || aId) initialTab = 'lots';
      }
      return { view: 'current-auction', initialAuctionId, initialTab };
    }

    // 1. Lot details routing: e.g. #lot/:id or #catalog/:auctionId/lot/:lotId or #auction/:auctionId/lot/:lotId
    if (clean.includes('/lot/')) {
      const parts = clean.split('/lot/');
      const rawAuctionPart = parts[0];
      const lotId = parts[1].split(/[?#]/)[0];
      let auctionId: string | undefined;
      if (rawAuctionPart.startsWith('auction/')) {
        auctionId = rawAuctionPart.substring('auction/'.length);
      } else if (rawAuctionPart.startsWith('catalog/')) {
        auctionId = rawAuctionPart.substring('catalog/'.length);
      }
      return { view: 'lot-detail', lotId, auctionId };
    }

    if (clean.startsWith('lot/')) {
      const lotId = clean.substring('lot/'.length).split('/')[0].split(/[?#]/)[0];
      return { view: 'lot-detail', lotId };
    }

    if (clean.startsWith('lot?') || clean === 'lot') {
      const params = new URLSearchParams(clean.includes('?') ? clean.split('?')[1] : '');
      const lotId = params.get('id') || params.get('lotId') || '';
      const auctionId = params.get('auctionId') || undefined;
      return { view: 'lot-detail', lotId, auctionId };
    }

    // 2. Auction details routing
    if (clean.startsWith('auction/')) {
      const id = clean.substring('auction/'.length).split(/[?#]/)[0];
      return { view: 'auction-details', auctionId: id };
    }
    if (clean.startsWith('auction?') || clean === 'auction') {
      const params = new URLSearchParams(clean.includes('?') ? clean.split('?')[1] : '');
      const id = params.get('id') || '';
      return { view: 'auction-details', auctionId: id };
    }
    if (clean.startsWith('past-auction-')) {
      const id = clean.split(/[?#]/)[0];
      return { view: 'auction-details', auctionId: id };
    }
    if (pathname.startsWith('/past-auction-')) {
      const id = pathname.substring(1).split(/[?#]/)[0];
      return { view: 'auction-details', auctionId: id };
    }
    if (pathname.startsWith('/auction/')) {
      const id = pathname.substring('/auction/'.length).split(/[?#]/)[0];
      return { view: 'auction-details', auctionId: id };
    }

    // 3. Catalog lots routing
    if (clean.startsWith('catalog/')) {
      const id = clean.substring('catalog/'.length).split(/[?#]/)[0];
      return { view: 'catalog-lots', auctionId: id };
    }
    if (clean.startsWith('catalog?') || clean === 'catalog') {
      const params = new URLSearchParams(clean.includes('?') ? clean.split('?')[1] : '');
      const id = params.get('id') || '';
      return { view: 'catalog-lots', auctionId: id };
    }

    // 4. Past Catalogs main page
    if (clean.startsWith('catalogs')) {
      return { view: 'catalogs' };
    }

    return { view: 'home' };
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window === 'undefined') return { view: 'home' };
    return parseRoute(window.location.pathname, window.location.hash);
  });

  // Listen to popstate and hashchange events for browser forward/back buttons and programmatic route pushes
  useEffect(() => {
    const handleLocationChange = () => {
      const newRoute = parseRoute(window.location.pathname, window.location.hash);
      setCurrentRoute(newRoute);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Listen to hash for opening the authentication modal without route destruction
  useEffect(() => {
    const handleAuthHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h === '#signin' || h === '#login') {
        setAuthMode('signin');
        setIsAuthOpen(true);
      } else if (h === '#signup' || h === '#register') {
        setAuthMode('register');
        setIsAuthOpen(true);
      }
    };
    handleAuthHash();
    window.addEventListener('hashchange', handleAuthHash);
    return () => window.removeEventListener('hashchange', handleAuthHash);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    if (path === '/') {
      if (window.location.hash || window.location.pathname !== '/') {
        window.history.pushState(null, '', '/');
      }
    } else {
      if (window.location.hash !== path) {
        window.history.pushState(null, '', path);
      }
    }
    const newRoute = parseRoute(window.location.pathname, window.location.hash);
    setCurrentRoute(newRoute);
    window.scrollTo({ top: 0, behavior: path === '/' ? 'smooth' : 'instant' });
  }, []);

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

  // Fetch dynamic auctions from Supabase with Realtime updates for live buyer site
  useEffect(() => {
    let isMounted = true;
    async function fetchDynamicAuctions() {
      try {
        const [{ data: dbAuctions, error: errA }, { data: allLots, error: errL }] = await Promise.all([
          supabase.from('auctions').select('*').order('created_at', { ascending: false }),
          supabase.from('lots').select('*').order('lot_number', { ascending: true })
        ]);

        if (!isMounted) return;

        const rawLots = (!errL && Array.isArray(allLots)) ? allLots : [];

        if (!errA && dbAuctions && Array.isArray(dbAuctions)) {
          const mappedFromDb: CurrentAuction[] = dbAuctions.map((row: any) => {
            const matchingLots = rawLots.filter((l: any) => l.auction_id === row.id);
            const lotsCount = matchingLots.length || row.day_stats?.lotCount || (Array.isArray(row.day_stats?.lotStats) ? row.day_stats.lotStats.length : 0);
            const st = (row.status || '').toLowerCase();
            let isLive = false;
            let statusText = row.status || 'Active Session';
            let badge = (row.status || 'ACTIVE').toUpperCase();
            let badgeType: 'red' | 'green' | 'gold' = 'green';
            let dateLabel = 'ONLINE CATALOG';

            if (st.includes('progress') || st.includes('live')) {
              isLive = true;
              statusText = 'Live Webcast Auction';
              badge = 'LIVE WEBCAST';
              badgeType = 'red';
              dateLabel = 'LIVE NOW';
            } else if (st.includes('closing') || st.includes('today')) {
              statusText = 'Closing Today';
              badge = 'CLOSING TODAY';
              badgeType = 'gold';
              dateLabel = 'CLOSING TODAY';
            } else if (st.includes('concluded') || st.includes('closed') || st.includes('ended')) {
              statusText = 'Closed';
              badge = 'CLOSED';
              badgeType = 'gold';
              dateLabel = 'CONCLUDED';
            } else {
              statusText = 'Catalog Open';
              badge = 'CATALOG OPEN';
              badgeType = 'green';
              dateLabel = 'ONLINE CATALOG';
            }

            const img = (Array.isArray(row.featured_images) && row.featured_images[0]?.url)
              ? row.featured_images[0].url
              : (matchingLots[0]?.image || '/assets/gold-coin.jpg');

            let totalEstLow = 0;
            let totalEstHigh = 0;
            matchingLots.forEach((l: any) => {
              totalEstLow += Number(l.estimate_low) || 0;
              totalEstHigh += Number(l.estimate_high) || 0;
            });
            const dynamicEstimate = (totalEstLow > 0 || totalEstHigh > 0)
              ? `$${totalEstLow.toLocaleString()} – $${totalEstHigh.toLocaleString()}`
              : (row.estimate || (row.start_date && row.end_date ? `${row.start_date} – ${row.end_date}` : 'Catalog Lots Open'));

            const dateRangeStr = (row.start_date && row.end_date)
              ? `${row.start_date} – ${row.end_date}`
              : (row.start_date ? `Opens ${row.start_date}` : 'Active Session');

            return {
              id: row.id,
              title: row.name || 'Catalog Auction',
              sessionTitle: `SESSION: ${(row.name || '').toUpperCase()}`,
              auctionType: isLive ? 'Live Webcast Auction' : (row.auction_type || 'Catalog Auction'),
              status: statusText as any,
              badge,
              badgeType,
              companyName: row.company_name || 'Gardner Auction Service',
              galleryName: 'Heritage Saleroom & Online Simulcast',
              address: row.address1 || '',
              cityStateZip: `${row.city || ''}, ${row.state || ''} ${row.zip || ''}`.trim(),
              location: `${row.city || 'Missoula'}, ${row.state || 'MT'}`,
              dateRange: dateRangeStr,
              dateLabel,
              scheduleText: 'Simulcast bidding open daily; live clerk begins at 10:00 AM MDT',
              typeTag: (row.auction_type || row.category || 'Coins & Currency').toUpperCase(),
              lotsCount,
              estimate: dynamicEstimate,
              description: row.description || 'Verified authentic curated collectibles.',
              category: row.category || 'Coins & Currency',
              lots: matchingLots,
              image: img,
              buttonText: isLive ? 'ENTER LIVE AUCTION' : 'BROWSE CATALOG',
              buttonVariant: isLive ? 'dark' : 'gold',
              detailUrl: `#current-auction?auction=${row.id}&tab=lots`
            };
          });

          // Strictly set dynamic auctions fetched from Supabase (ZERO hardcoded mock cards)
          setAllAuctions(mappedFromDb);
        } else if (!errA && Array.isArray(dbAuctions)) {
          setAllAuctions([]);
        }

        // Also dynamically map live lots for the Lots view
        if (rawLots.length > 0) {
          const mappedLiveLots: LotItem[] = rawLots.map((l: any) => {
            const curBid = Number(l.current_bid) || Number(l.starting_bid) || 100;
            const startBid = Number(l.starting_bid) || 100;
            return {
              id: l.id,
              lotNumber: l.lot_number ? `LOT ${l.lot_number}` : 'LOT',
              categoryTag: (l.category || 'RARE COLLECTIBLE').toUpperCase(),
              department: l.category || 'Coins & Currency',
              title: l.title || `Lot ${l.lot_number || ''}`,
              description: l.description || l.title || '',
              details: l.description || '',
              image: l.image || '/assets/gold-coin.jpg',
              currentBid: curBid,
              startingBid: startBid,
              nextBid: curBid + 100,
              bidIncrement: 100,
              estimateLow: Number(l.estimate_low) || startBid,
              estimateHigh: Number(l.estimate_high) || (startBid * 2),
              bidsCount: Number(l.bids_count) || 0,
              reserveMet: true,
              timeRemainingSeconds: 7200,
              provenance: l.provenance || '',
              conditionReport: l.condition_report || '',
              specialistNote: ''
            };
          });
          setLiveLots(mappedLiveLots);
        }
      } catch (err) {
        console.warn('[App] Supabase dynamic auctions fetch error:', err);
      }
    }

    fetchDynamicAuctions();

    // Listen to Supabase Realtime changes on auctions table
    const channel = supabase
      .channel('realtime:frontend_auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => {
        fetchDynamicAuctions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => {
        fetchDynamicAuctions();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
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
    setActiveBiddingLot(lot);
  };

  // Filter Change Handlers
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleBrowsingModeChange = (mode: BrowsingMode) => {
    setBrowsingMode(mode);
    setCurrentPage(1);
    if (mode === 'auctions') {
      setSortOrder('upcoming');
    } else if (mode === 'lots') {
      setSortOrder('closing-soon');
    }
  };

  const handleSortChange = (sort: string) => {
    setSortOrder(sort);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
  };

  // Filtered & Sorted Current Auction Events (from shared dynamic Supabase + mock data source)
  const filteredEvents = useMemo(() => {
    let result = allAuctions.filter((event) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        event.typeTag.toLowerCase().includes(q) ||
        (event.category && event.category.toLowerCase().includes(q)) ||
        (event.location && event.location.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' ||
        event.typeTag.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        event.title.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (event.category && event.category.toLowerCase().includes(selectedCategory.toLowerCase()));

      return matchesSearch && matchesCategory;
    });

    if (sortOrder === 'lots-desc') {
      result = [...result].sort((a, b) => b.lotsCount - a.lotsCount);
    } else if (sortOrder === 'title-asc') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [allAuctions, searchTerm, selectedCategory, sortOrder]);

  // Filtered & Sorted Live Lots
  const filteredSortedLots = useMemo(() => {
    let result = liveLots.filter((lot) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lot.title.toLowerCase().includes(q) ||
        lot.description.toLowerCase().includes(q) ||
        lot.lotNumber.toLowerCase().includes(q) ||
        lot.categoryTag.toLowerCase().includes(q) ||
        lot.department.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'all' ||
        lot.department.toLowerCase() === selectedCategory.toLowerCase() ||
        lot.categoryTag.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === 'price-asc') return a.currentBid - b.currentBid;
      if (sortOrder === 'price-desc') return b.currentBid - a.currentBid;
      if (sortOrder === 'bids-desc') return b.bidsCount - a.bidsCount;
      if (sortOrder === 'lot-asc') return a.lotNumber.localeCompare(b.lotNumber);
      // closing soonest
      const secA = secondsMap[a.id] ?? a.timeRemainingSeconds;
      const secB = secondsMap[b.id] ?? b.timeRemainingSeconds;
      return secA - secB;
    });

    return result;
  }, [liveLots, searchTerm, selectedCategory, sortOrder, secondsMap]);

  // Total count & Paginated Lots
  const totalCount = browsingMode === 'auctions' ? filteredEvents.length : filteredSortedLots.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const paginatedLots = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSortedLots.slice(start, start + itemsPerPage);
  }, [filteredSortedLots, currentPage, itemsPerPage]);

  // Watchlisted Lot Objects
  const watchlistLots = useMemo(() => {
    const all = [spotlightLot, ...liveLots];
    return all.filter((l) => watchlist.includes(l.id));
  }, [watchlist, spotlightLot, liveLots]);

  return (
    <div className="app-root">
      {/* 1. Navbar with 4 Core Links in order + Login */}
      <Header
        currentPath={
          currentRoute.view === 'profile'
            ? '#profile'
            : currentRoute.view === 'current-auction'
            ? '#auctions'
            : currentRoute.view === 'email-list'
            ? '#email-list'
            : currentRoute.view === 'catalogs'
            ? '#catalogs'
            : currentRoute.view === 'auction-details'
            ? `#auction/${currentRoute.auctionId}`
            : currentRoute.view === 'catalog-lots'
            ? `#catalog/${currentRoute.auctionId}`
            : currentRoute.view === 'lot-detail'
            ? `#lot/${currentRoute.lotId}`
            : '/'
        }
        onNavigate={handleNavigate}
        onOpenLogin={() => {
          setAuthMode('signin');
          setIsAuthOpen(true);
        }}
        onOpenProfile={() => handleNavigate('#profile')}
        watchlistCount={watchlist.length}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        onSearch={(term) => {
          setSearchTerm(term);
          if (currentRoute.view === 'home') {
            const el = document.getElementById('auctions');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        onOpenAuth={() => {
          setAuthMode('signin');
          setIsAuthOpen(true);
        }}
      />

      {currentRoute.view === 'current-auction' ? (
        <main>
          {/* Dedicated Current Auction / Live Auction Page Experience */}
          <CurrentAuctionPage
            watchlist={watchlist}
            searchQuery={searchTerm}
            initialAuctionId={currentRoute.initialAuctionId}
            initialTab={currentRoute.initialTab}
            onToggleWatchlist={handleToggleWatchlist}
            onOpenAuth={() => {
              setAuthMode('signin');
              setIsAuthOpen(true);
            }}
            onRequestConditionDossier={(lot: EnrichedLotItem) => {
              setActiveConditionEvent({
                id: lot.id,
                badge: 'SPECIMEN REPORT',
                badgeType: 'gold',
                lotsCount: 1,
                typeTag: lot.categoryTag,
                title: `${lot.lotNumber}: ${lot.title}`,
                description: lot.description,
                estimate: `Est. $${lot.estimateLow.toLocaleString()} – $${lot.estimateHigh.toLocaleString()}`,
                dateLabel: 'OFFICIAL DOSSIER',
                buttonText: 'SUBMIT REQUEST',
                buttonVariant: 'gold',
                image: lot.images[0]?.url || '/images/hero_coin.jpg'
              });
            }}
            onAddToast={addToast}
            onNavigate={handleNavigate}
          />
        </main>
      ) : currentRoute.view === 'email-list' ? (
        <EmailListPage
          onSubscribe={(email) => {
            addToast(
              'success',
              'Subscribed Successfully',
              `Advance catalog previews and auction notices will be forwarded to ${email}.`
            );
          }}
          onOpenAuth={() => {
            setAuthMode('signin');
            setIsAuthOpen(true);
          }}
        />
      ) : currentRoute.view === 'lot-detail' ? (
        <LotDetailPage
          lotId={currentRoute.lotId}
          auctionId={currentRoute.auctionId}
          onShowToast={addToast}
          onPlaceBid={(lot) => setActiveBiddingLot(lot)}
          onToggleWatchlist={handleToggleWatchlist}
          isWatchlisted={watchlist.includes(currentRoute.lotId)}
          liveTimeFormatted={timers[currentRoute.lotId]}
        />
      ) : currentRoute.view === 'auction-details' ? (
        <AuctionDetailsPage
          auctionId={currentRoute.auctionId}
          onShowToast={addToast}
          onNavigate={handleNavigate}
        />
      ) : currentRoute.view === 'catalog-lots' ? (
        <CatalogLotsPage
          auctionId={currentRoute.auctionId}
          onShowToast={addToast}
        />
      ) : currentRoute.view === 'catalogs' ? (
        <PastCatalogsPage onShowToast={addToast} />
      ) : currentRoute.view === 'profile' ? (
        <main id="main-content">
          <ProfilePage onNavigate={handleNavigate} onShowToast={addToast} />
        </main>
      ) : (
        <main id="main-content">
          {/* 2. Hero Section: Refined, elegant, showcasing certified gold and silver numismatics */}
          <Hero
            spotlightLot={spotlightLot}
            spotlightTimeFormatted={spotlightTimeFormatted}
            isWatchlisted={watchlist.includes(spotlightLot.id)}
            onToggleWatchlist={handleToggleWatchlist}
            onPlaceBid={(lot) => setActiveBiddingLot(lot)}
            onViewLot={(lot) => setActiveDetailLot(lot)}
          />

          {/* 3. Featured Auction Preview: Explore Our Auctions with Full Search, Filter, Sort, View Controls */}
          <section id="auctions" className="curated-events-section" aria-label="Explore Our Auctions">
            <div className="section-container container-fluid">
              {/* Section Header */}
              <div className="section-header-row">
                <div className="section-header-left">
                  <span className="section-eyebrow">CATALOG EXPLORER &amp; LIVE SESSIONS</span>
                  <h2 className="section-main-title">Explore Current Auctions</h2>
                  <p className="section-subtitle">
                    Browse certified signature sales, search live inventory, and inspect rare specimens closing today.
                  </p>
                </div>

                <a
                  href="#catalogs"
                  className="view-calendar-link"
                  title="Browse past completed auctions"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = '#catalogs';
                  }}
                >
                  <span>Browse Completed Catalogs</span>
                  <ArrowRight size={16} />
                </a>
              </div>

              {/* Auction Search & View Controls (Row 1, Row 2, Row 3) */}
              <AuctionSearchControls
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                onSearchSubmit={() => {
                  addToast('info', 'Search Filter Applied', `Showing results for "${searchTerm || 'all items'}"`);
                }}
                onClearSearch={handleClearSearch}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                categories={CATEGORIES}
                browsingMode={browsingMode}
                onBrowsingModeChange={handleBrowsingModeChange}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                resultCount={browsingMode === 'auctions' ? filteredEvents.length : paginatedLots.length}
                totalCount={totalCount}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />

              {/* Active View: AUCTIONS */}
              {browsingMode === 'auctions' && (
                <>
                  {filteredEvents.length === 0 ? (
                    <div className="empty-results-box" style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '16px' }}>
                        No auction sessions match your current search and category criteria.
                      </p>
                      <button
                        type="button"
                        className="btn-event-gold"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('all');
                        }}
                      >
                        Reset Filter Criteria
                      </button>
                    </div>
                  ) : (
                    <div className="events-grid">
                      {filteredEvents.map((event) => {
                        const getBadgeClass = () => {
                          if (event.badgeType === 'red') return 'badge-live-red';
                          if (event.badgeType === 'green') return 'badge-status-green';
                          return 'badge-gold-gold';
                        };

                        const handleEventNavigate = () => {
                          window.location.hash = event.detailUrl || '#auctions';
                        };

                        return (
                          <div key={event.id} className="event-card">
                            <div
                              className="event-card-media"
                              onClick={handleEventNavigate}
                              role="button"
                              tabIndex={0}
                            >
                              <img
                                src={event.image || '/images/hero_coin.jpg'}
                                alt={event.title}
                                className="event-img"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/images/hero_coin.jpg';
                                }}
                              />
                              <div className="event-badges-overlay">
                                <span className={`event-badge-pill ${getBadgeClass()}`}>{event.badge}</span>
                                <span className="event-lots-pill">{event.lotsCount} LOTS</span>
                              </div>
                            </div>

                            <div className="event-card-body">
                              <div className="event-type-tag">{event.typeTag}</div>
                              <h3
                                className="event-title"
                                onClick={() => {
                                  window.location.hash = `#auction/${event.id}`;
                                }}
                                role="button"
                                tabIndex={0}
                                style={{ cursor: 'pointer' }}
                              >
                                {event.title}
                              </h3>
                              <p className="event-description">{event.description}</p>

                              <div className="event-card-footer">
                                <div className="event-estimate-meta">
                                  <span className="estimate-label">{event.dateLabel}</span>
                                  <span className="estimate-val">{event.estimate}</span>
                                </div>

                                <div className="event-cta-btn-wrap">
                                  {event.buttonVariant === 'dark' && (
                                    <button
                                      type="button"
                                      className="btn-event-dark"
                                      onClick={handleEventNavigate}
                                    >
                                      <span>{event.buttonText}</span>
                                    </button>
                                  )}
                                  {event.buttonVariant === 'gold' && (
                                    <button
                                      type="button"
                                      className="btn-event-gold"
                                      onClick={handleEventNavigate}
                                    >
                                      <span>{event.buttonText}</span>
                                    </button>
                                  )}
                                  {event.buttonVariant === 'outline' && (
                                    <button
                                      type="button"
                                      className="btn-event-outline"
                                      onClick={() => setActiveConditionEvent(event)}
                                    >
                                      <span>{event.buttonText}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Active View: LOTS (Grid or List Layout) */}
              {browsingMode === 'lots' && (
                <>
                  {paginatedLots.length === 0 ? (
                    <div className="empty-results-box" style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '16px' }}>
                        No individual lots match your current search and category criteria.
                      </p>
                      <button
                        type="button"
                        className="btn-event-gold"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('all');
                        }}
                      >
                        Reset Filter Criteria
                      </button>
                    </div>
                  ) : displayMode === 'grid' ? (
                    <div className="lots-grid" style={{ marginTop: '24px' }}>
                      {paginatedLots.map((lot) => {
                        const isWatchlisted = watchlist.includes(lot.id);
                        const timeRemaining = timers[lot.id] || 'Closing Soon';

                        return (
                          <div key={lot.id} className="lot-card">
                            <div className="lot-card-media" onClick={() => setActiveDetailLot(lot)}>
                              <img src={lot.image} alt={lot.title} className="lot-img" />
                              <div className="lot-badges-overlay">
                                <span className="lot-number-badge">{lot.lotNumber}</span>
                                <span className="lot-timer-badge">
                                  <Clock size={12} />
                                  <span>{timeRemaining}</span>
                                </span>
                              </div>
                              <button
                                className={`lot-card-bookmark-btn ${isWatchlisted ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleWatchlist(lot.id);
                                }}
                                title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                aria-label="Bookmark Lot"
                              >
                                <Bookmark size={15} fill={isWatchlisted ? '#cba135' : 'none'} />
                              </button>
                            </div>

                            <div className="lot-card-body">
                              <span className="lot-category-tag">{lot.categoryTag}</span>
                              <h3 className="lot-title" onClick={() => setActiveDetailLot(lot)}>
                                {lot.title}
                              </h3>
                              <p className="lot-brief-note">{lot.description}</p>

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

                              <button
                                className="btn-instant-bid"
                                onClick={() => handleInstantBidDirect(lot)}
                              >
                                <Zap size={15} />
                                <span>⚡ INSTANT BID ${lot.nextBid.toLocaleString()}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="lots-list-view">
                      {paginatedLots.map((lot) => {
                        const isWatchlisted = watchlist.includes(lot.id);
                        const timeRemaining = timers[lot.id] || 'Closing Soon';

                        return (
                          <div key={lot.id} className="lot-list-card">
                            <div className="list-card-media" onClick={() => setActiveDetailLot(lot)}>
                              <img src={lot.image} alt={lot.title} className="list-card-img" />
                              <div className="lot-badges-overlay">
                                <span className="lot-number-badge">{lot.lotNumber}</span>
                                <span className="lot-timer-badge">
                                  <Clock size={12} />
                                  <span>{timeRemaining}</span>
                                </span>
                              </div>
                              <button
                                className={`lot-card-bookmark-btn ${isWatchlisted ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleWatchlist(lot.id);
                                }}
                                title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                aria-label="Bookmark Lot"
                              >
                                <Bookmark size={15} fill={isWatchlisted ? '#cba135' : 'none'} />
                              </button>
                            </div>

                            <div className="list-card-body">
                              <div className="list-info-col">
                                <span className="list-lot-tag">{lot.categoryTag}</span>
                                <h3 className="list-lot-title" onClick={() => setActiveDetailLot(lot)}>
                                  {lot.title}
                                </h3>
                                <p className="list-lot-desc">{lot.description}</p>
                                <div className="list-lot-provenance">Provenance: {lot.provenance}</div>
                              </div>

                              <div className="list-actions-col">
                                <div className="list-bid-data">
                                  <span className="list-bid-label">CURRENT HIGH BID</span>
                                  <span className="list-bid-val">
                                    ${lot.currentBid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="list-bids-count">{lot.bidsCount} bids · Reserve Met</span>
                                </div>

                                <div className="list-btn-group">
                                  <button
                                    type="button"
                                    className="btn-list-instant"
                                    onClick={() => handleInstantBidDirect(lot)}
                                  >
                                    <Zap size={14} />
                                    <span>INSTANT BID ${lot.nextBid.toLocaleString()}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-list-inspect"
                                    onClick={() => setActiveDetailLot(lot)}
                                  >
                                    <Eye size={13} />
                                    <span>INSPECT SPECIMEN</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Active View: SALESROOM MAP */}
              {browsingMode === 'map' && (
                <div className="salesroom-map-card">
                  <div className="map-card-header">
                    <div>
                      <h3 className="map-title">Salesroom Floorplan &amp; Exhibition Galleries</h3>
                      <div className="map-address-banner">
                        <MapPin size={16} color="#cba135" />
                        <span>4200 Commercial Boulevard, Suite 100, Pittsburgh, PA 15201</span>
                      </div>
                    </div>
                    <div className="past-auctions-meta-tag">
                      <Building size={14} />
                      <span>Security Cleared Facilities</span>
                    </div>
                  </div>

                  <div className="floorplan-zones-grid">
                    <div className="zone-box">
                      <span className="zone-num">ZONE 01 · SECURE SALOON</span>
                      <h4 className="zone-heading">Vault &amp; Certified Numismatics Gallery</h4>
                      <p className="zone-desc">
                        Climate-controlled museum cases with 10x-30x stereo binocular microscopes, PCGS &amp; NGC slab verification terminals, and investment gold bullion weighing scales.
                      </p>
                    </div>

                    <div className="zone-box">
                      <span className="zone-num">ZONE 02 · PRIVATE SALON</span>
                      <h4 className="zone-heading">Fine Jewelry &amp; Horology Exhibition</h4>
                      <p className="zone-desc">
                        Diamond colorimeter, refractometer inspection desks, vintage pocket watch timing counters, and private collector viewing booths for estate silver services.
                      </p>
                    </div>

                    <div className="zone-box">
                      <span className="zone-num">ZONE 03 · MAIN AMPHITHEATER</span>
                      <h4 className="zone-heading">Main Podium &amp; Live Clerking Desk</h4>
                      <p className="zone-desc">
                        Tiered gallery seating, dual HD projection screens, telephone clerk bank, and fast-track paddle registration desk for certified in-person bidders.
                      </p>
                    </div>
                  </div>

                  <div className="map-visitation-bar">
                    <div className="visit-info-left">
                      <div className="visit-meta-item">
                        <Clock size={15} />
                        <span>Inspection Hours: <strong>Mon–Fri 9am–5pm</strong> (Auction Day from 8am)</span>
                      </div>
                      <div className="visit-meta-item">
                        <Phone size={15} />
                        <span>Concierge Desk: <strong>(412) 555-0199</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-directions"
                      onClick={() => addToast('info', 'Driving Directions', 'Navigation coordinates sent: 4200 Commercial Blvd, Pittsburgh, PA.')}
                    >
                      <Compass size={15} />
                      <span>GET DRIVING DIRECTIONS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4. Live Bidding Desk: Real-time closing soon lots (featured when browsing auctions) */}
          {browsingMode === 'auctions' && (
            <LiveBiddingDesk
              lots={filteredSortedLots.slice(0, 4)}
              timers={timers}
              watchlist={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
              onInstantBid={handleInstantBidDirect}
              onViewLot={(lot) => setActiveDetailLot(lot)}
              onManualRefresh={triggerRefresh}
              isRefreshing={isRefreshing}
            />
          )}

          {/* 5. Past Auctions Section: Catalogs & Realized Hammer Prices */}
          <PastAuctionsSection
            onNavigate={handleNavigate}
            onInquirePast={(title) => {
              addToast('info', 'Catalog Archive Request', `Archive details and realized price sheet requested for ${title}.`);
            }}
          />

          {/* 6. Understated Trust Section: 3 Verified Legitimacy Points */}
          <TrustSection />
        </main>
      )}

      {/* 8. Refined Compact Luxury Footer (rendered across pages) */}
      {(currentRoute.view === 'home' ||
        currentRoute.view === 'current-auction' ||
        currentRoute.view === 'email-list' ||
        currentRoute.view === 'catalogs' ||
        currentRoute.view === 'profile' ||
        currentRoute.view === 'auction-details' ||
        currentRoute.view === 'catalog-lots' ||
        currentRoute.view === 'lot-detail') && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Floating Watchlist Button for Easy Access (rendered on Home only) */}
      {currentRoute.view === 'home' && watchlist.length > 0 && (
        <button
          className="floating-watchlist-pill"
          onClick={() => setIsWatchlistOpen(true)}
          title="View Monitored Lots"
          aria-label="View Monitored Lots"
        >
          <Bookmark size={16} />
          <span>Monitored Lots ({watchlist.length})</span>
        </button>
      )}

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
        onClose={() => {
          setIsAuthOpen(false);
          const h = window.location.hash.toLowerCase();
          if (h === '#signin' || h === '#login' || h === '#signup' || h === '#register') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
        initialMode={authMode}
        onLoginSuccess={(name: string) => {
          addToast('success', `Welcome, ${name}!`, 'Bidder credentials verified for live session participation.');
        }}
      />

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
