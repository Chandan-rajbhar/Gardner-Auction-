import React, { useState, useMemo, useEffect } from 'react';
import './CurrentAuctionPage.css';
import {
  Search, Heart, X, ChevronDown, ChevronLeft, ChevronRight, Gavel, Diamond, Lock, Percent, FileCheck,
  Volume2, VolumeX, Shield, Radio, ZoomIn, RotateCw, Maximize2, Feather, User, Users, Phone, Truck, Crown,
  Sun, Moon, ArrowUp, ArrowLeft, Calendar, MapPin, Clock, Sparkles, Layers
} from 'lucide-react';
import type { EnrichedLotItem } from './types';
import { supabase } from '../../lib/supabase';

interface CurrentAuctionPageProps {
  watchlist: string[];
  searchQuery?: string;
  onToggleWatchlist: (lotId: string) => void;
  onOpenAuth: () => void;
  onRequestConditionDossier?: (lot: EnrichedLotItem) => void;
  onAddToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

import {
  INITIAL_CATALOG_LOTS,
  CURRENT_AUCTIONS
} from '../../data/currentAuctionData';
import type {
  BidEntry,
  CategoryKey,
  CatalogLot,
  CurrentAuction
} from '../../data/currentAuctionData';

export { INITIAL_CATALOG_LOTS, CURRENT_AUCTIONS };
export type { BidEntry, CategoryKey, CatalogLot, CurrentAuction };

export interface ActiveAuctionCardItem {
  id: string;
  code: string;
  title: string;
  sessionTitle: string;
  category: string;
  description: string;
  status: 'Live Webcast Auction' | 'Closing Today' | 'Catalog Open' | 'Upcoming';
  badge: string;
  badgeType: 'red' | 'green' | 'gold';
  lotsCount: number;
  endsAtText: string;
  estimate: string;
  image: string;
  platform: string;
  lots?: CatalogLot[];
}

export const INITIAL_ACTIVE_AUCTIONS: ActiveAuctionCardItem[] = [
  {
    id: 'auc-spring',
    code: 'AUC-SPRING',
    title: 'Spring Collector Auction',
    sessionTitle: 'Session II: Rarities of the United States Mint',
    category: 'Coins & Currency',
    status: 'Live Webcast Auction',
    badge: 'LIVE WEBCAST',
    badgeType: 'red',
    lotsCount: 15,
    endsAtText: 'Ends Today • 4:30 PM EST',
    estimate: 'Est. $840,000 – $1,140,000',
    image: '/images/hero_coin.jpg',
    platform: 'HiBid & Live Rostrum Simulcast',
    description: 'Featuring certified private vault numismatics including 1924 Saint-Gaudens Double Eagle and 1889 Morgan Silver Dollar with verified CAC gold shields.',
    lots: INITIAL_CATALOG_LOTS
  },
  {
    id: 'auc-002',
    code: 'HGS-2026-10-22',
    title: 'Highlander Gold & Silver 10/22/26',
    sessionTitle: 'Session I: Fine Gold & Silver Bullion',
    category: 'Rare US Gold & Bullion',
    status: 'Closing Today',
    badge: 'CLOSING TODAY',
    badgeType: 'gold',
    lotsCount: 272,
    endsAtText: 'Ends Oct 22 • 7:00 PM MT',
    estimate: 'Est. $1,420,000 – $2,100,000',
    image: '/images/hero_coin.jpg',
    platform: 'HiBid Online Only Store',
    description: 'Fine investment bullion, historic pre-1933 US gold double eagles, and high-grade Carson City Morgan silver dollars from private vaults.',
    lots: INITIAL_CATALOG_LOTS.filter((l) => l.categoryKey === 'coins')
  },
  {
    id: 'auc-001',
    code: 'GA-2026-10-GOLD',
    title: 'Rolex, Fine Jewelry & Historic Numismatics',
    sessionTitle: 'Session III: Estate Diamonds & Luxury Watches',
    category: 'Jewelry & Watches',
    status: 'Catalog Open',
    badge: 'CATALOG OPEN',
    badgeType: 'green',
    lotsCount: 45,
    endsAtText: 'Ends Oct 25 • 8:00 PM EST',
    estimate: 'Est. $1,250,000 – $1,650,000',
    image: '/images/diamond_ring.jpg',
    platform: 'Gardner Saleroom Webcast',
    description: 'Curated certified estate jewelry, Old European diamond solitaires, and Swiss investment chronometers from prominent estate collections.',
    lots: INITIAL_CATALOG_LOTS.filter((l) => l.categoryKey === 'jewelry' || l.categoryKey === 'horology')
  }
];

export const CurrentAuctionPage: React.FC<CurrentAuctionPageProps> = ({
  watchlist,
  searchQuery,
  onToggleWatchlist,
  onAddToast
}) => {
  // Multi-Auction Selection State (Tarika 1: Multi-Auction Card Flow)
  const [activeAuctions, setActiveAuctions] = useState<ActiveAuctionCardItem[]>(INITIAL_ACTIVE_AUCTIONS);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [auctionSearch, setAuctionSearch] = useState<string>('');
  const [auctionFilter, setAuctionFilter] = useState<'all' | 'live' | 'closing' | 'open'>('all');

  const [lots, setLots] = useState<CatalogLot[]>(INITIAL_CATALOG_LOTS);
  const [activeTab, setActiveTab] = useState<'all' | 'ending' | 'featured'>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'bids'>('recommended');
  const [localSearch, setLocalSearch] = useState<string>('');

  // Pagination State: 9 lots per page (3x3 grid)
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Scroll container reference for smooth internal products scrolling
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Active Lot for New Page Desktop View
  const [activeDetailLotId, setActiveDetailLotId] = useState<string | null>(null);

  // Selected Preset or Custom Bid inside Detail View
  const [selectedPresetInc, setSelectedPresetInc] = useState<number>(100);
  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);

  // Interactive View Lot Terminal States
  const [isLightTheme, setIsLightTheme] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [activeThumb, setActiveThumb] = useState<string>('primary view');
  const [stageZoom, setStageZoom] = useState<boolean>(false);
  const [stageRotated, setStageRotated] = useState<boolean>(false);

  // Countdown timer in seconds (starts at 74s = 01:14 matching user screenshot)
  const [timeLeft, setTimeLeft] = useState<number>(74);
  const [isBidFlashing, setIsBidFlashing] = useState<boolean>(false);

  // Time format helper: MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Decreasing live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Reset to 3 minutes for continuous live webcast simulation
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Live auction: current bid increases automatically every 8 to 11 seconds
  useEffect(() => {
    const paddles = ['Paddle #219', 'Paddle #404', 'Paddle #177', 'Paddle #328', 'Paddle #112', 'Paddle #489'];
    const types: BidEntry['type'][] = ['WEBCAST', 'FLOOR', 'PHONE'];
    const increments = [100, 200, 250, 500];

    const liveBidInterval = setInterval(() => {
      const targetLotId = activeDetailLotId || 'spotlight-104';
      const inc = increments[Math.floor(Math.random() * increments.length)];
      const paddle = paddles[Math.floor(Math.random() * paddles.length)];
      const type = types[Math.floor(Math.random() * types.length)];

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setLots((prevLots) =>
        prevLots.map((lot) => {
          if (lot.id === targetLotId) {
            const newAmount = lot.currentBid + inc;
            const newBid: BidEntry = {
              id: Date.now().toString(),
              paddle: paddle,
              type: type,
              time: `${timeStr} · live bid`,
              amount: newAmount,
              isHighest: true
            };

            const updatedRecent = [
              newBid,
              ...lot.recentBids.map((b) => ({ ...b, isHighest: false }))
            ].slice(0, 5);

            return {
              ...lot,
              currentBid: newAmount,
              bidsCount: lot.bidsCount + 1,
              recentBids: updatedRecent
            };
          }
          return lot;
        })
      );

      // Flash bid element
      setIsBidFlashing(true);
      setTimeout(() => setIsBidFlashing(false), 1200);
    }, 8500);

    return () => clearInterval(liveBidInterval);
  }, [activeDetailLotId]);

  const activeDetailLot = useMemo(() => {
    if (!activeDetailLotId) return null;
    return lots.find((l) => l.id === activeDetailLotId) || null;
  }, [lots, activeDetailLotId]);

  // When opening a detail view, initialize preset and input
  useEffect(() => {
    if (activeDetailLot) {
      const defaultInc = activeDetailLot.presets[0] || 100;
      setSelectedPresetInc(defaultInc);
      setCustomBidInput((activeDetailLot.currentBid + defaultInc).toString());
      setBidError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeDetailLotId]);

  // Reset currentPage to 1 and scroll position smoothly to catalog top whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      if (rect.top < 80) {
        window.scrollTo({
          top: window.scrollY + rect.top - 100,
          behavior: 'smooth'
        });
      }
    }
  }, [activeTab, localSearch, searchQuery, sortBy]);

  // Search query sync from header if passed
  const effectiveSearch = localSearch || searchQuery || '';

  function mapCategoryToKey(cat?: string): CategoryKey {
    if (!cat) return 'coins';
    const c = cat.toLowerCase();
    if (c.includes('coin') || c.includes('gold') || c.includes('silver') || c.includes('currency') || c.includes('numismatic')) return 'coins';
    if (c.includes('jewel') || c.includes('diamond') || c.includes('ring')) return 'jewelry';
    if (c.includes('art') || c.includes('paint') || c.includes('print')) return 'art';
    if (c.includes('antique')) return 'antiques';
    if (c.includes('watch') || c.includes('horolog') || c.includes('clock')) return 'horology';
    if (c.includes('americana') || c.includes('manuscript') || c.includes('document')) return 'americana';
    if (c.includes('decor') || c.includes('furniture')) return 'decorative';
    return 'coins';
  }

  const currentAuctionInfo = useMemo(() => {
    return activeAuctions.find((a) => a.id === selectedAuctionId) || activeAuctions[0];
  }, [activeAuctions, selectedAuctionId]);

  // 1. Fetch dynamic auctions from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadSupabaseAuctions() {
      try {
        const { data, error } = await supabase
          .from('auctions')
          .select('*')
          .order('start_date', { ascending: false });

        if (!error && data && data.length > 0 && isMounted) {
          const mappedFromDb: ActiveAuctionCardItem[] = data.map((row: any) => {
            const lotCount = row.day_stats?.lotCount || (Array.isArray(row.day_stats?.lotStats) ? row.day_stats.lotStats.length : 0) || 12;
            const status = row.status === 'In Progress' ? 'Live Webcast Auction' : row.status === 'Open' ? 'Catalog Open' : 'Closing Today';
            const badge = row.status === 'In Progress' ? 'LIVE WEBCAST' : row.status === 'Open' ? 'CATALOG OPEN' : 'CLOSING TODAY';
            const badgeType = row.status === 'In Progress' ? 'red' : row.status === 'Open' ? 'green' : 'gold';
            const img = (Array.isArray(row.featured_images) && row.featured_images[0]?.url) ? row.featured_images[0].url : '/images/hero_coin.jpg';

            return {
              id: row.id,
              code: row.code || `AUC-${row.id.toString().slice(-4)}`,
              title: row.name,
              sessionTitle: `${row.code || 'AUCTION'} Session`,
              category: row.auction_type === 'HiBid' ? 'HiBid Simulcast' : 'Catalog Auction',
              description: row.description || 'Premier curated collector items, verified authentic and certified.',
              status: status as any,
              badge,
              badgeType: badgeType as any,
              lotsCount: lotCount,
              endsAtText: row.end_date ? `Ends ${row.end_date}` : 'Closing Today',
              estimate: 'Est. $600,000 – $1,200,000',
              image: img,
              platform: row.auction_type || 'HiBid Simulcast'
            };
          });

          setActiveAuctions((prev) => {
            const dbIds = new Set(mappedFromDb.map((a) => a.id));
            const remainingCustom = prev.filter((a) => !dbIds.has(a.id));
            return [...mappedFromDb, ...remainingCustom];
          });
        }
      } catch (err) {
        console.warn('[CurrentAuctionPage] Supabase auctions fetch notice:', err);
      }
    }

    loadSupabaseAuctions();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch dynamic lots from Supabase when an auction is selected
  useEffect(() => {
    if (!selectedAuctionId) return;
    let isMounted = true;

    async function loadAuctionLots() {
      try {
        const { data, error } = await supabase
          .from('lots')
          .select('*')
          .eq('auction_id', selectedAuctionId)
          .order('lot_number', { ascending: true });

        if (!error && data && data.length > 0 && isMounted) {
          const converted: CatalogLot[] = data.map((d: any) => ({
            id: d.id,
            lotNumber: `LOT ${d.lot_number}`,
            categoryTag: (d.category || 'Coins & Currency').toUpperCase(),
            categoryKey: mapCategoryToKey(d.category),
            title: d.title,
            description: d.condition_report || d.title,
            currentBid: Number(d.current_bid) || Number(d.starting_bid) || 100,
            bidsCount: Number(d.bids_count) || 0,
            buttonVariant: 'gold',
            isEndingSoon: d.status === 'upcoming',
            isFeatured: true,
            artType: 'gold-slab',
            image: d.image || '/images/hero_coin.jpg',
            estimate: `$${Number(d.estimate_low || 1000).toLocaleString()} – $${Number(d.estimate_high || 2000).toLocaleString()}`,
            presets: [100, 250, 500],
            recentBids: [],
            sellerName: d.seller_name || d.seller || 'Estate Consignor #101',
            quantity: Number(d.quantity) || 1
          }));
          setLots(converted);
          return;
        }
      } catch (e) {
        console.warn('[CurrentAuctionPage] Supabase lots fetch notice:', e);
      }

      // Fallback to local lots if not found in Supabase
      const found = activeAuctions.find((a) => a.id === selectedAuctionId);
      if (found && found.lots && found.lots.length > 0) {
        setLots(found.lots);
      } else {
        setLots(INITIAL_CATALOG_LOTS);
      }
    }

    loadAuctionLots();
    return () => { isMounted = false; };
  }, [selectedAuctionId, activeAuctions]);

  // Filtered active auctions for the Multi-Auction view
  const filteredAuctions = useMemo(() => {
    return activeAuctions.filter((auc) => {
      const matchesSearch =
        !auctionSearch.trim() ||
        auc.title.toLowerCase().includes(auctionSearch.toLowerCase()) ||
        auc.code.toLowerCase().includes(auctionSearch.toLowerCase()) ||
        auc.category.toLowerCase().includes(auctionSearch.toLowerCase()) ||
        auc.description.toLowerCase().includes(auctionSearch.toLowerCase());

      const matchesFilter =
        auctionFilter === 'all' ||
        (auctionFilter === 'live' && (auc.status === 'Live Webcast Auction' || auc.badgeType === 'red')) ||
        (auctionFilter === 'closing' && (auc.status === 'Closing Today' || auc.badgeType === 'gold')) ||
        (auctionFilter === 'open' && (auc.status === 'Catalog Open' || auc.badgeType === 'green'));

      return matchesSearch && matchesFilter;
    });
  }, [activeAuctions, auctionSearch, auctionFilter]);

  // Filtered and Sorted Lots
  const filteredLots = useMemo(() => {
    let result = [...lots];

    if (activeTab === 'ending') {
      result = result.filter((l) => l.isEndingSoon);
    } else if (activeTab === 'featured') {
      result = result.filter((l) => l.isFeatured);
    }

    if (effectiveSearch.trim()) {
      const q = effectiveSearch.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.lotNumber.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.currentBid - b.currentBid);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.currentBid - a.currentBid);
    } else if (sortBy === 'bids') {
      result.sort((a, b) => b.bidsCount - a.bidsCount);
    }

    return result;
  }, [lots, activeTab, effectiveSearch, sortBy]);

  // Pagination calculations (6 lots per page)
  const totalPages = Math.ceil(filteredLots.length / ITEMS_PER_PAGE);
  const safeCurrentPage = totalPages > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;

  // Sliced lots to show only 6 cards per page
  const paginatedLots = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredLots.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLots, safeCurrentPage]);

  // Page change handler with smooth scroll to catalog top
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top - 120,
        behavior: 'smooth'
      });
    }
  };

  // Helper to generate pagination page numbers list (with ellipsis if large)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Handle Preset Click
  const handleSelectPreset = (inc: number, currentBid: number) => {
    setSelectedPresetInc(inc);
    setCustomBidInput((currentBid + inc).toString());
    setBidError(null);
  };

  // Handle Place Bid
  const handlePlaceBid = (lot: CatalogLot) => {
    const amount = parseInt(customBidInput, 10);
    if (!amount || isNaN(amount) || amount <= lot.currentBid) {
      setBidError(`Bid must be greater than current bid ($${lot.currentBid.toLocaleString()})`);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newBidEntry: BidEntry = {
      id: Date.now().toString(),
      paddle: 'Paddle #414',
      type: 'WEBCAST',
      time: `${timeStr} · highest bid`,
      amount: amount,
      isHighest: true
    };

    setLots((prev) =>
      prev.map((item) => {
        if (item.id === lot.id) {
          const updatedRecent = [
            newBidEntry,
            ...item.recentBids.map((b) => ({ ...b, isHighest: false }))
          ].slice(0, 5);

          return {
            ...item,
            currentBid: amount,
            bidsCount: item.bidsCount + 1,
            recentBids: updatedRecent
          };
        }
        return item;
      })
    );

    onAddToast(
      'success',
      'Bid Placed Successfully',
      `Your bid of $${amount.toLocaleString()} is now the leading bid on ${lot.lotNumber}.`
    );

    const defaultInc = lot.presets[0] || 100;
    setSelectedPresetInc(defaultInc);
    setCustomBidInput((amount + defaultInc).toString());
    setBidError(null);
  };



  const getBadgeClass = (type: BidEntry['type']) => {
    switch (type) {
      case 'WEBCAST':
        return 'badge-webcast';
      case 'FLOOR':
        return 'badge-floor';
      case 'PHONE':
        return 'badge-phone';
      default:
        return 'badge-default';
    }
  };



  // =========================================================================
  // VIEW LOT DETAIL VIEW (DESKTOP PAGE LAYOUT MATCHING USER SCREENSHOT)
  // =========================================================================
  if (activeDetailLot) {
    const currentInputVal = parseInt(customBidInput, 10) || (activeDetailLot.currentBid + (activeDetailLot.presets[0] || 100));
    const buyersPremiumAmount = Math.round(currentInputVal * 0.15);
    const hammerTotal = currentInputVal + buyersPremiumAmount;

    return (
      <div className={`cap-curated-page-root cap-terminal-root ${isLightTheme ? 'cap-theme-light' : 'cap-theme-dark'}`}>
        <div className="cap-terminal-wrapper">
          {/* Top Bar: Brand, Terminal Connected, Paddle info, Audio, Close button */}
          <header className="cap-terminal-topbar">
            <div className="cap-terminal-brand">
              <div className="cap-terminal-gold-icon">
                <Crown size={15} />
              </div>
              <div className="cap-terminal-brand-titles">
                <span className="cap-terminal-gallery-name">GARDNER AUCTIONS</span>
                <span className="cap-terminal-session-name">{currentAuctionInfo.title}</span>
              </div>
            </div>

            <div className="cap-terminal-status-pill">
              <span className="cap-pulse-green-dot" />
              <span className="cap-status-bold">Terminal Connected</span>
              <span className="cap-status-sep">·</span>
              <span className="cap-status-muted">Clerk Audio: Synchronized</span>
            </div>

            <div className="cap-terminal-top-actions">
              <div className="cap-terminal-paddle-badge">
                <span className="cap-paddle-lbl">Assigned Paddle:</span>
                <strong className="cap-paddle-val">#518-APP</strong>
                <span className="cap-paddle-divider">|</span>
                <span className="cap-paddle-lbl">Approved Limit:</span>
                <strong className="cap-paddle-val">$75,000</strong>
              </div>

              {/* Light / Dark Mode Quick Switcher */}
              <button
                type="button"
                className="cap-terminal-theme-btn"
                onClick={() => setIsLightTheme(!isLightTheme)}
                title={isLightTheme ? "Switch to Dark Theme" : "Switch to Light Theme"}
                aria-label="Toggle Theme Mode"
              >
                {isLightTheme ? <Moon size={14} /> : <Sun size={14} />}
                <span className="cap-theme-btn-text">{isLightTheme ? 'Dark Mode' : 'Light Mode'}</span>
              </button>

              <button
                type="button"
                className={`cap-terminal-icon-btn ${isAudioMuted ? 'muted' : ''}`}
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                aria-label="Toggle Clerk Audio"
              >
                {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              <button
                type="button"
                className="cap-terminal-close-btn"
                onClick={() => setActiveDetailLotId(null)}
                title="Back to Catalog"
                aria-label="Close Lot View"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Main Lot Banner Header: LOT Number, Session Title, Big Title, Subtitle, Live Timer, Cam */}
          <div className="cap-terminal-lot-header">
            <div className="cap-lot-header-left">
              <div className="cap-lot-tags-row">
                <span className="cap-lot-pill-gold">{activeDetailLot.lotNumber}</span>
                <span className="cap-lot-cat-breadcrumb">{currentAuctionInfo.title.toUpperCase()}</span>
                <span className="cap-lot-seller-badge">
                  <User size={12} className="cap-seller-icon" />
                  Seller: <strong>{activeDetailLot.sellerName || 'Estate Consignor #101'}</strong>
                </span>
                <span className="cap-reserve-met-badge">
                  <Shield size={12} className="cap-shield-icon" />
                  Cataloged &amp; Verified
                </span>
              </div>

              <h1 className="cap-terminal-lot-title">{activeDetailLot.title}</h1>
              <p className="cap-terminal-lot-sub">
                {activeDetailLot.description}
              </p>
            </div>

            <div className="cap-lot-header-right">
              <div className="cap-live-floor-box">
                <span className="cap-red-pulse-dot" />
                <span className="cap-live-floor-label">LIVE LOT FLOOR</span>
                <span className="cap-live-floor-timer">{formatTime(timeLeft)}</span>
              </div>

              <button
                type="button"
                className="cap-floor-cam-btn"
                onClick={() => onAddToast('info', 'Floor Cam Stream', 'Connecting to high-definition main ballroom floor camera feed...')}
              >
                <Radio size={14} className="cap-cam-icon" />
                Floor Cam HD
              </button>
            </div>
          </div>

          {/* Two-Column Grid: Left (Stage, Dossier, Chart) | Right (Live Bid Console, Recent Bids) */}
          <div className="cap-terminal-grid">
            {/* Left Column (Approx 58% width) */}
            <div className="cap-terminal-col-left">
              {/* Card 1: Interactive Stage */}
              <div className="cap-terminal-card cap-stage-card">
                <div className="cap-stage-viewport">
                  {/* Stage Top Controls Overlay */}
                  <div className="cap-stage-overlay-top">
                    <span className="cap-pcgs-badge">
                      <Shield size={12} />
                      AUTHENTICATED LOT
                    </span>
                    <span className="cap-cert-pill">LOT #{activeDetailLot.lotNumber}</span>

                    <div className="cap-stage-tools">
                      <button
                        type="button"
                        className="cap-stage-tool-btn"
                        onClick={() => setStageZoom(!stageZoom)}
                        title="Zoom Image"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        className="cap-stage-tool-btn"
                        onClick={() => setStageRotated(!stageRotated)}
                        title="Rotate / Flip View"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        type="button"
                        className="cap-stage-tool-btn"
                        onClick={() => onAddToast('info', 'High Res View', 'Opening ultra-high resolution inspection viewer.')}
                        title="Inspect"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Lot Authentic Image */}
                  <div className={`cap-stage-img-frame ${stageZoom ? 'zoomed' : ''} ${stageRotated ? 'rotated' : ''}`}>
                    <img
                      src={activeDetailLot.image}
                      alt={activeDetailLot.title}
                      className="cap-terminal-main-image"
                    />
                  </div>

                  {/* Stage Bottom Controls Overlay */}
                  <div className="cap-stage-overlay-bottom">
                    <span className="cap-drag-hint">👆 Interactive High-Resolution Inspection</span>
                    <span className="cap-nfc-tag">
                      <Shield size={12} />
                      GARDNER VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: LOT DOSSIER & SPECIFICATIONS */}
              <div className="cap-terminal-card cap-dossier-card">
                <div className="cap-dossier-header">
                  <div className="cap-dossier-title-wrap">
                    <Feather size={15} className="cap-gold-quill-icon" />
                    <span className="cap-dossier-title">LOT SPECIFICATIONS &amp; DESCRIPTION</span>
                  </div>
                </div>

                <div className="cap-dossier-narrative">
                  <p>
                    {activeDetailLot.description || `Cataloged lot ${activeDetailLot.lotNumber} for ${currentAuctionInfo.title}. Verified authentic and available for immediate bidding.`}
                  </p>
                </div>

                <div className="cap-dossier-metrics-grid">
                  <div className="cap-spec-box">
                    <span className="cap-spec-label">LOT NUMBER</span>
                    <strong className="cap-spec-val">{activeDetailLot.lotNumber}</strong>
                    <span className="cap-spec-sub">Catalog ID</span>
                  </div>

                  <div className="cap-spec-box">
                    <span className="cap-spec-label">SELLER / CONSIGNOR</span>
                    <strong className="cap-spec-val cap-gold-accent">{activeDetailLot.sellerName || 'Estate Consignor #101'}</strong>
                    <span className="cap-spec-sub">Verified Consignment</span>
                  </div>

                  <div className="cap-spec-box">
                    <span className="cap-spec-label">QUANTITY</span>
                    <strong className="cap-spec-val">{activeDetailLot.quantity || 1} Item</strong>
                    <span className="cap-spec-sub">Complete Lot</span>
                  </div>

                  <div className="cap-spec-box">
                    <span className="cap-spec-label">CATALOG STATUS</span>
                    <strong className="cap-spec-val cap-green-accent">Live Catalog</strong>
                    <span className="cap-spec-sub">Open for Bidding</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Approx 42% width) */}
            <div className="cap-terminal-col-right">
              {/* Card 1: Live Bidding Console */}
              <div className="cap-terminal-card cap-console-card">
                <div className="cap-console-top-row">
                  <div className="cap-console-bid-block">
                    <span className="cap-console-lbl">CURRENT HIGH BID</span>
                    <div className="cap-console-price-row">
                      <span className={`cap-console-price ${isBidFlashing ? 'bid-flash' : ''}`}>
                        ${activeDetailLot.currentBid.toLocaleString()}
                      </span>
                      <span className="cap-winning-floor-pill">Winning: Floor #219</span>
                    </div>
                  </div>

                  <div className="cap-console-inc-block">
                    <span className="cap-console-lbl">NEXT MIN INCREMENT</span>
                    <strong className="cap-inc-val">+$100</strong>
                  </div>
                </div>

                {/* Quick Increment Pre-Select Buttons */}
                <div className="cap-console-increments-section">
                  <span className="cap-console-sec-title">QUICK INCREMENT PRE-SELECT</span>
                  <div className="cap-quick-increments-grid">
                    {[100, 250, 500].map((inc) => {
                      const targetAmt = activeDetailLot.currentBid + inc;
                      const isSelected = selectedPresetInc === inc && parseInt(customBidInput, 10) === targetAmt;

                      return (
                        <button
                          key={inc}
                          type="button"
                          className={`cap-quick-inc-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectPreset(inc, activeDetailLot.currentBid)}
                        >
                          <span className="cap-inc-add">+ ${inc}</span>
                          <strong className="cap-inc-total">${targetAmt.toLocaleString()}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bid Input & PLACE LIVE BID Button */}
                <div className="cap-console-cta-row">
                  <div className="cap-bid-input-container">
                    <span className="cap-input-dollar-sign">$</span>
                    <input
                      type="number"
                      value={customBidInput}
                      onChange={(e) => {
                        setCustomBidInput(e.target.value);
                        setSelectedPresetInc(0);
                        setBidError(null);
                      }}
                      className="cap-console-number-input"
                      aria-label="Custom Bid Amount"
                    />
                  </div>

                  <button
                    type="button"
                    className="cap-place-live-bid-btn"
                    onClick={() => handlePlaceBid(activeDetailLot)}
                  >
                    PLACE LIVE BID
                    <Gavel size={16} className="cap-btn-gavel-icon" />
                  </button>
                </div>

                {bidError && <div className="cap-bid-error-msg">{bidError}</div>}

                {/* Buyer's Premium & Total Box */}
                <div className="cap-console-totals-box">
                  <div className="cap-total-row">
                    <span>Buyer's Premium (15%):</span>
                    <strong>${buyersPremiumAmount.toLocaleString()}</strong>
                  </div>
                  <div className="cap-total-row highlight">
                    <span>Total Due at Hammer:</span>
                    <strong className="cap-hammer-val">${hammerTotal.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="cap-legal-disclaimer">
                  ⚖️ Bids are legally binding. Certified funds required within 7 days.
                </div>
              </div>

              {/* Card 2: RECENT BIDS • FLOOR & REMOTE Feed */}
              <div className="cap-terminal-card cap-live-feed-card">
                <div className="cap-feed-header">
                  <div className="cap-feed-title-left">
                    <span className="cap-pulse-green-dot" />
                    <span className="cap-feed-title">RECENT BIDS • FLOOR &amp; REMOTE</span>
                  </div>
                  <span className="cap-feed-counter">Total: 24 bids</span>
                </div>

                <div className="cap-feed-list">
                  {activeDetailLot.recentBids.map((b, idx) => {
                    const isTop = idx === 0 || b.isHighest;

                    return (
                      <div key={b.id} className={`cap-feed-item ${isTop ? 'winning' : ''}`}>
                        <div className={`cap-feed-icon ${isTop ? 'gold-phone' : (b.type === 'PHONE' ? 'muted-phone' : b.type === 'FLOOR' ? 'muted-users' : 'muted-webcast')}`}>
                          {b.type === 'PHONE' ? <Phone size={isTop ? 15 : 14} /> : b.type === 'FLOOR' ? <Users size={14} /> : <Radio size={14} />}
                        </div>
                        <div className="cap-feed-mid">
                          <div className="cap-feed-paddle-row">
                            <strong className="cap-feed-paddle">{b.paddle}</strong>
                            <span className={`cap-type-pill ${getBadgeClass(b.type)}`}>{b.type}</span>
                          </div>
                          <span className="cap-feed-time">{b.time}</span>
                        </div>
                        <div className="cap-feed-right">
                          <span className={`cap-feed-amount ${isTop ? 'gold' : ''}`}>${b.amount.toLocaleString()}</span>
                          {isTop && <span className="cap-high-bidder-tag">HIGH BIDDER</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Protocol Banner & Security Badges */}
          <div className="cap-terminal-protocol-banner">
            <div className="cap-protocol-notice-row">
              <span className="cap-gold-dot">•</span>
              <strong className="cap-protocol-lead">LIVE AUCTION PROTOCOL</strong>
              <span className="cap-protocol-body">
                Bid activity and hammer figures update with sub-second latency. Bidder identities are masked for discretion.
              </span>
            </div>

            <div className="cap-protocol-badges-row">
              <span className="cap-proto-badge">
                <Lock size={13} className="cap-badge-ico" />
                TLS 1.3 256-bit Encrypted
              </span>
              <span className="cap-proto-badge">
                <Shield size={13} className="cap-badge-ico" />
                100% PCGS Authenticity Guarantee
              </span>
              <span className="cap-proto-badge">
                <Truck size={13} className="cap-badge-ico" />
                Vaulting &amp; Armored Transit
              </span>
            </div>
          </div>

          {/* Bottom Meta Bar */}
          <footer className="cap-terminal-meta-footer">
            <div className="cap-meta-col-left">
              <span>Session: <strong>{currentAuctionInfo.title}</strong></span>
              <span className="cap-meta-pipe">|</span>
              <span>Auctioneer: <strong>M. Sterling (Lic #84210)</strong></span>
            </div>
            <div className="cap-meta-col-right">
              <span>Time Zone: <strong>Eastern Time (ET UTC-5)</strong></span>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MULTI-AUCTION OVERVIEW VIEW (Tarika 1: Multi-Auction Card Flow)
  // Shown when buyer clicks "CURRENT AUCTIONS" before picking an auction
  // =========================================================================
  if (!selectedAuctionId) {
    return (
      <div className="cap-curated-page-root">
        <div className="cap-page-container">
          <div className="cap-auctions-overview-section">
            {/* Hero Header */}
            <header className="cap-auctions-overview-header">
              <div className="cap-auctions-header-text">
                <span className="cap-auctions-header-tag">
                  <Sparkles size={14} color="#dfba52" />
                  CURRENT AUCTIONS
                </span>
                <h1 className="cap-auctions-header-title">Active &amp; Upcoming Auction Sessions</h1>
                <p className="cap-auctions-header-sub">
                  Select an active catalog session below to explore curated rare lots, view live estimates, and submit advance bids.
                </p>
              </div>

              <div className="cap-hero-search-wrap" style={{ maxWidth: 360, width: '100%' }}>
                <Search size={16} className="cap-search-icon" />
                <input
                  type="text"
                  value={auctionSearch}
                  onChange={(e) => setAuctionSearch(e.target.value)}
                  placeholder="Search auctions by title or code..."
                  className="cap-hero-search-input"
                />
                {auctionSearch && (
                  <button
                    type="button"
                    className="cap-search-clear-btn"
                    onClick={() => setAuctionSearch('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </header>

            {/* Filter Pills Bar */}
            <div className="cap-auctions-controls-bar">
              <div className="cap-auctions-filter-pills">
                <button
                  type="button"
                  className={`cap-auction-filter-pill ${auctionFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setAuctionFilter('all')}
                >
                  <span>All Active Sessions</span>
                  <span className="cap-auction-pill-badge">{activeAuctions.length}</span>
                </button>
                <button
                  type="button"
                  className={`cap-auction-filter-pill ${auctionFilter === 'live' ? 'active' : ''}`}
                  onClick={() => setAuctionFilter('live')}
                >
                  <span className="cap-pulse-dot-red" />
                  <span>Live Webcasts</span>
                </button>
                <button
                  type="button"
                  className={`cap-auction-filter-pill ${auctionFilter === 'closing' ? 'active' : ''}`}
                  onClick={() => setAuctionFilter('closing')}
                >
                  <span>Closing Soon</span>
                </button>
                <button
                  type="button"
                  className={`cap-auction-filter-pill ${auctionFilter === 'open' ? 'active' : ''}`}
                  onClick={() => setAuctionFilter('open')}
                >
                  <span>Catalog Open</span>
                </button>
              </div>

              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                Showing <strong>{filteredAuctions.length}</strong> active auction events
              </div>
            </div>

            {/* Active Auctions Cards Grid */}
            <div className="cap-auctions-grid">
              {filteredAuctions.map((auction) => (
                <div key={auction.id} className="cap-auction-card">
                  <div>
                    {/* Media Banner */}
                    <div
                      className="cap-auction-card-media"
                      onClick={() => setSelectedAuctionId(auction.id)}
                    >
                      <img
                        src={auction.image}
                        alt={auction.title}
                        className="cap-auction-card-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/images/hero_coin.jpg';
                        }}
                      />
                      <div className="cap-auction-media-overlay" />
                      <div className="cap-auction-card-badges">
                        {auction.badgeType === 'red' ? (
                          <span className="cap-status-pill-live">
                            <span className="cap-pulse-dot-red" />
                            {auction.badge}
                          </span>
                        ) : auction.badgeType === 'green' ? (
                          <span className="cap-status-pill-open">
                            {auction.badge}
                          </span>
                        ) : (
                          <span className="cap-status-pill-closing">
                            {auction.badge}
                          </span>
                        )}

                        <span className="cap-auction-lots-pill">
                          {auction.lotsCount} LOTS
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="cap-auction-card-body">
                      <div className="cap-auction-code-row">
                        <span className="cap-auction-card-code">{auction.code}</span>
                        <span className="cap-auction-card-category">{auction.category}</span>
                      </div>

                      <h3
                        className="cap-auction-card-title"
                        onClick={() => setSelectedAuctionId(auction.id)}
                      >
                        {auction.title}
                      </h3>

                      <p className="cap-auction-card-desc">
                        {auction.description}
                      </p>

                      <div className="cap-auction-card-meta">
                        <div className="cap-meta-row-item">
                          <Clock size={14} className="cap-meta-ico" />
                          <span>{auction.endsAtText}</span>
                        </div>
                        <div className="cap-meta-row-item">
                          <Layers size={14} className="cap-meta-ico" />
                          <span>Platform: <strong>{auction.platform}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer CTA Button */}
                  <div className="cap-auction-card-footer">
                    <button
                      type="button"
                      className="cap-btn-browse-catalog"
                      onClick={() => setSelectedAuctionId(auction.id)}
                    >
                      <span>Browse Catalog</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CATALOG COLLECTION GRID VIEW (WITH EXPANDED PRODUCT TYPES & VIEW MORE)
  // Shown when an auction is selected from the Active Auctions list
  // =========================================================================
  return (
    <div className="cap-curated-page-root">
      <div className="cap-page-container">
        {/* Breadcrumb Bar to return to All Current Auctions */}
        <div className="cap-catalog-breadcrumb-bar">
          <button 
            type="button" 
            className="cap-breadcrumb-back-btn"
            onClick={() => setSelectedAuctionId(null)}
          >
            <ArrowLeft size={16} />
            <span>Back to All Current Auctions</span>
          </button>

          <div className="cap-breadcrumb-event-info">
            <span>Viewing Session:</span>
            <strong style={{ color: '#ffffff' }}>{currentAuctionInfo.title}</strong>
            <span className="cap-breadcrumb-badge">{currentAuctionInfo.code}</span>
          </div>
        </div>

        {/* Top Hero Banner */}
        <header className="cap-hero-header">
          <div className="cap-hero-text-block">
            <span className="cap-hero-tag">BROWSE AUCTION LOTS</span>
            <h1 className="cap-hero-title">Find something remarkable.</h1>
            <p className="cap-hero-sub">Explore the lots cataloged for {currentAuctionInfo.title}.</p>
          </div>

          <div className="cap-hero-search-wrap">
            <Search size={16} className="cap-search-icon" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search products or lot number"
              className="cap-hero-search-input"
              aria-label="Search products or lot number"
            />
            {localSearch && (
              <button
                type="button"
                className="cap-search-clear-btn"
                onClick={() => setLocalSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        {/* Main Full-Width Catalog Body */}
        <div className="cap-main-catalog-layout">
          <section className="cap-catalog-content" aria-label="Curated Lots Collection">
            <div className="cap-content-header">
              <div className="cap-content-title-wrap">
                <div className="cap-header-meta-pill-row">
                  <span className="cap-gold-tag">{currentAuctionInfo.code || 'AUCTION CATALOG'}</span>
                  <span className="cap-session-status-badge">{currentAuctionInfo.endsAtText}</span>
                </div>
                <h2 className="cap-content-main-title">{currentAuctionInfo.title}</h2>
                <p className="cap-content-subtitle">
                  {currentAuctionInfo.description || 'Browse all cataloged lots available for live and advance bidding in this session.'}
                </p>
              </div>
              <div className="cap-header-right-meta">
                <span className="cap-lots-counter">
                  <strong>{filteredLots.length}</strong> {filteredLots.length === 1 ? 'lot' : 'lots'} in catalog
                </span>
              </div>
            </div>

            <div className="cap-controls-bar">
              <div className="cap-filter-pills" role="tablist">
                <button
                  type="button"
                  className={`cap-pill-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`cap-pill-btn ${activeTab === 'ending' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ending')}
                >
                  Ending soon
                </button>
                <button
                  type="button"
                  className={`cap-pill-btn ${activeTab === 'featured' ? 'active' : ''}`}
                  onClick={() => setActiveTab('featured')}
                >
                  Featured
                </button>
              </div>

              <div className="cap-sort-dropdown-wrap">
                <span className="cap-sort-label">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="cap-sort-select"
                  aria-label="Sort lots"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="bids">Most Bids</option>
                </select>
                <ChevronDown size={14} className="cap-select-arrow" />
              </div>
            </div>

            {/* Grid of Lot Cards (Displays 6 initially, expandable) */}
            {filteredLots.length === 0 ? (
              <div className="cap-empty-state">
                <p>No products match your current filters or search term.</p>
                <button
                  type="button"
                  className="cap-reset-btn"
                  onClick={() => {
                    setActiveTab('all');
                    setLocalSearch('');
                  }}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="cap-products-scroll-wrapper" ref={scrollContainerRef}>
                <div className="cap-products-grid">
                  {paginatedLots.map((lot) => {
                    const isWatchlisted = watchlist.includes(lot.id);

                    return (
                      <article key={lot.id} className="cap-lot-card">
                        <div className="cap-card-stage-container">
                          <img
                            src={lot.image}
                            alt={lot.title}
                            className="cap-card-img"
                            loading="lazy"
                          />
                          <div className="cap-stage-gradient-overlay" />

                          <div className="cap-lot-badge">{lot.lotNumber}</div>

                          <button
                            type="button"
                            className={`cap-wishlist-btn ${isWatchlisted ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(lot.id);
                              onAddToast(
                                'info',
                                isWatchlisted ? 'Removed from Watchlist' : 'Added to Watchlist',
                                `${lot.lotNumber}: ${lot.title}`
                              );
                            }}
                            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                            aria-label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          >
                            <Heart
                              size={16}
                              fill={isWatchlisted ? '#e11d48' : 'none'}
                              stroke={isWatchlisted ? '#e11d48' : '#ffffff'}
                            />
                          </button>
                        </div>

                        <div className="cap-card-body">
                          <div className="cap-card-meta-row">
                            <span className="cap-card-bid-label">CURRENT BID</span>
                            <span className="cap-card-bid-val">${lot.currentBid.toLocaleString()}</span>
                          </div>

                          <h3 className="cap-card-title" title={lot.title}>
                            {lot.title}
                          </h3>

                          <p className="cap-card-desc">{lot.description}</p>

                          <div className="cap-card-divider" />

                          <div className="cap-card-footer">
                            <span className="cap-card-bid-count">
                              Current bid · {lot.bidsCount} bids
                            </span>

                            <button
                              type="button"
                              className={`cap-view-lot-btn ${lot.buttonVariant === 'gold' ? 'btn-gold' : 'btn-dark'}`}
                              onClick={() => {
                                setActiveDetailLotId(lot.id);
                              }}
                            >
                              VIEW LOT
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination Controls when lots exceed 6 */}
                {totalPages > 1 && (
                  <div className="cap-pagination-container">
                    <nav className="cap-pagination-nav" aria-label="Catalog lots pagination">
                      <button
                        type="button"
                        className="cap-page-nav-btn cap-page-prev-btn"
                        disabled={safeCurrentPage === 1}
                        onClick={() => handlePageChange(safeCurrentPage - 1)}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                        <span>PREV</span>
                      </button>

                      <div className="cap-page-numbers-list">
                        {getPageNumbers().map((pageNum, idx) => {
                          if (pageNum === '...') {
                            return (
                              <span key={`dots-${idx}`} className="cap-page-dots">
                                ...
                              </span>
                            );
                          }
                          const isCurrent = pageNum === safeCurrentPage;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              className={`cap-page-number-btn ${isCurrent ? 'active' : ''}`}
                              onClick={() => handlePageChange(Number(pageNum))}
                              aria-current={isCurrent ? 'page' : undefined}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="cap-page-nav-btn cap-page-next-btn"
                        disabled={safeCurrentPage === totalPages}
                        onClick={() => handlePageChange(safeCurrentPage + 1)}
                        aria-label="Next page"
                      >
                        <span>NEXT</span>
                        <ChevronRight size={16} />
                      </button>
                    </nav>
                  </div>
                )}

                {filteredLots.length > 0 && (
                  <div className="cap-catalog-end-bar">
                    <div className="cap-end-bar-line" />
                    <div className="cap-end-bar-content">
                      <span className="cap-end-bar-text">
                        {totalPages > 1
                          ? `Showing ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                              safeCurrentPage * ITEMS_PER_PAGE,
                              filteredLots.length
                            )} of ${filteredLots.length} lots (Page ${safeCurrentPage} of ${totalPages})`
                          : `Showing all ${filteredLots.length} ${filteredLots.length === 1 ? 'lot' : 'lots'} in this session`}
                      </span>
                      <button
                        type="button"
                        className="cap-btn-back-top"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        title="Back to top"
                        aria-label="Back to top"
                      >
                        <ArrowUp size={14} />
                        <span>Back to top</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Bidder Trust Protocol Section */}
        <section className="cap-trust-protocol-section" aria-label="Bidder Trust Protocol">
          <div className="cap-trust-header">
            <span className="cap-trust-eyebrow">BIDDER TRUST PROTOCOL</span>
            <h2 className="cap-trust-title">Participating with confidence</h2>
            <p className="cap-trust-sub">
              A transparent, regulated auction experience, backed by clear bidder protections.
            </p>
          </div>

          <div className="cap-trust-cards-grid">
            {/* Card 01 */}
            <div className="cap-trust-card">
              <div className="cap-trust-card-top">
                <div className="cap-trust-icon-box">
                  <Search size={16} />
                </div>
                <span className="cap-trust-step-num">01</span>
              </div>
              <h3 className="cap-trust-card-title">Discover auctions</h3>
              <p className="cap-trust-card-desc">
                Review condition reports, certification details, provenance and scheduled preview times before bidding.
              </p>
            </div>

            {/* Card 02 */}
            <div className="cap-trust-card">
              <div className="cap-trust-card-top">
                <div className="cap-trust-icon-box">
                  <Gavel size={16} />
                </div>
                <span className="cap-trust-step-num">02</span>
              </div>
              <h3 className="cap-trust-card-title">Register &amp; get approved</h3>
              <p className="cap-trust-card-desc">
                Complete bidder verification and choose floor, phone, absentee or webcast bidding.
              </p>
            </div>

            {/* Card 03 */}
            <div className="cap-trust-card">
              <div className="cap-trust-card-top">
                <div className="cap-trust-icon-box">
                  <Diamond size={16} />
                </div>
                <span className="cap-trust-step-num">03</span>
              </div>
              <h3 className="cap-trust-card-title">Win &amp; settle securely</h3>
              <p className="cap-trust-card-desc">
                See the buyer's premium before bidding, then arrange secure payment and insured delivery.
              </p>
            </div>
          </div>

          {/* Bottom 4 Trust Seals Banner */}
          <div className="cap-trust-seals-strip">
            <div className="cap-seal-item">
              <Gavel size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">PA-LICENSED AUCTIONEER</strong>
                <span className="cap-seal-sub">Regulated under PA Act 85 · AY-002004</span>
              </div>
            </div>

            <div className="cap-seal-item">
              <Lock size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">LICENSED &amp; BONDED</strong>
                <span className="cap-seal-sub">$500,000 surety bond with Commonwealth</span>
              </div>
            </div>

            <div className="cap-seal-item">
              <Percent size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">15% BUYER'S PREMIUM</strong>
                <span className="cap-seal-sub">Competitive, transparent fee rates</span>
              </div>
            </div>

            <div className="cap-seal-item">
              <FileCheck size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">TITLE GUARANTEE</strong>
                <span className="cap-seal-sub">100% unconditional authenticity</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
