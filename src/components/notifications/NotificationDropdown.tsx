import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, 
  CheckCheck, 
  RefreshCw, 
  ArrowRight, 
  Gavel, 
  Users, 
  Calendar, 
  CreditCard, 
  Info, 
  ShieldAlert, 
  Check, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { NotificationRecord, NavigationSection } from '../../types';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../../context/ToastContext';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSection?: (section: NavigationSection) => void;
  onNavigateUrl?: (url: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onNavigateSection,
  onNavigateUrl
}) => {
  const { showToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  // Load latest notifications
  const loadNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const records = await notificationService.getNotifications();
      setNotifications(records);
    } catch (err) {
      console.warn('[NotificationDropdown] Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications(() => {
      loadNotifications(true);
    });
    return () => unsubscribe();
  }, [loadNotifications]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayedNotifications = filterMode === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;
  // Show only 3 latest notifications as requested
  const topNotifications = displayedNotifications.slice(0, 3);

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await notificationService.markAllAsRead(notifications);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    showToast('success', 'All Marked Read', 'All notifications have been marked as read.');
  };

  // Click on a notification item
  const handleItemClick = async (item: NotificationRecord) => {
    if (!item.is_read) {
      await notificationService.markAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }

    onClose();

    if (item.action_url) {
      if (onNavigateUrl) {
        onNavigateUrl(item.action_url);
      } else if (item.related_module && onNavigateSection) {
        onNavigateSection(item.related_module as NavigationSection);
      } else {
        try {
          window.history.pushState({}, '', item.action_url);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch {
          window.location.href = item.action_url;
        }
      }
    } else if (item.related_module && onNavigateSection) {
      onNavigateSection(item.related_module as NavigationSection);
    }
  };

  const handleToggleRead = async (e: React.MouseEvent, item: NotificationRecord) => {
    e.stopPropagation();
    if (item.is_read) {
      await notificationService.markAsUnread(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: false } : n));
    } else {
      await notificationService.markAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'clerking':
        return <Gavel size={14} color="#7c3aed" />;
      case 'bidder':
        return <Users size={14} color="#2563eb" />;
      case 'auction':
        return <Calendar size={14} color="#b45309" />;
      case 'settlement':
        return <CreditCard size={14} color="#059669" />;
      case 'security':
        return <ShieldAlert size={14} color="#dc2626" />;
      default:
        return <Info size={14} color="#b45309" />;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'clerking':
        return { background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.25)' };
      case 'bidder':
        return { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)' };
      case 'auction':
        return { background: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.25)' };
      case 'settlement':
        return { background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' };
      case 'security':
        return { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)' };
      default:
        return { background: 'rgba(203, 161, 53, 0.1)', color: '#b45309', border: '1px solid rgba(203, 161, 53, 0.25)' };
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="topbar-notifications-dropdown"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 'min(315px, calc(100vw - 20px))',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(203, 161, 53, 0.25)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeInUp 0.15s ease-out'
      }}
      role="dialog"
      aria-label="Notifications Dropdown"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          borderBottom: '1px solid #f1f5f9',
          background: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Notifications
          </span>
          {unreadCount > 0 ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#ef4444',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: 10,
                lineHeight: '13px'
              }}
            >
              {unreadCount} new
            </span>
          ) : (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: '#64748b'
              }}
            >
              (Caught up)
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              title="Mark all as read"
              aria-label="Mark all as read"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#475569',
                borderRadius: 5,
                padding: '3px 7px',
                fontSize: 10.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#475569';
              }}
            >
              <CheckCheck size={12} color="#16a34a" />
              <span>Mark all</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadNotifications(true)}
            title="Refresh notifications"
            aria-label="Refresh notifications"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              padding: 4,
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            <RefreshCw size={12.5} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '5px 10px',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9'
        }}
      >
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          style={{
            background: filterMode === 'all' ? '#ffffff' : 'transparent',
            border: filterMode === 'all' ? '1px solid #e2e8f0' : '1px solid transparent',
            color: filterMode === 'all' ? '#0f172a' : '#64748b',
            boxShadow: filterMode === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            fontSize: 10.5,
            fontWeight: filterMode === 'all' ? 700 : 500,
            borderRadius: 5,
            padding: '2px 8px',
            cursor: 'pointer'
          }}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('unread')}
          style={{
            background: filterMode === 'unread' ? '#ffffff' : 'transparent',
            border: filterMode === 'unread' ? '1px solid #fecaca' : '1px solid transparent',
            color: filterMode === 'unread' ? '#dc2626' : '#64748b',
            boxShadow: filterMode === 'unread' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            fontSize: 10.5,
            fontWeight: filterMode === 'unread' ? 700 : 500,
            borderRadius: 5,
            padding: '2px 8px',
            cursor: 'pointer'
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications Body List (Showing max 3 items) */}
      <div
        style={{
          maxHeight: 250,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff'
        }}
      >
        {loading ? (
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: 48,
                  borderRadius: 6,
                  background: '#f1f5f9',
                  animation: 'pulse 1.5s infinite'
                }}
              />
            ))}
          </div>
        ) : topNotifications.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(203, 161, 53, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold-primary)'
              }}
            >
              <Bell size={16} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
              {filterMode === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </div>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0, maxWidth: 200 }}>
              {filterMode === 'unread' 
                ? 'All notifications have been reviewed.' 
                : 'New bids and events will appear here.'}
            </p>
          </div>
        ) : (
          topNotifications.map(item => {
            const isUnread = !item.is_read;
            const badgeStyle = getTypeBadgeStyle(item.type);

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  borderBottom: '1px solid #f1f5f9',
                  background: isUnread ? '#fffdfa' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isUnread 
                    ? '#fef8ee' 
                    : '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isUnread 
                    ? '#fffdfa' 
                    : '#ffffff';
                }}
              >
                {/* Unread Indicator Bar */}
                {isUnread && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      borderRadius: '0 2px 2px 0',
                      background: 'var(--gold-primary)',
                      boxShadow: '0 0 6px rgba(203, 161, 53, 0.5)'
                    }}
                  />
                )}

                {/* Type Icon Badge */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                    ...badgeStyle
                  }}
                >
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      marginBottom: 2
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isUnread ? 700 : 600,
                        color: isUnread ? '#0f172a' : '#334155',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {notificationService.formatRelativeTime(item.created_at)}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: 11,
                      color: '#475569',
                      margin: '0 0 4px 0',
                      lineHeight: '14px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: 3,
                        letterSpacing: '0.04em',
                        ...badgeStyle
                      }}
                    >
                      {item.type}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleToggleRead(e, item)}
                      title={isUnread ? 'Mark as read' : 'Mark as unread'}
                      aria-label={isUnread ? 'Mark as read' : 'Mark as unread'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isUnread ? 'var(--gold-dark, #b45309)' : '#94a3b8',
                        padding: '1px 3px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 10,
                        gap: 2,
                        fontWeight: 500
                      }}
                    >
                      <Check size={11} strokeWidth={isUnread ? 2.5 : 1.5} />
                      <span>{isUnread ? 'Mark read' : 'Unread'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation Link */}
      <div
        style={{
          padding: '7px 12px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onNavigateSection) {
              onNavigateSection('notifications');
            } else {
              try {
                window.history.pushState({}, '', '/notifications');
                window.dispatchEvent(new PopStateEvent('popstate'));
              } catch {
                window.location.href = '/notifications';
              }
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gold-dark, #b45309)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 6px',
            borderRadius: 4,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#78350f';
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--gold-dark, #b45309)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
          id="btn-view-all-notifications"
        >
          <span>View All Notifications</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
