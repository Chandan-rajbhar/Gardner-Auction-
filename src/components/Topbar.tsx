import { Bell, PanelLeft } from 'lucide-react';
import { Auction, NavigationSection } from '../types';
import { useAuth } from '../context/AuthContext';

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
  unreadLogsCount: number;
  onOpenNotifications: () => void;
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
  unreadLogsCount,
  onOpenNotifications,
  onNavigateProfile
}) => {
  const { user } = useAuth();
  const handleToggle = onToggleSidebar || onOpenMobileMenu;

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
        <button 
          className="topbar-icon-button" 
          onClick={onOpenNotifications}
          title="View Activity Logs & Alerts"
          aria-label="View notifications"
          id="btn-topbar-notifications"
        >
          <Bell size={18} />
          {unreadLogsCount > 0 && (
            <span className="topbar-badge-pill">{unreadLogsCount}</span>
          )}
        </button>

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


