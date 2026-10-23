import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentPath?: string;
  activeSection?: string;
  onNavigate?: (path: string) => void;
  onOpenLogin?: () => void;
  onOpenProfile?: () => void;
  watchlistCount?: number;
  onOpenWatchlist?: () => void;
  onSearch?: (term: string) => void;
  onOpenAuth?: () => void;
  currentRoute?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  activeSection,
  onNavigate,
  onOpenLogin,
  onOpenProfile,
  onOpenAuth,
  currentRoute
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!profileDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileDropdownOpen]);

  // Determine active nav item based on route in a mutually exclusive order
  const effectiveRoute = currentPath || (currentRoute ? (currentRoute === 'home' ? '/' : `#${currentRoute}`) : '/');

  let activeTab: 'home' | 'current-auctions' | 'past-auctions' | 'email-list' = 'home';

  if (
    effectiveRoute === '#auctions' ||
    effectiveRoute.startsWith('#auctions') ||
    effectiveRoute === '#current-auction' ||
    effectiveRoute.startsWith('#current-auction') ||
    effectiveRoute.startsWith('#auction/') ||
    activeSection === 'auctions'
  ) {
    activeTab = 'current-auctions';
  } else if (
    effectiveRoute === '#catalogs' ||
    effectiveRoute.startsWith('#catalogs') ||
    effectiveRoute.startsWith('#catalog/') ||
    effectiveRoute.startsWith('#lot/') ||
    activeSection === 'catalogs'
  ) {
    activeTab = 'past-auctions';
  } else if (
    effectiveRoute === '#email-list' ||
    effectiveRoute.startsWith('#email-list') ||
    activeSection === 'email-list'
  ) {
    activeTab = 'email-list';
  } else {
    activeTab = 'home';
  }

  const isHome = activeTab === 'home';
  const isCurrentAuctions = activeTab === 'current-auctions';
  const isPastAuctions = activeTab === 'past-auctions';
  const isEmailList = activeTab === 'email-list';

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (path === '/') {
      if (window.location.pathname !== '/' || window.location.hash) {
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (onNavigate) {
        onNavigate('/');
      }
    } else {
      if (window.location.hash !== path) {
        window.history.pushState(null, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (onNavigate) {
        onNavigate(path);
      }
    }
  };

  const handleLoginClick = () => {
    if (onOpenLogin) onOpenLogin();
    else if (onOpenAuth) onOpenAuth();
  };

  return (
    <header className="site-header sticky-header" role="banner">
      <div className="navbar-container container-fluid">
        {/* Brand Logo with Primary Official Gardner Auction Identity */}
        <a
          href="/"
          className="brand-logo"
          aria-label="Gardner Auction Home"
          onClick={(e) => handleLinkClick(e, '/')}
        >
          <img
            src="/images/gardner_logo.png"
            alt="Gardner Auction Since 1960"
            className="site-logo-img"
          />
          <div className="brand-text">
            <span className="brand-name">GARDNER AUCTION</span>
            <span className="brand-sub">APPRAISERS &amp; AUCTIONEERS</span>
          </div>
        </a>

        {/* Desktop Navigation: 4 Core Links in order + Dynamic Auth */}
        <nav className="desktop-nav-links" role="navigation" aria-label="Main Navigation">
          <a
            href="/"
            className={`nav-item ${isHome ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '/')}
            aria-current={isHome ? 'page' : undefined}
          >
            Home
          </a>
          <a
            href="#auctions"
            className={`nav-item ${isCurrentAuctions ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#auctions')}
            aria-current={isCurrentAuctions ? 'page' : undefined}
          >
            Current Auctions
          </a>
          <a
            href="#catalogs"
            className={`nav-item ${isPastAuctions ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#catalogs')}
            aria-current={isPastAuctions ? 'page' : undefined}
          >
            Past Auctions
          </a>
          <a
            href="#email-list"
            className={`nav-item ${isEmailList ? 'active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#email-list')}
            aria-current={isEmailList ? 'page' : undefined}
          >
            Email List
          </a>

          {/* Authentication Controls: Dynamic Avatar Profile or Login Button */}
          <div className="nav-auth-group" ref={dropdownRef}>
            {user ? (
              <div className="header-user-menu-wrapper">
                <button
                  type="button"
                  className={`header-avatar-btn ${profileDropdownOpen ? 'active' : ''}`}
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                  aria-label="User profile menu"
                  title={`${user.name} (${user.email})`}
                  id="btn-header-profile"
                >
                  <span className="header-avatar-circle font-serif">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="header-avatar-image"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="header-avatar-initials">{user.avatarText || 'GA'}</span>
                  </span>
                  <span className="header-avatar-status-dot" title="Authenticated session" />
                  <ChevronDown size={14} className={`header-avatar-chevron ${profileDropdownOpen ? 'rotated' : ''}`} />
                </button>

                {profileDropdownOpen && (
                  <div className="header-profile-dropdown" role="menu" aria-orientation="vertical">
                    {/* User Info Header Card */}
                    <div className="header-dropdown-user-card">
                      <div className="header-dropdown-avatar font-serif">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="header-avatar-image"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="header-avatar-initials">{user.avatarText || 'GA'}</span>
                      </div>
                      <div className="header-dropdown-user-details">
                        <span className="header-dropdown-name">{user.name}</span>
                        <span className="header-dropdown-email">{user.email}</span>
                      </div>
                    </div>

                    <div className="header-dropdown-divider" />

                    {/* Menu Actions */}
                    <div className="header-dropdown-actions">
                      <button
                        type="button"
                        className="header-dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        id="btn-dropdown-my-profile"
                      >
                        <User size={16} className="dropdown-item-icon" />
                        <div className="dropdown-item-content">
                          <span className="dropdown-item-title">My Profile</span>
                          <span className="dropdown-item-desc">View credentials &amp; contact info</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="header-dropdown-item logout"
                        role="menuitem"
                        onClick={async () => {
                          setProfileDropdownOpen(false);
                          await logout();
                          if (effectiveRoute.includes('profile') && onNavigate) {
                            onNavigate('/');
                          }
                        }}
                        id="btn-dropdown-logout"
                      >
                        <LogOut size={16} className="dropdown-item-icon" />
                        <div className="dropdown-item-content">
                          <span className="dropdown-item-title">Log Out</span>
                          <span className="dropdown-item-desc">End saleroom session</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="nav-btn-login"
                onClick={handleLoginClick}
                aria-label="Log in to bidder account"
              >
                Login
              </button>
            )}
          </div>
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Navigation: 4 Core Links + Auth */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
          <div className="mobile-nav-links">
            <a
              href="/"
              className={`mobile-nav-item ${isHome ? 'active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/')}
            >
              Home
            </a>
            <a
              href="#auctions"
              className={`mobile-nav-item ${isCurrentAuctions ? 'active' : ''}`}
              onClick={(e) => handleLinkClick(e, '#auctions')}
            >
              Current Auctions
            </a>
            <a
              href="#catalogs"
              className={`mobile-nav-item ${isPastAuctions ? 'active' : ''}`}
              onClick={(e) => handleLinkClick(e, '#catalogs')}
            >
              Past Auctions
            </a>
            <a
              href="#email-list"
              className={`mobile-nav-item ${isEmailList ? 'active' : ''}`}
              onClick={(e) => handleLinkClick(e, '#email-list')}
            >
              Email List
            </a>

            {/* Mobile Auth Button or User Card */}
            <div className="mobile-nav-auth">
              {user ? (
                <div className="mobile-auth-user-card">
                  <div className="mobile-auth-user-header">
                    <div className="mobile-auth-avatar font-serif">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="header-avatar-image"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className="header-avatar-initials">{user.avatarText || 'GA'}</span>
                    </div>
                    <div className="mobile-auth-user-meta">
                      <span className="mobile-auth-user-name">{user.name}</span>
                      <span className="mobile-auth-user-email">{user.email}</span>
                    </div>
                  </div>

                  <div className="mobile-auth-actions-row">
                    <button
                      type="button"
                      className="mobile-btn-profile"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                    >
                      <User size={14} />
                      <span>My Profile</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-btn-logout"
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await logout();
                        if (effectiveRoute.includes('profile') && onNavigate) {
                          onNavigate('/');
                        }
                      }}
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mobile-btn-login"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLoginClick();
                  }}
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

