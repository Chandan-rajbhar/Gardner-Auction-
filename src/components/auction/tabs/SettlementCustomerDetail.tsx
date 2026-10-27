import React, { useState, useEffect, useCallback } from 'react';
import { SettlementCustomer, SettlementEntry } from '../../../types/auctionDetail';
import { settlementService, ShipmentRecord } from '../../../services/settlementService';
import { FormModal } from '../../Common/FormModal';
import { FormField } from '../../Common/FormField';
import { EmailSettlementModal } from '../../Common/EmailSettlementModal';
import { PaymentCashierModal } from '../PaymentCashierModal';
import {
  ArrowLeft,
  Printer,
  Mail,
  CreditCard,
  Plus,
  PackageCheck,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface SettlementCustomerDetailProps {
  auctionId: string;
  auctionName?: string;
  customer: SettlementCustomer;
  onBack: () => void;
  onRefresh: () => void;
}

export const SettlementCustomerDetail: React.FC<SettlementCustomerDetailProps> = ({
  auctionId,
  auctionName,
  customer,
  onBack,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'shipments'>('invoice');
  const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [chargeAccount, setChargeAccount] = useState('shipping & handling');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shipment records loaded from Supabase for the Shipments tab
  const [shipmentRecords, setShipmentRecords] = useState<ShipmentRecord[]>([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(false);

  const loadShipments = useCallback(async () => {
    setIsLoadingShipments(true);
    try {
      const records = await settlementService.getShipmentRecords(customer.id);
      setShipmentRecords(records);
    } catch {
      setShipmentRecords([]);
    } finally {
      setIsLoadingShipments(false);
    }
  }, [customer.id]);

  useEffect(() => {
    if (activeTab === 'shipments') {
      loadShipments();
    }
  }, [activeTab, loadShipments]);

  // Build a map from invoice_lot_id to shipment record for the Shipments tab
  const shipmentByLotId: Record<string, ShipmentRecord> = {};
  shipmentRecords.forEach(s => {
    if (s.invoiceLotId) {
      shipmentByLotId[s.invoiceLotId] = s;
    }
  });

  // Add Charge Handler — persists to invoice_charges table
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!chargeAmount || isNaN(parseFloat(chargeAmount)) || parseFloat(chargeAmount) <= 0) {
      setErrorMsg('Please enter a valid positive charge amount.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await settlementService.addCustomerCharge(auctionId, customer.id, {
        account: chargeAccount,
        description: chargeDesc || `${customer.isSeller ? 'Seller' : 'Buyer'} Auction Charge`,
        amount: parseFloat(chargeAmount),
        type: customer.isSeller ? 'seller' : 'buyer'
      });

      if (!result) {
        setErrorMsg('Failed to save charge. Please try again.');
        return;
      }

      setIsAddChargeModalOpen(false);
      setChargeAmount('');
      setChargeDesc('');
      onRefresh();
    } catch {
      setErrorMsg('An unexpected error occurred while saving the charge.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark all shipped handler — persists to shipment_records + invoice_lots
  const handleMarkAllShipped = async () => {
    setIsProcessing(true);
    try {
      const ok = await settlementService.markAllShipped(auctionId, customer.id);
      if (!ok) {
        setErrorMsg('Failed to mark items as shipped.');
        return;
      }
      onRefresh();
      if (activeTab === 'shipments') loadShipments();
    } catch {
      setErrorMsg('An error occurred while updating shipment status.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pay customer / Record payment — via PaymentCashierModal
  const handlePaymentSuccess = () => {
    setPaySuccessMsg(`Payment and cashier settlement confirmed for ${customer.name}.`);
    setTimeout(() => setPaySuccessMsg(null), 4000);
    onRefresh();
  };

  // Refund entry — removes from invoice_lots JSONB entries + recalculates balance
  const handleRefundEntry = async (lotId: string, entryId: string) => {
    if (!window.confirm('Refund this entry? This will reduce the outstanding balance accordingly.')) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const ok = await settlementService.refundLotEntry(auctionId, customer.id, lotId, entryId);
      if (!ok) {
        setErrorMsg('Failed to refund entry.');
        return;
      }
      onRefresh();
    } catch {
      setErrorMsg('An error occurred while processing the refund.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete customer charge — removes from invoice_charges + recalculates balance
  const handleDeleteCharge = async (chargeId: string) => {
    if (!window.confirm('Are you sure you want to remove this charge? The invoice balance will be recalculated.')) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const ok = await settlementService.deleteCustomerCharge(auctionId, customer.id, chargeId);
      if (!ok) {
        setErrorMsg('Failed to delete charge.');
        return;
      }
      onRefresh();
    } catch {
      setErrorMsg('An error occurred while deleting the charge.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update individual lot shipping checkbox
  const handleLotShippingChange = async (lotId: string, checked: boolean) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const ok = await settlementService.updateLotShipping(auctionId, customer.id, lotId, checked);
      if (!ok) {
        setErrorMsg('Failed to update shipping status.');
        return;
      }
      onRefresh();
      if (activeTab === 'shipments') loadShipments();
    } catch {
      setErrorMsg('An error occurred while updating lot shipping.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isSeller = customer.isSeller;
  const resolvedAuctionTitle = auctionName || `Auction ${auctionId}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Settlement Details
          </h1>
          <button
            type="button"
            onClick={onBack}
            id="btn-return-previous-page"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold-dark, #9a741e)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 0',
              marginTop: 2,
              transition: 'color 0.15s ease'
            }}
          >
            <ArrowLeft size={15} />
            <span>Return To Previous Page</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={isProcessing || customer.balance <= 0}
              id="btn-pay-customer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 36,
                padding: '0 16px',
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: customer.balance <= 0 ? 'not-allowed' : 'pointer',
                opacity: customer.balance <= 0 ? 0.6 : 1
              }}
            >
              <CreditCard size={15} />
              <span>{isSeller ? 'Pay Seller Payout' : 'Pay Customer / Cashier'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
              id="btn-print-settlement-detail"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 36,
                padding: '0 16px',
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>PRINT SETTLEMENT</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsEmailModalOpen(true)}
            id="btn-email-settlement-detail"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 32,
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'pointer'
            }}
          >
            <Mail size={14} color="var(--gold-primary, #a37a3b)" />
            <span>EMAIL SETTLEMENT TO: {customer.email || '(no email on file)'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error banners */}
      {paySuccessMsg && (
        <div
          style={{
            padding: '10px 16px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: 6,
            color: '#15803d',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Check size={16} />
          <span>{paySuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '10px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#b91c1c',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: '#b91c1c' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Customer Header Banner */}
      <div
        className="settlement-table-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: '#ffffff',
          borderLeft: '4px solid var(--gold-primary, #a37a3b)',
          padding: '18px 24px',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim, #64748b)', letterSpacing: '0.05em' }}>
            Settlement Details — {resolvedAuctionTitle}
          </div>
          <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--text-main, #0f172a)', margin: '4px 0 0', fontWeight: 700 }}>
            Customer: {isSeller ? 'SELLER' : 'BUYER'} — {customer.name} (#{customer.bidderNumber})
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim, #64748b)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>
              Invoice: <strong style={{ fontFamily: 'var(--font-mono, monospace)', color: '#0f172a' }}>{customer.invoiceNumber || 'INV-Pending'}</strong>
            </span>
            <span>•</span>
            <span>
              Status: <strong style={{ color: customer.invoiceStatus === 'Paid' ? '#059669' : '#d97706' }}>{customer.invoiceStatus}</strong>
            </span>
            {customer.email && (
              <>
                <span>•</span>
                <span>
                  Email: <strong style={{ color: 'var(--gold-dark, #8c6428)' }}>{customer.email}</strong>
                </span>
              </>
            )}
            <span>•</span>
            <span>
              Shipping Requested: <strong>{customer.shippingRequested ? 'Yes' : 'No'}</strong>
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim, #64748b)', textTransform: 'uppercase', fontWeight: 600 }}>
            Customer Balance
          </div>
          <div style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 26,
            fontWeight: 700,
            color: customer.balance > 0 ? '#dc2626' : '#059669',
            marginTop: 2
          }}>
            {formatCurrency(customer.balance)}
          </div>
        </div>
      </div>

      {/* Tabs: Invoice & Shipments */}
      <div className="af360-tabs" style={{ marginBottom: -1, display: 'flex', gap: 6, position: 'relative', zIndex: 1 }}>
        <button
          type="button"
          className={`af360-tab ${activeTab === 'invoice' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoice')}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: activeTab === 'invoice' ? 700 : 600,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            border: '1px solid',
            borderColor: activeTab === 'invoice' ? '#0e121b' : 'var(--border-subtle, #eae5dc)',
            borderTop: activeTab === 'invoice' ? '3px solid var(--gold-primary, #a37a3b)' : '1px solid var(--border-subtle, #eae5dc)',
            borderBottom: activeTab === 'invoice' ? 'none' : '1px solid var(--border-subtle, #eae5dc)',
            background: activeTab === 'invoice' ? '#0e121b' : '#ffffff',
            color: activeTab === 'invoice' ? '#ffffff' : 'var(--text-main, #0f172a)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Invoice
        </button>
        <button
          type="button"
          className={`af360-tab ${activeTab === 'shipments' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipments')}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: activeTab === 'shipments' ? 700 : 600,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            border: '1px solid',
            borderColor: activeTab === 'shipments' ? '#0e121b' : 'var(--border-subtle, #eae5dc)',
            borderTop: activeTab === 'shipments' ? '3px solid var(--gold-primary, #a37a3b)' : '1px solid var(--border-subtle, #eae5dc)',
            borderBottom: activeTab === 'shipments' ? 'none' : '1px solid var(--border-subtle, #eae5dc)',
            background: activeTab === 'shipments' ? '#0e121b' : '#ffffff',
            color: activeTab === 'shipments' ? '#ffffff' : 'var(--text-main, #0f172a)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Shipments ({customer.shippedCount} of {customer.totalLotsCount || customer.lots.length || 0})
        </button>
      </div>

      {/* INVOICE TAB */}
      {activeTab === 'invoice' && (
        <div className="settlement-table-card" style={{ background: '#ffffff', borderRadius: 8, border: '1px solid var(--border-subtle, #eae5dc)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Settlement Ledger & Charges
            </h3>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleMarkAllShipped}
                disabled={isProcessing || customer.lots.length === 0}
                id="btn-mark-all-shipped"
                style={{ fontSize: 12.5, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                <span>Mark all as Shipped / Picked Up</span>
              </button>

              <button
                type="button"
                className="btn btn-gold"
                onClick={() => setIsAddChargeModalOpen(true)}
                disabled={isProcessing}
                id="btn-add-seller-charge"
                style={{ fontSize: 12.5, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>{isSeller ? '+ Add Seller Auction Charge' : '+ Add Auction Charge'}</span>
              </button>
            </div>
          </div>

          {/* Table: Lot #, Status, Title, Qty Sold, Entries */}
          <div className="settlement-table-scroll" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <table className="catalog-luxury-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ width: 50, textAlign: 'center', padding: '10px 12px' }}>SHIP</th>
                  <th style={{ width: 85, padding: '10px 12px' }}>LOT #</th>
                  <th style={{ width: 110, textAlign: 'center', padding: '10px 12px' }}>STATUS</th>
                  <th style={{ minWidth: 240, padding: '10px 12px' }}>TITLE / NOTES</th>
                  <th style={{ width: 95, textAlign: 'center', padding: '10px 12px' }}>QTY SOLD</th>
                  <th style={{ minWidth: 320, padding: '10px 12px' }}>ENTRIES / BREAKDOWN</th>
                </tr>
              </thead>
              <tbody>
                {customer.lots.map(lot => (
                  <tr key={lot.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={lot.isShipped}
                        disabled={isProcessing}
                        onChange={(e) => handleLotShippingChange(lot.id, e.target.checked)}
                        title="Mark as Shipped / Picked Up"
                        style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, padding: '10px 12px' }}>
                      #{lot.lotNumber}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: '#dcfce7',
                        color: '#15803d'
                      }}>
                        {lot.status || 'Sold'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>{lot.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim, #64748b)', marginTop: 2 }}>
                        {lot.isShipped ? '✓ Dispatched / Handed over to buyer' : 'Pending packaging & dispatch'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono, monospace)', padding: '10px 12px' }}>
                      {lot.qtySold || 1}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {lot.entries.map((ent: SettlementEntry) => (
                          <div
                            key={ent.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: 12,
                              background: '#f8fafc',
                              padding: '5px 8px',
                              borderRadius: 4,
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <span style={{ color: '#475569' }}>{ent.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: '#0f172a' }}>
                                {formatCurrency(ent.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRefundEntry(lot.id, ent.id)}
                                disabled={isProcessing}
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                                }}
                                title="Refund entry"
                              >
                                Refund ✕
                              </button>
                            </div>
                          </div>
                        ))}
                        {lot.entries.length === 0 && (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No charge entries</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Additional Customer Direct Charges */}
                {customer.charges && customer.charges.map(chg => (
                  <tr key={chg.id} style={{ background: '#fcfbf9', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>—</td>
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-dim, #64748b)', padding: '10px 12px' }}>CHG</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, color: 'var(--gold-dark, #9a741e)', fontWeight: 600 }}>Account</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>{chg.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim, #64748b)' }}>Account: {chg.account} • {chg.date}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>1</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Consignment Adjustment:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--gold-dark, #9a741e)' }}>
                            {formatCurrency(chg.amount)}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleDeleteCharge(chg.id)}
                            disabled={isProcessing}
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 5px',
                              cursor: isProcessing ? 'not-allowed' : 'pointer'
                            }}
                            title="Delete charge"
                          >
                            Delete ✕
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Empty State */}
                {customer.lots.length === 0 && (!customer.charges || customer.charges.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                      <FileText size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>No lot line items available</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        Lot items are automatically added when bidders win lots at auction.
                        Use "+ Add Auction Charge" to record additional charges.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          {(customer.lots.length > 0 || (customer.charges && customer.charges.length > 0)) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ minWidth: 260, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  <span>Lot Subtotal:</span>
                  <strong style={{ fontFamily: 'var(--font-mono, monospace)', color: '#0f172a' }}>
                    {formatCurrency(customer.lots.reduce((acc, l) => acc + l.entries.reduce((s, e) => s + e.amount, 0), 0))}
                  </strong>
                </div>
                {customer.charges && customer.charges.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                    <span>Additional Charges:</span>
                    <strong style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--gold-dark, #9a741e)' }}>
                      {formatCurrency(customer.charges.reduce((sum, c) => sum + c.amount, 0))}
                    </strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                  <span>Balance Due:</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', color: customer.balance > 0 ? '#dc2626' : '#059669' }}>
                    {formatCurrency(customer.balance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHIPMENTS TAB */}
      {activeTab === 'shipments' && (
        <div className="settlement-table-card" style={{ background: '#ffffff', borderRadius: 8, border: '1px solid var(--border-subtle, #eae5dc)', padding: 20 }}>
          <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: 12 }}>
            Shipping & Fulfilment Status
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Fulfilment progress bar */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Fulfilment Progress</span>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--gold-primary, #a37a3b)' }}>
                  {customer.shippedCount} of {customer.totalLotsCount || customer.lots.length || 0} Items Shipped
                </span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'var(--gold-primary, #a37a3b)',
                  width: `${(customer.shippedCount / Math.max(1, customer.totalLotsCount || customer.lots.length || 1)) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {isLoadingShipments && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, padding: 12 }}>
                <Loader2 size={16} className="animate-spin" />
                <span>Loading shipment records…</span>
              </div>
            )}

            <div className="settlement-table-scroll" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <table className="catalog-luxury-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: 85, padding: '10px 12px' }}>LOT #</th>
                    <th style={{ padding: '10px 12px' }}>ITEM DESCRIPTION</th>
                    <th style={{ width: 150, textAlign: 'center', padding: '10px 12px' }}>DISPATCH STATUS</th>
                    <th style={{ width: 220, textAlign: 'center', padding: '10px 12px' }}>CARRIER / TRACKING</th>
                    <th style={{ width: 110, textAlign: 'center', padding: '10px 12px' }}>SHIP DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.lots.map(lot => {
                    const shpRecord = shipmentByLotId[lot.id];
                    return (
                      <tr key={lot.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, padding: '10px 12px' }}>
                          #{lot.lotNumber}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{lot.title}</td>
                        <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: lot.isShipped ? '#dcfce7' : '#fee2e2',
                            color: lot.isShipped ? '#15803d' : '#b91c1c'
                          }}>
                            {lot.isShipped ? (shpRecord?.status || 'Shipped') : 'Awaiting Dispatch'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, padding: '10px 12px' }}>
                          {shpRecord?.carrier && shpRecord?.trackingNumber
                            ? <span title={`Carrier: ${shpRecord.carrier}`}>{shpRecord.trackingNumber}</span>
                            : lot.isShipped
                              ? <span style={{ color: '#94a3b8' }}>Pickup / No Tracking</span>
                              : '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 12, padding: '10px 12px', color: '#475569' }}>
                          {shpRecord?.shipDate || (lot.isShipped ? 'N/A' : '—')}
                        </td>
                      </tr>
                    );
                  })}
                  {customer.lots.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                        No shipment tracking records found for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Charge Modal */}
      <FormModal
        isOpen={isAddChargeModalOpen}
        title={isSeller ? 'Add Seller Auction Charge' : 'Add Buyer Auction Charge'}
        onClose={() => {
          setIsAddChargeModalOpen(false);
          setChargeAmount('');
          setChargeDesc('');
          setErrorMsg(null);
        }}
        onSubmit={handleAddCharge}
        submitLabel={isProcessing ? 'Saving...' : 'Add Charge'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {errorMsg && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 13 }}>
              {errorMsg}
            </div>
          )}

          <FormField label="Account Select" required>
            <select
              value={chargeAccount}
              onChange={(e) => setChargeAccount(e.target.value)}
              className="catalog-filter-select"
              style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }}
            >
              <option value="shipping & handling">shipping &amp; handling</option>
              <option value="packaging & postal insurance">packaging &amp; postal insurance</option>
              <option value="consignor commission adjustment">consignor commission adjustment</option>
              <option value="photography & grading certification">photography &amp; grading certification</option>
              <option value="saleroom vault storage">saleroom vault storage</option>
            </select>
          </FormField>

          <FormField label="Amount ($) *" required>
            <input
              id="input-charge-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </FormField>

          <FormField label="Description">
            <textarea
              id="input-charge-desc"
              rows={2}
              placeholder="e.g. Registered insured courier postage and armored transport handling"
              value={chargeDesc}
              onChange={(e) => setChargeDesc(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
          </FormField>
        </div>
      </FormModal>

      {/* Email Settlement Modal */}
      <EmailSettlementModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        customer={customer}
        auctionTitle={resolvedAuctionTitle}
        auctionCode={auctionId}
        onSuccess={() => onRefresh()}
      />

      {/* Payment Cashier Modal */}
      <PaymentCashierModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        customer={customer}
        auctionId={auctionId}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Print-Only Settlement Document */}
      <div id="print-settlement-document" className="print-only-layout" style={{ display: 'none' }}>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #print-settlement-document,
            #print-settlement-document * { visibility: visible; }
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>INVOICE: {customer.invoiceNumber || 'INV-Pending'}</div>
            <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Date: {new Date().toLocaleDateString()}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: customer.invoiceStatus === 'Paid' ? '#059669' : '#d97706' }}>
              Status: {customer.invoiceStatus}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24, fontSize: 13 }}>
          <div style={{ border: '1px solid #ddd', padding: 14, borderRadius: 4 }}>
            <strong style={{ textTransform: 'uppercase', fontSize: 11, color: '#666' }}>Billed Customer:</strong>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{customer.name}</div>
            <div style={{ marginTop: 2 }}>Paddle / Account #: <strong>#{customer.bidderNumber}</strong></div>
            {customer.email && <div style={{ marginTop: 2 }}>Email: {customer.email}</div>}
            <div style={{ marginTop: 2 }}>Shipping Requested: {customer.shippingRequested ? 'Yes' : 'No'}</div>
          </div>

          <div style={{ border: '1px solid #ddd', padding: 14, borderRadius: 4 }}>
            <strong style={{ textTransform: 'uppercase', fontSize: 11, color: '#666' }}>Auction Information:</strong>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{resolvedAuctionTitle}</div>
            <div style={{ marginTop: 2 }}>Total Lots Won: {customer.lotCount || customer.lots.length}</div>
            <div style={{ marginTop: 2 }}>Fulfillment: {customer.shippedCount} of {customer.totalLotsCount || customer.lots.length || 0} Shipped</div>
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
            {customer.lots.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', fontWeight: 700 }}>#{l.lotNumber}</td>
                <td style={{ padding: '8px' }}>{l.title}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{l.qtySold || 1}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>
                  {formatCurrency(l.entries.reduce((sum, e) => sum + e.amount, 0))}
                </td>
              </tr>
            ))}
            {customer.charges && customer.charges.map(ch => (
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
              <strong>{formatCurrency(customer.lots.reduce((acc, l) => acc + l.entries.reduce((s, e) => s + e.amount, 0), 0))}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, borderTop: '1px solid #ccc', paddingTop: 8 }}>
              <span>Balance Due:</span>
              <span style={{ color: customer.balance > 0 ? '#b91c1c' : '#15803d' }}>{formatCurrency(customer.balance)}</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#666', borderTop: '1px solid #ddd', paddingTop: 12 }}>
          Thank you for participating with Gardner Auction. Remittance instructions: Wire routing # 092000021 / Account # 882019482. All sales final pursuant to saleroom terms.
        </div>
      </div>
    </div>
  );
};
