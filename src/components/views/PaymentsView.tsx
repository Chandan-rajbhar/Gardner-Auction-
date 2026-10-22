import React, { useState } from 'react';
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
  Eye
} from 'lucide-react';

import { AuctionDetailProvider } from '../../context/AuctionDetailContext';
import { SettlementTab } from '../auction/tabs/SettlementTab';
import { TableRowActionMenu } from '../Common/TableRowActionMenu';

interface PaymentsViewProps {
  invoices: InvoiceSettlement[];
  consignorSettlements: ConsignorSettlement[];
  onUpdateInvoiceStatus: (id: string, status: InvoiceSettlement['paymentStatus']) => void;
  onUpdateConsignorStatus: (id: string, status: ConsignorSettlement['status']) => void;
  selectedAuctionId?: string;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  invoices,
  consignorSettlements,
  onUpdateInvoiceStatus,
  onUpdateConsignorStatus,
  selectedAuctionId = 'auc-002'
}) => {
  const [activeTab, setActiveTab] = useState<'consolidated' | 'invoices' | 'consignors'>('consolidated');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Invoices filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceSettlement | null>(null);

  // Consignors filter state
  const [consignorSearchTerm, setConsignorSearchTerm] = useState('');
  const [consignorStatusFilter, setConsignorStatusFilter] = useState('all');

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

  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalDue, 0);
  const totalPaid = invoices.filter(inv => inv.paymentStatus === 'Paid').reduce((acc, inv) => acc + inv.totalDue, 0);
  const totalPending = totalInvoiced - totalPaid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Page Header (Matching Auction Day layout) */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
            Settlement & Invoices
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Consolidated buyer settlement invoicing, consignor payouts, and cashiering ledger reconciliation
          </p>
        </div>
      </div>

      {/* 2. Sub-tabs Bar (Matching Auction Day layout) */}
      <div className="af360-tabs" style={{ marginBottom: 4 }}>
        <button 
          type="button"
          className={`af360-tab ${activeTab === 'consolidated' ? 'active' : ''}`}
          onClick={() => setActiveTab('consolidated')}
        >
          Consolidated Settlement
        </button>
        <button 
          type="button"
          className={`af360-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          Buyer Settlement Invoices ({invoices.length})
        </button>
        <button 
          type="button"
          className={`af360-tab ${activeTab === 'consignors' ? 'active' : ''}`}
          onClick={() => setActiveTab('consignors')}
        >
          Consignor Payout Statements ({consignorSettlements.length})
        </button>
      </div>

      {/* 3. Financial Summary Metric Cards Grid (Matching Auction Day 2x4 card visual style) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Card 1: Total Invoiced Realization */}
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

        {/* Card 2: Settled / Wires Received */}
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

        {/* Card 3: Pending Cashiering */}
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

      {/* 4. Active Tab Content (Matching Auction Day card styling) */}
      {activeTab === 'consolidated' && (
        <AuctionDetailProvider auctionId={selectedAuctionId || 'auc-002'}>
          <SettlementTab
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
          />
        </AuctionDetailProvider>
      )}

      {/* TAB 2: BUYER SETTLEMENT INVOICES */}
      {activeTab === 'invoices' && (
        <div className="syndication-card">
          {/* Header row */}
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

          {/* Controls bar */}
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
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                aria-label="Filter payments by status"
              >
                <option value="all">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Card Authorized">Card Authorized</option>
                <option value="Pending Wire">Pending Wire</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div className="catalog-search-wrapper" style={{ maxWidth: 280, minWidth: 200 }}>
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

          {/* Invoices table */}
          <div className="settlement-table-scroll">
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>INVOICE #</th>
                  <th style={{ width: 90 }}>PADDLE</th>
                  <th style={{ minWidth: 190 }}>WINNING BIDDER</th>
                  <th style={{ width: 120, textAlign: 'right' }}>HAMMER TOTAL</th>
                  <th style={{ width: 125, textAlign: 'right' }}>BUYER'S PREMIUM</th>
                  <th style={{ width: 125, textAlign: 'right' }}>TAX & SHIPPING</th>
                  <th style={{ width: 130, textAlign: 'right' }}>TOTAL DUE</th>
                  <th style={{ width: 130 }}>PAYMENT STATUS</th>
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
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: 'var(--gold-dark)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                        title="Preview official invoice"
                      >
                        <ExternalLink size={12} color="var(--gold-primary)" />
                        <span>{inv.invoiceNumber}</span>
                      </button>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--gold-dark)', background: '#fefce8', border: '1px solid #fef08a', padding: '2px 7px', borderRadius: 4, fontSize: 12 }}>
                        #{inv.paddleNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.buyerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inv.buyerEmail}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(inv.hammerSubtotal)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(inv.buyersPremium)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(inv.taxAmount + inv.shippingFee)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      {formatCurrency(inv.totalDue)}
                    </td>
                    <td>
                      <span className={`badge-invoice-status ${inv.paymentStatus === 'Paid' ? 'paid' : inv.paymentStatus === 'Card Authorized' ? 'card-authorized' : 'pending'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActionMenu
                        ariaLabel={`Actions for invoice ${inv.invoiceNumber}`}
                        actions={[
                          {
                            label: 'View & Print Bill',
                            icon: Eye,
                            onClick: () => setPreviewInvoice(inv)
                          },
                          {
                            label: 'Print Invoice',
                            icon: Printer,
                            onClick: () => {
                              setPreviewInvoice(inv);
                              setTimeout(() => window.print(), 200);
                            }
                          },
                          ...(inv.paymentStatus !== 'Paid' ? [{
                            label: 'Mark Bank Wire Received',
                            icon: CheckCircle2,
                            onClick: () => onUpdateInvoiceStatus(inv.id, 'Paid')
                          }] : []),
                          {
                            label: 'Email Bill to Bidder',
                            icon: Mail,
                            onClick: () => alert(`Emailing invoice ${inv.invoiceNumber} to ${inv.buyerEmail}...`)
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-dim)' }}>
                      No invoices match current search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONSIGNOR PAYOUT STATEMENTS */}
      {activeTab === 'consignors' && (
        <div className="syndication-card">
          {/* Header row */}
          <div className="settlement-header-row" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 18, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                Consignor Payout Statements
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Consignor commissions, catalog fees, and net disbursement ledger
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

          {/* Controls bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select 
                value={consignorStatusFilter} 
                onChange={(e) => setConsignorStatusFilter(e.target.value)}
                style={{ 
                  background: '#ffffff', 
                  border: '1.5px solid #cbd5e1', 
                  color: 'var(--text-main)', 
                  padding: '7px 14px', 
                  borderRadius: 6, 
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                aria-label="Filter consignors by payout status"
              >
                <option value="all">All Statements</option>
                <option value="Paid">Paid (Check Disbursed)</option>
                <option value="Pending">Pending Payout</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div className="catalog-search-wrapper" style={{ maxWidth: 280, minWidth: 200 }}>
                <Search size={15} className="catalog-search-icon" />
                <input 
                  type="text" 
                  placeholder="Filter consignor, entity, code..."
                  value={consignorSearchTerm}
                  onChange={(e) => setConsignorSearchTerm(e.target.value)}
                  className="catalog-search-input"
                />
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Total Statements: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{filteredConsignors.length}</strong>
              </div>
            </div>
          </div>

          {/* Consignors table */}
          <div className="settlement-table-scroll">
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>CONSIGNOR CODE</th>
                  <th style={{ minWidth: 180 }}>CONSIGNOR ENTITY</th>
                  <th style={{ width: 140 }}>AUCTION SALE</th>
                  <th style={{ width: 95, textAlign: 'center' }}>LOTS SOLD</th>
                  <th style={{ width: 120, textAlign: 'right' }}>GROSS HAMMER</th>
                  <th style={{ width: 135, textAlign: 'right' }}>COMMISSION</th>
                  <th style={{ width: 120, textAlign: 'right' }}>CATALOG FEES</th>
                  <th style={{ width: 140, textAlign: 'right' }}>NET PAYOUT</th>
                  <th style={{ width: 125 }}>STATUS</th>
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
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.consignorName}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {c.auctionCode}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {c.totalLotsSold}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(c.grossHammer)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#dc2626' }}>
                      -{formatCurrency(c.commissionAmount)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({c.commissionRate}%)</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      -{formatCurrency(c.photographyFees)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669' }}>
                      {formatCurrency(c.netPayout)}
                    </td>
                    <td>
                      <span className={`badge-invoice-status ${c.status === 'Paid' ? 'paid' : 'pending'}`}>
                        {c.status}
                      </span>
                      {c.status === 'Paid' && c.checkNumber && (
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          {c.checkNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActionMenu
                        ariaLabel={`Actions for ${c.consignorName}`}
                        actions={[
                          ...(c.status !== 'Paid' ? [{
                            label: 'Disburse Check',
                            icon: CreditCard,
                            onClick: () => onUpdateConsignorStatus(c.id, 'Paid')
                          }] : []),
                          {
                            label: 'Print Payout Statement',
                            icon: Printer,
                            onClick: () => window.print()
                          },
                          {
                            label: 'Email Statement',
                            icon: Mail,
                            onClick: () => alert(`Emailing statement for ${c.consignorCode} to consignor...`)
                          },
                          {
                            label: 'View Statement Details',
                            icon: FileText,
                            onClick: () => alert(`Consignor Statement: ${c.consignorName} (${c.consignorCode})\nGross: ${formatCurrency(c.grossHammer)}\nCommission: -${formatCurrency(c.commissionAmount)}\nNet Payout: ${formatCurrency(c.netPayout)}`)
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}

                {filteredConsignors.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-dim)' }}>
                      No consignor statements match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formal Invoice Sheet Modal */}
      {previewInvoice && (
        <div className="modal-overlay" onClick={() => setPreviewInvoice(null)}>
          <div className="modal-content" style={{ maxWidth: 720, borderRadius: 12, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div>
                <h3 className="font-serif" style={{ fontSize: 18, margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>
                  Official Gardner Auction Settlement Invoice
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Electronic cashiering copy and buyer realization document
                </p>
              </div>
              <button className="icon-btn" onClick={() => setPreviewInvoice(null)} title="Close invoice">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div className="invoice-sheet" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24 }}>
                <div className="invoice-header-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', paddingBottom: 16, marginBottom: 18 }}>
                  <div>
                    <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--gold-dark)', margin: 0, fontWeight: 700 }}>
                      GARDNER AUCTION
                    </h2>
                    <p style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 0' }}>
                      Est. 1960 • 1960 Heritage Way, Suite 400 • Missoula, MT 59801
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                      Licensed Numismatic & Fine Art Saleroom
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a', fontSize: 16 }}>
                      {previewInvoice.invoiceNumber}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Paddle Assigned: <strong style={{ color: 'var(--gold-dark)', fontFamily: 'var(--font-mono)' }}>#{previewInvoice.paddleNumber}</strong>
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      Status: <span className={`badge-invoice-status ${previewInvoice.paymentStatus === 'Paid' ? 'paid' : 'pending'}`}>{previewInvoice.paymentStatus.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 18, fontSize: 13, background: '#f8fafc', padding: '12px 16px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em' }}>
                    Invoiced Purchaser
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginTop: 2 }}>{previewInvoice.buyerName}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{previewInvoice.buyerEmail}</div>
                </div>

                <div className="settlement-table-scroll" style={{ marginBottom: 18 }}>
                  <table className="catalog-luxury-table" style={{ fontSize: 12.5, minWidth: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Lot #</th>
                        <th>Item Description</th>
                        <th style={{ textAlign: 'right', width: 120 }}>Hammer Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoice.lots.map((l, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark)' }}>#{l.lotNumber}</td>
                          <td style={{ color: '#0f172a', fontWeight: 500 }}>{l.title}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(l.hammerPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', fontSize: 13, borderTop: '1.5px solid #e2e8f0', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Hammer Subtotal:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(previewInvoice.hammerSubtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Buyer's Premium (15% / 18%):</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.buyersPremium)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Sales Tax:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.taxAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: '#64748b' }}>Armored Courier Shipping:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.shippingFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280, borderTop: '2px solid #0f172a', paddingTop: 10, marginTop: 4, fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                    <span>TOTAL SETTLEMENT:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.totalDue)}</span>
                  </div>
                </div>

                {previewInvoice.notes && (
                  <div style={{ marginTop: 18, fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#0f172a' }}>Notes:</strong> {previewInvoice.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {previewInvoice.paymentStatus !== 'Paid' && (
                <button 
                  className="btn btn-gold"
                  onClick={() => {
                    onUpdateInvoiceStatus(previewInvoice.id, 'Paid');
                    setPreviewInvoice({ ...previewInvoice, paymentStatus: 'Paid' });
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
