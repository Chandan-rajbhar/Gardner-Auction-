import React, { useState } from 'react';
import { Search, X, ChevronRight, ChevronLeft, ShieldCheck, MapPin, Calendar } from 'lucide-react';
import type { EnrichedLotItem } from './types';

interface AuctionHeaderBarProps {
  activeLot: EnrichedLotItem;
  allLots: EnrichedLotItem[];
  onSelectLot: (lotId: string) => void;
}

export const AuctionHeaderBar: React.FC<AuctionHeaderBarProps> = ({
  activeLot,
  allLots,
  onSelectLot
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const currentIndex = allLots.findIndex((l) => l.id === activeLot.id);
  const prevLot = currentIndex > 0 ? allLots[currentIndex - 1] : null;
  const nextLot = currentIndex < allLots.length - 1 ? allLots[currentIndex + 1] : null;

  // Filter lots when search is entered
  const searchResults = searchQuery.trim()
    ? allLots.filter((l) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          l.lotNumber.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q) ||
          l.categoryTag.toLowerCase().includes(q) ||
          (l.artistName && l.artistName.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <div className="cap-header-bar">
      {/* Search Bar & Live Status Row (Replacing former breadcrumb row) */}
      <div className="cap-breadcrumb-row">
        <div className="cap-header-search-wrap">
          <Search size={14} className="cap-search-icon" />
          <input
            type="text"
            className="cap-header-search-input"
            placeholder="Search session lots by name, Lot # (e.g. 704, 104)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 250)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                onSelectLot(searchResults[0].id);
                setSearchQuery('');
                setIsFocused(false);
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="cap-search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}

          {/* Search Dropdown Results */}
          {isFocused && searchResults.length > 0 && (
            <div className="cap-search-results-dropdown">
              <div className="cap-search-results-header">
                <span>{searchResults.length} {searchResults.length === 1 ? 'Lot' : 'Lots'} Found in Session 1</span>
              </div>
              <div className="cap-search-results-list">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className={`cap-search-result-item ${item.id === activeLot.id ? 'active' : ''}`}
                    onMouseDown={() => {
                      onSelectLot(item.id);
                      setSearchQuery('');
                      setIsFocused(false);
                    }}
                  >
                    <img
                      src={item.images[0]?.url || '/images/hero_coin.jpg'}
                      alt={item.title}
                      className="cap-search-item-thumb"
                    />
                    <div className="cap-search-item-info">
                      <div className="cap-search-item-top">
                        <span className="cap-search-lot-num">{item.lotNumber}</span>
                        <span className="cap-search-item-bid">${item.currentBid.toLocaleString()}</span>
                      </div>
                      <span className="cap-search-item-title">{item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="cap-status-pill-group">
          <span className="cap-live-status-pill">
            <span className="cap-live-pulse-dot"></span>
            <span>LIVE WEBCAST SALESROOM SESSION</span>
          </span>
          <span className="cap-lic-divider">|</span>
          <span className="cap-lic-badge">PA-LIC. # AY-002084</span>
        </div>
      </div>

      {/* Main Auction Title & Navigation Row */}
      <div className="cap-title-row">
        <div className="cap-title-left">
          <div className="cap-session-tag">
            <span className="cap-gold-dash">——</span>
            <span>CURRENT LIVE CATALOG SESSION</span>
          </div>
          <h1 className="cap-session-main-title">
            {activeLot.sessionTitle}
          </h1>
          <div className="cap-session-meta-strip">
            <div className="cap-meta-item">
              <Calendar size={13} className="cap-gold-icon" />
              <span>Floor Gavel Opens 2:00 PM EST</span>
            </div>
            <span className="cap-meta-dot">·</span>
            <div className="cap-meta-item">
              <MapPin size={13} className="cap-gold-icon" />
              <span>Gardner Auction Galleries, Pittsburgh, PA</span>
            </div>
            <span className="cap-meta-dot">·</span>
            <div className="cap-meta-item">
              <ShieldCheck size={13} className="cap-gold-icon" />
              <span>Bonded Sterling $500,000+ Approved Tier A</span>
            </div>
          </div>
        </div>

        {/* Lot Stepper (Prev / Next) */}
        <div className="cap-lot-stepper">
          <button
            type="button"
            className="cap-step-btn"
            disabled={!prevLot}
            onClick={() => prevLot && onSelectLot(prevLot.id)}
            title={prevLot ? `Go to ${prevLot.lotNumber}` : 'No previous lot'}
            aria-label="Previous Lot"
          >
            <ChevronLeft size={14} />
            <span>PREV LOT</span>
          </button>

          <span className="cap-stepper-indicator">
            {currentIndex + 1} of {allLots.length}
          </span>

          <button
            type="button"
            className="cap-step-btn"
            disabled={!nextLot}
            onClick={() => nextLot && onSelectLot(nextLot.id)}
            title={nextLot ? `Go to ${nextLot.lotNumber}` : 'No next lot'}
            aria-label="Next Lot"
          >
            <span>NEXT LOT</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
