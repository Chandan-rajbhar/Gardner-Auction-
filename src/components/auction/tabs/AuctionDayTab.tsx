import React, { useState } from 'react';
import { useAuctionDetail } from '../../../context/AuctionDetailContext';
import { AuctionDaySubTab, BidderRegistration, AuctionLotStat, AlternateBid } from '../../../types/auctionDetail';
import { StatCard } from '../../Common/StatCard';
import { DataTable, ColumnDef } from '../../Common/DataTable';
import { StatusPill } from '../../Common/StatusPill';
import { FormModal } from '../../Common/FormModal';
import { FormField } from '../../Common/FormField';
import { auctionService } from '../../../services/auctionService';
import { 
  ExternalLink, 
  CheckCircle, 
  RotateCcw, 
  Plus, 
  Gavel, 
  Radio, 
  SlidersHorizontal, 
  RefreshCw,
  Search,
  Check,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface AuctionDayTabProps {
  currentTab: AuctionDaySubTab;
  onSelectTab: (tab: AuctionDaySubTab) => void;
  onNavigateClerking: () => void;
}

export const AuctionDayTab: React.FC<AuctionDayTabProps> = ({
  currentTab,
  onSelectTab,
  onNavigateClerking
}) => {
  const { state, dispatch } = useAuctionDetail();
  const auction = state.data;

  // Sub-sub-tab in Dashboard
  const [dashboardBottomTab, setDashboardBottomTab] = useState<'details' | 'registrations' | 'lot-stats'>('details');

  // Alternate Bid Modal
  const [isAltBidModalOpen, setIsAltBidModalOpen] = useState(false);
  const [altLotNum, setAltLotNum] = useState('');
  const [altBidderName, setAltBidderName] = useState('');
  const [altPaddle, setAltPaddle] = useState('');
  const [altType, setAltType] = useState<'Phone' | 'Absentee' | 'Floor'>('Phone');
  const [altAmount, setAltAmount] = useState('');
  const [altMaxAmount, setAltMaxAmount] = useState('');
  const [altNotes, setAltNotes] = useState('');

  // Check In search
  const [checkInSearch, setCheckInSearch] = useState('');

  if (!auction) return null;
  const dayStats = auction.dayStats;

  // Calculate Site Stats Total Row
  const totalSiteStats = dayStats.siteStats.reduce(
    (acc, curr) => ({
      site: 'Total',
      registrations: acc.registrations + curr.registrations,
      ccAuths: acc.ccAuths + curr.ccAuths,
      views: acc.views + curr.views,
      uniqueBidders: acc.uniqueBidders + curr.uniqueBidders,
      uniqueBids: acc.uniqueBids + curr.uniqueBids,
      totalBids: acc.totalBids + curr.totalBids,
      highBid: acc.highBid + curr.highBid,
      maxBid: acc.maxBid + curr.maxBid
    }),
    {
      site: 'Total',
      registrations: 0,
      ccAuths: 0,
      views: 0,
      uniqueBidders: 0,
      uniqueBids: 0,
      totalBids: 0,
      highBid: 0,
      maxBid: 0
    }
  );

  // Check-in toggle handler
  const handleToggleCheckIn = async (regId: string, currentVal: boolean) => {
    await auctionService.checkInBidder(auction.id, regId, !currentVal);
    // Reload local auction state
    const updated = await auctionService.getAuctionById(auction.id);
    if (updated) {
      dispatch({ type: 'SET_AUCTION', payload: updated });
    }
  };

  // Add Alternate Bid Handler
  const handleAddAlternateBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!altLotNum || !altBidderName || !altAmount) return;

    const newBid: AlternateBid = {
      id: `alt-${Date.now()}`,
      lotNumber: parseInt(altLotNum) || 1,
      bidderName: altBidderName,
      paddleNumber: altPaddle || `${Math.floor(3000 + Math.random() * 999)}`,
      bidType: altType,
      amount: parseFloat(altAmount) || 0,
      maxAmount: parseFloat(altMaxAmount) || parseFloat(altAmount) || 0,
      notes: altNotes || 'Order bid recorded on rostrum.',
      status: 'Active'
    };

    const updated = {
      ...auction,
      dayStats: {
        ...auction.dayStats,
        alternateBids: [newBid, ...auction.dayStats.alternateBids]
      }
    };

    dispatch({ type: 'SET_AUCTION', payload: updated });
    auctionService.saveAuction(updated);

    setIsAltBidModalOpen(false);
    setAltLotNum('');
    setAltBidderName('');
    setAltPaddle('');
    setAltAmount('');
    setAltMaxAmount('');
    setAltNotes('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Sub-tabs bar matching existing tab style */}
      <div className="af360-tabs" style={{ marginBottom: 4 }}>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'check-in' ? 'active' : ''}`}
          onClick={() => onSelectTab('check-in')}
        >
          Check In ({dayStats.checkInCount})
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'clerking' ? 'active' : ''}`}
          onClick={() => onSelectTab('clerking')}
        >
          Clerking
        </button>
        <button 
          type="button" 
          className={`af360-tab ${currentTab === 'alternate-bids' ? 'active' : ''}`}
          onClick={() => onSelectTab('alternate-bids')}
        >
          Alternate Bids ({dayStats.alternateBids.length})
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: DASHBOARD
          ========================================================================= */}
      {currentTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 2x4 grid of stat cards in existing style */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatCard label="Lot Count" value={dayStats.lotCount} subtext="Catalogued lots" />
            <StatCard label="Check In Count" value={dayStats.checkInCount} valueColor="#0284c7" subtext="Approved bidders" />
            <StatCard label="Unique Sellers" value={dayStats.uniqueSellers} subtext="Consignor trusts" />
            <StatCard 
              label="HiBid Network" 
              value="View on HiBid" 
              isLink={true} 
              linkUrl={dayStats.hibidUrl}
              linkText="HiBid - View on HiBid"
              subtext="Live syndication portal"
            />
            <StatCard label="Presale Estimate Min" value={formatCurrency(dayStats.presaleMin)} subtext="Reserve aggregate" />
            <StatCard label="Presale Estimate Max" value={formatCurrency(dayStats.presaleMax)} valueColor="var(--gold-bright)" subtext="Catalog valuation" />
            <StatCard label="Avg Estimate Per Lot" value={formatCurrency(dayStats.avgEstimate)} subtext="Per catalog item" />
            <StatCard label="Avg Sales Price" value={formatCurrency(dayStats.avgSalesPrice)} valueColor="#059669" subtext="Realized average" />
          </div>

          {/* Site stats table */}
          <div className="syndication-card">
            <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
              HiBid Multi-Portal Syndication Statistics
            </h3>

            <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <table className="catalog-luxury-table" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: 220 }}>SITE</th>
                    <th style={{ textAlign: 'right', width: 100 }}>REGISTRATIONS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>CC AUTHS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>VIEWS</th>
                    <th style={{ textAlign: 'right', width: 110 }}>UNIQUE BIDDERS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>UNIQUE BIDS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>TOTAL BIDS</th>
                    <th style={{ textAlign: 'right', width: 110 }}>HIGH BID</th>
                    <th style={{ textAlign: 'right', width: 110 }}>MAX BID</th>
                  </tr>
                </thead>
                <tbody>
                  {dayStats.siteStats.map((site) => (
                    <tr key={site.site}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        <span style={{ color: '#0369a1' }}>{site.site}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.registrations}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.ccAuths}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.views.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.uniqueBidders}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.uniqueBids}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.totalBids}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--gold-dark)' }}>
                        {formatCurrency(site.highBid)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                        {formatCurrency(site.maxBid)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid var(--border-medium)' }}>
                    <td style={{ color: 'var(--text-main)' }}>Total ({dayStats.siteStats.length} Syndications)</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.registrations}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.ccAuths}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.views.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.uniqueBidders}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.uniqueBids}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.totalBids}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--gold-dark)' }}>
                      {formatCurrency(totalSiteStats.highBid)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                      {formatCurrency(totalSiteStats.maxBid)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tab group: Details | Registrations | Lot Stats */}
          <div className="syndication-card">
            <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setDashboardBottomTab('details')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: dashboardBottomTab === 'details' ? 'var(--gold-primary)' : 'transparent',
                  color: dashboardBottomTab === 'details' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setDashboardBottomTab('registrations')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: dashboardBottomTab === 'registrations' ? 'var(--gold-primary)' : 'transparent',
                  color: dashboardBottomTab === 'registrations' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Registrations ({dayStats.registrations.length})
              </button>
              <button
                type="button"
                onClick={() => setDashboardBottomTab('lot-stats')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: dashboardBottomTab === 'lot-stats' ? 'var(--gold-primary)' : 'transparent',
                  color: dashboardBottomTab === 'lot-stats' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Lot Stats ({dayStats.lotStats.length})
              </button>
            </div>

            {/* Sub-tab 1: Details */}
            {dashboardBottomTab === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Auction Information Card with green "In Progress" badge */}
                <div style={{ background: '#fcfbf9', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Auction Information</h4>
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: 700, 
                      background: '#dcfce7', 
                      color: '#15803d', 
                      padding: '2px 8px', 
                      borderRadius: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ● In Progress
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Auction Code</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{auction.code}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Name</span>
                      <strong>{auction.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Description</span>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{auction.description}</p>
                    </div>
                  </div>
                </div>

                {/* Dates & Location Card */}
                <div style={{ background: '#fcfbf9', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Dates & Location</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Active Dates</span>
                      <span>{formatDate(auction.startDate)} to {formatDate(auction.endDate)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Address</span>
                      <span>{auction.address1} {auction.address2 ? `• ${auction.address2}` : ''}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>City / State / Zip</span>
                      <span>{auction.city}, {auction.state} {auction.zip}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Country</span>
                      <span>{auction.country}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Registrations */}
            {dashboardBottomTab === 'registrations' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button 
                    type="button" 
                    className="btn btn-gold" 
                    style={{ fontSize: 12, padding: '5px 12px' }}
                    onClick={() => alert('Batch registered all verified online applicants for this session!')}
                  >
                    Batch Register
                  </button>
                </div>

                <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                  <table className="catalog-luxury-table" style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>BID CARD #</th>
                        <th style={{ minWidth: 160 }}>BIDDER</th>
                        <th style={{ width: 140 }}>HIBID REPUTATION</th>
                        <th style={{ width: 80, textAlign: 'center' }}>BID COUNT</th>
                        <th style={{ minWidth: 140 }}>PERMISSION</th>
                        <th style={{ width: 140 }}>DATE / TIME</th>
                        <th style={{ width: 160 }}>SITE</th>
                        <th style={{ width: 120, textAlign: 'center' }}>SHIPPING REQ</th>
                        <th style={{ minWidth: 160 }}>BIDDER NOTES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayStats.registrations.map(reg => (
                        <tr key={reg.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark)' }}>
                            #{reg.bidCardNumber}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{reg.bidderName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>@{reg.username}</div>
                          </td>
                          <td style={{ color: '#b45309', fontWeight: 600 }}>{reg.hibidReputation}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{reg.bidCount}</td>
                          <td style={{ color: '#047857', fontWeight: 600 }}>{reg.permissionText}</td>
                          <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{reg.dateTime}</td>
                          <td style={{ color: '#0284c7' }}>{reg.site}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              fontSize: 11, 
                              fontWeight: 600,
                              background: reg.shippingRequested ? '#eff6ff' : '#f1f5f9',
                              color: reg.shippingRequested ? '#1d4ed8' : '#64748b'
                            }}>
                              {reg.shippingRequested ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{reg.bidderNotes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab 3: Lot Stats (12+ mock coin lots with Time Left pill) */}
            {dashboardBottomTab === 'lot-stats' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Showing real-time catalog engagement across 12 featured coin lots
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-gold" 
                    style={{ fontSize: 12, padding: '5px 12px' }}
                    onClick={() => alert('Batch clerked all unchallenged lots!')}
                  >
                    Batch Clerk
                  </button>
                </div>

                <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                  <table className="catalog-luxury-table" style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>IMAGE</th>
                        <th style={{ width: 70 }}>LOT #</th>
                        <th style={{ minWidth: 260 }}>TITLE</th>
                        <th style={{ width: 120, textAlign: 'center' }}>TIME LEFT</th>
                        <th style={{ width: 110, textAlign: 'right' }}>HIGH BID</th>
                        <th style={{ width: 110, textAlign: 'right' }}>MAX BID</th>
                        <th style={{ width: 80, textAlign: 'center' }}>VIEWS</th>
                        <th style={{ width: 80, textAlign: 'center' }}>WATCHES</th>
                        <th style={{ width: 130, textAlign: 'center' }}>AF360 STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayStats.lotStats.map(lot => (
                        <tr key={lot.id}>
                          <td>
                            <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={lot.image} alt={lot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>#{lot.lotNumber}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lot.title}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              background: '#fef3c7', 
                              color: '#92400e', 
                              padding: '2px 8px', 
                              borderRadius: 12, 
                              fontSize: 11, 
                              fontWeight: 700, 
                              fontFamily: 'var(--font-mono)' 
                            }}>
                              {lot.timeLeft}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--gold-dark)' }}>
                            {formatCurrency(lot.highBid)}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {formatCurrency(lot.maxBid)}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{lot.views}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{lot.watches}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              fontSize: 11, 
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#475569'
                            }}>
                              {lot.af360Status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: CHECK IN
          ========================================================================= */}
      {currentTab === 'check-in' && (
        <div className="syndication-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Saleroom & Simulcast Bidder Check In
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Verify bidder paddle allocations and authorized credit limits on file
              </p>
            </div>

            <div className="catalog-search-wrapper" style={{ maxWidth: 300 }}>
              <Search size={15} className="catalog-search-icon" />
              <input 
                type="text" 
                placeholder="Search bidder, paddle #..."
                value={checkInSearch}
                onChange={(e) => setCheckInSearch(e.target.value)}
                className="catalog-search-input"
              />
            </div>
          </div>

          <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>PADDLE #</th>
                  <th style={{ minWidth: 180 }}>BIDDER NAME</th>
                  <th style={{ minWidth: 160 }}>ORIGIN SITE</th>
                  <th style={{ width: 120 }}>DATE / TIME</th>
                  <th style={{ width: 140, textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: 130, textAlign: 'center' }}>CHECK IN ACTION</th>
                </tr>
              </thead>
              <tbody>
                {dayStats.registrations
                  .filter(r => 
                    !checkInSearch ||
                    r.bidderName.toLowerCase().includes(checkInSearch.toLowerCase()) ||
                    r.bidCardNumber.includes(checkInSearch)
                  )
                  .map(reg => (
                    <tr key={reg.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark)' }}>
                        #{reg.bidCardNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{reg.bidderName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{reg.permissionText}</div>
                      </td>
                      <td style={{ color: '#0284c7', fontSize: 12 }}>{reg.site}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{reg.dateTime}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          padding: '3px 10px', 
                          borderRadius: 20, 
                          fontSize: 11.5, 
                          fontWeight: 700,
                          background: reg.isCheckedIn ? '#dcfce7' : '#fee2e2',
                          color: reg.isCheckedIn ? '#15803d' : '#b91c1c'
                        }}>
                          {reg.isCheckedIn ? 'Checked In' : 'Pending Entry'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          type="button"
                          onClick={() => handleToggleCheckIn(reg.id, reg.isCheckedIn)}
                          className={`btn ${reg.isCheckedIn ? 'btn-secondary' : 'btn-gold'}`}
                          style={{ fontSize: 12, padding: '5px 12px' }}
                        >
                          {reg.isCheckedIn ? 'Undo Check In' : 'Check In'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: CLERKING
          ========================================================================= */}
      {currentTab === 'clerking' && (
        <div className="syndication-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ 
            width: 56, 
            height: 56, 
            borderRadius: '50%', 
            background: 'var(--gold-gradient-soft)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--gold-primary)'
          }}>
            <Gavel size={28} />
          </div>

          <h3 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)', marginBottom: 8 }}>
            Live Rostrum Clerking Block
          </h3>
          <p style={{ maxWidth: 540, margin: '0 auto 24px', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Access the high-speed live rostrum block to execute floor knocks, absentee limit calculations, and real-time HiBid online bid synchronization for <strong>{auction.name}</strong>.
          </p>

          <button 
            type="button" 
            className="btn btn-gold"
            onClick={onNavigateClerking}
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            <Radio size={16} className="auction-radio-pulse" />
            <span>Launch Live Clerking Block Console</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: ALTERNATE BIDS
          ========================================================================= */}
      {currentTab === 'alternate-bids' && (
        <div className="syndication-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Alternate Bids (Phone / Absentee / Floor)
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Pre-recorded order bids, clerk phone instructions, and left books
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-gold"
              onClick={() => setIsAltBidModalOpen(true)}
            >
              <Plus size={15} />
              <span>+ Add Bid</span>
            </button>
          </div>

          <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>LOT #</th>
                  <th style={{ width: 120 }}>BID TYPE</th>
                  <th style={{ minWidth: 160 }}>BIDDER</th>
                  <th style={{ width: 90 }}>PADDLE #</th>
                  <th style={{ width: 120, textAlign: 'right' }}>START BID</th>
                  <th style={{ width: 120, textAlign: 'right' }}>MAX LIMIT</th>
                  <th style={{ minWidth: 200 }}>NOTES</th>
                  <th style={{ width: 100, textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {dayStats.alternateBids.map(bid => (
                  <tr key={bid.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>#{bid.lotNumber}</td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 700,
                        background: bid.bidType === 'Phone' ? '#eff6ff' : bid.bidType === 'Absentee' ? '#fef3c7' : '#f1f5f9',
                        color: bid.bidType === 'Phone' ? '#1d4ed8' : bid.bidType === 'Absentee' ? '#92400e' : '#334155'
                      }}>
                        {bid.bidType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{bid.bidderName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>#{bid.paddleNumber}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bid.amount)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark)' }}>
                      {formatCurrency(bid.maxAmount)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bid.notes}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#059669' }}>
                        {bid.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {dayStats.alternateBids.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                      No alternate phone or absentee bids recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Alternate Bid Modal */}
      <FormModal
        isOpen={isAltBidModalOpen}
        title="Record Alternate Order Bid"
        onClose={() => setIsAltBidModalOpen(false)}
        onSubmit={handleAddAlternateBid}
        submitLabel="Log Bid"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Lot Number *" required>
              <input 
                type="number"
                required
                placeholder="e.g. 1"
                value={altLotNum}
                onChange={(e) => setAltLotNum(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="Bid Type">
              <select 
                value={altType}
                onChange={(e) => setAltType(e.target.value as any)}
                className="catalog-filter-select"
                style={{ width: '100%', height: 36 }}
              >
                <option value="Phone">Phone</option>
                <option value="Absentee">Absentee</option>
                <option value="Floor">Floor</option>
              </select>
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <FormField label="Bidder Name *" required>
              <input 
                type="text"
                required
                placeholder="e.g. James Caldwell"
                value={altBidderName}
                onChange={(e) => setAltBidderName(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="Paddle #">
              <input 
                type="text"
                placeholder="e.g. 4005"
                value={altPaddle}
                onChange={(e) => setAltPaddle(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Opening Bid ($) *" required>
              <input 
                type="number"
                step="50"
                required
                placeholder="1000"
                value={altAmount}
                onChange={(e) => setAltAmount(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="Max Order Limit ($)">
              <input 
                type="number"
                step="50"
                placeholder="2500"
                value={altMaxAmount}
                onChange={(e) => setAltMaxAmount(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>

          <FormField label="Clerking Notes">
            <textarea 
              rows={2}
              placeholder="e.g. Phone line active with saleroom operator Todd Gardner."
              value={altNotes}
              onChange={(e) => setAltNotes(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
            />
          </FormField>
        </div>
      </FormModal>
    </div>
  );
};
