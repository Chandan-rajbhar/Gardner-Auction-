import React, { useState } from 'react';
import { 
  Auction, 
  LotItem, 
  UserBidder, 
  NavigationSection 
} from '../../types';
import { 
  formatCurrency, 
  formatNumber, 
  formatDate 
} from '../../utils/formatters';
import { 
  Layers, 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  DollarSign, 
  FileText, 
  Upload, 
  Gavel, 
  AlertCircle,
  ExternalLink,
  Shield,
  Activity
} from 'lucide-react';

interface OverviewViewProps {
  auction: Auction;
  lots: LotItem[];
  bidders: UserBidder[];
  onNavigate: (section: NavigationSection) => void;
  onSyncHiBid: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  auction,
  lots,
  bidders,
  onNavigate,
  onSyncHiBid
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'registrations' | 'lotStats'>('details');

  // Compute live aggregates
  const totalBids = auction.syndications.reduce((acc, s) => acc + s.totalBids, 0);
  const totalViews = auction.syndications.reduce((acc, s) => acc + s.views, 0);
  const totalRegs = auction.syndications.reduce((acc, s) => acc + s.registrations, 0);
  const totalCC = auction.syndications.reduce((acc, s) => acc + s.ccAuths, 0);
  const totalUniqueBidders = auction.syndications.reduce((acc, s) => acc + s.uniqueBidders, 0);
  const totalUniqueBids = auction.syndications.reduce((acc, s) => acc + s.uniqueBids, 0);
  const overallHighBid = Math.max(...auction.syndications.map(s => s.highBid), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Notice about mock data per user instruction */}
      <div className="mock-notice">
        <AlertCircle size={16} />
        <span>
          <strong>AF360 Demonstration Mode:</strong> Initial administrative interface populated with mock numismatic and auction data for client review. No real credit card or bank funds are processed.
        </span>
      </div>

      {/* Main AF360 Top Header Bar */}
      <div className="af360-header-card">
        <div className="af360-top-row">
          <div className="af360-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className={`badge badge-${auction.status}`}>
                {auction.status}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {auction.code}
              </span>
            </div>
            <h1>{auction.title}</h1>
            <p>
              Inspection & Preview: {formatDate(auction.startDate)} • Gavel Fall: {formatDate(auction.endDate)} • {auction.location}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              className="btn btn-secondary"
              onClick={() => onNavigate('users')}
            >
              <Users size={16} />
              <span>Bidders Registry ({bidders.length})</span>
            </button>
            <button 
              className="btn btn-gold"
              onClick={() => onNavigate('live_clerking')}
            >
              <Gavel size={16} />
              <span>Auction Day Clerking</span>
            </button>
            <button 
              className="btn btn-secondary"
              onClick={onSyncHiBid}
            >
              <Upload size={16} />
              <span>Upload to HiBid</span>
            </button>
          </div>
        </div>

        {/* 8 Primary AF360 Metric Cards directly matching BeautyOasisRx 8-card grid layout */}
        <div className="metrics-grid-af360">
          {/* 1: Lot Count */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">TOTAL LOTS</span>
              <div className="metric-icon-box emerald">
                <Layers size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val">{auction.lotCount}</div>
              <div className="metric-subtext">
                <span>{auction.lotCount - 14} active</span>
                <span>•</span>
                <span>14 on block</span>
              </div>
            </div>
          </div>

          {/* 2: Check In Count */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">TOTAL CHECK-INS</span>
              <div className="metric-icon-box blue">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val">{auction.checkInCount}</div>
              <div className="metric-subtext">
                <span>188 online</span>
                <span>•</span>
                <span>16 floor paddles</span>
              </div>
            </div>
          </div>

          {/* 3: Unique Sellers */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">UNIQUE CONSIGNORS</span>
              <div className="metric-icon-box purple">
                <Users size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val">{auction.uniqueSellers}</div>
              <div className="metric-subtext">
                <span>12 private collections</span>
              </div>
            </div>
          </div>

          {/* 4: HiBid AF360 Status */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">HIBID SYNDICATION</span>
              <div className="metric-icon-box gold">
                <Activity size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val" style={{ fontSize: 22, color: '#0284c7' }}>
                5 Nodes Live
              </div>
              <div className="metric-subtext">
                <span>Simulcast streaming active</span>
              </div>
            </div>
          </div>

          {/* 5: Presale Estimate Min */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">PRESALE ESTIMATE MIN</span>
              <div className="metric-icon-box amber">
                <ArrowDownCircle size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val">{formatCurrency(auction.presaleMin)}</div>
              <div className="metric-subtext">
                <span>Floor reserves secured</span>
              </div>
            </div>
          </div>

          {/* 6: Presale Estimate Max */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">PRESALE ESTIMATE MAX</span>
              <div className="metric-icon-box blue">
                <ArrowUpCircle size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val">{formatCurrency(auction.presaleMax)}</div>
              <div className="metric-subtext">
                <span>Top institutional bids</span>
              </div>
            </div>
          </div>

          {/* 7: Avg Estimate Per Lot */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">AVG ESTIMATE / LOT</span>
              <div className="metric-icon-box purple">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val">{formatCurrency(auction.avgEstimate)}</div>
              <div className="metric-subtext">
                <span>Median value $4,200.00</span>
              </div>
            </div>
          </div>

          {/* 8: High Bid / Current Hammer */}
          <div className="metric-card-af360">
            <div className="metric-card-top">
              <span className="metric-label">TOTAL HAMMER REALIZED</span>
              <div className="metric-icon-box emerald">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-val" style={{ color: '#059669' }}>
                {formatCurrency(overallHighBid)}
              </div>
              <div className="metric-subtext">
                <span>+14.2% over low estimate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Realization Analytics Chart Card (Matching the BeautyOasisRx Screenshot) */}
      <div className="revenue-card">
        <div className="revenue-card-header">
          <div className="revenue-title-group">
            <div className="revenue-icon-pill">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Auction Sales & Realization Overview
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Dynamic hammer price performance from catalog sessions, floor paddles, and syndicated HiBid orders
              </p>
            </div>
          </div>

          <div className="filter-pills-group">
            <button className="filter-pill">7 Days</button>
            <button className="filter-pill active">30 Days</button>
            <button className="filter-pill">12 Months</button>
          </div>
        </div>

        <div className="revenue-metrics-banner">
          <div className="revenue-stat-item">
            <span className="revenue-stat-label">LAST 30 DAYS TOTAL</span>
            <span className="revenue-stat-val">$1,081,116.00</span>
          </div>

          <div className="revenue-stat-item">
            <span className="revenue-stat-label">AVERAGE LOT RATE</span>
            <span className="revenue-stat-val" style={{ color: '#2563eb' }}>$7,662.03 <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/ lot</span></span>
          </div>

          <div className="revenue-stat-item">
            <span className="revenue-stat-label">PEAK LOT HAMMER</span>
            <span className="revenue-stat-val" style={{ color: '#059669' }}>$345,000.00</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ecfdf5', color: '#059669', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700, border: '1px solid #a7f3d0' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
            <span>Live AF360 HiBid Feed</span>
          </div>
        </div>

        {/* Visual Bar Chart matching the screenshot */}
        <div className="chart-container-sim">
          <div className="chart-bar-group">
            <div className="chart-bar" style={{ height: '14px', background: '#cbd5e1' }}>
              <span className="chart-bar-label">Session 1</span>
            </div>
          </div>

          <div className="chart-bar-group">
            <div className="chart-bar" style={{ height: '95px' }}>
              <span className="chart-bar-label">Session 2</span>
            </div>
          </div>

          <div className="chart-bar-group">
            <div className="chart-bar" style={{ height: '170px' }}>
              <span className="chart-bar-label">Session 3</span>
            </div>
          </div>

          <div className="chart-bar-group">
            <div className="chart-bar" style={{ height: '40px', background: '#93c5fd' }}>
              <span className="chart-bar-label">Session 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* AF360 Multi-Site Syndication Table (Direct Match to reference photo) */}
      <div className="syndication-card">
        <div className="card-header-flex">
          <div className="card-title-group">
            <h3>Multi-Site Syndication & Bidder Traffic (AF360 Portal Feed)</h3>
            <p>Real-time telemetry across HiBid syndication nodes and Gardner direct web saleroom</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => onNavigate('users')}
            >
              <Users size={14} />
              <span>View Registered Bidders ({bidders.length})</span>
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Site Node / URL</th>
                <th style={{ textAlign: 'right' }}>Registrations</th>
                <th style={{ textAlign: 'right' }}>CC Authorizations</th>
                <th style={{ textAlign: 'right' }}>Views</th>
                <th style={{ textAlign: 'right' }}>Unique Bidders</th>
                <th style={{ textAlign: 'right' }}>Unique Bids</th>
                <th style={{ textAlign: 'right' }}>Total Bids</th>
                <th style={{ textAlign: 'right' }}>High Bid</th>
                <th style={{ textAlign: 'right' }}>Max Bid</th>
              </tr>
            </thead>
            <tbody>
              {auction.syndications.map((siteItem, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: 'var(--gold-light)' }}>
                    {siteItem.site}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatNumber(siteItem.registrations)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatNumber(siteItem.ccAuths)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatNumber(siteItem.views)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatNumber(siteItem.uniqueBidders)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatNumber(siteItem.uniqueBids)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatNumber(siteItem.totalBids)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatCurrency(siteItem.highBid)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    {formatCurrency(siteItem.maxBid)}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumber(totalRegs)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumber(totalCC)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumber(totalViews)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumber(totalUniqueBidders)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumber(totalUniqueBids)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumber(totalBids)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--gold-bright)' }}>
                  {formatCurrency(overallHighBid)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Sub-Navigation Tabs matching AF360 (Details, Registrations, Lot Stats) */}
      <div className="syndication-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 20 }}>
          <div className="af360-tabs">
            <button 
              className={`af360-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Auction Information & BP
            </button>
            <button 
              className={`af360-tab ${activeTab === 'registrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('registrations')}
            >
              Recent Registrations & CC Status
            </button>
            <button 
              className={`af360-tab ${activeTab === 'lotStats' ? 'active' : ''}`}
              onClick={() => setActiveTab('lotStats')}
            >
              Catalog Summary & Estimates
            </button>
          </div>

          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            AF360 Record Ref: {auction.code}
          </span>
        </div>

        {activeTab === 'details' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Auction Code</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--gold-light)' }}>{auction.code}</p>
              </div>

              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Catalog Name</span>
                <p style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 600 }}>{auction.title}</p>
              </div>

              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Curator Description</span>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{auction.description}</p>
              </div>

              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Buyer's Premium Structure</span>
                <p style={{ fontSize: 13, color: 'var(--gold-bright)', fontWeight: 600 }}>
                  {auction.bpExplanation}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Physical Saleroom Address</span>
                <p style={{ fontSize: 14, color: 'var(--text-main)' }}>{auction.address}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{auction.cityStateZip}, {auction.country}</p>
              </div>

              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Terms & Conditions</span>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto', background: 'var(--bg-darkest)', padding: 10, borderRadius: 6 }}>
                  {auction.terms}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Tax Exemption Policy</span>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{auction.taxExemptInfo}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            <div className="table-wrapper">
              <table className="luxury-table">
                <thead>
                  <tr>
                    <th>Paddle #</th>
                    <th>Bidder Name</th>
                    <th>Origin Site</th>
                    <th>Credit Card</th>
                    <th>Bid Limit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bidders.slice(0, 5).map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-primary)' }}>
                        #{b.paddleNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{b.siteOrigin}</td>
                      <td>
                        {b.creditCardAuthorized ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <Shield size={12} /> Auth (••{b.cardLast4})
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontSize: 12 }}>Pending Auth</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(b.bidLimit)}</td>
                      <td>
                        <span className={`badge badge-${b.status === 'verified' || b.status === 'vip' ? 'live' : 'preview'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => onNavigate('users')}>
                View All {bidders.length} Registered Bidders →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'lotStats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-darkest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active On Block</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-bright)', marginTop: 4 }}>
                Lot #101
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>1907 Saint-Gaudens Double Eagle</div>
            </div>

            <div style={{ background: 'var(--bg-darkest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Highest Lot Estimate</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                $220,000.00
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Lot #104 (1796 Draped Bust Quarter Eagle)</div>
            </div>

            <div style={{ background: 'var(--bg-darkest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Consigned Value</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
                $2,009,724.00
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Representing 8 Consignor Estates</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
