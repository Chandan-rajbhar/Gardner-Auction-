import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Lock,
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
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  isConcludedAuction,
  isCompletedLot,
  formatAuctionDates,
  formatCurrency,
  calculateAuctionTotalRealized
} from '../lib/auctionHelpers';
import { PastAuctionDetailModal } from './PastAuctionDetailModal';
import { PastLotDetailModal } from './PastLotDetailModal';
import { ShadcnSelect } from './ui/ShadcnSelect';
import type { ShadcnSelectOption } from './ui/ShadcnSelect';

export interface PastLotItem {
  id: string;
  auctionId: string;
  auctionTitle: string;
  lotNumber: string;
  rawLotNumber?: number;
  categoryTag: string;
  department: string;
  title: string;
  description: string;
  details: string;
  image: string;
  priceRealized: string;
  rawPriceRealized?: number;
  startingBid: number;
  estimateLow: number;
  estimateHigh: number;
  bidsCount: number;
  dateSold: string;
  auctionHouse: string;
  location: string;
  shipping: string;
  provenance: string;
  conditionReport: string;
  dimensions?: string;
  specialistNote: string;
  certification?: string;
  grade?: string;
  certNumber?: string;
}

export interface PastAuction {
  id: string;
  code?: string;
  title: string;
  auctionType: 'Online Only Auction' | 'Live Webcast Auction' | 'In-Room & Online' | string;
  status: 'Past Auction' | 'Concluded' | string;
  companyName: string;
  address: string;
  cityStateZip: string;
  mapQuery: string;
  dateRange: string;
  scheduleText: string;
  description: string;
  biddingNotice: string;
  auctionNotice: string;
  image: string;
  category: string;
  lotsCount: number;
  totalRealized: string;
  shipping: string;
  lots: PastLotItem[];
}

const AUCTION_SORT_OPTIONS: ShadcnSelectOption[] = [
  { value: 'default', label: 'Date: Newest First' },
  { value: 'date-asc', label: 'Date: Oldest First' },
  { value: 'lots-desc', label: 'Lots: Most Lots' },
  { value: 'title-asc', label: 'Title: A to Z' }
];

const LOT_SORT_OPTIONS: ShadcnSelectOption[] = [
  { value: 'default', label: 'Lot #: Ascending' },
  { value: 'price-desc', label: 'Price Realized: High to Low' },
  { value: 'price-asc', label: 'Price Realized: Low to High' },
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

interface PastCatalogsPageProps {
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const PastCatalogsPage: React.FC<PastCatalogsPageProps> = ({
  onShowToast
}) => {
  // 1. Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Dynamic Data from Supabase
  const [concludedAuctions, setConcludedAuctions] = useState<PastAuction[]>([]);
  const [allCompletedLots, setAllCompletedLots] = useState<PastLotItem[]>([]);
  const [allAuctionsLookup, setAllAuctionsLookup] = useState<any[]>([]);

  // 3. View mode: 'auctions' or 'lots'
  const [activeTab, setActiveTab] = useState<'auctions' | 'lots'>('auctions');

  // 4. Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuctionFilter, setSelectedAuctionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  // 5. Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6); // Default 6 per page for auctions

  // 6. Notice expansion toggles per auction
  const [expandedNotices, setExpandedNotices] = useState<Record<string, { bidding?: boolean; auction?: boolean; desc?: boolean }>>({});

  // 7. Active Modals
  const [activeAuctionDetail, setActiveAuctionDetail] = useState<PastAuction | null>(null);
  const [activeLotDetail, setActiveLotDetail] = useState<PastLotItem | null>(null);

  // Parse initial query params from URL
  const parseUrlParams = useCallback(() => {
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const query = hash.includes('?') ? hash.split('?')[1] : search.replace(/^\?/, '');
      if (query) {
        const p = new URLSearchParams(query);
        const auctionId = p.get('auction') || p.get('catalog') || p.get('id');
        const tabParam = p.get('tab');
        if (auctionId) {
          setSelectedAuctionFilter(auctionId);
          setActiveTab('lots');
          setPageSize(12);
        } else if (tabParam === 'lots') {
          setActiveTab('lots');
          setPageSize(12);
        } else if (tabParam === 'auctions') {
          setActiveTab('auctions');
          setPageSize(6);
        }
      }
    } catch (_) {}
  }, []);

  // Fetch Supabase concluded auctions, completed lots, and realization data
  const fetchPastCatalogsData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const [
        { data: auctionsData, error: errA },
        { data: lotsData, error: errL },
        { data: invoicesData },
        { data: settlementsData }
      ] = await Promise.all([
        supabase.from('auctions').select('*').order('created_at', { ascending: false }),
        supabase.from('lots').select('*').order('lot_number', { ascending: true }),
        supabase.from('invoices').select('*'),
        supabase.from('seller_settlements').select('*')
      ]);

      if (errA || errL) {
        throw new Error(errA?.message || errL?.message || 'Failed to fetch catalog records');
      }

      const rawAuctions = Array.isArray(auctionsData) ? auctionsData : [];
      const rawLots = Array.isArray(lotsData) ? lotsData : [];
      const rawInvoices = Array.isArray(invoicesData) ? invoicesData : [];
      const rawSettlements = Array.isArray(settlementsData) ? settlementsData : [];

      setAllAuctionsLookup(rawAuctions);

      // Map completed lots: Show sold/completed lots in Past Auctions -> Lots
      // Include lots belonging to concluded auctions AND sold lots from active auctions
      // Do NOT show unsold lots as completed lots
      const completedLotsRaw = rawLots.filter((l) => isCompletedLot(l.status));

      const mappedCompletedLots: PastLotItem[] = completedLotsRaw.map((l) => {
        const parentAuc = rawAuctions.find((a) => a.id === l.auction_id || a.code === l.auction_id);
        const numVal = Number(l.lot_number) || 0;
        const lotNumberStr = l.lot_number
          ? (String(l.lot_number).toLowerCase().startsWith('lot') ? String(l.lot_number) : `Lot ${l.lot_number}`)
          : 'Lot';

        const soldAmount = Number(l.hammer_price) || Number(l.sold_price) || Number(l.current_bid) || 0;
        const priceRealizedStr = formatCurrency(soldAmount);

        let dateSoldStr = 'Concluded';
        if (l.updated_at) {
          try {
            const d = new Date(l.updated_at);
            if (!isNaN(d.getTime())) {
              dateSoldStr = d.toLocaleDateString('en-US');
            }
          } catch (_) {}
        } else if (parentAuc?.end_date) {
          dateSoldStr = parentAuc.end_date;
        }

        const street = [parentAuc?.address1, parentAuc?.address2].filter(Boolean).join(', ');
        const locationStr = [street, parentAuc?.city, parentAuc?.state].filter(Boolean).join(', ') || 'Pittsburgh, PA';

        return {
          id: l.id,
          auctionId: l.auction_id,
          auctionTitle: parentAuc ? parentAuc.name : 'Gardner Auction',
          lotNumber: lotNumberStr,
          rawLotNumber: numVal,
          categoryTag: (l.category || parentAuc?.category || 'RARE NUMISMATICS').toUpperCase(),
          department: l.category || parentAuc?.category || 'Coins & Currency',
          title: l.title || lotNumberStr,
          description: (l.condition_report || l.description || l.title || '').trim(),
          details: (l.description || l.condition_report || '').trim(),
          image: l.image || '/images/hero_coin.jpg',
          priceRealized: priceRealizedStr,
          rawPriceRealized: soldAmount,
          startingBid: Number(l.starting_bid) || 0,
          estimateLow: Number(l.estimate_low) || 0,
          estimateHigh: Number(l.estimate_high) || 0,
          bidsCount: Number(l.bids_count) || 0,
          dateSold: dateSoldStr,
          auctionHouse: parentAuc?.name || 'Gardner Auction Appraisers',
          location: locationStr,
          shipping: parentAuc?.shipping_availability || 'Shipping Available',
          provenance: l.provenance || 'Private Collection; Gardner Verified.',
          conditionReport: l.condition_report || 'Verified condition inspection report completed.',
          specialistNote: l.grade ? `Graded: ${l.grade}` : '',
          certification: l.certification || '',
          grade: l.grade || '',
          certNumber: l.cert_number || ''
        };
      });

      setAllCompletedLots(mappedCompletedLots);

      // Map Concluded/Completed Auctions for the Auctions tab
      const concludedRaw = rawAuctions.filter((a) => isConcludedAuction(a.status));

      const mappedPastAuctions: PastAuction[] = concludedRaw.map((a) => {
        // Documented lots for this auction (all associated lots in the catalog)
        const matchingLots = rawLots.filter((l) => l.auction_id === a.id || l.auction_id === a.code);
        const matchingCompletedLots = mappedCompletedLots.filter((l) => l.auctionId === a.id || l.auctionId === a.code);

        // Dynamic Total Realized calculation
        const totalRealizedStr = calculateAuctionTotalRealized(a.id, rawLots, rawInvoices, rawSettlements);

        // Featured image
        let img = '/images/hero_coin.jpg';
        if (Array.isArray(a.featured_images) && a.featured_images.length > 0) {
          const first = a.featured_images[0];
          img = typeof first === 'string' ? first : (first?.url || img);
        } else if (matchingLots[0]?.image) {
          img = matchingLots[0].image;
        }

        const street = [a.address1, a.address2].filter(Boolean).map((s: string) => s.trim()).join(', ') || '4200 Commercial Boulevard, Suite 100';
        const cityStateZip = [a.city, a.state, a.zip].filter(Boolean).map((s: string) => s.trim()).join(' ') || 'Pittsburgh, PA 15201';
        const fullLocation = [street, cityStateZip, a.country].filter(Boolean).join(', ');
        const mapQuery = fullLocation ? encodeURIComponent(fullLocation) : 'Pittsburgh+PA';

        const dateRangeStr = formatAuctionDates(a.start_date, a.end_date) || (a.upload_settings?.auctionDateTimes || 'Dates Concluded');
        let scheduleText = '';
        if (a.upload_settings?.closeBiddingDate) {
          scheduleText = `Closed ${a.upload_settings.closeBiddingDate} ${a.upload_settings.closeBiddingTime ? `@ ${a.upload_settings.closeBiddingTime}` : ''}`;
        } else if (a.end_date) {
          scheduleText = `Session adjourned ${a.end_date}`;
        } else {
          scheduleText = 'All lots concluded and awarded';
        }

        const biddingNotice = (
          a.upload_settings?.biddingNotice ||
          a.bidding_notice ||
          a.terms ||
          'All lots in this catalog have concluded and closed for live bidding. Realized prices reflect the final gavel hammer price including standard 15% Buyer\'s Premium. Registered winning bidders received electronic settlement invoices within 24 hours of session adjournment. Title transferred with full legal guarantee.'
        ).trim();

        const auctionNotice = (
          a.upload_settings?.auctionNotice ||
          a.auction_notice ||
          a.payment_info ||
          'PA Auctioneer Lic. # AY-002004. Certified numismatic specimens encapsulated by PCGS, NGC, or CAC with tamper-evident sonic seal security holders. In-person property previews were conducted at our Pittsburgh gallery. Direct specialist inquiries to coins@gardnerauction.com.'
        ).trim();

        return {
          id: a.id,
          code: a.code || `AUC-${a.id.slice(-4)}`,
          title: a.name || 'Concluded Auction Catalog',
          auctionType: a.auction_type || a.upload_settings?.biddingType || 'Online Only Auction',
          status: 'Concluded',
          companyName: a.company_name || 'Gardner Auction Appraisers',
          address: street,
          cityStateZip,
          mapQuery,
          dateRange: dateRangeStr,
          scheduleText,
          description: (a.description || 'Verified authentic curated collectibles auction session recorded by Gardner Auction Appraisers.').trim(),
          biddingNotice,
          auctionNotice,
          image: img,
          category: a.category || (matchingLots[0]?.category || 'Coins & Currency'),
          lotsCount: matchingLots.length,
          totalRealized: totalRealizedStr,
          shipping: a.shipping_availability || 'Shipping Available',
          lots: matchingCompletedLots
        };
      });

      setConcludedAuctions(mappedPastAuctions);
    } catch (err) {
      console.error('[PastCatalogsPage] Supabase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Supabase');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial mount: load data and parse URL
  useEffect(() => {
    fetchPastCatalogsData();
    parseUrlParams();

    const handleHashChange = () => {
      parseUrlParams();
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // Supabase Realtime channel for live updates when auctions, lots, or invoices update
    const channel = supabase
      .channel('past-catalogs-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => {
        fetchPastCatalogsData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => {
        fetchPastCatalogsData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchPastCatalogsData(true);
      })
      .subscribe();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
      supabase.removeChannel(channel);
    };
  }, [fetchPastCatalogsData, parseUrlParams]);

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

  // Dynamic Category Options extracted from dynamic concluded auctions and completed lots
  const categoryOptions = useMemo<ShadcnSelectOption[]>(() => {
    const cats = new Set<string>();
    concludedAuctions.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    allCompletedLots.forEach((l) => {
      if (l.department) cats.add(l.department);
      if (l.categoryTag) cats.add(l.categoryTag);
    });

    const list = Array.from(cats).filter(Boolean);
    return [
      { value: 'all', label: 'All Categories' },
      ...list.map((c) => ({ value: c, label: c }))
    ];
  }, [concludedAuctions, allCompletedLots]);

  // Dynamic Auction Catalog Options for Lots view
  const auctionFilterOptions = useMemo<ShadcnSelectOption[]>(() => {
    // Unique auctions that exist or have lots
    const optionsMap = new Map<string, { label: string; count: number }>();

    // Add concluded auctions
    concludedAuctions.forEach((a) => {
      const count = allCompletedLots.filter((l) => l.auctionId === a.id || l.auctionId === a.code).length;
      optionsMap.set(a.id, { label: a.title, count });
    });

    // Also include any active auctions that have sold/completed lots
    allCompletedLots.forEach((l) => {
      if (!optionsMap.has(l.auctionId)) {
        const parentAuc = allAuctionsLookup.find((a) => a.id === l.auctionId || a.code === l.auctionId);
        const title = parentAuc?.name || l.auctionTitle || l.auctionId;
        const count = allCompletedLots.filter((item) => item.auctionId === l.auctionId).length;
        optionsMap.set(l.auctionId, { label: title, count });
      }
    });

    const entries = Array.from(optionsMap.entries()).map(([id, info]) => ({
      value: id,
      label: info.label,
      badge: `${info.count} lots`
    }));

    return [
      { value: 'all', label: 'All Catalogs' },
      ...entries
    ];
  }, [concludedAuctions, allCompletedLots, allAuctionsLookup]);

  // Filtered Auctions (Strictly from dynamic database concluded auctions)
  const filteredAuctions = useMemo(() => {
    let list = concludedAuctions.filter((auction) => {
      const searchLower = appliedSearch.toLowerCase();
      const matchesSearch =
        !appliedSearch ||
        auction.title.toLowerCase().includes(searchLower) ||
        (auction.code && auction.code.toLowerCase().includes(searchLower)) ||
        auction.description.toLowerCase().includes(searchLower) ||
        auction.address.toLowerCase().includes(searchLower) ||
        auction.companyName.toLowerCase().includes(searchLower) ||
        auction.category.toLowerCase().includes(searchLower) ||
        auction.dateRange.toLowerCase().includes(searchLower) ||
        auction.lots.some((l) => l.title.toLowerCase().includes(searchLower) || l.lotNumber.toLowerCase().includes(searchLower));

      const matchesCategory =
        selectedCategory === 'all' ||
        auction.category.toLowerCase() === selectedCategory.toLowerCase();

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
  }, [concludedAuctions, appliedSearch, selectedCategory, sortBy]);

  // Filtered Completed Lots (Strictly from dynamic database completed lots)
  const filteredLots = useMemo(() => {
    let lots = allCompletedLots;

    if (selectedAuctionFilter !== 'all') {
      lots = lots.filter(
        (l) => l.auctionId === selectedAuctionFilter || (l as any).auctionCode === selectedAuctionFilter
      );
    }

    lots = lots.filter((lot) => {
      const searchLower = appliedSearch.toLowerCase();
      const matchesSearch =
        !appliedSearch ||
        lot.title.toLowerCase().includes(searchLower) ||
        lot.lotNumber.toLowerCase().includes(searchLower) ||
        lot.description.toLowerCase().includes(searchLower) ||
        lot.categoryTag.toLowerCase().includes(searchLower) ||
        lot.department.toLowerCase().includes(searchLower) ||
        lot.auctionTitle.toLowerCase().includes(searchLower);

      const matchesCategory =
        selectedCategory === 'all' ||
        lot.department.toLowerCase() === selectedCategory.toLowerCase() ||
        lot.categoryTag.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'price-desc') {
      lots = [...lots].sort((a, b) => (b.rawPriceRealized || 0) - (a.rawPriceRealized || 0));
    } else if (sortBy === 'price-asc') {
      lots = [...lots].sort((a, b) => (a.rawPriceRealized || 0) - (b.rawPriceRealized || 0));
    } else if (sortBy === 'title-asc') {
      lots = [...lots].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'default' || sortBy === 'lot-asc') {
      lots = [...lots].sort((a, b) => {
        const numA = a.rawLotNumber ?? (parseInt(a.lotNumber.replace(/\D/g, ''), 10) || 0);
        const numB = b.rawLotNumber ?? (parseInt(b.lotNumber.replace(/\D/g, ''), 10) || 0);
        return numA - numB;
      });
    }

    return lots;
  }, [allCompletedLots, appliedSearch, selectedCategory, selectedAuctionFilter, sortBy]);

  // Current list based on active tab
  const totalItems = activeTab === 'auctions' ? filteredAuctions.length : filteredLots.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is valid
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
  const handleShareAuction = (auction: PastAuction) => {
    const targetId = auction.id || auction.code;
    const url = `${window.location.origin}/#catalogs?auction=${targetId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onShowToast('success', 'Link Copied', `Direct archival link for "${auction.title}" copied to clipboard.`);
  };

  // View catalog lots for a specific auction
  const handleViewCatalogLots = (auction: PastAuction) => {
    setSelectedAuctionFilter(auction.id);
    setActiveTab('lots');
    setCurrentPage(1);
    setPageSize(12);
    window.scrollTo({ top: 380, behavior: 'smooth' });
    onShowToast('info', 'Catalog Lots Loaded', `Displaying ${auction.lotsCount} cataloged lots for "${auction.title}".`);
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

  const startItemIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItemIndex = Math.min(safePage * pageSize, totalItems);

  // Active auction filter object for the filter pill
  const activeAuctionFilteredObj = useMemo(() => {
    if (selectedAuctionFilter === 'all') return null;
    const fromPast = concludedAuctions.find((a) => a.id === selectedAuctionFilter || a.code === selectedAuctionFilter);
    if (fromPast) return fromPast;
    const fromAll = allAuctionsLookup.find((a) => a.id === selectedAuctionFilter || a.code === selectedAuctionFilter);
    if (fromAll) {
      return {
        id: fromAll.id,
        title: fromAll.name
      };
    }
    return null;
  }, [selectedAuctionFilter, concludedAuctions, allAuctionsLookup]);

  return (
    <div className="past-catalogs-page">
      {/* 1. Page Header & Breadcrumbs Banner */}
      <section className="past-catalogs-hero">
        <div className="container-fluid">
          <div className="past-catalogs-top-nav-bar">
            <a href="#auctions" className="btn-back-catalogs large" title="Return to Homepage">
              <ArrowLeft size={18} />
              <span>Back to Home</span>
            </a>
            <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
              <a href="#auctions" className="breadcrumb-link">Home</a>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">Past Catalogs</span>
            </nav>
          </div>

          <div className="past-catalogs-hero-content">
            <div className="hero-eyebrow">
              <span className="gold-dash"></span>
              <span>HISTORICAL ARCHIVES &amp; REALIZED RESULTS</span>
              <span className="gold-dash"></span>
            </div>
            <h1 className="past-catalogs-title">Past Auction Catalogs</h1>
            <p className="past-catalogs-subtitle">
              Browse concluded Pennsylvania estate liquidations, rare numismatic sales, authenticated provenance files,
              and historical gavel prices recorded by Gardner Auction Appraisers.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Controls Section: Search, Category, Catalog, and Auctions/Lots Toggle */}
      <section className="past-catalogs-controls-section">
        <div className="container-fluid">
          <div className="controls-container">
            {/* Search Input Bar */}
            <form className="search-box-form" onSubmit={handleSearchSubmit}>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search past auctions, keywords, lots, or dates..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="past-search-input"
                  aria-label="Search past auction catalogs"
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
              <button type="submit" className="past-search-submit-btn" title="Search catalogs">
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
                ariaLabel="Sort past auctions or lots"
              />
            </div>

            {/* Auctions / Lots Segmented Toggle Pill (from Highlander design) */}
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

            {/* Right: Pagination Controls (matching Highlander) */}
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
            <div style={{ textAlign: 'center', padding: '64px 20px', color: '#cba135' }}>
              <Loader2 size={40} className="cap-spin-icon" style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 16px auto', display: 'block' }} />
              <p style={{ fontSize: '15px', color: '#8e95a5' }}>
                Fetching historical auction records and realized gavel prices from Supabase...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="past-catalogs-empty-state" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div className="empty-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <AlertCircle size={40} color="#ef4444" />
              </div>
              <h3 className="empty-title" style={{ color: '#ef4444' }}>Database Query Error</h3>
              <p className="empty-desc">{error}</p>
              <button className="empty-reset-btn" onClick={() => fetchPastCatalogsData()}>
                <RotateCcw size={16} />
                <span>Retry Supabase Query</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && totalItems === 0 && (
            <div className="past-catalogs-empty-state">
              <div className="empty-icon-wrap">
                <Search size={40} className="empty-gold-icon" />
              </div>
              <h3 className="empty-title">
                {activeTab === 'auctions' ? 'No Past Catalogs Found' : 'No Completed Lots Found'}
              </h3>
              <p className="empty-desc">
                {appliedSearch
                  ? `No records matched your search query "${appliedSearch}".`
                  : activeTab === 'auctions'
                    ? 'No concluded auction sessions currently match your filter criteria.'
                    : 'No sold or completed lots match your selected filter criteria.'}
              </p>
              <button className="empty-reset-btn" onClick={handleResetFilters}>
                <RotateCcw size={16} />
                <span>Reset Search &amp; Filters</span>
              </button>
            </div>
          )}

          {/* AUCTIONS VIEW (Matching Highlander Past Auctions Layout in Gardner Branding) */}
          {!loading && !error && activeTab === 'auctions' && totalItems > 0 && (
            <div className="past-auctions-list">
              {paginatedAuctions.map((auction) => {
                const isBiddingNoticeExpanded = expandedNotices[auction.id]?.bidding ?? false;
                const isAuctionNoticeExpanded = expandedNotices[auction.id]?.auction ?? false;
                const isDescExpanded = expandedNotices[auction.id]?.desc ?? false;

                return (
                  <article key={auction.id} className="past-auction-card">
                    {/* Top Bar: Title & Auction Type */}
                    <header className="past-auction-card-header">
                      <div className="header-title-box">
                        <h2 className="auction-card-main-title">
                          <a
                            href={`#auction/${auction.id}`}
                            className="auction-title-link"
                            title={`View auction details for ${auction.title}`}
                          >
                            {auction.title}
                          </a>
                        </h2>
                        <div className="auction-card-type-sub">
                          <Globe size={13} className="header-type-icon" />
                          <span>{auction.auctionType}</span>
                          <span className="strip-divider">·</span>
                          <span className="auction-header-status-badge">
                            <Lock size={11} />
                            <span>Concluded</span>
                          </span>
                        </div>
                      </div>
                      <div className="header-realized-tag">
                        <span>Total Realized: <strong>{auction.totalRealized}</strong></span>
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
                            <img
                              src={auction.image}
                              alt={auction.title}
                              className="auction-featured-img"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/images/hero_coin.jpg';
                              }}
                            />
                            <div className="auction-closed-flag">
                              <Lock size={11} />
                              <span>Concluded</span>
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
                        <h3 className="auction-company-name">{auction.companyName}</h3>

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

                        <div className="auction-dates-block">
                          {auction.dateRange && (
                            <p className="auction-dates-line">
                              <strong>{auction.dateRange}</strong>
                            </p>
                          )}
                          {auction.scheduleText && (
                            <p className="auction-schedule-line">
                              {auction.scheduleText}
                            </p>
                          )}
                        </div>

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
                        <div className="attribute-badge status-closed-badge">
                          <Lock size={15} className="attr-icon" />
                          <span>Status: <strong>Concluded</strong></span>
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
                          <span><strong>{auction.lotsCount}</strong> Lots Documented</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="past-auction-actions-bar">
                      <a
                        href={`#auction/${auction.id}`}
                        className="btn-auction-action btn-auction-details"
                        title={`View auction details for ${auction.title}`}
                      >
                        <Info size={16} />
                        <span>Auction Details</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleViewCatalogLots(auction)}
                        className="btn-auction-action btn-view-catalog-gold"
                        title={`View catalog lots for ${auction.title}`}
                        style={{ border: 'none', cursor: 'pointer', font: 'inherit' }}
                      >
                        <BookOpen size={16} />
                        <span>View Catalog ({auction.lotsCount} Lots)</span>
                      </button>
                    </div>

                    {/* Notices Section (Bidding Notice & Auction Notice) */}
                    {(auction.biddingNotice || auction.auctionNotice) && (
                      <div className="past-auction-notices-container">
                        {/* Bidding Notice */}
                        {auction.biddingNotice && (
                          <div className="card-notice-callout bidding-notice">
                            <p className="notice-content">
                              <strong className="notice-highlight-label">Bidding Notice:</strong>{' '}
                              {isBiddingNoticeExpanded ? auction.biddingNotice : `${auction.biddingNotice.slice(0, 180)}${auction.biddingNotice.length > 180 ? '... ' : ''}`}
                              {auction.biddingNotice.length > 180 && (
                                <button
                                  type="button"
                                  className="notice-more-btn"
                                  onClick={() => toggleNotice(auction.id, 'bidding')}
                                >
                                  {isBiddingNoticeExpanded ? 'Show Less' : 'Show More'}
                                </button>
                              )}
                            </p>
                          </div>
                        )}

                        {/* Auction Notice */}
                        {auction.auctionNotice && (
                          <div className="card-notice-callout auction-notice">
                            <p className="notice-content">
                              <strong className="notice-highlight-label">Auction Notice:</strong>{' '}
                              {isAuctionNoticeExpanded ? auction.auctionNotice : `${auction.auctionNotice.slice(0, 180)}${auction.auctionNotice.length > 180 ? '... ' : ''}`}
                              {auction.auctionNotice.length > 180 && (
                                <button
                                  type="button"
                                  className="notice-more-btn"
                                  onClick={() => toggleNotice(auction.id, 'auction')}
                                >
                                  {isAuctionNoticeExpanded ? 'Show Less' : 'Show More'}
                                </button>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* LOTS VIEW (Matching Highlander Past Lots Grid in Gardner Branding) */}
          {!loading && !error && activeTab === 'lots' && totalItems > 0 && (
            <div className="past-lots-grid">
              {paginatedLots.map((lot) => (
                <div key={lot.id} className="past-lot-card">
                  {/* Lot Media Container */}
                  <a
                    href={`#lot/${lot.id}`}
                    className="past-lot-media"
                    title={`View ${lot.lotNumber}: ${lot.title}`}
                  >
                    <img
                      src={lot.image}
                      alt={lot.title}
                      className="past-lot-img"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/hero_coin.jpg';
                      }}
                    />

                    {/* Closed Status Strip across bottom of image */}
                    <div className="lot-closed-bar">
                      <Lock size={13} className="closed-icon" />
                      <span>Closed</span>
                    </div>
                  </a>

                  {/* Lot Content Body */}
                  <div className="past-lot-body">
                    <div className="lot-number-type-row">
                      <span className="past-lot-num">{lot.lotNumber}</span>
                      <span className="past-lot-type">
                        <Globe size={12} />
                        <span>Online Only</span>
                      </span>
                    </div>

                    <h4 className="past-lot-title" title={lot.title}>
                      <a href={`#lot/${lot.id}`} className="lot-card-title-link">
                        {lot.title}
                      </a>
                    </h4>

                    {/* Price Realized */}
                    <div className="past-lot-price-block">
                      <span className="price-realized-text">{lot.priceRealized}</span>
                    </div>

                    {/* Meta Dates & Details */}
                    <div className="past-lot-meta-block">
                      <div className="meta-line">
                        <span className="meta-label">Date Sold:</span>
                        <span className="meta-val">{lot.dateSold}</span>
                      </div>
                      <div className="meta-line company-line">
                        <span>{lot.auctionHouse}</span>
                      </div>
                      {lot.location && (
                        <div className="meta-line location-line">
                          <MapPin size={12} />
                          <span>{lot.location}</span>
                        </div>
                      )}
                      {lot.shipping && (
                        <div className="meta-line shipping-line">
                          <Truck size={12} />
                          <span>{lot.shipping}</span>
                        </div>
                      )}
                    </div>

                    {/* View Lot Button */}
                    <div className="past-lot-action-wrap">
                      <a
                        href={`#lot/${lot.id}`}
                        className="btn-view-past-lot"
                        title={`View ${lot.lotNumber}`}
                      >
                        <span>View Lot</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Pagination when multiple pages exist */}
          {!loading && !error && totalPages > 1 && totalItems > 0 && (
            <div className="past-bottom-pagination">
              <div className="toolbar-pagination-group" aria-label="Bottom Pagination">
                <button
                  className="pagination-btn"
                  onClick={() => {
                    setCurrentPage(1);
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  disabled={safePage === 1}
                  title="First Page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  disabled={safePage === 1}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="pagination-page-indicator">
                  <span>Page {safePage} of {totalPages}</span>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  disabled={safePage === totalPages}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => {
                    setCurrentPage(totalPages);
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  disabled={safePage === totalPages}
                  title="Last Page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Modals */}
      {activeAuctionDetail && (
        <PastAuctionDetailModal
          auction={activeAuctionDetail as any}
          onClose={() => setActiveAuctionDetail(null)}
          onViewLots={(auction) => handleViewCatalogLots(auction as any)}
        />
      )}

      {activeLotDetail && (
        <PastLotDetailModal
          lot={activeLotDetail as any}
          onClose={() => setActiveLotDetail(null)}
        />
      )}
    </div>
  );
};
