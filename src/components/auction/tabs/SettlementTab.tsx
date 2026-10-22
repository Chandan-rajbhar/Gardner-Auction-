import React, { useState, useEffect } from 'react';
import { useAuctionDetail } from '../../../context/AuctionDetailContext';
import { SettlementCustomer } from '../../../types/auctionDetail';
import { auctionService } from '../../../services/auctionService';
import { SettlementCustomerDetail } from './SettlementCustomerDetail';
import { TableRowActionMenu } from '../../Common/TableRowActionMenu';
import { 
  PackageCheck, 
  Printer, 
  Mail, 
  CreditCard, 
  Search, 
  X, 
  ExternalLink, 
  RefreshCw,
  FileText,
  Eye,
  CheckCircle2
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      {/* Loading Overlay */}
      {isProcessingBatch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '24px 32px',
            borderRadius: 12,
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

      {/* Main Consolidated Settlement View Card */}
      <div className="syndication-card">
        {/* Top Action Header */}
        <div className="settlement-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="font-serif" style={{ fontSize: 18, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
              Consolidated Settlement Console
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              Consolidated invoice reconciliation for buyers and house consignors
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleBatchShipments}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', fontSize: 12.5, fontWeight: 600 }}
            >
              <PackageCheck size={15} />
              <span>Batch Shipments</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', fontSize: 12.5, fontWeight: 600 }}
            >
              <Printer size={15} />
              <span>Print / Email</span>
            </button>
          </div>
        </div>

        {/* Controls Bar: Batch Process, Deselect chip, Search, Total Settlements counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-batch-dark"
              onClick={handleBatchProcessCC}
              disabled={selectedIds.length === 0}
            >
              <CreditCard size={15} color="var(--gold-primary)" />
              <span>Batch Process Credit Cards</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                className="btn-deselect-pill"
                onClick={() => setSelectedIds([])}
              >
                <span>Deselect {selectedIds.length} Settlements</span>
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div className="catalog-search-wrapper" style={{ maxWidth: 280, minWidth: 200 }}>
              <Search size={15} className="catalog-search-icon" />
              <input 
                type="text"
                placeholder="Search settlements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="catalog-search-input"
              />
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Total Settlements: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{filteredCustomers.length}</strong>
            </div>
          </div>
        </div>

        {/* Consolidated Settlement Table */}
        <div className="settlement-table-scroll">
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
                <th style={{ width: 95 }}>BIDDER#</th>
                <th style={{ minWidth: 190 }}>NAME</th>
                <th style={{ width: 110, textAlign: 'center' }}>CASH BUYER</th>
                <th style={{ width: 95, textAlign: 'center' }}>LOT COUNT</th>
                <th style={{ width: 150, textAlign: 'center' }}>SHIPPED / PICKED UP</th>
                <th style={{ width: 125, textAlign: 'right' }}>BALANCE</th>
                <th style={{ minWidth: 190 }}>INVOICE NUMBER/STATUS</th>
                <th style={{ width: 130, textAlign: 'center' }}>SHIPPING REQ</th>
                <th style={{ width: 70, textAlign: 'center' }}>ACTIONS</th>
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
                        <span className="badge-house-consignor">
                          House Consignor
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        className="catalog-checkbox"
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
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-shipped-pill ${customer.shippedCount > 0 ? 'complete' : 'zero'}`}>
                        {customer.shippedCount} of {customer.totalLotsCount || customer.lotCount || 1}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: customer.balance > 0 ? '#dc2626' : '#059669' }}>
                      {formatCurrency(customer.balance)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(customer.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: 'inherit',
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                          title="View customer invoice details"
                        >
                          <ExternalLink size={13} color="var(--gold-primary)" />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-main)', fontWeight: 500 }}>
                            {customer.invoiceNumber}
                          </span>
                        </button>
                        <span className={`badge-invoice-status ${customer.invoiceStatus === 'Paid' ? 'paid' : 'pending'}`}>
                          {customer.invoiceStatus}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-shipping-req ${customer.shippingRequested ? 'yes' : 'no'}`}>
                        {customer.shippingRequested ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActionMenu
                        ariaLabel={`Actions for ${customer.name}`}
                        actions={[
                          {
                            label: 'View Settlement',
                            icon: Eye,
                            onClick: () => onSelectCustomer(customer.id)
                          },
                          {
                            label: 'Print Settlement',
                            icon: Printer,
                            onClick: () => window.print()
                          },
                          {
                            label: 'Email Settlement',
                            icon: Mail,
                            onClick: () => alert(`Emailing settlement invoice #${customer.invoiceNumber} to ${customer.name}...`)
                          },
                          {
                            label: 'Mark as Shipped',
                            icon: PackageCheck,
                            disabled: customer.shippedCount >= (customer.totalLotsCount || customer.lotCount || 1),
                            onClick: async () => {
                              setIsProcessingBatch(true);
                              await auctionService.markAllShipped(auction.id, customer.id);
                              const updated = await auctionService.getAuctionById(auction.id);
                              if (updated) {
                                dispatch({ type: 'SET_AUCTION', payload: updated });
                                setCustomers(updated.settlements);
                              }
                              setIsProcessingBatch(false);
                            }
                          }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-dim)' }}>
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

