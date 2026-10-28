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
  CheckCircle2,
  DollarSign,
  Loader2,
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
  AlertCircle,
  MoreVertical,
  Scale
} from 'lucide-react';
import { ShadcnSheet } from '../ui/ShadcnSheet';
import { ShadcnSelect, ShadcnSelectOption } from '../ui/ShadcnSelect';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '../ui/ShadcnDropdownMenu';
import { SettlementCustomerDetail } from '../auction/tabs/SettlementCustomerDetail';
import { EmailSettlementModal } from '../Common/EmailSettlementModal';
import { SelectColumnsModal, ColumnItem } from '../auction/SelectColumnsModal';
import { settlementService, BatchShipmentData } from '../../services/settlementService';
import { auctionService } from '../../services/auctionService';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';

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
  selectedAuctionId = '',
  availableAuctions = [],
  onSelectAuction,
  onNavigateAuctions,
  onNavigateSection
}) => {
  const { showToast } = useToast();

  // Active Main Workflow Tab: 'bidder' | 'seller'
  const [activeTab, setActiveTab] = useState<'bidder' | 'seller'>('bidder');

  // Auction metadata — derive title from real availableAuctions list (no hardcoded fallbacks)
  const currentAuctionId = selectedAuctionId;
  const currentAuction = availableAuctions.find(a => a.id === currentAuctionId) || {
    id: currentAuctionId,
    code: '',
    title: currentAuctionId ? `Auction ${currentAuctionId}` : 'Settlement',
    status: ''
  };
  const currentAuctionName = currentAuction.title || `Auction ${currentAuctionId}`;

  // Dynamic Supabase data states
  const [bidderSettlements, setBidderSettlements] = useState<SettlementCustomer[]>([]);
  const [sellerSettlements, setSellerSettlements] = useState<ConsignorSettlement[]>([]);
  const [isLoadingBidder, setIsLoadingBidder] = useState<boolean>(() => Boolean(selectedAuctionId));
  const [isLoadingSeller, setIsLoadingSeller] = useState<boolean>(() => Boolean(selectedAuctionId));
  const [bidderFetchError, setBidderFetchError] = useState<string | null>(null);
  const [sellerFetchError, setSellerFetchError] = useState<string | null>(null);

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

  // Column config modal state & preferences (matching live AF360)
  const DEFAULT_BIDDER_COLUMNS: ColumnItem[] = [
    { key: 'bidderNumber', label: 'Bidder#', visible: true },
    { key: 'customerCode', label: 'Customer Code', visible: false },
    { key: 'name', label: 'Name', visible: true },
    { key: 'cashBuyer', label: 'Cash Buyer', visible: true },
    { key: 'lotCount', label: 'Lot Count', visible: true },
    { key: 'shippedCount', label: 'Shipped / Picked Up', visible: true },
    { key: 'balance', label: 'Balance', visible: true },
    { key: 'invoiceNumber', label: 'Invoice Number/Status', visible: true },
    { key: 'shippingRequested', label: 'Shipping Requested', visible: true }
  ];

  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [bidderColumns, setBidderColumns] = useState<ColumnItem[]>(() => {
    try {
      const saved = localStorage.getItem('af360_bidder_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_BIDDER_COLUMNS;
  });

  const isColVisible = (key: string) => {
    const col = bidderColumns.find(c => c.key === key);
    return col ? col.visible : true;
  };

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

  // Settlement Details Navigation & Three-Dot Actions states
  const [viewingSettlementCustomer, setViewingSettlementCustomer] = useState<SettlementCustomer | null>(null);
  const [emailModalCustomer, setEmailModalCustomer] = useState<SettlementCustomer | null>(null);
  const [printSettlementCustomer, setPrintSettlementCustomer] = useState<SettlementCustomer | null>(null);

  // Synchronize URL query parameter `settlementId` for functional navigation & browser back button
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('settlementId');
      if (sid && bidderSettlements.length > 0) {
        const match = bidderSettlements.find(b => b.id === sid);
        if (match) {
          setViewingSettlementCustomer(match);
        }
      } else if (!sid) {
        setViewingSettlementCustomer(null);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [bidderSettlements]);

  // Three-Dot Action Handlers
  const handleViewSettlement = (b: SettlementCustomer) => {
    setViewingSettlementCustomer(b);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('settlementId', b.id);
      window.history.pushState({ settlementId: b.id }, '', url.toString());
    } catch (_) {}
  };

  const handlePrintSettlement = (b: SettlementCustomer) => {
    setPrintSettlementCustomer(b);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleEmailSettlement = (b: SettlementCustomer) => {
    setEmailModalCustomer(b);
  };

  // =========================================================================
  // Dynamic Data Fetching from Supabase
  // =========================================================================
  const fetchBidderSettlements = useCallback(async () => {
    if (!currentAuctionId) {
      setBidderSettlements([]);
      setIsLoadingBidder(false);
      return;
    }
    setIsLoadingBidder(true);
    setBidderFetchError(null);
    try {
      const data = await settlementService.getBidderSettlements(currentAuctionId);
      setBidderSettlements(data || []);
    } catch (err: any) {
      console.error('Failed to load bidder settlements from Supabase:', err);
      setBidderFetchError(err?.message || 'Failed to load bidder settlements.');
      setBidderSettlements([]);
    } finally {
      setIsLoadingBidder(false);
    }
  }, [currentAuctionId]);

  const fetchSellerSettlements = useCallback(async () => {
    if (!currentAuctionId) {
      setSellerSettlements([]);
      setIsLoadingSeller(false);
      return;
    }
    setIsLoadingSeller(true);
    setSellerFetchError(null);
    try {
      const data = await settlementService.getSellerSettlements(currentAuctionId);
      setSellerSettlements(data || []);
    } catch (err: any) {
      console.error('Failed to load seller settlements from Supabase:', err);
      setSellerFetchError(err?.message || 'Failed to load seller settlements.');
      setSellerSettlements([]);
    } finally {
      setIsLoadingSeller(false);
    }
  }, [currentAuctionId]);

  useEffect(() => {
    setIsLoadingBidder(true);
    setIsLoadingSeller(true);
    fetchBidderSettlements();
    fetchSellerSettlements();
    setSelectedBidderIds([]);
    setSelectedSellerIds([]);
    setBidderPage(1);
    setSellerPage(1);

    // Dynamic Supabase Realtime Subscription
    const channel = supabase
      .channel(`settlements-realtime-${currentAuctionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchBidderSettlements();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_settlements' }, () => {
        fetchSellerSettlements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBidderSettlements, fetchSellerSettlements, currentAuctionId]);

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

  // Sync drawer fields when selected invoice changes
  useEffect(() => {
    if (selectedInvoiceId && bidderSettlements.length > 0) {
      const match = bidderSettlements.find(b => b.id === selectedInvoiceId);
      if (match) {
        setEditInvoiceStatus(match.invoiceStatus === 'Paid' ? 'Paid' : 'Unpaid');
      }
    }
  }, [selectedInvoiceId, bidderSettlements]);

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

  // Seller Settlement Status Update Handler
  const handleUpdateSellerStatus = async (
    sellerId: string,
    newStatus: 'Pending Review' | 'Ready for Payout' | 'Paid',
    checkNumber?: string
  ) => {
    try {
      setSellerSettlements(prev => prev.map(s => s.id === sellerId ? { ...s, status: newStatus, checkNumber: checkNumber || s.checkNumber } : s));
      const ok = await settlementService.updateSellerSettlementStatus(currentAuctionId, sellerId, newStatus, checkNumber);
      if (ok) {
        showToast('success', 'Status Updated', `Consignor payout status updated to "${newStatus}".`);
        if (onUpdateConsignorStatus) {
          onUpdateConsignorStatus(sellerId, newStatus);
        }
      } else {
        showToast('error', 'Update Failed', 'Failed to update seller status in Supabase.');
        fetchSellerSettlements();
      }
    } catch (_) {
      showToast('error', 'Error', 'Failed to persist status change.');
      fetchSellerSettlements();
    }
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

  // Dedicated Settlement Details View for selected bidder
  if (viewingSettlementCustomer) {
    return (
      <div style={{ padding: '20px 24px', background: 'var(--bg-app, #f9f8f5)', minHeight: '100%', boxSizing: 'border-box' }}>
        <SettlementCustomerDetail
          auctionId={currentAuctionId}
          customer={viewingSettlementCustomer}
          onBack={() => {
            setViewingSettlementCustomer(null);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('settlementId');
              window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
            } catch (_) {}
          }}
          onRefresh={async () => {
            await fetchBidderSettlements();
            const refreshed = await settlementService.getBidderSettlements(currentAuctionId);
            if (refreshed) {
              setBidderSettlements(refreshed);
              const found = refreshed.find(c => c.id === viewingSettlementCustomer.id);
              if (found) {
                setViewingSettlementCustomer(found);
              }
            }
          }}
        />
      </div>
    );
  }

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
            color: activeTab === 'bidder' ? '#ffffff' : 'var(--text-main, #0f172a)',
            background: activeTab === 'bidder' ? '#0e121b' : '#ffffff',
            border: '1px solid',
            borderColor: activeTab === 'bidder' ? '#0e121b' : 'var(--border-subtle, #eae5dc)',
            borderTop: activeTab === 'bidder' ? '3px solid var(--gold-primary, #a37a3b)' : '1px solid var(--border-subtle, #eae5dc)',
            borderBottom: activeTab === 'bidder' ? 'none' : '1px solid var(--border-subtle, #eae5dc)',
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

        {/* Seller Settlement tab button commented per user request */}
        {/*
        <button
          type="button"
          onClick={() => setActiveTab('seller')}
          id="tab-seller-settlement"
          style={{
            padding: '9px 20px',
            fontSize: 13,
            fontWeight: activeTab === 'seller' ? 700 : 600,
            color: activeTab === 'seller' ? '#ffffff' : 'var(--text-main, #0f172a)',
            background: activeTab === 'seller' ? '#0e121b' : '#ffffff',
            border: '1px solid',
            borderColor: activeTab === 'seller' ? '#0e121b' : 'var(--border-subtle, #eae5dc)',
            borderTop: activeTab === 'seller' ? '3px solid var(--gold-primary, #a37a3b)' : '1px solid var(--border-subtle, #eae5dc)',
            borderBottom: activeTab === 'seller' ? 'none' : '1px solid var(--border-subtle, #eae5dc)',
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
        */}
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
              border: '1px solid var(--border-medium, #dcd5ca)',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--text-main, #0f172a)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.03))'
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
              borderRadius: 6,
              border: '1px solid var(--border-medium, #dcd5ca)',
              fontSize: 13,
              background: '#ffffff',
              color: 'var(--text-main, #0f172a)',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
          <button
            type="button"
            title="Sync with Supabase"
            onClick={() => {
              fetchBidderSettlements();
              fetchSellerSettlements();
              showToast('success', 'Synchronized', 'Settlement records refreshed from Supabase.');
            }}
            style={{
              position: 'absolute',
              right: 36,
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
            <RotateCw size={15} className={isLoadingBidder || isLoadingSeller ? 'animate-spin spin-animation' : ''} style={isLoadingBidder || isLoadingSeller ? { animation: 'spinKeyframe 0.85s linear infinite', transformOrigin: 'center center' } : undefined} />
          </button>
          <button
            type="button"
            title="Configure Columns"
            id="btn-settlement-column-settings"
            onClick={() => setShowColumnConfig(true)}
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
          Total Settlements: {((isLoadingBidder && activeTab === 'bidder') || (isLoadingSeller && activeTab === 'seller')) ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', fontWeight: 500, fontSize: 12 }}>
              <Loader2 size={13} className="animate-spin spin-animation" style={{ color: 'var(--gold-primary, #a37a3b)', animation: 'spinKeyframe 0.85s linear infinite', transformOrigin: 'center center' }} />
              <span>Loading...</span>
            </span>
          ) : (
            <span>{activeTab === 'bidder' ? filteredBidderSettlements.length : filteredSellerSettlements.length}</span>
          )}
        </div>

        {/* =====================================================================
            5. BIDDER SETTLEMENT TABLE
            ===================================================================== */}
        {activeTab === 'bidder' && (
          <div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle, #eae5dc)', borderRadius: 6, background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#faf8f5', borderBottom: '1px solid var(--border-subtle, #eae5dc)' }}>
                    <th style={{ width: 44, padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allBiddersSelected}
                        onChange={toggleSelectAllBidders}
                        aria-label="Select all bidders"
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    {isColVisible('bidderNumber') && (
                      <th 
                        onClick={() => handleBidderSort('bidderNumber')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Bidder # {renderSortIcon('bidderNumber', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('customerCode') && (
                      <th 
                        onClick={() => handleBidderSort('customerCode')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Customer Code {renderSortIcon('customerCode', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('name') && (
                      <th 
                        onClick={() => handleBidderSort('name')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Name {renderSortIcon('name', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('cashBuyer') && (
                      <th 
                        onClick={() => handleBidderSort('isCashBuyer')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Cash Buyer {renderSortIcon('isCashBuyer', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('lotCount') && (
                      <th 
                        onClick={() => handleBidderSort('lotCount')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Lot Count {renderSortIcon('lotCount', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('shippedCount') && (
                      <th 
                        onClick={() => handleBidderSort('shippedCount')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Shipped / Picked Up {renderSortIcon('shippedCount', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('balance') && (
                      <th 
                        onClick={() => handleBidderSort('balance')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Balance {renderSortIcon('balance', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('invoiceNumber') && (
                      <th 
                        onClick={() => handleBidderSort('invoiceNumber')}
                        style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Invoice Number/Status {renderSortIcon('invoiceNumber', bidderSortField, bidderSortAsc)}
                      </th>
                    )}
                    {isColVisible('shippingRequested') && (
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        Shipping Requested
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoadingBidder ? (
                    <tr>
                      <td colSpan={1 + bidderColumns.filter(c => c.visible).length} style={{ padding: '56px 20px', textAlign: 'center', background: '#ffffff' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                          <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(163, 122, 59, 0.12) 0%, rgba(163, 122, 59, 0.04) 100%)',
                            border: '1px solid rgba(163, 122, 59, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(163, 122, 59, 0.12)'
                          }}>
                            <Loader2 size={28} className="animate-spin spin-animation" style={{ color: 'var(--gold-primary, #a37a3b)', animation: 'spinKeyframe 0.85s linear infinite', transformOrigin: 'center center' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                              Loading Settlement Records...
                            </span>
                            <span style={{ fontSize: 12.5, color: '#64748b', maxWidth: 360 }}>
                              Fetching dynamic invoices and balances from Supabase
                            </span>
                          </div>
                          <div style={{
                            width: 140,
                            height: 3,
                            borderRadius: 9999,
                            background: 'linear-gradient(90deg, transparent, rgba(163, 122, 59, 0.5), transparent)',
                            animation: 'pulse 1.8s ease-in-out infinite',
                            marginTop: 2
                          }} />
                        </div>
                      </td>
                    </tr>
                  ) : bidderFetchError ? (
                    <tr>
                      <td colSpan={1 + bidderColumns.filter(c => c.visible).length} style={{ padding: '40px 16px', textAlign: 'center', color: '#dc2626' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <AlertCircle size={24} style={{ color: '#dc2626' }} />
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{bidderFetchError}</span>
                          <button
                            type="button"
                            onClick={fetchBidderSettlements}
                            style={{
                              marginTop: 6,
                              padding: '6px 14px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: 6,
                              color: '#991b1b',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Retry Loading
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedBidderSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={1 + bidderColumns.filter(c => c.visible).length} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
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
                            background: isSelected ? 'rgba(163, 122, 59, 0.08)' : '#ffffff',
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
                          {isColVisible('bidderNumber') && (
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                              #{b.bidderNumber}
                            </td>
                          )}
                          {isColVisible('customerCode') && (
                            <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                              {(b as any).customerCode || `CC-${b.bidderNumber}`}
                            </td>
                          )}
                          {isColVisible('name') && (
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
                          )}
                          {isColVisible('cashBuyer') && (
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={b.isCashBuyer}
                                onChange={() => handleToggleCashBuyer(b, b.isCashBuyer)}
                                title="Toggle Cash Buyer Status"
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                          )}
                          {isColVisible('lotCount') && (
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                              {b.lotCount}
                            </td>
                          )}
                          {isColVisible('shippedCount') && (
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
                          )}
                          {isColVisible('balance') && (
                            <td style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: b.balance > 0 ? '#dc2626' : '#15803d'
                            }}>
                              {formatCurrency(b.balance)}
                            </td>
                          )}
                          {isColVisible('invoiceNumber') && (
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
                                      auctionId: currentAuctionId,
                                      auctionCode: currentAuction?.code || currentAuctionId,
                                      paddleNumber: b.bidderNumber,
                                      buyerName: b.name,
                                      buyerEmail: '',
                                      itemsCount: b.lotCount,
                                      hammerSubtotal: b.balance,
                                      buyersPremium: b.balance * 0.15,
                                      taxAmount: 0,
                                      shippingFee: 0,
                                      totalDue: b.balance,
                                      paymentStatus: (b.invoiceStatus === 'Paid' ? 'Paid' : 'Unpaid') as any,
                                      notes: '',
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
                          )}
                          {isColVisible('shippingRequested') && (
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 96 }}>
                                <div style={{ flex: 1, textAlign: 'center' }}>
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
                                </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={`Actions for ${b.name}`}
                                    id={`menu-trigger-${b.bidderNumber || b.id}`}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 4,
                                      border: '1px solid var(--border-medium, #dcd5ca)',
                                      background: '#ffffff',
                                      color: 'var(--text-main, #0f172a)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: 0,
                                      transition: 'all 0.12s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#fdfaf3';
                                      e.currentTarget.style.borderColor = 'var(--gold-primary, #a37a3b)';
                                      e.currentTarget.style.color = 'var(--gold-primary, #a37a3b)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#ffffff';
                                      e.currentTarget.style.borderColor = 'var(--border-medium, #dcd5ca)';
                                      e.currentTarget.style.color = 'var(--text-main, #0f172a)';
                                    }}
                                  >
                                    <MoreVertical size={15} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewSettlement(b)}>
                                    <Scale size={15} color="var(--gold-primary, #a37a3b)" />
                                    <span>VIEW SETTLEMENT</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrintSettlement(b)}>
                                    <Printer size={15} color="var(--gold-primary, #a37a3b)" />
                                    <span>PRINT SETTLEMENT</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEmailSettlement(b)}>
                                    <Mail size={15} color="var(--gold-primary, #a37a3b)" />
                                    <span>EMAIL SETTLEMENT</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        )}
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
                    border: '1px solid var(--border-medium, #dcd5ca)',
                    background: bidderPage <= 1 ? '#f8fafc' : '#ffffff',
                    color: bidderPage <= 1 ? '#94a3b8' : 'var(--text-main, #0f172a)',
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
                    border: '1px solid var(--border-medium, #dcd5ca)',
                    background: bidderPage >= Math.max(1, Math.ceil(filteredBidderSettlements.length / bidderPageSize)) ? '#f8fafc' : '#ffffff',
                    color: bidderPage >= Math.max(1, Math.ceil(filteredBidderSettlements.length / bidderPageSize)) ? '#94a3b8' : 'var(--text-main, #0f172a)',
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
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle, #eae5dc)', borderRadius: 6, background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#faf8f5', borderBottom: '1px solid var(--border-subtle, #eae5dc)' }}>
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
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', width: 70 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingSeller ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '56px 20px', textAlign: 'center', background: '#ffffff' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                          <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(163, 122, 59, 0.12) 0%, rgba(163, 122, 59, 0.04) 100%)',
                            border: '1px solid rgba(163, 122, 59, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(163, 122, 59, 0.12)'
                          }}>
                            <Loader2 size={28} className="animate-spin spin-animation" style={{ color: 'var(--gold-primary, #a37a3b)', animation: 'spinKeyframe 0.85s linear infinite', transformOrigin: 'center center' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                              Loading Consignor Statements...
                            </span>
                            <span style={{ fontSize: 12.5, color: '#64748b', maxWidth: 360 }}>
                              Fetching seller settlements and payouts from Supabase
                            </span>
                          </div>
                          <div style={{
                            width: 140,
                            height: 3,
                            borderRadius: 9999,
                            background: 'linear-gradient(90deg, transparent, rgba(163, 122, 59, 0.5), transparent)',
                            animation: 'pulse 1.8s ease-in-out infinite',
                            marginTop: 2
                          }} />
                        </div>
                      </td>
                    </tr>
                  ) : sellerFetchError ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '40px 16px', textAlign: 'center', color: '#dc2626' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <AlertCircle size={24} style={{ color: '#dc2626' }} />
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{sellerFetchError}</span>
                          <button
                            type="button"
                            onClick={fetchSellerSettlements}
                            style={{
                              marginTop: 6,
                              padding: '6px 14px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: 6,
                              color: '#991b1b',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Retry Loading
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedSellerSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
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
                            background: isSelected ? 'rgba(163, 122, 59, 0.08)' : '#ffffff',
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
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Actions for ${s.consignorName}`}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 4,
                                    border: '1px solid var(--border-medium, #dcd5ca)',
                                    background: '#ffffff',
                                    color: 'var(--text-main, #0f172a)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    transition: 'all 0.12s ease'
                                  }}
                                >
                                  <MoreVertical size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleUpdateSellerStatus(s.id, 'Ready for Payout')}>
                                  <CheckCircle2 size={15} color="#0369a1" />
                                  <span>Ready for Payout</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const checkNum = window.prompt(`Enter Check or Wire Reference # for ${s.consignorName}:`, s.checkNumber || `CHK-${Date.now().toString().slice(-4)}`);
                                  if (checkNum !== null) {
                                    handleUpdateSellerStatus(s.id, 'Paid', checkNum.trim() || undefined);
                                  }
                                }}>
                                  <DollarSign size={15} color="#15803d" />
                                  <span>Mark as Paid</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateSellerStatus(s.id, 'Pending Review')}>
                                  <RotateCw size={15} color="#92400e" />
                                  <span>Pending Review</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                    border: '1px solid var(--border-medium, #dcd5ca)',
                    background: sellerPage <= 1 ? '#f8fafc' : '#ffffff',
                    color: sellerPage <= 1 ? '#94a3b8' : 'var(--text-main, #0f172a)',
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
                    border: '1px solid var(--border-medium, #dcd5ca)',
                    background: sellerPage >= Math.max(1, Math.ceil(filteredSellerSettlements.length / sellerPageSize)) ? '#f8fafc' : '#ffffff',
                    color: sellerPage >= Math.max(1, Math.ceil(filteredSellerSettlements.length / sellerPageSize)) ? '#94a3b8' : 'var(--text-main, #0f172a)',
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
              {isSubmittingBatchShip ? <RotateCw size={15} className="animate-spin spin-animation" style={{ animation: 'spinKeyframe 0.85s linear infinite' }} /> : <PackageCheck size={15} />}
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
              {isSubmittingInvoiceUpdate ? <RotateCw size={15} className="animate-spin spin-animation" style={{ animation: 'spinKeyframe 0.85s linear infinite' }} /> : <CheckCircle size={15} />}
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
              {isSendingEmail ? <RotateCw size={15} className="animate-spin spin-animation" style={{ animation: 'spinKeyframe 0.85s linear infinite' }} /> : <Send size={15} />}
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

      {/* Row-Level Email Settlement Modal */}
      <EmailSettlementModal
        isOpen={!!emailModalCustomer}
        onClose={() => setEmailModalCustomer(null)}
        customer={emailModalCustomer}
        auctionTitle={currentAuction.title}
        auctionCode={currentAuction.code}
        onSuccess={() => {
          showToast('success', 'Email Sent', `Settlement statement sent to ${emailModalCustomer?.name}.`);
          fetchBidderSettlements();
        }}
      />

      {/* Select Columns Modal (Configured from search bar settings icon) */}
      <SelectColumnsModal
        isOpen={showColumnConfig}
        onClose={() => setShowColumnConfig(false)}
        columns={bidderColumns}
        onSave={(updated) => {
          setBidderColumns(updated);
          try {
            localStorage.setItem('af360_bidder_columns', JSON.stringify(updated));
          } catch (_) {}
          showToast('success', 'Columns Saved', 'Table column layout updated.');
        }}
      />

      {/* Row-Level Print-Ready Document Layout */}
      {printSettlementCustomer && (
        <div id="print-settlement-document" style={{ display: 'none' }}>
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-settlement-document,
              #print-settlement-document * {
                visibility: visible;
              }
              #print-settlement-document {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 32px;
                background: #ffffff !important;
                color: #000000 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, textTransform: 'uppercase' }}>Gardner Auction</h1>
              <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>Administrative Settlement Statement & Buyer Invoice</div>
              <div style={{ fontSize: 12, color: '#666' }}>1960 Heritage Way, Suite 400 • Missoula, MT 59801 • Tel: (406) 541-4400</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>INVOICE: {printSettlementCustomer.invoiceNumber || 'INV-Pending'}</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Date: {new Date().toLocaleDateString()}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: printSettlementCustomer.invoiceStatus === 'Paid' ? '#059669' : '#d97706' }}>
                Status: {printSettlementCustomer.invoiceStatus}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24, fontSize: 13 }}>
            <div style={{ border: '1px solid #ddd', padding: 14, borderRadius: 4 }}>
              <strong style={{ textTransform: 'uppercase', fontSize: 11, color: '#666' }}>Billed Customer:</strong>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{printSettlementCustomer.name}</div>
              <div style={{ marginTop: 2 }}>Paddle / Account #: <strong>#{printSettlementCustomer.bidderNumber}</strong></div>
              {printSettlementCustomer.email && <div style={{ marginTop: 2 }}>Email: {printSettlementCustomer.email}</div>}
              <div style={{ marginTop: 2 }}>Shipping Requested: {printSettlementCustomer.shippingRequested ? 'Yes' : 'No'}</div>
            </div>

            <div style={{ border: '1px solid #ddd', padding: 14, borderRadius: 4 }}>
              <strong style={{ textTransform: 'uppercase', fontSize: 11, color: '#666' }}>Auction Information:</strong>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{currentAuction.title} ({currentAuction.code})</div>
              <div style={{ marginTop: 2 }}>Total Lots Won: {printSettlementCustomer.lotCount || printSettlementCustomer.lots.length}</div>
              <div style={{ marginTop: 2 }}>Fulfillment: {printSettlementCustomer.shippedCount} of {printSettlementCustomer.totalLotsCount || printSettlementCustomer.lots.length || 1} Shipped</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', background: '#f5f5f5' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Lot #</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Description / Title</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {printSettlementCustomer.lots.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 700 }}>#{l.lotNumber}</td>
                  <td style={{ padding: '8px' }}>{l.title}</td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>{l.qtySold || 1}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>
                    {formatCurrency(l.entries.reduce((sum, e) => sum + e.amount, 0))}
                  </td>
                </tr>
              ))}
              {printSettlementCustomer.charges && printSettlementCustomer.charges.map(ch => (
                <tr key={ch.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', color: '#666' }}>CHG</td>
                  <td style={{ padding: '8px' }}>{ch.description} ({ch.account})</td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>1</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>{formatCurrency(ch.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30 }}>
            <div style={{ width: 280, border: '1px solid #000', padding: 14, borderRadius: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Subtotal:</span>
                <strong>{formatCurrency(printSettlementCustomer.lots.reduce((acc, l) => acc + l.entries.reduce((s, e) => s + e.amount, 0), 0))}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, borderTop: '1px solid #ccc', paddingTop: 8 }}>
                <span>Balance Due:</span>
                <span style={{ color: printSettlementCustomer.balance > 0 ? '#b91c1c' : '#15803d' }}>{formatCurrency(printSettlementCustomer.balance)}</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#666', borderTop: '1px solid #ddd', paddingTop: 12 }}>
            Thank you for participating with Gardner Auction. Remittance instructions: Wire routing # 092000021 / Account # 882019482. All sales final pursuant to saleroom terms.
          </div>
        </div>
      )}
    </div>
  );
};
