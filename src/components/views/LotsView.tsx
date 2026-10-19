import React, { useState } from 'react';
import { LotItem, LotCategory } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { 
  Search, 
  Plus, 
  Grid, 
  List, 
  Radio, 
  Tag, 
  Shield, 
  FileText, 
  Check, 
  X,
  ExternalLink,
  ChevronRight,
  Bookmark,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface LotsViewProps {
  lots: LotItem[];
  onAddLot: (lot: LotItem) => void;
  onUpdateLot: (lot: LotItem) => void;
  onSendToBlock: (lot: LotItem) => void;
}

export const LotsView: React.FC<LotsViewProps> = ({
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedLot, setSelectedLot] = useState<LotItem | null>(null);
  const [isNewLotModalOpen, setIsNewLotModalOpen] = useState(false);

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

  const filteredLots = lots.filter(lot => {
    const matchesSearch = 
      lot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.lotNumber.toString().includes(searchTerm) ||
      (lot.certNumber && lot.certNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lot.grade.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || lot.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)' }}>
            Lot Catalog & Numismatic Inventory
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Item photography, certified grading criteria (PCGS/NGC), reserve ceilings, and condition records
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-darkest)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button 
              className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
              style={{ width: 34, height: 34, background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent', border: 'none' }}
              onClick={() => setViewMode('grid')}
              title="Grid Cards"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`icon-btn ${viewMode === 'table' ? 'active' : ''}`}
              style={{ width: 34, height: 34, background: viewMode === 'table' ? 'var(--bg-card)' : 'transparent', border: 'none' }}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>

          <button className="btn btn-gold" onClick={() => setIsNewLotModalOpen(true)}>
            <Plus size={16} />
            <span>Add Catalog Lot</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div className="input-search-wrapper" style={{ flex: 1, minWidth: 240 }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search title, lot #, PCGS cert, grade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ background: 'var(--bg-darkest)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
        >
          <option value="all">All Categories</option>
          <option value="Rare US Gold">Rare US Gold</option>
          <option value="Fine Silver & Morgan Dollars">Fine Silver & Morgan Dollars</option>
          <option value="Estate Jewelry & Watches">Estate Jewelry & Watches</option>
          <option value="Ancient & World Numismatics">Ancient & World Numismatics</option>
        </select>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: 'var(--bg-darkest)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
        >
          <option value="all">All Statuses</option>
          <option value="on_block">On Block (Live)</option>
          <option value="upcoming">Upcoming</option>
          <option value="sold">Sold (Hammered)</option>
          <option value="passed">Passed</option>
        </select>
      </div>

      {/* Lots Grid View */}
      {viewMode === 'grid' ? (
        <div className="lots-grid">
          {filteredLots.map(lot => {
            const isReserveMet = lot.currentBid >= lot.reservePrice;
            const currentAmount = lot.status === 'sold' && lot.hammerPrice ? lot.hammerPrice : lot.currentBid;
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="lot-category">{lot.category}</div>
                    <span className={`badge badge-${lot.status === 'on_block' ? 'live' : lot.status === 'sold' ? 'gold' : 'preview'}`}>
                      {lot.status === 'on_block' ? 'ON BLOCK' : lot.status}
                    </span>
                  </div>

                  <h3 className="lot-title">{lot.title}</h3>

                  <p className="lot-brief-note">
                    {lot.conditionReport}
                  </p>

                  <div className="lot-bid-details">
                    <div className="bid-data-row">
                      <div className="current-bid-wrap">
                        <span className="bid-label-micro">
                          {lot.status === 'sold' ? 'HAMMER PRICE' : 'CURRENT BID'}
                        </span>
                        <span className="current-bid-val">
                          {formatCurrency(currentAmount)}
                        </span>
                      </div>
                      <div className="reserve-wrap">
                        {isReserveMet ? (
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
                      <span>{lot.bidsCount || 0} Bids Placed</span>
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
      ) : (
        /* Table View */
        <div className="table-wrapper">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Lot #</th>
                <th>Item Title & Certification</th>
                <th>Category</th>
                <th>Consignor</th>
                <th style={{ textAlign: 'right' }}>Starting</th>
                <th style={{ textAlign: 'right' }}>Reserve</th>
                <th style={{ textAlign: 'right' }}>Estimate</th>
                <th style={{ textAlign: 'right' }}>High Bid</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.map(lot => (
                <tr key={lot.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-primary)' }}>
                    #{lot.lotNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lot.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--gold-light)' }}>
                      {lot.certification} • {lot.grade} {lot.certNumber ? `(Cert #${lot.certNumber})` : ''}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lot.category}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{lot.consignorName}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(lot.startingBid)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(lot.reservePrice)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(lot.estimateLow)} - {formatCurrency(lot.estimateHigh)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--gold-bright)', fontWeight: 700 }}>
                    {formatCurrency(lot.status === 'sold' && lot.hammerPrice ? lot.hammerPrice : lot.currentBid)}
                  </td>
                  <td>
                    <span className={`badge badge-${lot.status === 'on_block' ? 'live' : lot.status === 'sold' ? 'gold' : 'preview'}`}>
                      {lot.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => setSelectedLot(lot)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* New Lot Modal */}
      {isNewLotModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewLotModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateLot}>
              <div className="modal-header">
                <h3 className="font-serif">Catalog New Numismatic Lot</h3>
                <button type="button" className="icon-btn" onClick={() => setIsNewLotModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Lot Number</label>
                    <input 
                      type="number" 
                      placeholder="Auto"
                      value={newLotNum}
                      onChange={(e) => setNewLotNum(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as LotCategory)}>
                      <option value="Rare US Gold">Rare US Gold</option>
                      <option value="Fine Silver & Morgan Dollars">Fine Silver & Morgan Dollars</option>
                      <option value="Ancient & World Numismatics">Ancient & World Numismatics</option>
                      <option value="Rare Paper Currency">Rare Paper Currency</option>
                      <option value="Estate Jewelry & Watches">Estate Jewelry & Watches</option>
                      <option value="Historic Bullion">Historic Bullion</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Lot Title / Description Header *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 1895 Morgan Silver Dollar Proof-65 Ultra Cameo"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Certification Service</label>
                    <select value={newCert} onChange={(e) => setNewCert(e.target.value as any)}>
                      <option value="PCGS">PCGS (Professional Coin Grading Service)</option>
                      <option value="NGC">NGC (Numismatic Guaranty Company)</option>
                      <option value="CAC">CAC Certified</option>
                      <option value="ANACS">ANACS</option>
                      <option value="GIA">GIA (Jewelry/Watches)</option>
                      <option value="Raw">Raw / Uncertified</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assigned Grade</label>
                    <input 
                      type="text" 
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div className="form-group">
                    <label>Start Bid ($)</label>
                    <input 
                      type="number" 
                      value={newStartBid}
                      onChange={(e) => setNewStartBid(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Reserve ($)</label>
                    <input 
                      type="number" 
                      value={newReserve}
                      onChange={(e) => setNewReserve(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Est. Low ($)</label>
                    <input 
                      type="number" 
                      value={newEstLow}
                      onChange={(e) => setNewEstLow(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Est. High ($)</label>
                    <input 
                      type="number" 
                      value={newEstHigh}
                      onChange={(e) => setNewEstHigh(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Lot Artwork / Image</label>
                  <select value={newImage} onChange={(e) => setNewImage(e.target.value)}>
                    <option value="/assets/gold-coin.jpg">1907 Saint-Gaudens High Relief Gold</option>
                    <option value="/assets/silver-dollar.jpg">1881-S Morgan Silver Dollar Prooflike</option>
                    <option value="/assets/rolex-watch.jpg">Vintage 1978 Rolex Submariner 18k Gold</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Condition Report</label>
                  <textarea 
                    rows={2} 
                    placeholder="Surface preservation, luster, strike quality, contact marks..."
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewLotModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
