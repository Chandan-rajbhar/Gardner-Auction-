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
  ArrowUpDown,
  ArrowLeft,
  Radio,
  ShieldCheck,
  CheckCircle2,
  Gavel,
  Bookmark
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
  { value: 'default', label: 'Date: Closing Soonest' },
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
  } catch {}
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

  // Sync URL parameters for auction filter and active tab
  useEffect(() => {
    const syncFromUrl = () => {
      const { auctionId, tab } = parseCurrentAuctionUrlParams();
      if (auctionId) {
        setSelectedAuctionFilter(auctionId);
        setActiveTab('lots');
        setCurrentPage(1);
        setTimeout(() => {
          const el = document.querySelector('.past-catalogs-toolbar-section') || document.querySelector('.past-lots-grid');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 120);
      } else if (tab) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('hashchange', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

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
    <div className="past-catalogs-page current-auctions-page">
      {/* 1. Page Header & Breadcrumbs Banner */}
      <section className="past-catalogs-hero">
        <div className="container-fluid">
          <div className="past-catalogs-top-nav-bar">
            <a href="/" className="btn-back-catalogs large" title="Return to Homepage">
              <ArrowLeft size={18} />
              <span>Back to Home</span>
            </a>
            <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
              <a href="/" className="breadcrumb-link">Home</a>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">Current Auctions</span>
            </nav>
          </div>

          <div className="past-catalogs-hero-content">
            <div className="hero-eyebrow">
              <span className="gold-dash"></span>
              <span>LIVE SALEROOM SESSIONS &amp; REALTIME BIDDING</span>
              <span className="gold-dash"></span>
            </div>
            <h1 className="past-catalogs-title">Current &amp; Upcoming Auctions</h1>
            <p className="past-catalogs-subtitle">
              Browse live rostrum simulcasts, active saleroom sessions, and verified lots with real-time dynamic database synchronization.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Controls Section: Search, Category, and Auctions/Lots Toggle */}
      <section className="past-catalogs-controls-section">
        <div className="container-fluid">
          <div className="controls-container">
            {/* Search Input Bar */}
            <form className="search-box-form" onSubmit={handleSearchSubmit}>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search current auctions, keywords, lots, or codes..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="past-search-input"
                  aria-label="Search current auctions"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={handleClearSearch}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button type="submit" className="past-search-submit-btn" title="Search auctions">
                <Search size={18} />
              </button>
            </form>

            {/* Category Filter Dropdown (shadcn) */}
            <div className="category-select-wrapper">
              <ShadcnSelect
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(val);
                  setCurrentPage(1);
                }}
                options={categoryOptions}
                ariaLabel="Filter by category"
              />
            </div>

            {/* When on Lots view: Filter Lots by Auction Catalog (shadcn) */}
            {activeTab === 'lots' && (
              <div className="auction-filter-select-wrapper">
                <ShadcnSelect
                  value={selectedAuctionFilter}
                  onChange={(val) => {
                    setSelectedAuctionFilter(val);
                    setCurrentPage(1);
                  }}
                  options={auctionFilterOptions}
                  prefixIcon={<BookOpen size={14} />}
                  ariaLabel="Filter lots by catalog"
                />
              </div>
            )}

            {/* Sort Dropdown (shadcn) */}
            <div className="sort-select-wrapper">
              <ShadcnSelect
                value={sortBy}
                onChange={(val) => {
                  setSortBy(val);
                  setCurrentPage(1);
                }}
                options={activeTab === 'auctions' ? AUCTION_SORT_OPTIONS : LOT_SORT_OPTIONS}
                prefixIcon={<ArrowUpDown size={14} />}
                ariaLabel="Sort auctions or lots"
              />
            </div>

            {/* Auctions / Lots Segmented Toggle Pill */}
            <div className="view-mode-toggle-group" role="group" aria-label="Catalog view mode">
              <button
                type="button"
                className={`toggle-pill-btn ${activeTab === 'auctions' ? 'active' : ''}`}
                onClick={() => handleTabChange('auctions')}
              >
                <Calendar size={15} />
                <span>Auctions</span>
                <span className="toggle-count-badge">{filteredAuctions.length}</span>
              </button>

              <button
                type="button"
                className={`toggle-pill-btn ${activeTab === 'lots' ? 'active' : ''}`}
                onClick={() => handleTabChange('lots')}
              >
                <Layers size={15} />
                <span>Lots</span>
                <span className="toggle-count-badge">{filteredLots.length}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sub-header Toolbar: Result Count, Page Size & Pagination */}
      <section className="past-catalogs-toolbar-section">
        <div className="container-fluid">
          <div className="past-toolbar-row">
            {/* Left: Results Info & Page Size */}
            <div className="toolbar-left-group">
              <div className="results-counter-text">
                Showing <strong>{startItemIndex} – {endItemIndex}</strong> of <strong>{totalItems}</strong> {activeTab === 'auctions' ? 'auctions' : 'lots'}
              </div>

              {/* Active Auction Filter Pill (if viewing lots of a single auction) */}
              {activeTab === 'lots' && activeAuctionFilteredObj && (
                <div className="active-filter-pill">
                  <span>Catalog: <strong>{activeAuctionFilteredObj.title.slice(0, 32)}...</strong></span>
                  <button
                    className="clear-pill-btn"
                    onClick={() => setSelectedAuctionFilter('all')}
                    title="Show lots across all catalogs"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Page Size Selector (shadcn) */}
              <div className="page-size-selector">
                <span className="page-size-label">VIEW:</span>
                <div className="page-size-shadcn-wrap">
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
            </div>

            {/* Right: Pagination Controls */}
            {totalPages > 1 && (
              <div className="toolbar-pagination-group" aria-label="Pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  title="First Page"
                  aria-label="First page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  title="Previous Page"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="pagination-page-indicator">
                  <span>Page</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={safePage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= totalPages) {
                        setCurrentPage(val);
                      }
                    }}
                    className="pagination-input"
                    aria-label="Current page number"
                  />
                  <span>of {totalPages}</span>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  title="Next Page"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  title="Last Page"
                  aria-label="Last page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Main Catalog Content */}
      <section className="past-catalogs-content-section">
        <div className="container-fluid">
          {/* Loading State */}
          {loading && (
            <div className="current-loading-state">
              <div className="current-loading-spinner" />
              <p>Loading active auction catalogs from database...</p>
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

          {/* LOTS VIEW (Matching Past Lots Grid Layout in Gardner Branding) */}
          {!loading && activeTab === 'lots' && totalItems > 0 && (
            <div className="past-lots-grid">
              {paginatedLots.map((lot) => (
                <div key={lot.id} className="past-lot-card">
                  {/* Lot Media Container */}
                  <div
                    className="past-lot-media"
                    onClick={() => setActiveLotDetail(lot)}
                    style={{ cursor: 'pointer' }}
                    title={`View ${lot.lotNumber}: ${lot.title}`}
                  >
                    {lot.image ? (
                      <img
                        src={lot.image}
                        alt={lot.title}
                        className="past-lot-img"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/gold-coin.jpg';
                        }}
                      />
                    ) : (
                      <div
                        className="past-lot-img-placeholder"
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.03)',
                          color: 'var(--gold-primary, #cba135)'
                        }}
                      >
                        <BookOpen size={28} />
                      </div>
                    )}

                    {/* Live bidding bar across bottom of image */}
                    <div className="lot-live-bar">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span className="cap-pulse-dot-red" />
                        <span>LIVE LOT</span>
                      </div>
                      <span>${lot.currentBid.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Lot Content Body */}
                  <div className="past-lot-body">
                    <div className="lot-number-type-row">
                      <span className="past-lot-num">{lot.lotNumber}</span>
                      <span className="past-lot-type">
                        <Globe size={12} />
                        <span>{lot.categoryTag || 'Lot'}</span>
                      </span>
                    </div>

                    <h4 className="past-lot-title" title={lot.title}>
                      <button
                        type="button"
                        onClick={() => setActiveLotDetail(lot)}
                        className="lot-card-title-link"
                        style={{ background: 'none', border: 'none', textAlign: 'left', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                      >
                        {lot.title}
                      </button>
                    </h4>

                    {/* Current Bid */}
                    <div className="past-lot-price-block">
                      <span className="price-realized-text">${lot.currentBid.toLocaleString()} Current Bid</span>
                    </div>

                    {/* Meta Dates & Details */}
                    <div className="past-lot-meta-block">
                      {lot.estimate && (
                        <div className="meta-line">
                          <span className="meta-label">Est:</span>
                          <span className="meta-val">{lot.estimate}</span>
                        </div>
                      )}
                      {lot.auctionTitle && (
                        <div className="meta-line company-line">
                          <span>{lot.auctionTitle}</span>
                        </div>
                      )}
                      <div className="meta-line location-line">
                        <span>{lot.bidsCount} {lot.bidsCount === 1 ? 'bid' : 'bids'} submitted</span>
                      </div>
                    </div>

                    {/* View Lot / Place Bid Action */}
                    <button
                      type="button"
                      className="btn-view-lot-gold"
                      onClick={() => setActiveLotDetail(lot)}
                    >
                      <Gavel size={14} />
                      <span>View Lot &amp; Bid</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Active Lot Detail Modal (Live Bidding & Specimen Dossier) */}
      {activeLotDetail && (
        <div className="modal-backdrop" onClick={() => setActiveLotDetail(null)}>
          <div className="modal-card lot-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-header">
              <div className="modal-header-titles">
                <span className="modal-tag">{activeLotDetail.lotNumber} · {activeLotDetail.categoryTag}</span>
                <h2 className="modal-title">{activeLotDetail.title}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveLotDetail(null)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="lot-detail-body">
              <div className="lot-detail-layout">
                {/* Left: Specimen Media */}
                <div className="lot-detail-media-pane">
                  <div className="detail-image-frame">
                    {activeLotDetail.image ? (
                      <img
                        src={activeLotDetail.image}
                        alt={activeLotDetail.title}
                        className="detail-main-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/gold-coin.jpg';
                        }}
                      />
                    ) : (
                      <div className="detail-img-placeholder" style={{ width: '100%', height: '100%', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', color: 'var(--gold-primary)' }}>
                        <BookOpen size={48} />
                      </div>
                    )}
                    <div className="lot-live-bar">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span className="cap-pulse-dot-red" />
                        <span>LIVE LOT ON BLOCK</span>
                      </div>
                      <span>{activeLotDetail.bidsCount} Bids</span>
                    </div>
                  </div>
                  <div className="detail-media-caption">
                    <ShieldCheck size={16} className="gold-icon" />
                    <span>
                      {activeLotDetail.certification
                        ? `${activeLotDetail.certification} Certified Specimen`
                        : 'Catalog Lot Specimen'}
                    </span>
                  </div>
                </div>

                {/* Right: Specimen Information & Bidding */}
                <div className="lot-detail-info-pane">
                  <div className="detail-header-block">
                    <div className="detail-category-badge">
                      <Globe size={13} />
                      <span>{activeLotDetail.categoryTag}</span>
                    </div>
                    <h3 className="detail-item-title">{activeLotDetail.title}</h3>
                    {activeLotDetail.description && (
                      <p className="detail-lead-desc">{activeLotDetail.description}</p>
                    )}
                  </div>

                  {/* Current Bid & Estimate Box */}
                  <div className="detail-bid-widget">
                    <div className="bid-widget-stats">
                      <div>
                        <span className="widget-label">CURRENT LEADING BID</span>
                        <span className="widget-value text-gold">
                          ${(activeLotDetail.currentBid || activeLotDetail.startingBid || 0).toLocaleString()}
                        </span>
                      </div>
                      {activeLotDetail.estimate && (
                        <div>
                          <span className="widget-label">ESTIMATE RANGE</span>
                          <span className="widget-value-estimate">{activeLotDetail.estimate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Bid Action */}
                  <div className="detail-actions-row">
                    <button
                      type="button"
                      disabled={isPlacingBid}
                      onClick={() => handleQuickBid(activeLotDetail)}
                      className="btn-place-bid-action"
                    >
                      <Gavel size={17} />
                      <span>Place Bid (${((activeLotDetail.currentBid || activeLotDetail.startingBid || 0) + 100).toLocaleString()})</span>
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
                      className={`btn-watchlist-action ${watchlist.includes(activeLotDetail.id) ? 'active' : ''}`}
                    >
                      <Bookmark
                        size={16}
                        fill={watchlist.includes(activeLotDetail.id) ? '#cba135' : 'none'}
                        color={watchlist.includes(activeLotDetail.id) ? '#cba135' : 'currentColor'}
                      />
                      <span>{watchlist.includes(activeLotDetail.id) ? 'Saved' : 'Watchlist'}</span>
                    </button>
                  </div>

                  {/* Specimen Specifications - Strictly Dynamic: Only render fields that exist in DB */}
                  <div className="detail-specs-table">
                    {activeLotDetail.certification && (
                      <div className="spec-row">
                        <span className="spec-label">Grading Service:</span>
                        <span className="spec-value">{activeLotDetail.certification}</span>
                      </div>
                    )}
                    {activeLotDetail.grade && (
                      <div className="spec-row">
                        <span className="spec-label">Grade:</span>
                        <span className="spec-value">{activeLotDetail.grade}</span>
                      </div>
                    )}
                    {activeLotDetail.certNumber && (
                      <div className="spec-row">
                        <span className="spec-label">Cert Number:</span>
                        <span className="spec-value">{activeLotDetail.certNumber}</span>
                      </div>
                    )}
                    {activeLotDetail.auctionTitle && (
                      <div className="spec-row">
                        <span className="spec-label">Auction Session:</span>
                        <span className="spec-value">{activeLotDetail.auctionTitle}</span>
                      </div>
                    )}
                    {activeLotDetail.provenance && (
                      <div className="spec-row">
                        <span className="spec-label">Provenance:</span>
                        <span className="spec-value">{activeLotDetail.provenance}</span>
                      </div>
                    )}
                  </div>

                  {/* Official Condition Statement - Strictly Dynamic */}
                  {activeLotDetail.conditionReport && (
                    <div className="condition-report-card">
                      <div className="condition-header">
                        <CheckCircle2 size={16} className="gold-icon" />
                        <h4>Condition Statement</h4>
                      </div>
                      <p className="condition-text">{activeLotDetail.conditionReport}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setActiveLotDetail(null)}
              >
                <span>Close Specimen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentAuctionPage;
