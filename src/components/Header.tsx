import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  currentPath?: string;
  activeSection?: string;
  onNavigate?: (path: string) => void;
  onOpenLogin?: () => void;
  onOpenSignUp?: () => void;
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
  onOpenSignUp,
  onOpenAuth,
  currentRoute
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active nav item based on route
  const effectiveRoute = currentPath || (currentRoute ? (currentRoute === 'home' ? '/' : `#${currentRoute}`) : '/');

  const isHome =
    effectiveRoute === '/' ||
    activeSection === 'home' ||
    (!currentPath && !currentRoute && !activeSection);

  const isCurrentAuctions =
    effectiveRoute === '#auctions' ||
    activeSection === 'auctions';

  const isPastAuctions =
    effectiveRoute === '#catalogs' ||
    effectiveRoute.startsWith('#catalog') ||
    effectiveRoute.startsWith('#auction') ||
    activeSection === 'catalogs';

  const isEmailList =
    effectiveRoute === '#email-list' ||
    activeSection === 'email-list';

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

  const handleSignUpClick = () => {
    if (onOpenSignUp) onOpenSignUp();
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
            <span className="brand-sub">APPRAISERS &amp; AUCTIONEERS · SINCE 1960</span>
          </div>
        </a>

        {/* Desktop Navigation: 4 Core Links in order + Login & Sign Up */}
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

          {/* Authentication Controls: Login & Sign Up */}
          <div className="nav-auth-group">
            <button
              type="button"
              className="nav-btn-login"
              onClick={handleLoginClick}
              aria-label="Log in to bidder account"
            >
              Login
            </button>
            <button
              type="button"
              className="nav-btn-signup"
              onClick={handleSignUpClick}
              aria-label="Sign up for auction paddle"
            >
              Sign Up
            </button>
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

      {/* Mobile Drawer Navigation: 4 Core Links + Login & Sign Up */}
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

            {/* Mobile Auth Buttons */}
            <div className="mobile-nav-auth">
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
              <button
                type="button"
                className="mobile-btn-signup"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignUpClick();
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
