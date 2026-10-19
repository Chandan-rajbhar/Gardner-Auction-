import React from 'react';
import { 
  Menu, 
  Bell, 
  HelpCircle,
  Radio
} from 'lucide-react';
import { Auction, NavigationSection } from '../types';

interface TopbarProps {
  currentSection?: NavigationSection;
  auctions: Auction[];
  selectedAuctionId: string;
  onSelectAuction: (id: string) => void;
  onOpenMobileMenu: () => void;
  onTriggerHiBidSync: () => void;
  isSyncing: boolean;
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
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button 
          className="icon-btn mobile-menu-btn" 
          onClick={onOpenMobileMenu}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Show active auction selector dropdown ONLY on Overview / Dashboard Overview page per user request */}
        {currentSection === 'overview' && (
          <div className="auction-selector-wrapper">
            <div className="auction-select-badge">
              <Radio size={14} color="#b48316" className="auction-radio-pulse" />
              <select 
                value={selectedAuctionId} 
                onChange={(e) => onSelectAuction(e.target.value)}
                title="Select Active Auction"
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
        {/* Supabase Edge & HiBid indicators (Commented out per user request) */}
        {/* 
        <div 
          className="status-indicator" 
          style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', cursor: 'default' }}
          title="Supabase Connected: rzacpssumjahxndmqnxm.supabase.co (Edge Runtime Active)"
        >
          <span className="status-dot" style={{ background: '#f59e0b', boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)' }}></span>
          <span style={{ color: '#d97706', fontWeight: 600 }}>Supabase Edge</span>
        </div>

        <div className="status-indicator">
          <span className="status-dot" style={{ background: '#f59e0b', boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)' }}></span>
          <span>HiBid AF360 Online</span>
        </div>

        <button 
          className="hibid-sync-btn"
          onClick={onTriggerHiBidSync}
          disabled={isSyncing}
          title="Push & Pull catalog updates to HiBid Network"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isSyncing ? 'Syncing...' : 'Sync HiBid'}</span>
        </button>
        */}

        <button 
          className="icon-btn" 
          onClick={onOpenNotifications}
          title="View Activity Logs & Alerts"
        >
          <Bell size={18} />
          {unreadLogsCount > 0 && <span className="icon-badge">{unreadLogsCount}</span>}
        </button>

        <button 
          className="icon-btn" 
          title="Admin Clerking Guide & Help"
          onClick={() => alert('Admin Help: Use the Live Clerking block during auction day to capture bids and manage gavel knock-down. Invoicing automatically computes 15% wire / 18% credit card premiums.')}
        >
          <HelpCircle size={18} />
        </button>

        {/* User profile avatar matching Rowan super_admin in reference screenshot */}
        <div className="topbar-user-badge">
          <div className="topbar-user-avatar">TG</div>
          <div className="topbar-user-details">
            <span className="topbar-user-name">Todd Gardner</span>
            <span className="topbar-user-role">super_admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};
