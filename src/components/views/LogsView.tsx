import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ActivityLog, NavigationSection } from '../../types';
import { 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  MoreVertical, 
  Eye, 
  Copy, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Clock,
  Filter,
  FileText,
  User,
  Gavel,
  Calendar,
  Layers,
  Receipt
} from 'lucide-react';
import './LogsView.css';
import { activityLogService, AuditLogRecord } from '../../services/activityLogService';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { ShadcnSheet } from '../ui/ShadcnSheet';
import { ShadcnPagination } from '../ui/ShadcnPagination';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import { useToast } from '../../context/ToastContext';

interface LogsViewProps {
  logs?: ActivityLog[];
  onClearLogs?: () => void;
  onNavigateSection?: (section: NavigationSection) => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ 
  logs: _fallbackLogs, 
  onNavigateSection 
}) => {
  const { showToast } = useToast();

  // Primary Data State
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination (20 records per page default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Drawer & Modal States
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLogRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const [selectedLogForDelete, setSelectedLogForDelete] = useState<AuditLogRecord | null>(null);
  const [isDeletingSubmitting, setIsDeletingSubmitting] = useState<boolean>(false);

  // Load audit logs dynamically from Supabase
  const loadLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const records = await activityLogService.getAuditLogs();
      setLogs(records);
    } catch (err) {
      console.error('[LogsView] Error fetching audit logs from Supabase:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve audit log records from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Subscribe to real-time database changes
  useEffect(() => {
    const unsubscribe = activityLogService.subscribeToActivityLogs(() => {
      loadLogs(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadLogs]);

  // Filter and search logic
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        l.event_action.toLowerCase().includes(term) ||
        l.operator_service.toLowerCase().includes(term) ||
        l.audit_details.toLowerCase().includes(term) ||
        l.category.toLowerCase().includes(term) ||
        l.status.toLowerCase().includes(term) ||
        (l.related_record_id && l.related_record_id.toLowerCase().includes(term));

      const matchesCat = categoryFilter === 'all' || l.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || l.status.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [logs, searchTerm, categoryFilter, statusFilter]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  // Paginated records slice
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Copy details action
  const handleCopyDetails = (log: AuditLogRecord) => {
    const textToCopy = `[${log.timestamp}] [${log.category}] ${log.operator_service}: ${log.event_action}\nDetails: ${log.audit_details}\nStatus: ${log.status} (ID: ${log.id})`;
    navigator.clipboard.writeText(textToCopy);
    showToast('success', 'Details Copied', 'Audit record details copied to clipboard.');
  };

  // Open Details Drawer
  const handleOpenDetails = (log: AuditLogRecord) => {
    setSelectedLogForDetails(log);
    setIsDetailsOpen(true);
  };

  // Navigate to related record
  const handleNavigateRelated = (log: AuditLogRecord) => {
    if (!onNavigateSection) {
      showToast('info', 'Navigation', 'Navigation handler not available.');
      return;
    }

    const recType = log.related_record_type?.toLowerCase() || '';
    const details = (log.audit_details || '').toLowerCase();
    const action = (log.event_action || '').toLowerCase();

    if (recType === 'lot' || details.includes('lot #') || action.includes('lot #')) {
      onNavigateSection('lots');
      showToast('info', 'Navigated to Lots', `Opened Catalog Lots module for ${log.event_action}`);
    } else if (recType === 'bidder' || details.includes('paddle #') || action.includes('paddle #')) {
      onNavigateSection('users');
      showToast('info', 'Navigated to Customers', `Opened Customer registry for ${log.operator_service}`);
    } else if (recType === 'invoice' || recType === 'settlement' || details.includes('invoice') || action.includes('payment')) {
      onNavigateSection('payments');
      showToast('info', 'Navigated to Settlements', `Opened Settlements module for ${log.event_action}`);
    } else if (recType === 'auction' || action.includes('auction')) {
      onNavigateSection('auctions');
      showToast('info', 'Navigated to Auctions', `Opened Auctions console`);
    } else {
      showToast('info', 'System Record', 'This event is a general system record without an individual item page.');
    }
  };

  // Confirm and Execute Deletion
  const handleConfirmDelete = async () => {
    if (!selectedLogForDelete) return;

    setIsDeletingSubmitting(true);
    try {
      const res = await activityLogService.deleteLog(selectedLogForDelete.id);
      if (res.success) {
        showToast('success', 'Record Removed', 'Audit record removed per administrator action.');
        setLogs(prev => prev.filter(l => l.id !== selectedLogForDelete.id));
        setSelectedLogForDelete(null);
      } else {
        showToast('error', 'Deletion Prevented', res.error || 'Audit record deletion restricted by system policy.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Could not delete audit record.');
    } finally {
      setIsDeletingSubmitting(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
          <CheckCircle2 size={11} /> SUCCESS
        </span>
      );
    }
    if (s === 'WARNING') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
          <AlertTriangle size={11} /> WARNING
        </span>
      );
    }
    if (s === 'ALERT' || s === 'ERROR') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
          <AlertCircle size={11} /> ALERT
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
        <Info size={11} /> INFO
      </span>
    );
  };

  // Category Badge Helper
  const renderCategoryBadge = (category: string) => {
    return (
      <span 
        className="badge badge-gold" 
        style={{ 
          fontSize: 10.5, 
          padding: '2px 7px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.04em',
          fontWeight: 600
        }}
      >
        {category}
      </span>
    );
  };

  return (
    <div className="audit-view-root">
      {/* Header */}
      <div className="audit-header-container">
        <div className="audit-title-block">
          <div className="audit-title-heading-wrap">
            <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
              Administrative Audit & Activity Log
            </h2>
            {refreshing && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold-bright)', background: 'rgba(203, 161, 53, 0.08)', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>
                <RefreshCw size={11} className="spin-animation" /> Live updating...
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
            Immutable administrative event timeline, clerking records, and HiBid API synchronization events
          </p>
        </div>

        <div className="audit-header-actions">
          {/* Refresh Action */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadLogs(false)}
            disabled={loading || refreshing}
            title="Refresh logs from Supabase"
            style={{ height: 35, padding: '0 11px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          {/* System Audit Integrity Badge */}
          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6, 
              fontSize: 12, 
              color: '#15803d', 
              background: '#f0fdf4', 
              padding: '6px 12px', 
              borderRadius: 6, 
              border: '1px solid #dcfce7',
              fontWeight: 600
            }}
          >
            <ShieldCheck size={14} style={{ color: '#16a34a' }} />
            <span>System Audit Integrity: <strong>VERIFIED</strong></span>
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="audit-filters-bar">
        {/* Search Input */}
        <div className="audit-search-wrapper">
          <Search size={15} className="search-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input 
            type="text" 
            placeholder="Search action, clerk, event details..."
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
              color: 'var(--text-main, #0f172a)',
              boxSizing: 'border-box'
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

        {/* Filter Selects Group */}
        <div className="audit-filter-selects">
          {/* Category Filter using shadcn/ui Select */}
          <div className="audit-category-select-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger style={{ height: 36, fontSize: 12.5, width: '100%' }}>
                <Filter size={13} style={{ color: '#64748b', marginRight: 4 }} />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Clerking">Clerking</SelectItem>
                <SelectItem value="HiBid Sync">HiBid Sync</SelectItem>
                <SelectItem value="Bidder">Bidder</SelectItem>
                <SelectItem value="Settlement">Settlement</SelectItem>
                <SelectItem value="Lot">Lot Catalog</SelectItem>
                <SelectItem value="Auction">Auction</SelectItem>
                <SelectItem value="System">System Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter using shadcn/ui Select */}
          <div className="audit-status-select-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger style={{ height: 36, fontSize: 12.5, width: '100%' }}>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="ALERT">Alert / Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Clear Button */}
        {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            style={{ height: 36, padding: '0 10px', fontSize: 12, color: '#64748b' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991b1b', fontSize: 12.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '3px 10px', fontSize: 11.5 }} 
            onClick={() => loadLogs(false)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Log Table Container (Desktop / Tablet View with Fixed Layout & Zero Horizontal Scroll) */}
      <div className="audit-desktop-table-view">
        <div className="audit-table-container">
          <table className="audit-fixed-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Timestamp</th>
                <th style={{ width: '15%' }}>Operator / Service</th>
                <th style={{ width: '9%' }}>Category</th>
                <th style={{ width: '21%' }}>Event Action</th>
                <th style={{ width: '28%' }}>Audit Details</th>
                <th style={{ width: '9%', textAlign: 'center' }}>Status</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading Skeleton Rows
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} style={{ opacity: 0.6 }}>
                    <td><div style={{ height: 14, width: '80%', background: '#f1f5f9', borderRadius: 4 }}></div></td>
                    <td><div style={{ height: 14, width: '85%', background: '#f1f5f9', borderRadius: 4 }}></div></td>
                    <td><div style={{ height: 18, width: 60, background: '#f1f5f9', borderRadius: 8 }}></div></td>
                    <td><div style={{ height: 14, width: '90%', background: '#f1f5f9', borderRadius: 4 }}></div></td>
                    <td><div style={{ height: 14, width: '95%', background: '#f1f5f9', borderRadius: 4 }}></div></td>
                    <td style={{ textAlign: 'center' }}><div style={{ height: 18, width: 55, background: '#f1f5f9', borderRadius: 8, margin: '0 auto' }}></div></td>
                    <td style={{ textAlign: 'center' }}><div style={{ height: 18, width: 16, background: '#f1f5f9', borderRadius: 4, margin: '0 auto' }}></div></td>
                  </tr>
                ))
              ) : paginatedLogs.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <FileText size={26} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>No administrative audit events found</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12 }}>Try adjusting your search query or category filters.</p>
                  </td>
                </tr>
              ) : (
                // Live Data Rows
                paginatedLogs.map(log => (
                  <tr key={log.id} style={{ transition: 'background-color 0.15s ease' }}>
                    {/* 1. Timestamp */}
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                      <span className="audit-cell-truncate" title={log.timestamp}>
                        {log.timestamp}
                      </span>
                    </td>

                    {/* 2. Operator / Service */}
                    <td style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span className="audit-cell-truncate" title={log.operator_service}>
                          {log.operator_service}
                        </span>
                        {log.is_annotated && (
                          <span title={`Auditor Note: ${log.auditor_notes}`} style={{ cursor: 'help', flexShrink: 0 }}>
                            <Edit3 size={11} style={{ color: '#d97706' }} />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Category */}
                    <td>
                      {renderCategoryBadge(log.category)}
                    </td>

                    {/* 4. Event Action (Truncated with three dots) */}
                    <td style={{ fontWeight: 600, color: 'var(--gold-light, #b45309)', fontSize: 12.5 }}>
                      <span className="audit-cell-truncate" title={log.event_action}>
                        {log.event_action}
                      </span>
                    </td>

                    {/* 5. Audit Details (Large content truncated with three dots, clickable to open drawer) */}
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <span 
                        className="audit-cell-truncate audit-cell-clickable" 
                        title={`Click to view full details:\n${log.audit_details}`}
                        onClick={() => handleOpenDetails(log)}
                      >
                        {log.audit_details}
                      </span>
                    </td>

                    {/* 6. Status */}
                    <td style={{ textAlign: 'center' }}>
                      {renderStatusBadge(log.status)}
                    </td>

                    {/* 7. Actions (Vertical Three Dots MoreVertical Trigger) */}
                    <td style={{ textAlign: 'center' }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="audit-action-trigger"
                          title="Audit record actions"
                          aria-label="Actions menu"
                        >
                          <MoreVertical size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="right" style={{ minWidth: 175, zIndex: 1050 }}>
                          {/* View Details */}
                          <DropdownMenuItem onClick={() => handleOpenDetails(log)}>
                            <Eye size={13} style={{ marginRight: 6 }} />
                            <span>View Details</span>
                          </DropdownMenuItem>

                          {/* Navigate to Related Record */}
                          <DropdownMenuItem onClick={() => handleNavigateRelated(log)}>
                            <ExternalLink size={13} style={{ marginRight: 6 }} />
                            <span>Open Related Record</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Delete Record (Restricted with confirmation) */}
                          <DropdownMenuItem 
                            onClick={() => setSelectedLogForDelete(log)}
                            variant="danger"
                          >
                            <Trash2 size={13} style={{ marginRight: 6 }} />
                            <span>Delete Record</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (Rendered on mobile <= 768px with Zero Horizontal Scrolling) */}
      <div className="audit-mobile-cards-view">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="audit-card-item" style={{ opacity: 0.6 }}>
              <div style={{ height: 16, width: '40%', background: '#f1f5f9', borderRadius: 4 }} />
              <div style={{ height: 18, width: '80%', background: '#f1f5f9', borderRadius: 4 }} />
              <div style={{ height: 14, width: '90%', background: '#f1f5f9', borderRadius: 4 }} />
            </div>
          ))
        ) : paginatedLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: '#ffffff', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.5, color: '#64748b' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>No administrative audit events found</p>
          </div>
        ) : (
          paginatedLogs.map(log => (
            <div key={log.id} className="audit-card-item">
              <div className="audit-card-header">
                <div className="audit-card-badges">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                    {log.timestamp}
                  </span>
                  {renderCategoryBadge(log.category)}
                  {renderStatusBadge(log.status)}
                </div>

                {/* Vertical Three Dots Action Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="audit-action-trigger"
                    title="Audit record actions"
                    aria-label="Actions menu"
                  >
                    <MoreVertical size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="right" style={{ minWidth: 175, zIndex: 1050 }}>
                    <DropdownMenuItem onClick={() => handleOpenDetails(log)}>
                      <Eye size={13} style={{ marginRight: 6 }} />
                      <span>View Details</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigateRelated(log)}>
                      <ExternalLink size={13} style={{ marginRight: 6 }} />
                      <span>Open Related Record</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setSelectedLogForDelete(log)}
                      variant="danger"
                    >
                      <Trash2 size={13} style={{ marginRight: 6 }} />
                      <span>Delete Record</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Event Action */}
              <div 
                className="audit-card-action-title"
                title={log.event_action}
              >
                {log.event_action}
              </div>

              {/* Audit Details (Truncated with three dots, clickable to view full details) */}
              <div 
                className="audit-card-details-text"
                title={log.audit_details}
                onClick={() => handleOpenDetails(log)}
              >
                {log.audit_details}
              </div>

              {/* Card Footer: Operator & Note */}
              <div className="audit-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={12} />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.operator_service}</span>
                  {log.is_annotated && (
                    <span title={`Auditor Note: ${log.auditor_notes}`}>
                      <Edit3 size={11} style={{ color: '#d97706' }} />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDetails(log)}
                  style={{ background: 'none', border: 'none', color: 'var(--gold-dark)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && filteredLogs.length > 0 && (
        <div style={{ marginTop: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <ShadcnPagination
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            itemLabel="audit records"
          />
        </div>
      )}

      {/* Right-Side "View Details" Drawer (ShadcnSheet) */}
      <ShadcnSheet
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Administrative Audit Event"
        description="Comprehensive audit verification, metadata signature, and source lineage"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (selectedLogForDetails) handleCopyDetails(selectedLogForDetails);
              }}
              style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Copy size={13} />
              <span>Copy Full Event</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDetailsOpen(false)}
              style={{ fontSize: 12.5 }}
            >
              Close
            </button>
          </div>
        }
      >
        {selectedLogForDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Event Identifier & Integrity Seal */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Audit Event ID
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                  <ShieldCheck size={12} /> SHA-256 Validated
                </span>
              </div>
              <code style={{ fontSize: 12, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {selectedLogForDetails.id}
              </code>
            </div>

            {/* Core Fields Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                  Timestamp (Local)
                </label>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} style={{ color: '#64748b' }} />
                  <span>{selectedLogForDetails.timestamp}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                  Status
                </label>
                <div>
                  {renderStatusBadge(selectedLogForDetails.status)}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                  Operator / Service
                </label>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} style={{ color: '#64748b' }} />
                  <span>{selectedLogForDetails.operator_service}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                  Category
                </label>
                <div>
                  {renderCategoryBadge(selectedLogForDetails.category)}
                </div>
              </div>
            </div>

            {/* Event Action */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                Event Action
              </label>
              <div style={{ padding: '10px 12px', background: '#fdfbf7', border: '1px solid #fef3c7', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                {selectedLogForDetails.event_action}
              </div>
            </div>

            {/* Audit Details */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                Detailed Audit Log
              </label>
              <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                {selectedLogForDetails.audit_details}
              </div>
            </div>

            {/* Auditor Notes (If any) */}
            {selectedLogForDetails.auditor_notes && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Edit3 size={12} /> Auditor Internal Annotation
                </label>
                <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, fontSize: 12.5, color: '#92400e', lineHeight: 1.45 }}>
                  {selectedLogForDetails.auditor_notes}
                </div>
              </div>
            )}

            {/* Related Entity Link Card */}
            <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Layers size={18} style={{ color: '#64748b' }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>
                    Related Context Record
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    {selectedLogForDetails.related_record_type 
                      ? `${selectedLogForDetails.related_record_type.toUpperCase()} Reference`
                      : 'Associated auction context'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  handleNavigateRelated(selectedLogForDetails);
                  setIsDetailsOpen(false);
                }}
                style={{ padding: '5px 11px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <span>Open Record</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        )}
      </ShadcnSheet>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(selectedLogForDelete)}
        onClose={() => setSelectedLogForDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Administrative Audit Record"
        entityName={selectedLogForDelete ? selectedLogForDelete.event_action : 'Audit Event'}
        entitySubtitle={selectedLogForDelete ? `Operator: ${selectedLogForDelete.operator_service} • ${selectedLogForDelete.timestamp}` : undefined}
        warningMessage="Warning: Audit events are normally permanent under AF360 compliance and FINRA retention rules. Deleting this record is logged as an administrative variance."
        confirmButtonText="Authorize Deletion"
        isLoading={isDeletingSubmitting}
      />
    </div>
  );
};
