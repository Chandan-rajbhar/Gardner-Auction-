import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './EmailListView.css';
import {
  Mail,
  Users,
  CheckCircle2,
  TrendingUp,
  UserX,
  Search,
  Download,
  Send,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  Eye,
  Edit2,
  Calendar,
  History,
  Inbox,
  UserCheck,
  Save,
  X
} from 'lucide-react';
import { emailListService } from '../../services/emailListService';
import { EmailSubscriber, EmailCampaign, EmailListKPIs } from '../../types/emailList';
import { useToast } from '../../context/ToastContext';
import { TableRowActionMenu, TableActionItem } from '../Common/TableRowActionMenu';
import { ShadcnPagination } from '../ui/ShadcnPagination';
import { ShadcnSheet } from '../ui/ShadcnSheet';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import { ModernCheckbox } from '../ui/ModernCheckbox';
import { ShadcnSelect, ShadcnSelectOption } from '../ui/ShadcnSelect';
import { supabase } from '../../lib/supabase';

type ActiveTab = 'subscribers' | 'composer' | 'history';
type DateFilter = 'all' | '7d' | '30d' | '90d';
type StatusFilter = 'all' | 'active' | 'unsubscribed';

const DATE_FILTER_OPTIONS: ShadcnSelectOption[] = [
  { value: 'all', label: 'All Dates' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
];

const STATUS_FILTER_OPTIONS: ShadcnSelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Only' },
  { value: 'unsubscribed', label: 'Unsubscribed Only' }
];

export const EmailListView: React.FC = () => {
  const { showToast } = useToast();

  // State: Subscribers & Data
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [auctions, setAuctions] = useState<Array<{ id: string; title: string; code?: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // State: Tab & Filters
  const [activeTab, setActiveTab] = useState<ActiveTab>('subscribers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // State: Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // State: Modals & Detail Drawers
  const [selectedSubscriberForDetail, setSelectedSubscriberForDetail] = useState<EmailSubscriber | null>(null);
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<EmailCampaign | null>(null);

  // Delete modal state (supports subscriber single/bulk & campaign deletion)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'subscriber' | 'bulk_subscriber' | 'campaign';
    targetId?: string;
    targetName?: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: 'subscriber',
    isLoading: false
  });

  // Edit Campaign State
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [editCampaignName, setEditCampaignName] = useState<string>('');
  const [editCampaignSubject, setEditCampaignSubject] = useState<string>('');
  const [editCampaignMessage, setEditCampaignMessage] = useState<string>('');
  const [editCampaignAuctionId, setEditCampaignAuctionId] = useState<string>('');
  const [editCampaignCatalogUrl, setEditCampaignCatalogUrl] = useState<string>('');
  const [isSavingEditCampaign, setIsSavingEditCampaign] = useState<boolean>(false);

  // State: Email Composer
  const [composerRecipientMode, setComposerRecipientMode] = useState<'all' | 'selected' | 'individual'>('all');
  const [composerTargetEmail, setComposerTargetEmail] = useState<string>('');
  const [composerCampaignName, setComposerCampaignName] = useState<string>('');
  const [composerSubject, setComposerSubject] = useState<string>('');
  const [composerMessage, setComposerMessage] = useState<string>(
    'Dear Collector,\n\nWe are pleased to present our latest catalog release featuring premier rare coins, estate precious metals, and curated historical artifacts.\n\nOnline absentee pre-bidding is now officially open.'
  );
  const [composerSelectedAuctionId, setComposerSelectedAuctionId] = useState<string>('');
  const [composerCatalogUrl, setComposerCatalogUrl] = useState<string>('');
  const [isSendingCampaign, setIsSendingCampaign] = useState<boolean>(false);

  // 1. Fetch subscribers from Supabase
  const loadSubscribers = useCallback(async () => {
    try {
      const data = await emailListService.fetchSubscribers();
      setSubscribers(data);
    } catch (err) {
      console.error('[EmailListView] Error loading subscribers:', err);
      showToast('error', 'Error', 'Failed to fetch subscribers from Supabase.');
    }
  }, [showToast]);

  // 2. Fetch campaign history
  const loadCampaigns = useCallback(async () => {
    try {
      const data = await emailListService.fetchCampaignHistory();
      setCampaigns(data);
    } catch (err) {
      console.error('[EmailListView] Error loading campaign history:', err);
    }
  }, []);

  // 3. Fetch active auctions for catalog linking
  const loadAuctions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('auctions')
        .select('id, name, title, code')
        .order('start_date', { ascending: false });

      if (data && data.length > 0) {
        setAuctions(data.map((a: any) => ({
          id: a.id,
          title: a.title || a.name || a.code || 'Upcoming Auction',
          code: a.code
        })));
      }
    } catch (err) {
      console.warn('[EmailListView] Error loading auctions for dropdown:', err);
    }
  }, []);

  // Initial load & real-time synchronization
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadSubscribers(), loadCampaigns(), loadAuctions()]);
      if (isMounted) setIsLoading(false);
    };

    init();

    // Subscribe to real-time additions/removals on email-list
    const unsubscribe = emailListService.subscribeToEmailList(() => {
      loadSubscribers();
      loadCampaigns();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadSubscribers, loadCampaigns, loadAuctions]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadSubscribers(), loadCampaigns()]);
    setIsRefreshing(false);
    showToast('success', 'Synchronized', 'Email list records refreshed from Supabase.');
  };

  // Live KPIs calculated dynamically from Supabase subscribers
  const kpis: EmailListKPIs = useMemo(() => {
    return emailListService.calculateKPIs(subscribers);
  }, [subscribers]);

  // Filter & Search subscribers
  const filteredSubscribers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const filterMsMap: Record<DateFilter, number> = {
      all: 0,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    const maxAgeMs = filterMsMap[dateFilter];

    return subscribers.filter((sub) => {
      // Search match
      if (query) {
        const emailMatch = sub.email.toLowerCase().includes(query);
        const idMatch = sub.id.toLowerCase().includes(query);
        const userIdMatch = sub.user_id ? sub.user_id.toLowerCase().includes(query) : false;
        if (!emailMatch && !idMatch && !userIdMatch) return false;
      }

      // Date match
      if (maxAgeMs > 0 && sub.created_at) {
        const createdMs = new Date(sub.created_at).getTime();
        if (!isNaN(createdMs) && now - createdMs > maxAgeMs) {
          return false;
        }
      }

      // Status match
      if (statusFilter !== 'all') {
        const status = sub.status || 'active';
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [subscribers, searchQuery, dateFilter, statusFilter]);

  // Pagination slicing
  const paginatedSubscribers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubscribers.slice(start, start + pageSize);
  }, [filteredSubscribers, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, statusFilter, pageSize]);

  // Selection handlers
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSubscribers.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const isAllSelected = filteredSubscribers.length > 0 && selectedIds.length === filteredSubscribers.length;

  // Single Delete subscriber prompt
  const promptDeleteSubscriber = (sub: EmailSubscriber) => {
    setDeleteModalState({
      isOpen: true,
      type: 'subscriber',
      targetId: sub.id,
      targetName: sub.email,
      isLoading: false
    });
  };

  // Bulk Delete subscriber prompt
  const promptDeleteBulkSubscribers = () => {
    if (selectedIds.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      type: 'bulk_subscriber',
      isLoading: false
    });
  };

  // Delete Campaign prompt
  const promptDeleteCampaign = (cmp: EmailCampaign) => {
    setDeleteModalState({
      isOpen: true,
      type: 'campaign',
      targetId: cmp.id,
      targetName: cmp.name,
      isLoading: false
    });
  };

  // Execute deletion (subscriber single, subscriber bulk, or campaign)
  const handleConfirmDelete = async () => {
    setDeleteModalState((prev) => ({ ...prev, isLoading: true }));

    if (deleteModalState.type === 'bulk_subscriber') {
      const res = await emailListService.bulkDeleteSubscribers(selectedIds);
      if (res.success) {
        showToast('success', 'Deleted', `Successfully removed ${res.count} subscribers from Supabase.`);
        setSelectedIds([]);
        loadSubscribers();
      } else {
        showToast('error', 'Error', res.error || 'Failed to delete selected subscribers.');
      }
    } else if (deleteModalState.type === 'subscriber' && deleteModalState.targetId) {
      const res = await emailListService.deleteSubscriber(deleteModalState.targetId, deleteModalState.targetName);
      if (res.success) {
        showToast('success', 'Deleted', `Subscriber "${deleteModalState.targetName}" removed from Supabase.`);
        setSelectedIds((prev) => prev.filter((id) => id !== deleteModalState.targetId));
        loadSubscribers();
      } else {
        showToast('error', 'Error', res.error || 'Failed to delete subscriber.');
      }
    } else if (deleteModalState.type === 'campaign' && deleteModalState.targetId) {
      const res = await emailListService.deleteCampaign(deleteModalState.targetId);
      if (res.success) {
        showToast('success', 'Campaign Deleted', `Campaign "${deleteModalState.targetName}" permanently removed from Supabase.`);
        loadCampaigns();
      } else {
        showToast('error', 'Error', res.error || 'Failed to delete campaign.');
      }
    }

    setDeleteModalState({ isOpen: false, type: 'subscriber', isLoading: false });
  };

  // Open Edit Campaign Drawer
  const handleOpenEditCampaign = (cmp: EmailCampaign) => {
    setEditingCampaign(cmp);
    setEditCampaignName(cmp.name);
    setEditCampaignSubject(cmp.subject);
    setEditCampaignMessage(cmp.message);
    setEditCampaignAuctionId(cmp.auction_id || '');
    setEditCampaignCatalogUrl(cmp.catalog_url || '');
  };

  // Save Edit Campaign changes to Supabase
  const handleSaveEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    if (!editCampaignSubject.trim()) {
      showToast('error', 'Validation Error', 'Campaign subject cannot be empty.');
      return;
    }

    setIsSavingEditCampaign(true);

    const selectedAuctionObj = auctions.find((a) => a.id === editCampaignAuctionId);

    const res = await emailListService.updateCampaign(editingCampaign.id, {
      name: editCampaignName.trim() || undefined,
      subject: editCampaignSubject.trim(),
      message: editCampaignMessage.trim(),
      auctionId: editCampaignAuctionId || null,
      auctionTitle: selectedAuctionObj?.title || null,
      catalogUrl: editCampaignCatalogUrl.trim() || null
    });

    setIsSavingEditCampaign(false);

    if (res.success) {
      showToast('success', 'Campaign Updated', 'Campaign details updated successfully in Supabase.');
      setEditingCampaign(null);
      loadCampaigns();
    } else {
      showToast('error', 'Update Error', res.error || 'Failed to update campaign in Supabase.');
    }
  };

  // Copy Email to clipboard
  const handleCopyEmail = (email: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(email);
      showToast('info', 'Copied to Clipboard', email);
    }
  };

  // Export subscribers to CSV
  const handleExportCSV = (exportSelectedOnly = false) => {
    const listToExport = exportSelectedOnly
      ? subscribers.filter((s) => selectedIds.includes(s.id))
      : filteredSubscribers;

    if (listToExport.length === 0) {
      showToast('warning', 'Notice', 'No subscribers available to export.');
      return;
    }

    const headers = ['Subscriber ID', 'Email Address', 'User ID', 'Status', 'Created At', 'Updated At'];
    const rows = listToExport.map((s) => [
      s.id,
      `"${s.email.replace(/"/g, '""')}"`,
      s.user_id || '',
      s.status || 'active',
      s.created_at,
      s.updated_at
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gardner_email_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', 'Export Complete', `Exported ${listToExport.length} subscribers to CSV.`);
  };

  // Switch to Composer with pre-selected recipients
  const handleComposeWithRecipients = (mode: 'all' | 'selected' | 'individual', individualEmail?: string) => {
    setComposerRecipientMode(mode);
    if (mode === 'individual' && individualEmail) {
      setComposerTargetEmail(individualEmail);
    }
    setActiveTab('composer');
  };

  // Update catalog URL when an auction is selected in Composer
  const handleAuctionSelect = (auctionId: string) => {
    setComposerSelectedAuctionId(auctionId);
    if (!auctionId) {
      setComposerCatalogUrl('');
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setComposerCatalogUrl(`${origin}/#catalog/${auctionId}`);
  };

  // Update catalog URL when an auction is selected in Edit Campaign
  const handleEditAuctionSelect = (auctionId: string) => {
    setEditCampaignAuctionId(auctionId);
    if (!auctionId) {
      setEditCampaignCatalogUrl('');
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setEditCampaignCatalogUrl(`${origin}/#catalog/${auctionId}`);
  };

  // Prepare auction options for ShadcnSelect
  const auctionSelectOptions: ShadcnSelectOption[] = useMemo(() => {
    return [
      { value: '', label: '— Select an auction to feature —' },
      ...auctions.map((auc) => ({
        value: auc.id,
        label: `${auc.title}${auc.code ? ` (${auc.code})` : ''}`
      }))
    ];
  }, [auctions]);

  // Dispatch Email Campaign
  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetRecipients: string[] = [];

    if (composerRecipientMode === 'all') {
      targetRecipients = subscribers.map((s) => s.email);
    } else if (composerRecipientMode === 'selected') {
      targetRecipients = subscribers.filter((s) => selectedIds.includes(s.id)).map((s) => s.email);
    } else if (composerRecipientMode === 'individual') {
      if (composerTargetEmail.trim()) {
        targetRecipients = [composerTargetEmail.trim().toLowerCase()];
      }
    }

    if (targetRecipients.length === 0) {
      showToast('error', 'Validation Error', 'Please select at least one recipient for this email campaign.');
      return;
    }

    if (!composerSubject.trim()) {
      showToast('error', 'Validation Error', 'Please provide an email subject line.');
      return;
    }

    if (!composerMessage.trim()) {
      showToast('error', 'Validation Error', 'Please write a message for the email body.');
      return;
    }

    setIsSendingCampaign(true);

    const selectedAuctionObj = auctions.find((a) => a.id === composerSelectedAuctionId);

    const res = await emailListService.sendCampaign({
      name: composerCampaignName.trim() || undefined,
      subject: composerSubject.trim(),
      message: composerMessage.trim(),
      recipients: targetRecipients,
      auctionId: composerSelectedAuctionId || undefined,
      auctionTitle: selectedAuctionObj?.title || undefined,
      catalogUrl: composerCatalogUrl.trim() || undefined
    });

    setIsSendingCampaign(false);

    if (res.success) {
      showToast(
        'success',
        'Campaign Dispatched',
        `Email dispatched to ${targetRecipients.length} subscriber(s) successfully.`
      );
      loadCampaigns();
      setActiveTab('history');
    } else {
      showToast('error', 'Campaign Delivery Error', res.error || 'Failed to dispatch email campaign.');
    }
  };

  // Format readable dates
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="email-list-view">
      {/* 1. Header Bar */}
      <header className="elv-header">
        <div className="elv-header-left">
          <div className="elv-title-row">
            <div className="elv-title-icon-badge">
              <Mail size={20} />
            </div>
            <div>
              <h1 className="elv-title">Email List Management</h1>
              <p className="elv-subtitle">Subscribers directory, collector segmentation, and automated catalog campaign dispatch</p>
            </div>
          </div>
        </div>

        <div className="elv-header-actions">
          <button
            type="button"
            className="elv-btn elv-btn-outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh subscribers from Supabase"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync Supabase</span>
          </button>

          <button
            type="button"
            className="elv-btn elv-btn-outline"
            onClick={() => handleExportCSV(false)}
            title="Export full subscriber list to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="elv-btn elv-btn-gold"
            onClick={() => handleComposeWithRecipients('all')}
          >
            <Send size={14} />
            <span>Compose Email</span>
          </button>
        </div>
      </header>

      {/* 2. Top Navigation Tabs */}
      <nav className="elv-tabs-bar" aria-label="Email List Tabs">
        <button
          type="button"
          className={`elv-tab-btn ${activeTab === 'subscribers' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscribers')}
        >
          <Users size={16} />
          <span>Subscribers</span>
          <span className="elv-tab-badge">{subscribers.length}</span>
        </button>

        <button
          type="button"
          className={`elv-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>Campaign History</span>
          <span className="elv-tab-badge">{campaigns.length}</span>
        </button>

        <button
          type="button"
          className={`elv-tab-btn ${activeTab === 'composer' ? 'active' : ''}`}
          onClick={() => setActiveTab('composer')}
        >
          <Send size={16} />
          <span>Send Campaign</span>
        </button>
      </nav>

      {/* =========================================================================
          TAB 1: SUBSCRIBERS DIRECTORY & CONTROLS
          ========================================================================= */}
      {activeTab === 'subscribers' && (
        <>
          {/* KPI Statistics Cards */}
          <section className="elv-kpi-grid" aria-label="Subscribers Overview Statistics">
            <div className="elv-kpi-card">
              <div className="elv-kpi-info">
                <span className="elv-kpi-label">Total Subscribers</span>
                <span className="elv-kpi-value">{kpis.totalSubscribers}</span>
                <span className="elv-kpi-subtext">Verified email registry</span>
              </div>
              <div className="elv-kpi-icon-wrap navy">
                <Users size={22} />
              </div>
            </div>

            <div className="elv-kpi-card">
              <div className="elv-kpi-info">
                <span className="elv-kpi-label">Active Subscribers</span>
                <span className="elv-kpi-value">{kpis.activeSubscribers}</span>
                <span className="elv-kpi-subtext">Eligible for campaign delivery</span>
              </div>
              <div className="elv-kpi-icon-wrap green">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="elv-kpi-card">
              <div className="elv-kpi-info">
                <span className="elv-kpi-label">New Subscribers (30D)</span>
                <span className="elv-kpi-value">{kpis.newSubscribers30d}</span>
                <span className="elv-kpi-subtext">Recent website enrollments</span>
              </div>
              <div className="elv-kpi-icon-wrap gold">
                <TrendingUp size={22} />
              </div>
            </div>

            <div className="elv-kpi-card">
              <div className="elv-kpi-info">
                <span className="elv-kpi-label">Unsubscribed Users</span>
                <span className="elv-kpi-value">{kpis.unsubscribedCount}</span>
                <span className="elv-kpi-subtext">Zero-spam compliance</span>
              </div>
              <div className="elv-kpi-icon-wrap slate">
                <UserX size={22} />
              </div>
            </div>
          </section>

          {/* Search, Filter & Bulk Actions Bar */}
          <section className="elv-controls-container" aria-label="Subscriber Filters and Controls">
            <div className="elv-filter-row">
              <div className="elv-search-wrap">
                <Search size={16} className="elv-search-icon" />
                <input
                  type="text"
                  className="elv-search-input"
                  placeholder="Search by email address or subscriber UUID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Shadcn Select Dropdowns for Date and Status Filters */}
              <div className="elv-filter-group">
                <ShadcnSelect
                  value={dateFilter}
                  onChange={(val) => setDateFilter(val as DateFilter)}
                  options={DATE_FILTER_OPTIONS}
                  size="md"
                  ariaLabel="Filter by subscription date"
                  style={{ width: 170 }}
                />

                <ShadcnSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val as StatusFilter)}
                  options={STATUS_FILTER_OPTIONS}
                  size="md"
                  ariaLabel="Filter by subscriber status"
                  style={{ width: 170 }}
                />
              </div>
            </div>

            {/* Bulk Toolbar (Shows when 1 or more rows selected) */}
            {selectedIds.length > 0 && (
              <div className="elv-bulk-toolbar">
                <div className="elv-bulk-info">
                  <span className="elv-bulk-badge">{selectedIds.length}</span>
                  <span>subscribers selected</span>
                </div>

                <div className="elv-bulk-actions">
                  <button
                    type="button"
                    className="elv-btn elv-btn-gold"
                    onClick={() => handleComposeWithRecipients('selected')}
                  >
                    <Send size={13} />
                    <span>Send Email ({selectedIds.length})</span>
                  </button>

                  <button
                    type="button"
                    className="elv-btn elv-btn-outline"
                    onClick={() => handleExportCSV(true)}
                  >
                    <Download size={13} />
                    <span>Export Selected</span>
                  </button>

                  <button
                    type="button"
                    className="elv-btn elv-btn-danger"
                    onClick={promptDeleteBulkSubscribers}
                  >
                    <Trash2 size={13} />
                    <span>Delete Selected</span>
                  </button>

                  <button
                    type="button"
                    className="elv-btn elv-btn-outline"
                    onClick={() => setSelectedIds([])}
                  >
                    <span>Deselect All</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Subscribers Table Card */}
          <div className="elv-table-card">
            <div className="elv-table-responsive">
              <table className="elv-table">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <ModernCheckbox
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        size="sm"
                        aria-label="Select all subscribers on page"
                      />
                    </th>
                    <th>Email Address</th>
                    <th>Subscriber ID</th>
                    <th>Account Link</th>
                    <th>Subscribed Date</th>
                    <th>Updated At</th>
                    <th>Status</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                          <RefreshCw size={18} className="animate-spin" />
                          <span>Loading Supabase subscribers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="elv-empty-state">
                          <div className="elv-empty-icon">
                            <Inbox size={26} />
                          </div>
                          <h3 className="elv-empty-title">No Subscribers Found</h3>
                          <p className="elv-empty-desc">
                            {searchQuery
                              ? `No subscriber matches "${searchQuery}". Try adjusting your search query or filters.`
                              : 'No email subscribers currently registered in public.email-list.'}
                          </p>
                          {searchQuery && (
                            <button
                              type="button"
                              className="elv-btn elv-btn-outline"
                              onClick={() => {
                                setSearchQuery('');
                                setDateFilter('all');
                                setStatusFilter('all');
                              }}
                            >
                              Clear Search Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSubscribers.map((sub) => {
                      const isSelected = selectedIds.includes(sub.id);

                      const rowActions: TableActionItem[] = [
                        {
                          label: 'View Details',
                          icon: Eye,
                          onClick: () => setSelectedSubscriberForDetail(sub)
                        },
                        {
                          label: 'Copy Email',
                          icon: Copy,
                          onClick: () => handleCopyEmail(sub.email)
                        },
                        {
                          label: 'Send Email',
                          icon: Send,
                          onClick: () => handleComposeWithRecipients('individual', sub.email)
                        },
                        {
                          label: 'Delete Subscriber',
                          icon: Trash2,
                          destructive: true,
                          onClick: () => promptDeleteSubscriber(sub)
                        }
                      ];

                      return (
                        <tr key={sub.id} className={isSelected ? 'selected' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <ModernCheckbox
                              checked={isSelected}
                              onChange={(chk) => handleToggleSelectRow(sub.id, chk)}
                              size="sm"
                              aria-label={`Select ${sub.email}`}
                            />
                          </td>
                          <td>
                            <div className="elv-email-cell">
                              <Mail size={14} className="elv-email-icon" />
                              <span>{sub.email}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="elv-id-pill"
                              title="Click to copy subscriber UUID"
                              onClick={() => handleCopyEmail(sub.id)}
                            >
                              {sub.id.slice(0, 8)}...{sub.id.slice(-4)}
                            </span>
                          </td>
                          <td>
                            {sub.user_id ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 12,
                                  color: '#047857',
                                  fontWeight: 600
                                }}
                              >
                                <UserCheck size={13} />
                                <span>Registered User</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>Guest Enrollment</span>
                            )}
                          </td>
                          <td style={{ fontSize: 13, color: '#475569' }}>
                            {formatDateTime(sub.created_at)}
                          </td>
                          <td style={{ fontSize: 13, color: '#64748b' }}>
                            {formatDateTime(sub.updated_at)}
                          </td>
                          <td>
                            <span className={`elv-status-badge ${sub.status || 'active'}`}>
                              <span className="elv-status-dot" />
                              <span>{sub.status || 'Active'}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <TableRowActionMenu actions={rowActions} ariaLabel={`Actions for ${sub.email}`} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredSubscribers.length > 0 && (
              <div className="elv-table-footer">
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Showing{' '}
                  <strong style={{ color: '#0e121b' }}>
                    {Math.min((currentPage - 1) * pageSize + 1, filteredSubscribers.length)}–
                    {Math.min(currentPage * pageSize, filteredSubscribers.length)}
                  </strong>{' '}
                  of <strong style={{ color: '#0e121b' }}>{filteredSubscribers.length}</strong> subscribers
                </span>

                <ShadcnPagination
                  currentPage={currentPage}
                  totalItems={filteredSubscribers.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                  itemLabel="subscribers"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* =========================================================================
          TAB 2: CAMPAIGN HISTORY
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="elv-table-card">
          <div className="elv-table-responsive">
            <table className="elv-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Email Subject</th>
                  <th>Recipients</th>
                  <th>Delivered</th>
                  <th>Failed</th>
                  <th>Date Dispatched</th>
                  <th>Status</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="elv-empty-state">
                        <div className="elv-empty-icon">
                          <History size={26} />
                        </div>
                        <h3 className="elv-empty-title">No Email Campaigns Sent Yet</h3>
                        <p className="elv-empty-desc">
                          You have not dispatched any email campaigns to subscribers yet. Use the composer to launch your first auction catalog announcement.
                        </p>
                        <button
                          type="button"
                          className="elv-btn elv-btn-gold"
                          onClick={() => setActiveTab('composer')}
                        >
                          <Send size={14} />
                          <span>Compose First Campaign</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((cmp) => {
                    const cmpActions: TableActionItem[] = [
                      {
                        label: 'View Details',
                        icon: Eye,
                        onClick: () => setSelectedCampaignForDetail(cmp)
                      },
                      {
                        label: 'Edit Campaign',
                        icon: Edit2,
                        onClick: () => handleOpenEditCampaign(cmp)
                      },
                      {
                        label: 'Duplicate / Resend',
                        icon: RefreshCw,
                        onClick: () => {
                          setComposerCampaignName(`Copy of ${cmp.name}`);
                          setComposerSubject(cmp.subject);
                          setComposerMessage(cmp.message);
                          if (cmp.auction_id) setComposerSelectedAuctionId(cmp.auction_id);
                          if (cmp.catalog_url) setComposerCatalogUrl(cmp.catalog_url);
                          setActiveTab('composer');
                        }
                      },
                      {
                        label: 'Delete Campaign',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => promptDeleteCampaign(cmp)
                      }
                    ];

                    return (
                      <tr key={cmp.id}>
                        <td style={{ fontWeight: 600, color: '#0e121b' }}>
                          {cmp.name}
                        </td>
                        <td style={{ color: '#334155' }}>
                          {cmp.subject}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {cmp.recipient_count}
                        </td>
                        <td>
                          <span style={{ color: '#047857', fontWeight: 600 }}>
                            {cmp.successful_sends}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: cmp.failed_sends > 0 ? '#dc2626' : '#94a3b8', fontWeight: 600 }}>
                            {cmp.failed_sends}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, color: '#64748b' }}>
                          {formatDateTime(cmp.sent_at)}
                        </td>
                        <td>
                          <span className={`elv-status-badge ${cmp.status === 'sent' ? 'active' : cmp.status === 'failed' ? 'unsubscribed' : 'gold'}`}>
                            <span className="elv-status-dot" />
                            <span>{cmp.status.toUpperCase()}</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <TableRowActionMenu actions={cmpActions} ariaLabel={`Actions for campaign ${cmp.name}`} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DEDICATED EMAIL COMPOSER & PREVIEW
          ========================================================================= */}
      {activeTab === 'composer' && (
        <div className="elv-composer-card">
          {/* Left Side: Composer Form */}
          <form className="elv-composer-form" onSubmit={handleSendCampaign}>
            <div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, margin: '0 0 4px 0', color: '#0e121b' }}>
                Compose Auction Campaign
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Configure recipient targeting, subject lines, catalog links, and message dispatch.
              </p>
            </div>

            {/* Recipient Mode Selection */}
            <div className="elv-form-group">
              <label className="elv-form-label">
                <span>Target Recipients</span>
                <span className="elv-form-help">
                  {composerRecipientMode === 'all'
                    ? `${subscribers.length} total subscribers`
                    : composerRecipientMode === 'selected'
                    ? `${selectedIds.length} selected subscribers`
                    : 'Individual recipient'}
                </span>
              </label>

              <div className="elv-recipient-pills-row">
                <button
                  type="button"
                  className={`elv-recipient-radio-btn ${composerRecipientMode === 'all' ? 'active' : ''}`}
                  onClick={() => setComposerRecipientMode('all')}
                >
                  All Subscribers ({subscribers.length})
                </button>

                <button
                  type="button"
                  className={`elv-recipient-radio-btn ${composerRecipientMode === 'selected' ? 'active' : ''}`}
                  onClick={() => setComposerRecipientMode('selected')}
                  disabled={selectedIds.length === 0}
                  title={selectedIds.length === 0 ? 'Select subscribers in table first' : undefined}
                >
                  Selected ({selectedIds.length})
                </button>

                <button
                  type="button"
                  className={`elv-recipient-radio-btn ${composerRecipientMode === 'individual' ? 'active' : ''}`}
                  onClick={() => setComposerRecipientMode('individual')}
                >
                  Single Recipient
                </button>
              </div>

              {composerRecipientMode === 'individual' && (
                <input
                  type="email"
                  className="elv-form-input"
                  style={{ marginTop: 6 }}
                  placeholder="Enter individual subscriber email address..."
                  value={composerTargetEmail}
                  onChange={(e) => setComposerTargetEmail(e.target.value)}
                  required
                />
              )}

              {composerRecipientMode === 'selected' && selectedIds.length > 0 && (
                <div className="elv-recipient-list-box">
                  {subscribers
                    .filter((s) => selectedIds.includes(s.id))
                    .map((s) => (
                      <span key={s.id} className="elv-rec-badge">
                        {s.email}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Campaign Name & Subject */}
            <div className="elv-form-group">
              <label className="elv-form-label">Internal Campaign Title</label>
              <input
                type="text"
                className="elv-form-input"
                placeholder="e.g. Fall Keystone Numismatics Catalog Launch"
                value={composerCampaignName}
                onChange={(e) => setComposerCampaignName(e.target.value)}
              />
            </div>

            <div className="elv-form-group">
              <label className="elv-form-label">Email Subject Line *</label>
              <input
                type="text"
                className="elv-form-input"
                placeholder="e.g. Official Catalog Open: Gardner Auction Keystone Gold & Rare Coins"
                value={composerSubject}
                onChange={(e) => setComposerSubject(e.target.value)}
                required
              />
            </div>

            {/* Optional Auction Selection via ShadcnSelect (Commented out as requested) */}
            {/*
            <div className="elv-form-group">
              <label className="elv-form-label">
                <span>Featured Auction (Optional)</span>
                <span className="elv-form-help">Auto-fills catalog button link</span>
              </label>
              <ShadcnSelect
                value={composerSelectedAuctionId}
                onChange={handleAuctionSelect}
                options={auctionSelectOptions}
                size="md"
                placeholder="— Select an auction to feature —"
                fullWidth
              />
            </div>
            */}

            {/* Optional Catalog URL */}
            <div className="elv-form-group">
              <label className="elv-form-label">Direct Catalog URL (Optional)</label>
              <input
                type="url"
                className="elv-form-input"
                placeholder="https://... or auto-generated above"
                value={composerCatalogUrl}
                onChange={(e) => setComposerCatalogUrl(e.target.value)}
              />
            </div>

            {/* Email Message Body */}
            <div className="elv-form-group">
              <label className="elv-form-label">Message Content *</label>
              <textarea
                className="elv-form-textarea"
                rows={6}
                value={composerMessage}
                onChange={(e) => setComposerMessage(e.target.value)}
                required
              />
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button
                type="submit"
                className="elv-btn elv-btn-gold"
                style={{ padding: '12px 24px', fontSize: 14 }}
                disabled={isSendingCampaign}
              >
                <Send size={15} />
                <span>{isSendingCampaign ? 'Dispatching Campaign...' : 'Send Campaign Now'}</span>
              </button>

              <button
                type="button"
                className="elv-btn elv-btn-outline"
                onClick={() => setActiveTab('subscribers')}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Right Side: Live HTML Email Preview */}
          <div className="elv-preview-panel">
            <span className="elv-preview-title">
              <Eye size={16} />
              <span>Recipient Inbox Preview</span>
            </span>

            <div className="elv-preview-browser">
              <div className="elv-preview-bar">
                <div className="elv-preview-dots">
                  <span className="elv-preview-dot" />
                  <span className="elv-preview-dot" />
                  <span className="elv-preview-dot" />
                </div>
                <span>Gardner Auction Collector Dispatch</span>
              </div>

              <div className="elv-preview-content">
                <div style={{ textAlign: 'center', borderBottom: '2px solid #c5a04a', paddingBottom: 14, marginBottom: 18 }}>
                  <h3 style={{ margin: 0, fontFamily: 'Cinzel, serif', fontSize: 18, color: '#0e121b' }}>
                    GARDNER AUCTION
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#8c732a', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    Appraisers &bull; Auctioneers &bull; Est. 1960
                  </p>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: '#0e121b', marginBottom: 12 }}>
                  Subject: {composerSubject || 'Auction Announcement & Catalog Release'}
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-wrap', marginBottom: 20 }}>
                  {composerMessage}
                </div>

                {composerCatalogUrl && (
                  <div style={{ textAlign: 'center', margin: '22px 0' }}>
                    <a
                      href={composerCatalogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#c5a04a',
                        color: '#0d1424',
                        padding: '10px 22px',
                        textDecoration: 'none',
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'inline-block'
                      }}
                    >
                      {composerSelectedAuctionId
                        ? `Explore ${auctions.find((a) => a.id === composerSelectedAuctionId)?.title || 'Auction'} Catalog →`
                        : 'View Official Auction Catalog →'}
                    </a>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 24, fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                  <p style={{ margin: 0 }}>You are receiving this official communication as an enrolled collector in the Gardner Auction private notification registry.</p>
                  <p style={{ margin: '4px 0 0' }}>Fiduciary privacy guaranteed &bull; One-Click Unsubscribe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS & DRAWERS
          ========================================================================= */}

      {/* 1. Subscriber Detail Drawer */}
      <ShadcnSheet
        isOpen={Boolean(selectedSubscriberForDetail)}
        onClose={() => setSelectedSubscriberForDetail(null)}
        title="Subscriber Dossier"
        description="Detailed record from public.email-list in Supabase"
        size="md"
      >
        {selectedSubscriberForDetail && (
          <div className="elv-detail-body">
            <div className="elv-detail-section">
              <span className="elv-detail-label">Email Address</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="elv-detail-val" style={{ fontSize: 16, fontWeight: 700 }}>
                  {selectedSubscriberForDetail.email}
                </span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  onClick={() => handleCopyEmail(selectedSubscriberForDetail.email)}
                  title="Copy email"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Database Record ID (UUID)</span>
              <span className="elv-detail-val" style={{ fontFamily: 'monospace' }}>
                {selectedSubscriberForDetail.id}
              </span>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Linked User Account</span>
              {selectedSubscriberForDetail.user_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857', fontWeight: 600 }}>
                  <CheckCircle2 size={15} />
                  <span>Verified User Account: {selectedSubscriberForDetail.user_id}</span>
                </div>
              ) : (
                <span className="elv-detail-val" style={{ color: '#64748b' }}>
                  Public Website Guest Enrollment (No User ID bound)
                </span>
              )}
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Subscription Status</span>
              <div>
                <span className={`elv-status-badge ${selectedSubscriberForDetail.status || 'active'}`}>
                  <span className="elv-status-dot" />
                  <span>{selectedSubscriberForDetail.status || 'Active'}</span>
                </span>
              </div>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Subscription Date</span>
              <span className="elv-detail-val">{formatDateTime(selectedSubscriberForDetail.created_at)}</span>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Last Record Update</span>
              <span className="elv-detail-val">{formatDateTime(selectedSubscriberForDetail.updated_at)}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                className="elv-btn elv-btn-gold"
                onClick={() => {
                  const target = selectedSubscriberForDetail.email;
                  setSelectedSubscriberForDetail(null);
                  handleComposeWithRecipients('individual', target);
                }}
              >
                <Send size={14} />
                <span>Send Direct Email</span>
              </button>

              <button
                type="button"
                className="elv-btn elv-btn-danger"
                onClick={() => {
                  const target = selectedSubscriberForDetail;
                  setSelectedSubscriberForDetail(null);
                  promptDeleteSubscriber(target);
                }}
              >
                <Trash2 size={14} />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        )}
      </ShadcnSheet>

      {/* 2. Campaign Detail Drawer */}
      <ShadcnSheet
        isOpen={Boolean(selectedCampaignForDetail)}
        onClose={() => setSelectedCampaignForDetail(null)}
        title="Email Campaign Report"
        description="Delivery telemetry and message audit from Supabase"
        size="md"
      >
        {selectedCampaignForDetail && (
          <div className="elv-detail-body">
            <div className="elv-detail-section">
              <span className="elv-detail-label">Campaign Name</span>
              <span className="elv-detail-val" style={{ fontSize: 16, fontWeight: 700 }}>
                {selectedCampaignForDetail.name}
              </span>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Subject Line</span>
              <span className="elv-detail-val">{selectedCampaignForDetail.subject}</span>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Delivery Results</span>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ fontSize: 14, color: '#047857', fontWeight: 700 }}>
                  ✓ {selectedCampaignForDetail.successful_sends} Delivered
                </span>
                {selectedCampaignForDetail.failed_sends > 0 && (
                  <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 700 }}>
                    ✗ {selectedCampaignForDetail.failed_sends} Failed
                  </span>
                )}
                <span style={{ fontSize: 14, color: '#64748b' }}>
                  ({selectedCampaignForDetail.recipient_count} Total)
                </span>
              </div>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Dispatched Date</span>
              <span className="elv-detail-val">{formatDateTime(selectedCampaignForDetail.sent_at)}</span>
            </div>

            <div className="elv-detail-section">
              <span className="elv-detail-label">Message Preview</span>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedCampaignForDetail.message}
              </div>
            </div>

            {selectedCampaignForDetail.catalog_url && (
              <div className="elv-detail-section">
                <span className="elv-detail-label">Featured Catalog Link</span>
                <a
                  href={selectedCampaignForDetail.catalog_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#8c732a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <span>{selectedCampaignForDetail.catalog_url}</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                className="elv-btn elv-btn-gold"
                onClick={() => {
                  const cmp = selectedCampaignForDetail;
                  setSelectedCampaignForDetail(null);
                  handleOpenEditCampaign(cmp);
                }}
              >
                <Edit2 size={14} />
                <span>Edit Campaign</span>
              </button>

              <button
                type="button"
                className="elv-btn elv-btn-danger"
                onClick={() => {
                  const cmp = selectedCampaignForDetail;
                  setSelectedCampaignForDetail(null);
                  promptDeleteCampaign(cmp);
                }}
              >
                <Trash2 size={14} />
                <span>Delete Campaign</span>
              </button>
            </div>
          </div>
        )}
      </ShadcnSheet>

      {/* 3. Edit Campaign Drawer / Sheet */}
      <ShadcnSheet
        isOpen={Boolean(editingCampaign)}
        onClose={() => setEditingCampaign(null)}
        title="Edit Email Campaign"
        description="Update campaign parameters and metadata in Supabase"
        size="md"
      >
        {editingCampaign && (
          <form onSubmit={handleSaveEditCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="elv-form-group">
              <label className="elv-form-label">Campaign Title *</label>
              <input
                type="text"
                className="elv-form-input"
                value={editCampaignName}
                onChange={(e) => setEditCampaignName(e.target.value)}
                required
              />
            </div>

            <div className="elv-form-group">
              <label className="elv-form-label">Subject Line *</label>
              <input
                type="text"
                className="elv-form-input"
                value={editCampaignSubject}
                onChange={(e) => setEditCampaignSubject(e.target.value)}
                required
              />
            </div>

            <div className="elv-form-group">
              <label className="elv-form-label">Featured Auction</label>
              <ShadcnSelect
                value={editCampaignAuctionId}
                onChange={handleEditAuctionSelect}
                options={auctionSelectOptions}
                size="md"
                placeholder="— Select an auction to feature —"
                fullWidth
              />
            </div>

            <div className="elv-form-group">
              <label className="elv-form-label">Direct Catalog URL</label>
              <input
                type="url"
                className="elv-form-input"
                value={editCampaignCatalogUrl}
                onChange={(e) => setEditCampaignCatalogUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="elv-form-group">
              <label className="elv-form-label">Message Content *</label>
              <textarea
                className="elv-form-textarea"
                rows={6}
                value={editCampaignMessage}
                onChange={(e) => setEditCampaignMessage(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="submit"
                className="elv-btn elv-btn-gold"
                disabled={isSavingEditCampaign}
                style={{ padding: '10px 20px' }}
              >
                <Save size={14} />
                <span>{isSavingEditCampaign ? 'Saving to Supabase...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                className="elv-btn elv-btn-outline"
                onClick={() => setEditingCampaign(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ShadcnSheet>

      {/* 4. Delete Confirmation Modal (Handles subscriber, bulk subscribers, or campaign) */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }))}
        onConfirm={handleConfirmDelete}
        title={
          deleteModalState.type === 'campaign'
            ? 'Delete Email Campaign'
            : deleteModalState.type === 'bulk_subscriber'
            ? 'Delete Selected Subscribers'
            : 'Delete Email Subscriber'
        }
        entityName={
          deleteModalState.type === 'campaign'
            ? deleteModalState.targetName || 'Campaign'
            : deleteModalState.type === 'bulk_subscriber'
            ? `${selectedIds.length} Selected Subscribers`
            : deleteModalState.targetName || 'Subscriber'
        }
        entitySubtitle={
          deleteModalState.type === 'campaign'
            ? `Record ID: ${deleteModalState.targetId || ''}`
            : deleteModalState.type === 'bulk_subscriber'
            ? 'Bulk removal from Supabase email-list table'
            : `ID: ${deleteModalState.targetId || ''}`
        }
        warningMessage={
          deleteModalState.type === 'campaign'
            ? `Are you sure you want to permanently delete this campaign record from Supabase? This action cannot be undone.`
            : deleteModalState.type === 'bulk_subscriber'
            ? `Are you sure you want to permanently remove ${selectedIds.length} subscribers from the Supabase email-list database? This action cannot be undone.`
            : `Are you sure you want to permanently delete "${deleteModalState.targetName}" from the Supabase email-list database?`
        }
        isLoading={deleteModalState.isLoading}
        confirmButtonText={
          deleteModalState.type === 'campaign'
            ? 'Delete Campaign'
            : deleteModalState.type === 'bulk_subscriber'
            ? `Delete ${selectedIds.length} Subscribers`
            : 'Delete Subscriber'
        }
      />
    </div>
  );
};
