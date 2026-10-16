import React, { useState, useMemo } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { PAST_AUCTIONS, ALL_PAST_LOTS } from '../data/pastCatalogsData';
import type { PastAuction, PastLotItem } from '../data/pastCatalogsData';

export { PAST_AUCTIONS, ALL_PAST_LOTS };
export type { PastAuction, PastLotItem };
import { PastAuctionDetailModal } from './PastAuctionDetailModal';
import { PastLotDetailModal } from './PastLotDetailModal';
import { ShadcnSelect } from './ui/ShadcnSelect';
import type { ShadcnSelectOption } from './ui/ShadcnSelect';

const CATEGORY_OPTIONS: ShadcnSelectOption[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'Coins & Currency', label: 'Coins & Currency' },
  { value: 'Gold & Bullion', label: 'Gold & Bullion' },
  { value: 'Jewelry & Watches', label: 'Jewelry & Watches' },
  { value: 'Americana & Antiques', label: 'Americana & Antiques' },
  { value: 'Fine Art & Prints', label: 'Fine Art & Prints' },
  { value: 'Vintage Memorabilia', label: 'Vintage Memorabilia' }
];

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
  // View mode: 'auctions' or 'lots'
  const [activeTab, setActiveTab] = useState<'auctions' | 'lots'>('auctions');

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuctionFilter, setSelectedAuctionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6); // Default 6 per page for auctions

  // Notice expansion toggles per auction: { [auctionId]: { bidding?: boolean, auction?: boolean, desc?: boolean } }
  const [expandedNotices, setExpandedNotices] = useState<Record<string, { bidding?: boolean; auction?: boolean; desc?: boolean }>>({});

  // Active Modals
  const [activeAuctionDetail, setActiveAuctionDetail] = useState<PastAuction | null>(null);
  const [activeLotDetail, setActiveLotDetail] = useState<PastLotItem | null>(null);

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

  // Auction Catalog Options for Lots view
  const auctionFilterOptions = useMemo<ShadcnSelectOption[]>(() => [
    { value: 'all', label: 'All Catalogs' },
    ...PAST_AUCTIONS.map((a) => ({
      value: a.id,
      label: a.title,
      badge: `${a.lots.length} lots`
    }))
  ], []);

  // Filtered Auctions
  const filteredAuctions = useMemo(() => {
    let list = PAST_AUCTIONS.filter((auction) => {
      const searchLower = appliedSearch.toLowerCase();
      const matchesSearch =
        !appliedSearch ||
        auction.title.toLowerCase().includes(searchLower) ||
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
      list = [...list].sort((a, b) => b.lots.length - a.lots.length);
    } else if (sortBy === 'title-asc') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'date-asc') {
      list = [...list].reverse();
    }

    return list;
  }, [appliedSearch, selectedCategory, sortBy]);

  // Filtered Lots
  const filteredLots = useMemo(() => {
    let lots = ALL_PAST_LOTS;

    if (selectedAuctionFilter !== 'all') {
      lots = lots.filter((l) => l.auctionId === selectedAuctionFilter);
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
        lot.department.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'price-desc') {
      const parsePrice = (priceStr: string) => parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      lots = [...lots].sort((a, b) => parsePrice(b.priceRealized) - parsePrice(a.priceRealized));
    } else if (sortBy === 'price-asc') {
      const parsePrice = (priceStr: string) => parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      lots = [...lots].sort((a, b) => parsePrice(a.priceRealized) - parsePrice(b.priceRealized));
    } else if (sortBy === 'title-asc') {
      lots = [...lots].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'default' || sortBy === 'lot-asc') {
      lots = [...lots].sort((a, b) => {
        const numA = parseInt(a.lotNumber.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.lotNumber.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    }

    return lots;
  }, [appliedSearch, selectedCategory, selectedAuctionFilter, sortBy]);

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
    const url = `${window.location.origin}/#catalogs?auction=${auction.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onShowToast('success', 'Link Copied', `Archival link for "${auction.title}" copied to clipboard.`);
  };

  // View catalog lots for a specific auction
  const handleViewCatalogLots = (auction: PastAuction) => {
    setSelectedAuctionFilter(auction.id);
    setActiveTab('lots');
    setCurrentPage(1);
    setPageSize(12);
    window.scrollTo({ top: 380, behavior: 'smooth' });
    onShowToast('info', 'Catalog Lots Loaded', `Displaying ${auction.lots.length} cataloged lots for ${auction.title}.`);
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

  // Active auction filter title
  const activeAuctionFilteredObj = useMemo(() => {
    if (selectedAuctionFilter === 'all') return null;
    return PAST_AUCTIONS.find((a) => a.id === selectedAuctionFilter) || null;
  }, [selectedAuctionFilter]);

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

      {/* 2. Controls Section: Search, Category, and Auctions/Lots Toggle */}
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
                options={CATEGORY_OPTIONS}
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
          {/* Empty State */}
          {totalItems === 0 && (
            <div className="past-catalogs-empty-state">
              <div className="empty-icon-wrap">
                <Search size={40} className="empty-gold-icon" />
              </div>
              <h3 className="empty-title">No Past Catalogs Found</h3>
              <p className="empty-desc">
                {appliedSearch
                  ? `No past auction records or lots matched your search query "${appliedSearch}".`
                  : 'No past auctions match the selected category filter.'}
              </p>
              <button className="empty-reset-btn" onClick={handleResetFilters}>
                <RotateCcw size={16} />
                <span>Reset Search &amp; Filters</span>
              </button>
            </div>
          )}

          {/* AUCTIONS VIEW (Matching Highlander Past Auctions Layout in Gardner Branding) */}
          {activeTab === 'auctions' && totalItems > 0 && (
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
                          <a
                            href={`#catalog/${auction.id}`}
                            className="auction-img-link"
                            title={`View catalog for ${auction.title}`}
                          >
                            <img
                              src={auction.image}
                              alt={auction.title}
                              className="auction-featured-img"
                              loading="lazy"
                            />
                            <div className="auction-closed-flag">
                              <Lock size={11} />
                              <span>Concluded</span>
                            </div>
                          </a>
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
                          <span className="address-text">{auction.address}</span>
                          <span className="address-text">{auction.cityStateZip}</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${auction.mapQuery}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="auction-map-link"
                          >
                            <MapPin size={13} />
                            <span>Map</span>
                          </a>
                        </div>

                        <div className="auction-dates-block">
                          <p className="auction-dates-line">
                            <strong>{auction.dateRange}</strong>
                          </p>
                          <p className="auction-schedule-line">
                            {auction.scheduleText}
                          </p>
                        </div>

                        <div className="auction-description-box">
                          <p className={`auction-desc-text ${isDescExpanded ? 'expanded' : 'clamped'}`}>
                            {auction.description}
                          </p>
                          <button
                            type="button"
                            className="desc-expand-toggle"
                            onClick={() => toggleNotice(auction.id, 'desc')}
                            aria-expanded={isDescExpanded}
                          >
                            {isDescExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Status & Attribute Badges */}
                      <div className="auction-body-right">
                        <div className="attribute-badge status-closed-badge">
                          <Lock size={15} className="attr-icon" />
                          <span>Status: <strong>Concluded</strong></span>
                        </div>

                        <div className="attribute-badge type-badge">
                          <Globe size={15} className="attr-icon" />
                          <span>{auction.auctionType}</span>
                        </div>

                        <div className="attribute-badge shipping-badge">
                          <Truck size={15} className="attr-icon" />
                          <span>{auction.shipping}</span>
                        </div>

                        <div className="lots-count-indicator">
                          <BookOpen size={14} className="gold-icon" />
                          <span><strong>{auction.lots.length}</strong> Lots Documented</span>
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

                      <a
                        href={`#catalog/${auction.id}`}
                        className="btn-auction-action btn-view-catalog-gold"
                        title={`View catalog lots for ${auction.title}`}
                      >
                        <BookOpen size={16} />
                        <span>View Catalog ({auction.lots.length} Lots)</span>
                      </a>
                    </div>

                    {/* Notices Section (Bidding Notice & Auction Notice) */}
                    <div className="past-auction-notices-container">
                      {/* Bidding Notice */}
                      <div className="card-notice-callout bidding-notice">
                        <p className="notice-content">
                          <strong className="notice-highlight-label">Bidding Notice:</strong>{' '}
                          {isBiddingNoticeExpanded ? auction.biddingNotice : `${auction.biddingNotice.slice(0, 180)}... `}
                          <button
                            type="button"
                            className="notice-more-btn"
                            onClick={() => toggleNotice(auction.id, 'bidding')}
                          >
                            {isBiddingNoticeExpanded ? 'Show Less' : 'Show More'}
                          </button>
                        </p>
                      </div>

                      {/* Auction Notice */}
                      <div className="card-notice-callout auction-notice">
                        <p className="notice-content">
                          <strong className="notice-highlight-label">Auction Notice:</strong>{' '}
                          {isAuctionNoticeExpanded ? auction.auctionNotice : `${auction.auctionNotice.slice(0, 180)}... `}
                          <button
                            type="button"
                            className="notice-more-btn"
                            onClick={() => toggleNotice(auction.id, 'auction')}
                          >
                            {isAuctionNoticeExpanded ? 'Show Less' : 'Show More'}
                          </button>
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* LOTS VIEW (Matching Highlander Past Lots Grid in Gardner Branding) */}
          {activeTab === 'lots' && totalItems > 0 && (
            <div className="past-lots-grid">
              {paginatedLots.map((lot) => (
                <div key={lot.id} className="past-lot-card">
                  {/* Lot Media Container */}
                  <a
                    href={`#lot/${lot.id}`}
                    className="past-lot-media"
                    title={`View ${lot.lotNumber}: ${lot.title}`}
                  >
                    <img src={lot.image} alt={lot.title} className="past-lot-img" loading="lazy" />
                    
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
                      <div className="meta-line location-line">
                        <MapPin size={12} />
                        <span>{lot.location}</span>
                      </div>
                      <div className="meta-line shipping-line">
                        <Truck size={12} />
                        <span>{lot.shipping}</span>
                      </div>
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
          {totalPages > 1 && totalItems > 0 && (
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
          auction={activeAuctionDetail}
          onClose={() => setActiveAuctionDetail(null)}
          onViewLots={(auction) => handleViewCatalogLots(auction)}
        />
      )}

      {activeLotDetail && (
        <PastLotDetailModal
          lot={activeLotDetail}
          onClose={() => setActiveLotDetail(null)}
        />
      )}
    </div>
  );
};
