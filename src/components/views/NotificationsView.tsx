import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Bell, 
  BellRing,
  Search, 
  RefreshCw, 
  CheckCheck, 
  Plus, 
  Filter, 
  X, 
  Eye, 
  Trash2, 
  Check, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Edit3, 
  Gavel, 
  Users, 
  Calendar, 
  CreditCard, 
  Info, 
  ShieldAlert, 
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { NotificationRecord, NotificationType, NavigationSection } from '../../types';
import { notificationService } from '../../services/notificationService';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '../ui/select';
import { ShadcnSheet } from '../ui/ShadcnSheet';
import { ShadcnPagination } from '../ui/ShadcnPagination';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import { RowActionMenu } from '../ui/RowActionMenu';
import { useToast } from '../../context/ToastContext';

interface NotificationsViewProps {
  onNavigateSection?: (section: NavigationSection) => void;
  onNavigateUrl?: (url: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onNavigateSection,
  onNavigateUrl
}) => {
  const { showToast } = useToast();

  // Primary Data States
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Selected rows for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination (20 records per page default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Drawer & Modal States
  const [selectedNotificationForDetails, setSelectedNotificationForDetails] = useState<NotificationRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const [selectedNotificationForEdit, setSelectedNotificationForEdit] = useState<NotificationRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({ title: '', message: '', type: 'system', recipient_role: 'admin' });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    message: '',
    type: 'system',
    recipient_role: 'admin',
    related_module: 'auctions',
    action_url: ''
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  const [selectedNotificationForDelete, setSelectedNotificationForDelete] = useState<NotificationRecord | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingSubmitting, setIsDeletingSubmitting] = useState<boolean>(false);

  // Load notifications from Supabase
  const loadNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const records = await notificationService.getNotifications();
      setNotifications(records);
    } catch (err: any) {
      console.error('[NotificationsView] Error loading notifications:', err);
      setError(err?.message || 'Failed to retrieve notifications from Supabase.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to realtime database updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications(() => {
      loadNotifications(true);
    });
    return () => unsubscribe();
  }, [loadNotifications]);

  // Derived Counts
  const totalCount = notifications.length;
  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
  const readCount = totalCount - unreadCount;

  // Filter & Search Logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.message.toLowerCase().includes(term) ||
        (item.type && item.type.toLowerCase().includes(term)) ||
        (item.recipient_id && item.recipient_id.toLowerCase().includes(term)) ||
        (item.recipient_role && item.recipient_role.toLowerCase().includes(term)) ||
        (item.related_module && item.related_module.toLowerCase().includes(term)) ||
        (item.related_record_id && item.related_record_id.toLowerCase().includes(term));

      const matchesType = typeFilter === 'all' || item.type.toLowerCase() === typeFilter.toLowerCase();
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'unread' && !item.is_read) ||
        (statusFilter === 'read' && item.is_read);

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.created_at);
        const now = new Date();
        if (dateFilter === 'today') {
          matchesDate = itemDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = itemDate >= sevenDaysAgo;
        } else if (dateFilter === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = itemDate >= thirtyDaysAgo;
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [notifications, searchTerm, typeFilter, statusFilter, dateFilter]);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, dateFilter, pageSize]);

  // Paginated records slice
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  // Total pages
  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;

  // Row selection helpers
  const isAllPageSelected = paginatedNotifications.length > 0 && paginatedNotifications.every(n => selectedIds.includes(n.id));
  const isSomePageSelected = paginatedNotifications.some(n => selectedIds.includes(n.id));

  const handleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = paginatedNotifications.map(n => n.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedNotifications.map(n => n.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Actions
  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (selectedNotificationForDetails && selectedNotificationForDetails.id === id) {
      setSelectedNotificationForDetails(prev => prev ? { ...prev, is_read: true } : null);
    }
    showToast('success', 'Marked as Read', 'Notification marked as read.');
  };

  const handleMarkAsUnread = async (id: string) => {
    await notificationService.markAsUnread(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
    if (selectedNotificationForDetails && selectedNotificationForDetails.id === id) {
      setSelectedNotificationForDetails(prev => prev ? { ...prev, is_read: false } : null);
    }
    showToast('info', 'Marked as Unread', 'Notification marked as unread.');
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(notifications);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    showToast('success', 'All Read', 'All notifications have been marked as read.');
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    if (selectedIds.length === 0) return;
    await notificationService.markBulkRead(selectedIds, isRead);
    setNotifications(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, is_read: isRead } : n));
    showToast('success', 'Updated Status', `${selectedIds.length} notification(s) marked as ${isRead ? 'read' : 'unread'}.`);
  };

  const handleDeleteSingle = async () => {
    if (!selectedNotificationForDelete) return;
    setIsDeletingSubmitting(true);
    try {
      await notificationService.deleteNotification(selectedNotificationForDelete.id);
      setNotifications(prev => prev.filter(n => n.id !== selectedNotificationForDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== selectedNotificationForDelete.id));
      showToast('success', 'Deleted', 'Notification record deleted from database.');
      setSelectedNotificationForDelete(null);
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to delete notification.');
    } finally {
      setIsDeletingSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingSubmitting(true);
    try {
      await notificationService.deleteBulkNotifications(selectedIds);
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      showToast('success', 'Bulk Delete Successful', `${selectedIds.length} notification(s) removed.`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to delete notifications.');
    } finally {
      setIsDeletingSubmitting(false);
    }
  };

  const handleOpenEdit = (item: NotificationRecord) => {
    setSelectedNotificationForEdit(item);
    setEditForm({
      title: item.title,
      message: item.message,
      type: item.type || 'system',
      recipient_role: item.recipient_role || 'admin'
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotificationForEdit) return;
    setIsSubmittingEdit(true);
    try {
      await notificationService.updateNotification(selectedNotificationForEdit.id, editForm);
      setNotifications(prev => prev.map(n => 
        n.id === selectedNotificationForEdit.id ? { ...n, ...editForm } : n
      ));
      if (selectedNotificationForDetails && selectedNotificationForDetails.id === selectedNotificationForEdit.id) {
        setSelectedNotificationForDetails(prev => prev ? { ...prev, ...editForm } : null);
      }
      showToast('success', 'Notification Updated', 'Changes saved successfully to database.');
      setIsEditOpen(false);
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not update notification.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      showToast('error', 'Missing Information', 'Title and message are required.');
      return;
    }
    setIsSubmittingCreate(true);
    try {
      const created = await notificationService.createNotification({
        title: createForm.title.trim(),
        message: createForm.message.trim(),
        type: createForm.type,
        recipient_id: 'all',
        recipient_role: createForm.recipient_role,
        related_module: createForm.related_module as NavigationSection,
        action_url: createForm.action_url.trim() || `/${createForm.related_module}`,
        is_read: false
      });
      setNotifications(prev => [created, ...prev]);
      showToast('success', 'Notification Published', 'New administrative notification created in Supabase.');
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        message: '',
        type: 'system',
        recipient_role: 'admin',
        related_module: 'auctions',
        action_url: ''
      });
    } catch (err: any) {
      showToast('error', 'Creation Failed', err?.message || 'Could not create notification.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleNavigateItem = (item: NotificationRecord) => {
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

  // Badges & styling helpers
  const renderTypeBadge = (type: string) => {
    const t = (type || '').toLowerCase();
    let bg = 'rgba(203, 161, 53, 0.12)';
    let color = '#cba135';
    let border = '1px solid rgba(203, 161, 53, 0.25)';
    let icon = <Info size={12} />;

    if (t === 'clerking') {
      bg = 'rgba(139, 92, 246, 0.12)';
      color = '#8b5cf6';
      border = '1px solid rgba(139, 92, 246, 0.25)';
      icon = <Gavel size={12} />;
    } else if (t === 'bidder') {
      bg = 'rgba(59, 130, 246, 0.12)';
      color = '#3b82f6';
      border = '1px solid rgba(59, 130, 246, 0.25)';
      icon = <Users size={12} />;
    } else if (t === 'auction') {
      bg = 'rgba(245, 158, 11, 0.12)';
      color = '#f59e0b';
      border = '1px solid rgba(245, 158, 11, 0.25)';
      icon = <Calendar size={12} />;
    } else if (t === 'settlement') {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = '#10b981';
      border = '1px solid rgba(16, 185, 129, 0.25)';
      icon = <CreditCard size={12} />;
    } else if (t === 'security') {
      bg = 'rgba(239, 68, 68, 0.12)';
      color = '#ef4444';
      border = '1px solid rgba(239, 68, 68, 0.25)';
      icon = <ShieldAlert size={12} />;
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          background: bg,
          color,
          border,
          textTransform: 'uppercase',
          letterSpacing: '0.03em'
        }}
      >
        {icon}
        <span>{type}</span>
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* 1. Header with Compact Overview Metrics & Refresh */}
      <div 
        className="card-header-flex"
        style={{ 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 14,
          marginBottom: 0,
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
              Notifications
            </h2>
            {refreshing && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold-bright)', background: 'rgba(203, 161, 53, 0.08)', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>
                <RefreshCw size={11} className="spin-animation" /> Live updating...
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
            Operational activity alerts, auction bids, bidder check-ins, and administrative notifications across Gardner AF360
          </p>
        </div>

        {/* Counter Badges & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Stat Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-main)',
                background: '#f1f5f9',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #e2e8f0'
              }}
              title="Total notifications in database"
            >
              Total: <strong>{totalCount}</strong>
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#dc2626',
                background: '#fef2f2',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #fecaca'
              }}
              title="Unread notifications"
            >
              Unread: <strong>{unreadCount}</strong>
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#16a34a',
                background: '#f0fdf4',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #dcfce7'
              }}
              title="Read notifications"
            >
              Read: <strong>{readCount}</strong>
            </span>
          </div>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleMarkAllRead}
              title="Mark all notifications as read"
              style={{ height: 35, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
            >
              <CheckCheck size={14} color="#16a34a" />
              <span>Mark All Read</span>
            </button>
          )}

          {/* Create Notification */}
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => setIsCreateOpen(true)}
            style={{ height: 35, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          >
            <Plus size={14} />
            <span>New Notification</span>
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadNotifications(false)}
            disabled={loading || refreshing}
            title="Refresh notifications from Supabase"
            style={{ height: 35, padding: '0 11px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div 
        style={{ 
          display: 'flex', 
          gap: 12, 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          background: 'var(--bg-card, #ffffff)', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-md, 8px)', 
          border: '1px solid var(--border-subtle, #e2e8f0)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        {/* Search Input */}
        <div className="input-search-wrapper" style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={15} className="search-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search notification title, message, recipient, record..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 36,
              paddingRight: searchTerm ? 32 : 12,
              borderRadius: 6,
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: '#ffffff',
              fontSize: 12.5,
              outline: 'none',
              color: 'var(--text-main, #0f172a)'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category/Type Filter */}
        <div style={{ width: 165 }}>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger style={{ height: 36, fontSize: 12.5, width: '100%' }}>
              <Filter size={13} style={{ color: '#64748b', marginRight: 4 }} />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="auction">Auction</SelectItem>
              <SelectItem value="bidder">Bidder</SelectItem>
              <SelectItem value="clerking">Clerking</SelectItem>
              <SelectItem value="settlement">Settlement</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Read / Unread Status Filter */}
        <div style={{ width: 145 }}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ height: 36, fontSize: 12.5, width: '100%' }}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
              <SelectItem value="read">Read Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Filter */}
        <div style={{ width: 145 }}>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger style={{ height: 36, fontSize: 12.5, width: '100%' }}>
              <Clock size={13} style={{ color: '#64748b', marginRight: 4 }} />
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past 7 Days</SelectItem>
              <SelectItem value="month">Past 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Clear Button */}
        {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('all');
              setStatusFilter('all');
              setDateFilter('all');
            }}
            style={{ height: 36, padding: '0 10px', fontSize: 12, color: '#64748b' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 3. Bulk Actions Toolbar (when rows selected) */}
      {selectedIds.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid var(--gold-primary)',
            borderRadius: 6,
            padding: '8px 14px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>
            <span style={{ background: 'var(--gold-primary)', color: '#ffffff', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
              {selectedIds.length}
            </span>
            <span>Selected notification(s)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleBulkMarkRead(true)}
              style={{ padding: '4px 10px', fontSize: 12, height: 30, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Check size={13} color="#16a34a" />
              <span>Mark as Read</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleBulkMarkRead(false)}
              style={{ padding: '4px 10px', fontSize: 12, height: 30, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Mark as Unread</span>
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              style={{ padding: '4px 10px', fontSize: 12, height: 30, display: 'flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}
            >
              <Trash2 size={13} />
              <span>Delete ({selectedIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991b1b', fontSize: 12.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '3px 10px', fontSize: 11.5 }} 
            onClick={() => loadNotifications(false)}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Notifications Table Container */}
      <div className="table-wrapper" style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, background: '#ffffff', overflowX: 'auto' }}>
        <table className="luxury-table" style={{ fontSize: 12.5, width: '100%', minWidth: 960 }}>
          <thead>
            <tr>
              {/* Checkbox */}
              <th style={{ width: '4%', padding: '11px 12px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllPageSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomePageSelected && !isAllPageSelected;
                  }}
                  onChange={handleSelectAllPage}
                  aria-label="Select all notifications on page"
                  style={{ cursor: 'pointer', accentColor: 'var(--gold-primary)' }}
                />
              </th>
              {/* Read / Unread Status Indicator */}
              <th style={{ width: '3%', padding: '11px 4px', textAlign: 'center' }}></th>
              {/* Title & Message */}
              <th style={{ width: '32%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Notification Details
              </th>
              {/* Category / Type */}
              <th style={{ width: '13%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Category
              </th>
              {/* Recipient */}
              <th style={{ width: '12%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recipient
              </th>
              {/* Related Module / Destination */}
              <th style={{ width: '14%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Related Record
              </th>
              {/* Created At */}
              <th style={{ width: '11%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Created At
              </th>
              {/* Status */}
              <th style={{ width: '6%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Status
              </th>
              {/* Actions */}
              <th style={{ width: '5%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading Skeleton Rows
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} style={{ opacity: 0.6 }}>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ height: 14, width: 14, background: '#f1f5f9', borderRadius: 3, margin: '0 auto' }}></div>
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'center' }}>
                    <div style={{ height: 8, width: 8, background: '#f1f5f9', borderRadius: '50%', margin: '0 auto' }}></div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ height: 14, width: 180, background: '#f1f5f9', borderRadius: 4, marginBottom: 6 }}></div>
                    <div style={{ height: 12, width: 260, background: '#f1f5f9', borderRadius: 4 }}></div>
                  </td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 20, width: 75, background: '#f1f5f9', borderRadius: 6 }}></div></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: 90, background: '#f1f5f9', borderRadius: 4 }}></div></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: 100, background: '#f1f5f9', borderRadius: 4 }}></div></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: 80, background: '#f1f5f9', borderRadius: 4 }}></div></td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}><div style={{ height: 18, width: 55, background: '#f1f5f9', borderRadius: 8, margin: '0 auto' }}></div></td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}><div style={{ height: 18, width: 24, background: '#f1f5f9', borderRadius: 4, margin: '0 auto' }}></div></td>
                </tr>
              ))
            ) : paginatedNotifications.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      background: 'rgba(203, 161, 53, 0.1)',
                      color: 'var(--gold-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px'
                    }}
                  >
                    <BellRing size={24} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>
                    No notifications match your filter criteria
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 12.5 }}>
                    Try searching with different terms or resetting the category and status filters.
                  </p>
                </td>
              </tr>
            ) : (
              // Live Data Rows
              paginatedNotifications.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const isUnread = !item.is_read;

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: isSelected 
                        ? 'rgba(203, 161, 53, 0.08)' 
                        : isUnread 
                        ? 'rgba(203, 161, 53, 0.03)' 
                        : undefined,
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(item.id)}
                        aria-label={`Select notification: ${item.title}`}
                        style={{ cursor: 'pointer', accentColor: 'var(--gold-primary)' }}
                      />
                    </td>

                    {/* Unread Visual Indicator */}
                    <td style={{ padding: '11px 4px', textAlign: 'center' }}>
                      {isUnread ? (
                        <span
                          title="Unread notification"
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--gold-primary)',
                            boxShadow: '0 0 6px rgba(203, 161, 53, 0.8)'
                          }}
                        />
                      ) : (
                        <CheckCircle2 size={12} style={{ color: '#94a3b8', margin: '0 auto' }} />
                      )}
                    </td>

                    {/* Title & Message */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            onClick={() => {
                              setSelectedNotificationForDetails(item);
                              setIsDetailsOpen(true);
                            }}
                            style={{
                              fontSize: 13,
                              fontWeight: isUnread ? 700 : 600,
                              color: isUnread ? 'var(--text-main)' : '#334155',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold-dark)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = isUnread ? 'var(--text-main)' : '#334155'}
                          >
                            {item.title}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            margin: 0,
                            lineHeight: 1.4,
                            maxWidth: 440,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {item.message}
                        </p>
                      </div>
                    </td>

                    {/* Category / Type */}
                    <td style={{ padding: '11px 14px' }}>
                      {renderTypeBadge(item.type)}
                    </td>

                    {/* Recipient */}
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-main)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} style={{ color: '#64748b' }} />
                        <span style={{ textTransform: 'capitalize' }}>
                          {item.recipient_role ? item.recipient_role.replace('_', ' ') : 'All Staff'}
                        </span>
                      </div>
                    </td>

                    {/* Related Record / Navigation */}
                    <td style={{ padding: '11px 14px' }}>
                      {item.related_module ? (
                        <button
                          type="button"
                          onClick={() => handleNavigateItem(item)}
                          title={`Navigate to ${item.related_module}`}
                          style={{
                            background: 'rgba(203, 161, 53, 0.08)',
                            border: '1px solid rgba(203, 161, 53, 0.25)',
                            color: 'var(--gold-dark)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span style={{ textTransform: 'capitalize' }}>{item.related_module.replace('_', ' ')}</span>
                          <ExternalLink size={11} />
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* Created At */}
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {notificationService.formatRelativeTime(item.created_at)}
                        </span>
                        <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Read Status Badge */}
                    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                      {isUnread ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca'
                          }}
                        >
                          UNREAD
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          READ
                        </span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                      <RowActionMenu
                        ariaLabel={`Actions for ${item.title}`}
                        items={[
                          {
                            label: 'View Details',
                            icon: <Eye size={14} />,
                            onClick: () => {
                              setSelectedNotificationForDetails(item);
                              setIsDetailsOpen(true);
                            }
                          },
                          item.is_read
                            ? {
                                label: 'Mark as Unread',
                                icon: <Clock size={14} />,
                                onClick: () => handleMarkAsUnread(item.id)
                              }
                            : {
                                label: 'Mark as Read',
                                icon: <Check size={14} />,
                                onClick: () => handleMarkAsRead(item.id)
                              },
                          {
                            label: 'Edit Notification',
                            icon: <Edit3 size={14} />,
                            onClick: () => handleOpenEdit(item)
                          },
                          ...(item.action_url ? [{
                            label: 'Open Destination',
                            icon: <ExternalLink size={14} />,
                            onClick: () => handleNavigateItem(item)
                          }] : []),
                          {
                            label: 'Delete Record',
                            icon: <Trash2 size={14} />,
                            variant: 'danger',
                            onClick: () => setSelectedNotificationForDelete(item)
                          }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Pagination Footer */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '12px 16px', 
          background: '#ffffff', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 8,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        {/* ShadcnPagination Component */}
        <div style={{ width: '100%' }}>
          <ShadcnPagination
            currentPage={currentPage}
            totalItems={filteredNotifications.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            showPageSizeSelector={true}
            itemLabel="notifications"
          />
        </div>
      </div>

      {/* 6. View Details Drawer (ShadcnSheet) */}
      <ShadcnSheet
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Notification Details"
        description="Comprehensive administrative notification audit log and target navigation record"
        size="md"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            {selectedNotificationForDetails && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (selectedNotificationForDetails.is_read) {
                    handleMarkAsUnread(selectedNotificationForDetails.id);
                  } else {
                    handleMarkAsRead(selectedNotificationForDetails.id);
                  }
                }}
                style={{ fontSize: 12 }}
              >
                {selectedNotificationForDetails.is_read ? 'Mark as Unread' : 'Mark as Read'}
              </button>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {selectedNotificationForDetails?.action_url && (
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => {
                    if (selectedNotificationForDetails) {
                      handleNavigateItem(selectedNotificationForDetails);
                      setIsDetailsOpen(false);
                    }
                  }}
                  style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span>Open Destination</span>
                  <ExternalLink size={13} />
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailsOpen(false)}
                style={{ fontSize: 12 }}
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        {selectedNotificationForDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header info */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                {renderTypeBadge(selectedNotificationForDetails.type)}
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  ID: {selectedNotificationForDetails.id}
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                {selectedNotificationForDetails.title}
              </h3>
              <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                {selectedNotificationForDetails.message}
              </p>
            </div>

            {/* Metadata Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Recipient Role</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', margin: '4px 0 0', textTransform: 'capitalize' }}>
                  {selectedNotificationForDetails.recipient_role || 'All Admins'}
                </p>
              </div>

              <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Read Status</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: selectedNotificationForDetails.is_read ? '#16a34a' : '#dc2626', margin: '4px 0 0' }}>
                  {selectedNotificationForDetails.is_read ? 'READ' : 'UNREAD'}
                </p>
              </div>

              <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Related Module</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', margin: '4px 0 0', textTransform: 'capitalize' }}>
                  {selectedNotificationForDetails.related_module ? selectedNotificationForDetails.related_module.replace('_', ' ') : 'None'}
                </p>
              </div>

              <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Created Date</span>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-main)', margin: '4px 0 0' }}>
                  {notificationService.formatFullDate(selectedNotificationForDetails.created_at)}
                </p>
              </div>
            </div>

            {/* Target Navigation Destination */}
            {selectedNotificationForDetails.action_url && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 14, borderRadius: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>
                  Destination Route
                </div>
                <code style={{ fontSize: 12, color: '#14532d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>
                  {selectedNotificationForDetails.action_url}
                </code>
              </div>
            )}

            {/* Metadata JSON display if available */}
            {selectedNotificationForDetails.metadata && Object.keys(selectedNotificationForDetails.metadata).length > 0 && (
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  Event Payload Metadata
                </span>
                <pre
                  style={{
                    background: '#0c0e12',
                    color: '#e2e8f0',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontFamily: 'var(--font-mono, monospace)',
                    overflowX: 'auto',
                    margin: 0
                  }}
                >
                  {JSON.stringify(selectedNotificationForDetails.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </ShadcnSheet>

      {/* 7. Edit Notification Modal */}
      {isEditOpen && selectedNotificationForEdit && (
        <div 
          className="modal-overlay" 
          onClick={() => !isSubmittingEdit && setIsEditOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, width: '100%', background: '#ffffff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
          >
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                Edit Notification
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Notification Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Message Content
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={editForm.message}
                    onChange={(e) => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Category / Type
                    </label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                      style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="auction">Auction</option>
                      <option value="bidder">Bidder</option>
                      <option value="clerking">Clerking</option>
                      <option value="settlement">Settlement</option>
                      <option value="system">System</option>
                      <option value="security">Security</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Recipient Scope
                    </label>
                    <select
                      value={editForm.recipient_role}
                      onChange={(e) => setEditForm(prev => ({ ...prev, recipient_role: e.target.value }))}
                      style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="admin">Administrators</option>
                      <option value="super_admin">Super Admin Only</option>
                      <option value="clerk">Clerking Staff</option>
                      <option value="all">All Saleroom Staff</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Create Notification Modal */}
      {isCreateOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => !isSubmittingCreate && setIsCreateOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540, width: '100%', background: '#ffffff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
          >
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                  Create Administrative Notification
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCreate}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saleroom Bidding Floor Alert"
                    value={createForm.title}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Message Content *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe the operational event or alert details..."
                    value={createForm.message}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, message: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Category / Type
                    </label>
                    <select
                      value={createForm.type}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value }))}
                      style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="auction">Auction Event</option>
                      <option value="bidder">Bidder Notice</option>
                      <option value="clerking">Clerking Rostrum</option>
                      <option value="settlement">Settlement & Invoice</option>
                      <option value="system">System Alert</option>
                      <option value="security">Security Alert</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Recipient Scope
                    </label>
                    <select
                      value={createForm.recipient_role}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, recipient_role: e.target.value }))}
                      style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="admin">Administrators</option>
                      <option value="super_admin">Super Admin Only</option>
                      <option value="clerk">Clerking Staff</option>
                      <option value="all">All Saleroom Staff</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Related Module
                    </label>
                    <select
                      value={createForm.related_module}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        related_module: e.target.value,
                        action_url: `/${e.target.value}`
                      }))}
                      style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="auctions">Pre Auction / Catalog</option>
                      <option value="live_clerking">Auction Day / Live Clerking</option>
                      <option value="users">Customers / Bidders</option>
                      <option value="payments">Settlement & Invoices</option>
                      <option value="reports">Reports & Analytics</option>
                      <option value="logs">Activity & Audit Log</option>
                      <option value="settings">Settings & Portal Config</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Action URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="/auctions/auc-001"
                      value={createForm.action_url}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, action_url: e.target.value }))}
                      style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={isSubmittingCreate}
                >
                  {isSubmittingCreate ? 'Publishing...' : 'Publish Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Single Delete Confirmation Modal */}
      {selectedNotificationForDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(selectedNotificationForDelete)}
          onClose={() => setSelectedNotificationForDelete(null)}
          onConfirm={handleDeleteSingle}
          title="Delete Notification"
          entityName={selectedNotificationForDelete.title}
          entitySubtitle={`ID: ${selectedNotificationForDelete.id} | Category: ${selectedNotificationForDelete.type}`}
          warningMessage="Are you sure you want to delete this notification record? It will be permanently removed from Supabase."
          isLoading={isDeletingSubmitting}
        />
      )}

      {/* 10. Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <DeleteConfirmModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDelete}
          title="Delete Selected Notifications"
          entityName={`${selectedIds.length} Selected Notifications`}
          warningMessage="Are you sure you want to permanently delete all selected notification records from Supabase?"
          isLoading={isDeletingSubmitting}
          confirmButtonText={`Delete ${selectedIds.length} Records`}
        />
      )}
    </div>
  );
};
