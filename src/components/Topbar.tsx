import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  HelpCircle,
  Radio,
  LogOut,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Auction, NavigationSection } from '../types';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  currentSection?: NavigationSection;
  auctions: Auction[];
  selectedAuctionId: string;
  onSelectAuction: (id: string) => void;
  onOpenMobileMenu: () => void;
  onTriggerHiBidSync?: () => void;
  isSyncing?: boolean;
  unreadLogsCount: number;
  onOpenNotifications: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentSection = 'overview',
  auctions,
  selectedAuctionId,
  onSelectAuction,
  onOpenMobileMenu,
  unreadLogsCount,
  onOpenNotifications
}) => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="icon-btn mobile-menu-btn" 
          onClick={onOpenMobileMenu}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Show active auction selector dropdown ONLY on Overview page */}
        {currentSection === 'overview' && (
          <div className="auction-selector-wrapper">
            <div className="auction-select-badge">
              <Radio size={14} color="#b48316" className="auction-radio-pulse" />
              <select 
                value={selectedAuctionId} 
                onChange={(e) => onSelectAuction(e.target.value)}
                title="Select Active Auction"
                className="auction-select-element"
              >
                {auctions.map(a => (
                  <option key={a.id} value={a.id} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {a.code} — {a.title} ({a.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <button 
          className="icon-btn" 
          onClick={onOpenNotifications}
          title="View Activity Logs & Alerts"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadLogsCount > 0 && <span className="icon-badge">{unreadLogsCount}</span>}
        </button>

        <button 
          className="icon-btn topbar-help-btn" 
          title="AF360 Clerking Guide & Help"
          onClick={() => alert('AF360 Admin Help: Use the Live Clerking block during auction day to capture bids and manage gavel knock-down. Invoicing automatically computes 15% wire / 18% credit card premiums.')}
          aria-label="Help"
        >
          <HelpCircle size={18} />
        </button>

        {/* User profile avatar badge with interactive dropdown */}
        <div className="topbar-user-container" ref={userMenuRef}>
          <button
            type="button"
            className="topbar-user-badge"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
            aria-label="User profile menu"
          >
            <div className="topbar-user-avatar">
              {user?.avatarText || 'GA'}
            </div>
            <div className="topbar-user-details">
              <span className="topbar-user-name">{user?.name || 'Administrator'}</span>
              <span className="topbar-user-role">{user?.role || 'operator'}</span>
            </div>
            <ChevronDown size={14} className="user-menu-chevron" />
          </button>

          {/* User Popover Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="user-dropdown-menu">
              <div className="user-dropdown-header">
                <div className="dropdown-avatar">
                  {user?.avatarText || 'GA'}
                </div>
                <div className="dropdown-info">
                  <div className="dropdown-name">{user?.name || 'Administrator'}</div>
                  <div className="dropdown-email">{user?.email || 'admin@gardner-auction.com'}</div>
                  <div className="dropdown-role-tag">
                    <ShieldCheck size={12} color="#059669" />
                    <span>{user?.role?.toUpperCase() || 'OPERATOR'}</span>
                  </div>
                </div>
              </div>

              <div className="user-dropdown-meta">
                <div className="meta-item">
                  <span className="meta-label">Title</span>
                  <span className="meta-val">{user?.title || 'Saleroom Operator'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">License</span>
                  <span className="meta-val">PA #AY002377</span>
                </div>
              </div>

              <div className="user-dropdown-actions">
                <button
                  type="button"
                  className="user-dropdown-logout-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  id="btn-topbar-logout"
                >
                  <LogOut size={16} />
                  <span>Lock Console & Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
