import React, { useState, useEffect } from 'react';
import { AuctionDetail, AuctionStatusType } from '../../types/auctionDetail';
import { auctionService } from '../../services/auctionService';
import { DataTable, ColumnDef, ActionMenuItem } from '../Common/DataTable';
import { StatusPill } from '../Common/StatusPill';
import { ConfirmModal } from '../Common/ConfirmModal';
import { FormModal } from '../Common/FormModal';
import { FormField } from '../Common/FormField';
import { 
  Plus, 
  List, 
  Grid, 
  ExternalLink, 
  Copy, 
  Trash2, 
  Edit, 
  Calendar, 
  MapPin, 
  Radio, 
  Layers,
  ArrowRight,
  RefreshCw,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface AuctionsListViewProps {
  onOpenAuction: (auctionId: string) => void;
  onNavigateReports?: () => void;
}

export const AuctionsListView: React.FC<AuctionsListViewProps> = ({
  onOpenAuction,
  onNavigateReports
}) => {
  const [auctions, setAuctions] = useState<AuctionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedAuctionIds, setSelectedAuctionIds] = useState<string[]>([]);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState<AuctionDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [auctionToChangeStatus, setAuctionToChangeStatus] = useState<AuctionDetail | null>(null);
  const [statusToSet, setStatusToSet] = useState<AuctionStatusType>('Open');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Bulk Selection States
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkStatusToSet, setBulkStatusToSet] = useState<AuctionStatusType>('Open');
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false);

  // New Auction Form
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [newType, setNewType] = useState<'HiBid' | 'Other Auctions'>('HiBid');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadAuctions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await auctionService.getAuctions();
      setAuctions(data);
    } catch (e: any) {
      console.error('Failed to load auctions:', e);
      setError(e?.message || 'Failed to load auction events from database.');
      setAuctions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();

    const unsubscribe = auctionService.subscribeToAuctions(() => {
      loadAuctions();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const created = await auctionService.createAuction({
        name: newName,
        code: newCode || `AUC-${Date.now().toString().slice(-4)}`,
        startDate: newStartDate,
        endDate: newEndDate,
        auctionType: newType,
        description: newDesc
      });
      setIsNewModalOpen(false);
      setNewName('');
      setNewCode('');
      setNewDesc('');
      await loadAuctions();
      onOpenAuction(created.id);
    } catch (err) {
      console.error('Failed to create auction:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (auction: AuctionDetail) => {
    try {
      await auctionService.duplicateAuction(auction.id);
      await loadAuctions();
    } catch (err) {
      console.error('Failed to duplicate auction:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!auctionToDelete) return;
    setIsDeleting(true);
    try {
      await auctionService.deleteAuction(auctionToDelete.id);
      setAuctionToDelete(null);
      await loadAuctions();
    } catch (err) {
      console.error('Failed to delete auction:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionToChangeStatus) return;

    setIsUpdatingStatus(true);
    try {
      await auctionService.saveAuction({
        ...auctionToChangeStatus,
        status: statusToSet
      });
      setAuctionToChangeStatus(null);
      await loadAuctions();
    } catch (err) {
      console.error('Failed to update auction status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedAuctionIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedAuctionIds) {
        await auctionService.deleteAuction(id);
      }
      setSelectedAuctionIds([]);
      setIsBulkDeleteModalOpen(false);
      await loadAuctions();
    } catch (err) {
      console.error('Failed to bulk delete auctions:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAuctionIds.length === 0) return;
    setIsBulkUpdatingStatus(true);
    try {
      for (const id of selectedAuctionIds) {
        const target = auctions.find(a => a.id === id);
        if (target) {
          await auctionService.saveAuction({
            ...target,
            status: bulkStatusToSet
          });
        }
      }
      setIsBulkStatusModalOpen(false);
      setSelectedAuctionIds([]);
      await loadAuctions();
    } catch (err) {
      console.error('Failed to update status for selected auctions:', err);
    } finally {
      setIsBulkUpdatingStatus(false);
    }
  };

  const filteredAuctions = auctions.filter(a => {
    if (statusFilter === 'All') return true;
    return a.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const columns: ColumnDef<AuctionDetail>[] = [
    {
      key: 'name',
      header: 'EVENT NAME',
      sortable: true,
      width: 280,
      render: (a) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span 
              onClick={() => onOpenAuction(a.id)}
              style={{ 
                fontWeight: 600, 
                fontSize: 14, 
                color: 'var(--text-main)', 
                cursor: 'pointer',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
            >
              {a.name}
            </span>
            {a.auctionType === 'HiBid' && (
              <span style={{ 
                fontSize: 10, 
                fontWeight: 700, 
                background: '#e0f2fe', 
                color: '#0369a1', 
                padding: '1px 6px', 
                borderRadius: 4 
              }}>
                HiBid
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>
            Code: {a.code} • {a.dayStats?.lotCount || 0} Lots
          </span>
        </div>
      )
    },
    {
      key: 'startDate',
      header: 'START DATE',
      sortable: true,
      width: 140,
      render: (a) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {formatDate(a.startDate)}
        </span>
      )
    },
    {
      key: 'endDate',
      header: 'END DATE',
      sortable: true,
      width: 140,
      render: (a) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {formatDate(a.endDate)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'STATUS',
      sortable: true,
      width: 135,
      align: 'center',
      render: (a) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StatusPill status={a.status} />
        </div>
      )
    },
    {
      key: 'dashboardAction',
      header: 'DASHBOARD',
      width: 140,
      align: 'center',
      render: (a) => (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onOpenAuction(a.id)}
          style={{ 
            fontSize: 12, 
            padding: '5px 12px',
            borderColor: 'var(--gold-primary)',
            color: 'var(--gold-dark)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <span>Dashboard</span>
          <ArrowRight size={13} />
        </button>
      )
    }
  ];

  const rowActions: ActionMenuItem<AuctionDetail>[] = [
    {
      label: 'Open Auction',
      icon: Edit,
      onClick: (a) => onOpenAuction(a.id)
    },
    {
      label: 'Change Status',
      icon: RefreshCw,
      onClick: (a) => {
        setAuctionToChangeStatus(a);
        const validStatuses: AuctionStatusType[] = ['Open', 'In Progress', 'Closed'];
        const current = validStatuses.includes(a.status as any) ? (a.status as AuctionStatusType) : 'Open';
        setStatusToSet(current);
      }
    },
    {
      label: 'Duplicate',
      icon: Copy,
      onClick: (a) => handleDuplicate(a)
    },
    {
      label: 'Delete Auction',
      icon: Trash2,
      destructive: true,
      onClick: (a) => setAuctionToDelete(a)
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
            Auctions
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Event configuration, HiBid syndication settings, and rostrum session control
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-gold"
            onClick={() => setIsNewModalOpen(true)}
          >
            <span>Create Auction</span>
          </button>
        </div>
      </div>

      {/* Filter and View Mode Bar */}
      <div className="catalog-filters-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            {(['All', 'Open', 'In Progress', 'Closed'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  minWidth: 92,
                  textAlign: 'center',
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: statusFilter === st ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                  background: statusFilter === st ? '#fbf8f2' : '#ffffff',
                  color: statusFilter === st ? 'var(--gold-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table / Grid Mode Toggle */}
        <div className="view-mode-toggle-group">
          <button 
            type="button"
            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <List size={15} />
            <span>Table</span>
          </button>
          <button 
            type="button"
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Grid size={15} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Actions Bar */}
      {selectedAuctionIds.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 18px',
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: 8,
          border: '1px solid #1e293b',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              background: 'var(--gold-primary)',
              color: '#0f172a',
              padding: '3px 10px',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)'
            }}>
              {selectedAuctionIds.length} Selected
            </span>
            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
              {selectedAuctionIds.length === 1 ? '1 auction selected' : `${selectedAuctionIds.length} auctions selected`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Bulk Change Status Button */}
            <button
              type="button"
              onClick={() => setIsBulkStatusModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#334155';
                e.currentTarget.style.borderColor = 'var(--gold-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1e293b';
                e.currentTarget.style.borderColor = '#334155';
              }}
              title="Change status for selected auctions"
            >
              <RefreshCw size={13} color="var(--gold-primary)" />
              <span>Change Status</span>
            </button>

            {/* Bulk Delete Button */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                background: '#dc2626',
                color: '#ffffff',
                border: '1px solid #ef4444',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
              title="Delete selected auctions"
            >
              <Trash2 size={13} />
              <span>Delete Selected ({selectedAuctionIds.length})</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedAuctionIds([])}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                borderRadius: 6,
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              title="Deselect all"
            >
              <X size={14} />
              <span>Deselect</span>
            </button>
          </div>
        </div>
      )}

      {/* Error State Banner with Retry */}
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 8,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 600, color: '#991b1b', fontSize: 13.5 }}>Unable to load auctions from database</div>
              <div style={{ color: '#b91c1c', fontSize: 12.5 }}>{error}</div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={loadAuctions} 
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 14px', borderColor: '#fca5a5', color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' ? (
        <DataTable
          data={filteredAuctions}
          columns={columns}
          keyExtractor={(a) => a.id}
          searchPlaceholder="Search auctions by event name, code..."
          searchFilter={(a, q) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)}
          enableSelection={true}
          selectedIds={selectedAuctionIds}
          onSelectionChange={setSelectedAuctionIds}
          rowActions={rowActions}
          itemNoun="auctions"
          isLoading={isLoading}
          emptyMessage={
            statusFilter === 'All'
              ? 'No auction events found in the database. Click "Create Auction" above to create your first event.'
              : `No auctions found with status "${statusFilter}".`
          }
          topRightControls={
            selectedAuctionIds.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsBulkStatusModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-medium)',
                    background: '#ffffff',
                    color: 'var(--text-main)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Change status for selected auctions"
                >
                  <RefreshCw size={13} color="var(--gold-primary)" />
                  <span>Change Status ({selectedAuctionIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Delete selected auctions"
                >
                  <Trash2 size={13} />
                  <span>Delete Selected ({selectedAuctionIds.length})</span>
                </button>
              </div>
            ) : undefined
          }
        />
      ) : (
        /* Grid View */
        isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 12, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <Loader2 size={26} className="animate-spin" style={{ color: 'var(--gold-primary)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading auctions from database...</span>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 12, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={22} />
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 15 }}>
              {statusFilter === 'All' ? 'No auction events found' : `No ${statusFilter.toLowerCase()} auctions found`}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, maxWidth: 420 }}>
              {statusFilter === 'All'
                ? 'There are currently no auction records in the database. Create a new auction event to get started.'
                : `No auctions currently match the status "${statusFilter}".`}
            </p>
            {statusFilter === 'All' && (
              <button
                type="button"
                className="btn btn-gold"
                style={{ marginTop: 6 }}
                onClick={() => setIsNewModalOpen(true)}
              >
                <Plus size={14} />
                <span>Create Auction</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filteredAuctions.map(a => (
              <div 
                key={a.id}
                className="syndication-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onClick={() => onOpenAuction(a.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <StatusPill status={a.status} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--gold-dark)', fontWeight: 600 }}>
                      {a.code}
                    </span>
                  </div>

                  <h3 className="font-serif" style={{ fontSize: 17, color: 'var(--text-main)', marginBottom: 6, lineHeight: 1.3 }}>
                    {a.name}
                  </h3>

                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                    {a.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} color="var(--gold-primary)" />
                    <span>{formatDate(a.startDate)} – {formatDate(a.endDate)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                      {a.dayStats?.lotCount || 0} Lots
                    </span>
                    <span style={{ color: 'var(--gold-primary)', fontWeight: 600, fontSize: 12 }}>
                      Open Dashboard →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create New Auction Modal */}
      <FormModal
        isOpen={isNewModalOpen}
        title="Create New Auction Event"
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateAuction}
        submitLabel="Create Auction"
        isLoading={isCreating}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Auction Name" required>
            <input 
              type="text"
              required
              placeholder="e.g. Highlander Gold & Silver 10/22/26"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 38 }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Auction Code">
              <input 
                type="text"
                placeholder="e.g. HGS-2026-10-22"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38 }}
              />
            </FormField>

            <FormField label="Auction Platform Type">
              <select 
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="catalog-filter-select"
                style={{ width: '100%', height: 38 }}
              >
                <option value="HiBid">HiBid</option>
                <option value="Other Auctions">Other Auctions</option>
              </select>
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Start Date">
              <input 
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38 }}
              />
            </FormField>

            <FormField label="End Date">
              <input 
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38 }}
              />
            </FormField>
          </div>

          <FormField label="Auction Description">
            <textarea 
              rows={3}
              placeholder="Welcome notes and bidding instructions..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 'auto', padding: '8px 10px' }}
            />
          </FormField>
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(auctionToDelete)}
        title="Delete Auction Event"
        message={`Are you sure you want to delete "${auctionToDelete?.name}"? All associated lots, clerking records, and settlement data will be permanently removed.`}
        confirmLabel="Delete Auction"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setAuctionToDelete(null)}
      />

      {/* Change Status Modal */}
      <FormModal
        isOpen={Boolean(auctionToChangeStatus)}
        title="Change Auction Status"
        onClose={() => setAuctionToChangeStatus(null)}
        onSubmit={handleUpdateStatus}
        submitLabel="Update Status"
        isLoading={isUpdatingStatus}
        maxWidth={480}
      >
        {auctionToChangeStatus && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ 
              padding: '12px 14px', 
              background: '#f8fafc', 
              borderRadius: 8, 
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Auction Details
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                {auctionToChangeStatus.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                  Code: {auctionToChangeStatus.code}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Current:</span>
                  <StatusPill status={auctionToChangeStatus.status} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Select New Status
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['Open', 'In Progress', 'Closed'] as const).map((st) => {
                  const isSelected = statusToSet === st;
                  return (
                    <label
                      key={st}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '11px 14px',
                        borderRadius: 8,
                        border: isSelected ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? '#fbf8f2' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="radio"
                          name="auctionStatusRadio"
                          value={st}
                          checked={isSelected}
                          onChange={() => setStatusToSet(st)}
                          style={{ accentColor: 'var(--gold-primary)', cursor: 'pointer', width: 16, height: 16 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? 'var(--gold-dark)' : 'var(--text-main)' }}>
                            {st}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                            {st === 'Open' && 'Cataloging / Upcoming auction'}
                            {st === 'In Progress' && 'Active live bidding / Rostrum open'}
                            {st === 'Closed' && 'Concluded / Past auction'}
                          </span>
                        </div>
                      </div>

                      <StatusPill status={st} />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </FormModal>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Delete Selected Auctions"
        message={`Are you sure you want to permanently delete ${selectedAuctionIds.length} selected auction(s)? All associated catalog lots, clerking records, and settlement data will be permanently removed from Supabase.`}
        confirmLabel={`Delete ${selectedAuctionIds.length} Auction(s)`}
        isDestructive={true}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Bulk Change Status Modal */}
      <FormModal
        isOpen={isBulkStatusModalOpen}
        title={`Change Status (${selectedAuctionIds.length} Auctions)`}
        onClose={() => setIsBulkStatusModalOpen(false)}
        onSubmit={handleBulkUpdateStatus}
        submitLabel={`Update ${selectedAuctionIds.length} Auction(s)`}
        isLoading={isBulkUpdatingStatus}
        maxWidth={460}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            padding: '12px 14px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontSize: 13,
            color: 'var(--text-secondary)'
          }}>
            Setting new status for <strong style={{ color: 'var(--text-main)' }}>{selectedAuctionIds.length} selected auction(s)</strong>.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Select Status to Apply
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['Open', 'In Progress', 'Closed'] as const).map((st) => {
                const isSelected = bulkStatusToSet === st;
                return (
                  <label
                    key={st}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderRadius: 8,
                      border: isSelected ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? '#fbf8f2' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="radio"
                        name="bulkAuctionStatusRadio"
                        value={st}
                        checked={isSelected}
                        onChange={() => setBulkStatusToSet(st)}
                        style={{ accentColor: 'var(--gold-primary)', cursor: 'pointer', width: 16, height: 16 }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? 'var(--gold-dark)' : 'var(--text-main)' }}>
                          {st}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                          {st === 'Open' && 'Cataloging / Upcoming auction'}
                          {st === 'In Progress' && 'Active live bidding / Rostrum open'}
                          {st === 'Closed' && 'Concluded / Past auction'}
                        </span>
                      </div>
                    </div>

                    <StatusPill status={st} />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
};
