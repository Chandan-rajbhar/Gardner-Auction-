import React, { useState, useEffect } from 'react';
import { Bell, PanelLeft } from 'lucide-react';
import { Auction, NavigationSection } from '../types';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from './notifications/NotificationDropdown';
import { notificationService } from '../services/notificationService';

interface TopbarProps {
  currentSection?: NavigationSection;
  auctions?: Auction[];
  selectedAuctionId?: string;
  onSelectAuction?: (id: string) => void;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  isSidebarOpen?: boolean;
  onTriggerHiBidSync?: () => void;
  isSyncing?: boolean;
  unreadLogsCount?: number;
  onOpenNotifications?: () => void;
  onNavigateSection?: (section: NavigationSection) => void;
  onNavigateProfile?: () => void;
}

const getSectionTitle = (section?: NavigationSection): string => {
  switch (section) {
    case 'overview': return 'Dashboard';
    case 'live_clerking': return 'Live Clerking Block';
    case 'auctions': return 'Auction Catalog';
    case 'lots': return 'Catalog Lots';
    case 'users': return 'Customers';
    case 'admins': return 'Admins';
    case 'payments': return 'Settlement & Invoices';
    case 'reports': return 'Reports & Analytics';
    case 'logs': return 'Activity & Audit Log';
    case 'notifications': return 'Notifications';
    case 'settings': return 'Settings & Portal Config';
    case 'profile': return 'Administrator Profile';
    default: return 'Dashboard';
  }
};

export const Topbar: React.FC<TopbarProps> = ({
  currentSection = 'overview',
  onToggleSidebar,
  onOpenMobileMenu,
  isSidebarOpen = true,
  unreadLogsCount: _fallbackLogsCount,
  onOpenNotifications: _legacyOnOpen,
  onNavigateSection,
  onNavigateProfile
}) => {
  const { user } = useAuth();
  const handleToggle = onToggleSidebar || onOpenMobileMenu;

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Sync unread notification count dynamically from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const notifs = await notificationService.getNotifications();
        if (isMounted) {
          const count = notifs.filter(n => !n.is_read).length;
          setUnreadCount(count);
        }
      } catch (err) {
        console.warn('[Topbar] Error fetching unread notifications:', err);
      }
    };

    fetchUnread();

    const unsubscribe = notificationService.subscribeToNotifications(() => {
      fetchUnread();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <header className="executive-topbar">
      {/* Left: Sidebar Toggle (App Sidebar Icon) & Breadcrumb */}
      <div className="topbar-left-zone">
        <button 
          type="button"
          className="topbar-icon-button sidebar-toggle-btn" 
          onClick={handleToggle}
          aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-expanded={isSidebarOpen}
          id="btn-toggle-sidebar"
        >
          <PanelLeft size={18} />
        </button>
        <div className="topbar-breadcrumb-title">
          <span>{getSectionTitle(currentSection)}</span>
        </div>
      </div>

      {/* Right: Notifications & Administrator Profile */}
      <div className="topbar-right-zone">
        {/* Notification Bell with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button"
            className={`topbar-icon-button ${isDropdownOpen ? 'active' : ''}`}
            onClick={() => setIsDropdownOpen(prev => !prev)}
            title="View Notifications"
            aria-label="View notifications"
            aria-expanded={isDropdownOpen}
            id="btn-topbar-notifications"
            style={{
              position: 'relative',
              background: isDropdownOpen ? 'rgba(203, 161, 53, 0.15)' : undefined,
              borderColor: isDropdownOpen ? 'var(--gold-primary)' : undefined,
              color: isDropdownOpen ? 'var(--gold-primary)' : undefined
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="topbar-badge-pill" style={{ background: '#ef4444' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={isDropdownOpen}
            onClose={() => setIsDropdownOpen(false)}
            onNavigateSection={onNavigateSection}
          />
        </div>

        {/* Administrator Profile (Clickable Navigation to Profile Page) */}
        <button
          type="button"
          className="topbar-user-badge clickable"
          onClick={onNavigateProfile}
          title={`View Profile: ${user?.name || 'Administrator'}`}
          aria-label="View Administrator Profile"
          id="btn-topbar-profile"
        >
          <div className="topbar-user-avatar">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user?.name || 'Administrator'} 
                className="topbar-user-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.topbar-avatar-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span 
              className="topbar-avatar-fallback" 
              style={{ display: user?.avatarUrl ? 'none' : 'flex' }}
            >
              {user?.avatarText || 'CK'}
            </span>
          </div>
          <div className="topbar-user-details">
            <span className="topbar-user-name">{user?.name || 'Chandan Kumar'}</span>
            <span className="topbar-user-role">
              {user?.role ? user.role.replace('_', ' ') : 'super_admin'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};


