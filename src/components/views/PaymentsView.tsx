import React, { useState, useEffect, useMemo } from 'react';
import { InvoiceSettlement, ConsignorSettlement } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Receipt, 
  DollarSign, 
  CreditCard, 
  Printer, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  Search, 
  FileText, 
  X,
  ExternalLink,
  ShieldCheck,
  Building,
  Mail,
  Eye,
  PackageCheck,
  RotateCw,
  Truck,
  ArrowLeft,
  ChevronDown,
  Settings,
  Send,
  Download,
  AlertCircle
} from 'lucide-react';

import { AuctionDetailProvider } from '../../context/AuctionDetailContext';
import { SettlementTab } from '../auction/tabs/SettlementTab';
import { TableRowActionMenu } from '../Common/TableRowActionMenu';
import { ShadcnSheet } from '../ui/ShadcnSheet';
import { ShadcnPagination } from '../ui/ShadcnPagination';
import { ShadcnSelect } from '../ui/ShadcnSelect';
import { settlementService, BatchShipmentData } from '../../services/settlementService';
import { auctionService } from '../../services/auctionService';
import { useToast } from '../../context/ToastContext';

interface PaymentsViewProps {
  invoices: InvoiceSettlement[];
  consignorSettlements: ConsignorSettlement[];
  onUpdateInvoiceStatus: (id: string, status: InvoiceSettlement['paymentStatus']) => void;
  onUpdateConsignorStatus: (id: string, status: ConsignorSettlement['status']) => void;
  selectedAuctionId?: string;
  availableAuctions?: Array<{ id: string; code: string; title: string; status?: string }>;
  onSelectAuction?: (id: string) => void;
  onNavigateAuctions?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  invoices: propInvoices,
  consignorSettlements: propConsignorSettlements,
  onUpdateInvoiceStatus,
  onUpdateConsignorStatus,
  selectedAuctionId = 'auc-002',
  availableAuctions = [],
  onSelectAuction,
  onNavigateAuctions
}) => {
  const { showToast } = useToast();

  // Active Tab state: Defaults to AF360 Bidder Settlement
  const [activeTab, setActiveTab] = useState<'bidder' | 'seller' | 'invoices' | 'consignors'>('bidder');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Auction metadata
  const currentAuctionId = selectedAuctionId;
  const currentAuction = availableAuctions.find(a => a.id === currentAuctionId) || {
    id: currentAuctionId,
    code: currentAuctionId === 'auc-001' ? 'GA-2026-10-GOLD' : 'GA-2026-10-HISTORIC',
    title: currentAuctionId === 'auc-001' ? 'Rolex, Fine Jewelry, Historic Numismatics & Rare US Gold' : 'Premier Americana & High Relief Numismatics',
    status: 'In Progress'
  };

  // Local state for live mutations
  const [invoices, setInvoices] = useState<InvoiceSettlement[]>(propInvoices);
  const [consignorSettlements, setConsignorSettlements] = useState<ConsignorSettlement[]>(propConsignorSettlements);

  useEffect(() => {
    setInvoices(propInvoices);
  }, [propInvoices]);

  useEffect(() => {
    setConsignorSettlements(propConsignorSettlements);
  }, [propConsignorSettlements]);

  // Load seller settlements dynamically from Supabase
  useEffect(() => {
    let isMounted = true;
    settlementService.getSellerSettlements(currentAuctionId).then(data => {
      if (isMounted && data && data.length > 0) {
        setConsignorSettlements(data);
      }
    });
    return () => { isMounted = false; };
  }, [currentAuctionId]);

  // Modals & Drawers state
  const [isBatchShipmentsOpen, setIsBatchShipmentsOpen] = useState(false);
  const [isUpdateInvoicesOpen, setIsUpdateInvoicesOpen] = useState(false);
  const [isPrintEmailOpen, setIsPrintEmailOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceSettlement | null>(null);

  // Invoices filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Consignors filter & pagination state
  const [consignorSearchTerm, setConsignorSearchTerm] = useState('');
  const [consignorStatusFilter, setConsignorStatusFilter] = useState('all');
  const [sellerPage, setSellerPage] = useState<number>(1);
  const [sellerPageSize, setSellerPageSize] = useState<number>(20);

  // Drawer Form States
  // 1. Batch Shipments Drawer Form
  const [batchShipSelectedIds, setBatchShipSelectedIds] = useState<string[]>([]);
  const [batchCarrier, setBatchCarrier] = useState('FedEx Ground');
  const [batchTracking, setBatchTracking] = useState('');
  const [batchShipDate, setBatchShipDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchNotes, setBatchNotes] = useState('');
  const [isSubmittingBatchShip, setIsSubmittingBatchShip] = useState(false);

  // 2. Update Invoice Drawer Form
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices[0]?.id || '');
  const [editInvoiceStatus, setEditInvoiceStatus] = useState<InvoiceSettlement['paymentStatus']>('Paid');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Wire Transfer');
  const [editTaxAmount, setEditTaxAmount] = useState<string>('');
  const [editShippingFee, setEditShippingFee] = useState<string>('');
  const [editInvoiceNotes, setEditInvoiceNotes] = useState('');
  const [isSubmittingInvoiceUpdate, setIsSubmittingInvoiceUpdate] = useState(false);

  // Sync selected invoice form fields when selectedInvoiceId changes
  useEffect(() => {
    const inv = invoices.find(i => i.id === selectedInvoiceId);
    if (inv) {
      setEditInvoiceStatus(inv.paymentStatus);
      setEditPaymentMethod(inv.paymentMethod || 'Wire Transfer');
      setEditTaxAmount(String(inv.taxAmount || 0));
      setEditShippingFee(String(inv.shippingFee || 0));
      setEditInvoiceNotes(inv.notes || '');
    }
  }, [selectedInvoiceId, invoices]);

  // 3. Print / Email Drawer Form
  const [printDocType, setPrintDocType] = useState<'buyer_invoice' | 'seller_statement' | 'summary'>('buyer_invoice');
  const [printScope, setPrintScope] = useState<'all' | 'selected'>('all');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Filtering calculations
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.paddleNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredConsignors = consignorSettlements.filter(c => {
    const matchesSearch = 
      c.consignorCode.toLowerCase().includes(consignorSearchTerm.toLowerCase()) ||
      c.consignorName.toLowerCase().includes(consignorSearchTerm.toLowerCase()) ||
      c.auctionCode.toLowerCase().includes(consignorSearchTerm.toLowerCase());
    const matchesStatus = consignorStatusFilter === 'all' || 
      (consignorStatusFilter === 'Paid' ? c.status === 'Paid' : c.status !== 'Paid');
    return matchesSearch && matchesStatus;
  });

  // Paginated Consignors
  const paginatedConsignors = filteredConsignors.slice(
    (sellerPage - 1) * sellerPageSize,
    sellerPage * sellerPageSize
  );

  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalDue, 0);
  const totalPaid = invoices.filter(inv => inv.paymentStatus === 'Paid').reduce((acc, inv) => acc + inv.totalDue, 0);
  const totalPending = totalInvoiced - totalPaid;

  // Handlers for Drawer Operations
  // 1. Submit Batch Shipments
  const handleApplyBatchShipments = async () => {
    if (batchShipSelectedIds.length === 0) {
      showToast('error', 'Selection Required', 'Please select at least one bidder settlement to mark as shipped.');
      return;
    }

    setIsSubmittingBatchShip(true);
    try {
      await settlementService.markBatchShipped(currentAuctionId, batchShipSelectedIds, {
        carrier: batchCarrier,
        trackingNumber: batchTracking || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
        shipDate: batchShipDate,
        notes: batchNotes
      });

      showToast('success', 'Batch Shipments Processed', `Marked ${batchShipSelectedIds.length} bidder settlement(s) as shipped via ${batchCarrier}.`);
      setIsBatchShipmentsOpen(false);
      setBatchShipSelectedIds([]);
    } catch (_) {
      showToast('error', 'Error', 'Failed to update shipment records in Supabase.');
    } finally {
      setIsSubmittingBatchShip(false);
    }
  };

  // 2. Submit Update Invoice
  const handleSaveInvoiceUpdate = async () => {
    if (!selectedInvoiceId) return;
    setIsSubmittingInvoiceUpdate(true);
    try {
      const parsedTax = parseFloat(editTaxAmount) || 0;
      const parsedShipping = parseFloat(editShippingFee) || 0;

      await settlementService.updateInvoice(currentAuctionId, selectedInvoiceId, {
        paymentStatus: editInvoiceStatus,
        paymentMethod: editPaymentMethod,
        taxAmount: parsedTax,
        shippingFee: parsedShipping,
        notes: editInvoiceNotes
      });

      onUpdateInvoiceStatus(selectedInvoiceId, editInvoiceStatus);
      setInvoices(prev => prev.map(inv => {
        if (inv.id === selectedInvoiceId) {
          const newTotal = inv.hammerSubtotal + inv.buyersPremium + parsedTax + parsedShipping;
          return {
            ...inv,
            paymentStatus: editInvoiceStatus,
            paymentMethod: editPaymentMethod,
            taxAmount: parsedTax,
            shippingFee: parsedShipping,
            totalDue: newTotal,
            notes: editInvoiceNotes
          };
        }
        return inv;
      }));

      showToast('success', 'Invoice Updated', `Updated invoice ${invoices.find(i => i.id === selectedInvoiceId)?.invoiceNumber || ''} in Supabase.`);
      setIsUpdateInvoicesOpen(false);
    } catch (_) {
      showToast('error', 'Error', 'Failed to update invoice in Supabase.');
    } finally {
      setIsSubmittingInvoiceUpdate(false);
    }
  };

  // 3. Submit Send Email
  const handleSendEmail = () => {
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      showToast('error', 'Invalid Email', 'Please enter a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      showToast('success', 'Email Sent', `Settlement document successfully emailed to ${recipientEmail}.`);
      setIsPrintEmailOpen(false);
      setRecipientEmail('');
    }, 700);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* =========================================================================
          1. AUCTION SETTLEMENT HEADER (Matches AF360 Top Header & Actions)
          ========================================================================= */}
      <div className="card-luxury" style={{ padding: '16px 22px', background: '#ffffff' }}>
        <div className="auction-day-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                {currentAuction.title} - Settlement
              </h2>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                background: currentAuction.status === 'Closed' ? '#fee2e2' : '#dcfce7',
                color: currentAuction.status === 'Closed' ? '#b91c1c' : '#15803d',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                ● {currentAuction.status || 'In Progress'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 5 }}>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateAuctions) {
                    onNavigateAuctions();
                  } else {
                    try { window.history.pushState({}, '', '/auctions'); } catch (_) {}
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
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>↵ Return to All Auctions</span>
              </button>

              {/* {availableAuctions.length > 1 && onSelectAuction && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Switch Auction:</span>
                  <select
                    value={currentAuctionId}
                    onChange={(e) => onSelectAuction(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: 'var(--text-main)',
                      fontWeight: 600
                    }}
                  >
                    {availableAuctions.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.title.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              )} */}
            </div>
          </div>

          {/* Action Buttons: Batch Shipments, Update Invoices, Print / Email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsBatchShipmentsOpen(true)}
              id="btn-batch-shipments"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', fontSize: 13, fontWeight: 600 }}
            >
              <PackageCheck size={16} color="var(--gold-primary)" />
              <span>BATCH SHIPMENTS</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUpdateInvoicesOpen(true)}
              id="btn-update-invoices"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', fontSize: 13, fontWeight: 600 }}
            >
              <FileText size={16} color="var(--gold-primary)" />
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
      </div>

      {/* =========================================================================
          2. SETTLEMENT SUB-TABS (Matches AF360 Dual Tabs: Bidder & Seller)
          ========================================================================= */}
      <div className="af360-tabs" style={{ marginBottom: 2 }}>
        <button 
          type="button"
          className={`af360-tab ${activeTab === 'bidder' ? 'active' : ''}`}
          onClick={() => setActiveTab('bidder')}
          id="tab-bidder-settlement"
        >
          Bidder Settlement
        </button>
        <button 
          type="button"
          className={`af360-tab ${activeTab === 'seller' ? 'active' : ''}`}
          onClick={() => setActiveTab('seller')}
          id="tab-seller-settlement"
        >
          Seller Settlement
        </button>
        <button 
          type="button"
          className={`af360-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          Buyer Invoices ({invoices.length})
        </button>
        <button 
          type="button"
          className={`af360-tab ${activeTab === 'consignors' ? 'active' : ''}`}
          onClick={() => setActiveTab('consignors')}
        >
          Consignor Statements ({consignorSettlements.length})
        </button>
      </div>

      {/* =========================================================================
          3. FINANCIAL SUMMARY METRIC CARDS
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div className="metric-card-af360">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
              flexShrink: 0
            }}>
              <DollarSign size={20} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: 4 }}>
                Total Invoiced Realization
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {formatCurrency(totalInvoiced)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                Total realization
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card-af360">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: 4 }}>
                Settled / Wires Received
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: '#059669', lineHeight: 1.2 }}>
                {formatCurrency(totalPaid)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                Cleared wires & cards
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card-af360">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ca8a04',
              flexShrink: 0
            }}>
              <Clock size={20} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: 4 }}>
                Pending Cashiering
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: '#b45309', lineHeight: 1.2 }}>
                {formatCurrency(totalPending)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                Awaiting cashiering
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. TAB CONTENT: BIDDER SETTLEMENT (Default AF360 View)
          ========================================================================= */}
      {activeTab === 'bidder' && (
        <AuctionDetailProvider auctionId={currentAuctionId}>
          <SettlementTab
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            onOpenBatchShipments={() => setIsBatchShipmentsOpen(true)}
            onOpenUpdateInvoices={() => setIsUpdateInvoicesOpen(true)}
            onOpenPrintEmail={() => setIsPrintEmailOpen(true)}
          />
        </AuctionDetailProvider>
      )}

      {/* =========================================================================
          5. TAB CONTENT: SELLER SETTLEMENT (AF360 Consignor Settlement View)
          ========================================================================= */}
      {activeTab === 'seller' && (
        <div className="syndication-card">
          <div className="settlement-header-row" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 18, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                Seller Settlement Console
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Consignor commissions, catalog fees, and net settlement disbursement ledger
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', fontSize: 12.5, fontWeight: 600 }}
              >
                <Printer size={15} />
                <span>Print Statements</span>
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={consignorStatusFilter}
                onChange={(e) => {
                  setConsignorStatusFilter(e.target.value);
                  setSellerPage(1);
                }}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: 'var(--text-main)',
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                <option value="all">All Settlement Statuses</option>
                <option value="Paid">Paid Out</option>
                <option value="Ready for Payout">Ready for Payout</option>
                <option value="Pending Review">Pending Review</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div className="catalog-search-wrapper" style={{ maxWidth: 300, minWidth: 220, position: 'relative' }}>
                <Search size={15} className="catalog-search-icon" />
                <input 
                  type="text"
                  placeholder="Filter consignor, entity, code..."
                  value={consignorSearchTerm}
                  onChange={(e) => {
                    setConsignorSearchTerm(e.target.value);
                    setSellerPage(1);
                  }}
                  className="catalog-search-input"
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  title="Configure Columns"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Settings size={14} />
                </button>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Total Statements: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{filteredConsignors.length}</strong>
              </div>
            </div>
          </div>

          {/* Seller Settlement Table */}
          <div className="settlement-table-scroll">
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>CONSIGNOR CODE</th>
                  <th style={{ minWidth: 190 }}>CONSIGNOR ENTITY</th>
                  <th style={{ width: 140 }}>AUCTION SALE</th>
                  <th style={{ width: 95, textAlign: 'center' }}>LOTS SOLD</th>
                  <th style={{ width: 130, textAlign: 'right' }}>GROSS HAMMER</th>
                  <th style={{ width: 120, textAlign: 'right' }}>COMMISSION</th>
                  <th style={{ width: 120, textAlign: 'right' }}>CATALOG FEES</th>
                  <th style={{ width: 140, textAlign: 'right' }}>NET PAYOUT</th>
                  <th style={{ width: 125, textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: 70, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedConsignors.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark)' }}>
                      {c.consignorCode}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {c.consignorName}
                      </div>
                      {c.checkNumber && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          Check: {c.checkNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.auctionCode}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {c.totalLotsSold}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {formatCurrency(c.grossHammer)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#dc2626' }}>
                      -{formatCurrency(c.commissionAmount)}
                      <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block' }}>({c.commissionRate}%)</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      -{formatCurrency(c.photographyFees)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669', fontSize: 14 }}>
                      {formatCurrency(c.netPayout)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-consignor-status ${c.status === 'Paid' ? 'paid' : c.status === 'Ready for Payout' ? 'ready' : 'pending'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActionMenu
                        ariaLabel={`Actions for ${c.consignorName}`}
                        actions={[
                          {
                            label: 'View Statement',
                            icon: Eye,
                            onClick: () => {
                              alert(`Consignor Statement #${c.consignorCode} for ${c.consignorName}\nGross Hammer: ${formatCurrency(c.grossHammer)}\nNet Payout: ${formatCurrency(c.netPayout)}`);
                            }
                          },
                          {
                            label: 'Print Statement',
                            icon: Printer,
                            onClick: () => window.print()
                          },
                          {
                            label: 'Email Statement',
                            icon: Mail,
                            onClick: () => {
                              showToast('success', 'Email Sent', `Consignor statement emailed to ${c.consignorName}.`);
                            }
                          },
                          {
                            label: 'Mark as Paid',
                            icon: CheckCircle,
                            disabled: c.status === 'Paid',
                            onClick: async () => {
                              const checkNum = `CHK-${Math.floor(900000 + Math.random() * 99999)}`;
                              await settlementService.updateSellerSettlementStatus(currentAuctionId, c.id, 'Paid', checkNum);
                              onUpdateConsignorStatus(c.id, 'Paid');
                              setConsignorSettlements(prev => prev.map(item => item.id === c.id ? { ...item, status: 'Paid', checkNumber: checkNum } : item));
                              showToast('success', 'Settlement Paid', `Marked ${c.consignorName} as Paid with ${checkNum}.`);
                            }
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}

                {filteredConsignors.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-dim)' }}>
                      No seller settlements match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Seller Settlements */}
          {filteredConsignors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <ShadcnPagination
                currentPage={sellerPage}
                totalItems={filteredConsignors.length}
                pageSize={sellerPageSize}
                onPageChange={setSellerPage}
                onPageSizeChange={(newSize) => {
                  setSellerPageSize(newSize);
                  setSellerPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
                itemLabel="statements"
              />
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          6. TAB CONTENT: BUYER SETTLEMENT INVOICES (Preserved Extended Ledger)
          ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="syndication-card">
          <div className="settlement-header-row" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 18, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                Buyer Settlement Invoices
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Reconciliation, buyer's premiums, and cashiering ledger
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', fontSize: 12.5, fontWeight: 600 }}
              >
                <Printer size={15} />
                <span>Print Invoices</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ 
                  background: '#ffffff', 
                  border: '1.5px solid #cbd5e1', 
                  color: 'var(--text-main)', 
                  padding: '7px 14px', 
                  borderRadius: 6, 
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                <option value="all">All Payment Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending Wire">Pending Wire</option>
                <option value="Card Authorized">Card Authorized</option>
                <option value="Check Received">Check Received</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div className="catalog-search-wrapper" style={{ maxWidth: 300, minWidth: 220 }}>
                <Search size={15} className="catalog-search-icon" />
                <input 
                  type="text"
                  placeholder="Filter invoice, buyer, paddle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="catalog-search-input"
                />
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Total Invoices: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{filteredInvoices.length}</strong>
              </div>
            </div>
          </div>

          <div className="settlement-table-scroll">
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>INVOICE NUMBER</th>
                  <th style={{ minWidth: 180 }}>BUYER NAME</th>
                  <th style={{ width: 95 }}>PADDLE#</th>
                  <th style={{ width: 95, textAlign: 'center' }}>ITEMS</th>
                  <th style={{ width: 130, textAlign: 'right' }}>HAMMER TOTAL</th>
                  <th style={{ width: 110, textAlign: 'right' }}>BP (15%)</th>
                  <th style={{ width: 135, textAlign: 'right' }}>TOTAL DUE</th>
                  <th style={{ width: 140, textAlign: 'center' }}>PAYMENT STATUS</th>
                  <th style={{ width: 70, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--gold-dark)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <FileText size={14} />
                        <span>{inv.invoiceNumber}</span>
                      </button>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {inv.buyerName}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                        {inv.buyerEmail}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      #{inv.paddleNumber}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {inv.itemsCount}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(inv.hammerSubtotal)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(inv.buyersPremium)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontSize: 14 }}>
                      {formatCurrency(inv.totalDue)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-invoice-status ${inv.paymentStatus === 'Paid' ? 'paid' : inv.paymentStatus === 'Pending Wire' ? 'pending' : 'card'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActionMenu
                        ariaLabel={`Actions for ${inv.invoiceNumber}`}
                        actions={[
                          {
                            label: 'View Invoice',
                            icon: Eye,
                            onClick: () => setPreviewInvoice(inv)
                          },
                          {
                            label: 'Update Invoice',
                            icon: FileText,
                            onClick: () => {
                              setSelectedInvoiceId(inv.id);
                              setIsUpdateInvoicesOpen(true);
                            }
                          },
                          {
                            label: 'Mark as Paid',
                            icon: CheckCircle,
                            disabled: inv.paymentStatus === 'Paid',
                            onClick: () => {
                              onUpdateInvoiceStatus(inv.id, 'Paid');
                              showToast('success', 'Payment Settled', `Invoice ${inv.invoiceNumber} marked as Paid.`);
                            }
                          },
                          {
                            label: 'Print Document',
                            icon: Printer,
                            onClick: () => window.print()
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. TAB CONTENT: CONSIGNOR PAYOUT STATEMENTS (Preserved View)
          ========================================================================= */}
      {activeTab === 'consignors' && (
        <div className="syndication-card">
          <div className="settlement-header-row" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 18, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                Consignor Payout Statements
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Consignor commissions, catalog fees, and net disbursement ledger
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', fontSize: 12.5, fontWeight: 600 }}
            >
              <Printer size={15} />
              <span>Print Statements</span>
            </button>
          </div>

          <div className="settlement-table-scroll">
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>CONSIGNOR CODE</th>
                  <th style={{ minWidth: 190 }}>CONSIGNOR ENTITY</th>
                  <th style={{ width: 140 }}>AUCTION SALE</th>
                  <th style={{ width: 95, textAlign: 'center' }}>LOTS SOLD</th>
                  <th style={{ width: 130, textAlign: 'right' }}>GROSS HAMMER</th>
                  <th style={{ width: 120, textAlign: 'right' }}>COMMISSION</th>
                  <th style={{ width: 120, textAlign: 'right' }}>CATALOG FEES</th>
                  <th style={{ width: 140, textAlign: 'right' }}>NET PAYOUT</th>
                  <th style={{ width: 125, textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: 70, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsignors.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark)' }}>
                      {c.consignorCode}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {c.consignorName}
                      </div>
                      {c.checkNumber && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          Check: {c.checkNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.auctionCode}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {c.totalLotsSold}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(c.grossHammer)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#dc2626' }}>
                      -{formatCurrency(c.commissionAmount)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      -{formatCurrency(c.photographyFees)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669', fontSize: 14 }}>
                      {formatCurrency(c.netPayout)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-consignor-status ${c.status === 'Paid' ? 'paid' : c.status === 'Ready for Payout' ? 'ready' : 'pending'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActionMenu
                        ariaLabel={`Actions for ${c.consignorName}`}
                        actions={[
                          {
                            label: 'Mark as Paid',
                            icon: CheckCircle,
                            disabled: c.status === 'Paid',
                            onClick: () => {
                              onUpdateConsignorStatus(c.id, 'Paid');
                              showToast('success', 'Payout Settled', `Marked ${c.consignorName} as Paid.`);
                            }
                          },
                          {
                            label: 'Print Statement',
                            icon: Printer,
                            onClick: () => window.print()
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. RIGHT-SIDE DRAWER: BATCH SHIPMENTS
          ========================================================================= */}
      <ShadcnSheet
        isOpen={isBatchShipmentsOpen}
        onClose={() => setIsBatchShipmentsOpen(false)}
        title="Batch Shipments Processing"
        description="Select eligible bidder settlement accounts, configure carrier and tracking, and mark orders as shipped."
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
              onClick={handleApplyBatchShipments}
              disabled={isSubmittingBatchShip || batchShipSelectedIds.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', fontSize: 13, fontWeight: 700 }}
            >
              {isSubmittingBatchShip ? <RotateCw size={15} className="animate-spin" /> : <Truck size={15} />}
              <span>Apply Batch Shipments ({batchShipSelectedIds.length})</span>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
              Eligible Bidder Settlements ({invoices.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {invoices.map(inv => {
                const isSelected = batchShipSelectedIds.includes(inv.id);
                return (
                  <label
                    key={inv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isSelected ? '#fbf8f2' : '#ffffff',
                      border: isSelected ? '1.5px solid var(--gold-primary)' : '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setBatchShipSelectedIds(prev => prev.filter(id => id !== inv.id));
                          } else {
                            setBatchShipSelectedIds(prev => [...prev, inv.id]);
                          }
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                          {inv.buyerName} (#{inv.paddleNumber})
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {inv.invoiceNumber} • {inv.itemsCount} items
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                      {formatCurrency(inv.totalDue)}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setBatchShipSelectedIds(invoices.map(i => i.id))}
                style={{ background: 'none', border: 'none', color: 'var(--gold-dark)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setBatchShipSelectedIds([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11.5, cursor: 'pointer', padding: 0 }}
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Carrier / Shipping Method
            </label>
            <select
              value={batchCarrier}
              onChange={(e) => setBatchCarrier(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="FedEx Ground">FedEx Ground (Direct Signature)</option>
              <option value="FedEx Priority Overnight">FedEx Priority Overnight</option>
              <option value="UPS Express">UPS Express Saver</option>
              <option value="USPS Priority Mail">USPS Priority Mail Registered</option>
              <option value="Armored Courier">Armored Courier (Brinks / Malca-Amit)</option>
              <option value="Local Saleroom Pickup">Local Saleroom Pickup (Signed Receipt)</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>
                Master Tracking / Reference Number
              </label>
              <button
                type="button"
                onClick={() => setBatchTracking(`TRK-${Date.now().toString().slice(-8)}`)}
                style={{ background: 'none', border: 'none', color: 'var(--gold-dark)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
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
                fontFamily: 'var(--font-mono)'
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
                fontSize: 13
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
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </ShadcnSheet>

      {/* =========================================================================
          9. RIGHT-SIDE DRAWER: UPDATE INVOICES
          ========================================================================= */}
      <ShadcnSheet
        isOpen={isUpdateInvoicesOpen}
        onClose={() => setIsUpdateInvoicesOpen(false)}
        title="Update Auction Invoices"
        description="Select an invoice, update payment and cashiering status, adjust fee lines, and persist changes."
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
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff',
                fontWeight: 600
              }}
            >
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.buyerName} (#{inv.paddleNumber}) • {formatCurrency(inv.totalDue)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Payment Status
            </label>
            <select
              value={editInvoiceStatus}
              onChange={(e) => setEditInvoiceStatus(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="Paid">Paid (Fully Settled)</option>
              <option value="Pending Wire">Pending Wire Transfer</option>
              <option value="Card Authorized">Card Authorized</option>
              <option value="Check Received">Check Received (Clearing)</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Payment Method
            </label>
            <select
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="Wire Transfer">Bank Wire Transfer</option>
              <option value="Credit Card">Credit Card on File (HiBid / Square)</option>
              <option value="Cash">Cash (In-Person Floor Settlement)</option>
              <option value="Company Check">Cashier's Check / Money Order</option>
              <option value="Escrow">Third-Party Escrow</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                Adjust Sales Tax ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={editTaxAmount}
                onChange={(e) => setEditTaxAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)'
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
                value={editShippingFee}
                onChange={(e) => setEditShippingFee(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Internal Cashier Notes
            </label>
            <textarea
              rows={3}
              placeholder="Add cashier notes or transaction IDs..."
              value={editInvoiceNotes}
              onChange={(e) => setEditInvoiceNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </ShadcnSheet>

      {/* =========================================================================
          10. RIGHT-SIDE DRAWER: PRINT / EMAIL
          ========================================================================= */}
      <ShadcnSheet
        isOpen={isPrintEmailOpen}
        onClose={() => setIsPrintEmailOpen(false)}
        title="Print / Email Settlement Documents"
        description="Generate official settlement invoices, consignor payout statements, or dispatch email receipts."
        size="md"
        isSubmitting={isSendingEmail}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPrintEmailOpen(false)}
              style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', fontSize: 13, fontWeight: 600 }}
            >
              <Printer size={15} />
              <span>Print Document</span>
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
            <select
              value={printDocType}
              onChange={(e) => setPrintDocType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="buyer_invoice">Buyer Settlement Invoices</option>
              <option value="seller_statement">Consignor Payout Statements</option>
              <option value="summary">Consolidated Auction Settlement Summary</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Document Scope
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="printScope"
                  checked={printScope === 'all'}
                  onChange={() => setPrintScope('all')}
                />
                <span>All Auction Records</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="printScope"
                  checked={printScope === 'selected'}
                  onChange={() => setPrintScope('selected')}
                />
                <span>Active / Pending Records</span>
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Recipient Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. accounting@gardnerauction.com or buyer@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 13
              }}
            />
          </div>

          {/* Document Preview Box */}
          <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '16px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)', letterSpacing: '0.04em' }}>
                  GARDNER AUCTION SALEROOM
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Certified Auctioneer & Executive Clerking
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--text-main)', marginBottom: 8 }}>
              <strong>Auction:</strong> {currentAuction.title} ({currentAuction.code})
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              <strong>Document:</strong> {printDocType === 'buyer_invoice' ? 'Buyer Settlement Invoice' : printDocType === 'seller_statement' ? 'Consignor Payout Statement' : 'Settlement Reconciliation Ledger'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <strong>Total Realization:</strong> {formatCurrency(totalInvoiced)}
            </div>
          </div>
        </div>
      </ShadcnSheet>

      {/* =========================================================================
          11. DETAILED INVOICE PREVIEW MODAL (Preserved Existing Workflow)
          ========================================================================= */}
      {previewInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(4px)',
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden'
          }}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 className="font-serif" style={{ fontSize: 18, color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Settlement Invoice #{previewInvoice.invoiceNumber}
                </h3>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Buyer: {previewInvoice.buyerName} (Paddle #{previewInvoice.paddleNumber})
                </div>
              </div>
              <button 
                className="btn-icon" 
                onClick={() => setPreviewInvoice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 24, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                      Invoice Information
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                      {previewInvoice.buyerName}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {previewInvoice.buyerEmail}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge-invoice-status ${previewInvoice.paymentStatus === 'Paid' ? 'paid' : previewInvoice.paymentStatus === 'Pending Wire' ? 'pending' : 'card'}`}>
                      {previewInvoice.paymentStatus}
                    </span>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                      {previewInvoice.paymentDate ? formatDate(previewInvoice.paymentDate) : 'Awaiting Cashiering'}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 8, letterSpacing: '0.05em' }}>
                    Won Lots ({previewInvoice.lots.length})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '8px 0', width: 60 }}>LOT#</th>
                        <th style={{ padding: '8px 12px' }}>TITLE</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}>HAMMER PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoice.lots.map(l => (
                        <tr key={l.lotNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 0', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{l.lotNumber}</td>
                          <td style={{ padding: '10px 12px', color: '#1e293b' }}>{l.title}</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(l.hammerPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 14, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Hammer Subtotal:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(previewInvoice.hammerSubtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Buyer's Premium:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.buyersPremium)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Sales Tax:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.taxAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Shipping & Handling:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.shippingFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280, borderTop: '2px solid #0f172a', paddingTop: 10, marginTop: 4, fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                    <span>TOTAL SETTLEMENT:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.totalDue)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {previewInvoice.paymentStatus !== 'Paid' && (
                <button 
                  className="btn btn-gold"
                  onClick={() => {
                    onUpdateInvoiceStatus(previewInvoice.id, 'Paid');
                    setPreviewInvoice({ ...previewInvoice, paymentStatus: 'Paid' });
                    showToast('success', 'Wire Settled', `Invoice ${previewInvoice.invoiceNumber} marked as Paid.`);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, height: 38 }}
                >
                  <CheckCircle size={15} />
                  <span>Mark Bank Wire Received</span>
                </button>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, height: 38 }}
              >
                <Printer size={15} />
                <span>Print Document</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setPreviewInvoice(null)}
                style={{ fontSize: 13, height: 38 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
