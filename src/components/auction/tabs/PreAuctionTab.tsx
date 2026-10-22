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
  Move,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Barcode,
  GripVertical,
  ChevronDown,
  Settings,
  MoreVertical,
  Filter,
  UploadCloud,
  Copy,
  Download,
  Save
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { auctionService } from '../../../services/auctionService';
import { LotFormModal } from '../LotFormModal';
import { INITIAL_USERS } from '../../../data/mockData';
import { useToast } from '../../../context/ToastContext';

interface PreAuctionTabProps {
  currentTab: PreAuctionSubTab;
  onSelectTab: (tab: PreAuctionSubTab) => void;
  lots: LotItem[];
  onAddLot: (lot: LotItem) => void;
  onUpdateLot: (lot: LotItem) => void;
  onSendToBlock: (lot: LotItem) => void;
  onDeleteLot: (id: string) => Promise<any>;
  hideSubtabs?: boolean;
}

export const PreAuctionTab: React.FC<PreAuctionTabProps> = ({
  currentTab,
  onSelectTab,
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock,
  onDeleteLot,
  hideSubtabs = false
}) => {
  const { state, dispatch, errors, saveAuction } = useAuctionDetail();
  const { showToast } = useToast();
  const auction = state.data;

  // Modals for Details Tab
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');

  const handleSaveUploadSettings = async () => {
    setIsSavingLocal(true);
    try {
      const success = await saveAuction();
      setIsSavingLocal(false);
      if (success) {
        showToast('success', 'Upload Settings Saved', 'Bidding schedule, notices, and registration settings saved to database.');
      } else {
        showToast('error', 'Save Failed', 'Could not save upload settings.');
      }
    } catch (e) {
      setIsSavingLocal(false);
      showToast('error', 'Error', 'Failed to save upload settings.');
    }
  };

  // Modals for New Lot Defaults
  const [isCreateOptionModalOpen, setIsCreateOptionModalOpen] = useState(false);
  const [createOptionTarget, setCreateOptionTarget] = useState<string>('');
  const [newOptionCode, setNewOptionCode] = useState('');
  const [newOptionDesc, setNewOptionDesc] = useState('');

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvTarget, setCsvTarget] = useState<string>('');

  // Expenses State & Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AuctionExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<AuctionExpense | null>(null);
  const [expType, setExpType] = useState('Auction Marketing Expense');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customExpType, setCustomExpType] = useState('');
  const [expAccount, setExpAccount] = useState('facebook');
  const [isCustomAccount, setIsCustomAccount] = useState(false);
  const [customAccount, setCustomAccount] = useState('');
  const [expPayFrom, setExpPayFrom] = useState('Cash');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expReceiptName, setExpReceiptName] = useState('');
  const [expReceiptPreview, setExpReceiptPreview] = useState<string | null>(null);

  // Table filters & sorting for Expenses
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseSortColumn, setExpenseSortColumn] = useState<'type' | 'account' | 'payFrom' | 'description' | 'amount' | 'date'>('date');
  const [expenseSortDirection, setExpenseSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expensePageSize, setExpensePageSize] = useState<number>(10);
  const [expensePage, setExpensePage] = useState<number>(1);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    account: true,
    payFrom: true,
    description: true,
    amount: true
  });

  // Sub-tab 4: Lots State & Modal
  const [lotSearch, setLotSearch] = useState('');
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);
  const [lotSortCol, setLotSortCol] = useState<'lotNumber' | 'saleOrder' | 'title' | 'staggerSeconds' | 'quantity' | 'status'>('lotNumber');
  const [lotSortDir, setLotSortDir] = useState<'asc' | 'desc'>('asc');
  const [isLotColumnMenuOpen, setIsLotColumnMenuOpen] = useState(false);
  const [lotColsVisible, setLotColsVisible] = useState({
    lotNumber: true,
    saleOrder: true,
    title: true,
    staggerSeconds: true,
    quantity: true,
    status: true
  });
  const [isLotsNewLotModalOpen, setIsLotsNewLotModalOpen] = useState(false);
  const [lotsEditingLot, setLotsEditingLot] = useState<LotItem | null>(null);
  const [lotsLotToDelete, setLotsLotToDelete] = useState<LotItem | null>(null);
  const [isScanLotModalOpen, setIsScanLotModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [isSaleOrderModalOpen, setIsSaleOrderModalOpen] = useState(false);
  const [bulkStaggerInterval, setBulkStaggerInterval] = useState(20);
  const [hoveredSubTab, setHoveredSubTab] = useState<string | null>(null);
  const [activeMenuLotId, setActiveMenuLotId] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_clerked' | 'on_block' | 'sold'>('all');

  if (!auction) return null;

  // Filter lots to this auction (including AF360 reference lots for demo auction only)
  const filteredAuctionLots = lots.filter(l => 
    l.auctionId === auction.id || (auction.id === 'auc-001' && (!l.auctionId || ['lot-ref-1', 'lot-ref-2', 'lot-ref-3', 'lot-ref-4', 'lot-ref-6'].includes(l.id)))
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

  // Expenses Constants & Handlers
  const EXPENSE_TYPES = [
    'Auction Marketing Expense',
    'Auctioneer Fee',
    'Labor',
    'Shipping Supplies',
    'Insurance',
    'Venue',
    'Other'
  ];

  const PAY_FROM_OPTIONS = ['Cash', 'Check', 'Credit Card', 'Bank Transfer'];

  const existingAccounts = Array.from(new Set([
    'facebook',
    'local newspaper',
    'miscellaneous',
    ...(auction.expenses || []).map(e => e.account).filter(Boolean)
  ]));

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpType('Auction Marketing Expense');
    setIsCustomType(false);
    setCustomExpType('');
    setExpAccount(existingAccounts[0] || 'facebook');
    setIsCustomAccount(false);
    setCustomAccount('');
    setExpPayFrom('Cash');
    setExpDesc('');
    setExpAmount('');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpReceiptName('');
    setExpReceiptPreview(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: AuctionExpense) => {
    setEditingExpense(exp);
    if (EXPENSE_TYPES.includes(exp.type)) {
      setExpType(exp.type);
      setIsCustomType(false);
      setCustomExpType('');
    } else {
      setExpType('Other');
      setIsCustomType(true);
      setCustomExpType(exp.type);
    }

    if (existingAccounts.includes(exp.account)) {
      setExpAccount(exp.account);
      setIsCustomAccount(false);
      setCustomAccount('');
    } else {
      setExpAccount('__new__');
      setIsCustomAccount(true);
      setCustomAccount(exp.account);
    }

    setExpPayFrom(exp.payFrom || 'Cash');
    setExpDesc(exp.description);
    setExpAmount(exp.amount !== undefined ? exp.amount.toString() : '');
    setExpDate(exp.date || new Date().toISOString().split('T')[0]);
    setExpReceiptName(exp.receiptUrl ? 'Receipt attached' : '');
    setExpReceiptPreview(exp.receiptUrl || null);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || !expAmount) return;

    const finalType = isCustomType && customExpType.trim() ? customExpType.trim() : expType;
    const finalAccount = isCustomAccount && customAccount.trim() ? customAccount.trim() : expAccount;
    const amountVal = Math.max(0, parseFloat(expAmount) || 0);

    if (editingExpense) {
      dispatch({
        type: 'UPDATE_EXPENSE',
        id: editingExpense.id,
        expense: {
          type: finalType,
          account: finalAccount,
          payFrom: expPayFrom,
          description: expDesc.trim(),
          amount: amountVal,
          date: expDate,
          receiptUrl: expReceiptPreview || undefined
        }
      });
      auctionService.updateExpense(auction.id, editingExpense.id, {
        type: finalType,
        account: finalAccount,
        payFrom: expPayFrom,
        description: expDesc.trim(),
        amount: amountVal,
        date: expDate,
        receiptUrl: expReceiptPreview || undefined
      });
    } else {
      const newExp: AuctionExpense = {
        id: `exp-${Date.now()}`,
        type: finalType,
        account: finalAccount,
        payFrom: expPayFrom,
        description: expDesc.trim(),
        amount: amountVal,
        date: expDate,
        receiptUrl: expReceiptPreview || undefined
      };
      dispatch({
        type: 'ADD_EXPENSE',
        expense: newExp
      });
      auctionService.addExpense(auction.id, newExp);
    }

    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleConfirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    dispatch({ type: 'REMOVE_EXPENSE', id: expenseToDelete.id });
    auctionService.deleteExpense(auction.id, expenseToDelete.id);
    setExpenseToDelete(null);
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
      {/* Sub-tabs bar matching Image 2 screenshot (only if not hidden / not rendered in unified top bar) */}
      {!hideSubtabs && (
        <div className="image2-subtabs-row">
          {[
            { key: 'details', label: 'Details' },
            { key: 'upload-settings', label: 'Upload Settings' },
            { key: 'preview', label: 'Preview' },
            { key: 'lots', label: 'Lots', badge: filteredAuctionLots.length, badgeType: 'neutral' },
            { key: 'lot-images', label: 'Lot Images' },
            { 
              key: 'expenses', 
              label: 'Expenses', 
              badge: `$${(auction.expenses || []).reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}`, 
              badgeType: 'green' 
            }
          ].map(tab => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key as PreAuctionSubTab)}
                className={`image2-subtab ${isActive ? 'active' : ''}`}
              >
                {isActive && <span className="image2-subtab-dot" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`image2-tab-badge ${tab.badgeType === 'green' ? 'green' : 'neutral'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 1: DETAILS (Refined Two-Column Layout matching Reference Screenshots)
          ========================================================================= */}
      {currentTab === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div 
            className="details-two-col-layout" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', 
              gap: 20, 
              alignItems: 'start' 
            }}
          >
            {/* LEFT COLUMN: Auction Information & Shipping & Buyer Charges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Section 1: Auction Information */}
              <div className="details-clean-card">
                <div className="details-card-header">
                  <div className="details-card-title-group">
                    <h3>Auction Information</h3>
                    <p>Master configuration, catalog scheduling, and venue credentials.</p>
                  </div>

                  {/* Auction Type Segmented Switch */}
                  <div className="segmented-pill-toggle">
                    <button
                      type="button"
                      className={`segmented-pill-btn ${auction.auctionType === 'HiBid' ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'UPDATE_FIELD', field: 'auctionType', value: 'HiBid' })}
                    >
                      HiBid
                    </button>
                    <button
                      type="button"
                      className={`segmented-pill-btn ${auction.auctionType === 'Other Auctions' ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'UPDATE_FIELD', field: 'auctionType', value: 'Other Auctions' })}
                    >
                      Other Auctions
                    </button>
                  </div>
                </div>

                {/* Auction Code & Live Starting Bid Card # */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                  <div className="ecomm-form-group">
                    <label className="ecomm-form-label">
                      <span>Auction Code <span className="ecomm-required-star">*</span></span>
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="text"
                        value={auction.code}
                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'code', value: e.target.value.toUpperCase() })}
                        className="ecomm-input"
                        style={{ paddingRight: 38, fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, letterSpacing: '0.04em' }}
                        placeholder="e.g. HGS-2026-10-22"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (auction.code) {
                            navigator.clipboard.writeText(auction.code);
                            setCopiedCode(true);
                            showToast('info', 'Copied', `Auction code "${auction.code}" copied to clipboard`);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }
                        }}
                        title="Copy Auction Code"
                        style={{
                          position: 'absolute',
                          right: 6,
                          background: 'none',
                          border: 'none',
                          color: copiedCode ? '#059669' : '#64748b',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 4
                        }}
                      >
                        {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="ecomm-form-group">
                    <label className="ecomm-form-label">
                      <span>Live Starting Bid Card #</span>
                    </label>
                    <input 
                      type="number"
                      value={auction.liveStartingBidCard}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'liveStartingBidCard', value: parseInt(e.target.value) || 1 })}
                      className="ecomm-input"
                      min={1}
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Auction Name */}
                <div className="ecomm-form-group">
                  <label className="ecomm-form-label">
                    <span>Auction Name <span className="ecomm-required-star">*</span></span>
                  </label>
                  <input 
                    type="text"
                    value={auction.name}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'name', value: e.target.value })}
                    className="ecomm-input"
                    placeholder="e.g. Highlander Gold & Silver 10/22/26"
                  />
                  {errors.name && (
                    <span style={{ fontSize: 11.5, color: '#dc2626', marginTop: 3 }}>{errors.name}</span>
                  )}
                </div>

                {/* Description */}
                <div className="ecomm-form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="ecomm-form-label" style={{ margin: 0 }}>
                      Description
                    </label>
                    <span className="ecomm-form-hint">Plain text / HTML supported</span>
                  </div>
                  <textarea 
                    rows={3}
                    value={auction.description}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'description', value: e.target.value })}
                    className="ecomm-textarea"
                    placeholder="Welcome to the auction catalog. Enter event details..."
                  />
                </div>

                {/* Payment Information */}
                <div className="ecomm-form-group">
                  <label className="ecomm-form-label">
                    Payment Information
                  </label>
                  <textarea 
                    rows={2}
                    value={auction.paymentInfo}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'paymentInfo', value: e.target.value })}
                    className="ecomm-textarea"
                    placeholder="Cash, Wire Transfer, Certified Cashier Check, Visa, MasterCard..."
                  />
                  {/* Quick tag pill selectors as seen in reference screenshot */}
                  <div className="quick-tags-row">
                    {['Cash / Wire', 'Visa / MC / Amex', '3% Credit Fee'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className="quick-tag-pill"
                        onClick={() => {
                          const current = auction.paymentInfo || '';
                          if (!current.includes(tag)) {
                            const updated = current ? `${current}, ${tag}` : tag;
                            dispatch({ type: 'UPDATE_FIELD', field: 'paymentInfo', value: updated });
                          }
                        }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Date & End Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div className="ecomm-form-group">
                    <label className="ecomm-form-label">
                      <span>Start Date <span className="ecomm-required-star">*</span></span>
                    </label>
                    <input 
                      type="date"
                      value={auction.startDate}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'startDate', value: e.target.value })}
                      className="ecomm-input"
                    />
                    {errors.startDate && (
                      <span style={{ fontSize: 11.5, color: '#dc2626', marginTop: 3 }}>{errors.startDate}</span>
                    )}
                  </div>
                  <div className="ecomm-form-group">
                    <label className="ecomm-form-label">
                      <span>End Date <span className="ecomm-required-star">*</span></span>
                    </label>
                    <input 
                      type="date"
                      value={auction.endDate}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'endDate', value: e.target.value })}
                      className="ecomm-input"
                    />
                    {errors.endDate && (
                      <span style={{ fontSize: 11.5, color: '#dc2626', marginTop: 3 }}>{errors.endDate}</span>
                    )}
                  </div>
                </div>

                {/* Currency & Tax Exempt Toggle Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, alignItems: 'flex-end', marginBottom: 16 }}>
                  <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                    <label className="ecomm-form-label">
                      <span>Currency <span className="ecomm-required-star">*</span></span>
                    </label>
                    <select 
                      value={auction.currency}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'currency', value: e.target.value })}
                      className="ecomm-select"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div style={{ paddingBottom: 8 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--ecomm-text-dark)' }}>
                      <input 
                        type="checkbox"
                        checked={auction.taxExemptAll}
                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'taxExemptAll', value: e.target.checked })}
                        style={{ accentColor: 'var(--ecomm-primary-gold, #c59b27)', width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span>Mark entire auction as Tax Exempt</span>
                    </label>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="ecomm-form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="ecomm-form-label" style={{ margin: 0 }}>
                      Terms and Conditions
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      Preview as Modal
                    </button>
                  </div>
                  <textarea 
                    rows={3}
                    value={auction.terms}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'terms', value: e.target.value })}
                    className="ecomm-textarea"
                    placeholder="Enter legally binding auction rules, bidding agreement, and clearance terms..."
                  />
                </div>

                {/* Short BP Explanation */}
                <div className="ecomm-form-group">
                  <label className="ecomm-form-label">
                    Short BP Explanation
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. 15% Buyer's Premium"
                    value={auction.shortBpExplanation}
                    onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'shortBpExplanation', value: e.target.value })}
                    className="ecomm-input"
                  />
                </div>

                {/* Nested Box: REMOVAL & PICKUP ADDRESS */}
                <div className="nested-address-box">
                  <div className="nested-box-title">REMOVAL & PICKUP ADDRESS</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                      <label className="ecomm-form-label">Address Line 1</label>
                      <input 
                        type="text"
                        placeholder="e.g. 119 Jewel Basin Ct"
                        value={auction.address1 || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'address1', value: e.target.value })}
                        className="ecomm-input"
                      />
                    </div>
                    <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                      <label className="ecomm-form-label">Address Line 2 / Suite</label>
                      <input 
                        type="text"
                        placeholder="e.g. Suite 100"
                        value={auction.address2 || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'address2', value: e.target.value })}
                        className="ecomm-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                      <label className="ecomm-form-label">City</label>
                      <input 
                        type="text"
                        placeholder="e.g. Bigfork"
                        value={auction.city || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'city', value: e.target.value })}
                        className="ecomm-input"
                      />
                    </div>
                    <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                      <label className="ecomm-form-label">State</label>
                      <input 
                        type="text"
                        placeholder="e.g. MT"
                        value={auction.state || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'state', value: e.target.value })}
                        className="ecomm-input"
                      />
                    </div>
                    <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                      <label className="ecomm-form-label">ZIP</label>
                      <input 
                        type="text"
                        placeholder="e.g. 59911"
                        value={auction.zip || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'zip', value: e.target.value })}
                        className="ecomm-input"
                      />
                    </div>
                  </div>

                  <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                    <label className="ecomm-form-label">Country</label>
                    <select 
                      value={auction.country || ''}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'country', value: e.target.value })}
                      className="ecomm-select"
                    >
                      <option value="">Select country...</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>
                </div>

                {/* Consolidated Invoicing Row */}
                <div className="consolidated-invoicing-row">
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ecomm-text-dark)' }}>
                    <input 
                      type="checkbox"
                      checked={Boolean(auction.useConsolidatedInvoicing)}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'useConsolidatedInvoicing', value: e.target.checked })}
                      style={{ accentColor: 'var(--ecomm-primary-gold, #c59b27)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span>Use Consolidated Invoicing (Combines Seller & Buyer Invoices)</span>
                  </label>
                  <span className="recommended-pill">Recommended</span>
                </div>
              </div>

              {/* Section 2: Shipping & Buyer Charges */}
              <div className="details-clean-card">
                <div className="details-card-header">
                  <div className="details-card-title-group">
                    <h3>Shipping & Buyer Charges</h3>
                    <p>Configure default fulfillment parameters and handling rules.</p>
                  </div>
                </div>

                <div className="ecomm-form-group">
                  <label className="ecomm-form-label">Availability</label>
                  <select 
                    value={auction.shippingAvailability || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'shippingAvailability', value: e.target.value })}
                    className="ecomm-select"
                  >
                    <option value="">Select availability...</option>
                    <option value="Shipping Offered On All Lots">Shipping Offered On All Lots</option>
                    <option value="Selected Lots Only">Selected Lots Only</option>
                    <option value="No Shipping">No Shipping</option>
                  </select>
                </div>

                <div className="ecomm-form-group">
                  <label className="ecomm-form-label">Account Reference</label>
                  <input 
                    type="text"
                    placeholder="e.g. shipping & handling"
                    value={auction.shippingAccount || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'shippingAccount', value: e.target.value })}
                    className="ecomm-input"
                  />
                </div>

                {/* Nested Box for Handling Charge */}
                <div style={{
                  background: '#faf9f6',
                  border: '1px solid var(--ecomm-border)',
                  borderRadius: 8,
                  padding: 14,
                  marginTop: 10
                }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ecomm-text-dark)' }}>
                    <input 
                      type="checkbox"
                      checked={Boolean(auction.addHandlingCharge)}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'addHandlingCharge', value: e.target.checked })}
                      style={{ accentColor: 'var(--ecomm-primary-gold, #c59b27)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span>Add Handling Charge</span>
                  </label>

                  {auction.addHandlingCharge && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8e4dc', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="ecomm-form-label" style={{ marginBottom: 6 }}>Handling Charge Type</label>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input 
                              type="radio"
                              name="handlingType"
                              checked={auction.handlingChargeType === 'Fixed'}
                              onChange={() => dispatch({ type: 'UPDATE_SHIPPING', field: 'handlingChargeType', value: 'Fixed' })}
                              style={{ accentColor: 'var(--ecomm-primary-gold, #c59b27)' }}
                            />
                            <span style={{ fontWeight: 600 }}>Fixed</span>
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input 
                              type="radio"
                              name="handlingType"
                              checked={auction.handlingChargeType === 'Percentage'}
                              onChange={() => dispatch({ type: 'UPDATE_SHIPPING', field: 'handlingChargeType', value: 'Percentage' })}
                              style={{ accentColor: 'var(--ecomm-primary-gold, #c59b27)' }}
                            />
                            <span style={{ fontWeight: 600 }}>Percentage</span>
                          </label>
                        </div>
                      </div>

                      <div className="ecomm-form-group" style={{ marginBottom: 0 }}>
                        <label className="ecomm-form-label">
                          {auction.handlingChargeType === 'Fixed' ? 'Fixed Amount ($)' : 'Percentage (%)'}
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: 10, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                            {auction.handlingChargeType === 'Fixed' ? '$' : '%'}
                          </span>
                          <input 
                            type="number"
                            step="0.01"
                            value={auction.handlingAmount !== undefined && auction.handlingAmount !== null && auction.handlingAmount !== 0 ? auction.handlingAmount : ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_SHIPPING', field: 'handlingAmount', value: parseFloat(e.target.value) || 0 })}
                            className="ecomm-input"
                            style={{ paddingLeft: 26 }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Featured Images, Auction Links, New Lot Defaults, Locked Audio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Card 1: Featured Images */}
              <div className="details-clean-card">
                <div className="details-card-header">
                  <div className="details-card-title-group">
                    <h3>Featured Images</h3>
                    <p>{auction.featuredImages.length} catalog banner assets uploaded</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTipsModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Tips & Tricks</span>
                    <ExternalLink size={12} />
                  </button>
                </div>

                {/* Upload Drag & Drop Zone */}
                <div 
                  className="featured-upload-zone"
                  onClick={() => {
                    const sampleImages = ['/images/hero_coin.jpg', '/images/morgan_dollar.jpg', '/images/gold_bullion.jpg', '/images/antique_silver.jpg'];
                    const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
                    dispatch({
                      type: 'ADD_FEATURED_IMAGE',
                      image: {
                        id: `img-${Date.now()}`,
                        url: randomImg,
                        title: `Catalog Banner Asset #${auction.featuredImages.length + 1}`,
                        order: auction.featuredImages.length + 1
                      }
                    });
                    showToast('info', 'Asset Added', 'Banner image attached to catalog gallery.');
                  }}
                  title="Click to browse files or add sample banner asset"
                >
                  <UploadCloud size={28} color="var(--ecomm-primary-gold, #c59b27)" style={{ margin: '0 auto 6px' }} />
                  <p className="primary-text">
                    <span className="link-accent">Browse my computer</span> or drag files here
                  </p>
                  <p className="sub-text">PNG, JPG, WEBP up to 25MB each</p>
                </div>

                {/* Thumbnail Grid */}
                {auction.featuredImages.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#faf9f6', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
                    No featured banner images uploaded yet. Drop files above or browse to attach.
                  </div>
                ) : (
                  <div className="featured-grid-row">
                    {auction.featuredImages.map((img, idx) => {
                      const fallbackThemes = [
                        { className: 'asset-circle-gold', label: 'GOLD' },
                        { className: 'asset-rect-slab', label: 'SLAB' },
                        { className: 'asset-rect-bar', label: 'BARS' },
                        { className: 'asset-rect-room', label: 'ROOM' },
                      ];
                      const theme = fallbackThemes[idx % fallbackThemes.length];

                      return (
                        <div key={img.id} className="featured-img-card">
                          {idx === 0 && (
                            <span className="featured-cover-badge">Cover</span>
                          )}
                          <div className="featured-img-preview">
                            {img.url ? (
                              <>
                                <img 
                                  src={img.url} 
                                  alt={img.title || `Featured asset ${idx + 1}`}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    const fb = (e.target as HTMLElement).nextElementSibling;
                                    if (fb) (fb as HTMLElement).style.display = 'flex';
                                  }}
                                />
                                <div 
                                  className={theme.className}
                                  style={{ display: 'none' }}
                                >
                                  {theme.label}
                                </div>
                              </>
                            ) : (
                              <div className={theme.className} style={{ display: 'flex' }}>
                                {theme.label}
                              </div>
                            )}
                          </div>
                          <div className="featured-actions-bar">
                            <div style={{ display: 'flex', gap: 2 }}>
                              {idx > 0 && (
                                <button 
                                  type="button" 
                                  onClick={() => moveImage(idx, 'up')}
                                  className="reorder-arrow-btn"
                                  title="Move Left"
                                >
                                  ◀
                                </button>
                              )}
                              {idx < auction.featuredImages.length - 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => moveImage(idx, 'down')}
                                  className="reorder-arrow-btn"
                                  title="Move Right"
                                >
                                  ▶
                                </button>
                              )}
                            </div>
                            <button 
                              type="button" 
                              onClick={() => dispatch({ type: 'REMOVE_FEATURED_IMAGE', id: img.id })}
                              className="img-delete-btn"
                              title="Remove image"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 2: Auction Links */}
              <div className="details-clean-card">
                <div className="details-card-header">
                  <div className="details-card-title-group">
                    <h3>Auction Links</h3>
                    <p>Portals and external bidder destinations</p>
                  </div>
                  <button
                    type="button"
                    className="btn-executive-gold"
                    style={{ padding: '6px 14px', fontSize: 12 }}
                    onClick={() => handleOpenLinkModal()}
                  >
                    <Plus size={14} />
                    <span>+ New Link</span>
                  </button>
                </div>

                {auction.auctionLinks.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#faf9f6', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
                    No external bidder links added. Click "+ New Link" to configure syndication portals.
                  </div>
                ) : (
                  <div>
                    {auction.auctionLinks.map((link, idx) => (
                      <div key={link.id} className="link-item-row">
                        <span className={`link-status-dot ${idx === 0 ? 'active' : 'inactive'}`} />
                        <div className="link-content-col">
                          <span className="link-title">{link.description || 'Syndication Portal Link'}</span>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="link-url-text"
                          >
                            {link.url}
                          </a>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button 
                            type="button" 
                            onClick={() => handleOpenLinkModal(idx)}
                            className="reorder-arrow-btn"
                            title="Edit Link"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => dispatch({ type: 'REMOVE_AUCTION_LINK', index: idx })}
                            className="img-delete-btn"
                            title="Remove Link"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 3: New Lot Defaults */}
              <div className="details-clean-card">
                <div className="details-card-header">
                  <div className="details-card-title-group">
                    <h3>New Lot Defaults</h3>
                    <p>Preset tax tiers, BP rates & commissions</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvTarget('Defaults');
                        setIsCsvModalOpen(true);
                      }}
                      className="btn-clean-white"
                      style={{ padding: '5px 8px' }}
                      title="Import Schedules CSV"
                    >
                      <Upload size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showToast('info', 'Export', 'Downloading default schedule templates...');
                      }}
                      className="btn-clean-white"
                      style={{ padding: '5px 8px' }}
                      title="Download Template"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Commission Rule */}
                  <div>
                    <label className="ecomm-form-label" style={{ marginBottom: 4 }}>COMMISSION RULE</label>
                    {auction.lotDefaults.commission ? (
                      <div className="default-rule-chip-container">
                        <div className="default-rule-chip-content">
                          <span className="default-rule-code-badge">
                            {auction.lotDefaults.commission.split(' - ')[0] || auction.lotDefaults.commission}
                          </span>
                          <span>
                            {auction.lotDefaults.commission.split(' - ')[1] || ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="default-rule-clear-btn"
                          onClick={() => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'commission', value: '' })}
                          title="Clear commission rule"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <SearchableSelect 
                        value=""
                        onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'commission', value: val })}
                        options={[
                          'CSS_52F3ABA3 - SS -> [0% up to $0 ...]',
                          'COMM_STD_10 - Standard 10% Consignor',
                          'COMM_FLAT_5 - Flat 5% Estate Reserve'
                        ]}
                        showAdd={true}
                        showUpload={false}
                        onAddOption={() => {
                          setCreateOptionTarget('commission');
                          setIsCreateOptionModalOpen(true);
                        }}
                      />
                    )}
                  </div>

                  {/* Buyer Tax Code */}
                  <div>
                    <label className="ecomm-form-label" style={{ marginBottom: 4 }}>
                      <span>BUYER TAX CODE</span>
                      {auction.taxExemptAll && (
                        <span style={{ color: '#059669', fontSize: 11 }}>(Disabled: Tax Exempt All Active)</span>
                      )}
                    </label>
                    {auction.lotDefaults.buyerTax && !auction.taxExemptAll ? (
                      <div className="default-rule-chip-container">
                        <div className="default-rule-chip-content">
                          <span className="default-rule-code-badge">
                            {auction.lotDefaults.buyerTax.split(' - ')[0] || auction.lotDefaults.buyerTax}
                          </span>
                          <span>
                            {auction.lotDefaults.buyerTax.split(' - ')[1] || ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="default-rule-clear-btn"
                          onClick={() => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerTax', value: '' })}
                          title="Clear buyer tax"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <SearchableSelect 
                        value=""
                        disabled={auction.taxExemptAll}
                        onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerTax', value: val })}
                        options={[
                          'BTAX_0% - 0% BuyerTax',
                          'BTAX_6% - 6% Montana Sales Surcharge',
                          'BTAX_7.5% - 7.5% Standard County Tax'
                        ]}
                        showAdd={true}
                        showUpload={false}
                        onAddOption={() => {
                          setCreateOptionTarget('buyerTax');
                          setIsCreateOptionModalOpen(true);
                        }}
                      />
                    )}
                  </div>

                  {/* Buyer Premium (BP) */}
                  <div>
                    <label className="ecomm-form-label" style={{ marginBottom: 4 }}>BUYER PREMIUM (BP)</label>
                    {auction.lotDefaults.buyerPremium ? (
                      <div className="default-rule-chip-container">
                        <div className="default-rule-chip-content">
                          <span className="default-rule-code-badge">
                            {auction.lotDefaults.buyerPremium.split(' - ')[0] || auction.lotDefaults.buyerPremium}
                          </span>
                          <span>
                            {auction.lotDefaults.buyerPremium.split(' - ')[1] || ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="default-rule-clear-btn"
                          onClick={() => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerPremium', value: '' })}
                          title="Clear buyer premium"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <SearchableSelect 
                        value=""
                        onChange={(val) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerPremium', value: val })}
                        options={[
                          'BP_15 - 15% BP for all bidders',
                          'BP_12 - 12% BP Preferred In-House Tier',
                          'BP_18 - 18% Credit Card Tier'
                        ]}
                        showAdd={true}
                        showUpload={false}
                        onAddOption={() => {
                          setCreateOptionTarget('buyerPremium');
                          setIsCreateOptionModalOpen(true);
                        }}
                      />
                    )}
                  </div>

                  {/* Seller Tax */}
                  <div>
                    <label className="ecomm-form-label" style={{ marginBottom: 4 }}>SELLER TAX</label>
                    <select
                      value={auction.lotDefaults.sellerTax || ''}
                      onChange={(e) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'sellerTax', value: e.target.value })}
                      className="ecomm-select"
                    >
                      <option value="">Select option...</option>
                      <option value="STAX_0% - 0% Seller Tax">STAX_0% - 0% Seller Tax</option>
                      <option value="STAX_3% - 3% State Consignment Excise">STAX_3% - 3% State Consignment Excise</option>
                    </select>
                  </div>

                  {/* Buyer Lot Charges 1 & 2 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="ecomm-form-label" style={{ marginBottom: 4 }}>BUYER LOT CHARGE 1</label>
                      <select
                        value={auction.lotDefaults.buyerLotCharge1 || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerLotCharge1', value: e.target.value })}
                        className="ecomm-select"
                      >
                        <option value="">Select charge...</option>
                        <option value="CHG_PACK_4.50 - In-House Packaging Surcharge $4.50">CHG_PACK_4.50 - In-House Packaging $4.50</option>
                        <option value="CHG_INSUR_10 - Registered Postal Insurance $10.00">CHG_INSUR_10 - Postal Insurance $10.00</option>
                      </select>
                    </div>

                    <div>
                      <label className="ecomm-form-label" style={{ marginBottom: 4 }}>BUYER LOT CHARGE 2</label>
                      <select
                        value={auction.lotDefaults.buyerLotCharge2 || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_LOT_DEFAULTS', field: 'buyerLotCharge2', value: e.target.value })}
                        className="ecomm-select"
                      >
                        <option value="">Select charge...</option>
                        <option value="CHG_VAULT_5 - Secure Vault Handling $5.00">CHG_VAULT_5 - Secure Vault $5.00</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Ring & Clerk Audio Options (Locked) */}
              <div className="locked-audio-card" title="Available during Auction Day">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={15} color="#94a3b8" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                    Ring & Clerk Audio Options
                  </span>
                </div>
                <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>
                  Available during Auction Day
                </span>
              </div>
            </div>
          </div>

          {/* Details Page Footer Actions (Discard & Save Settings) */}
          <div className="details-page-footer-actions">
            <button
              type="button"
              className="btn-clean-white"
              onClick={() => {
                showToast('info', 'Discard', 'Reset changes to saved state.');
              }}
            >
              Discard
            </button>
            <button
              type="button"
              className="btn-executive-gold"
              disabled={isSavingLocal}
              onClick={async () => {
                setIsSavingLocal(true);
                const ok = await saveAuction();
                setIsSavingLocal(false);
                if (ok) {
                  showToast('success', 'Saved', 'Auction configuration saved successfully!');
                }
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{isSavingLocal ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: UPLOAD SETTINGS
          ========================================================================= */}
      {currentTab === 'upload-settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

        {/* Bottom Save Action Bar for Upload Settings */}
        <div style={{
          marginTop: 8,
          padding: '16px 20px',
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b45309'
            }}>
              <Settings size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Upload & Syndication Configuration
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)' }}>
                Sync bidding schedules, registration rules, card acceptance, and notices to Supabase.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-gold"
            onClick={handleSaveUploadSettings}
            disabled={isSavingLocal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 22px',
              fontSize: 13,
              fontWeight: 700,
              cursor: isSavingLocal ? 'not-allowed' : 'pointer',
              borderRadius: 6
            }}
          >
            <Save size={15} />
            <span>{isSavingLocal ? 'Saving...' : 'Save Upload Settings'}</span>
          </button>
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
          SUB-TAB 4: LOTS (Custom Auction Lots Table matching reference)
          ========================================================================= */}
      {currentTab === 'lots' && (() => {
        const query = lotSearch.toLowerCase().trim();
        const filtered = filteredAuctionLots.filter(l => {
          if (statusFilter === 'not_clerked' && l.status !== 'upcoming') return false;
          if (statusFilter === 'on_block' && l.status !== 'on_block') return false;
          if (statusFilter === 'sold' && l.status !== 'sold') return false;

          if (!query) return true;
          return (
            l.title.toLowerCase().includes(query) ||
            l.lotNumber.toString().includes(query) ||
            (l.status || '').toLowerCase().includes(query) ||
            (l.category || '').toLowerCase().includes(query) ||
            (l.consignorName || '').toLowerCase().includes(query)
          );
        });

        const sorted = [...filtered].sort((a, b) => {
          let aVal: any = '';
          let bVal: any = '';

          if (lotSortCol === 'lotNumber') {
            aVal = a.lotNumber;
            bVal = b.lotNumber;
          } else if (lotSortCol === 'saleOrder') {
            aVal = a.saleOrder ?? a.lotNumber;
            bVal = b.saleOrder ?? b.lotNumber;
          } else if (lotSortCol === 'title') {
            aVal = (a.title || '').toLowerCase();
            bVal = (b.title || '').toLowerCase();
          } else if (lotSortCol === 'staggerSeconds') {
            aVal = a.staggerSeconds ?? 0;
            bVal = b.staggerSeconds ?? 0;
          } else if (lotSortCol === 'quantity') {
            aVal = a.quantity ?? 1;
            bVal = b.quantity ?? 1;
          } else if (lotSortCol === 'status') {
            aVal = a.status === 'upcoming' ? 'not clerked' : a.status;
            bVal = b.status === 'upcoming' ? 'not clerked' : b.status;
          }

          if (aVal < bVal) return lotSortDir === 'asc' ? -1 : 1;
          if (aVal > bVal) return lotSortDir === 'asc' ? 1 : -1;
          return 0;
        });

        const allSelected = sorted.length > 0 && selectedLots.length === sorted.length;

        const toggleSelectAll = () => {
          if (allSelected) {
            setSelectedLots([]);
          } else {
            setSelectedLots(sorted.map(l => l.id));
          }
        };

        const toggleSelectLot = (id: string) => {
          setSelectedLots(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          );
        };

        const toggleLotSort = (col: typeof lotSortCol) => {
          if (lotSortCol === col) {
            setLotSortDir(d => d === 'asc' ? 'desc' : 'asc');
          } else {
            setLotSortCol(col);
            setLotSortDir('asc');
          }
        };

        const renderLotSortIcon = (col: typeof lotSortCol) => {
          if (lotSortCol !== col) {
            return <ArrowUpDown size={12} style={{ color: '#94a3b8', marginLeft: 6, verticalAlign: 'middle' }} />;
          }
          return lotSortDir === 'asc'
            ? <ArrowUp size={12} style={{ color: 'var(--gold-primary, #cba135)', marginLeft: 6, verticalAlign: 'middle' }} />
            : <ArrowDown size={12} style={{ color: 'var(--gold-primary, #cba135)', marginLeft: 6, verticalAlign: 'middle' }} />;
        };

        const formatLotStatus = (status: string) => {
          if (status === 'upcoming') return 'Not Clerked';
          if (status === 'on_block') return 'On Block';
          if (status === 'sold') return 'Sold';
          if (status === 'passed') return 'Passed';
          if (status === 'withdrawn') return 'Withdrawn';
          return status || 'Not Clerked';
        };

        return (
          <div className="syndication-card" style={{ padding: 24, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8f0' }}>
            {/* Top Card Header matching reference screenshot */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 20,
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                    Lots
                  </h2>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '2px 10px',
                    borderRadius: 9999,
                    background: '#f1f5f9',
                    color: '#64748b'
                  }}>
                    {sorted.length} items
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>
                  Manage the lots for this auction. Add lots manually, scan lots, or import from a sale order.
                </p>
              </div>

              {/* Action Buttons matching screenshot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* + Add Lot */}
                <button
                  type="button"
                  onClick={() => setIsLotsNewLotModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    background: '#151922',
                    color: '#ffffff',
                    border: '1.5px solid #cba135',
                    boxShadow: '0 0 10px rgba(203, 161, 53, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(203, 161, 53, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(203, 161, 53, 0.2)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <Plus size={15} color="#cba135" strokeWidth={2.5} />
                  <span>Add Lot</span>
                </button>

                {/* Scan Lot */}
                <button
                  type="button"
                  onClick={() => setIsScanLotModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    background: '#151922',
                    color: '#ffffff',
                    border: '1.5px solid #cba135',
                    boxShadow: '0 0 10px rgba(203, 161, 53, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(203, 161, 53, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(203, 161, 53, 0.2)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <Barcode size={16} color="#cba135" />
                  <span>Scan Lot</span>
                </button>

                {/* Sale Order */}
                <button
                  type="button"
                  onClick={() => setIsSaleOrderModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    background: '#151922',
                    color: '#ffffff',
                    border: '1.5px solid #cba135',
                    boxShadow: '0 0 10px rgba(203, 161, 53, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(203, 161, 53, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(203, 161, 53, 0.2)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <Settings size={15} color="#cba135" />
                  <span>Sale Order</span>
                </button>
              </div>
            </div>

            {/* Search Bar Row with Filters & Column Settings Gear */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16
            }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={lotSearch}
                  onChange={(e) => setLotSearch(e.target.value)}
                  placeholder="Search lots by number, title, or keyword..."
                  style={{
                    width: '100%',
                    height: 40,
                    paddingLeft: 38,
                    paddingRight: 32,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 13.5,
                    background: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary, #cba135)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                {lotSearch && (
                  <button
                    type="button"
                    onClick={() => setLotSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters dropdown button */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 40,
                    padding: '0 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    background: '#ffffff',
                    color: '#1e293b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Filter size={15} color="#64748b" />
                  <span>Filters</span>
                  <ChevronDown size={14} color="#64748b" />
                </button>

                {isFilterMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 6,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-dropdown)',
                    padding: 8,
                    minWidth: 170,
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '4px 8px' }}>
                      Filter by Status
                    </div>
                    {[
                      { key: 'all', label: 'All Lots' },
                      { key: 'not_clerked', label: 'Not Clerked' },
                      { key: 'on_block', label: 'On Block' },
                      { key: 'sold', label: 'Sold' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setStatusFilter(opt.key as any);
                          setIsFilterMenuOpen(false);
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '6px 10px',
                          fontSize: 12.5,
                          borderRadius: 4,
                          background: statusFilter === opt.key ? '#f1f5f9' : 'none',
                          color: statusFilter === opt.key ? 'var(--gold-dark, #8c6428)' : '#334155',
                          fontWeight: statusFilter === opt.key ? 700 : 500,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Column Settings Gear button */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsLotColumnMenuOpen(!isLotColumnMenuOpen)}
                  title="Column Settings"
                  style={{
                    width: 40,
                    height: 40,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    background: '#ffffff',
                    color: '#64748b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Settings size={16} />
                </button>

                {isLotColumnMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 6,
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-dropdown)',
                    padding: 12,
                    minWidth: 180,
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                      Toggle Columns
                    </div>
                    {[
                      { key: 'lotNumber', label: 'Lot #' },
                      { key: 'saleOrder', label: 'Sale Order' },
                      { key: 'title', label: 'Title' },
                      { key: 'staggerSeconds', label: 'Hibid Lot Stagger' },
                      { key: 'quantity', label: 'Quantity' },
                      { key: 'status', label: 'Status' }
                    ].map(({ key, label }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', color: '#1e293b' }}>
                        <input
                          type="checkbox"
                          checked={lotColsVisible[key as keyof typeof lotColsVisible]}
                          onChange={() => setLotColsVisible(prev => ({ ...prev, [key]: !prev[key as keyof typeof lotColsVisible] }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table matching reference screenshot */}
            <div style={{ border: '1px solid #f1f5f9', borderRadius: 8, overflow: 'hidden', background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ width: 44, padding: '12px 10px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        style={{ width: 16, height: 16, cursor: 'pointer', borderRadius: 4 }}
                      />
                    </th>

                    {lotColsVisible.lotNumber && (
                      <th
                        onClick={() => toggleLotSort('lotNumber')}
                        style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none', width: 90 }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Lot # {renderLotSortIcon('lotNumber')}
                        </span>
                      </th>
                    )}

                    {lotColsVisible.saleOrder && (
                      <th
                        onClick={() => toggleLotSort('saleOrder')}
                        style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none', width: 110 }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Sale Order {renderLotSortIcon('saleOrder')}
                        </span>
                      </th>
                    )}

                    {lotColsVisible.title && (
                      <th
                        onClick={() => toggleLotSort('title')}
                        style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Title {renderLotSortIcon('title')}
                        </span>
                      </th>
                    )}

                    {lotColsVisible.staggerSeconds && (
                      <th
                        onClick={() => toggleLotSort('staggerSeconds')}
                        style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none', width: 150 }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Hibid Lot Stagger {renderLotSortIcon('staggerSeconds')}
                        </span>
                      </th>
                    )}

                    {lotColsVisible.quantity && (
                      <th
                        onClick={() => toggleLotSort('quantity')}
                        style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none', width: 90 }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          Quantity {renderLotSortIcon('quantity')}
                        </span>
                      </th>
                    )}

                    {lotColsVisible.status && (
                      <th
                        onClick={() => toggleLotSort('status')}
                        style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none', width: 140 }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Status {renderLotSortIcon('status')}
                        </span>
                      </th>
                    )}

                    <th style={{ textAlign: 'center', padding: '12px 14px', width: 50 }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((lot, idx) => (
                    <tr
                      key={lot.id}
                      style={{
                        borderBottom: '1px solid #f8fafc',
                        background: selectedLots.includes(lot.id) ? '#fbfcfe' : '#ffffff',
                        transition: 'background 0.12s ease'
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedLots.includes(lot.id)}
                          onChange={() => toggleSelectLot(lot.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', borderRadius: 4 }}
                        />
                      </td>

                      {/* Lot # */}
                      {lotColsVisible.lotNumber && (
                        <td style={{ padding: '12px 14px', color: '#1e293b', fontSize: 13.5, fontWeight: 600 }}>
                          {lot.lotNumber}
                        </td>
                      )}

                      {/* Sale Order input */}
                      {lotColsVisible.saleOrder && (
                        <td style={{ padding: '8px 14px' }}>
                          <input
                            type="number"
                            min="1"
                            value={lot.saleOrder ?? lot.lotNumber}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              onUpdateLot({ ...lot, saleOrder: val });
                            }}
                            style={{
                              width: 62,
                              height: 32,
                              padding: '0 6px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              fontSize: 13,
                              textAlign: 'center',
                              background: '#ffffff',
                              color: '#1e293b',
                              outline: 'none'
                            }}
                          />
                        </td>
                      )}

                      {/* Title */}
                      {lotColsVisible.title && (
                        <td style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 500, fontSize: 13.5 }}>
                          {lot.title}
                        </td>
                      )}

                      {/* Hibid Lot Stagger input */}
                      {lotColsVisible.staggerSeconds && (
                        <td style={{ padding: '8px 14px' }}>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={lot.staggerSeconds ?? ((idx + 1) * 20)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              onUpdateLot({ ...lot, staggerSeconds: val });
                            }}
                            style={{
                              width: 62,
                              height: 32,
                              padding: '0 6px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              fontSize: 13,
                              textAlign: 'center',
                              background: '#ffffff',
                              color: '#1e293b',
                              outline: 'none'
                            }}
                          />
                        </td>
                      )}

                      {/* Quantity */}
                      {lotColsVisible.quantity && (
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#1e293b', fontSize: 13.5 }}>
                          {lot.quantity || 1}
                        </td>
                      )}

                      {/* Status */}
                      {lotColsVisible.status && (
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            borderRadius: 9999,
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748b' }} />
                            <span>{formatLotStatus(lot.status)}</span>
                          </div>
                        </td>
                      )}

                      {/* Actions: Three-dot action menu */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={() => setActiveMenuLotId(activeMenuLotId === lot.id ? null : lot.id)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#64748b',
                              transition: 'all 0.15s ease'
                            }}
                            title="Lot options"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuLotId === lot.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: 4,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: 8,
                              boxShadow: 'var(--shadow-dropdown)',
                              padding: 4,
                              minWidth: 130,
                              zIndex: 50,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setLotsEditingLot(lot);
                                  setActiveMenuLotId(null);
                                }}
                                style={{
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  fontSize: 12.5,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  borderRadius: 4,
                                  color: '#1e293b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8
                                }}
                              >
                                <Edit3 size={14} color="#64748b" />
                                <span>Edit Lot</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setLotsLotToDelete(lot);
                                  setActiveMenuLotId(null);
                                }}
                                style={{
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  fontSize: 12.5,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  borderRadius: 4,
                                  color: '#dc2626',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8
                                }}
                              >
                                <Trash2 size={14} color="#dc2626" />
                                <span>Delete Lot</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                        {lotSearch ? 'No lots match search criteria.' : 'No lots assigned to this auction yet. Click "+ Add Lot" to catalog your first item.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer matching reference screenshot */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 4px 0',
              fontSize: 13,
              color: '#64748b'
            }}>
              <div>
                Showing {sorted.length} items in this auction
              </div>
              {selectedLots.length > 0 && (
                <div style={{ color: 'var(--gold-dark, #8c6428)', fontWeight: 600 }}>
                  {selectedLots.length} lot{selectedLots.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
      {currentTab === 'expenses' && (() => {
        const query = expenseSearch.toLowerCase().trim();
        const filtered = (auction.expenses || []).filter(exp => {
          if (!query) return true;
          return (
            (exp.type || '').toLowerCase().includes(query) ||
            (exp.account || '').toLowerCase().includes(query) ||
            (exp.payFrom || '').toLowerCase().includes(query) ||
            (exp.description || '').toLowerCase().includes(query) ||
            (exp.amount !== undefined ? exp.amount.toString() : '').includes(query) ||
            (exp.date || '').toLowerCase().includes(query)
          );
        });

        const sorted = [...filtered].sort((a, b) => {
          let aVal: any = a[expenseSortColumn as keyof AuctionExpense] || '';
          let bVal: any = b[expenseSortColumn as keyof AuctionExpense] || '';
          if (expenseSortColumn === 'amount') {
            aVal = Number(a.amount) || 0;
            bVal = Number(b.amount) || 0;
          } else {
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
          }
          if (aVal < bVal) return expenseSortDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return expenseSortDirection === 'asc' ? 1 : -1;
          return 0;
        });

        const totalItems = sorted.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / expensePageSize));
        const safePage = Math.min(expensePage, totalPages);
        const paged = sorted.slice((safePage - 1) * expensePageSize, safePage * expensePageSize);

        const totalExpensesAmount = (auction.expenses || []).reduce(
          (sum, exp) => sum + (Number(exp.amount) || 0), 0
        );

        const toggleSort = (col: typeof expenseSortColumn) => {
          if (expenseSortColumn === col) {
            setExpenseSortDirection(d => d === 'asc' ? 'desc' : 'asc');
          } else {
            setExpenseSortColumn(col);
            setExpenseSortDirection('asc');
          }
        };

        const renderSortIcon = (col: typeof expenseSortColumn) => {
          if (expenseSortColumn !== col) {
            return <ArrowUpDown size={12} style={{ color: 'var(--text-dim)', marginLeft: 4 }} />;
          }
          return expenseSortDirection === 'asc'
            ? <ArrowUp size={12} style={{ color: 'var(--gold-primary)', marginLeft: 4 }} />
            : <ArrowDown size={12} style={{ color: 'var(--gold-primary)', marginLeft: 4 }} />;
        };

        return (
          <div className="syndication-card">
            {/* Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
              flexWrap: 'wrap'
            }}>
              <button 
                type="button" 
                className="btn btn-gold"
                onClick={handleOpenAddExpense}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={15} />
                <span>+ New Expense</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                <div style={{ position: 'relative', width: 260 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input 
                    type="text"
                    placeholder="Search expenses..."
                    value={expenseSearch}
                    onChange={(e) => {
                      setExpenseSearch(e.target.value);
                      setExpensePage(1);
                    }}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, paddingLeft: 30, fontSize: 12.5 }}
                  />
                  {expenseSearch && (
                    <button
                      type="button"
                      onClick={() => setExpenseSearch('')}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Column-settings gear */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsColumnSettingsOpen(!isColumnSettingsOpen)}
                    title="Column settings"
                    style={{ width: 34, height: 34, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <SlidersHorizontal size={15} />
                  </button>

                  {isColumnSettingsOpen && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: 6,
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      boxShadow: 'var(--shadow-card-hover)',
                      padding: 12,
                      minWidth: 190,
                      zIndex: 50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                        Column Settings
                      </div>
                      {[
                        { key: 'type', label: 'Type' },
                        { key: 'account', label: 'Account' },
                        { key: 'payFrom', label: 'Pay From' },
                        { key: 'description', label: 'Expense Description' },
                        { key: 'amount', label: 'Amount' }
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', color: 'var(--text-main)' }}>
                          <input 
                            type="checkbox"
                            checked={visibleColumns[key as keyof typeof visibleColumns]}
                            onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibleColumns] }))}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                    {visibleColumns.type && (
                      <th 
                        onClick={() => toggleSort('type')}
                        style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Type {renderSortIcon('type')}
                        </span>
                      </th>
                    )}
                    {visibleColumns.account && (
                      <th 
                        onClick={() => toggleSort('account')}
                        style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Account {renderSortIcon('account')}
                        </span>
                      </th>
                    )}
                    {visibleColumns.payFrom && (
                      <th 
                        onClick={() => toggleSort('payFrom')}
                        style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Pay From {renderSortIcon('payFrom')}
                        </span>
                      </th>
                    )}
                    {visibleColumns.description && (
                      <th 
                        onClick={() => toggleSort('description')}
                        style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Expense Description {renderSortIcon('description')}
                        </span>
                      </th>
                    )}
                    {visibleColumns.amount && (
                      <th 
                        onClick={() => toggleSort('amount')}
                        style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          Amount {renderSortIcon('amount')}
                        </span>
                      </th>
                    )}
                    <th style={{ textAlign: 'center', padding: '10px 14px', width: 90, fontWeight: 600 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((exp) => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: '#ffffff' }}>
                      {visibleColumns.type && (
                        <td style={{ padding: '10px 14px', color: 'var(--text-main)', fontWeight: 500 }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: '#f1f5f9',
                            color: '#334155'
                          }}>
                            {exp.type}
                          </span>
                        </td>
                      )}
                      {visibleColumns.account && (
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          <span style={{ textTransform: 'lowercase' }}>{exp.account}</span>
                        </td>
                      )}
                      {visibleColumns.payFrom && (
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          <span style={{ textTransform: 'capitalize' }}>{exp.payFrom || 'Cash'}</span>
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td style={{ padding: '10px 14px', color: 'var(--text-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{exp.description}</span>
                            {exp.receiptUrl && (
                              <span 
                                title="Receipt attached" 
                                style={{ fontSize: 10.5, padding: '1px 5px', borderRadius: 3, background: '#ecfdf5', color: '#047857', fontWeight: 600 }}
                              >
                                Receipt
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.amount && (
                        <td style={{
                          padding: '10px 14px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: exp.amount > 0 ? '#dc2626' : 'var(--text-main)'
                        }}>
                          ${(Number(exp.amount) || 0).toFixed(2)}
                        </td>
                      )}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button 
                            type="button"
                            onClick={() => handleOpenEditExpense(exp)}
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: 4 }}
                            title="Edit expense"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}
                            title="Delete expense"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                        {expenseSearch ? 'No expenses match search criteria.' : 'No expenses logged for this auction event.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Summary Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '12px 18px',
                background: '#fafaf8',
                borderTop: '1.5px solid var(--border-subtle)',
                fontSize: 13.5,
                fontWeight: 600,
                color: 'var(--text-main)'
              }}>
                <span>Total expenses:&nbsp;</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                  ${totalExpensesAmount.toFixed(2)}
                </span>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: 12.5,
                background: '#ffffff',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Show</span>
                  <select
                    value={expensePageSize}
                    onChange={(e) => {
                      setExpensePageSize(Number(e.target.value));
                      setExpensePage(1);
                    }}
                    className="catalog-search-input"
                    style={{ height: 28, padding: '0 8px', fontSize: 12 }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>entries</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    Prev
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setExpensePage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Terms and Conditions Preview Modal */}
      <FormModal
        isOpen={isTermsModalOpen}
        title="Terms and Conditions Preview"
        onClose={() => setIsTermsModalOpen(false)}
        submitLabel="Close"
        onSubmit={(e) => { e.preventDefault(); setIsTermsModalOpen(false); }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: 'var(--ecomm-text-muted, #64748b)', margin: 0 }}>
            This legal text is displayed to registered bidders on HiBid syndication portals and live saleroom catalogs.
          </p>
          <div className="terms-preview-content">
            {auction.terms || 'No terms and conditions configured yet.'}
          </div>
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

      {/* New / Edit Expense Modal */}
      <FormModal
        isOpen={isExpenseModalOpen}
        title={editingExpense ? 'Edit Operating Expense' : 'Log New Operating Expense'}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleSaveExpense}
        submitLabel={editingExpense ? 'Update Expense' : 'Save Expense'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type with + New type */}
          <FormField label="Expense Type *" required>
            {!isCustomType ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={expType}
                  onChange={(e) => {
                    if (e.target.value === '__new_type__') {
                      setIsCustomType(true);
                      setCustomExpType('');
                    } else {
                      setExpType(e.target.value);
                    }
                  }}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                >
                  {EXPENSE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="__new_type__">+ New type...</option>
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCustomType(true)}
                  style={{ padding: '0 12px', height: 36, whiteSpace: 'nowrap', fontSize: 12 }}
                >
                  + New type
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  required
                  placeholder="Enter custom expense type"
                  value={customExpType}
                  onChange={(e) => setCustomExpType(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsCustomType(false);
                    setExpType(EXPENSE_TYPES[0]);
                  }}
                  style={{ padding: '0 12px', height: 36, whiteSpace: 'nowrap', fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </FormField>

          {/* Account (creatable) */}
          <FormField label="Account *" required>
            {!isCustomAccount ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={expAccount}
                  onChange={(e) => {
                    if (e.target.value === '__new_account__') {
                      setIsCustomAccount(true);
                      setCustomAccount('');
                    } else {
                      setExpAccount(e.target.value);
                    }
                  }}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                >
                  {existingAccounts.map(acc => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                  <option value="__new_account__">+ New account...</option>
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCustomAccount(true)}
                  style={{ padding: '0 12px', height: 36, whiteSpace: 'nowrap', fontSize: 12 }}
                >
                  + New
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. google ads, storage locker"
                  value={customAccount}
                  onChange={(e) => setCustomAccount(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsCustomAccount(false);
                    setExpAccount(existingAccounts[0] || 'facebook');
                  }}
                  style={{ padding: '0 12px', height: 36, whiteSpace: 'nowrap', fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </FormField>

          {/* Pay From */}
          <FormField label="Pay From *" required>
            <select
              value={expPayFrom}
              onChange={(e) => setExpPayFrom(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            >
              {PAY_FROM_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          {/* Expense Description */}
          <FormField label="Expense Description *" required>
            <input 
              type="text"
              required
              placeholder="e.g. Facebook Campaign Ads"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>

          {/* Amount and Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Amount ($) *" required>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-dim)' }}>$</span>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 36, paddingLeft: 24, fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </FormField>

            <FormField label="Date *" required>
              <input 
                type="date"
                required
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>

          {/* Optional Receipt Upload */}
          <FormField label="Receipt (Optional image or PDF)">
            {expReceiptPreview || expReceiptName ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  {expReceiptPreview && expReceiptPreview.startsWith('data:image') ? (
                    <img src={expReceiptPreview} alt="Receipt preview" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <FileText size={18} color="var(--gold-primary)" />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {expReceiptName || 'Attached receipt document'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExpReceiptName('');
                    setExpReceiptPreview(null);
                  }}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}
                  title="Remove receipt"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <label style={{
                display: 'block',
                border: '1.5px dashed var(--border-subtle)',
                borderRadius: 6,
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#fafaf8'
              }}>
                <Upload size={18} color="var(--gold-primary)" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Click to upload receipt (JPG, PNG, PDF)
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setExpReceiptName(file.name);
                      const reader = new FileReader();
                      reader.onload = () => {
                        setExpReceiptPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </FormField>
        </div>
      </FormModal>

      {/* Delete Expense Confirmation Modal */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense record for "${expenseToDelete?.description}"? This action cannot be undone.`}
        confirmLabel="Delete Expense"
        isDestructive={true}
        onConfirm={handleConfirmDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* Pre-Auction Lot Form Modal (Single 4-Card Modal) */}
      <LotFormModal
        isOpen={isLotsNewLotModalOpen || !!lotsEditingLot}
        onClose={() => {
          setIsLotsNewLotModalOpen(false);
          setLotsEditingLot(null);
        }}
        onSave={async (lotData) => {
          if (lotsEditingLot) {
            onUpdateLot(lotData);
          } else {
            onAddLot(lotData);
          }
          setIsLotsNewLotModalOpen(false);
          setLotsEditingLot(null);
        }}
        editingLot={lotsEditingLot}
        lots={lots}
        auctions={[auction as any]}
        defaultAuctionId={auction.id}
        lockAuction={true}
        consignors={INITIAL_USERS}
      />

      {/* Delete Lot Confirmation Modal */}
      <ConfirmModal
        isOpen={!!lotsLotToDelete}
        title="Delete Catalog Lot"
        message={`Are you sure you want to delete Lot #${lotsLotToDelete?.lotNumber} (${lotsLotToDelete?.title})? This will permanently remove the lot from this auction.`}
        confirmLabel="Delete Lot"
        isDestructive={true}
        onConfirm={async () => {
          if (lotsLotToDelete) {
            await onDeleteLot(lotsLotToDelete.id);
            setLotsLotToDelete(null);
          }
        }}
        onCancel={() => setLotsLotToDelete(null)}
      />

      {/* Scan Lot Modal */}
      <FormModal
        isOpen={isScanLotModalOpen}
        title="Scan Lot / Quick Find"
        onClose={() => {
          setIsScanLotModalOpen(false);
          setScanInput('');
        }}
        submitLabel="Open Lot"
        onSubmit={(e) => {
          e.preventDefault();
          const target = filteredAuctionLots.find(
            l => l.lotNumber.toString() === scanInput.trim() ||
                 (l.certNumber && l.certNumber.toLowerCase() === scanInput.trim().toLowerCase())
          );
          if (target) {
            setIsScanLotModalOpen(false);
            setScanInput('');
            setLotsEditingLot(target);
          } else {
            alert(`No lot found matching "${scanInput}". Please enter a valid lot number (e.g. 101) or certification number.`);
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 8,
            padding: '24px 16px',
            textAlign: 'center',
            background: '#fafaf8'
          }}>
            <Barcode size={36} color="var(--gold-primary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
              Scan Barcode / Enter Lot Number
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Scan with handheld scanner or type lot number below
            </div>
          </div>

          <FormField label="Lot # or Certification Number *" required>
            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. 101 or 48291044"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 38 }}
            />
          </FormField>
        </div>
      </FormModal>

      {/* Sale Order Sequencing Modal */}
      <FormModal
        isOpen={isSaleOrderModalOpen}
        title="Auto-Sequence Sale Order & HiBid Stagger"
        onClose={() => setIsSaleOrderModalOpen(false)}
        submitLabel="Apply Sequencing"
        onSubmit={(e) => {
          e.preventDefault();
          const sorted = [...filteredAuctionLots].sort((a, b) => a.lotNumber - b.lotNumber);
          sorted.forEach((l, idx) => {
            onUpdateLot({
              ...l,
              saleOrder: idx + 1,
              staggerSeconds: (idx + 1) * bulkStaggerInterval
            });
          });
          setIsSaleOrderModalOpen(false);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Automatically numbers the <strong>Sale Order</strong> from 1 to {filteredAuctionLots.length} in ascending lot number sequence, and assigns incremental HiBid stagger countdown seconds for the catalog.
          </p>

          <FormField label="HiBid Stagger Increment (seconds per lot) *" required>
            <input
              type="number"
              min="5"
              step="5"
              required
              value={bulkStaggerInterval}
              onChange={(e) => setBulkStaggerInterval(parseInt(e.target.value) || 20)}
              className="catalog-search-input"
              style={{ width: '100%', height: 38 }}
            />
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
              e.g. 20s will set Lot 1 to 20s, Lot 2 to 40s, Lot 3 to 60s, Lot 4 to 80s...
            </span>
          </FormField>
        </div>
      </FormModal>
    </div>
  );
};
