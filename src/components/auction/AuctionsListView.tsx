import React, { useState, useEffect } from 'react';
import { AuctionDetail } from '../../types/auctionDetail';
import { auctionService } from '../../services/auctionService';
import { DataTable, ColumnDef, ActionMenuItem } from '../Common/DataTable';
import { StatusPill } from '../Common/StatusPill';
import { ConfirmModal } from '../Common/ConfirmModal';
import { FormModal } from '../Common/FormModal';
import { FormField } from '../Common/FormField';
import { 
  Plus, 
  FileText, 
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
  ArrowRight
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
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedAuctionIds, setSelectedAuctionIds] = useState<string[]>([]);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState<AuctionDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Auction Form
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [newType, setNewType] = useState<'HiBid' | 'Other Auctions'>('HiBid');
  const [newDesc, setNewDesc] = useState('');

  const loadAuctions = async () => {
    setIsLoading(true);
    try {
      const data = await auctionService.getAuctions();
      setAuctions(data);
    } catch (e) {
      console.error('Failed to load auctions:', e);
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
    if (!newName.trim()) return;

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
      width: 130,
      align: 'center',
      render: (a) => <StatusPill status={a.status} />
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
          {onNavigateReports && (
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onNavigateReports}
            >
              <FileText size={15} />
              <span>Reports</span>
            </button>
          )}

          <button 
            type="button" 
            className="btn btn-gold"
            onClick={() => setIsNewModalOpen(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ New Auction</span>
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
        />
      ) : (
        /* Grid View */
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
      )}

      {/* Create New Auction Modal */}
      <FormModal
        isOpen={isNewModalOpen}
        title="Create New Auction Event"
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateAuction}
        submitLabel="Create Auction"
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
    </div>
  );
};
