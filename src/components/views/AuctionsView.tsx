import React, { useState } from 'react';
import { Auction, NavigationSection } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Radio, 
  Upload, 
  Layers, 
  Users, 
  DollarSign, 
  Gavel, 
  Check, 
  X 
} from 'lucide-react';

interface AuctionsViewProps {
  auctions: Auction[];
  selectedAuctionId: string;
  onSelectAuction: (id: string) => void;
  onAddAuction: (auction: Auction) => void;
  onNavigate: (section: NavigationSection) => void;
  onSyncHiBid: () => void;
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({
  auctions,
  selectedAuctionId,
  onSelectAuction,
  onAddAuction,
  onNavigate,
  onSyncHiBid
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('Premier Numismatics & Horology');
  const [newStartDate, setNewStartDate] = useState('2026-11-20');
  const [newEndDate, setNewEndDate] = useState('2026-11-23');
  const [newLocation, setNewLocation] = useState('Gardner Galleries Saleroom & HiBid Simulcast');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCode) return;

    const created: Auction = {
      id: `auc-${Date.now()}`,
      code: newCode.toUpperCase(),
      title: newTitle,
      category: newCategory,
      status: 'cataloging',
      startDate: `${newStartDate}T10:00:00Z`,
      endDate: `${newEndDate}T20:00:00Z`,
      location: newLocation,
      address: '1960 Heritage Way, Suite 400',
      cityStateZip: 'Missoula, MT 59801',
      country: 'United States',
      lotCount: 0,
      checkInCount: 0,
      uniqueSellers: 0,
      presaleMin: 0,
      presaleMax: 0,
      avgEstimate: 0,
      avgSalesPrice: 0,
      buyersPremiumCash: 15.0,
      buyersPremiumCredit: 18.0,
      taxRate: 7.5,
      description: newDesc || 'Fine curated numismatic offerings from private estates.',
      terms: 'All lots sold AS IS, WHERE IS. Standard 15% wire / 18% credit card buyer premium.',
      bpExplanation: '15% for Wire/Cash | 18% for Credit Card',
      taxExemptInfo: 'Dealer resale licenses required for exemption.',
      hibidSyncStatus: 'pending',
      syndications: [
        {
          site: 'www.hibid.com',
          registrations: 0,
          ccAuths: 0,
          views: 0,
          uniqueBidders: 0,
          uniqueBids: 0,
          totalBids: 0,
          highBid: 0,
          maxBid: 0
        },
        {
          site: 'gardner-auction.com (Direct)',
          registrations: 0,
          ccAuths: 0,
          views: 0,
          uniqueBidders: 0,
          uniqueBids: 0,
          totalBids: 0,
          highBid: 0,
          maxBid: 0
        }
      ]
    };

    onAddAuction(created);
    setIsModalOpen(false);
    setNewTitle('');
    setNewCode('');
    setNewDesc('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)' }}>
            Auction Sales & Catalogs
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Schedule auctions, control catalog publishing, and manage HiBid AF360 syndication
          </p>
        </div>

        <button className="btn btn-gold" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Create New Auction</span>
        </button>
      </div>

      {/* Auction List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {auctions.map(auc => {
          const isSelected = auc.id === selectedAuctionId;
          return (
            <div 
              key={auc.id}
              className="syndication-card"
              style={{ 
                borderColor: isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)',
                background: isSelected ? 'rgba(18, 22, 32, 0.95)' : 'var(--bg-card)',
                boxShadow: isSelected ? 'var(--shadow-gold)' : 'var(--shadow-card)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className={`badge badge-${auc.status}`}>
                      {auc.status}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold-light)', fontWeight: 600 }}>
                      {auc.code}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      • {auc.category}
                    </span>
                  </div>

                  <h3 className="font-serif" style={{ fontSize: 19, color: 'var(--text-main)', marginBottom: 8 }}>
                    {auc.title}
                  </h3>

                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                    {auc.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-dim)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={14} color="var(--gold-primary)" />
                      {formatDate(auc.startDate)} – {formatDate(auc.endDate)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={14} color="var(--gold-primary)" />
                      {auc.location}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className={`btn ${isSelected ? 'btn-gold' : 'btn-secondary'}`}
                      style={{ fontSize: 12, padding: '7px 14px' }}
                      onClick={() => onSelectAuction(auc.id)}
                    >
                      {isSelected ? '✓ Selected Context' : 'Set as Active'}
                    </button>
                    {auc.status === 'live' && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: 12, padding: '7px 14px', borderColor: 'var(--gold-primary)', color: 'var(--gold-light)' }}
                        onClick={() => {
                          onSelectAuction(auc.id);
                          onNavigate('live_clerking');
                        }}
                      >
                        <Gavel size={14} />
                        <span>Clerking Console</span>
                      </button>
                    )}
                  </div>

                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    HiBid Status: <strong style={{ color: auc.hibidSyncStatus === 'synced' ? '#10b981' : '#f59e0b' }}>{auc.hibidSyncStatus.toUpperCase()}</strong>
                  </span>
                </div>
              </div>

              {/* Mini Metrics Row */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: 12, 
                marginTop: 20, 
                paddingTop: 16, 
                borderTop: '1px solid var(--border-subtle)' 
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Lots Count</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{auc.lotCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Checked In</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>{auc.checkInCount} Bidders</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Presale Min</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(auc.presaleMin)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Presale Max</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--gold-bright)' }}>{formatCurrency(auc.presaleMax)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Buyer's Premium</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                    {auc.buyersPremiumCash}% Wire / {auc.buyersPremiumCredit}% CC
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Auction Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreate}>
              <div className="modal-header">
                <h3 className="font-serif">Create New Auction Catalog</h3>
                <button type="button" className="icon-btn" onClick={() => setIsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Auction Code *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. GA-2026-DEC-VAULT"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                      <option value="Premier Numismatics & Horology">Premier Numismatics & Horology</option>
                      <option value="Ancient & World Numismatics">Ancient & World Numismatics</option>
                      <option value="Estate Bullion & Gold">Estate Bullion & Gold</option>
                      <option value="Rare Paper Currency">Rare Paper Currency</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Auction Title *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Montana Winter Premier Rare Coin & Gold Bullion Sale"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Start Date (Inspection/Preview)</label>
                    <input 
                      type="date" 
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Close / Live Gavel Date</label>
                    <input 
                      type="date" 
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Saleroom Location</label>
                  <input 
                    type="text" 
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Description & Highlights</label>
                  <textarea 
                    rows={3} 
                    placeholder="Catalog highlights, provenance notes, and featured lots..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  Publish Auction Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
