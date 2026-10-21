import React, { useState, useEffect } from 'react';
import { LotItem, LotCategory, LotStatus, Auction, UserBidder } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { lotsService } from '../../services/lotsService';
import { INITIAL_AUCTIONS, INITIAL_USERS } from '../../data/mockData';
import { LotFormModal } from '../auction/LotFormModal';
import { 
  Search, 
  Plus, 
  Grid, 
  List, 
  Radio, 
  Tag, 
  Check, 
  X, 
  Bookmark, 
  Zap, 
  CheckCircle2, 
  DollarSign, 
  Layers, 
  Award, 
  Camera, 
  RotateCcw, 
  MoreVertical, 
  Eye, 
  Copy,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';

/* ==========================================================================
   REUSABLE CATEGORY BADGE COMPONENT (STANDARDIZED)
   ========================================================================== */
export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const lower = (category || '').toLowerCase();
  let themeClass = 'cat-badge-default';

  if (lower.includes('gold')) {
    themeClass = 'cat-badge-gold';
  } else if (lower.includes('silver') || lower.includes('morgan')) {
    themeClass = 'cat-badge-silver';
  } else if (lower.includes('jewelry') || lower.includes('watch')) {
    themeClass = 'cat-badge-jewelry';
  } else if (lower.includes('ancient') || lower.includes('world')) {
    themeClass = 'cat-badge-ancient';
  } else if (lower.includes('currency') || lower.includes('paper')) {
    themeClass = 'cat-badge-currency';
  } else if (lower.includes('bullion') || lower.includes('historic')) {
    themeClass = 'cat-badge-bullion';
  }

  return (
    <span className={`cat-badge ${themeClass}`} title={category}>
      <span className="cat-badge-text">{category}</span>
    </span>
  );
};

/* ==========================================================================
   STANDARDIZED LOT STATUS BADGE COMPONENT
   ========================================================================== */
export const LotStatusBadge: React.FC<{ status: LotStatus | string }> = ({ status }) => {
  switch (status) {
    case 'on_block':
      return (
        <span className="status-pill status-pill-onblock" title="Currently live on rostrum block">
          <span className="status-dot status-dot-pulsing" />
          <span>ON BLOCK</span>
        </span>
      );
    case 'sold':
      return (
        <span className="status-pill status-pill-sold" title="Hammer fell - sold">
          <Check size={11} strokeWidth={2.5} />
          <span>SOLD</span>
        </span>
      );
    case 'passed':
      return (
        <span className="status-pill status-pill-passed" title="Passed unsold - reserve not met">
          <span className="status-dot status-dot-passed" />
          <span>PASSED</span>
        </span>
      );
    case 'upcoming':
    default:
      return (
        <span className="status-pill status-pill-upcoming" title="Upcoming lot in catalog">
          <span>UPCOMING</span>
        </span>
      );
  }
};

interface LotsViewProps {
  lots: LotItem[];
  onAddLot: (lot: LotItem) => void;
  onUpdateLot: (lot: LotItem) => void;
  onSendToBlock: (lot: LotItem) => void;
  onDeleteLot?: (lotId: string) => Promise<{ success: boolean; error?: string } | void>;
  defaultAuctionId?: string;
  lockAuction?: boolean;
  auctions?: Auction[];
  consignors?: UserBidder[];
  onAddConsignor?: (newConsignor: UserBidder) => void;
}

export const LotsView: React.FC<LotsViewProps> = ({
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock,
  onDeleteLot,
  defaultAuctionId,
  lockAuction = false,
  auctions = INITIAL_AUCTIONS,
  consignors = INITIAL_USERS,
  onAddConsignor
}) => {
  // Filter and display states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reserveFilter, setReserveFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Menu states
  const [selectedLot, setSelectedLot] = useState<LotItem | null>(null);
  const [isNewLotModalOpen, setIsNewLotModalOpen] = useState(false);
  const [openMenuLotId, setOpenMenuLotId] = useState<string | null>(null);

  // Delete modal state
  const [lotToDelete, setLotToDelete] = useState<LotItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit modal state
  const [editingLot, setEditingLot] = useState<LotItem | null>(null);

  // Close three dots dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.lot-action-menu-container')) {
        setOpenMenuLotId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter computation
  const filteredLots = lots.filter(lot => {
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      lot.title.toLowerCase().includes(query) ||
      lot.lotNumber.toString().includes(query) ||
      (lot.certNumber && lot.certNumber.toLowerCase().includes(query)) ||
      lot.grade.toLowerCase().includes(query) ||
      lot.category.toLowerCase().includes(query);

    const matchesCategory = 
      categoryFilter === 'all' || 
      lot.category === categoryFilter ||
      (categoryFilter === 'Rare US Gold' && lot.category.toLowerCase().includes('gold')) ||
      (categoryFilter === 'Fine Silver & Morgan Dollars' && (lot.category.toLowerCase().includes('silver') || lot.category.toLowerCase().includes('morgan'))) ||
      (categoryFilter === 'Estate Jewelry & Watches' && (lot.category.toLowerCase().includes('jewelry') || lot.category.toLowerCase().includes('watch'))) ||
      (categoryFilter === 'Ancient & World Numismatics' && (lot.category.toLowerCase().includes('ancient') || lot.category.toLowerCase().includes('world')));

    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;

    const isUpcoming = lot.status === 'upcoming';
    const isReserveMet = !isUpcoming && lot.currentBid >= lot.reservePrice;
    const matchesReserve = 
      reserveFilter === 'all' || 
      (reserveFilter === 'met' && (isReserveMet || lot.status === 'sold')) || 
      (reserveFilter === 'under' && (!isReserveMet && !isUpcoming && lot.status !== 'sold'));

    return matchesSearch && matchesCategory && matchesStatus && matchesReserve;
  });

  // Pagination computations
  const totalItems = filteredLots.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedLots = filteredLots.slice(startIndex, startIndex + pageSize);
  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + pageSize, totalItems);

  // Checkbox helpers
  const allCurrentPageSelected = paginatedLots.length > 0 && paginatedLots.every(l => selectedLotIds.includes(l.id));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const pageIds = paginatedLots.map(l => l.id);
      setSelectedLotIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedLots.map(l => l.id);
      setSelectedLotIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectLot = (id: string) => {
    setSelectedLotIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setReserveFilter('all');
    setCurrentPage(1);
  };

  const isFiltered = searchTerm !== '' || categoryFilter !== 'all' || statusFilter !== 'all' || reserveFilter !== 'all';

  // Start Edit Handler
  const handleStartEdit = (lot: LotItem) => {
    setEditingLot(lot);
  };

  // Confirm Delete Handler (Backend Connected)
  const handleConfirmDelete = async () => {
    if (!lotToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      let res;
      if (onDeleteLot) {
        res = await onDeleteLot(lotToDelete.id);
      } else {
        res = await lotsService.deleteLot(lotToDelete.id);
      }

      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        setDeleteError(res.error || 'Failed to delete lot from database.');
        setIsDeleting(false);
        return;
      }

      // Success
      setSelectedLotIds(prev => prev.filter(id => id !== lotToDelete.id));
      setIsDeleting(false);
      setLotToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An unexpected error occurred during deletion.');
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Page Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
            Lot Catalog & Numismatic Inventory
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Item photography, certified grading criteria (PCGS/NGC), reserve ceilings, and condition records
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* View Toggle */}
          <div className="view-mode-toggle-group">
            <button 
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View (Standard Catalog)"
              aria-label="Table View"
            >
              <List size={15} />
              <span>Table</span>
            </button>
            <button 
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid Cards"
              aria-label="Grid View"
            >
              <Grid size={15} />
              <span>Grid</span>
            </button>
          </div>

          {/* Add Catalog Lot Button */}
          <button 
            type="button" 
            className="btn-add-catalog-lot" 
            onClick={() => setIsNewLotModalOpen(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Catalog Lot</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="catalog-filters-card">
        <div className="catalog-search-wrapper">
          <Search size={16} className="catalog-search-icon" />
          <input 
            type="text" 
            className="catalog-search-input"
            placeholder="Search title, lot #, PCGS cert, grade..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select 
          className="catalog-filter-select"
          value={categoryFilter} 
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter by Category"
        >
          <option value="all">All Categories</option>
          <option value="Rare US Gold">Rare US Gold</option>
          <option value="Fine Silver & Morgan Dollars">Fine Silver & Morgan</option>
          <option value="Estate Jewelry & Watches">Estate Jewelry & Watches</option>
          <option value="Ancient & World Numismatics">Ancient & World</option>
          <option value="Rare Paper Currency">Rare Paper Currency</option>
          <option value="Historic Bullion">Historic Bullion</option>
        </select>

        <select 
          className="catalog-filter-select"
          value={statusFilter} 
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter by Status"
        >
          <option value="all">All Statuses</option>
          <option value="on_block">On Block (Live)</option>
          <option value="upcoming">Upcoming</option>
          <option value="sold">Sold (Hammered)</option>
          <option value="passed">Passed</option>
        </select>

        <select 
          className="catalog-filter-select"
          value={reserveFilter} 
          onChange={(e) => {
            setReserveFilter(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter by Reserve Status"
        >
          <option value="all">All Reserves</option>
          <option value="met">Reserve Met</option>
          <option value="under">Under Reserve</option>
        </select>

        {isFiltered && (
          <button 
            type="button" 
            className="catalog-reset-btn"
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Bulk Selection Notice */}
      {selectedLotIds.length > 0 && (
        <div className="bulk-selection-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} />
            <span>
              <strong>{selectedLotIds.length}</strong> lot{selectedLotIds.length > 1 ? 's' : ''} selected on this page
            </span>
          </div>
          <button 
            type="button" 
            style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => setSelectedLotIds([])}
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Table View (Default) or Grid View */}
      {viewMode === 'table' ? (
        <div className="catalog-table-card">
          <div className="catalog-table-scroll">
            <table className="catalog-luxury-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      className="catalog-checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all lots on current page"
                    />
                  </th>
                  <th style={{ width: 75 }}>LOT #</th>
                  <th style={{ minWidth: 260 }}>ITEM DESCRIPTION</th>
                  <th style={{ width: 160, textAlign: 'center' }}>CATEGORY</th>
                  <th style={{ width: 130, textAlign: 'right' }}>CURRENT BID</th>
                  <th style={{ width: 95, textAlign: 'center' }}>BIDS</th>
                  <th style={{ width: 140, textAlign: 'center' }}>RESERVE STATUS</th>
                  <th style={{ width: 125, textAlign: 'center' }}>LOT STATUS</th>
                  <th style={{ width: 65, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLots.map((lot, index) => {
                  const isSelected = selectedLotIds.includes(lot.id);
                  const isSold = lot.status === 'sold';
                  const isUpcoming = lot.status === 'upcoming';
                  const isReserveMet = !isUpcoming && lot.currentBid >= lot.reservePrice;
                  const displayPrice = isSold && lot.hammerPrice 
                    ? lot.hammerPrice 
                    : isUpcoming 
                      ? lot.startingBid 
                      : lot.currentBid;

                  return (
                    <tr key={lot.id} className={isSelected ? 'row-selected' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          className="catalog-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLot(lot.id)}
                          aria-label={`Select lot ${lot.lotNumber}`}
                        />
                      </td>

                      <td>
                        <span className="lot-num-text">#{lot.lotNumber}</span>
                      </td>

                      <td>
                        <div className="lot-item-title">{lot.title}</div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <CategoryBadge category={lot.category} />
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <span className="current-bid-amount">
                            {formatCurrency(displayPrice)}
                          </span>
                          {isUpcoming && (
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1, marginTop: '2px' }}>
                              Opening Bid
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="bids-count-pill">
                          {isUpcoming ? '0 Bids' : `${lot.bidsCount || 0} Bids`}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {isSold ? (
                          <span className="reserve-badge reserve-badge-hammered">
                            <span className="reserve-indicator-dot green" /> Hammered
                          </span>
                        ) : isUpcoming ? (
                          <span className="reserve-badge reserve-badge-pending" title="Awaiting live rostrum opening">
                            <span className="reserve-indicator-dot gray" /> Pending
                          </span>
                        ) : isReserveMet ? (
                          <span className="reserve-badge reserve-badge-met">
                            <span className="reserve-indicator-dot green" /> Reserve Met
                          </span>
                        ) : (
                          <span className="reserve-badge reserve-badge-under">
                            <span className="reserve-indicator-dot red" /> Under Reserve
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <LotStatusBadge status={lot.status} />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div className="lot-action-menu-container">
                          <button 
                            type="button"
                            className={`btn-three-dots ${openMenuLotId === lot.id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuLotId(openMenuLotId === lot.id ? null : lot.id);
                            }}
                            title="Actions menu"
                            aria-label={`Actions for lot ${lot.lotNumber}`}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuLotId === lot.id && (
                            <div className={`lot-action-dropdown ${index >= paginatedLots.length - 2 && paginatedLots.length > 2 ? 'drop-up' : 'drop-down'}`}>
                              <button 
                                type="button"
                                className="dropdown-action-item"
                                onClick={() => {
                                  setOpenMenuLotId(null);
                                  setSelectedLot(lot);
                                }}
                              >
                                <Eye size={14} className="action-item-icon" />
                                <span>View Details</span>
                              </button>

                              <button 
                                type="button"
                                className="dropdown-action-item"
                                onClick={() => {
                                  setOpenMenuLotId(null);
                                  handleStartEdit(lot);
                                }}
                              >
                                <Edit3 size={14} className="action-item-icon" />
                                <span>Edit Lot</span>
                              </button>

                              {!isSold && (
                                <button 
                                  type="button"
                                  className="dropdown-action-item"
                                  onClick={() => {
                                    setOpenMenuLotId(null);
                                    onSendToBlock(lot);
                                  }}
                                >
                                  <Zap size={14} className="action-item-icon gold" />
                                  <span>{lot.status === 'on_block' ? '⚡ Currently Live' : 'Send to Block'}</span>
                                </button>
                              )}

                              <button 
                                type="button"
                                className="dropdown-action-item"
                                onClick={() => {
                                  setOpenMenuLotId(null);
                                  navigator.clipboard.writeText(`Lot #${lot.lotNumber}: ${lot.title}`);
                                }}
                              >
                                <Copy size={14} className="action-item-icon" />
                                <span>Copy Lot Info</span>
                              </button>

                              <div className="dropdown-divider" />

                              <button 
                                type="button"
                                className="dropdown-action-item destructive"
                                onClick={() => {
                                  setOpenMenuLotId(null);
                                  setDeleteError(null);
                                  setLotToDelete(lot);
                                }}
                              >
                                <Trash2 size={14} className="action-item-icon" />
                                <span>Delete Lot</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedLots.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>No lots match the selected search criteria or filters.</p>
                      <button 
                        type="button" 
                        onClick={handleResetFilters} 
                        style={{ marginTop: 10, background: 'none', border: 'none', color: '#b48316', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        Reset filters to view all inventory
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="catalog-pagination-bar">
            <div className="pagination-info">
              Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> lots
            </div>

            <div className="pagination-pagesize">
              <span>Per page:</span>
              <select 
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Items per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="pagination-buttons">
              <button 
                type="button"
                className="btn-page-step"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                <button
                  key={pageNum}
                  type="button"
                  className={`btn-page-num ${pageNum === safeCurrentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                type="button"
                className="btn-page-step"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Lots Grid View */
        <div className="lots-grid">
          {filteredLots.map(lot => {
            const isSold = lot.status === 'sold';
            const isUpcoming = lot.status === 'upcoming';
            const isReserveMet = !isUpcoming && lot.currentBid >= lot.reservePrice;
            const currentAmount = isSold && lot.hammerPrice 
              ? lot.hammerPrice 
              : isUpcoming 
                ? lot.startingBid 
                : lot.currentBid;

            return (
              <div key={lot.id} className="lot-card">
                <div className="lot-image-box">
                  <img src={lot.image} alt={lot.title} />
                  <div className="lot-number-tag">
                    LOT #{lot.lotNumber}
                  </div>
                  <div className="lot-cert-tag">
                    {lot.certification} {lot.grade}
                  </div>
                  <button 
                    className="lot-card-bookmark-btn" 
                    title="Bookmark Lot" 
                    aria-label="Bookmark Lot"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Bookmark size={14} />
                  </button>
                </div>

                <div className="lot-info">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <CategoryBadge category={lot.category} />
                    <LotStatusBadge status={lot.status} />
                  </div>

                  <h3 className="lot-title" style={{ marginTop: 8 }}>{lot.title}</h3>

                  <p className="lot-brief-note">
                    {lot.conditionReport}
                  </p>

                  <div className="lot-bid-details">
                    <div className="bid-data-row">
                      <div className="current-bid-wrap">
                        <span className="bid-label-micro">
                          {isSold ? 'HAMMER PRICE' : isUpcoming ? 'OPENING BID' : 'CURRENT BID'}
                        </span>
                        <span className="current-bid-val">
                          {formatCurrency(currentAmount)}
                        </span>
                      </div>
                      <div className="reserve-wrap">
                        {isSold ? (
                          <span className="reserve-badge reserve-badge-hammered" style={{ padding: '2px 8px', fontSize: 10 }}>
                            <span className="reserve-indicator-dot green" /> Hammered
                          </span>
                        ) : isUpcoming ? (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            Reserve: {formatCurrency(lot.reservePrice)}
                          </span>
                        ) : isReserveMet ? (
                          <span className="reserve-met-badge">
                            <CheckCircle2 size={11} /> RESERVE MET
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            Reserve: {formatCurrency(lot.reservePrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bids-count-meta">
                      <span>{isUpcoming ? '0 Bids Placed' : `${lot.bidsCount || 0} Bids Placed`}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1, fontSize: 12, padding: '9px 10px' }}
                      onClick={() => setSelectedLot(lot)}
                    >
                      View Details
                    </button>

                    {lot.status !== 'sold' && (
                      <button 
                        className="btn btn-gold" 
                        style={{ fontSize: 12, padding: '9px 14px' }}
                        onClick={() => onSendToBlock(lot)}
                        title="Send Lot to Clerking Block"
                      >
                        <Zap size={14} />
                        <span>{lot.status === 'on_block' ? 'On Block' : 'Send Block'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lot Detail Modal */}
      {selectedLot && (
        <div className="modal-overlay" onClick={() => setSelectedLot(null)}>
          <div className="modal-content" style={{ maxWidth: 750 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-serif">Lot #{selectedLot.lotNumber} — Numismatic Specification</h3>
              <button className="icon-btn" onClick={() => setSelectedLot(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-gold-subtle)', background: '#000' }}>
                  <img src={selectedLot.image} alt={selectedLot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-gold">{selectedLot.certification}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-bright)' }}>{selectedLot.grade}</span>
                    {selectedLot.certNumber && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Cert #{selectedLot.certNumber}
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: 17, color: 'var(--text-main)', fontWeight: 600 }}>{selectedLot.title}</h4>

                  <div style={{ background: 'var(--bg-darkest)', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Starting Bid: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(selectedLot.startingBid)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Reserve Price: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(selectedLot.reservePrice)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Presale Estimate: </span>
                      <strong style={{ color: 'var(--gold-light)' }}>{formatCurrency(selectedLot.estimateLow)} - {formatCurrency(selectedLot.estimateHigh)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Current High: </span>
                      <strong style={{ color: 'var(--gold-bright)' }}>{formatCurrency(selectedLot.currentBid)}</strong>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Condition Report</span>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{selectedLot.conditionReport}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Provenance & Pedigree</span>
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{selectedLot.provenance}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-gold" 
                onClick={() => {
                  onSendToBlock(selectedLot);
                  setSelectedLot(null);
                }}
              >
                <Radio size={14} />
                <span>Transmit to Live Clerking Console</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedLot(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Requirement 3) */}
      {lotToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setLotToDelete(null)}>
          <div className="modal-content delete-lot-modal" style={{ maxWidth: 480, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="delete-lot-header">
              <div className="delete-lot-icon-box">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#991b1b', margin: 0 }}>
                  Delete Catalog Lot
                </h3>
                <p style={{ fontSize: 12.5, color: '#b91c1c', margin: '2px 0 0' }}>
                  Permanent removal from auction inventory
                </p>
              </div>
            </div>

            <div className="delete-lot-body">
              <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete <strong>Lot #{lotToDelete.lotNumber}</strong>? This action <strong>cannot be undone</strong> and will permanently delete this lot from the database.
              </p>

              <div className="delete-lot-target-card">
                <img src={lotToDelete.image} alt={lotToDelete.title} />
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#b48316', fontFamily: 'var(--font-mono)' }}>
                    LOT #{lotToDelete.lotNumber}
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lotToDelete.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Current Bid: {formatCurrency(lotToDelete.currentBid)} • Reserve: {formatCurrency(lotToDelete.reservePrice)}
                  </div>
                </div>
              </div>

              {deleteError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setLotToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-danger-delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="spinner" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete Lot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modern 4-Card Lot Form Modal */}
      <LotFormModal
        isOpen={isNewLotModalOpen || !!editingLot}
        onClose={() => {
          setIsNewLotModalOpen(false);
          setEditingLot(null);
        }}
        onSave={async (lotData) => {
          if (editingLot) {
            onUpdateLot(lotData);
          } else {
            onAddLot(lotData);
          }
          setIsNewLotModalOpen(false);
          setEditingLot(null);
        }}
        editingLot={editingLot}
        lots={lots}
        auctions={auctions}
        defaultAuctionId={defaultAuctionId}
        lockAuction={lockAuction}
        consignors={consignors}
        onAddConsignor={onAddConsignor}
      />
    </div>
  );
};
