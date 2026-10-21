import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Radio, ChevronDown } from 'lucide-react';
import { Auction, NavigationSection } from '../types';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  currentSection?: NavigationSection;
  auctions?: Auction[];
  selectedAuctionId?: string;
  onSelectAuction?: (id: string) => void;
  onOpenMobileMenu: () => void;
  onTriggerHiBidSync?: () => void;
  isSyncing?: boolean;
  unreadLogsCount: number;
  onOpenNotifications: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  auctions = [],
  selectedAuctionId,
  onSelectAuction = () => {},
  onOpenMobileMenu,
  unreadLogsCount,
  onOpenNotifications
}) => {
  const { user } = useAuth();
  const [isAuctionMenuOpen, setIsAuctionMenuOpen] = useState(false);
  const auctionMenuRef = useRef<HTMLDivElement>(null);

  const currentSelectedAuction = auctions.find(a => a.id === selectedAuctionId) || auctions[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (auctionMenuRef.current && !auctionMenuRef.current.contains(event.target as Node)) {
        setIsAuctionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="executive-topbar">
      {/* Left: Mobile hamburger */}
      <div className="topbar-left-zone">
        <button 
          className="topbar-icon-button mobile-only-toggle" 
          onClick={onOpenMobileMenu}
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right: Current Auction Selector, Notification & Profile */}
      <div className="topbar-right-zone">
        {/* Current Auction Selector Dropdown (Left of Bell Icon) */}
        <div className="current-auction-dropdown-wrapper" ref={auctionMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="current-auction-btn"
            onClick={() => setIsAuctionMenuOpen(!isAuctionMenuOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)'
            }}
            aria-expanded={isAuctionMenuOpen}
            title="Switch Global Active Auction Context"
          >
            <Radio size={13} color="var(--gold-primary)" className="auction-radio-pulse" />
            <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSelectedAuction?.title || (currentSelectedAuction as any)?.name || 'Select Auction'}
            </span>
            <ChevronDown size={14} color="#64748b" />
          </button>

          {isAuctionMenuOpen && (
            <div 
              className="auction-dropdown-popover"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 60,
                minWidth: 320,
                maxWidth: 380,
                maxHeight: 360,
                overflowY: 'auto',
                padding: '8px 0'
              }}
            >
              <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                Select Active Saleroom Auction
              </div>
              {auctions.map(a => {
                const isSelected = a.id === selectedAuctionId;
                const title = a.title || (a as any).name;
                const status = a.status;

                return (
                  <div
                    key={a.id}
                    onClick={() => {
                      onSelectAuction(a.id);
                      setIsAuctionMenuOpen(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      background: isSelected ? '#fbf8f2' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--gold-primary)' : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--gold-dark)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 2 }}>
                        {a.code} • {status?.toUpperCase()}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: 11, color: 'var(--gold-primary)', fontWeight: 700 }}>
                        ✓ Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button 
          className="topbar-icon-button" 
          onClick={onOpenNotifications}
          title="View Activity Logs & Alerts"
          aria-label="View notifications"
        >
          <Bell size={18} />
          {unreadLogsCount > 0 && (
            <span className="topbar-badge-pill">{unreadLogsCount}</span>
          )}
        </button>

        {/* Administrator Profile (Static badge without dropdown) */}
        <div className="topbar-user-badge" title={`Signed in as ${user?.name || 'Todd Gardner'}`}>
          <div className="topbar-user-avatar">
            {user?.avatarText || 'TG'}
          </div>
          <div className="topbar-user-details">
            <span className="topbar-user-name">{user?.name || 'Todd Gardner'}</span>
            <span className="topbar-user-role">{user?.role || 'super_admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

