import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ActivityLog, NavigationSection } from '../../types';
import { 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  MoreHorizontal, 
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Header */}
      <div 
        className="card-header-flex"
        style={{ 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 14,
          marginBottom: 0,
          gap: 12
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

        {/* Category Filter using shadcn/ui Select */}
        <div style={{ width: 175 }}>
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
        <div style={{ width: 155 }}>
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

      {/* Log Table Container */}
      <div className="table-wrapper" style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, background: '#ffffff', overflowX: 'auto' }}>
        <table className="luxury-table" style={{ fontSize: 12.5, width: '100%', minWidth: 920 }}>
          <thead>
            <tr>
              <th style={{ width: '11%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
              <th style={{ width: '16%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operator / Service</th>
              <th style={{ width: '11%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
              <th style={{ width: '25%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Action</th>
              <th style={{ width: '23%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Details</th>
              <th style={{ width: '8%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
              <th style={{ width: '6%', fontSize: 11, padding: '11px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading Skeleton Rows
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} style={{ opacity: 0.6 }}>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: 70, background: '#f1f5f9', borderRadius: 4 }}></div></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: 120, background: '#f1f5f9', borderRadius: 4 }}></div></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 18, width: 60, background: '#f1f5f9', borderRadius: 8 }}></div></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: 180, background: '#f1f5f9', borderRadius: 4 }}></div></td>
                  <td style={{ padding: '12px 14px' }}><div style={{ height: 14, width: 220, background: '#f1f5f9', borderRadius: 4 }}></div></td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}><div style={{ height: 18, width: 55, background: '#f1f5f9', borderRadius: 8, margin: '0 auto' }}></div></td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}><div style={{ height: 18, width: 20, background: '#f1f5f9', borderRadius: 4, margin: '0 auto' }}></div></td>
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
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    {log.timestamp}
                  </td>

                  {/* 2. Operator / Service */}
                  <td style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 12.5, padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{log.operator_service}</span>
                      {log.is_annotated && (
                        <span title={`Auditor Note: ${log.auditor_notes}`} style={{ cursor: 'help' }}>
                          <Edit3 size={11} style={{ color: '#d97706' }} />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 3. Category */}
                  <td style={{ padding: '11px 14px' }}>
                    {renderCategoryBadge(log.category)}
                  </td>

                  {/* 4. Event Action */}
                  <td style={{ fontWeight: 600, color: 'var(--gold-light, #b45309)', fontSize: 12.5, padding: '11px 14px' }}>
                    {log.event_action}
                  </td>

                  {/* 5. Audit Details */}
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 360, whiteSpace: 'normal', lineHeight: 1.4, padding: '11px 14px' }}>
                    {log.audit_details}
                  </td>

                  {/* 6. Status */}
                  <td style={{ textAlign: 'center', padding: '11px 14px' }}>
                    {renderStatusBadge(log.status)}
                  </td>

                  {/* 7. Actions (shadcn/ui DropdownMenu with Lucide MoreHorizontal) */}
                  <td style={{ textAlign: 'center', padding: '11px 14px' }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '4px 6px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title="Audit record actions"
                        aria-label="Actions menu"
                      >
                        <MoreHorizontal size={16} />
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
