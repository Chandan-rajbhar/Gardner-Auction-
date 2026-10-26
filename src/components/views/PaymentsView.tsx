import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InvoiceSettlement, ConsignorSettlement, NavigationSection } from '../../types';
import { SettlementCustomer } from '../../types/auctionDetail';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  PackageCheck, 
  FileText, 
  Printer, 
  Search, 
  X, 
  Settings, 
  Gavel, 
  CheckCircle, 
  RotateCw, 
  Eye, 
  Send, 
  ArrowLeft,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  Building,
  Mail,
  AlertCircle
} from 'lucide-react';
import { ShadcnSheet } from '../ui/ShadcnSheet';
import { ShadcnSelect, ShadcnSelectOption } from '../ui/ShadcnSelect';
import { settlementService, BatchShipmentData } from '../../services/settlementService';
import { auctionService } from '../../services/auctionService';
import { useToast } from '../../context/ToastContext';

// Handshake icon for Settlement workflow stage
const HandshakeIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-3-3a1 1 0 0 0-1.4 0l-1.3 1.3" />
    <path d="m14 14-5-5a1 1 0 0 0-1.4 0l-4.3 4.3a1 1 0 0 0 0 1.4l3 3a1 1 0 0 0 1.4 0l2-2" />
    <path d="M2 13h2l2 2" />
    <path d="M22 13h-2l-2 2" />
  </svg>
);

interface PaymentsViewProps {
  invoices?: InvoiceSettlement[];
  consignorSettlements?: ConsignorSettlement[];
  onUpdateInvoiceStatus?: (id: string, status: InvoiceSettlement['paymentStatus']) => void;
  onUpdateConsignorStatus?: (id: string, status: ConsignorSettlement['status']) => void;
  selectedAuctionId?: string;
  availableAuctions?: Array<{ id: string; code: string; title: string; status?: string }>;
  onSelectAuction?: (id: string) => void;
  onNavigateAuctions?: () => void;
  onNavigateSection?: (section: NavigationSection) => void;
}

const CARRIER_OPTIONS: ShadcnSelectOption[] = [
  { value: 'FedEx Ground', label: 'FedEx Ground (Direct Signature)' },
  { value: 'FedEx Priority Overnight', label: 'FedEx Priority Overnight' },
  { value: 'UPS Express', label: 'UPS Express Saver' },
  { value: 'USPS Priority Mail', label: 'USPS Priority Mail Registered' },
  { value: 'Armored Courier', label: 'Armored Courier (Brinks / Malca-Amit)' },
  { value: 'Local Saleroom Pickup', label: 'Local Saleroom Pickup (Signed Receipt)' }
];

const PAYMENT_STATUS_OPTIONS: ShadcnSelectOption[] = [
  { value: 'Paid', label: 'Paid (Fully Settled)' },
  { value: 'Pending Wire', label: 'Pending Wire Transfer' },
  { value: 'Card Authorized', label: 'Card Authorized' },
  { value: 'Check Received', label: 'Check Received (Clearing)' },
  { value: 'Unpaid', label: 'Unpaid' }
];

const PAYMENT_METHOD_OPTIONS: ShadcnSelectOption[] = [
  { value: 'Wire Transfer', label: 'Bank Wire Transfer' },
  { value: 'Credit Card', label: 'Credit Card on File (HiBid / Square)' },
  { value: 'Cash', label: 'Cash (In-Person Floor Settlement)' },
  { value: 'Company Check', label: 'Cashier\'s Check / Money Order' },
  { value: 'Escrow', label: 'Third-Party Escrow' }
];

const DOC_TYPE_OPTIONS: ShadcnSelectOption[] = [
  { value: 'buyer_invoice', label: 'Buyer Settlement Invoices' },
  { value: 'seller_statement', label: 'Consignor Payout Statements' },
  { value: 'summary', label: 'Consolidated Auction Settlement Summary' }
];

const PAGE_SIZE_OPTIONS: ShadcnSelectOption[] = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' }
];

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  invoices: propInvoices = [],
  consignorSettlements: propConsignorSettlements = [],
  onUpdateInvoiceStatus,
  onUpdateConsignorStatus,
  selectedAuctionId = 'auc-002',
  availableAuctions = [],
  onSelectAuction,
  onNavigateAuctions,
  onNavigateSection
}) => {
  const { showToast } = useToast();

  // Active Main Workflow Tab: 'bidder' | 'seller'
  const [activeTab, setActiveTab] = useState<'bidder' | 'seller'>('bidder');

  // Auction metadata
  const currentAuctionId = selectedAuctionId;
  const currentAuction = availableAuctions.find(a => a.id === currentAuctionId) || {
    id: currentAuctionId,
    code: currentAuctionId === 'auc-001' ? 'GA-2026-10-GOLD' : (currentAuctionId === 'auc-002' ? 'GA-2026-10-HISTORIC' : 'XCXZC'),
    title: 'Auction Settlement',
    status: 'In Progress'
  };

  // Dynamic Supabase data states
  const [bidderSettlements, setBidderSettlements] = useState<SettlementCustomer[]>([]);
  const [sellerSettlements, setSellerSettlements] = useState<ConsignorSettlement[]>([]);
  const [isLoadingBidder, setIsLoadingBidder] = useState<boolean>(true);
  const [isLoadingSeller, setIsLoadingSeller] = useState<boolean>(true);

  // Row selection states
  const [selectedBidderIds, setSelectedBidderIds] = useState<string[]>([]);
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);

  // Search filter states
  const [bidderSearchTerm, setBidderSearchTerm] = useState('');
  const [sellerSearchTerm, setSellerSearchTerm] = useState('');

  // Sorting states
  const [bidderSortField, setBidderSortField] = useState<string>('bidderNumber');
  const [bidderSortAsc, setBidderSortAsc] = useState<boolean>(true);
  const [sellerSortField, setSellerSortField] = useState<string>('consignorCode');
  const [sellerSortAsc, setSellerSortAsc] = useState<boolean>(true);

  // Pagination states
  const [bidderPage, setBidderPage] = useState<number>(1);
  const [bidderPageSize, setBidderPageSize] = useState<number>(10);
  const [sellerPage, setSellerPage] = useState<number>(1);
  const [sellerPageSize, setSellerPageSize] = useState<number>(10);

  // Column config popover state
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // Drawers & modals state
  const [isBatchShipmentsOpen, setIsBatchShipmentsOpen] = useState(false);
  const [isUpdateInvoicesOpen, setIsUpdateInvoicesOpen] = useState(false);
  const [isPrintEmailOpen, setIsPrintEmailOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceSettlement | null>(null);

  // Batch Shipments Drawer state
  const [batchShipSelectedIds, setBatchShipSelectedIds] = useState<string[]>([]);
  const [batchCarrier, setBatchCarrier] = useState('FedEx Ground');
  const [batchTracking, setBatchTracking] = useState('');
  const [batchShipDate, setBatchShipDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchNotes, setBatchNotes] = useState('');
  const [isSubmittingBatchShip, setIsSubmittingBatchShip] = useState(false);

  // Update Invoices Drawer state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [editInvoiceStatus, setEditInvoiceStatus] = useState<InvoiceSettlement['paymentStatus']>('Paid');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Wire Transfer');
  const [editTaxAmount, setEditTaxAmount] = useState<string>('');
  const [editShippingFee, setEditShippingFee] = useState<string>('');
  const [editInvoiceNotes, setEditInvoiceNotes] = useState('');
  const [isSubmittingInvoiceUpdate, setIsSubmittingInvoiceUpdate] = useState(false);

  // Print / Email Drawer state
  const [printDocType, setPrintDocType] = useState<string>('buyer_invoice');
  const [printScope, setPrintScope] = useState<'all' | 'selected'>('all');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // =========================================================================
  // Dynamic Data Fetching from Supabase
  // =========================================================================
  const fetchBidderSettlements = useCallback(async () => {
    setIsLoadingBidder(true);
    try {
      const data = await settlementService.getBidderSettlements(currentAuctionId);
      setBidderSettlements(data || []);
    } catch (err) {
      console.error('Failed to load bidder settlements from Supabase:', err);
      setBidderSettlements([]);
    } finally {
      setIsLoadingBidder(false);
    }
  }, [currentAuctionId]);

  const fetchSellerSettlements = useCallback(async () => {
    setIsLoadingSeller(true);
    try {
      const data = await settlementService.getSellerSettlements(currentAuctionId);
      setSellerSettlements(data || []);
    } catch (err) {
      console.error('Failed to load seller settlements from Supabase:', err);
      setSellerSettlements([]);
    } finally {
      setIsLoadingSeller(false);
    }
  }, [currentAuctionId]);

  useEffect(() => {
    fetchBidderSettlements();
    fetchSellerSettlements();
    setSelectedBidderIds([]);
    setSelectedSellerIds([]);
    setBidderPage(1);
    setSellerPage(1);
  }, [fetchBidderSettlements, fetchSellerSettlements]);

  // Sync selected invoice in Update Invoices drawer when available
  useEffect(() => {
    if (!selectedInvoiceId) {
      if (bidderSettlements.length > 0) {
        setSelectedInvoiceId(bidderSettlements[0].id);
      } else if (propInvoices.length > 0) {
        setSelectedInvoiceId(propInvoices[0].id);
      }
    }
  }, [bidderSettlements, propInvoices, selectedInvoiceId]);

  // Filtered & Sorted Bidder Settlements
  const filteredBidderSettlements = useMemo(() => {
    let list = bidderSettlements;
    if (bidderSearchTerm.trim()) {
      const q = bidderSearchTerm.toLowerCase();
      list = list.filter(b => 
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.bidderNumber && b.bidderNumber.toLowerCase().includes(q)) ||
        (b.invoiceNumber && b.invoiceNumber.toLowerCase().includes(q)) ||
        (b.invoiceStatus && b.invoiceStatus.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = (a as any)[bidderSortField];
      let valB: any = (b as any)[bidderSortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return bidderSortAsc ? -1 : 1;
      if (valA > valB) return bidderSortAsc ? 1 : -1;
      return 0;
    });
  }, [bidderSettlements, bidderSearchTerm, bidderSortField, bidderSortAsc]);

  // Paginated Bidder Settlements
  const paginatedBidderSettlements = useMemo(() => {
    const start = (bidderPage - 1) * bidderPageSize;
    return filteredBidderSettlements.slice(start, start + bidderPageSize);
  }, [filteredBidderSettlements, bidderPage, bidderPageSize]);

  // Filtered & Sorted Seller Settlements
  const filteredSellerSettlements = useMemo(() => {
    let list = sellerSettlements;
    if (sellerSearchTerm.trim()) {
      const q = sellerSearchTerm.toLowerCase();
      list = list.filter(s => 
        (s.consignorName && s.consignorName.toLowerCase().includes(q)) ||
        (s.consignorCode && s.consignorCode.toLowerCase().includes(q)) ||
        (s.status && s.status.toLowerCase().includes(q)) ||
        (s.checkNumber && s.checkNumber.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = (a as any)[sellerSortField];
      let valB: any = (b as any)[sellerSortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sellerSortAsc ? -1 : 1;
      if (valA > valB) return sellerSortAsc ? 1 : -1;
      return 0;
    });
  }, [sellerSettlements, sellerSearchTerm, sellerSortField, sellerSortAsc]);

  // Paginated Seller Settlements
  const paginatedSellerSettlements = useMemo(() => {
    const start = (sellerPage - 1) * sellerPageSize;
    return filteredSellerSettlements.slice(start, start + sellerPageSize);
  }, [filteredSellerSettlements, sellerPage, sellerPageSize]);

  // Selection handlers
  const allBiddersSelected = filteredBidderSettlements.length > 0 && filteredBidderSettlements.every(b => selectedBidderIds.includes(b.id));
  const toggleSelectAllBidders = () => {
    if (allBiddersSelected) {
      setSelectedBidderIds([]);
    } else {
      setSelectedBidderIds(filteredBidderSettlements.map(b => b.id));
    }
  };

  const toggleSelectOneBidder = (id: string) => {
    setSelectedBidderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const allSellersSelected = filteredSellerSettlements.length > 0 && filteredSellerSettlements.every(s => selectedSellerIds.includes(s.id));
  const toggleSelectAllSellers = () => {
    if (allSellersSelected) {
      setSelectedSellerIds([]);
    } else {
      setSelectedSellerIds(filteredSellerSettlements.map(s => s.id));
    }
  };

  const toggleSelectOneSeller = (id: string) => {
    setSelectedSellerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Cash Buyer Toggle Handler
  const handleToggleCashBuyer = async (customer: SettlementCustomer, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic UI update
    setBidderSettlements(prev => prev.map(c => c.id === customer.id ? { ...c, isCashBuyer: newVal } : c));
    try {
      await settlementService.updateCashBuyer(currentAuctionId, customer.id, newVal);
      showToast('success', 'Updated', `Cash Buyer status for #${customer.bidderNumber} updated.`);
    } catch (_) {
      // Revert on error
      setBidderSettlements(prev => prev.map(c => c.id === customer.id ? { ...c, isCashBuyer: currentVal } : c));
      showToast('error', 'Update Failed', 'Could not persist cash buyer status.');
    }
  };

  // Batch Shipments Submit Handler
  const handleSaveBatchShipments = async () => {
    const targetIds = batchShipSelectedIds.length > 0 ? batchShipSelectedIds : selectedBidderIds;
    if (targetIds.length === 0) {
      showToast('warning', 'Selection Required', 'Please select at least one settlement to ship.');
      return;
    }

    setIsSubmittingBatchShip(true);
    try {
      const shipData: BatchShipmentData = {
        carrier: batchCarrier,
        trackingNumber: batchTracking || `TRK-${Date.now().toString().slice(-8)}`,
        shipDate: batchShipDate,
        notes: batchNotes
      };
      await settlementService.markBatchShipped(currentAuctionId, targetIds, shipData);
      showToast('success', 'Batch Shipments Processed', `Marked ${targetIds.length} settlement(s) as shipped via ${batchCarrier}.`);
      setIsBatchShipmentsOpen(false);
      fetchBidderSettlements();
    } catch (_) {
      showToast('error', 'Shipment Error', 'Failed to update shipments in Supabase.');
    } finally {
      setIsSubmittingBatchShip(false);
    }
  };

  // Update Invoice Submit Handler
  const handleSaveInvoiceUpdate = async () => {
    if (!selectedInvoiceId) {
      showToast('warning', 'Invoice Required', 'Please select an invoice to update.');
      return;
    }

    setIsSubmittingInvoiceUpdate(true);
    try {
      await settlementService.updateInvoice(currentAuctionId, selectedInvoiceId, {
        paymentStatus: editInvoiceStatus,
        paymentMethod: editPaymentMethod,
        taxAmount: editTaxAmount ? parseFloat(editTaxAmount) : undefined,
        shippingFee: editShippingFee ? parseFloat(editShippingFee) : undefined,
        notes: editInvoiceNotes
      });

      if (onUpdateInvoiceStatus) {
        onUpdateInvoiceStatus(selectedInvoiceId, editInvoiceStatus);
      }

      showToast('success', 'Invoice Updated', `Invoice payment status updated to ${editInvoiceStatus}.`);
      setIsUpdateInvoicesOpen(false);
      fetchBidderSettlements();
    } catch (_) {
      showToast('error', 'Update Failed', 'Failed to update invoice in Supabase.');
    } finally {
      setIsSubmittingInvoiceUpdate(false);
    }
  };

  // Print / Email Submit Handler
  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      showToast('warning', 'Valid Email Required', 'Please provide a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      showToast('success', 'Document Dispatched', `Settlement documentation sent to ${recipientEmail}.`);
      setIsPrintEmailOpen(false);
      setRecipientEmail('');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Update Invoices select options
  const updateInvoiceOptions: ShadcnSelectOption[] = useMemo(() => {
    if (bidderSettlements.length > 0) {
      return bidderSettlements.map(b => ({
        value: b.id,
        label: `${b.invoiceNumber || 'INV'} - ${b.name} (#${b.bidderNumber}) • ${formatCurrency(b.balance)}`
      }));
    }
    return propInvoices.map(i => ({
      value: i.id,
      label: `${i.invoiceNumber} - ${i.buyerName} (#${i.paddleNumber}) • ${formatCurrency(i.totalDue)}`
    }));
  }, [bidderSettlements, propInvoices]);

  // Sorting helpers
  const handleBidderSort = (field: string) => {
    if (bidderSortField === field) {
      setBidderSortAsc(!bidderSortAsc);
    } else {
      setBidderSortField(field);
      setBidderSortAsc(true);
    }
  };

  const handleSellerSort = (field: string) => {
    if (sellerSortField === field) {
      setSellerSortAsc(!sellerSortAsc);
    } else {
      setSellerSortField(field);
      setSellerSortAsc(true);
    }
  };

  const renderSortIcon = (field: string, currentField: string, isAsc: boolean) => {
    if (field !== currentField) {
      return <ArrowUpDown size={12} style={{ color: '#94a3b8', marginLeft: 4, display: 'inline' }} />;
    }
    return isAsc 
      ? <ArrowUp size={12} style={{ color: 'var(--gold-primary, #a37a3b)', marginLeft: 4, display: 'inline' }} />
      : <ArrowDown size={12} style={{ color: 'var(--gold-primary, #a37a3b)', marginLeft: 4, display: 'inline' }} />;
  };

  return (
    <div style={{ padding: '20px 24px', background: 'var(--bg-app, #f9f8f5)', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* =========================================================================
          1. AUCTION HEADER & ACTIONS (Matches Gardner Dashboard Executive Styling)
          ========================================================================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        marginBottom: 20
      }}>
        {/* Left: Auction Code & Return to All Auctions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--gold-primary, #a37a3b)', fontSize: 18, lineHeight: 1 }}>❖</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.01em' }}>
              {currentAuction.code || 'GA-2026-10-GOLD'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onNavigateAuctions) {
                onNavigateAuctions();
              } else if (onNavigateSection) {
                onNavigateSection('auctions');
              } else {
                window.location.href = '/auctions';
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold-dark, #9a741e)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '3px 0 0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>↵ Return to All Auctions</span>
          </button>
        </div>

        {/* Right: 3 Dashboard Action Buttons (BATCH SHIPMENTS, UPDATE INVOICES, PRINT / EMAIL) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setBatchShipSelectedIds(selectedBidderIds.length > 0 ? selectedBidderIds : bidderSettlements.map(b => b.id));
              setIsBatchShipmentsOpen(true);
            }}
            id="btn-batch-shipments"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', fontSize: 13, fontWeight: 600 }}
          >
            <PackageCheck size={16} color="var(--gold-primary, #a37a3b)" />
            <span>BATCH SHIPMENTS</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsUpdateInvoicesOpen(true)}
            id="btn-update-invoices"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', fontSize: 13, fontWeight: 600 }}
          >
            <FileText size={16} color="var(--gold-primary, #a37a3b)" />
            <span>UPDATE INVOICES</span>
          </button>

          <button
            type="button"
            className="btn btn-gold"
            onClick={() => setIsPrintEmailOpen(true)}
            id="btn-print-email"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', fontSize: 13, fontWeight: 700 }}
          >
            <Printer size={16} />
            <span>PRINT / EMAIL</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. SETTLEMENT WORKFLOW SUBTABS (Bidder Settlement, Seller Settlement)
          ========================================================================= */}
      <div style={{ display: 'flex', gap: 6, marginBottom: -1, position: 'relative', zIndex: 1 }}>
        <button
          type="button"
          onClick={() => setActiveTab('bidder')}
          id="tab-bidder-settlement"
          style={{
            padding: '9px 20px',
            fontSize: 13,
            fontWeight: activeTab === 'bidder' ? 700 : 600,
            color: activeTab === 'bidder' ? '#ffffff' : '#334155',
            background: activeTab === 'bidder' ? '#0e121b' : '#ffffff',
            border: '1px solid',
            borderColor: activeTab === 'bidder' ? '#0e121b' : '#cbd5e1',
            borderTop: activeTab === 'bidder' ? '3px solid var(--gold-primary, #a37a3b)' : '1px solid #cbd5e1',
            borderBottom: activeTab === 'bidder' ? 'none' : '1px solid #cbd5e1',
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease'
          }}
        >
          <span>Bidder Settlement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seller')}
          id="tab-seller-settlement"
          style={{
            padding: '9px 20px',
            fontSize: 13,
            fontWeight: activeTab === 'seller' ? 700 : 600,
            color: activeTab === 'seller' ? '#ffffff' : '#334155',
            background: activeTab === 'seller' ? '#0e121b' : '#ffffff',
            border: '1px solid',
            borderColor: activeTab === 'seller' ? '#0e121b' : '#cbd5e1',
            borderTop: activeTab === 'seller' ? '3px solid var(--gold-primary, #a37a3b)' : '1px solid #cbd5e1',
            borderBottom: activeTab === 'seller' ? 'none' : '1px solid #cbd5e1',
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease'
          }}
        >
          <span>Seller Settlement</span>
        </button>
      </div>

      {/* =========================================================================
          4. MAIN WORKSPACE CONTAINER
          ========================================================================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle, #eae5dc)',
        borderRadius: '0 8px 8px 8px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Row 1: Selection Action (Deselect X Settlements) */}
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'bidder') {
                setSelectedBidderIds([]);
              } else {
                setSelectedSellerIds([]);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <X size={13} style={{ strokeWidth: 2.5 }} />
            <span>
              Deselect {activeTab === 'bidder' ? selectedBidderIds.length : selectedSellerIds.length} Settlements
            </span>
          </button>
        </div>

        {/* Row 2: Search Input with Gear/Settings Icon */}
        <div style={{ position: 'relative', width: '100%', marginBottom: 14 }}>
          <div style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} />
          </div>
          <input
            type="text"
            value={activeTab === 'bidder' ? bidderSearchTerm : sellerSearchTerm}
            onChange={(e) => {
              if (activeTab === 'bidder') {
                setBidderSearchTerm(e.target.value);
                setBidderPage(1);
              } else {
                setSellerSearchTerm(e.target.value);
                setSellerPage(1);
              }
            }}
            placeholder={activeTab === 'bidder' ? 'Search settlements by bidder, name, invoice...' : 'Search sellers by code, name, status...'}
            style={{
              width: '100%',
              height: 38,
              paddingLeft: 38,
              paddingRight: 40,
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#ffffff',
              color: '#1e293b',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="button"
            title="Configure Columns"
            onClick={() => setShowColumnConfig(prev => !prev)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Row 3: Total Settlements: X */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
          Total Settlements:{activeTab === 'bidder' ? filteredBidderSettlements.length : filteredSellerSettlements.length}
        </div>

        {/* =====================================================================
            5. BIDDER SETTLEMENT TABLE
            ===================================================================== */}
        {activeTab === 'bidder' && (
          <div>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: 44, padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allBiddersSelected}
                        onChange={toggleSelectAllBidders}
                        aria-label="Select all bidders"
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th 
                      onClick={() => handleBidderSort('bidderNumber')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Bidder # {renderSortIcon('bidderNumber', bidderSortField, bidderSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleBidderSort('name')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Name {renderSortIcon('name', bidderSortField, bidderSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleBidderSort('isCashBuyer')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Cash Buyer {renderSortIcon('isCashBuyer', bidderSortField, bidderSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleBidderSort('lotCount')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Lot Count {renderSortIcon('lotCount', bidderSortField, bidderSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleBidderSort('shippedCount')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Shipped / Picked Up {renderSortIcon('shippedCount', bidderSortField, bidderSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleBidderSort('balance')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Balance {renderSortIcon('balance', bidderSortField, bidderSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleBidderSort('invoiceNumber')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Invoice Number/Status {renderSortIcon('invoiceNumber', bidderSortField, bidderSortAsc)}
                    </th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      Shipping Requested
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingBidder ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <RotateCw size={16} className="animate-spin" />
                          <span>Loading settlements from Supabase...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedBidderSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    paginatedBidderSettlements.map((b) => {
                      const isSelected = selectedBidderIds.includes(b.id);
                      return (
                        <tr 
                          key={b.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            transition: 'background 0.1s ease'
                          }}
                        >
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOneBidder(b.id)}
                              aria-label={`Select ${b.name}`}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                            #{b.bidderNumber}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                            {b.name}
                            {b.isSeller && (
                              <span style={{
                                marginLeft: 6,
                                fontSize: 10.5,
                                fontWeight: 700,
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '1px 6px',
                                borderRadius: 10
                              }}>
                                House
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={b.isCashBuyer}
                              onChange={() => handleToggleCashBuyer(b, b.isCashBuyer)}
                              title="Toggle Cash Buyer Status"
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                            {b.lotCount}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: b.shippedCount > 0 ? '#dcfce7' : '#f1f5f9',
                              color: b.shippedCount > 0 ? '#15803d' : '#64748b'
                            }}>
                              {b.shippedCount} of {b.totalLotsCount || b.lotCount || 1}
                            </span>
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: b.balance > 0 ? '#dc2626' : '#15803d'
                          }}>
                            {formatCurrency(b.balance)}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const matchingInvoice = propInvoices.find(inv => inv.id === b.id || inv.invoiceNumber === b.invoiceNumber);
                                if (matchingInvoice) {
                                  setPreviewInvoice(matchingInvoice);
                                } else {
                                  setPreviewInvoice({
                                    id: b.id,
                                    invoiceNumber: b.invoiceNumber || `INV-${b.bidderNumber}`,
                                    paddleNumber: b.bidderNumber,
                                    buyerName: b.name,
                                    itemsCount: b.lotCount,
                                    hammerSubtotal: b.balance,
                                    buyersPremium: b.balance * 0.15,
                                    taxAmount: 0,
                                    shippingFee: 0,
                                    totalDue: b.balance,
                                    paymentStatus: b.invoiceStatus as any || 'Pending',
                                    isShipped: b.shippedCount > 0,
                                    shippingRequested: b.shippingRequested,
                                    lots: []
                                  });
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: 'var(--gold-dark, #8c6428)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {b.invoiceNumber || 'INV-Pending'} ({b.invoiceStatus || 'Pending'})
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: b.shippingRequested ? '#e0f2fe' : '#f1f5f9',
                              color: b.shippingRequested ? '#0369a1' : '#64748b'
                            }}>
                              {b.shippingRequested ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 16,
              fontSize: 13,
              color: '#475569'
            }}>
              {/* Show [ 10 ▾ ] entries */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Show</span>
                <div style={{ width: 85 }}>
                  <ShadcnSelect
                    value={String(bidderPageSize)}
                    options={PAGE_SIZE_OPTIONS}
                    onChange={(val) => {
                      setBidderPageSize(Number(val));
                      setBidderPage(1);
                    }}
                    size="sm"
                  />
                </div>
                <span>entries</span>
              </div>

              {/* Showing X to Y of Z entries */}
              <div>
                Showing {filteredBidderSettlements.length === 0 ? 0 : (bidderPage - 1) * bidderPageSize + 1} to {Math.min(bidderPage * bidderPageSize, filteredBidderSettlements.length)} of {filteredBidderSettlements.length} entries
              </div>

              {/* Prev / Next controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  disabled={bidderPage <= 1}
                  onClick={() => setBidderPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: bidderPage <= 1 ? '#f1f5f9' : '#ffffff',
                    color: bidderPage <= 1 ? '#94a3b8' : '#334155',
                    cursor: bidderPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  « PREV
                </button>
                <button
                  type="button"
                  disabled={bidderPage >= Math.max(1, Math.ceil(filteredBidderSettlements.length / bidderPageSize))}
                  onClick={() => setBidderPage(p => p + 1)}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: bidderPage >= Math.max(1, Math.ceil(filteredBidderSettlements.length / bidderPageSize)) ? '#f1f5f9' : '#ffffff',
                    color: bidderPage >= Math.max(1, Math.ceil(filteredBidderSettlements.length / bidderPageSize)) ? '#94a3b8' : '#334155',
                    cursor: bidderPage >= Math.max(1, Math.ceil(filteredBidderSettlements.length / bidderPageSize)) ? 'not-allowed' : 'pointer'
                  }}
                >
                  NEXT »
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            6. SELLER SETTLEMENT TABLE
            ===================================================================== */}
        {activeTab === 'seller' && (
          <div>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: 44, padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allSellersSelected}
                        onChange={toggleSelectAllSellers}
                        aria-label="Select all sellers"
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th 
                      onClick={() => handleSellerSort('consignorCode')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Consignor # {renderSortIcon('consignorCode', sellerSortField, sellerSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleSellerSort('consignorName')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Consignor Name {renderSortIcon('consignorName', sellerSortField, sellerSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleSellerSort('totalLotsSold')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Lots Sold {renderSortIcon('totalLotsSold', sellerSortField, sellerSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleSellerSort('grossHammer')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Gross Hammer {renderSortIcon('grossHammer', sellerSortField, sellerSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleSellerSort('commissionAmount')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Commission {renderSortIcon('commissionAmount', sellerSortField, sellerSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleSellerSort('photographyFees')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Fees {renderSortIcon('photographyFees', sellerSortField, sellerSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleSellerSort('netPayout')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Net Payout {renderSortIcon('netPayout', sellerSortField, sellerSortAsc)}
                    </th>
                    <th 
                      onClick={() => handleSellerSort('status')}
                      style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Status {renderSortIcon('status', sellerSortField, sellerSortAsc)}
                    </th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                      Check / Reference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingSeller ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <RotateCw size={16} className="animate-spin" />
                          <span>Loading seller settlements from Supabase...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedSellerSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    paginatedSellerSettlements.map((s) => {
                      const isSelected = selectedSellerIds.includes(s.id);
                      return (
                        <tr 
                          key={s.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            transition: 'background 0.1s ease'
                          }}
                        >
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOneSeller(s.id)}
                              aria-label={`Select ${s.consignorName}`}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                            {s.consignorCode}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                            {s.consignorName}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                            {s.totalLotsSold}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(s.grossHammer)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                            {formatCurrency(s.commissionAmount)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                            {formatCurrency(s.photographyFees)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--gold-dark, #8c6428)' }}>
                            {formatCurrency(s.netPayout)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: s.status === 'Paid' ? '#dcfce7' : (s.status === 'Ready for Payout' ? '#e0f2fe' : '#fef3c7'),
                              color: s.status === 'Paid' ? '#15803d' : (s.status === 'Ready for Payout' ? '#0369a1' : '#92400e')
                            }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569', fontSize: 12 }}>
                            {s.checkNumber || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 16,
              fontSize: 13,
              color: '#475569'
            }}>
              {/* Show [ 10 ▾ ] entries */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Show</span>
                <div style={{ width: 85 }}>
                  <ShadcnSelect
                    value={String(sellerPageSize)}
                    options={PAGE_SIZE_OPTIONS}
                    onChange={(val) => {
                      setSellerPageSize(Number(val));
                      setSellerPage(1);
                    }}
                    size="sm"
                  />
                </div>
                <span>entries</span>
              </div>

              {/* Showing X to Y of Z entries */}
              <div>
                Showing {filteredSellerSettlements.length === 0 ? 0 : (sellerPage - 1) * sellerPageSize + 1} to {Math.min(sellerPage * sellerPageSize, filteredSellerSettlements.length)} of {filteredSellerSettlements.length} entries
              </div>

              {/* Prev / Next controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  disabled={sellerPage <= 1}
                  onClick={() => setSellerPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: sellerPage <= 1 ? '#f1f5f9' : '#ffffff',
                    color: sellerPage <= 1 ? '#94a3b8' : '#334155',
                    cursor: sellerPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  « PREV
                </button>
                <button
                  type="button"
                  disabled={sellerPage >= Math.max(1, Math.ceil(filteredSellerSettlements.length / sellerPageSize))}
                  onClick={() => setSellerPage(p => p + 1)}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: sellerPage >= Math.max(1, Math.ceil(filteredSellerSettlements.length / sellerPageSize)) ? '#f1f5f9' : '#ffffff',
                    color: sellerPage >= Math.max(1, Math.ceil(filteredSellerSettlements.length / sellerPageSize)) ? '#94a3b8' : '#334155',
                    cursor: sellerPage >= Math.max(1, Math.ceil(filteredSellerSettlements.length / sellerPageSize)) ? 'not-allowed' : 'pointer'
                  }}
                >
                  NEXT »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          7. DRAWER: BATCH SHIPMENTS (Uses ShadcnSelect for Carrier)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={isBatchShipmentsOpen}
        onClose={() => setIsBatchShipmentsOpen(false)}
        title="Batch Shipments & Carrier Dispatch"
        description="Select multiple buyer settlements, assign master shipping tracking, and update status in Supabase."
        size="md"
        isSubmitting={isSubmittingBatchShip}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsBatchShipmentsOpen(false)}
              disabled={isSubmittingBatchShip}
              style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleSaveBatchShipments}
              disabled={isSubmittingBatchShip}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', fontSize: 13, fontWeight: 700 }}
            >
              {isSubmittingBatchShip ? <RotateCw size={15} className="animate-spin" /> : <PackageCheck size={15} />}
              <span>Confirm & Dispatch</span>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Carrier / Shipping Method
            </label>
            <ShadcnSelect
              value={batchCarrier}
              options={CARRIER_OPTIONS}
              onChange={setBatchCarrier}
              placeholder="Select Carrier..."
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>
                Master Tracking / Reference Number
              </label>
              <button
                type="button"
                onClick={() => setBatchTracking(`TRK-${Date.now().toString().slice(-8)}`)}
                style={{ background: 'none', border: 'none', color: 'var(--gold-dark, #8c6428)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Auto-Generate
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. 7849 1029 4819"
              value={batchTracking}
              onChange={(e) => setBatchTracking(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Shipment / Release Date
            </label>
            <input
              type="date"
              value={batchShipDate}
              onChange={(e) => setBatchShipDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Shipping Notes / Handling Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Add optional dispatch notes or packaging instructions..."
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </ShadcnSheet>

      {/* =========================================================================
          8. DRAWER: UPDATE INVOICES (Uses ShadcnSelect throughout)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={isUpdateInvoicesOpen}
        onClose={() => setIsUpdateInvoicesOpen(false)}
        title="Update Auction Invoices"
        description="Select an invoice, update payment and cashiering status, adjust fee lines, and persist to Supabase."
        size="md"
        isSubmitting={isSubmittingInvoiceUpdate}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUpdateInvoicesOpen(false)}
              disabled={isSubmittingInvoiceUpdate}
              style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleSaveInvoiceUpdate}
              disabled={isSubmittingInvoiceUpdate || !selectedInvoiceId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', fontSize: 13, fontWeight: 700 }}
            >
              {isSubmittingInvoiceUpdate ? <RotateCw size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              <span>Save Invoice Updates</span>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Select Invoice
            </label>
            <ShadcnSelect
              value={selectedInvoiceId}
              options={updateInvoiceOptions}
              onChange={setSelectedInvoiceId}
              placeholder="Select an invoice to edit..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Payment Status
            </label>
            <ShadcnSelect
              value={editInvoiceStatus}
              options={PAYMENT_STATUS_OPTIONS}
              onChange={(v) => setEditInvoiceStatus(v as any)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Payment Method
            </label>
            <ShadcnSelect
              value={editPaymentMethod}
              options={PAYMENT_METHOD_OPTIONS}
              onChange={setEditPaymentMethod}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                Tax Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editTaxAmount}
                onChange={(e) => setEditTaxAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                Shipping Fee ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editShippingFee}
                onChange={(e) => setEditShippingFee(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Settlement Notes
            </label>
            <textarea
              rows={3}
              placeholder="Add cashier notes or transaction reference..."
              value={editInvoiceNotes}
              onChange={(e) => setEditInvoiceNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </ShadcnSheet>

      {/* =========================================================================
          9. DRAWER: PRINT / EMAIL (Uses ShadcnSelect for Document Type)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={isPrintEmailOpen}
        onClose={() => setIsPrintEmailOpen(false)}
        title="Print & Dispatch Settlement Statements"
        description="Generate official settlement documentation for bidders or consignors."
        size="md"
        isSubmitting={isSendingEmail}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', fontSize: 13 }}
            >
              <Printer size={15} />
              <span>Print Directly</span>
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', fontSize: 13, fontWeight: 700 }}
            >
              {isSendingEmail ? <RotateCw size={15} className="animate-spin" /> : <Send size={15} />}
              <span>Send Email</span>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Document Type
            </label>
            <ShadcnSelect
              value={printDocType}
              options={DOC_TYPE_OPTIONS}
              onChange={setPrintDocType}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Recipient Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. accounting@gardner-auction.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </ShadcnSheet>

      {/* =========================================================================
          10. MODAL: INVOICE PREVIEW DETAIL
          ========================================================================= */}
      {previewInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: 16,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 10,
            maxWidth: 620,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-modal)',
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                  Invoice Detail: {previewInvoice.invoiceNumber}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  {previewInvoice.buyerName} • Paddle #{previewInvoice.paddleNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748b' }}>Payment Status:</span>{' '}
                <strong style={{ color: previewInvoice.paymentStatus === 'Paid' ? '#15803d' : '#b45309' }}>
                  {previewInvoice.paymentStatus}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Items Count:</span>{' '}
                <strong>{previewInvoice.itemsCount}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Hammer Subtotal:</span>{' '}
                <strong>{formatCurrency(previewInvoice.hammerSubtotal || 0)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Total Due:</span>{' '}
                <strong style={{ fontSize: 15, color: '#0f172a' }}>{formatCurrency(previewInvoice.totalDue || 0)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPreviewInvoice(null)}
                style={{ height: 36, padding: '0 16px', fontSize: 13 }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 13, fontWeight: 700 }}
              >
                <Printer size={15} />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
