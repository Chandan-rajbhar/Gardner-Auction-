import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Gavel, 
  Layers, 
  Radio, 
  Receipt, 
  BarChart3, 
  Bell, 
  Settings, 
  ShieldCheck,
  ExternalLink,
  X,
  LogOut,
  ChevronDown,
  User
} from 'lucide-react';
import { NavigationSection } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentSection: NavigationSection;
  setCurrentSection: (section: NavigationSection) => void;
  isOpen: boolean;
  onClose: () => void;
  liveLotsCount: number;
  pendingVerifications: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  setCurrentSection,
  isOpen,
  onClose,
  liveLotsCount,
  pendingVerifications
}) => {
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const operationsNav: Array<{
    id: NavigationSection;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    isLive?: boolean;
  }> = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'live_clerking', label: 'Live Clerking Block', icon: Radio, badge: 'LIVE', isLive: true },
    { id: 'lots', label: 'Lots & Catalog', icon: Layers, badge: liveLotsCount || 6 },
    { id: 'auctions', label: 'Auction Sales', icon: Gavel },
    { id: 'users', label: 'Bidders & Consignors', icon: Users, badge: pendingVerifications > 0 ? pendingVerifications : 1 },
  ];

  const financeNav: Array<{
    id: NavigationSection;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
  }> = [
    { id: 'payments', label: 'Settlement & Invoices', icon: Receipt },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'logs', label: 'Activity & Audit Log', icon: Bell },
    { id: 'settings', label: 'Settings & Portal Config', icon: Settings },
  ];

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    onClose();
    logout();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-mobile-backdrop" 
          onClick={onClose} 
          aria-hidden="true" 
        />
      )}

      <aside className={`sidebar-executive ${isOpen ? 'open' : ''}`}>
        {/* Brand Area */}
        <div className="sidebar-brand-area">
          <div className="sidebar-brand-crest">
            <span className="crest-monogram">G</span>
            <div className="crest-glow" />
          </div>
          <div className="sidebar-brand-text">
            <h2>Gardner Auction</h2>
            <p>Admin Console</p>
          </div>
          <button 
            className="sidebar-close-btn" 
            onClick={onClose}
            aria-label="Close sidebar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="sidebar-scroll-nav">
          {/* Section: Auction Operations */}
          <div className="sidebar-nav-group">
            <div className="sidebar-section-header">
              <span>AUCTION OPERATIONS</span>
            </div>
            <div className="sidebar-links-list">
              {operationsNav.map(item => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentSection(item.id);
                      onClose();
                    }}
                  >
                    <Icon size={18} className="sidebar-nav-icon" />
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`sidebar-badge ${item.isLive ? 'live-rostrum-pulse' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <div className="sidebar-active-gold-pill" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Finance & Intelligence */}
          <div className="sidebar-nav-group">
            <div className="sidebar-section-header">
              <span>FINANCE & INTELLIGENCE</span>
            </div>
            <div className="sidebar-links-list">
              {financeNav.map(item => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentSection(item.id);
                      onClose();
                    }}
                  >
                    <Icon size={18} className="sidebar-nav-icon" />
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                    {isActive && <div className="sidebar-active-gold-pill" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-executive-footer">
          <div className="sidebar-system-links">
            <span className="sidebar-system-status">
              <span className="status-live-dot" />
              <span>Gardner v24.2 Linked</span>
            </span>
            <a 
              href="https://gardner-auction.vercel.app/" 
              target="_blank" 
              rel="noreferrer" 
              className="sidebar-public-site-link"
              title="Open public bidder portal"
            >
              <span>Public Site</span>
              <ExternalLink size={11} />
            </a>
          </div>

          {/* Administrator Profile Card with Toggle Dropdown */}
          <div className="sidebar-profile-wrapper" ref={profileMenuRef}>
            {/* Popover Dropdown Menu (Opens upwards above card) */}
            {isProfileMenuOpen && (
              <div 
                className="sidebar-profile-dropdown" 
                role="menu" 
                aria-label="Administrator profile menu"
              >
                {/* 1. Admin Information */}
                <div className="sidebar-dropdown-info">
                  <div className="sidebar-dropdown-info-header">Admin Information</div>
                  <div className="sidebar-dropdown-name">{user?.name || 'Todd Gardner'}</div>
                  <div className="sidebar-dropdown-email">{user?.email || 'admin@gardner-auction.com'}</div>
                  <div className="sidebar-dropdown-role-badge">
                    <ShieldCheck size={12} className="shield-icon" />
                    <span>{user?.role ? user.role.replace('_', ' ').toUpperCase() : 'SUPER ADMIN'}</span>
                  </div>
                </div>

                <div className="sidebar-dropdown-divider" />

                {/* 2. My Profile */}
                <button
                  type="button"
                  className="sidebar-dropdown-item"
                  onClick={() => {
                    setCurrentSection('profile');
                    setIsProfileMenuOpen(false);
                    onClose();
                  }}
                  id="btn-sidebar-profile"
                  role="menuitem"
                >
                  <User size={15} className="dropdown-item-icon" />
                  <span>My Profile</span>
                </button>

                {/* 3. Log Out */}
                <button
                  type="button"
                  className="sidebar-dropdown-item logout"
                  onClick={handleLogout}
                  id="btn-sidebar-logout"
                  role="menuitem"
                >
                  <LogOut size={15} className="dropdown-item-icon" />
                  <span>Log Out</span>
                </button>
              </div>
            )}

            <div 
              className={`sidebar-profile-card ${isProfileMenuOpen ? 'menu-active' : ''}`}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              role="button"
              tabIndex={0}
              aria-haspopup="true"
              aria-expanded={isProfileMenuOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                }
              }}
            >
              <div className="sidebar-profile-avatar">
                <span>{user?.avatarText || 'TG'}</span>
              </div>
              <div className="sidebar-profile-details">
                <span className="sidebar-profile-name">{user?.name || 'Todd Gardner'}</span>
                <span className="sidebar-profile-title">{user?.title || 'Owner & Master Auctioneer'}</span>
              </div>
              <button
                type="button"
                className={`sidebar-profile-toggle ${isProfileMenuOpen ? 'open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                }}
                title="Admin profile options"
                aria-label="Admin profile options"
                aria-expanded={isProfileMenuOpen}
              >
                <ChevronDown size={14} className={`sidebar-chevron-icon ${isProfileMenuOpen ? 'rotate' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

