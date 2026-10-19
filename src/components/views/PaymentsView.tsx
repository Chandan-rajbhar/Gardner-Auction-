import React, { useState } from 'react';
import { InvoiceSettlement, ConsignorSettlement } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Receipt, 
  DollarSign, 
  CreditCard, 
  Printer, 
  CheckCircle, 
  Clock, 
  Search, 
  FileText, 
  X,
  ExternalLink,
  ShieldCheck,
  Building
} from 'lucide-react';

interface PaymentsViewProps {
  invoices: InvoiceSettlement[];
  consignorSettlements: ConsignorSettlement[];
  onUpdateInvoiceStatus: (id: string, status: InvoiceSettlement['paymentStatus']) => void;
  onUpdateConsignorStatus: (id: string, status: ConsignorSettlement['status']) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  invoices,
  consignorSettlements,
  onUpdateInvoiceStatus,
  onUpdateConsignorStatus
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'consignors'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceSettlement | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.paddleNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalDue, 0);
  const totalPaid = invoices.filter(inv => inv.paymentStatus === 'Paid').reduce((acc, inv) => acc + inv.totalDue, 0);
  const totalPending = totalInvoiced - totalPaid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="metric-card-af360">
          <div className="metric-icon-box">
            <DollarSign size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-val">{formatCurrency(totalInvoiced)}</div>
            <div className="metric-label">Total Invoiced Realization</div>
          </div>
        </div>

        <div className="metric-card-af360">
          <div className="metric-icon-box emerald">
            <CheckCircle size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-val" style={{ color: '#34d399' }}>{formatCurrency(totalPaid)}</div>
            <div className="metric-label">Settled / Wires Received</div>
          </div>
        </div>

        <div className="metric-card-af360">
          <div className="metric-icon-box">
            <Clock size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-val" style={{ color: '#fbbf24' }}>{formatCurrency(totalPending)}</div>
            <div className="metric-label">Pending Cashiering</div>
          </div>
        </div>
      </div>

      {/* Main Card with Sub-tabs */}
      <div className="syndication-card">
        <div className="card-header-flex">
          <div className="af360-tabs">
            <button 
              className={`af360-tab ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              Buyer Settlement Invoices ({invoices.length})
            </button>
            <button 
              className={`af360-tab ${activeTab === 'consignors' ? 'active' : ''}`}
              onClick={() => setActiveTab('consignors')}
            >
              Consignor Payout Statements ({consignorSettlements.length})
            </button>
          </div>

          {activeTab === 'invoices' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="input-search-wrapper" style={{ minWidth: 200 }}>
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Filter invoice, buyer, paddle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: 'var(--bg-darkest)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
              >
                <option value="all">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Card Authorized">Card Authorized</option>
                <option value="Pending Wire">Pending Wire</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === 'invoices' ? (
          <div className="table-wrapper">
            <table className="luxury-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Paddle</th>
                  <th>Winning Bidder</th>
                  <th style={{ textAlign: 'right' }}>Hammer Total</th>
                  <th style={{ textAlign: 'right' }}>Buyer's Premium</th>
                  <th style={{ textAlign: 'right' }}>Tax & Shipping</th>
                  <th style={{ textAlign: 'right' }}>Total Due</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: 'center' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-light)' }}>
                      {inv.invoiceNumber}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--gold-primary)', background: 'rgba(212, 175, 55, 0.08)', padding: '2px 6px', borderRadius: 4 }}>
                        #{inv.paddleNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.buyerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{inv.buyerEmail}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(inv.hammerSubtotal)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(inv.buyersPremium)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {formatCurrency(inv.taxAmount + inv.shippingFee)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-bright)' }}>
                      {formatCurrency(inv.totalDue)}
                    </td>
                    <td>
                      <span className={`badge badge-${inv.paymentStatus === 'Paid' ? 'live' : inv.paymentStatus === 'Card Authorized' ? 'preview' : 'pending'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => setPreviewInvoice(inv)}
                      >
                        <Printer size={12} />
                        <span>Print Bill</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Consignors Tab */
          <div className="table-wrapper">
            <table className="luxury-table">
              <thead>
                <tr>
                  <th>Consignor Code</th>
                  <th>Consignor Entity</th>
                  <th>Auction Sale</th>
                  <th style={{ textAlign: 'center' }}>Lots Sold</th>
                  <th style={{ textAlign: 'right' }}>Gross Hammer</th>
                  <th style={{ textAlign: 'right' }}>Commission</th>
                  <th style={{ textAlign: 'right' }}>Catalog Fees</th>
                  <th style={{ textAlign: 'right' }}>Net Consignor Payout</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {consignorSettlements.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-primary)' }}>
                      {c.consignorCode}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.consignorName}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.auctionCode}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{c.totalLotsSold}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(c.grossHammer)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f87171' }}>
                      -{formatCurrency(c.commissionAmount)} ({c.commissionRate}%)
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      -{formatCurrency(c.photographyFees)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                      {formatCurrency(c.netPayout)}
                    </td>
                    <td>
                      <span className={`badge badge-${c.status === 'Paid' ? 'live' : 'gold'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {c.status !== 'Paid' ? (
                        <button 
                          className="btn btn-gold" 
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => onUpdateConsignorStatus(c.id, 'Paid')}
                        >
                          Disburse Check
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {c.checkNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formal Invoice Sheet Modal */}
      {previewInvoice && (
        <div className="modal-overlay" onClick={() => setPreviewInvoice(null)}>
          <div className="modal-content" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-serif">Official Gardner Auction Invoice</h3>
              <button className="icon-btn" onClick={() => setPreviewInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="invoice-sheet">
                <div className="invoice-header-row">
                  <div>
                    <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--gold-bright)' }}>
                      GARDNER AUCTION
                    </h2>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Est. 1960 • 1960 Heritage Way, Suite 400 • Missoula, MT 59801
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      AF360 Licensed Numismatic Saleroom
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>
                      {previewInvoice.invoiceNumber}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Paddle Assigned: <strong style={{ color: 'var(--gold-primary)' }}>#{previewInvoice.paddleNumber}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Status: <strong style={{ color: '#10b981' }}>{previewInvoice.paymentStatus.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 18, fontSize: 13 }}>
                  <div style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                    Invoiced Purchaser
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{previewInvoice.buyerName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{previewInvoice.buyerEmail}</div>
                </div>

                <div className="table-wrapper" style={{ marginBottom: 16 }}>
                  <table className="luxury-table">
                    <thead>
                      <tr>
                        <th>Lot #</th>
                        <th>Item Description</th>
                        <th style={{ textAlign: 'right' }}>Hammer Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoice.lots.map((l, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)' }}>#{l.lotNumber}</td>
                          <td style={{ color: 'var(--text-main)' }}>{l.title}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(l.hammerPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', fontSize: 13, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Hammer Subtotal:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.hammerSubtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Buyer's Premium (15% / 18%):</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.buyersPremium)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sales Tax:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.taxAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Armored Courier Shipping:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.shippingFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 280, borderTop: '1px solid var(--border-gold)', paddingTop: 8, marginTop: 4, fontWeight: 700, fontSize: 16, color: 'var(--gold-bright)' }}>
                    <span>TOTAL SETTLEMENT:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(previewInvoice.totalDue)}</span>
                  </div>
                </div>

                {previewInvoice.notes && (
                  <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-dim)', background: 'var(--bg-darkest)', padding: 10, borderRadius: 6 }}>
                    Notes: {previewInvoice.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {previewInvoice.paymentStatus !== 'Paid' && (
                <button 
                  className="btn btn-gold"
                  onClick={() => {
                    onUpdateInvoiceStatus(previewInvoice.id, 'Paid');
                    setPreviewInvoice({ ...previewInvoice, paymentStatus: 'Paid' });
                  }}
                >
                  <CheckCircle size={14} />
                  <span>Mark Bank Wire Received</span>
                </button>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => window.print()}
              >
                <Printer size={14} />
                <span>Print Document</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setPreviewInvoice(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
