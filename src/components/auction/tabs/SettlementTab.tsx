import React, { useState, useEffect, useMemo } from 'react';
import { useAuctionDetail } from '../../../context/AuctionDetailContext';
import { SettlementCustomer } from '../../../types/auctionDetail';
import { auctionService } from '../../../services/auctionService';
import { settlementService } from '../../../services/settlementService';
import { SettlementCustomerDetail } from './SettlementCustomerDetail';
import { TableRowActionMenu } from '../../Common/TableRowActionMenu';
import { ShadcnPagination } from '../../ui/ShadcnPagination';
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
  CheckCircle2,
  Settings,
  Scale
} from 'lucide-react';
import { EmailSettlementModal } from '../../Common/EmailSettlementModal';
import { SelectColumnsModal, ColumnItem } from '../SelectColumnsModal';
import { formatCurrency } from '../../../utils/formatters';

interface SettlementTabProps {
  selectedCustomerId?: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  onOpenBatchShipments?: () => void;
  onOpenUpdateInvoices?: () => void;
  onOpenPrintEmail?: () => void;
}

export const SettlementTab: React.FC<SettlementTabProps> = ({
  selectedCustomerId,
  onSelectCustomer,
  onOpenBatchShipments,
  onOpenUpdateInvoices,
  onOpenPrintEmail
}) => {
  const { state, dispatch } = useAuctionDetail();
  const auction = state.data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [customers, setCustomers] = useState<SettlementCustomer[]>([]);
  const [emailModalCustomer, setEmailModalCustomer] = useState<SettlementCustomer | null>(null);

  // Column config modal state & preferences
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

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnItem[]>(() => {
    try {
      const saved = localStorage.getItem('af360_bidder_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) { }
    return DEFAULT_BIDDER_COLUMNS;
  });

  const isColVisible = (key: string) => {
    const col = columns.find(c => c.key === key);
    return col ? col.visible : true;
  };

  // Pagination state (Default 20 as requested)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(false);

  const loadSettlements = React.useCallback(async () => {
    if (!auction?.id) return;
    setIsLoading(true);
    try {
      const liveSettlements = await settlementService.getBidderSettlements(auction.id);
      if (liveSettlements && liveSettlements.length > 0) {
        setCustomers(liveSettlements);
      } else if (auction?.settlements && auction.settlements.length > 0) {
        setCustomers(auction.settlements);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.warn('[SettlementTab] Error loading settlements from Supabase:', err);
      if (auction?.settlements) {
        setCustomers(auction.settlements);
      }
    } finally {
      setIsLoading(false);
    }
  }, [auction?.id, auction?.settlements]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  if (!auction) return null;

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  // If a customer is selected, show SettlementCustomerDetail
  if (activeCustomer) {
    return (
      <SettlementCustomerDetail
        auctionId={auction.id}
        customer={activeCustomer}
        onBack={() => {
          onSelectCustomer(null);
          loadSettlements();
        }}
        onRefresh={async () => {
          await loadSettlements();
          const updated = await auctionService.getAuctionById(auction.id);
          if (updated) {
            dispatch({ type: 'SET_AUCTION', payload: updated });
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

  // Paginated items
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
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
    await settlementService.batchProcessCreditCards(auction.id, selectedIds);
    // Reload
    const updated = await auctionService.getAuctionById(auction.id);
    if (updated) {
      dispatch({ type: 'SET_AUCTION', payload: updated });
      setCustomers(updated.settlements);
    }
    setIsProcessingBatch(false);
    setSelectedIds([]);
  };

  // Batch Shipments
  const handleBatchShipments = async () => {
    if (onOpenBatchShipments) {
      onOpenBatchShipments();
      return;
    }
    if (selectedIds.length === 0) {
      alert('Please select settlements to mark as shipped.');
      return;
    }
    setIsProcessingBatch(true);
    await settlementService.markBatchShipped(auction.id, selectedIds);
    const updated = await auctionService.getAuctionById(auction.id);
    if (updated) {
      dispatch({ type: 'SET_AUCTION', payload: updated });
      setCustomers(updated.settlements);
    }
    setIsProcessingBatch(false);
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
              Processing Batch Transactions...
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Updating settlement records in Supabase
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
              onClick={() => onOpenPrintEmail ? onOpenPrintEmail() : window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', fontSize: 12.5, fontWeight: 600 }}
            >
              <Printer size={15} />
              <span>Print / Email</span>
            </button>
          </div>
        </div>

        {/* Controls Bar: Batch Process, Deselect chip, Search with gear, Total Settlements counter */}
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
            <div className="catalog-search-wrapper" style={{ maxWidth: 320, minWidth: 240, position: 'relative' }}>
              <Search size={15} className="catalog-search-icon" />
              <input
                type="text"
                placeholder="Search settlements by bidder, name, invoice..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="catalog-search-input"
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                title="Configure Columns"
                onClick={() => setIsColumnModalOpen(true)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Total Settlements: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{filteredCustomers.length}</strong>
              </div>
              <button
                type="button"
                title="Refresh settlements from Supabase"
                onClick={loadSettlements}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  cursor: 'pointer',
                  padding: '3px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)'
                }}
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
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
                {isColVisible('bidderNumber') && <th style={{ width: 95 }}>BIDDER#</th>}
                {isColVisible('customerCode') && <th style={{ width: 110 }}>CUSTOMER CODE</th>}
                {isColVisible('name') && <th style={{ minWidth: 190 }}>NAME</th>}
                {isColVisible('cashBuyer') && <th style={{ width: 110, textAlign: 'center' }}>CASH BUYER</th>}
                {isColVisible('lotCount') && <th style={{ width: 95, textAlign: 'center' }}>LOT COUNT</th>}
                {isColVisible('shippedCount') && <th style={{ width: 150, textAlign: 'center' }}>SHIPPED / PICKED UP</th>}
                {isColVisible('balance') && <th style={{ width: 125, textAlign: 'right' }}>BALANCE</th>}
                {isColVisible('invoiceNumber') && <th style={{ minWidth: 190 }}>INVOICE NUMBER/STATUS</th>}
                {isColVisible('shippingRequested') && <th style={{ width: 130, textAlign: 'center' }}>SHIPPING REQ</th>}
                <th style={{ width: 70, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map(customer => {
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
                    {isColVisible('bidderNumber') && (
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: customer.isSeller ? 'var(--gold-dark)' : 'var(--text-main)' }}>
                        #{customer.bidderNumber}
                      </td>
                    )}
                    {isColVisible('customerCode') && (
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                        {(customer as any).customerCode || `CC-${customer.bidderNumber}`}
                      </td>
                    )}
                    {isColVisible('name') && (
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
                    )}
                    {isColVisible('cashBuyer') && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="catalog-checkbox"
                          checked={customer.isCashBuyer}
                          onChange={async (e) => {
                            const updatedVal = e.target.checked;
                            customer.isCashBuyer = updatedVal;
                            await settlementService.updateCashBuyer(auction.id, customer.id, updatedVal);
                            setCustomers([...customers]);
                          }}
                          title="Cash buyer status"
                        />
                      </td>
                    )}
                    {isColVisible('lotCount') && (
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {customer.lotCount}
                      </td>
                    )}
                    {isColVisible('shippedCount') && (
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-shipped-pill ${customer.shippedCount > 0 ? 'complete' : 'zero'}`}>
                          {customer.shippedCount} of {customer.totalLotsCount || customer.lotCount || 1}
                        </span>
                      </td>
                    )}
                    {isColVisible('balance') && (
                      <td style={{
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: customer.balance > 0 ? '#dc2626' : '#059669'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 13.5 }}>
                            {formatCurrency(customer.balance)}
                          </span>
                          {customer.depositApplied && customer.depositApplied > 0 && customer.balance === 0 ? (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: '#ecfdf5',
                              color: '#059669',
                              letterSpacing: '0.02em'
                            }}>
                              PAID (DEPOSIT)
                            </span>
                          ) : customer.balance > 0 ? (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: '#fef2f2',
                              color: '#dc2626',
                              letterSpacing: '0.02em'
                            }}>
                              DUE
                            </span>
                          ) : null}
                        </div>
                      </td>
                    )}
                    {isColVisible('invoiceNumber') && (
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
                    )}
                    {isColVisible('shippingRequested') && (
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-shipping-req ${customer.shippingRequested ? 'yes' : 'no'}`}>
                          {customer.shippingRequested ? 'Yes' : 'No'}
                        </span>
                      </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActionMenu
                        ariaLabel={`Actions for ${customer.name}`}
                        actions={[
                          {
                            label: 'View Settlement',
                            icon: Scale,
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
                            onClick: () => setEmailModalCustomer(customer)
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
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls matching requirements */}
        {filteredCustomers.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <ShadcnPagination
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              itemLabel="settlements"
            />
          </div>
        )}
      </div>

      <EmailSettlementModal
        isOpen={!!emailModalCustomer}
        onClose={() => setEmailModalCustomer(null)}
        customer={emailModalCustomer}
        auctionTitle={auction?.name || 'Premier Collector Auction'}
        auctionCode={auction?.code || auction?.id}
      />

      <SelectColumnsModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columns={columns}
        onSave={(updated) => {
          setColumns(updated);
          try {
            localStorage.setItem('af360_bidder_columns', JSON.stringify(updated));
          } catch (_) { }
        }}
      />
    </div>
  );
};
