import React from 'react';
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
  LogOut
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

  const navItems: Array<{
    id: NavigationSection;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    isLive?: boolean;
  }> = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'live_clerking', label: 'Live Clerking Block', icon: Radio, badge: 'LIVE', isLive: true },
    { id: 'lots', label: 'Lots & Catalog', icon: Layers, badge: liveLotsCount },
    { id: 'auctions', label: 'Auction Sales', icon: Gavel },
    { id: 'users', label: 'Bidders & Consignors', icon: Users, badge: pendingVerifications > 0 ? pendingVerifications : undefined },
    { id: 'payments', label: 'Settlement & Invoices', icon: Receipt },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'logs', label: 'Activity & Audit Log', icon: Bell },
    { id: 'settings', label: 'Settings & Portal Config', icon: Settings },
  ];

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose} 
          aria-label="Close navigation sidebar"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-crest">G</div>
          <div className="brand-details">
            <h2>Gardner Auction</h2>
            <p>Admin Console</p>
          </div>
          <button 
            className="icon-btn mobile-menu-btn" 
            style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#94a3b8' }}
            onClick={onClose}
            aria-label="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-title">Auction Operations</div>
          {navItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSection(item.id);
                  onClose();
                }}
              >
                <Icon size={18} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`nav-badge ${item.isLive ? 'live-pulse' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="nav-section-title">Finance & Intelligence</div>
          {navItems.slice(5).map(item => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSection(item.id);
                  onClose();
                }}
              >
                <Icon size={18} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck size={14} color="#f59e0b" /> Gardner v24.2 Linked
            </span>
            <a 
              href="https://gardner-auction.vercel.app/" 
              target="_blank" 
              rel="noreferrer" 
              style={{ fontSize: 11, color: 'var(--gold-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Public Site <ExternalLink size={11} />
            </a>
          </div>

          <div className="operator-profile">
            <div className="operator-avatar">
              {user?.avatarText || 'TG'}
            </div>
            <div className="operator-info">
              <div className="operator-name">{user?.name || 'Todd Gardner'}</div>
              <div className="operator-role">{user?.title || 'Owner & Master Auctioneer'}</div>
            </div>
            <button
              className="operator-logout-btn"
              onClick={handleLogout}
              title="Sign Out / Lock AF360 Console"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
