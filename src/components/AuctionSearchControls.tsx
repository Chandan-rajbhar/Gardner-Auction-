import React from 'react';
import { Search, ChevronDown, LayoutGrid, List, MapPin, Gavel, Layers, X } from 'lucide-react';

export type BrowsingMode = 'auctions' | 'lots' | 'map';
export type DisplayMode = 'grid' | 'list';

export interface AuctionSearchControlsProps {
  // Search
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;

  // Category
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];

  // View Mode: Auctions, Lots, Map
  browsingMode: BrowsingMode;
  onBrowsingModeChange: (mode: BrowsingMode) => void;

  // Sorting
  sortOrder: string;
  onSortChange: (value: string) => void;

  // List vs Grid
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;

  // Results & Pagination
  resultCount: number;
  totalCount: number;
  itemsPerPage: number;
  onItemsPerPageChange: (count: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const AuctionSearchControls: React.FC<AuctionSearchControlsProps> = ({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  selectedCategory,
  onCategoryChange,
  categories,
  browsingMode,
  onBrowsingModeChange,
  sortOrder,
  onSortChange,
  displayMode,
  onDisplayModeChange,
  resultCount,
  totalCount,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + resultCount - 1, totalCount);

  return (
    <div className="auction-search-controls-wrapper container-fluid">
      <div className="search-controls-card">
        {/* ROW 1: Search Input & Category Dropdown */}
        <form className="controls-row-primary" onSubmit={handleFormSubmit}>
          <div className="search-input-box">
            <Search size={18} className="search-field-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-field-input"
              placeholder="Search by lot number, coin, metal, artist, estate, or keywords..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search auctions and lots"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={onClearSearch}
                aria-label="Clear search input"
              >
                <X size={15} />
              </button>
            )}
            <button type="submit" className="btn-search-action">
              <Search size={15} />
              <span>SEARCH</span>
            </button>
          </div>

          <div className="category-select-box">
            <label htmlFor="category-filter-select" className="sr-only">
              Filter by Category
            </label>
            <select
              id="category-filter-select"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="category-dropdown"
              aria-label="Filter auctions by category"
            >
              <option value="all">All Collecting Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="dropdown-arrow-icon" aria-hidden="true" />
          </div>
        </form>

        {/* ROW 2: Segmented View Controls (Auctions / Lots / Map) + Sort + List/Grid Toggle */}
        <div className="controls-row-secondary">
          {/* Segmented Mode Control */}
          <div className="segmented-modes" role="tablist" aria-label="Auction View Modes">
            <button
              type="button"
              role="tab"
              aria-selected={browsingMode === 'auctions'}
              className={`mode-btn ${browsingMode === 'auctions' ? 'active' : ''}`}
              onClick={() => onBrowsingModeChange('auctions')}
              id="tab-auctions-mode"
            >
              <Layers size={15} />
              <span>AUCTIONS</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={browsingMode === 'lots'}
              className={`mode-btn ${browsingMode === 'lots' ? 'active' : ''}`}
              onClick={() => onBrowsingModeChange('lots')}
              id="tab-lots-mode"
            >
              <Gavel size={15} />
              <span>LOTS</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={browsingMode === 'map'}
              className={`mode-btn ${browsingMode === 'map' ? 'active' : ''}`}
              onClick={() => onBrowsingModeChange('map')}
              id="tab-map-mode"
            >
              <MapPin size={15} />
              <span>SALESROOM MAP</span>
            </button>
          </div>

          <div className="secondary-right-group">
            {/* Sorting Dropdown (Only relevant for lots and auctions) */}
            {browsingMode !== 'map' && (
              <div className="sort-select-box">
                <span className="sort-label">SORT:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="sort-dropdown"
                  aria-label="Sort order"
                >
                  {browsingMode === 'lots' ? (
                    <>
                      <option value="closing-soon">Closing Soonest</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="bids-desc">Most Bids</option>
                      <option value="lot-asc">Lot Number (A–Z)</option>
                    </>
                  ) : (
                    <>
                      <option value="upcoming">Upcoming Session</option>
                      <option value="lots-desc">Lots Count: High to Low</option>
                      <option value="title-asc">Auction Title (A–Z)</option>
                    </>
                  )}
                </select>
                <ChevronDown size={14} className="sort-arrow-icon" aria-hidden="true" />
              </div>
            )}

            {/* List / Grid Toggle (for lots) */}
            {browsingMode === 'lots' && (
              <div className="layout-toggle-group" role="group" aria-label="Layout view toggle">
                <button
                  type="button"
                  className={`layout-btn ${displayMode === 'grid' ? 'active' : ''}`}
                  onClick={() => onDisplayModeChange('grid')}
                  title="Grid View"
                  aria-label="Switch to Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  className={`layout-btn ${displayMode === 'list' ? 'active' : ''}`}
                  onClick={() => onDisplayModeChange('list')}
                  title="List View"
                  aria-label="Switch to List View"
                >
                  <List size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ROW 3: Result Count, Items Per Page, & Pagination Controls */}
        {browsingMode !== 'map' && (
          <div className="controls-row-tertiary">
            <div className="result-count-label">
              Showing <strong>{startIndex}–{endIndex}</strong> of <strong>{totalCount}</strong> {browsingMode === 'auctions' ? 'Auctions' : 'Lots'}
              {searchTerm && <span className="active-filter-indicator"> for "{searchTerm}"</span>}
              {selectedCategory !== 'all' && <span className="active-filter-indicator"> in {selectedCategory}</span>}
            </div>

            <div className="pagination-bar-group">
              {/* Items Per Page Selector */}
              <div className="items-per-page-box">
                <span className="items-label">Per Page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  className="per-page-select"
                  aria-label="Items per page"
                >
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                </select>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-nav" role="navigation" aria-label="Pagination">
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span className="page-status">
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
