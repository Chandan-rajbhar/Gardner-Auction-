import React, { useState } from 'react';
import { Search, Bookmark, User, ShieldCheck, Phone, Mail, Menu, X } from 'lucide-react';

interface HeaderProps {
  watchlistCount: number;
  onOpenWatchlist: () => void;
  onSearch: (term: string) => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  watchlistCount,
  onOpenWatchlist,
  onSearch,
  onOpenAuth
}) => {
  const [navSearch, setNavSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      onSearch(navSearch.trim());
    }
  };

  return (
    <header className="site-header">
      {/* Top Banner Ticker */}
      <div className="top-ticker-bar">
        <div className="top-ticker-content container-fluid">
          <div className="ticker-left">
            <span className="live-badge">
              <span className="pulse-dot"></span> LIVE WEBCAST
            </span>
            <span className="ticker-text">
              Live Webcast Bidding Active — PA Auctioneer Lic. # AY-002004 — Spring Continental Art &amp; Americana Session 1
            </span>
          </div>
          
          <div className="ticker-right">
            <a href="tel:4125550199" className="ticker-contact-item">
              <Phone size={13} className="ticker-icon" />
              <span>(412) 555-0199</span>
            </a>
            <span className="ticker-divider">|</span>
            <a href="mailto:info@gardnerauction.com" className="ticker-contact-item">
              <Mail size={13} className="ticker-icon" />
              <span>info@gardnerauction.com</span>
            </a>
            <span className="ticker-divider">|</span>
            <div className="ticker-cert">
              <ShieldCheck size={14} className="ticker-gold-icon" />
              <span>Bonded Sterling $500,000+ Approved Tier A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="main-navbar">
        <div className="navbar-container container-fluid">
          {/* Brand Logo */}
          <a href="#" className="brand-logo" aria-label="Gardner Auction Home">
            <div className="brand-crest">
              {/* Luxury Gold Monogram Crest SVG */}
              <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#cba135" strokeWidth="2.5" strokeDasharray="3 2" />
                <circle cx="50" cy="50" r="40" stroke="#cba135" strokeWidth="1.5" />
                <path d="M50 16L53 26H63L55 32L58 42L50 36L42 42L45 32L37 26H47L50 16Z" fill="#cba135" />
                <path d="M34 52C34 43 41 37 50 37C59 37 66 43 66 52C66 62 58 68 50 68C45 68 39 65 36 60L42 56C44 59 47 61 50 61C54 61 58 57 58 52C58 47 54 44 50 44C46 44 42 47 42 52H52V58H34V52Z" fill="#15171e" />
                <path d="M26 78H74" stroke="#cba135" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="50" cy="78" r="2.5" fill="#cba135" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-name">GARDNER AUCTION</span>
              <span className="brand-sub">APPRAISERS · SINCE 1982</span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="desktop-nav-links">
            <a href="#auctions" className="nav-item active">CURRENT AUCTIONS</a>
            <a href="#catalogs" className="nav-item">PAST CATALOGS</a>
            <a href="#consign" className="nav-item">CONSIGN</a>
            <a href="#valuations" className="nav-item">VALUATIONS</a>
            <a href="#how-to-bid" className="nav-item">HOW TO BID</a>
          </nav>

          {/* Navbar Search Input */}
          <form className="nav-search-form" onSubmit={handleSearchSubmit}>
            <Search size={16} className="nav-search-icon" />
            <input
              type="text"
              placeholder="Search by lot, artist, era, medium..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              aria-label="Search catalog lots"
            />
          </form>

          {/* User & Actions Bar */}
          <div className="nav-actions">
            <button
              className="watchlist-btn"
              onClick={onOpenWatchlist}
              title="View Watchlist / Registered Paddles"
              aria-label="View Watchlist"
            >
              <Bookmark size={18} />
              <span className="watchlist-count">{watchlistCount}</span>
            </button>

            <button
              className="sign-in-btn"
              onClick={onOpenAuth}
              title="Sign In to Bid"
            >
              <User size={17} />
              <span>Sign In</span>
            </button>

            <a href="#live-bidding" className="explore-auctions-btn">
              <span>EXPLORE AUCTIONS</span>
            </a>

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <a href="#auctions" onClick={() => setMobileMenuOpen(false)}>Current Auctions</a>
            <a href="#catalogs" onClick={() => setMobileMenuOpen(false)}>Past Catalogs</a>
            <a href="#consign" onClick={() => setMobileMenuOpen(false)}>Consign &amp; Appraise</a>
            <a href="#valuations" onClick={() => setMobileMenuOpen(false)}>Valuations</a>
            <a href="#how-to-bid" onClick={() => setMobileMenuOpen(false)}>How to Bid Guide</a>
            <div className="mobile-drawer-footer">
              <button className="sign-in-btn full-w" onClick={onOpenAuth}>
                <User size={18} /> Sign In / Register to Bid
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
