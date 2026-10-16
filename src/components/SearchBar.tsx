import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedEvent: string;
  onEventChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onSearchSubmit: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedEvent,
  onEventChange,
  selectedCategory,
  onCategoryChange,
  onSearchSubmit
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  return (
    <div className="search-filter-wrapper container-fluid">
      <form className="search-filter-card" onSubmit={handleSubmit}>
        {/* Main Search Input */}
        <div className="search-input-group">
          <Search size={18} className="search-icon-muted" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by artist, lot, keyword, or estate..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search lots"
          />
        </div>

        <div className="search-divider"></div>

        {/* Event Select Dropdown */}
        <div className="filter-select-group">
          <select
            value={selectedEvent}
            onChange={(e) => onEventChange(e.target.value)}
            className="filter-select"
            aria-label="Select auction event"
          >
            <option value="all">All Active Auction Events</option>
            <option value="event-1">Spring Fine Gold, Rare Coins &amp; Bullion</option>
            <option value="event-2">Historic Americana &amp; Estate Jewelry</option>
            <option value="event-3">Curated Fine Art &amp; Mid-Century Antiques</option>
          </select>
          <ChevronDown size={15} className="select-arrow" />
        </div>

        <div className="search-divider"></div>

        {/* Category Select Dropdown */}
        <div className="filter-select-group">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="filter-select"
            aria-label="Select category"
          >
            <option value="all">All Collecting Categories</option>
            <option value="Coins & Currency">Coins &amp; Currency</option>
            <option value="Gold & Bullion">Gold &amp; Bullion</option>
            <option value="Jewelry & Watches">Jewelry &amp; Watches</option>
            <option value="Americana & Antiques">Americana &amp; Antiques</option>
            <option value="Fine Art & Prints">Fine Art &amp; Prints</option>
            <option value="Vintage Memorabilia">Vintage Memorabilia</option>
          </select>
          <ChevronDown size={15} className="select-arrow" />
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn-search-lots">
          <Search size={16} />
          <span>SEARCH LOTS</span>
        </button>
      </form>
    </div>
  );
};
