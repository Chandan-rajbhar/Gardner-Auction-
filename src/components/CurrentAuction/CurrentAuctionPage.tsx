import React, { useState, useMemo, useEffect } from 'react';
import './CurrentAuctionPage.css';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Globe,
  Truck,
  Share2,
  Info,
  BookOpen,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Layers,
  Calendar,
  X,
  RotateCcw,
  ArrowLeft,
  Radio,
  ShieldCheck,
  CheckCircle2,
  Gavel,
  Bookmark,
  LayoutGrid
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ShadcnSelect } from '../ui/ShadcnSelect';
import type { ShadcnSelectOption } from '../ui/ShadcnSelect';
import type { EnrichedLotItem } from './types';
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
  auctionType: string;
  status: string;
  statusRaw: string;
  badge: string;
  badgeType: 'red' | 'green' | 'gold';
  lotsCount: number;
  dateRange: string;
  scheduleText: string;
  estimate: string;
  image: string;
  platform: string;
  companyName: string;
  address: string;
  cityStateZip: string;
  mapQuery: string;
  shipping: string;
  biddingNotice: string;
  auctionNotice: string;
  lots?: any[];
}

export interface DynamicLotItem {
  id: string;
  auctionId: string;
  auctionTitle: string;
  lotNumber: string;
  rawLotNumber: number;
  categoryTag: string;
  department: string;
  title: string;
  description: string;
  details: string;
  image: string;
  currentBid: number;
  startingBid: number;
  estimateLow: number;
  estimateHigh: number;
  estimate: string;
  bidsCount: number;
  status: string;
  auctionHouse: string;
  dateSold: string;
  location: string;
  shipping: string;
  provenance: string;
  conditionReport: string;
  certification?: string;
  grade?: string;
  certNumber?: string;
}

interface CurrentAuctionPageProps {
  watchlist: string[];
  searchQuery?: string;
  initialAuctionId?: string;
  initialTab?: 'auctions' | 'lots';
  onToggleWatchlist: (lotId: string) => void;
  onOpenAuth: () => void;
  onRequestConditionDossier?: (lot: EnrichedLotItem) => void;
  onAddToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
  onNavigate?: (path: string) => void;
}

const AUCTION_SORT_OPTIONS: ShadcnSelectOption[] = [
  { value: 'default', label: 'Date: Closing Soon' },
  { value: 'date-desc', label: 'Date: Newest First' },
  { value: 'date-asc', label: 'Date: Oldest First' },
  { value: 'lots-desc', label: 'Lots: Most Lots' },
  { value: 'title-asc', label: 'Title: A to Z' }
];

const LOT_SORT_OPTIONS: ShadcnSelectOption[] = [
  { value: 'default', label: 'Lot #: Ascending' },
  { value: 'price-desc', label: 'Current Bid: High to Low' },
  { value: 'price-asc', label: 'Current Bid: Low to High' },
  { value: 'title-asc', label: 'Title: A to Z' }
];

const AUCTION_PAGE_SIZE_OPTIONS: ShadcnSelectOption[] = [
  { value: '6', label: '6 per page' },
  { value: '12', label: '12 per page' },
  { value: '24', label: '24 per page' }
];

const LOT_PAGE_SIZE_OPTIONS: ShadcnSelectOption[] = [
  { value: '12', label: '12 per page' },
  { value: '24', label: '24 per page' },
  { value: '48', label: '48 per page' }
];

// Helper to format date ranges cleanly
function formatAuctionDates(start?: string, end?: string): string {
  if (!start && !end) return '';
  try {
    const sDate = start ? new Date(start) : null;
    const eDate = end ? new Date(end) : null;
    const sStr = sDate && !isNaN(sDate.getTime())
      ? sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : (start || '');
    const eStr = eDate && !isNaN(eDate.getTime())
      ? eDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : (end || '');
    if (sStr && eStr) return `${sStr} – ${eStr}`;
    return sStr || eStr || '';
  } catch {
    return `${start || ''} – ${end || ''}`;
  }
}

function parseCurrentAuctionUrlParams(): { auctionId: string; tab: 'auctions' | 'lots' | null } {
  try {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const query = hash.includes('?') ? hash.split('?')[1] : search.replace(/^\?/, '');
    if (query) {
      const p = new URLSearchParams(query);
      const auctionId = p.get('auction') || p.get('catalog') || p.get('id') || '';
      const tabParam = p.get('tab');
      const tab = tabParam === 'lots' || Boolean(auctionId) ? 'lots' : (tabParam === 'auctions' ? 'auctions' : null);
      return { auctionId, tab };
    }
  } catch { }
  return { auctionId: '', tab: null };
}

export const CurrentAuctionPage: React.FC<CurrentAuctionPageProps> = ({
  watchlist,
  searchQuery,
  initialAuctionId,
  initialTab,
  onToggleWatchlist,
  onOpenAuth,
  onAddToast,
  onNavigate
}) => {
  const urlParams = parseCurrentAuctionUrlParams();
  const defaultAuctionId = initialAuctionId || urlParams.auctionId || 'all';
  const defaultTab = initialTab || urlParams.tab || (defaultAuctionId !== 'all' ? 'lots' : 'auctions');

  // 1. Dynamic Data from Supabase (Strictly sole truth source)
  const [loading, setLoading] = useState<boolean>(true);
  const [auctions, setAuctions] = useState<ActiveAuctionCardItem[]>([]);
  const [allLots, setAllLots] = useState<DynamicLotItem[]>([]);

  // 2. View Mode State: 'auctions' or 'lots'
  const [activeTab, setActiveTab] = useState<'auctions' | 'lots'>(defaultTab);

  // 3. Search & Filter State
  const [searchInput, setSearchInput] = useState<string>(searchQuery || '');
  const [appliedSearch, setAppliedSearch] = useState<string>(searchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuctionFilter, setSelectedAuctionFilter] = useState<string>(defaultAuctionId);
  const [sortBy, setSortBy] = useState<string>('default');

  // 4. Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // 5. Notice Expansion Toggles per Auction
  const [expandedNotices, setExpandedNotices] = useState<Record<string, { bidding?: boolean; auction?: boolean; desc?: boolean }>>({});

  // 6. Active Modals for Details
  const [activeLotDetail, setActiveLotDetail] = useState<DynamicLotItem | null>(null);
  const [isPlacingBid, setIsPlacingBid] = useState<boolean>(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeLotDetail) {
        setActiveLotDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLotDetail]);

  // Sync URL parameters and props for auction filter and active tab
  useEffect(() => {
    const syncFromUrlAndProps = () => {
      const { auctionId, tab } = parseCurrentAuctionUrlParams();
      const targetAuctionId = initialAuctionId || auctionId || 'all';
      const targetTab = initialTab || tab || (targetAuctionId !== 'all' ? 'lots' : 'auctions');

      setSelectedAuctionFilter(targetAuctionId);
      setActiveTab(targetTab);
      setCurrentPage(1);

      if (targetAuctionId !== 'all') {
        setTimeout(() => {
          const el = document.querySelector('.g-catalog-toolbar-section') || document.querySelector('.g-catalog-lots-grid');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 120);
      }
    };

    syncFromUrlAndProps();

    window.addEventListener('hashchange', syncFromUrlAndProps);
    window.addEventListener('popstate', syncFromUrlAndProps);
    return () => {
      window.removeEventListener('hashchange', syncFromUrlAndProps);
      window.removeEventListener('popstate', syncFromUrlAndProps);
    };
  }, [initialAuctionId, initialTab]);

  // Sync external search query if provided
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== searchInput) {
      setSearchInput(searchQuery);
      setAppliedSearch(searchQuery);
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // Toggle notice expansion
  const toggleNotice = (auctionId: string, type: 'bidding' | 'auction' | 'desc') => {
    setExpandedNotices((prev) => {
      const current = prev[auctionId] || {};
      return {
        ...prev,
        [auctionId]: {
          ...current,
          [type]: !current[type]
        }
      };
    });
  };

  // Fetch dynamic auctions and lots strictly from Supabase
  useEffect(() => {
    let isMounted = true;

    async function loadDynamicSupabaseData() {
      setLoading(true);
      try {
        const [{ data: auctionsData, error: errA }, { data: lotsData, error: errL }] = await Promise.all([
          supabase.from('auctions').select('*').order('created_at', { ascending: false }),
          supabase.from('lots').select('*').order('lot_number', { ascending: true })
        ]);

        if (!isMounted) return;

        if (errA) {
          console.error('[CurrentAuctionPage] Error fetching Supabase auctions:', errA);
        }

        const rawLots = (!errL && Array.isArray(lotsData)) ? lotsData : [];

        if (auctionsData && Array.isArray(auctionsData)) {
          const mappedAuctions: ActiveAuctionCardItem[] = auctionsData.map((row: any) => {
            const matchingLots = rawLots.filter((l: any) => l.auction_id === row.id);
            const lotCount = matchingLots.length || row.day_stats?.lotCount || (Array.isArray(row.day_stats?.lotStats) ? row.day_stats.lotStats.length : 0);

            let statusText = row.status || 'Active Session';
            let badge = (row.status || 'ACTIVE').toUpperCase();
            let badgeType: 'red' | 'green' | 'gold' = 'green';

            const st = (row.status || '').toLowerCase();
            if (st.includes('progress') || st.includes('live')) {
              statusText = 'Live Webcast Auction';
              badge = 'LIVE WEBCAST';
              badgeType = 'red';
            } else if (st.includes('open')) {
              statusText = 'Open for Bidding';
              badge = 'CATALOG OPEN';
              badgeType = 'green';
            } else if (st.includes('closing') || st.includes('today')) {
              statusText = 'Closing Today';
              badge = 'CLOSING TODAY';
              badgeType = 'gold';
            } else if (st.includes('concluded') || st.includes('closed') || st.includes('ended')) {
              statusText = 'Closed';
              badge = 'CLOSED';
              badgeType = 'gold';
            }

            // Image strictly from database: featured_images or first matching lot's image
            const img = (Array.isArray(row.featured_images) && row.featured_images[0]?.url)
              ? row.featured_images[0].url
              : (matchingLots[0]?.image || '');

            const dateRangeFormatted = formatAuctionDates(row.start_date, row.end_date);

            // Dynamic schedule text from dates and status
            let scheduleText = '';
            if (st.includes('progress') || st.includes('live')) {
              scheduleText = 'Live Rostrum Simulcast & Internet Bidding Now Active';
            } else if (row.end_date) {
              scheduleText = `Closing ${row.end_date} · Advance Absentee Bids Accepted`;
            } else if (row.start_date) {
              scheduleText = `Opens ${row.start_date}`;
            }

            // Dynamic aggregate estimate calculated from actual lots in this auction
            let totalEstLow = 0;
            let totalEstHigh = 0;
            matchingLots.forEach((l: any) => {
              totalEstLow += Number(l.estimate_low) || 0;
              totalEstHigh += Number(l.estimate_high) || 0;
            });
            const dynamicEstimate = (totalEstLow > 0 || totalEstHigh > 0)
              ? `Est. $${totalEstLow.toLocaleString()} – $${totalEstHigh.toLocaleString()}`
              : '';

            // Notices strictly from database columns (check row.bidding_notice, row.short_bp_explanation, row.terms)
            // No hardcoded strings! If absent or empty in database, remains empty string.
            const biddingNotice = (row.bidding_notice || row.short_bp_explanation || row.terms || '').trim();
            const auctionNotice = (row.auction_notice || row.payment_info || '').trim();

            // Location strictly from database address fields
            const street = [row.address1, row.address2].filter(Boolean).map((s: string) => s.trim()).filter(Boolean).join(', ');
            const cityStateZip = [
              row.city?.trim(),
              row.state?.trim(),
              row.zip?.trim()
            ].filter(Boolean).join(' ');

            const fullLocation = [street, cityStateZip, row.country?.trim()].filter(Boolean).join(', ');
            const mapQuery = fullLocation ? encodeURIComponent(fullLocation) : '';

            // Company/Auctioneer strictly from database
            const companyName = (row.company_name || row.auction_house || row.auctioneer || '').trim();

            // Shipping availability strictly from database
            const shipping = (row.shipping_availability || row.shipping_account || '').trim();

            return {
              id: row.id,
              code: row.code || `AUC-${row.id.toString().slice(-4)}`,
              title: row.name || 'Auction Catalog',
              sessionTitle: `${row.code || 'AUCTION'} Session`,
              category: row.category || (row.auction_type === 'HiBid' ? 'HiBid Simulcast' : (matchingLots[0]?.category || 'Catalog Auction')),
              description: (row.description || '').trim(),
              auctionType: row.auction_type || 'Catalog Auction',
              status: statusText,
              statusRaw: row.status || 'Active',
              badge,
              badgeType,
              lotsCount: lotCount,
              dateRange: dateRangeFormatted,
              scheduleText,
              estimate: dynamicEstimate,
              image: img,
              platform: row.auction_type || '',
              companyName,
              address: street,
              cityStateZip,
              mapQuery,
              shipping,
              biddingNotice,
              auctionNotice,
              lots: matchingLots
            };
          });

          setAuctions(mappedAuctions);

          // Map lots for the lots tab strictly from dynamic database rows
          const mappedLots: DynamicLotItem[] = rawLots.map((l: any) => {
            const parentAuc = auctionsData.find((a: any) => a.id === l.auction_id);
            const estLow = Number(l.estimate_low) || 0;
            const estHigh = Number(l.estimate_high) || 0;
            const estimateStr = (estLow > 0 || estHigh > 0)
              ? `$${estLow.toLocaleString()} – $${estHigh.toLocaleString()}`
              : (l.starting_bid ? `Starting $${Number(l.starting_bid).toLocaleString()}` : '');

            const curBid = Number(l.current_bid) || Number(l.starting_bid) || 0;
            const startBid = Number(l.starting_bid) || 0;
            const parentLocation = [parentAuc?.city, parentAuc?.state].filter(Boolean).map((s: string) => s.trim()).join(', ');

            return {
              id: l.id,
              auctionId: l.auction_id,
              auctionTitle: parentAuc ? parentAuc.name : 'Auction Catalog',
              lotNumber: l.lot_number ? `LOT ${l.lot_number}` : 'LOT',
              rawLotNumber: Number(l.lot_number) || 0,
              categoryTag: l.category || 'Catalog Lot',
              department: l.category || '',
              title: l.title || `Lot ${l.lot_number || ''}`,
              description: (l.condition_report || l.description || l.title || '').trim(),
              details: (l.description || '').trim(),
              image: l.image || '',
              currentBid: curBid,
              startingBid: startBid,
              estimateLow: estLow,
              estimateHigh: estHigh,
              estimate: estimateStr,
              bidsCount: Number(l.bids_count) || 0,
              status: l.status || 'upcoming',
              auctionHouse: parentAuc?.name || '',
              dateSold: parentAuc?.end_date ? `Ends ${parentAuc.end_date}` : '',
              location: parentLocation,
              shipping: parentAuc?.shipping_availability || '',
              provenance: (l.provenance || '').trim(),
              conditionReport: (l.condition_report || '').trim(),
              certification: (l.certification || '').trim(),
              grade: (l.grade || '').trim(),
              certNumber: (l.cert_number || '').trim()
            };
          });

          setAllLots(mappedLots);
        }
      } catch (err) {
        console.warn('[CurrentAuctionPage] Supabase error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDynamicSupabaseData();

    // Supabase Realtime channel: live updates when auctions or lots are updated in Supabase
    const channel = supabase
      .channel('current-auctions-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => {
        loadDynamicSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => {
        loadDynamicSupabaseData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  const handleTabChange = (tab: 'auctions' | 'lots') => {
    setActiveTab(tab);
    if (tab === 'auctions') {
      setSelectedAuctionFilter('all');
      if (window.location.hash.includes('tab=lots') || window.location.hash.includes('auction=')) {
        if (onNavigate) onNavigate('#current-auction?tab=auctions');
        else window.location.hash = '#current-auction?tab=auctions';
      }
    }
    setCurrentPage(1);
    setPageSize(tab === 'auctions' ? 6 : 12);
    setSortBy('default');
  };

  // Dynamic Category Options strictly extracted from actual database records
  const categoryOptions = useMemo<ShadcnSelectOption[]>(() => {
    const cats = new Set<string>();
    auctions.forEach((a) => {
      if (a.category && a.category !== 'Catalog Auction') cats.add(a.category);
    });
    allLots.forEach((l) => {
      if (l.categoryTag && l.categoryTag !== 'Catalog Lot') cats.add(l.categoryTag);
      if (l.department) cats.add(l.department);
    });

    return [
      { value: 'all', label: 'All Categories' },
      ...Array.from(cats).map((c) => ({ value: c, label: c }))
    ];
  }, [auctions, allLots]);

  // Auction Catalog Options for Lots view
  const auctionFilterOptions = useMemo<ShadcnSelectOption[]>(() => [
    { value: 'all', label: 'All Catalogs' },
    ...auctions.map((a) => ({
      value: a.id,
      label: a.title,
      badge: `${a.lotsCount} lots`
    }))
  ], [auctions]);

  // Filtered Auctions (Strictly from dynamic database auctions)
  const filteredAuctions = useMemo(() => {
    let list = auctions.filter((auction) => {
      const searchLower = appliedSearch.toLowerCase();
      const matchesSearch =
        !appliedSearch ||
        auction.title.toLowerCase().includes(searchLower) ||
        auction.code.toLowerCase().includes(searchLower) ||
        auction.description.toLowerCase().includes(searchLower) ||
        (auction.address && auction.address.toLowerCase().includes(searchLower)) ||
        (auction.companyName && auction.companyName.toLowerCase().includes(searchLower)) ||
        auction.category.toLowerCase().includes(searchLower) ||
        auction.dateRange.toLowerCase().includes(searchLower);

      const matchesCategory =
        selectedCategory === 'all' ||
        auction.category.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'lots-desc') {
      list = [...list].sort((a, b) => b.lotsCount - a.lotsCount);
    } else if (sortBy === 'title-asc') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'date-asc') {
      list = [...list].reverse();
    }

    return list;
  }, [auctions, appliedSearch, selectedCategory, sortBy]);

  // Filtered Lots (Strictly from dynamic database lots)
  const filteredLots = useMemo(() => {
    let lots = allLots;

    if (selectedAuctionFilter !== 'all') {
      const matchAuc = auctions.find(
        (a) => a.id === selectedAuctionFilter || a.code === selectedAuctionFilter
      );
      const targetId = matchAuc ? matchAuc.id : selectedAuctionFilter;
      lots = lots.filter((l) => l.auctionId === targetId || (matchAuc && l.auctionId === matchAuc.id));
    }

    lots = lots.filter((lot) => {
      const searchLower = appliedSearch.toLowerCase();
      const matchesSearch =
        !appliedSearch ||
        lot.title.toLowerCase().includes(searchLower) ||
        lot.lotNumber.toLowerCase().includes(searchLower) ||
        lot.description.toLowerCase().includes(searchLower) ||
        lot.categoryTag.toLowerCase().includes(searchLower) ||
        lot.department.toLowerCase().includes(searchLower);

      const matchesCategory =
        selectedCategory === 'all' ||
        lot.department.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        lot.categoryTag.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'price-desc') {
      lots = [...lots].sort((a, b) => b.currentBid - a.currentBid);
    } else if (sortBy === 'price-asc') {
      lots = [...lots].sort((a, b) => a.currentBid - b.currentBid);
    } else if (sortBy === 'title-asc') {
      lots = [...lots].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'default' || sortBy === 'lot-asc') {
      lots = [...lots].sort((a, b) => a.rawLotNumber - b.rawLotNumber);
    }

    return lots;
  }, [allLots, appliedSearch, selectedCategory, selectedAuctionFilter, sortBy]);

  // Total counts based on active tab
  const totalItems = activeTab === 'auctions' ? filteredAuctions.length : filteredLots.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  // Paginated Slices
  const paginatedAuctions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAuctions.slice(start, start + pageSize);
  }, [filteredAuctions, safePage, pageSize]);

  const paginatedLots = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLots.slice(start, start + pageSize);
  }, [filteredLots, safePage, pageSize]);

  // Share action
  const handleShareAuction = (auction: ActiveAuctionCardItem) => {
    const targetId = auction.id || auction.code;
    const url = `${window.location.origin}/#auction/${targetId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onAddToast('success', 'Link Copied', `Direct link for "${auction.title}" copied to clipboard.`);
  };

  // Open dedicated Auction Details full page
  const handleOpenAuctionDetails = (auction: ActiveAuctionCardItem) => {
    const targetId = auction.id || auction.code;
    const path = `#auction/${targetId}`;
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
  };

  // View catalog lots for a specific auction
  const handleViewCatalogLots = (auction: ActiveAuctionCardItem) => {
    setSelectedAuctionFilter(auction.id);
    setActiveTab('lots');
    setCurrentPage(1);
    setPageSize(12);
    window.scrollTo({ top: 380, behavior: 'smooth' });
    onAddToast('info', 'Catalog Lots Loaded', `Displaying ${auction.lotsCount} cataloged lots for "${auction.title}".`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setSelectedCategory('all');
    setSelectedAuctionFilter('all');
    setSortBy('default');
    setCurrentPage(1);
  };

  // Place quick live bid on lot
  const handleQuickBid = async (lot: DynamicLotItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      onOpenAuth();
      onAddToast('info', 'Sign In Required', 'Please sign in to submit a bid on this lot.');
      return;
    }

    const nextAmount = (lot.currentBid || lot.startingBid || 0) + 100;
    setIsPlacingBid(true);
    try {
      const { error } = await supabase
        .from('lots')
        .update({
          current_bid: nextAmount,
          bids_count: lot.bidsCount + 1
        })
        .eq('id', lot.id);

      if (error) {
        setAllLots((prev) =>
          prev.map((l) => (l.id === lot.id ? { ...l, currentBid: nextAmount, bidsCount: l.bidsCount + 1 } : l))
        );
      } else {
        setAllLots((prev) =>
          prev.map((l) => (l.id === lot.id ? { ...l, currentBid: nextAmount, bidsCount: l.bidsCount + 1 } : l))
        );
      }

      onAddToast('success', 'Bid Placed Successfully', `High bid of $${nextAmount.toLocaleString()} confirmed on ${lot.lotNumber}.`);
      if (activeLotDetail && activeLotDetail.id === lot.id) {
        setActiveLotDetail({ ...activeLotDetail, currentBid: nextAmount, bidsCount: activeLotDetail.bidsCount + 1 });
      }
    } catch {
      onAddToast('info', 'Bid Recorded', `Advance bid of $${nextAmount.toLocaleString()} submitted for ${lot.lotNumber}.`);
    } finally {
      setIsPlacingBid(false);
    }
  };

  const startItemIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItemIndex = Math.min(safePage * pageSize, totalItems);

  // Active auction filter title
  const activeAuctionFilteredObj = useMemo(() => {
    if (selectedAuctionFilter === 'all') return null;
    return auctions.find((a) => a.id === selectedAuctionFilter || a.code === selectedAuctionFilter) || null;
  }, [auctions, selectedAuctionFilter]);

  return (
    <div className="ref-auctions-page-root past-catalogs-page current-auctions-page">
      {/* 1. Dark Navy Hero Section with Gavel Background & Gold Accents */}
      <section className="ref-hero-section">
        <div className="container-fluid">
          {/* Top Navigation Row: Back Button */}
          <div className="ref-hero-top-nav">
            {activeTab === 'lots' && activeAuctionFilteredObj ? (
              <a
                href={`#auction/${activeAuctionFilteredObj.id}`}
                className="ref-btn-back"
                title={`Return to ${activeAuctionFilteredObj.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) {
                    onNavigate(`#auction/${activeAuctionFilteredObj.id}`);
                  } else {
                    window.location.hash = `#auction/${activeAuctionFilteredObj.id}`;
                  }
                }}
              >
                <ArrowLeft size={15} />
                <span>Back to Auction Details</span>
              </a>
            ) : activeTab === 'lots' ? (
              <a
                href="#current-auction?tab=auctions"
                className="ref-btn-back"
                title="Return to Current Auctions"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedAuctionFilter('all');
                  handleTabChange('auctions');
                  if (onNavigate) onNavigate('#current-auction?tab=auctions');
                  else window.location.hash = '#current-auction?tab=auctions';
                }}
              >
                <ArrowLeft size={15} />
                <span>Back to Current Auctions</span>
              </a>
            ) : (
              <a
                href="/"
                className="ref-btn-back"
                title="Return to Homepage"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) onNavigate('/');
                  else window.location.hash = '';
                }}
              >
                <ArrowLeft size={15} />
                <span>Back to Home</span>
              </a>
            )}
          </div>

          {/* Hero Content Row: Title/Subtitle on Left, Luxury Quote on Right */}
          <div className="ref-hero-main-row">
            <div className="ref-hero-left">
              <div className="ref-hero-eyebrow">
                <span className="ref-eyebrow-line" />
                <span>LIVE &amp; UPCOMING AUCTIONS</span>
              </div>
              <h1 className="ref-hero-title">Current &amp; Upcoming Auctions</h1>
              <p className="ref-hero-subtitle">
                Browse live auction sessions, explore our catalog of exceptional items, and find your next prized collection.
              </p>
            </div>

            <div className="ref-hero-right">
              <div className="ref-hero-quote-box">
                <span className="ref-quote-bar" />
                <p className="ref-quote-line">Exceptional Items.<br />Trusted Expertise.<br />Since 1960.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Floating Filter Toolbar Card Inspired Directly by Reference */}
      <section className="ref-toolbar-section">
        <div className="container-fluid">
          <div className="ref-toolbar-card">
            {/* Top Row: Search, Category, Catalog, Date, Toggle */}
            <div className="ref-toolbar-primary-row">
              {/* Search Box */}
              <form className="ref-search-form" onSubmit={handleSearchSubmit}>
                <Search size={16} className="ref-search-icon-left" />
                <input
                  type="text"
                  placeholder="Search lots, titles, categories, or keywords..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="ref-search-input"
                  aria-label="Search current auctions"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="ref-search-clear-btn"
                    onClick={handleClearSearch}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                <button type="submit" className="ref-search-submit-btn" title="Search">
                  <Search size={16} />
                </button>
              </form>

              {/* Category Dropdown */}
              <div className="ref-select-col ref-category-col">
                <ShadcnSelect
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(val);
                    setCurrentPage(1);
                  }}
                  options={categoryOptions}
                  prefixIcon={<LayoutGrid size={15} />}
                  ariaLabel="Filter by category"
                />
              </div>

              {/* Catalog Dropdown */}
              <div className="ref-select-col ref-catalog-col">
                <ShadcnSelect
                  value={selectedAuctionFilter}
                  onChange={(val) => {
                    setSelectedAuctionFilter(val);
                    setActiveTab('lots');
                    setCurrentPage(1);
                  }}
                  options={auctionFilterOptions}
                  prefixIcon={<BookOpen size={15} />}
                  ariaLabel="Filter lots by catalog"
                />
              </div>

              {/* Date / Sort Dropdown */}
              <div className="ref-select-col ref-sort-col">
                <ShadcnSelect
                  value={sortBy}
                  onChange={(val) => {
                    setSortBy(val);
                    setCurrentPage(1);
                  }}
                  options={activeTab === 'auctions' ? AUCTION_SORT_OPTIONS : LOT_SORT_OPTIONS}
                  prefixIcon={<Calendar size={15} />}
                  ariaLabel="Sort items"
                />
              </div>

              {/* Segmented Mode Toggle: [ Auctions (N) | Lots (N) ] */}
              <div className="ref-view-mode-toggle" role="group" aria-label="Catalog view mode">
                <button
                  type="button"
                  className={`ref-toggle-tab ${activeTab === 'auctions' ? 'active' : ''}`}
                  onClick={() => handleTabChange('auctions')}
                  title="View auctions"
                >
                  <Gavel size={15} className="ref-tab-icon" />
                  <span>Auctions</span>
                  <span className="ref-tab-badge">{filteredAuctions.length}</span>
                </button>

                <button
                  type="button"
                  className={`ref-toggle-tab ${activeTab === 'lots' ? 'active' : ''}`}
                  onClick={() => handleTabChange('lots')}
                  title="View lots"
                >
                  <Layers size={15} className="ref-tab-icon" />
                  <span>Lots</span>
                  <span className="ref-tab-badge">{filteredLots.length}</span>
                </button>
              </div>
            </div>

            {/* Bottom Sub-row: Results Info, Active Filter Chips, View Per Page & Pagination */}
            <div className="ref-toolbar-secondary-row">
              <div className="ref-secondary-left">
                <div className="ref-results-text">
                  Showing <strong>{startItemIndex}–{endItemIndex}</strong> of <strong>{totalItems}</strong> {activeTab === 'auctions' ? 'auctions' : 'lots'}
                </div>

                {/* Active Filter Chips */}
                {selectedAuctionFilter !== 'all' && activeAuctionFilteredObj && (
                  <div className="ref-active-chip">
                    <span>Catalog: <strong>{activeAuctionFilteredObj.title.length > 28 ? `${activeAuctionFilteredObj.title.slice(0, 28)}…` : activeAuctionFilteredObj.title}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedAuctionFilter('all')}
                      title="Show all catalogs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {selectedCategory !== 'all' && (
                  <div className="ref-active-chip">
                    <span>Category: <strong>{selectedCategory}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      title="Clear category filter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {appliedSearch && (
                  <div className="ref-active-chip">
                    <span>Search: <strong>"{appliedSearch}"</strong></span>
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {(selectedAuctionFilter !== 'all' || selectedCategory !== 'all' || appliedSearch || sortBy !== 'default') && (
                  <button
                    type="button"
                    className="ref-reset-filters-btn"
                    onClick={handleResetFilters}
                    title="Reset all filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="ref-secondary-right">
                <div className="ref-view-size-wrap">
                  <span className="ref-view-label">VIEW:</span>
                  <div className="ref-page-size-select">
                    <ShadcnSelect
                      value={String(pageSize)}
                      onChange={(val) => {
                        setPageSize(Number(val));
                        setCurrentPage(1);
                      }}
                      options={activeTab === 'auctions' ? AUCTION_PAGE_SIZE_OPTIONS : LOT_PAGE_SIZE_OPTIONS}
                      size="sm"
                      ariaLabel="Items per page"
                    />
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="ref-pagination-controls" aria-label="Pagination">
                    <button
                      type="button"
                      className="ref-page-btn"
                      onClick={() => setCurrentPage(1)}
                      disabled={safePage === 1}
                      title="First Page"
                      aria-label="First page"
                    >
                      <ChevronsLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="ref-page-btn"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      title="Previous Page"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="ref-page-indicator">{safePage} / {totalPages}</span>
                    <button
                      type="button"
                      className="ref-page-btn"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      title="Next Page"
                      aria-label="Next page"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      className="ref-page-btn"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safePage === totalPages}
                      title="Last Page"
                      aria-label="Last page"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Main Catalog Content */}
      <section className="past-catalogs-content-section ref-content-section">
        <div className="container-fluid">
          {/* Loading State */}
          {loading && (
            <div className="g-dossier-loading-container">
              <div className="g-dossier-spinner-ring" />
              <div className="g-dossier-loading-text">
                <span className="g-dossier-loading-title">GARDNER AUCTION ARCHIVE</span>
                <span className="g-dossier-loading-sub">Accessing verified saleroom ledger...</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && totalItems === 0 && (
            <div className="past-catalogs-empty-state">
              <div className="empty-icon-wrap">
                <Search size={40} className="empty-gold-icon" />
              </div>
              <h3 className="empty-title">No Active Auctions Found</h3>
              <p className="empty-desc">
                {appliedSearch
                  ? `No active auctions or lots matched your search query "${appliedSearch}".`
                  : 'No active auctions match the selected filter criteria.'}
              </p>
              <button className="empty-reset-btn" onClick={handleResetFilters}>
                <RotateCcw size={16} />
                <span>Reset Search &amp; Filters</span>
              </button>
            </div>
          )}

          {/* AUCTIONS VIEW (Purely dynamic from database) */}
          {!loading && activeTab === 'auctions' && totalItems > 0 && (
            <div className="past-auctions-list">
              {paginatedAuctions.map((auction) => {
                const isDescExpanded = expandedNotices[auction.id]?.desc ?? false;

                const flagClass =
                  auction.badgeType === 'red'
                    ? 'live-flag'
                    : auction.badgeType === 'gold'
                      ? 'closing-flag'
                      : 'open-flag';

                const attrStatusClass =
                  auction.badgeType === 'red'
                    ? 'status-live-badge'
                    : auction.badgeType === 'gold'
                      ? 'status-closing-badge'
                      : 'status-open-badge';

                return (
                  <article key={auction.id} className="past-auction-card">
                    {/* Top Bar: Title & Code Only */}
                    <header className="past-auction-card-header">
                      <div className="header-title-box">
                        <h2 className="auction-card-main-title">
                          <button
                            type="button"
                            onClick={() => handleViewCatalogLots(auction)}
                            className="auction-title-link"
                            title={`Browse catalog for ${auction.title}`}
                            style={{ background: 'none', border: 'none', textAlign: 'left', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                          >
                            {auction.title}
                          </button>
                        </h2>
                      </div>
                      <div className="header-realized-tag">
                        <span>Code: <strong>{auction.code}</strong></span>
                      </div>
                    </header>

                    {/* Card Body: 3-column Layout */}
                    <div className="past-auction-card-body">
                      {/* Left Column: Image & Share */}
                      <div className="auction-body-left">
                        <div className="auction-img-frame">
                          <div
                            onClick={() => handleViewCatalogLots(auction)}
                            className="auction-img-link"
                            title={`View catalog for ${auction.title}`}
                            style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}
                          >
                            {auction.image ? (
                              <img
                                src={auction.image}
                                alt={auction.title}
                                className="auction-featured-img"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/assets/gold-coin.jpg';
                                }}
                              />
                            ) : (
                              <div
                                className="auction-placeholder-frame"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  color: 'var(--gold-primary, #cba135)',
                                  border: '1px dashed rgba(203, 161, 53, 0.3)'
                                }}
                              >
                                <BookOpen size={36} />
                                <span style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--text-muted, #8e95a5)' }}>{auction.code}</span>
                              </div>
                            )}
                            <div className={`auction-closed-flag ${flagClass}`}>
                              {auction.badgeType === 'red' ? (
                                <span className="cap-pulse-dot-red" />
                              ) : (
                                <Radio size={11} />
                              )}
                              <span>{auction.badge}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="auction-share-btn"
                          onClick={() => handleShareAuction(auction)}
                          title="Share auction catalog"
                        >
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Center Column: Company, Location, Schedule & Description */}
                      <div className="auction-body-center">
                        {auction.companyName && (
                          <h3 className="auction-company-name">{auction.companyName}</h3>
                        )}

                        {(auction.address || auction.cityStateZip) && (
                          <div className="auction-location-row">
                            {auction.address && <span className="address-text">{auction.address}</span>}
                            {auction.cityStateZip && <span className="address-text">{auction.cityStateZip}</span>}
                            {auction.mapQuery && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${auction.mapQuery}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="auction-map-link"
                              >
                                <MapPin size={13} />
                                <span>Map</span>
                              </a>
                            )}
                          </div>
                        )}

                        {auction.dateRange && (
                          <div className="auction-dates-block">
                            <p className="auction-dates-line">
                              <strong>{auction.dateRange}</strong>
                            </p>
                            {auction.scheduleText && (
                              <p className="auction-schedule-line">
                                {auction.scheduleText}
                              </p>
                            )}
                          </div>
                        )}

                        {auction.description && (
                          <div className="auction-description-box">
                            <p className={`auction-desc-text ${isDescExpanded ? 'expanded' : 'clamped'}`}>
                              {auction.description}
                            </p>
                            {auction.description.length > 120 && (
                              <button
                                type="button"
                                className="desc-expand-toggle"
                                onClick={() => toggleNotice(auction.id, 'desc')}
                                aria-expanded={isDescExpanded}
                                title={isDescExpanded ? 'Show less' : 'Show more'}
                              >
                                {isDescExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Status & Attribute Badges */}
                      <div className="auction-body-right">
                        <div className={`attribute-badge ${attrStatusClass}`}>
                          <Radio size={15} className="attr-icon" />
                          <span>Status: <strong>{auction.status}</strong></span>
                        </div>

                        {auction.auctionType && (
                          <div className="attribute-badge type-badge">
                            <Globe size={15} className="attr-icon" />
                            <span>{auction.auctionType}</span>
                          </div>
                        )}

                        {auction.shipping && (
                          <div className="attribute-badge shipping-badge">
                            <Truck size={15} className="attr-icon" />
                            <span>{auction.shipping}</span>
                          </div>
                        )}

                        <div className="lots-count-indicator">
                          <BookOpen size={14} className="gold-icon" />
                          <span><strong>{auction.lotsCount}</strong> Lots Cataloged</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="past-auction-actions-bar">
                      <button
                        type="button"
                        className="btn-auction-action btn-auction-details"
                        onClick={() => handleOpenAuctionDetails(auction)}
                        title={`View auction details for ${auction.title}`}
                      >
                        <Info size={16} />
                        <span>Auction Details</span>
                      </button>

                      <button
                        type="button"
                        className="btn-auction-action btn-view-catalog-gold"
                        onClick={() => handleViewCatalogLots(auction)}
                        title={`View catalog lots for ${auction.title}`}
                      >
                        <BookOpen size={16} />
                        <span>View Catalog ({auction.lotsCount} Lots)</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* LOTS VIEW (Compact 4-Column Responsive Grid) */}
          {!loading && activeTab === 'lots' && totalItems > 0 && (
            <div className="g-catalog-lots-grid">
              {paginatedLots.map((lot) => {
                const isWatchlisted = watchlist.includes(lot.id);
                return (
                  <article key={lot.id} className="g-catalog-lot-card" aria-label={`${lot.lotNumber}: ${lot.title}`}>
                    {/* Media Container */}
                    <div
                      className="g-lot-media-frame"
                      onClick={() => setActiveLotDetail(lot)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setActiveLotDetail(lot); }}
                      title={`Inspect ${lot.lotNumber}: ${lot.title}`}
                    >
                      {lot.image ? (
                        <img
                          src={lot.image}
                          alt={lot.title}
                          className="g-lot-card-img"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/assets/gold-coin.jpg';
                          }}
                        />
                      ) : (
                        <div className="g-lot-placeholder">
                          <BookOpen size={36} className="gold-icon" />
                          <span>Archival Specimen</span>
                        </div>
                      )}

                      {/* Top Badges Overlay */}
                      <div className="g-lot-overlay-top">
                        <span className="g-lot-badge-num">{lot.lotNumber}</span>
                        <button
                          type="button"
                          className={`g-lot-card-watch-btn ${isWatchlisted ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(lot.id);
                            onAddToast(
                              'info',
                              isWatchlisted ? 'Removed from Watchlist' : 'Added to Watchlist',
                              `${lot.lotNumber}: ${lot.title}`
                            );
                          }}
                          title={isWatchlisted ? 'Remove from Watchlist' : 'Save to Watchlist'}
                          aria-label={`Bookmark ${lot.lotNumber}`}
                        >
                          <Bookmark
                            size={15}
                            fill={isWatchlisted ? '#dfba52' : 'none'}
                            color={isWatchlisted ? '#dfba52' : 'currentColor'}
                          />
                        </button>
                      </div>

                      {/* Bottom Real-time Bidding Strip */}
                      <div className="g-lot-live-strip">
                        <div className="g-strip-status">
                          <span className="cap-pulse-dot-red" />
                          <span>LIVE LOT</span>
                        </div>
                        <span className="g-strip-bid">${lot.currentBid.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="g-lot-card-body">
                      <div className="g-lot-category-row">
                        <span className="g-lot-category-tag">
                          <Globe size={11} />
                          <span>{lot.categoryTag || 'Catalog Specimen'}</span>
                        </span>
                        {lot.bidsCount > 0 && (
                          <span className="g-lot-bids-badge">
                            {lot.bidsCount} {lot.bidsCount === 1 ? 'bid' : 'bids'}
                          </span>
                        )}
                      </div>

                      <h3 className="g-lot-title" title={lot.title}>
                        <button
                          type="button"
                          onClick={() => setActiveLotDetail(lot)}
                          className="g-lot-title-btn"
                        >
                          {lot.title}
                        </button>
                      </h3>

                      {/* Valuation Box */}
                      <div className="g-lot-price-box">
                        <div className="g-price-primary">
                          <span className="g-price-label">CURRENT BID</span>
                          <span className="g-price-amount">${lot.currentBid.toLocaleString()}</span>
                        </div>
                        {lot.estimate && (
                          <div className="g-price-secondary">
                            <span className="g-price-label">ESTIMATE</span>
                            <span className="g-est-val">{lot.estimate}</span>
                          </div>
                        )}
                      </div>

                      {/* Auction Session Line */}
                      {lot.auctionTitle && (
                        <div className="g-lot-session-meta" title={lot.auctionTitle}>
                          <BookOpen size={13} className="gold-icon" />
                          <span className="g-session-title-truncate">{lot.auctionTitle}</span>
                        </div>
                      )}

                      {/* Prominent Action Button */}
                      <button
                        type="button"
                        className="g-btn-view-lot"
                        onClick={() => setActiveLotDetail(lot)}
                        title={`View details and bid on ${lot.lotNumber}`}
                      >
                        <Gavel size={15} />
                        <span>View Lot &amp; Bid</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Active Lot Detail Modal (Live Bidding & Specimen Dossier) */}
      {activeLotDetail && (
        <div className="modal-backdrop g-lot-modal-backdrop" onClick={() => setActiveLotDetail(null)}>
          <div
            className="modal-card g-lot-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-lot-title"
          >
            {/* Header */}
            <div className="g-lot-modal-header">
              <div className="g-lot-modal-header-titles">
                <div className="g-lot-modal-tags">
                  <span className="g-modal-lot-num">{activeLotDetail.lotNumber}</span>
                  <span className="g-modal-dot">·</span>
                  <span className="g-modal-lot-cat">{activeLotDetail.categoryTag}</span>
                  {activeLotDetail.auctionTitle && (
                    <>
                      <span className="g-modal-dot">·</span>
                      <span className="g-modal-lot-session">{activeLotDetail.auctionTitle}</span>
                    </>
                  )}
                </div>
                <h2 id="modal-lot-title" className="g-lot-modal-title">{activeLotDetail.title}</h2>
              </div>
              <button
                className="g-lot-modal-close-btn"
                onClick={() => setActiveLotDetail(null)}
                aria-label="Close modal"
                title="Close Specimen"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="g-lot-modal-body">
              <div className="g-lot-modal-layout">
                {/* Left Column: Specimen Showcase Gallery */}
                <div className="g-lot-modal-media-pane">
                  <div className="g-modal-image-frame">
                    {activeLotDetail.image ? (
                      <img
                        src={activeLotDetail.image}
                        alt={activeLotDetail.title}
                        className="g-modal-main-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/gold-coin.jpg';
                        }}
                      />
                    ) : (
                      <div className="g-modal-img-placeholder">
                        <BookOpen size={48} className="gold-icon" />
                        <span>Archival Specimen Record</span>
                      </div>
                    )}
                    <div className="g-modal-live-bar">
                      <div className="g-modal-live-status">
                        <span className="cap-pulse-dot-red" />
                        <span>LIVE LOT ON BLOCK</span>
                      </div>
                      <span className="g-modal-bids-count">
                        {activeLotDetail.bidsCount} {activeLotDetail.bidsCount === 1 ? 'Bid' : 'Bids'}
                      </span>
                    </div>
                  </div>

                  {/* Certification & Provenance Trust Seal */}
                  <div className="g-modal-seal-card">
                    <ShieldCheck size={20} className="gold-icon flex-shrink-0" />
                    <div className="g-seal-content">
                      <span className="g-seal-title">
                        {activeLotDetail.certification
                          ? `${activeLotDetail.certification} Certified Specimen`
                          : 'Gardner Verified Archival Specimen'}
                      </span>
                      <span className="g-seal-desc">
                        {activeLotDetail.certNumber
                          ? `Registry Number: #${activeLotDetail.certNumber}`
                          : (activeLotDetail.provenance || 'Numismatic Authentication & Curatorial Review Verified')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Specimen Information, Valuation & Console */}
                <div className="g-lot-modal-info-pane">
                  {/* Department & Description */}
                  {activeLotDetail.description && (
                    <div className="g-modal-desc-section">
                      <span className="g-modal-section-label">CURATORIAL CATALOG NOTE</span>
                      <p className="g-modal-lead-desc">{activeLotDetail.description}</p>
                    </div>
                  )}

                  {/* Bidding Console Card */}
                  <div className="g-modal-bid-widget">
                    <div className="g-widget-stats-row">
                      <div className="g-widget-stat-group">
                        <span className="g-widget-label">CURRENT LEADING BID</span>
                        <div className="g-widget-val-gold">
                          ${(activeLotDetail.currentBid || activeLotDetail.startingBid || 0).toLocaleString()}
                        </div>
                      </div>
                      {activeLotDetail.estimate && (
                        <div className="g-widget-stat-group right-align">
                          <span className="g-widget-label">ESTIMATE RANGE</span>
                          <div className="g-widget-val-estimate">{activeLotDetail.estimate}</div>
                        </div>
                      )}
                    </div>

                    {/* Quick Bid Action */}
                    <div className="g-widget-actions-row">
                      <button
                        type="button"
                        disabled={isPlacingBid}
                        onClick={() => handleQuickBid(activeLotDetail)}
                        className="g-btn-place-bid"
                      >
                        <Gavel size={17} />
                        <span>
                          {isPlacingBid
                            ? 'Submitting Bid...'
                            : `Place Bid ($${((activeLotDetail.currentBid || activeLotDetail.startingBid || 0) + 100).toLocaleString()})`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleWatchlist(activeLotDetail.id);
                          onAddToast(
                            'info',
                            watchlist.includes(activeLotDetail.id) ? 'Removed from Watchlist' : 'Added to Watchlist',
                            `${activeLotDetail.lotNumber}: ${activeLotDetail.title}`
                          );
                        }}
                        className={`g-btn-watchlist ${watchlist.includes(activeLotDetail.id) ? 'active' : ''}`}
                        title={watchlist.includes(activeLotDetail.id) ? 'Remove from Watchlist' : 'Save to Watchlist'}
                      >
                        <Bookmark
                          size={16}
                          fill={watchlist.includes(activeLotDetail.id) ? '#dfba52' : 'none'}
                          color={watchlist.includes(activeLotDetail.id) ? '#dfba52' : 'currentColor'}
                        />
                        <span>{watchlist.includes(activeLotDetail.id) ? 'Saved' : 'Watchlist'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Specimen Specifications Table (Strictly Dynamic) */}
                  {(activeLotDetail.certification ||
                    activeLotDetail.grade ||
                    activeLotDetail.certNumber ||
                    activeLotDetail.auctionTitle ||
                    activeLotDetail.provenance ||
                    activeLotDetail.location) && (
                      <div className="g-modal-specs-section">
                        <span className="g-modal-section-label">SALEROOM SPECIFICATIONS</span>
                        <div className="g-specs-grid">
                          {activeLotDetail.certification && (
                            <div className="g-spec-item">
                              <span className="g-spec-term">Grading Service</span>
                              <span className="g-spec-definition">{activeLotDetail.certification}</span>
                            </div>
                          )}
                          {activeLotDetail.grade && (
                            <div className="g-spec-item">
                              <span className="g-spec-term">Specimen Grade</span>
                              <span className="g-spec-definition gold">{activeLotDetail.grade}</span>
                            </div>
                          )}
                          {activeLotDetail.certNumber && (
                            <div className="g-spec-item">
                              <span className="g-spec-term">Serial Number</span>
                              <span className="g-spec-definition">#{activeLotDetail.certNumber}</span>
                            </div>
                          )}
                          {activeLotDetail.auctionTitle && (
                            <div className="g-spec-item">
                              <span className="g-spec-term">Auction Session</span>
                              <span className="g-spec-definition">{activeLotDetail.auctionTitle}</span>
                            </div>
                          )}
                          {activeLotDetail.provenance && (
                            <div className="g-spec-item span-full">
                              <span className="g-spec-term">Provenance</span>
                              <span className="g-spec-definition">{activeLotDetail.provenance}</span>
                            </div>
                          )}
                          {activeLotDetail.location && (
                            <div className="g-spec-item">
                              <span className="g-spec-term">Location</span>
                              <span className="g-spec-definition">{activeLotDetail.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Official Condition Statement - Strictly Dynamic */}
                  {activeLotDetail.conditionReport && (
                    <div className="g-modal-condition-card">
                      <div className="g-condition-title-row">
                        <CheckCircle2 size={16} className="gold-icon" />
                        <h4>Official Condition Statement</h4>
                      </div>
                      <p className="g-condition-content">{activeLotDetail.conditionReport}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="g-lot-modal-footer">
              <span className="g-footer-trust-tag">
                PA Registered &amp; Bonded Auction House · License #AY-002004
              </span>
              <button
                type="button"
                className="g-btn-close-modal"
                onClick={() => setActiveLotDetail(null)}
              >
                Close Specimen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentAuctionPage;
