import React, { useState, useEffect } from 'react';
import { useAuctionDetail } from '../../../context/AuctionDetailContext';
import { SettlementCustomer } from '../../../types/auctionDetail';
import { auctionService } from '../../../services/auctionService';
import { SettlementCustomerDetail } from './SettlementCustomerDetail';
import { 
  PackageCheck, 
  Printer, 
  Mail, 
  CreditCard, 
  Search, 
  X, 
  ExternalLink, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface SettlementTabProps {
  selectedCustomerId?: string | null;
  onSelectCustomer: (customerId: string | null) => void;
}

export const SettlementTab: React.FC<SettlementTabProps> = ({
  selectedCustomerId,
  onSelectCustomer
}) => {
  const { state, dispatch } = useAuctionDetail();
  const auction = state.data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [customers, setCustomers] = useState<SettlementCustomer[]>([]);

  useEffect(() => {
    if (auction?.settlements) {
      setCustomers(auction.settlements);
    }
  }, [auction?.settlements]);

  if (!auction) return null;

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  // If a customer is selected, show SettlementCustomerDetail
  if (activeCustomer) {
    return (
      <SettlementCustomerDetail
        auctionId={auction.id}
        customer={activeCustomer}
        onBack={() => onSelectCustomer(null)}
        onRefresh={async () => {
          const updated = await auctionService.getAuctionById(auction.id);
          if (updated) {
            dispatch({ type: 'SET_AUCTION', payload: updated });
            setCustomers(updated.settlements);
          }
        }}
      />
    );
  }

  // Filter settlements
  const filteredCustomers = customers.filter(c => 
    !searchTerm ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.bidderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Batch Process Credit Cards
  const handleBatchProcessCC = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessingBatch(true);
    await auctionService.batchProcessCreditCards(auction.id, selectedIds);
    // Reload
    const updated = await auctionService.getAuctionById(auction.id);
    if (updated) {
      dispatch({ type: 'SET_AUCTION', payload: updated });
      setCustomers(updated.settlements);
    }
    setIsProcessingBatch(false);
    setSelectedIds([]);
    alert(`Successfully processed batch credit card payments for selected accounts!`);
  };

  // Batch Shipments
  const handleBatchShipments = async () => {
    if (selectedIds.length === 0) {
      alert('Please select settlements to mark as shipped.');
      return;
    }
    setIsProcessingBatch(true);
    for (const cid of selectedIds) {
      await auctionService.markAllShipped(auction.id, cid);
    }
    const updated = await auctionService.getAuctionById(auction.id);
    if (updated) {
      dispatch({ type: 'SET_AUCTION', payload: updated });
      setCustomers(updated.settlements);
    }
    setIsProcessingBatch(false);
    alert(`Marked all items as shipped for ${selectedIds.length} settlement account(s).`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
      {/* Loading Overlay */}
      {isProcessingBatch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '24px 32px',
            borderRadius: 10,
            boxShadow: 'var(--shadow-modal)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <RefreshCw size={28} className="animate-spin" color="var(--gold-primary)" />
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
              Processing Batch Card Transactions...
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Connecting to payment gateway & HiBid API
            </div>
          </div>
        </div>
      )}

      {/* Top Action Header Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
            Consolidated Settlement Console
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Consolidated invoice reconciliation for buyers and house consignors
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBatchShipments}
          >
            <PackageCheck size={15} />
            <span>Batch Shipments</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>Print / Email</span>
          </button>
        </div>
      </div>

      {/* Main Consolidated Settlement View Card */}
      <div className="syndication-card">
        {/* Controls Bar: Batch Process, Deselect chip, Search, Total Settlements counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleBatchProcessCC}
              disabled={selectedIds.length === 0}
              style={{ padding: '7px 14px', fontSize: 12.5 }}
            >
              <CreditCard size={15} />
              <span>Batch Process Credit Cards</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <span>Deselect {selectedIds.length} Settlements</span>
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="catalog-search-wrapper" style={{ maxWidth: 260 }}>
              <Search size={15} className="catalog-search-icon" />
              <input 
                type="text"
                placeholder="Search settlements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="catalog-search-input"
              />
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              Total Settlements: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{filteredCustomers.length}</strong>
            </div>
          </div>
        </div>

        {/* Consolidated Settlement Table */}
        <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
          <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>
                  <input 
                    type="checkbox"
                    className="catalog-checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all settlements"
                  />
                </th>
                <th style={{ width: 90 }}>BIDDER#</th>
                <th style={{ minWidth: 180 }}>NAME</th>
                <th style={{ width: 110, textAlign: 'center' }}>CASH BUYER</th>
                <th style={{ width: 90, textAlign: 'center' }}>LOT COUNT</th>
                <th style={{ width: 140, textAlign: 'center' }}>SHIPPED / PICKED UP</th>
                <th style={{ width: 120, textAlign: 'right' }}>BALANCE</th>
                <th style={{ minWidth: 170 }}>INVOICE NUMBER/STATUS</th>
                <th style={{ width: 130, textAlign: 'center' }}>SHIPPING REQ</th>
                <th style={{ width: 160, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => {
                const isSelected = selectedIds.includes(customer.id);
                return (
                  <tr 
                    key={customer.id}
                    style={{ background: isSelected ? '#fbf8f2' : undefined }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        className="catalog-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(customer.id)}
                        aria-label={`Select ${customer.name}`}
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: customer.isSeller ? 'var(--gold-dark)' : 'var(--text-main)' }}>
                      #{customer.bidderNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {customer.name}
                      </div>
                      {customer.isSeller && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4 }}>
                          House Consignor
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={customer.isCashBuyer}
                        onChange={async (e) => {
                          customer.isCashBuyer = e.target.checked;
                          await auctionService.saveSettlementCustomer(auction.id, customer);
                          setCustomers([...customers]);
                        }}
                        title="Cash buyer status"
                      />
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {customer.lotCount}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        fontSize: 11.5,
                        background: customer.shippedCount > 0 ? '#ecfdf5' : '#f8fafc',
                        color: customer.shippedCount > 0 ? '#059669' : 'var(--text-muted)'
                      }}>
                        {customer.shippedCount} of {customer.totalLotsCount || customer.lotCount || 1}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: customer.balance > 0 ? '#dc2626' : '#059669' }}>
                      {formatCurrency(customer.balance)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ExternalLink size={13} color="var(--gold-primary)" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{customer.invoiceNumber}</span>
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 600, 
                          color: customer.invoiceStatus === 'Paid' ? '#059669' : '#d97706',
                          background: customer.invoiceStatus === 'Paid' ? '#dcfce7' : '#fef3c7',
                          padding: '1px 6px',
                          borderRadius: 4
                        }}>
                          {customer.invoiceStatus}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 600,
                        background: customer.shippingRequested ? '#eff6ff' : '#f1f5f9',
                        color: customer.shippingRequested ? '#1d4ed8' : '#64748b'
                      }}>
                        {customer.shippingRequested ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onSelectCustomer(customer.id)}
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          title="View customer settlement"
                        >
                          View Settlement
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => window.print()}
                          title="Print Settlement"
                          style={{ width: 28, height: 28 }}
                        >
                          <Printer size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => alert(`Emailing invoice #${customer.invoiceNumber} to ${customer.name}...`)}
                          title="Email Settlement"
                          style={{ width: 28, height: 28 }}
                        >
                          <Mail size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-dim)' }}>
                    No settlements match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
