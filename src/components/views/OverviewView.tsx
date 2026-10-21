import React, { useState } from 'react';
import {
  Auction,
  LotItem,
  UserBidder,
  LiveBid,
  InvoiceSettlement,
  ActivityLog,
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
  Upload,
  Gavel,
  AlertCircle,
  Radio,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  X,
  CreditCard,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import { AuctionAnalyticsChart } from './AuctionAnalyticsChart';

interface OverviewViewProps {
  auction: Auction;
  lots: LotItem[];
  bidders: UserBidder[];
  bids?: LiveBid[];
  invoices?: InvoiceSettlement[];
  logs?: ActivityLog[];
  onNavigate: (section: NavigationSection) => void;
  onSyncHiBid: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  auction,
  lots,
  bidders,
  bids = [],
  invoices = [],
  logs = [],
  onNavigate,
  onSyncHiBid
}) => {
  const [showDemoNotice, setShowDemoNotice] = useState(true);
  const [syndicationSearch, setSyndicationSearch] = useState('');
  const [activeInfoTab, setActiveInfoTab] = useState<'info' | 'bidders' | 'lotsSummary'>('info');
  const [copiedCode, setCopiedCode] = useState(false);

  // Compute live aggregates
  const totalBids = auction.syndications.reduce((acc, s) => acc + s.totalBids, 0);
  const totalViews = auction.syndications.reduce((acc, s) => acc + s.views, 0);
  const totalRegs = auction.syndications.reduce((acc, s) => acc + s.registrations, 0);
  const totalCC = auction.syndications.reduce((acc, s) => acc + s.ccAuths, 0);
  const totalUniqueBidders = auction.syndications.reduce((acc, s) => acc + s.uniqueBidders, 0);
  const totalUniqueBids = auction.syndications.reduce((acc, s) => acc + s.uniqueBids, 0);
  const overallHighBid = Math.max(...auction.syndications.map(s => s.highBid), 135000.00);

  // Filtered syndication sites
  const filteredSyndications = auction.syndications.filter(s =>
    s.site.toLowerCase().includes(syndicationSearch.toLowerCase())
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(auction.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="overview-page-container">
      {/* 1. Demonstration Mode Notice */}
      {showDemoNotice && (
        <div className="executive-demo-banner" role="alert">
          <div className="demo-banner-content">
            <span className="demo-banner-icon-wrap">
              <Info size={15} />
            </span>
            <span className="demo-banner-text">
              <strong>Demonstration Mode:</strong> Initial administrative interface populated with mock numismatic and auction data for client review. No real credit card or bank funds are processed.
            </span>
          </div>
          <button
            className="demo-banner-dismiss"
            onClick={() => setShowDemoNotice(false)}
            aria-label="Dismiss demonstration notice"
            title="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. Active Auction Overview Header */}
      <div className="auction-hero-card">
        <div className="auction-hero-main">
          {/* Status & Code Bar */}
          <div className="auction-hero-badges-row">
            <span className="hero-status-pill live">
              <span className="hero-live-indicator" />
              {auction.status.toUpperCase()}
            </span>
            <button
              className="hero-code-tag"
              onClick={handleCopyCode}
              title="Click to copy auction code"
            >
              <span>{auction.code}</span>
              {copiedCode && <span className="copy-confirm">Copied</span>}
            </button>
            <span className="hero-category-tag">
              {auction.category || 'Premier Numismatics & Horology'}
            </span>
          </div>

          {/* Auction Title */}
          <h1 className="auction-hero-title">
            {auction.title}
          </h1>

          {/* Metadata Row */}
          <div className="auction-hero-meta">
            <div className="meta-item">
              <Calendar size={14} className="meta-icon" />
              <span>Inspection & Preview: <strong>{formatDate(auction.startDate)}</strong></span>
            </div>
            <div className="meta-divider">•</div>
            <div className="meta-item">
              <Clock size={14} className="meta-icon" />
              <span>Gavel Fall: <strong>{formatDate(auction.endDate)}</strong></span>
            </div>
            <div className="meta-divider">•</div>
            <div className="meta-item">
              <MapPin size={14} className="meta-icon" />
              <span>{auction.location}</span>
            </div>
          </div>
        </div>

        {/* Operational Action Buttons */}
        <div className="auction-hero-actions">
          <button
            className="hero-action-btn secondary"
            onClick={() => onNavigate('users')}
          >
            <Users size={16} />
            <span>Bidders Registry ({bidders.length})</span>
          </button>

          <button
            className="hero-action-btn primary-gavel"
            onClick={() => onNavigate('live_clerking')}
          >
            <Gavel size={17} />
            <span>Auction Day Clerking</span>
          </button>

          <button
            className="hero-action-btn secondary"
            onClick={onSyncHiBid}
          >
            <Upload size={16} />
            <span>Upload to HiBid</span>
          </button>
        </div>
      </div>

      {/* 3. Modern KPI Cards (8 Metrics in Two Cohesive Rows) */}
      <div className="kpi-section">
        {/* Row 1 — Operational metrics */}
        <div className="kpi-grid">
          {/* Card 1: Total Lots */}
          <div className="executive-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">TOTAL LOTS</span>
              <div className="kpi-icon-pill gold-tint">
                <Layers size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number">{auction.lotCount}</div>
              <div className="kpi-supporting">
                <span className="highlight-dark">{auction.lotCount - 14} active</span>
                <span className="bullet-sep">•</span>
                <span>14 on block</span>
              </div>
            </div>
            <div className="kpi-accent-border gold" />
          </div>

          {/* Card 2: Total Check-Ins */}
          <div className="executive-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">TOTAL CHECK-INS</span>
              <div className="kpi-icon-pill blue-tint">
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number">{auction.checkInCount}</div>
              <div className="kpi-supporting">
                <span className="highlight-dark">188 online</span>
                <span className="bullet-sep">•</span>
                <span>16 floor paddles</span>
              </div>
            </div>
            <div className="kpi-accent-border blue" />
          </div>

          {/* Card 3: Unique Consignors */}
          <div className="executive-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">UNIQUE CONSIGNORS</span>
              <div className="kpi-icon-pill purple-tint">
                <Users size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number">{auction.uniqueSellers}</div>
              <div className="kpi-supporting">
                <span>12 private collections</span>
              </div>
            </div>
            <div className="kpi-accent-border purple" />
          </div>

          {/* Card 4: HiBid Syndication */}
          <div className="executive-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">HIBID SYNDICATION</span>
              <div className="kpi-icon-pill amber-tint">
                <Radio size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number text-val">5 Nodes Live</div>
              <div className="kpi-supporting">
                <span className="kpi-live-dot" />
                <span>Simulcast streaming active</span>
              </div>
            </div>
            <div className="kpi-accent-border amber" />
          </div>
        </div>

        {/* Row 2 — Financial metrics */}
        <div className="kpi-grid">
          {/* Card 5: Presale Estimate Min */}
          <div className="executive-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">PRESALE ESTIMATE MIN</span>
              <div className="kpi-icon-pill amber-tint">
                <ArrowDownCircle size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono">{formatCurrency(auction.presaleMin)}</div>
              <div className="kpi-supporting">
                <span>Floor reserves secured</span>
              </div>
            </div>
            <div className="kpi-accent-border amber" />
          </div>

          {/* Card 6: Presale Estimate Max */}
          <div className="executive-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">PRESALE ESTIMATE MAX</span>
              <div className="kpi-icon-pill blue-tint">
                <ArrowUpCircle size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono">{formatCurrency(auction.presaleMax)}</div>
              <div className="kpi-supporting">
                <span>Top institutional bids</span>
              </div>
            </div>
            <div className="kpi-accent-border blue" />
          </div>

          {/* Card 7: Avg Estimate / Lot */}
          <div className="executive-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">AVG ESTIMATE / LOT</span>
              <div className="kpi-icon-pill purple-tint">
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono">{formatCurrency(auction.avgEstimate)}</div>
              <div className="kpi-supporting">
                <span>Median value $4,200.00</span>
              </div>
            </div>
            <div className="kpi-accent-border purple" />
          </div>

          {/* Card 8: Total Hammer Realized */}
          <div className="executive-kpi-card financial-highlight">
            <div className="kpi-card-header">
              <span className="kpi-label">TOTAL HAMMER REALIZED</span>
              <div className="kpi-icon-pill emerald-tint">
                <DollarSign size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono emerald-text">
                {formatCurrency(overallHighBid)}
              </div>
              <div className="kpi-supporting">
                <span className="kpi-trend-badge emerald">+14.2% over low estimate</span>
              </div>
            </div>
            <div className="kpi-accent-border emerald" />
          </div>
        </div>
      </div>

      {/* 4. Advanced Auction Analytics and Live Charts (Visual Centerpiece) */}
      <AuctionAnalyticsChart />

      {/* 5. Operational Workbench (Live Rostrum Activity & Settlement Exceptions) */}
      <div className="operational-workbench-grid">
        {/* Left: Live Clerking & Bids Stream */}
        <div className="workbench-card">
          <div className="workbench-card-header">
            <div className="workbench-title-group">
              <div className="workbench-icon-pill gold">
                <Gavel size={16} />
              </div>
              <div>
                <h4>Live Clerking & Floor Bids Stream</h4>
                <p>Real-time bids accepted by rostrum auctioneer across all streams</p>
              </div>
            </div>

          </div>

          <div className="live-bids-feed-list">
            {bids.slice(0, 4).map((b) => (
              <div key={b.id} className="live-bid-row">
                <div className="bid-row-left">
                  <span className="bid-lot-badge">Lot #{b.lotNumber}</span>
                  <div className="bid-paddle-info">
                    <span className="bid-paddle">Paddle #{b.paddleNumber}</span>
                    <span className="bid-name truncate">{b.bidderName}</span>
                  </div>
                </div>

                <div className="bid-row-middle">
                  <span className={`bid-source-pill ${b.source.toLowerCase().replace(/\s+/g, '-')}`}>
                    {b.source}
                  </span>
                  <span className="bid-time">{b.timestamp}</span>
                </div>

                <div className="bid-row-right">
                  <span className="bid-amount font-mono">{formatCurrency(b.amount)}</span>
                  {b.isWinning ? (
                    <span className="bid-winning-tag">High Bid</span>
                  ) : (
                    <span className="bid-outbid-tag">Outbid</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="workbench-footer-bar">
            <span className="footer-meta-text">
              Showing latest rostrum bids
            </span>
            <button
              className="workbench-action-link"
              onClick={() => onNavigate('live_clerking')}
            >
              Live Block
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right: Operational Flags & Settlement Exceptions */}
        <div className="workbench-card">
          <div className="workbench-card-header">
            <div className="workbench-title-group">
              <div className="workbench-icon-pill amber">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4>Settlement & Operational Exceptions</h4>
                <p>High-value pending wires and bidder verification authorizations</p>
              </div>
            </div>

          </div>

          <div className="operational-flags-list">
            {/* Flag 1: High Value Wire */}
            <div className="op-flag-item warning">
              <div className="op-flag-icon">
                <DollarSign size={16} />
              </div>
              <div className="op-flag-content">
                <div className="op-flag-title-row">
                  <span className="op-flag-title">Pending Wire Settlement</span>
                  <span className="op-flag-amount font-mono">$106,200.00</span>
                </div>
                <p className="op-flag-desc">
                  Invoice #INV-GA-2026-8841 (Paddle #104 Arthur Kensington) won Lot #100. Bank wire instructions transmitted.
                </p>
              </div>
            </div>

            {/* Flag 2: Verification Pending */}
            <div className="op-flag-item info">
              <div className="op-flag-icon">
                <CreditCard size={16} />
              </div>
              <div className="op-flag-content">
                <div className="op-flag-title-row">
                  <span className="op-flag-title">International Verification</span>
                  <span className="op-badge-pill">Requires ID</span>
                </div>
                <p className="op-flag-desc">
                  Julian Vance-Moreau (Geneva, CH) requested $50k bid limit. Awaiting passport copy verification.
                </p>
              </div>
            </div>

            {/* Flag 3: Reserve Met Clearance */}
            <div className="op-flag-item success">
              <div className="op-flag-icon">
                <ShieldCheck size={16} />
              </div>
              <div className="op-flag-content">
                <div className="op-flag-title-row">
                  <span className="op-flag-title">Consignor Reserve Clearance</span>
                  <span className="op-badge-pill green">100% Protected</span>
                </div>
                <p className="op-flag-desc">
                  All 8 private estate consignors have registered minimum reserves locked in the clerking system.
                </p>
              </div>
            </div>
          </div>

          <div className="workbench-footer-bar">
            <span className="footer-meta-text">
              Automated 15% wire / 18% credit card premium calculations active
            </span>
            <button
              className="workbench-action-link"
              onClick={() => onNavigate('payments')}
            >
              <span>All Invoices</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Multi-Site Syndication & Bidder Traffic Table */}
      <div className="syndication-section-card">
        <div className="syndication-header-row">
          <div className="syndication-title-block">
            <div className="syndication-icon-pill">
              <Radio size={17} />
            </div>
            <div>
              <h3>Multi-Site Syndication & Bidder Traffic</h3>
              <p>Real-time telemetry across HiBid network syndication nodes and Gardner direct web saleroom</p>
            </div>
          </div>

          <div className="syndication-actions">
            <div className="syndication-search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search syndication nodes..."
                value={syndicationSearch}
                onChange={(e) => setSyndicationSearch(e.target.value)}
              />
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('users')}
            >
              <Users size={14} />
              <span>Registered Bidders ({bidders.length})</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="syndication-table-container">
          <table className="executive-table">
            <thead>
              <tr>
                <th>Site Node / URL</th>
                <th>Node Status</th>
                <th className="align-right">Registrations</th>
                <th className="align-right">CC Authorizations</th>
                <th className="align-right">Views</th>
                <th className="align-right">Unique Bidders</th>
                <th className="align-right">Unique Bids</th>
                <th className="align-right">Total Bids</th>
                <th className="align-right">High Bid</th>
                <th className="align-right">Max Bid</th>
              </tr>
            </thead>
            <tbody>
              {filteredSyndications.map((siteItem, idx) => {
                const isDirect = siteItem.site.includes('gardner-auction.com');
                const isHiBidMain = siteItem.site === 'www.hibid.com';
                return (
                  <tr key={idx} className={isDirect ? 'highlight-row' : ''}>
                    <td className="node-name-cell">
                      <div className="node-name-wrap">
                        <span className="node-url">{siteItem.site}</span>
                        {isDirect && <span className="direct-badge">Host Saleroom</span>}
                        {isHiBidMain && <span className="hibid-main-badge">Primary HiBid</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`node-status-pill ${siteItem.views > 0 ? 'online' : 'standby'}`}>
                        <span className="status-dot-mini" />
                        {siteItem.views > 0 ? 'Online' : 'Standby'}
                      </span>
                    </td>
                    <td className="align-right font-mono">{formatNumber(siteItem.registrations)}</td>
                    <td className="align-right font-mono">
                      <span className="cc-auth-cell">
                        {formatNumber(siteItem.ccAuths)}
                        {siteItem.registrations > 0 && (
                          <span className="cc-pct">
                            ({Math.round((siteItem.ccAuths / siteItem.registrations) * 100)}%)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="align-right font-mono">{formatNumber(siteItem.views)}</td>
                    <td className="align-right font-mono">{formatNumber(siteItem.uniqueBidders)}</td>
                    <td className="align-right font-mono">{formatNumber(siteItem.uniqueBids)}</td>
                    <td className="align-right font-mono">{formatNumber(siteItem.totalBids)}</td>
                    <td className="align-right font-mono font-bold text-gold">
                      {formatCurrency(siteItem.highBid)}
                    </td>
                    <td className="align-right font-mono text-dim">
                      {formatCurrency(siteItem.maxBid)}
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              <tr className="executive-total-row">
                <td colSpan={2} className="total-label-cell">
                  <div className="total-label-wrap">
                    <strong>Syndication Network Total</strong>
                    <span className="total-node-count">{auction.syndications.length} Nodes</span>
                  </div>
                </td>
                <td className="align-right font-mono font-bold">{formatNumber(totalRegs)}</td>
                <td className="align-right font-mono font-bold">{formatNumber(totalCC)}</td>
                <td className="align-right font-mono font-bold">{formatNumber(totalViews)}</td>
                <td className="align-right font-mono font-bold">{formatNumber(totalUniqueBidders)}</td>
                <td className="align-right font-mono font-bold">{formatNumber(totalUniqueBids)}</td>
                <td className="align-right font-mono font-bold">{formatNumber(totalBids)}</td>
                <td className="align-right font-mono font-bold text-gold">
                  {formatCurrency(overallHighBid)}
                </td>
                <td className="align-right font-mono text-dim">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Bottom Information Sub-Navigation Tabs */}
      <div className="bottom-info-card">
        <div className="bottom-info-tabs-bar">
          <div className="info-tab-pills" role="tablist">
            <button
              className={`info-pill ${activeInfoTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('info')}
            >
              Auction Information & BP Structure
            </button>
            <button
              className={`info-pill ${activeInfoTab === 'bidders' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('bidders')}
            >
              Recent Registered Bidders ({bidders.length})
            </button>
            <button
              className={`info-pill ${activeInfoTab === 'lotsSummary' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('lotsSummary')}
            >
              Catalog & Consignor Reserves
            </button>
          </div>

          <span className="info-record-ref font-mono">
            Catalog Reference: {auction.code}
          </span>
        </div>

        {/* Tab 1: Details */}
        {activeInfoTab === 'info' && (
          <div className="info-tab-content-grid">
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Auction Code</span>
                <p className="info-value font-mono text-gold">{auction.code}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Catalog Title</span>
                <p className="info-value font-bold">{auction.title}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Curator Description</span>
                <p className="info-text">{auction.description}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Buyer's Premium Structure</span>
                <p className="info-value text-gold font-semibold">
                  {auction.bpExplanation}
                </p>
              </div>
            </div>

            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Physical Saleroom & Exhibition Address</span>
                <p className="info-value">{auction.address}</p>
                <p className="info-text">{auction.cityStateZip}, {auction.country}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Terms & Conditions of Sale</span>
                <div className="terms-scroll-box">
                  {auction.terms}
                </div>
              </div>

              <div className="info-item">
                <span className="info-label">Tax Exemption Policy</span>
                <p className="info-text">{auction.taxExemptInfo}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Recent Registrations */}
        {activeInfoTab === 'bidders' && (
          <div className="info-bidders-wrap">
            <table className="executive-table compact">
              <thead>
                <tr>
                  <th>Paddle #</th>
                  <th>Bidder Name</th>
                  <th>Origin Site</th>
                  <th>Credit Card Auth</th>
                  <th>Bid Limit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bidders.slice(0, 5).map(b => (
                  <tr key={b.id}>
                    <td className="font-mono font-bold text-gold">#{b.paddleNumber}</td>
                    <td className="font-semibold">{b.name}</td>
                    <td className="text-muted">{b.siteOrigin}</td>
                    <td>
                      {b.creditCardAuthorized ? (
                        <span className="badge-auth-yes">
                          <ShieldCheck size={13} /> Auth (••{b.cardLast4})
                        </span>
                      ) : (
                        <span className="badge-auth-no">Pending Auth</span>
                      )}
                    </td>
                    <td className="font-mono">{formatCurrency(b.bidLimit)}</td>
                    <td>
                      <span className={`status-tag ${b.status}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bidders-footer-link">
              <button className="btn btn-secondary" onClick={() => onNavigate('users')}>
                View All {bidders.length} Registered Bidders →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Catalog & Reserves */}
        {activeInfoTab === 'lotsSummary' && (
          <div className="catalog-reserves-grid">
            <div className="catalog-stat-box">
              <span className="stat-box-label">Active On Rostrum Block</span>
              <div className="stat-box-num font-mono text-gold">Lot #101</div>
              <div className="stat-box-desc">1907 Saint-Gaudens Double Eagle $20 High Relief</div>
              <span className="stat-box-meta">Current Bid: $82,500.00 • Reserve Met</span>
            </div>

            <div className="catalog-stat-box">
              <span className="stat-box-label">Highest Catalog Lot Estimate</span>
              <div className="stat-box-num font-mono">$220,000.00</div>
              <div className="stat-box-desc">Lot #104 (1796 Draped Bust Quarter Eagle PCGS AU-58)</div>
              <span className="stat-box-meta">Consigned by Private Sewickley Heights Estate</span>
            </div>

            <div className="catalog-stat-box">
              <span className="stat-box-label">Consigned Reserve Value</span>
              <div className="stat-box-num font-mono text-blue">$2,009,724.00</div>
              <div className="stat-box-desc">Representing 8 Consignor Estates & Private Collections</div>
              <span className="stat-box-meta">100% Floor Reserves Secured & Locked</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
