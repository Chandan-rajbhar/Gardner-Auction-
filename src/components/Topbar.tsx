import React from 'react';
import { Menu, Bell } from 'lucide-react';
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
  onOpenMobileMenu,
  unreadLogsCount,
  onOpenNotifications
}) => {
  const { user } = useAuth();

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

      {/* Right: Notification & Profile */}
      <div className="topbar-right-zone">
        {/* Notification Button */}
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

