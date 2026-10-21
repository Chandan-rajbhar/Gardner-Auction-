import React, { useState } from 'react';
import { SettlementCustomer, SettlementEntry } from '../../../types/auctionDetail';
import { auctionService } from '../../../services/auctionService';
import { FormModal } from '../../Common/FormModal';
import { FormField } from '../../Common/FormField';
import { 
  ArrowLeft, 
  Printer, 
  CreditCard, 
  Plus, 
  PackageCheck, 
  RefreshCw, 
  Trash2, 
  Check, 
  Clock, 
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface SettlementCustomerDetailProps {
  auctionId: string;
  customer: SettlementCustomer;
  onBack: () => void;
  onRefresh: () => void;
}

export const SettlementCustomerDetail: React.FC<SettlementCustomerDetailProps> = ({
  auctionId,
  customer,
  onBack,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'shipments'>('invoice');
  const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
  const [chargeAccount, setChargeAccount] = useState('shipping & handling');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Add Charge Handler
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeAmount) return;

    setIsProcessing(true);
    await auctionService.addCustomerCharge(auctionId, customer.id, {
      account: chargeAccount,
      description: chargeDesc || `${customer.isSeller ? 'Seller' : 'Buyer'} Auction Charge`,
      amount: parseFloat(chargeAmount) || 0,
      type: customer.isSeller ? 'seller' : 'buyer'
    });

    setIsProcessing(false);
    setIsAddChargeModalOpen(false);
    setChargeAmount('');
    setChargeDesc('');
    onRefresh();
  };

  // Mark all shipped handler
  const handleMarkAllShipped = async () => {
    setIsProcessing(true);
    await auctionService.markAllShipped(auctionId, customer.id);
    setIsProcessing(false);
    onRefresh();
  };

  // Refund entry handler
  const handleRefundEntry = async (lotId: string, entryId: string) => {
    const updatedCustomer = { ...customer };
    const lot = updatedCustomer.lots.find(l => l.id === lotId);
    if (!lot) return;

    const entry = lot.entries.find(e => e.id === entryId);
    if (!entry) return;

    // Subtract from balance
    updatedCustomer.balance = Math.max(0, updatedCustomer.balance - entry.amount);
    // Remove or refund entry
    lot.entries = lot.entries.filter(e => e.id !== entryId);

    await auctionService.saveSettlementCustomer(auctionId, updatedCustomer);
    onRefresh();
  };

  const isSeller = customer.isSeller;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gold-dark)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ArrowLeft size={16} />
          <span>← Return To Previous Page</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>Print Settlement</span>
          </button>

          <button
            type="button"
            className="btn btn-gold"
            onClick={() => alert(`Processing payout / payment receipt for ${customer.name}...`)}
          >
            <CreditCard size={15} />
            <span>Pay Customer</span>
          </button>
        </div>
      </div>

      {/* Customer Header Banner matching requirement */}
      <div 
        className="syndication-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: '#ffffff',
          borderLeft: '4px solid var(--gold-primary)'
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            Customer Statement Details
          </div>
          <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--text-main)', margin: '4px 0 0' }}>
            Customer: {isSeller ? 'SELLER' : 'BUYER'} - {customer.name} (#{customer.bidderNumber})
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            Invoice: <span style={{ fontFamily: 'var(--font-mono)' }}>{customer.invoiceNumber}</span> • Status: <strong style={{ color: customer.invoiceStatus === 'Paid' ? '#059669' : '#d97706' }}>{customer.invoiceStatus}</strong>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Customer Balance
          </div>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: 26, 
            fontWeight: 700, 
            color: customer.balance > 0 ? '#dc2626' : '#059669' 
          }}>
            {formatCurrency(customer.balance)}
          </div>
        </div>
      </div>

      {/* Tabs: Invoice & Shipments */}
      <div className="af360-tabs" style={{ marginBottom: 4 }}>
        <button
          type="button"
          className={`af360-tab ${activeTab === 'invoice' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoice')}
        >
          Invoice
        </button>
        <button
          type="button"
          className={`af360-tab ${activeTab === 'shipments' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipments')}
        >
          Shipments ({customer.shippedCount} of {customer.totalLotsCount || customer.lots.length})
        </button>
      </div>

      {/* INVOICE TAB */}
      {activeTab === 'invoice' && (
        <div className="syndication-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Settlement Ledger & Charges
            </h3>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleMarkAllShipped}
                disabled={isProcessing || customer.lots.length === 0}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                <PackageCheck size={14} />
                <span>Mark all as Shipped / Picked Up</span>
              </button>

              <button
                type="button"
                className="btn btn-gold"
                onClick={() => setIsAddChargeModalOpen(true)}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                <Plus size={14} />
                <span>{isSeller ? '+ Add Seller Auction Charge' : '+ Add Buyer Auction Charge'}</span>
              </button>
            </div>
          </div>

          {/* Table: Lot #, Status, Title / Notes, Qty Sold, Entries */}
          <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>SHIP</th>
                  <th style={{ width: 80 }}>LOT #</th>
                  <th style={{ width: 100, textAlign: 'center' }}>STATUS</th>
                  <th style={{ minWidth: 240 }}>TITLE / NOTES</th>
                  <th style={{ width: 90, textAlign: 'center' }}>QTY SOLD</th>
                  <th style={{ minWidth: 320 }}>ENTRIES / BREAKDOWN</th>
                </tr>
              </thead>
              <tbody>
                {customer.lots.map(lot => (
                  <tr key={lot.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={lot.isShipped}
                        onChange={async (e) => {
                          lot.isShipped = e.target.checked;
                          customer.shippedCount = customer.lots.filter(l => l.isShipped).length;
                          await auctionService.saveSettlementCustomer(auctionId, customer);
                          onRefresh();
                        }}
                        title="Mark as Shipped / Picked Up"
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      #{lot.lotNumber}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 600,
                        background: '#dcfce7',
                        color: '#15803d'
                      }}>
                        {lot.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lot.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {lot.isShipped ? '✓ Dispatched / Handed over to buyer' : 'Pending packaging & dispatch'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {lot.qtySold}
                    </td>
                    <td>
                      {/* Entries Breakdown List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
                        {lot.entries.map(ent => (
                          <div 
                            key={ent.id}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              fontSize: 12,
                              background: '#fcfbf9',
                              padding: '4px 8px',
                              borderRadius: 4,
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <span style={{ color: 'var(--text-secondary)' }}>{ent.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                                {formatCurrency(ent.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRefundEntry(lot.id, ent.id)}
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  cursor: 'pointer'
                                }}
                                title="Refund entry"
                              >
                                Refund ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Additional Customer Direct Charges (e.g. shipping surcharge, fee) */}
                {customer.charges.map(chg => (
                  <tr key={chg.id} style={{ background: '#fcfbf9' }}>
                    <td style={{ textAlign: 'center' }}>—</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>CHG</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--gold-dark)', fontWeight: 600 }}>Account</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{chg.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Account: {chg.account} • {chg.date}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Additional Surcharge:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-dark)' }}>
                          {formatCurrency(chg.amount)}
                        </strong>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Empty State for House Seller or customers without lot records */}
                {customer.lots.length === 0 && customer.charges.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>No data available in table</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
                        Use "+ Add Seller Auction Charge" above to record consignment adjustments.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHIPMENTS TAB */}
      {activeTab === 'shipments' && (
        <div className="syndication-card">
          <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
            Shipping & Fulfilment Status
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Fulfilment Progress</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-primary)' }}>
                  {customer.shippedCount} of {customer.totalLotsCount || customer.lots.length} Items Shipped
                </span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'var(--gold-primary)', 
                  width: `${(customer.shippedCount / Math.max(1, customer.totalLotsCount || customer.lots.length)) * 100}%` 
                }} />
              </div>
            </div>

            <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>LOT #</th>
                    <th>ITEM DESCRIPTION</th>
                    <th style={{ width: 140, textAlign: 'center' }}>DISPATCH STATUS</th>
                    <th style={{ width: 160, textAlign: 'center' }}>TRACKING</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.lots.map(lot => (
                    <tr key={lot.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>#{lot.lotNumber}</td>
                      <td>{lot.title}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          fontSize: 11, 
                          fontWeight: 600,
                          background: lot.isShipped ? '#dcfce7' : '#fee2e2',
                          color: lot.isShipped ? '#15803d' : '#b91c1c'
                        }}>
                          {lot.isShipped ? 'Shipped / Handed Over' : 'Awaiting Dispatch'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {lot.isShipped ? 'USPS-INS-94001289' : '—'}
                      </td>
                    </tr>
                  ))}
                  {customer.lots.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-dim)' }}>
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
        onClose={() => setIsAddChargeModalOpen(false)}
        onSubmit={handleAddCharge}
        submitLabel="Add Charge"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Account Select" required>
            <select
              value={chargeAccount}
              onChange={(e) => setChargeAccount(e.target.value)}
              className="catalog-filter-select"
              style={{ width: '100%', height: 36 }}
            >
              <option value="shipping & handling">shipping & handling</option>
              <option value="packaging & postal insurance">packaging & postal insurance</option>
              <option value="consignor commission adjustment">consignor commission adjustment</option>
              <option value="photography & grading certification">photography & grading certification</option>
              <option value="saleroom vault storage">saleroom vault storage</option>
            </select>
          </FormField>

          <FormField label="Amount ($) *" required>
            <input 
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>

          <FormField label="Description">
            <textarea 
              rows={2}
              placeholder="e.g. Registered insured courier postage and armored transport handling"
              value={chargeDesc}
              onChange={(e) => setChargeDesc(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
            />
          </FormField>
        </div>
      </FormModal>
    </div>
  );
};
