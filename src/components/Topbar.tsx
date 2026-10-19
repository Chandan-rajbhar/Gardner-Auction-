import React from 'react';
import { 
  Menu, 
  RefreshCw, 
  Bell, 
  HelpCircle,
  Radio
} from 'lucide-react';
import { Auction } from '../types';

interface TopbarProps {
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
  auctions,
  selectedAuctionId,
  onSelectAuction,
  onOpenMobileMenu,
  onTriggerHiBidSync,
  isSyncing,
  unreadLogsCount,
  onOpenNotifications
}) => {
  const currentAuction = auctions.find(a => a.id === selectedAuctionId) || auctions[0];

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
          <span>Dashboard</span>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>AF360 Auction Overview</strong>
        </div>

        <div className="auction-selector-wrapper">
          <div className="auction-select-badge">
            <Radio size={14} color="#b48316" />
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
      </div>

      <div className="topbar-right">
        <div 
          className="status-indicator" 
          style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', cursor: 'default' }}
          title="Supabase Connected: rzacpssumjahxndmqnxm.supabase.co (Edge Runtime Active)"
        >
          <span className="status-dot" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}></span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>Supabase Edge</span>
        </div>

        <div className="status-indicator">
          <span className="status-dot"></span>
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
          title="AF360 Clerking Guide & Help"
          onClick={() => alert('AF360 Admin Help: Use the Live Clerking block during auction day to capture floor and HiBid bids. Invoicing automatically computes 15% wire / 18% credit card premiums.')}
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
