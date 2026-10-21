import React, { useState, useEffect } from 'react';
import { LotItem, LotCategory, LotStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { lotsService } from '../../services/lotsService';
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
}

export const LotsView: React.FC<LotsViewProps> = ({
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock,
  onDeleteLot
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
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<LotCategory>('Rare US Gold');
  const [editLotNum, setEditLotNum] = useState('');
  const [editStartBid, setEditStartBid] = useState('');
  const [editReserve, setEditReserve] = useState('');
  const [editEstLow, setEditEstLow] = useState('');
  const [editEstHigh, setEditEstHigh] = useState('');
  const [editCert, setEditCert] = useState<'PCGS' | 'NGC' | 'CAC' | 'ANACS' | 'Raw' | 'GIA'>('PCGS');
  const [editGrade, setEditGrade] = useState('');
  const [editCondition, setEditCondition] = useState('');
  const [editProvenance, setEditProvenance] = useState('');
  const [editConsignor, setEditConsignor] = useState('');
  const [editImage, setEditImage] = useState('/assets/gold-coin.jpg');

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

  // New Lot Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<LotCategory>('Rare US Gold');
  const [newLotNum, setNewLotNum] = useState('');
  const [newStartBid, setNewStartBid] = useState('10000');
  const [newReserve, setNewReserve] = useState('15000');
  const [newEstLow, setNewEstLow] = useState('18000');
  const [newEstHigh, setNewEstHigh] = useState('25000');
  const [newCert, setNewCert] = useState<'PCGS' | 'NGC' | 'CAC' | 'ANACS' | 'Raw' | 'GIA'>('PCGS');
  const [newGrade, setNewGrade] = useState('MS-65 Gem Uncirculated');
  const [newCondition, setNewCondition] = useState('');
  const [newProvenance, setNewProvenance] = useState('');
  const [newConsignor, setNewConsignor] = useState('Estate of Henry Vance');
  const [newImage, setNewImage] = useState('/assets/gold-coin.jpg');

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

  // Create Lot Handler
  const handleCreateLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const nextLotNum = newLotNum ? parseInt(newLotNum) : Math.max(...lots.map(l => l.lotNumber), 100) + 1;

    const created: LotItem = {
      id: `lot-${Date.now()}`,
      auctionId: 'auc-001',
      lotNumber: nextLotNum,
      title: newTitle,
      category: newCategory,
      image: newImage,
      startingBid: parseFloat(newStartBid) || 5000,
      reservePrice: parseFloat(newReserve) || 8000,
      estimateLow: parseFloat(newEstLow) || 10000,
      estimateHigh: parseFloat(newEstHigh) || 15000,
      currentBid: parseFloat(newStartBid) || 5000,
      highBidderPaddle: null,
      highBidderName: null,
      status: 'upcoming',
      certification: newCert,
      grade: newGrade,
      certNumber: `${Math.floor(10000000 + Math.random() * 89999999)}`,
      consignorId: 'c-01',
      consignorName: newConsignor,
      conditionReport: newCondition || 'High-grade state of preservation with excellent surface luster.',
      provenance: newProvenance || 'Private Collector Vault Dispersion, Gardner Certified.',
      bidsCount: 0
    };

    onAddLot(created);
    setIsNewLotModalOpen(false);
    setNewTitle('');
    setNewLotNum('');
    setNewCondition('');
  };

  // Start Edit Handler
  const handleStartEdit = (lot: LotItem) => {
    setEditingLot(lot);
    setEditTitle(lot.title);
    setEditCategory(lot.category);
    setEditLotNum(lot.lotNumber.toString());
    setEditStartBid(lot.startingBid.toString());
    setEditReserve(lot.reservePrice.toString());
    setEditEstLow(lot.estimateLow.toString());
    setEditEstHigh(lot.estimateHigh.toString());
    setEditCert((lot.certification || 'PCGS') as any);
    setEditGrade(lot.grade || 'MS-65 Gem Uncirculated');
    setEditCondition(lot.conditionReport || '');
    setEditProvenance(lot.provenance || '');
    setEditConsignor(lot.consignorName || 'Estate Consignor');
    setEditImage(lot.image || '/assets/gold-coin.jpg');
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLot || !editTitle) return;

    const updated: LotItem = {
      ...editingLot,
      lotNumber: parseInt(editLotNum) || editingLot.lotNumber,
      title: editTitle,
      category: editCategory,
      image: editImage,
      startingBid: parseFloat(editStartBid) || editingLot.startingBid,
      reservePrice: parseFloat(editReserve) || editingLot.reservePrice,
      estimateLow: parseFloat(editEstLow) || editingLot.estimateLow,
      estimateHigh: parseFloat(editEstHigh) || editingLot.estimateHigh,
      certification: editCert,
      grade: editGrade,
      conditionReport: editCondition,
      provenance: editProvenance,
      consignorName: editConsignor,
    };

    onUpdateLot(updated);
    await lotsService.updateLot(updated.id, updated);
    setEditingLot(null);
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

      {/* Edit Lot Modal (Requirement 3) */}
      {editingLot && (
        <div className="modal-overlay" onClick={() => setEditingLot(null)}>
          <div className="modal-content catalog-lot-modal" style={{ maxWidth: 760, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
              <div className="modal-header" style={{ padding: '20px 26px', background: 'linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="catalog-modal-crest">
                    <Edit3 size={20} color="#b48316" />
                  </div>
                  <div>
                    <h3 className="font-serif" style={{ fontSize: 20, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                      Edit Lot #{editingLot.lotNumber}
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                      Update numismatic specifications, appraisal boundaries, and catalog details.
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="icon-btn" 
                  onClick={() => setEditingLot(null)}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
                {/* SECTION 1: Item Identification & Category */}
                <div className="catalog-form-section">
                  <div className="catalog-section-eyebrow">
                    <Layers size={14} color="#b48316" />
                    <span>ITEM IDENTIFICATION & CATEGORY</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label>Lot Number *</label>
                      <input 
                        type="number" 
                        required
                        value={editLotNum}
                        onChange={(e) => setEditLotNum(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Category Department *</label>
                      <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as LotCategory)}>
                        <option value="Rare US Gold">Rare US Gold (Historical Coinage)</option>
                        <option value="Fine Silver & Morgan Dollars">Fine Silver & Morgan Dollars</option>
                        <option value="Ancient & World Numismatics">Ancient & World Numismatics</option>
                        <option value="Rare Paper Currency">Rare Paper Currency & Banknotes</option>
                        <option value="Estate Jewelry & Watches">Estate Jewelry & Luxury Watches</option>
                        <option value="Historic Bullion">Historic Bullion & Ingot Bars</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Lot Title / Description Header *</label>
                    <input 
                      type="text" 
                      required 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                </div>

                {/* SECTION 2: Authentication & Official Grading */}
                <div className="catalog-form-section">
                  <div className="catalog-section-eyebrow">
                    <Award size={14} color="#b48316" />
                    <span>AUTHENTICATION & OFFICIAL GRADING</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label>Grading Service / Authority</label>
                      <select value={editCert} onChange={(e) => setEditCert(e.target.value as any)}>
                        <option value="PCGS">PCGS (Professional Coin Grading Service)</option>
                        <option value="NGC">NGC (Numismatic Guaranty Company)</option>
                        <option value="CAC">CAC (Certified Acceptance Corporation)</option>
                        <option value="GIA">GIA (Gemological Institute of America)</option>
                        <option value="ANACS">ANACS (America's Oldest Grading Service)</option>
                        <option value="Raw">Raw / Uncertified (In-House Authenticated)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Assigned Grade</label>
                      <input 
                        type="text" 
                        value={editGrade}
                        onChange={(e) => setEditGrade(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Pricing & Reserve */}
                <div className="catalog-form-section pricing-highlight-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div className="catalog-section-eyebrow" style={{ color: '#0f172a' }}>
                      <DollarSign size={15} color="#b48316" />
                      <span>PRICING, APPRAISAL & RESERVE RULES</span>
                    </div>
                    <span className="usd-currency-pill">CURRENCY: USD ($)</span>
                  </div>

                  <div className="pricing-grid-4col">
                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Opening Bid ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          value={editStartBid}
                          onChange={(e) => setEditStartBid(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Reserve Price ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          value={editReserve}
                          onChange={(e) => setEditReserve(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Estimate Low ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          value={editEstLow}
                          onChange={(e) => setEditEstLow(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Estimate High ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          value={editEstHigh}
                          onChange={(e) => setEditEstHigh(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Artwork & Condition */}
                <div className="catalog-form-section">
                  <div className="catalog-section-eyebrow">
                    <Camera size={14} color="#b48316" />
                    <span>PHOTOGRAPHY & CONDITION REPORT</span>
                  </div>

                  <div className="form-group">
                    <label>Catalog Item Artwork / Photo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div className="lot-modal-preview-thumb">
                        <img src={editImage} alt="Selected preview" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <select value={editImage} onChange={(e) => setEditImage(e.target.value)}>
                          <option value="/assets/gold-coin.jpg">1907 Saint-Gaudens High Relief Gold Coin</option>
                          <option value="/assets/silver-dollar.jpg">1881-S Morgan Silver Dollar Prooflike</option>
                          <option value="/assets/rolex-watch.jpg">Vintage 1978 Rolex Submariner 18k Yellow Gold</option>
                          <option value="/images/gold_bullion.jpg">Credit Suisse 1 Kilo Fine Gold Ingot Bar</option>
                          <option value="/images/diamond_ring.jpg">GIA Certified Estate Diamond Solitaire Ring</option>
                          <option value="/images/antique_silver.jpg">Victorian Repoussé Sterling Silver 5-Piece Service</option>
                          <option value="/images/grandfather_clock.jpg">Chippendale Walnut Tall Case Moon Dial Clock</option>
                          <option value="/images/gorson_painting.jpg">A.H. Gorson 'Golden Monongahela' Oil on Canvas</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Physical Condition Report</label>
                    <textarea 
                      rows={2} 
                      value={editCondition}
                      onChange={(e) => setEditCondition(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 26px', background: '#fafaf8', borderTop: '1.5px solid #eae5dc', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingLot(null)}
                  style={{ padding: '10px 22px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-gold"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  <Check size={16} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Lot Modal */}
      {isNewLotModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewLotModalOpen(false)}>
          <div className="modal-content catalog-lot-modal" style={{ maxWidth: 760, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
              {/* Luxury Header */}
              <div className="modal-header" style={{ padding: '20px 26px', background: 'linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="catalog-modal-crest">
                    <Tag size={20} color="#b48316" />
                  </div>
                  <div>
                    <h3 className="font-serif" style={{ fontSize: 20, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                      Catalog New Numismatic Lot
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                      Enter lot details, grading certification, and appraisal estimates for auction cataloging.
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="icon-btn" 
                  onClick={() => setIsNewLotModalOpen(false)}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
                {/* SECTION 1: Item Identification & Category */}
                <div className="catalog-form-section">
                  <div className="catalog-section-eyebrow">
                    <Layers size={14} color="#b48316" />
                    <span>ITEM IDENTIFICATION & CATEGORY</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label>Lot Number</label>
                      <input 
                        type="number" 
                        placeholder="Auto (#)"
                        value={newLotNum}
                        onChange={(e) => setNewLotNum(e.target.value)}
                      />
                      <span className="field-hint">Auto-assigned if left blank</span>
                    </div>

                    <div className="form-group">
                      <label>Category Department *</label>
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as LotCategory)}>
                        <option value="Rare US Gold">Rare US Gold (Historical Coinage)</option>
                        <option value="Fine Silver & Morgan Dollars">Fine Silver & Morgan Dollars</option>
                        <option value="Ancient & World Numismatics">Ancient & World Numismatics</option>
                        <option value="Rare Paper Currency">Rare Paper Currency & Banknotes</option>
                        <option value="Estate Jewelry & Watches">Estate Jewelry & Luxury Watches</option>
                        <option value="Historic Bullion">Historic Bullion & Ingot Bars</option>
                      </select>
                      <span className="field-hint">Department group for catalog & website filter</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Lot Title / Description Header *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. 1907 Saint-Gaudens Double Eagle $20 High Relief, Wire Rim"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <span className="field-hint">Main headline shown to all bidders on website and floor catalog</span>
                  </div>
                </div>

                {/* SECTION 2: Authentication & Official Grading */}
                <div className="catalog-form-section">
                  <div className="catalog-section-eyebrow">
                    <Award size={14} color="#b48316" />
                    <span>AUTHENTICATION & OFFICIAL GRADING</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label>Grading Service / Authority</label>
                      <select value={newCert} onChange={(e) => setNewCert(e.target.value as any)}>
                        <option value="PCGS">PCGS (Professional Coin Grading Service)</option>
                        <option value="NGC">NGC (Numismatic Guaranty Company)</option>
                        <option value="CAC">CAC (Certified Acceptance Corporation)</option>
                        <option value="GIA">GIA (Gemological Institute of America)</option>
                        <option value="ANACS">ANACS (America's Oldest Grading Service)</option>
                        <option value="Raw">Raw / Uncertified (In-House Authenticated)</option>
                      </select>
                      <span className="field-hint">Official third-party authentication slab</span>
                    </div>

                    <div className="form-group">
                      <label>Assigned Grade</label>
                      <input 
                        type="text" 
                        placeholder="e.g. MS-65 Gem Uncirculated"
                        value={newGrade}
                        onChange={(e) => setNewGrade(e.target.value)}
                      />
                      <span className="field-hint">Condition score (e.g. MS-65, Proof-68, Choice AU)</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Valuation, Reserve & Bidding */}
                <div className="catalog-form-section pricing-highlight-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div className="catalog-section-eyebrow" style={{ color: '#0f172a' }}>
                      <DollarSign size={15} color="#b48316" />
                      <span>PRICING, APPRAISAL & RESERVE RULES</span>
                    </div>
                    <span className="usd-currency-pill">CURRENCY: USD ($)</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 14px' }}>
                    Set the starting price, the secret reserve minimum, and expert valuation boundaries.
                  </p>

                  <div className="pricing-grid-4col">
                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Opening Bid ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="5,000"
                          value={newStartBid}
                          onChange={(e) => setNewStartBid(e.target.value)}
                        />
                      </div>
                      <span className="field-hint">First bid amount when auction opens</span>
                    </div>

                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Reserve Price ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="8,000"
                          value={newReserve}
                          onChange={(e) => setNewReserve(e.target.value)}
                        />
                      </div>
                      <span className="field-hint">Secret minimum price — won't sell below this</span>
                    </div>

                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Estimate Low ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="10,000"
                          value={newEstLow}
                          onChange={(e) => setNewEstLow(e.target.value)}
                        />
                      </div>
                      <span className="field-hint">Conservative expert appraisal value</span>
                    </div>

                    <div className="form-group">
                      <label style={{ color: '#0f172a' }}>Estimate High ($)</label>
                      <div className="currency-input-wrap">
                        <span className="currency-prefix">$</span>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="15,000"
                          value={newEstHigh}
                          onChange={(e) => setNewEstHigh(e.target.value)}
                        />
                      </div>
                      <span className="field-hint">Top expected market hammer value</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Photography & Condition Report */}
                <div className="catalog-form-section">
                  <div className="catalog-section-eyebrow">
                    <Camera size={14} color="#b48316" />
                    <span>PHOTOGRAPHY & CONDITION REPORT</span>
                  </div>

                  <div className="form-group">
                    <label>Catalog Item Artwork / Photo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div className="lot-modal-preview-thumb">
                        <img src={newImage} alt="Selected preview" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <select value={newImage} onChange={(e) => setNewImage(e.target.value)}>
                          <option value="/assets/gold-coin.jpg">1907 Saint-Gaudens High Relief Gold Coin</option>
                          <option value="/assets/silver-dollar.jpg">1881-S Morgan Silver Dollar Prooflike</option>
                          <option value="/assets/rolex-watch.jpg">Vintage 1978 Rolex Submariner 18k Yellow Gold</option>
                          <option value="/images/gold_bullion.jpg">Credit Suisse 1 Kilo Fine Gold Ingot Bar</option>
                          <option value="/images/diamond_ring.jpg">GIA Certified Estate Diamond Solitaire Ring</option>
                          <option value="/images/antique_silver.jpg">Victorian Repoussé Sterling Silver 5-Piece Service</option>
                          <option value="/images/grandfather_clock.jpg">Chippendale Walnut Tall Case Moon Dial Clock</option>
                          <option value="/images/gorson_painting.jpg">A.H. Gorson 'Golden Monongahela' Oil on Canvas</option>
                        </select>
                        <span className="field-hint" style={{ marginTop: 4, display: 'block' }}>
                          Verified high-resolution museum archival image shown in public catalog
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Physical Condition Report</label>
                    <textarea 
                      rows={2} 
                      placeholder="e.g. Radiant satiny roman gold luster, flawless strike, sharp wire rim definition, no contact marks or hairlines."
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                    />
                    <span className="field-hint">Detailed assessment visible to prospective bidders on the item detail page</span>
                  </div>
                </div>
              </div>

              {/* Luxury Footer */}
              <div className="modal-footer" style={{ padding: '16px 26px', background: '#fafaf8', borderTop: '1.5px solid #eae5dc', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexShrink: 0, position: 'sticky', bottom: 0, zIndex: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsNewLotModalOpen(false)}
                  style={{ padding: '10px 22px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-gold"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  <Check size={16} />
                  <span>Save to Catalog</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
