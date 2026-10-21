import React, { useState } from 'react';
import { useAuctionDetail } from '../../../context/AuctionDetailContext';
import { PreAuctionSubTab, FeaturedImage, AuctionLink, AuctionExpense } from '../../../types/auctionDetail';
import { FormField } from '../../Common/FormField';
import { SearchableSelect } from '../../Common/SearchableSelect';
import { FormModal } from '../../Common/FormModal';
import { ConfirmModal } from '../../Common/ConfirmModal';
import { LotsView } from '../../views/LotsView';
import { LotItem } from '../../../types';
import { 
  Upload, 
  Trash2, 
  Edit3, 
  Plus, 
  HelpCircle, 
  Lock, 
  Image as ImageIcon, 
  FileText, 
  Calendar, 
  Clock, 
  ExternalLink,
  DollarSign,
  AlertCircle,
  Move
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface PreAuctionTabProps {
  currentTab: PreAuctionSubTab;
  onSelectTab: (tab: PreAuctionSubTab) => void;
  lots: LotItem[];
  onAddLot: (lot: LotItem) => void;
  onUpdateLot: (lot: LotItem) => void;
  onSendToBlock: (lot: LotItem) => void;
  onDeleteLot: (id: string) => Promise<any>;
}

export const PreAuctionTab: React.FC<PreAuctionTabProps> = ({
  currentTab,
  onSelectTab,
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock,
  onDeleteLot
}) => {
  const { state, dispatch, errors } = useAuctionDetail();
  const auction = state.data;

  // Modals for Details Tab
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');

  // Modals for New Lot Defaults
  const [isCreateOptionModalOpen, setIsCreateOptionModalOpen] = useState(false);
  const [createOptionTarget, setCreateOptionTarget] = useState<string>('');
  const [newOptionCode, setNewOptionCode] = useState('');
  const [newOptionDesc, setNewOptionDesc] = useState('');

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvTarget, setCsvTarget] = useState<string>('');

  // Expenses Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  if (!auction) return null;

  // Filter lots to this auction
  const filteredAuctionLots = lots.filter(l => 
    !l.auctionId || l.auctionId === auction.id || l.auctionId === 'auc-001'
  );

  // Link Handlers
  const handleOpenLinkModal = (index?: number) => {
    if (typeof index === 'number') {
      setEditingLinkIndex(index);
      setLinkUrl(auction.auctionLinks[index].url);
      setLinkDesc(auction.auctionLinks[index].description);
    } else {
      setEditingLinkIndex(null);
      setLinkUrl('');
      setLinkDesc('');
    }
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    if (editingLinkIndex !== null) {
      dispatch({
        type: 'UPDATE_AUCTION_LINK',
        index: editingLinkIndex,
        link: { id: auction.auctionLinks[editingLinkIndex].id, url: linkUrl, description: linkDesc }
      });
    } else {
      dispatch({
        type: 'ADD_AUCTION_LINK',
        link: { id: `link-${Date.now()}`, url: linkUrl, description: linkDesc || 'Catalog Link' }
      });
    }
    setIsLinkModalOpen(false);
  };

  // Add Option Handler
  const handleSaveOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionCode.trim()) return;
    const fullOption = `${newOptionCode} - ${newOptionDesc || newOptionCode}`;
    dispatch({
      type: 'UPDATE_LOT_DEFAULTS',
      field: createOptionTarget,
      value: fullOption
    });
    setIsCreateOptionModalOpen(false);
    setNewOptionCode('');
    setNewOptionDesc('');
  };

  // Expenses Handler
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || !expAmount) return;

    dispatch({
      type: 'ADD_EXPENSE',
      expense: {
        id: `exp-${Date.now()}`,
        description: expDesc,
        vendor: expVendor || 'Saleroom Vendor',
        amount: parseFloat(expAmount) || 0,
        date: expDate
      }
    });

    setIsExpenseModalOpen(false);
    setExpDesc('');
    setExpVendor('');
    setExpAmount('');
  };

  // Simulated drag-to-reorder for featured images
  const moveImage = (index: number, direction: 'up' | 'down') => {
    const list = [...auction.featuredImages];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    dispatch({ type: 'REORDER_FEATURED_IMAGES', images: list });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Sub-tabs bar matching existing tab style */}
      <div className="af360-tabs" style={{ marginBottom: 4 }}>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'details' ? 'active' : ''}`}
          onClick={() => onSelectTab('details')}
        >
          Details
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'upload-settings' ? 'active' : ''}`}
          onClick={() => onSelectTab('upload-settings')}
        >
          Upload Settings
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'preview' ? 'active' : ''}`}
          onClick={() => onSelectTab('preview')}
        >
          Preview
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'lots' ? 'active' : ''}`}
          onClick={() => onSelectTab('lots')}
        >
          Lots ({filteredAuctionLots.length})
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'lot-images' ? 'active' : ''}`}
          onClick={() => onSelectTab('lot-images')}
        >
          Lot Images
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'expenses' ? 'active' : ''}`}
          onClick={() => onSelectTab('expenses')}
        >
          Expenses ({auction.expenses.length})
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: DETAILS (Two-column layout matching reference screenshot)
          ========================================================================= */}
      {currentTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card: Auction Information */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                Auction Information
              </h3>

              {/* Auction Type radios */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', minWidth: 100 }}>
                  Auction Type
                </span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="radio"
                    name="auctionType"
                    checked={auction.auctionType === 'HiBid'}
                    onChange={() => dispatch({ type: 'UPDATE_FIELD', field: 'auctionType', value: 'HiBid' })}
                  />
                  <span style={{ fontWeight: 600, color: '#0369a1' }}>HiBid</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="radio"
                    name="auctionType"
                    checked={auction.auctionType === 'Other Auctions'}
                    onChange={() => dispatch({ type: 'UPDATE_FIELD', field: 'auctionType', value: 'Other Auctions' })}
                  />
                  <span>Other Auctions</span>
                </label>
              </div>

              {/* Auction Code */}
              <FormField label="Auction Code">
                <input 
                  type="text"
                  value={auction.code}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'code', value: e.target.value.toUpperCase() })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
              </FormField>

              {/* Name */}
              <FormField label="Name" required error={errors.name}>
                <input 
                  type="text"
                  value={auction.name}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'name', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
              </FormField>

              {/* Description */}
              <FormField label="Description">
                <textarea 
                  rows={4}
                  value={auction.description}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'description', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>

              {/* Payment Information */}
              <FormField label="Payment Information">
                <textarea 
                  rows={2}
                  value={auction.paymentInfo}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'paymentInfo', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Start Date" required error={errors.startDate}>
                  <input 
                    type="date"
                    value={auction.startDate}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'startDate', value: e.target.value })}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
                <FormField label="End Date" required error={errors.endDate}>
                  <input 
                    type="date"
                    value={auction.endDate}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'endDate', value: e.target.value })}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
              </div>

              {/* Tax Exempt All Checkbox */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={auction.taxExemptAll}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'taxExemptAll', value: e.target.checked })}
                  />
                  <span>Tax Exempt All</span>
                </label>
              </div>

              {/* Currency & Live Starting Bid Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Currency" required error={errors.currency}>
                  <select 
                    value={auction.currency}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'currency', value: e.target.value })}
                    className="catalog-filter-select"
                    style={{ width: '100%', height: 36 }}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </FormField>

                <FormField label="Live Starting Bid Card Number">
                  <input 
                    type="number"
                    value={auction.liveStartingBidCard}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'liveStartingBidCard', value: parseInt(e.target.value) || 1 })}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
              </div>

              {/* Terms and Conditions */}
              <FormField label="Terms And Conditions">
                <textarea 
                  rows={4}
                  value={auction.terms}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'terms', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>

              {/* Short BP Explanation */}
              <FormField label="Short BP Explanation">
                <input 
                  type="text"
                  placeholder="e.g. 15% Buyer's Premium"
                  value={auction.shortBpExplanation}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'shortBpExplanation', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
              </FormField>

              {/* Address 1 & 2 */}
              <FormField label="Address1">
                <input 
                  type="text"
                  value={auction.address1}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'address1', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
              </FormField>
              <FormField label="Address2">
                <input 
                  type="text"
                  value={auction.address2}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'address2', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
              </FormField>

              {/* City / State / Zip in one row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <FormField label="City">
                  <input 
                    type="text"
                    value={auction.city}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'city', value: e.target.value })}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
                <FormField label="State">
                  <input 
                    type="text"
                    value={auction.state}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'state', value: e.target.value })}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
                <FormField label="Zip">
                  <input 
                    type="text"
                    value={auction.zip}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'zip', value: e.target.value })}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
              </div>

              {/* Country */}
              <FormField label="Country">
                <select 
                  value={auction.country}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'country', value: e.target.value })}
                  className="catalog-filter-select"
                  style={{ width: '100%', height: 36 }}
                >
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                </select>
              </FormField>

              {/* Consolidated Invoicing Checkbox */}
              <div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={auction.useConsolidatedInvoicing}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'useConsolidatedInvoicing', value: e.target.checked })}
                  />
                  <span>Use Consolidated Invoicing (Seller & Buyer Invoices)</span>
                </label>
              </div>
            </div>

            {/* Card: Shipping/Buyer Charges */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                Shipping/Buyer Charges
              </h3>

              <FormField label="Availability">
                <select 
                  value={auction.shippingAvailability}
                  onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'shippingAvailability', value: e.target.value })}
                  className="catalog-filter-select"
                  style={{ width: '100%', height: 36 }}
                >
                  <option value="Shipping Offered On All Lots">Shipping Offered On All Lots</option>
                  <option value="Selected Lots Only">Selected Lots Only</option>
                  <option value="No Shipping">No Shipping</option>
                </select>
              </FormField>

              <FormField label="Account">
                <input 
                  type="text"
                  placeholder="e.g. shipping & handling"
                  value={auction.shippingAccount}
                  onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'shippingAccount', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
              </FormField>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={auction.addHandlingCharge}
                    onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'addHandlingCharge', value: e.target.checked })}
                  />
                  <span>Add Handling Charge</span>
                </label>
              </div>

              {auction.addHandlingCharge && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#fcfbf9', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Handling Charge Type</label>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <input 
                          type="radio"
                          name="handlingType"
                          checked={auction.handlingChargeType === 'Fixed'}
                          onChange={() => dispatch({ type: 'UPDATE_SHIPPING', field: 'handlingChargeType', value: 'Fixed' })}
                        />
                        <span>Fixed</span>
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <input 
                          type="radio"
                          name="handlingType"
                          checked={auction.handlingChargeType === 'Percentage'}
                          onChange={() => dispatch({ type: 'UPDATE_SHIPPING', field: 'handlingChargeType', value: 'Percentage' })}
                        />
                        <span>Percentage</span>
                      </label>
                    </div>
                  </div>

                  <FormField label={auction.handlingChargeType === 'Fixed' ? 'Fixed Amount ($)' : 'Percentage (%)'}>
                    <input 
                      type="number"
                      step="0.01"
                      value={auction.handlingAmount}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'handlingAmount', value: parseFloat(e.target.value) || 0 })}
                      className="catalog-search-input"
                      style={{ width: '100%', height: 36 }}
                    />
                  </FormField>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card: Featured Images */}
            <div className="syndication-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Featured Images
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
                  {auction.featuredImages.length} images
                </span>
              </div>

              {/* Drag and Drop Zone matching screenshot */}
              <div 
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 8,
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#fcfbf9',
                  cursor: 'pointer',
                  marginBottom: 14
                }}
                onClick={() => {
                  // Simulate image addition from public assets
                  const sampleImages = ['/images/hero_coin.jpg', '/images/morgan_dollar.jpg', '/images/gold_bullion.jpg', '/images/antique_silver.jpg'];
                  const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
                  dispatch({
                    type: 'ADD_FEATURED_IMAGE',
                    image: {
                      id: `img-${Date.now()}`,
                      url: randomImg,
                      title: `Featured Lot Image #${auction.featuredImages.length + 1}`,
                      order: auction.featuredImages.length + 1
                    }
                  });
                }}
              >
                <Upload size={24} color="var(--gold-primary)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                  Drop Files here to upload. Clicking this button allows to browse my computer for a file.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsTipsModalOpen(true)}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Tips & Tricks
                </button>
              </div>

              {/* Thumbnail grid with remove & reorder (4 sample coin images) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {auction.featuredImages.map((img, idx) => (
                  <div 
                    key={img.id}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  >
                    <div style={{ height: 80, width: '100%', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={img.url} 
                        alt={img.title}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fcfbf9' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {idx > 0 && (
                          <button 
                            type="button" 
                            onClick={() => moveImage(idx, 'up')}
                            style={{ background: 'none', border: 'none', fontSize: 10, cursor: 'pointer' }}
                            title="Move Left"
                          >
                            ◀
                          </button>
                        )}
                        {idx < auction.featuredImages.length - 1 && (
                          <button 
                            type="button" 
                            onClick={() => moveImage(idx, 'down')}
                            style={{ background: 'none', border: 'none', fontSize: 10, cursor: 'pointer' }}
                            title="Move Right"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => dispatch({ type: 'REMOVE_FEATURED_IMAGE', id: img.id })}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2 }}
                        title="Remove image"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card: Auction Links */}
            <div className="syndication-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Auction Links
                </h3>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => handleOpenLinkModal()}
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  <Plus size={14} />
                  <span>+ New Link</span>
                </button>
              </div>

              {auction.auctionLinks.length === 0 ? (
                <div style={{ 
                  padding: '24px 16px', 
                  textAlign: 'center', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 6, 
                  color: 'var(--text-dim)',
                  fontSize: 13 
                }}>
                  No Auction Links
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>URL</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Description</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', width: 70 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auction.auctionLinks.map((link, idx) => (
                        <tr key={link.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 12px', color: '#0284c7' }}>
                            <a href={link.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                              {link.url}
                            </a>
                          </td>
                          <td style={{ padding: '8px 12px' }}>{link.description}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                              <button 
                                type="button" 
                                onClick={() => handleOpenLinkModal(idx)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => dispatch({ type: 'REMOVE_AUCTION_LINK', index: idx })}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Card: New Lot Defaults */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                New Lot Defaults
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Commission */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Commission</label>
                  <SearchableSelect 
                    value={auction.lotDefaults.commission}
                    onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'commission', value: val })}
                    options={[
                      'CSS_52F3ABA3 - SS -> [0% up to $0 ...]',
                      'COMM_STD_10 - Standard 10% Consignor',
                      'COMM_FLAT_5 - Flat 5% Estate Reserve'
                    ]}
                    showAdd={true}
                    showUpload={true}
                    onAddOption={() => {
                      setCreateOptionTarget('commission');
                      setIsCreateOptionModalOpen(true);
                    }}
                    onUploadCsv={() => {
                      setCsvTarget('Commission Schedules');
                      setIsCsvModalOpen(true);
                    }}
                  />
                </div>

                {/* Buyer Tax */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Buyer Tax {auction.taxExemptAll && <span style={{ color: '#059669', fontSize: 11 }}>(Disabled: Tax Exempt All Active)</span>}
                  </label>
                  <SearchableSelect 
                    value={auction.taxExemptAll ? '' : auction.lotDefaults.buyerTax}
                    disabled={auction.taxExemptAll}
                    onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerTax', value: val })}
                    options={[
                      'BTAX_0% - 0% Buyer Tax',
                      'BTAX_6% - 6% Montana Sales Surcharge',
                      'BTAX_7.5% - 7.5% Standard County Tax'
                    ]}
                    showAdd={true}
                    showUpload={true}
                    onAddOption={() => {
                      setCreateOptionTarget('buyerTax');
                      setIsCreateOptionModalOpen(true);
                    }}
                    onUploadCsv={() => {
                      setCsvTarget('Buyer Tax Schedules');
                      setIsCsvModalOpen(true);
                    }}
                  />
                </div>

                {/* Buyer Premium */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Buyer Premium</label>
                  <SearchableSelect 
                    value={auction.lotDefaults.buyerPremium}
                    onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerPremium', value: val })}
                    options={[
                      'BP_15 - 15% BP for all bidders',
                      'BP_12 - 12% BP Preferred In-House Tier',
                      'BP_18 - 18% Credit Card Tier'
                    ]}
                    showAdd={true}
                    showUpload={true}
                    onAddOption={() => {
                      setCreateOptionTarget('buyerPremium');
                      setIsCreateOptionModalOpen(true);
                    }}
                    onUploadCsv={() => {
                      setCsvTarget('Buyer Premium Schedules');
                      setIsCsvModalOpen(true);
                    }}
                  />
                </div>

                {/* Seller Tax */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Seller Tax</label>
                  <SearchableSelect 
                    value={auction.lotDefaults.sellerTax}
                    onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'sellerTax', value: val })}
                    options={[
                      'STAX_0% - 0% Seller Tax',
                      'STAX_3% - 3% State Consignment Excise'
                    ]}
                    showAdd={true}
                    showUpload={true}
                    onAddOption={() => {
                      setCreateOptionTarget('sellerTax');
                      setIsCreateOptionModalOpen(true);
                    }}
                    onUploadCsv={() => {
                      setCsvTarget('Seller Tax Schedules');
                      setIsCsvModalOpen(true);
                    }}
                  />
                </div>

                {/* Buyer Lot Charge 1 */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Buyer Lot Charge 1</label>
                  <SearchableSelect 
                    value={auction.lotDefaults.buyerLotCharge1}
                    onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerLotCharge1', value: val })}
                    options={[
                      'CHG_PACK_4.50 - In-House Packaging Surcharge $4.50',
                      'CHG_INSUR_10 - Registered Postal Insurance $10.00'
                    ]}
                    showAdd={false}
                    showUpload={true}
                    onUploadCsv={() => {
                      setCsvTarget('Buyer Lot Charge 1');
                      setIsCsvModalOpen(true);
                    }}
                  />
                </div>

                {/* Buyer Lot Charge 2 */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Buyer Lot Charge 2</label>
                  <SearchableSelect 
                    value={auction.lotDefaults.buyerLotCharge2}
                    onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerLotCharge2', value: val })}
                    options={[
                      'CHG_VAULT_5 - Secure Vault Handling $5.00'
                    ]}
                    showAdd={false}
                    showUpload={true}
                    onUploadCsv={() => {
                      setCsvTarget('Buyer Lot Charge 2');
                      setIsCsvModalOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Card: Ring Options (Locked) */}
            <div 
              className="syndication-card"
              style={{
                opacity: 0.65,
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px'
              }}
              title="Available during Auction Day"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={18} color="var(--text-muted)" />
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-muted)' }}>
                  Ring Options
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Available during Auction Day
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: UPLOAD SETTINGS
          ========================================================================= */}
      {currentTab === 'upload-settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card: Dates */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                Dates
              </h3>

              <FormField label="Preview Date/Times">
                <textarea 
                  rows={2}
                  value={auction.uploadSettings.previewDateTimes}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'previewDateTimes', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>

              <FormField label="Auction Date/Times">
                <textarea 
                  rows={2}
                  value={auction.uploadSettings.auctionDateTimes}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'auctionDateTimes', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>

              <FormField label="Checkout Date/Times">
                <textarea 
                  rows={2}
                  value={auction.uploadSettings.checkoutDateTimes}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'checkoutDateTimes', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>
            </div>

            {/* Card: Payment / Shipping / Pick Up */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                Payment / Shipping / Pick Up
              </h3>

              <FormField label="Payment Information">
                <textarea 
                  rows={3}
                  value={auction.uploadSettings.paymentInfo}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'paymentInfo', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>

              <FormField label="Shipping / Pick Up">
                <textarea 
                  rows={3}
                  value={auction.uploadSettings.shippingPickup}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'shippingPickup', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>
            </div>

            {/* Card: Registration */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>
                Registration
              </h3>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
                  Bidder Credit Card Registration
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { val: 'Authentication', label: 'Authentication (Needed for Batch Credit Card Processing) [default]' },
                    { val: 'Verification', label: 'Verification (Credit Card Verified - Not Retained)' },
                    { val: 'Contact Info Only', label: 'Contact Info Only' },
                    { val: 'No Registration', label: 'No Registration' }
                  ].map(item => (
                    <label key={item.val} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input 
                        type="radio"
                        name="ccReg"
                        checked={auction.uploadSettings.ccRegistrationType === item.val}
                        onChange={() => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'ccRegistrationType', value: item.val })}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sub-section: Bidder Authentication Selected Options */}
              <div style={{ background: '#fcfbf9', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '12px 14px', marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bidder Authentication Selected Options
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13 }}>
                  <span>Authentication required within</span>
                  <input 
                    type="number"
                    value={auction.uploadSettings.authDays}
                    onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'authDays', value: parseInt(e.target.value) || 30 })}
                    style={{ width: 60, height: 32, padding: '0 8px', border: '1px solid var(--border-subtle)', borderRadius: 4 }}
                  />
                  <span>days</span>
                </div>
              </div>

              {/* Sub-section: Types of Credit Cards */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Types of Credit Cards Accepted
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  {[
                    { key: 'mastercard', label: 'Mastercard' },
                    { key: 'visa', label: 'Visa' },
                    { key: 'amex', label: 'American Express' },
                    { key: 'discover', label: 'Discover' }
                  ].map(card => (
                    <label key={card.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={(auction.uploadSettings.acceptedCards as any)[card.key]}
                        onChange={(e) => {
                          dispatch({
                            type: 'UPDATE_UPLOAD_SETTINGS',
                            field: 'acceptedCards',
                            value: {
                              ...auction.uploadSettings.acceptedCards,
                              [card.key]: e.target.checked
                            }
                          });
                        }}
                      />
                      <span>{card.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card: Notices */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                Notices
              </h3>

              <FormField label="Bidding Notice">
                <textarea 
                  rows={3}
                  value={auction.uploadSettings.biddingNotice}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'biddingNotice', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>

              <FormField label="Auction Notice (optional)">
                <textarea 
                  rows={3}
                  value={auction.uploadSettings.auctionNotice}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'auctionNotice', value: e.target.value })}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                />
              </FormField>
            </div>

            {/* Card: Bidding */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                Bidding
              </h3>

              {/* Bidding Type */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Bidding Type</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'No Internet Bidding',
                    'Absentee Bidding (bids brought to live auction)',
                    'Internet Only Auction',
                    'Webcast (Live Internet Bidding)'
                  ].map(bt => (
                    <label key={bt} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                      <input 
                        type="radio"
                        name="biddingType"
                        checked={auction.uploadSettings.biddingType.startsWith(bt.split(' ')[0])}
                        onChange={() => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'biddingType', value: bt })}
                      />
                      <span>{bt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Minimum Bid Type */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Minimum Bid Type</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  {['Public Bidding', 'Sealed Bid'].map(m => (
                    <label key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <input 
                        type="radio"
                        name="minBidType"
                        checked={auction.uploadSettings.minBidType === m}
                        onChange={() => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'minBidType', value: m })}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Bid Amount Type */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Bid Amount Type</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  {['Maximum Bidding', 'Fixed / Flat Bidding'].map(amt => (
                    <label key={amt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <input 
                        type="radio"
                        name="bidAmountType"
                        checked={auction.uploadSettings.bidAmountType === amt}
                        onChange={() => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'bidAmountType', value: amt })}
                      />
                      <span>{amt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <FormField label="Timezone">
                <select 
                  value={auction.uploadSettings.timezone}
                  onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'timezone', value: e.target.value })}
                  className="catalog-filter-select"
                  style={{ width: '100%', height: 36 }}
                >
                  <option value="(UTC-07:00) Mountain Time (US & Canada)">(UTC-07:00) Mountain Time (US & Canada)</option>
                  <option value="(UTC-08:00) Pacific Time (US & Canada)">(UTC-08:00) Pacific Time (US & Canada)</option>
                  <option value="(UTC-06:00) Central Time (US & Canada)">(UTC-06:00) Central Time (US & Canada)</option>
                  <option value="(UTC-05:00) Eastern Time (US & Canada)">(UTC-05:00) Eastern Time (US & Canada)</option>
                </select>
              </FormField>

              {/* Open & Close Bidding Date-Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Open Bidding">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="date"
                      value={auction.uploadSettings.openBiddingDate}
                      onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'openBiddingDate', value: e.target.value })}
                      style={{ flex: 1, height: 36, border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '0 6px' }}
                    />
                    <input 
                      type="text"
                      placeholder="10:00 AM"
                      value={auction.uploadSettings.openBiddingTime}
                      onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'openBiddingTime', value: e.target.value })}
                      style={{ width: 80, height: 36, border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '0 6px' }}
                    />
                  </div>
                </FormField>

                <FormField label="Close Bidding">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="date"
                      value={auction.uploadSettings.closeBiddingDate}
                      onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'closeBiddingDate', value: e.target.value })}
                      style={{ flex: 1, height: 36, border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '0 6px' }}
                    />
                    <input 
                      type="text"
                      placeholder="07:00 PM"
                      value={auction.uploadSettings.closeBiddingTime}
                      onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'closeBiddingTime', value: e.target.value })}
                      style={{ width: 80, height: 36, border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '0 6px' }}
                    />
                  </div>
                </FormField>
              </div>

              {/* Soft Close Seconds & Auto-Sync Stagger */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <FormField label="Soft Close Seconds">
                  <input 
                    type="number"
                    value={auction.uploadSettings.softCloseSeconds}
                    onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'softCloseSeconds', value: parseInt(e.target.value) || 15 })}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>

                <div style={{ paddingTop: 10 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={auction.uploadSettings.autoSyncStagger}
                      onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'autoSyncStagger', value: e.target.checked })}
                    />
                    <span>Auto-Sync Grouped Lot Stagger Time</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Card: Options */}
            <div className="syndication-card">
              <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>
                Options
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={auction.uploadSettings.showImmediateBidStatus}
                    onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'showImmediateBidStatus', value: e.target.checked })}
                  />
                  <span>Show Immediate Bid Status (won/lost and winning amount) on Closed Lots</span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={auction.uploadSettings.hideBidderUsernames}
                    onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'hideBidderUsernames', value: e.target.checked })}
                  />
                  <span>Mask Bidder Usernames on Public Simulcast Screens</span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={auction.uploadSettings.allowRetractBids}
                    onChange={(e) => dispatch({ type: 'UPDATE_UPLOAD_SETTINGS', field: 'allowRetractBids', value: e.target.checked })}
                  />
                  <span>Allow Operator Bid Retraction Overrides during Soft-Close</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: PREVIEW (Read-only public preview)
          ========================================================================= */}
      {currentTab === 'preview' && (
        <div className="syndication-card" style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-live">PUBLIC SIMULCAST PREVIEW</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>• {auction.code}</span>
            </div>
            <h2 className="font-serif" style={{ fontSize: 26, color: 'var(--text-main)', margin: '0 0 8px' }}>
              {auction.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: 'var(--text-dim)' }}>
              <span>📅 {formatDate(auction.startDate)} – {formatDate(auction.endDate)}</span>
              <span>📍 {auction.address1}, {auction.city}, {auction.state} {auction.zip}</span>
              <span>⚖ {auction.shortBpExplanation}</span>
            </div>
          </div>

          {/* Featured Images Carousel / Grid */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
              Catalog Highlights & Featured Coin Offerings
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {auction.featuredImages.map(img => (
                <div key={img.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden', background: '#fcfbf9' }}>
                  <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', padding: 8 }}>
                    <img src={img.url} alt={img.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>
                    {img.title}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description & Notices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                Auction Information & Store Notice
              </h4>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {auction.description}
              </p>
            </div>

            {auction.uploadSettings?.biddingNotice && (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: 14, borderRadius: 8 }}>
                <strong style={{ fontSize: 12.5, color: '#854d0e', display: 'block', marginBottom: 4 }}>Bidding Notice:</strong>
                <p style={{ fontSize: 12.5, color: '#713f12', margin: 0 }}>{auction.uploadSettings.biddingNotice}</p>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                Terms & Conditions
              </h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>
                {auction.terms}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: LOTS (Embedded LotsView filtered to this auction)
          ========================================================================= */}
      {currentTab === 'lots' && (
        <div>
          <LotsView 
            lots={filteredAuctionLots}
            onAddLot={onAddLot}
            onUpdateLot={onUpdateLot}
            onSendToBlock={onSendToBlock}
            onDeleteLot={onDeleteLot}
          />
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 5: LOT IMAGES (Grid with upload & No Image placeholder)
          ========================================================================= */}
      {currentTab === 'lot-images' && (
        <div className="syndication-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Lot Catalog Image Repository
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                High-resolution PCGS & NGC certification coin scans associated with this sale
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-gold"
              onClick={() => alert('Simulated Bulk Image Upload: select folder of JPEG coin scans matching lot numbers (e.g. 001_obverse.jpg, 001_reverse.jpg)')}
            >
              <Upload size={15} />
              <span>Bulk Image Upload</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {filteredAuctionLots.map(lot => (
              <div 
                key={lot.id}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ 
                  height: 150, 
                  background: '#f8fafc', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {lot.image ? (
                    <img 
                      src={lot.image} 
                      alt={lot.title} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        // fallback to placeholder
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div style="font-size: 11px; color: #94a3b8; font-weight: 600;">No Image Found</div>';
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, fontWeight: 600 }}>
                      <ImageIcon size={24} style={{ margin: '0 auto 6px', display: 'block' }} />
                      <span>No Image Found</span>
                    </div>
                  )}

                  <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
                    Lot #{lot.lotNumber}
                  </div>
                </div>

                <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', lineClamp: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lot.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{lot.certification} {lot.grade}</span>
                    <button 
                      type="button" 
                      onClick={() => alert(`Upload custom photo scan for Lot #${lot.lotNumber}`)}
                      style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Replace ↗
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 6: EXPENSES
          ========================================================================= */}
      {currentTab === 'expenses' && (
        <div className="syndication-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Auction Operating Expenses
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Track marketing, syndication advertising, grading fees, and saleroom security
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-gold"
              onClick={() => setIsExpenseModalOpen(true)}
            >
              <Plus size={15} />
              <span>+ Add Expense</span>
            </button>
          </div>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Vendor</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600 }}>Amount</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, width: 120 }}>Date</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {auction.expenses.map((exp) => (
                  <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-main)' }}>
                      {exp.description}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {exp.vendor}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#dc2626' }}>
                      {formatCurrency(exp.amount)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      {formatDate(exp.date)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button 
                        type="button"
                        onClick={() => dispatch({ type: 'REMOVE_EXPENSE', id: exp.id })}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                        title="Delete expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

                {auction.expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                      No expenses logged for this auction event.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* Tips & Tricks Modal */}
      <FormModal
        isOpen={isTipsModalOpen}
        title="Featured Images Tips & Tricks"
        onClose={() => setIsTipsModalOpen(false)}
        submitLabel="Got It"
        onSubmit={(e) => { e.preventDefault(); setIsTipsModalOpen(false); }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, lineHeight: 1.5 }}>
          <p><strong>1. Optimal Image Dimensions:</strong> We recommend 1200 x 1200 px square photographs on neutral gallery white or black felt backgrounds.</p>
          <p><strong>2. Primary Highlight Image:</strong> The first thumbnail in the sequence serves as the banner image for HiBid catalog feeds and Gardner mobile rostrum preview.</p>
          <p><strong>3. TrueView Numismatics:</strong> Uploading high-res slab scans of certified PCGS or NGC coins increases bidder confidence by up to 40%.</p>
        </div>
      </FormModal>

      {/* Auction Link Modal */}
      <FormModal
        isOpen={isLinkModalOpen}
        title={editingLinkIndex !== null ? 'Edit Auction Link' : 'Add New Auction Link'}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleSaveLink}
        submitLabel={editingLinkIndex !== null ? 'Update Link' : 'Add Link'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="URL *" required>
            <input 
              type="url"
              required
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>
          <FormField label="Description">
            <input 
              type="text"
              placeholder="e.g. HiBid Live Catalog Portal"
              value={linkDesc}
              onChange={(e) => setLinkDesc(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>
        </div>
      </FormModal>

      {/* Create Option Modal */}
      <FormModal
        isOpen={isCreateOptionModalOpen}
        title={`Create New ${createOptionTarget} Option`}
        onClose={() => setIsCreateOptionModalOpen(false)}
        onSubmit={handleSaveOption}
        submitLabel="Add Option"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Option Code *" required>
            <input 
              type="text"
              required
              placeholder="e.g. BP_20"
              value={newOptionCode}
              onChange={(e) => setNewOptionCode(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>
          <FormField label="Description">
            <input 
              type="text"
              placeholder="e.g. 20% Buyer's Premium for Internet Bidders"
              value={newOptionDesc}
              onChange={(e) => setNewOptionDesc(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>
        </div>
      </FormModal>

      {/* CSV Import Modal */}
      <FormModal
        isOpen={isCsvModalOpen}
        title={`Import ${csvTarget} from CSV`}
        onClose={() => setIsCsvModalOpen(false)}
        submitLabel="Import File"
        onSubmit={(e) => {
          e.preventDefault();
          alert(`Successfully imported sample ${csvTarget} records from CSV file!`);
          setIsCsvModalOpen(false);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: '2px dashed var(--border-subtle)', padding: '24px 16px', textAlign: 'center', borderRadius: 8, background: '#fcfbf9' }}>
            <Upload size={24} color="var(--gold-primary)" style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Drag & Drop your .csv table file here, or click to browse.
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-dim)' }}>
            CSV format must contain columns: <code>Code, Label, Rate, Description</code>
          </p>
        </div>
      </FormModal>

      {/* Add Expense Modal */}
      <FormModal
        isOpen={isExpenseModalOpen}
        title="Add Auction Operating Expense"
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleAddExpense}
        submitLabel="Log Expense"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Expense Description *" required>
            <input 
              type="text"
              required
              placeholder="e.g. HiBid Banner Advertising & Feature Listing"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>

          <FormField label="Vendor">
            <input 
              type="text"
              placeholder="e.g. HiBid Auction Network"
              value={expVendor}
              onChange={(e) => setExpVendor(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Amount ($) *" required>
              <input 
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="Date">
              <input 
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>
        </div>
      </FormModal>
    </div>
  );
};
