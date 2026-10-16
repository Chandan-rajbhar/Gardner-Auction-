import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Lock,
  Globe,
  MapPin,
  Truck,
  RotateCcw,
  X,
  Calendar,
  Clock,
  ExternalLink,
  Share2,
  Printer,
  BookOpen,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Info
} from 'lucide-react';
import { getPastAuctionById } from '../data/pastCatalogsData';
import type { PastLotItem } from '../data/pastCatalogsData';
import { PastLotDetailModal } from './PastLotDetailModal';
import { ShadcnSelect } from './ui/ShadcnSelect';
import type { ShadcnSelectOption } from './ui/ShadcnSelect';

const CATALOG_SORT_OPTIONS: ShadcnSelectOption[] = [
  { value: 'lot-asc', label: 'Lot Number: Ascending' },
  { value: 'price-desc', label: 'Price Realized: High to Low' },
  { value: 'price-asc', label: 'Price Realized: Low to High' },
  { value: 'title-asc', label: 'Title: A to Z' }
];

const CATALOG_PAGE_SIZE_OPTIONS: ShadcnSelectOption[] = [
  { value: '6', label: '6 per page' },
  { value: '12', label: '12 per page' },
  { value: '24', label: '24 per page' }
];

interface CatalogLotsPageProps {
  auctionId: string;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const CatalogLotsPage: React.FC<CatalogLotsPageProps> = ({
  auctionId,
  onShowToast
}) => {
  const auction = getPastAuctionById(auctionId);
  const [activeLotModal, setActiveLotModal] = useState<PastLotItem | null>(null);

  // Notice expand toggles (matching Highlander Show More / Show Less pattern)
  const [isBiddingNoticeExpanded, setIsBiddingNoticeExpanded] = useState<boolean>(false);
  const [isAuctionNoticeExpanded, setIsAuctionNoticeExpanded] = useState<boolean>(false);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);

  // In-catalog search, category, sort & pagination
  const [catalogSearch, setCatalogSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lot-asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Extract available categories dynamically within this auction's lots
  const categoryOptions = useMemo<ShadcnSelectOption[]>(() => {
    if (!auction) return [{ value: 'all', label: 'All Categories' }];
    const set = new Set<string>();
    auction.lots.forEach((l) => {
      if (l.department) set.add(l.department);
      if (l.categoryTag) set.add(l.categoryTag);
    });
    return [
      { value: 'all', label: 'All Categories' },
      ...Array.from(set).map((cat) => ({ value: cat, label: cat }))
    ];
  }, [auction]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(catalogSearch.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setCatalogSearch('');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onShowToast('success', 'Link Copied', `Direct catalog link for "${auction?.title}" copied to clipboard.`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Parse price string to number for sorting
  const parsePrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Filtered & Sorted Lots (Strictly within this auction)
  const filteredLots = useMemo(() => {
    if (!auction) return [];

    let lots = auction.lots.filter((lot) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lot.title.toLowerCase().includes(q) ||
        lot.lotNumber.toLowerCase().includes(q) ||
        lot.description.toLowerCase().includes(q) ||
        lot.categoryTag.toLowerCase().includes(q) ||
        lot.department.toLowerCase().includes(q);

      const matchesCat =
        selectedCategory === 'all' ||
        lot.department.toLowerCase() === selectedCategory.toLowerCase() ||
        lot.categoryTag.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });

    if (sortBy === 'price-desc') {
      lots = [...lots].sort((a, b) => parsePrice(b.priceRealized) - parsePrice(a.priceRealized));
    } else if (sortBy === 'price-asc') {
      lots = [...lots].sort((a, b) => parsePrice(a.priceRealized) - parsePrice(b.priceRealized));
    } else if (sortBy === 'title-asc') {
      lots = [...lots].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // Default: lot number order
      lots = [...lots].sort((a, b) => {
        const numA = parseInt(a.lotNumber.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.lotNumber.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    }

    return lots;
  }, [auction, appliedSearch, selectedCategory, sortBy]);

  // Pagination calculation
  const totalItems = filteredLots.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLots = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLots.slice(start, start + pageSize);
  }, [filteredLots, safePage, pageSize]);

  const startItemIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItemIndex = Math.min(safePage * pageSize, totalItems);

  // Error / Not Found State
  if (!auction) {
    return (
      <div className="catalog-lots-page not-found-page">
        <div className="container-fluid">
          <div className="past-catalogs-empty-state">
            <h2 className="empty-title">Auction Catalog Not Found</h2>
            <p className="empty-desc">
              The requested catalog for auction ID "{auctionId}" does not exist in our historical archive.
            </p>
            <a href="#catalogs" className="empty-reset-btn">
              <RotateCcw size={16} />
              <span>Return to Past Catalogs</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-lots-page">
      {/* 1. Header & Navigation Strip */}
      <section className="catalog-page-header-strip">
        <div className="container-fluid">
          <div className="auction-details-nav-row">
            <a href="#catalogs" className="btn-back-catalogs large" title="Return to all past catalogs">
              <ArrowLeft size={18} />
              <span>Back to Past Catalogs</span>
            </a>

            <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
              <a href="#auctions" className="breadcrumb-link">Home</a>
              <span className="breadcrumb-separator">/</span>
              <a href="#catalogs" className="breadcrumb-link">Past Catalogs</a>
              <span className="breadcrumb-separator">/</span>
              <a href={`#auction/${auction.id}`} className="breadcrumb-link">{auction.title}</a>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">Catalog Lots ({auction.lots.length})</span>
            </nav>
          </div>
        </div>
      </section>

      {/* 2. Top Auction Card (Exact Highlander Catalog Header Card with Auction Details CTA) */}
      <section className="catalog-header-card-section">
        <div className="container-fluid">
          <article className="past-auction-card in-catalog-auction-card">
            {/* Header: Title & Auction Type */}
            <header className="past-auction-card-header">
              <div className="header-title-box">
                <h1 className="auction-card-title">{auction.title}</h1>
                <div className="auction-type-strip">
                  <Globe size={13} className="globe-icon" />
                  <span>{auction.auctionType}</span>
                  <span className="strip-divider">·</span>
                  <span className="auction-header-status-badge">
                    <Lock size={12} />
                    <span>Concluded</span>
                  </span>
                </div>
              </div>
              <div className="header-realized-tag">
                <span>Total Realized: <strong>{auction.totalRealized}</strong></span>
              </div>
            </header>

            {/* 3-Column Body */}
            <div className="past-auction-card-body">
              {/* Left Column: Image & Share */}
              <div className="auction-body-left">
                <div className="auction-img-frame">
                  <img
                    src={auction.image}
                    alt={auction.title}
                    className="auction-featured-img"
                  />
                  <div className="auction-closed-flag">
                    <Lock size={12} />
                    <span>Concluded</span>
                  </div>
                </div>

                <div className="hibid-media-actions-row">
                  <button
                    type="button"
                    className="auction-share-btn"
                    onClick={handlePrint}
                    title="Print auction catalogue"
                  >
                    <Printer size={14} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    className="auction-share-btn"
                    onClick={handleShare}
                    title="Share auction catalog link"
                  >
                    <Share2 size={14} />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Center Column: Company, Location, Schedule & Description */}
              <div className="auction-body-center">
                <h2 className="auction-company-name">{auction.companyName}</h2>

                <div className="auction-location-row">
                  <span className="address-text">{auction.address}</span>
                  <span className="address-text">{auction.cityStateZip}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${auction.mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="auction-map-link"
                    title="Open venue in Google Maps"
                  >
                    <MapPin size={13} />
                    <span>Map</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                <div className="auction-dates-block">
                  <p className="auction-dates-line">
                    <Calendar size={14} className="gold-icon inline-icon" />
                    <strong>Date(s) {auction.dateRange}</strong>
                  </p>
                  <p className="auction-schedule-line">
                    <Clock size={13} className="inline-icon" />
                    <span>{auction.scheduleText}</span>
                  </p>
                </div>

                <div className="auction-description-box">
                  <p className={`auction-desc-text ${isDescExpanded ? 'expanded' : 'clamped'}`}>
                    {auction.description}
                  </p>
                  <button
                    type="button"
                    className="desc-expand-toggle"
                    onClick={() => setIsDescExpanded((prev) => !prev)}
                    aria-expanded={isDescExpanded}
                  >
                    <span>{isDescExpanded ? 'Show Less' : 'Show More'}</span>
                    {isDescExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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

                <div className="realized-total-indicator">
                  <DollarSign size={14} className="gold-icon" />
                  <span>Total Realized: <strong>{auction.totalRealized}</strong></span>
                </div>
              </div>
            </div>

            {/* Symmetrical 2-Way Action Button: Auction Details (Matches HiBid Pattern) */}
            <div className="hibid-prominent-action-bar">
              <a
                href={`#auction/${auction.id}`}
                className="btn-hibid-auction-details"
                title={`View full auction details, notices, and venue terms for ${auction.title}`}
              >
                <Info size={17} />
                <span>Auction Details</span>
              </a>
            </div>

            {/* Notices Section: Bidding Notice & Auction Notice */}
            <div className="past-auction-notices-container">
              {/* Bidding Notice */}
              <div className="hibid-notice-card">
                <p className="hibid-notice-text">
                  <strong className="hibid-notice-label">Bidding Notice:</strong>{' '}
                  {isBiddingNoticeExpanded
                    ? auction.biddingNotice
                    : `${auction.biddingNotice.slice(0, 190)}... `}
                  <button
                    type="button"
                    className="hibid-notice-toggle-btn"
                    onClick={() => setIsBiddingNoticeExpanded((prev) => !prev)}
                  >
                    {isBiddingNoticeExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </p>
              </div>

              {/* Auction Notice */}
              <div className="hibid-notice-card">
                <p className="hibid-notice-text">
                  <strong className="hibid-notice-label">Auction Notice:</strong>{' '}
                  {isAuctionNoticeExpanded
                    ? auction.auctionNotice
                    : `${auction.auctionNotice.slice(0, 190)}... `}
                  <button
                    type="button"
                    className="hibid-notice-toggle-btn"
                    onClick={() => setIsAuctionNoticeExpanded((prev) => !prev)}
                  >
                    {isAuctionNoticeExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 3. In-Catalog Search & Filter Bar (shadcn Selects) */}
      <section className="in-catalog-controls-section">
        <div className="container-fluid">
          <div className="in-catalog-controls-bar">
            {/* Search Input for this catalog */}
            <form className="in-catalog-search-wrap" onSubmit={handleSearchSubmit}>
              <Search size={16} className="in-catalog-search-icon" />
              <input
                type="text"
                placeholder={`Search within these ${auction.lots.length} lots (e.g. coin, gold, lot number)...`}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="in-catalog-search-input"
                aria-label="Search within this catalog"
              />
              {catalogSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
              <button type="submit" className="in-catalog-search-submit-btn" title="Search catalog lots">
                <Search size={15} />
              </button>
            </form>

            {/* In-Catalog Category Dropdown (shadcn) */}
            {categoryOptions.length > 2 && (
              <div className="in-catalog-cat-wrap">
                <ShadcnSelect
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(val);
                    setCurrentPage(1);
                  }}
                  options={categoryOptions}
                  ariaLabel="Filter catalog lots by category"
                />
              </div>
            )}

            {/* In-Catalog Sort Dropdown (shadcn) */}
            <div className="in-catalog-sort-wrap">
              <span className="sort-label">Sort By:</span>
              <div style={{ minWidth: 210 }}>
                <ShadcnSelect
                  value={sortBy}
                  onChange={(val) => {
                    setSortBy(val);
                    setCurrentPage(1);
                  }}
                  options={CATALOG_SORT_OPTIONS}
                  size="md"
                  ariaLabel="Sort catalog lots"
                />
              </div>
            </div>
          </div>

          {/* Results Summary Subtitle & Page Size / Pagination */}
          <div className="in-catalog-results-row">
            <div className="results-left-wrap">
              <span className="results-count-text">
                Showing <strong>{startItemIndex} – {endItemIndex}</strong> of <strong>{totalItems}</strong> lots in this catalog
              </span>

              {appliedSearch && (
                <button
                  className="btn-clear-in-search"
                  onClick={handleClearSearch}
                >
                  <span>Clear search "{appliedSearch}"</span>
                  <X size={13} />
                </button>
              )}

              {selectedCategory !== 'all' && (
                <button
                  className="btn-clear-in-search"
                  onClick={() => setSelectedCategory('all')}
                >
                  <span>Category: {selectedCategory}</span>
                  <X size={13} />
                </button>
              )}

              {/* Page Size Selector (shadcn) */}
              <div className="page-size-selector" style={{ marginLeft: 8 }}>
                <span className="page-size-label">VIEW:</span>
                <div style={{ minWidth: 110 }}>
                  <ShadcnSelect
                    value={String(pageSize)}
                    onChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                    options={CATALOG_PAGE_SIZE_OPTIONS}
                    size="sm"
                    ariaLabel="Items per page"
                  />
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="toolbar-pagination-group" aria-label="Catalog Pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  title="First Page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  title="Last Page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Catalog Lots Grid */}
      <section className="catalog-lots-grid-section">
        <div className="container-fluid">
          {filteredLots.length === 0 ? (
            <div className="past-catalogs-empty-state">
              <h3 className="empty-title">No Lots Found</h3>
              <p className="empty-desc">
                {appliedSearch
                  ? `No lots in this catalog matched "${appliedSearch}".`
                  : 'No lots matched the selected filters.'}
              </p>
              <button
                className="empty-reset-btn"
                onClick={() => {
                  setCatalogSearch('');
                  setAppliedSearch('');
                  setSelectedCategory('all');
                  setSortBy('lot-asc');
                }}
              >
                <RotateCcw size={16} />
                <span>Show All {auction.lots.length} Lots in this Catalog</span>
              </button>
            </div>
          ) : (
            <div className="past-lots-grid">
              {paginatedLots.map((lot) => (
                <div key={lot.id} className="past-lot-card">
                  {/* Media Frame */}
                  <a
                    href={`#lot/${lot.id}`}
                    className="past-lot-media"
                    title={`View ${lot.lotNumber}: ${lot.title}`}
                  >
                    <img src={lot.image} alt={lot.title} className="past-lot-img" loading="lazy" />
                    <div className="lot-closed-bar">
                      <Lock size={13} className="closed-icon" />
                      <span>Closed</span>
                    </div>
                  </a>

                  {/* Lot Body */}
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

                    {/* Meta Specifications */}
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

                    {/* Action Button */}
                    <div className="past-lot-action-wrap">
                      <a
                        href={`#lot/${lot.id}`}
                        className="btn-view-past-lot"
                        title={`View lot details for ${lot.lotNumber}`}
                      >
                        <span>View Lot</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Pagination & Navigation Row */}
          <div className="catalog-page-bottom-nav">
            <a
              href={`#auction/${auction.id}`}
              className="btn-auction-details-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Info size={16} />
              <span>View Auction Details &amp; Notices</span>
            </a>

            <a href="#catalogs" className="btn-back-catalogs-gold large">
              <ArrowLeft size={18} />
              <span>Return to All Past Catalogs</span>
            </a>
          </div>
        </div>
      </section>

      {/* Lot Specimen Dossier Modal */}
      {activeLotModal && (
        <PastLotDetailModal
          lot={activeLotModal}
          onClose={() => setActiveLotModal(null)}
        />
      )}
    </div>
  );
};
