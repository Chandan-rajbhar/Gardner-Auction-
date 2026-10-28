import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Auction, LotItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  RefreshCw,
  Building2,
  Radio,
  Layers
} from 'lucide-react';
import { reportService, ReportAnalyticsData } from '../../services/reportService';
import { auctionService } from '../../services/auctionService';
import { DynamicRealizationChart } from './DynamicRealizationChart';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '../ui/select';

interface ReportsViewProps {
  auction: Auction;
  lots: LotItem[];
  selectedAuctionId?: string;
  availableAuctions?: Auction[];
  onSelectAuction?: (auctionId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ 
  auction, 
  lots: _initialLots,
  selectedAuctionId: externalSelectedAuctionId,
  availableAuctions = [],
  onSelectAuction
}) => {
  // Dynamic auctions loaded from Supabase
  const [dbAuctions, setDbAuctions] = useState<Auction[]>(availableAuctions);

  // Default to externalSelectedAuctionId if provided, or 'all' for consolidated portfolio
  const [activeAuctionId, setActiveAuctionId] = useState<string>(() => {
    return externalSelectedAuctionId || 'all';
  });
  const [analytics, setAnalytics] = useState<ReportAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep reference of external ID to avoid overriding user selection of 'all'
  const prevExternalIdRef = useRef(externalSelectedAuctionId);

  // Sync internal auction ID ONLY if external prop explicitly changed from the parent
  useEffect(() => {
    if (externalSelectedAuctionId && externalSelectedAuctionId !== prevExternalIdRef.current) {
      prevExternalIdRef.current = externalSelectedAuctionId;
      setActiveAuctionId(externalSelectedAuctionId);
    }
  }, [externalSelectedAuctionId]);

  // Fetch all auctions dynamically from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchDynamicAuctions = async () => {
      try {
        const details = await auctionService.getAuctions();
        if (isMounted && details && Array.isArray(details)) {
          const mapped: Auction[] = details.map((d: any) => ({
            id: d.id,
            code: d.code,
            title: d.name || d.title,
            category: 'Premier Numismatics & Horology',
            status: d.status === 'Open' ? 'preview' : d.status === 'In Progress' ? 'live' : 'closed',
            startDate: d.startDate || '',
            endDate: d.endDate || '',
            location: '',
            address: '',
            cityStateZip: '',
            country: '',
            lotCount: d.dayStats?.lotCount || 0,
            checkInCount: d.dayStats?.checkInCount || 0,
            uniqueSellers: d.dayStats?.uniqueSellers || 0,
            presaleMin: d.dayStats?.presaleMin || 0,
            presaleMax: d.dayStats?.presaleMax || 0,
            avgEstimate: d.dayStats?.avgEstimate || 0,
            avgSalesPrice: d.dayStats?.avgSalesPrice || 0,
            buyersPremiumCash: 15.0,
            buyersPremiumCredit: 18.0,
            taxRate: 7.5,
            description: d.description || '',
            terms: d.terms || '',
            bpExplanation: '',
            taxExemptInfo: '',
            hibidSyncStatus: 'synced',
          } as Auction));
          setDbAuctions(mapped);
        }
      } catch (err) {
        console.warn('[ReportsView] Could not load dynamic auctions from Supabase:', err);
      }
    };
    fetchDynamicAuctions();

    const unsubscribe = auctionService.subscribeToAuctions(() => {
      fetchDynamicAuctions();
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const allAuctionsList = useMemo(() => {
    if (dbAuctions && dbAuctions.length > 0) return dbAuctions;
    return availableAuctions;
  }, [dbAuctions, availableAuctions]);

  // Target auction details for currently active filter
  const currentTargetAuction = activeAuctionId === 'all'
    ? null
    : (allAuctionsList.find(a => a.id === activeAuctionId) || (auction?.id === activeAuctionId ? auction : null));

  // Fetch report analytics dynamically from Supabase
  const loadAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await reportService.getReportAnalytics(
        activeAuctionId === 'all' ? null : activeAuctionId, 
        currentTargetAuction
      );
      setAnalytics(data);
    } catch (err) {
      console.error('[ReportsView] Error loading analytics from Supabase:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve reports data from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeAuctionId, currentTargetAuction]);

  // Initial load and on auction selection change
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Subscribe to real-time database updates from Supabase
  useEffect(() => {
    const unsubscribe = reportService.subscribeToReportChanges(() => {
      loadAnalytics(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadAnalytics]);

  // Handle Auction Filter Change via shadcn Select
  const handleAuctionChange = (newAuctionId: string) => {
    setActiveAuctionId(newAuctionId);
    if (onSelectAuction && newAuctionId !== 'all') {
      prevExternalIdRef.current = newAuctionId;
      onSelectAuction(newAuctionId);
    }
  };

  // Export Realization CSV using actual dynamic Supabase data
  const handleExportCSV = () => {
    if (!analytics || analytics.rawLots.length === 0) {
      alert('No auction lots available to export.');
      return;
    }

    const headers = [
      'Lot Number',
      'Title',
      'Category',
      'Certification',
      'Grade',
      'Estimate Low ($)',
      'Estimate High ($)',
      'Reserve Price ($)',
      'Realized Hammer / Current Bid ($)',
      'Status',
      'Winning Bidder Paddle',
      'Winning Bidder Name',
      'Consignor'
    ];

    const rows = analytics.rawLots.map(l => {
      const lotNum = l.lotNumber || '';
      const title = `"${(l.title || '').replace(/"/g, '""')}"`;
      const cat = `"${(l.category || 'Curated Lot').replace(/"/g, '""')}"`;
      const cert = `"${(l.certification || 'Raw').replace(/"/g, '""')}"`;
      const grade = `"${(l.grade || '').replace(/"/g, '""')}"`;
      const estLow = Number(l.estimateLow) || 0;
      const estHigh = Number(l.estimateHigh) || 0;
      const reserve = Number(l.reservePrice) || 0;
      const realized = Number(l.hammerPrice || l.currentBid) || 0;
      const status = `"${(l.status || 'upcoming').replace(/"/g, '""')}"`;
      const paddle = `"${(l.highBidderPaddle || '').replace(/"/g, '""')}"`;
      const bidderName = `"${(l.highBidderName || '').replace(/"/g, '""')}"`;
      const consignor = `"${(l.consignorName || 'Consignor Record').replace(/"/g, '""')}"`;

      return [lotNum, title, cat, cert, grade, estLow, estHigh, reserve, realized, status, paddle, bidderName, consignor].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filenameCode = currentTargetAuction?.code || (activeAuctionId === 'all' ? 'PORTFOLIO_CONSOLIDATED' : activeAuctionId);
    link.setAttribute('download', `AF360_${filenameCode}_Realization_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      {/* Page Header with Action Controls */}
      <div 
        className="card-header-flex" 
        style={{ 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 14,
          marginBottom: 0,
          gap: 12
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
              Auction Intelligence & Realization Reports
            </h2>
            {refreshing && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold-bright)', background: 'rgba(203, 161, 53, 0.08)', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>
                <RefreshCw size={11} className="spin-animation" /> Live updating...
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
            Price realization curves, hammer vs estimate ratios, and syndication export
          </p>
        </div>

        {/* Controls: shadcn/ui Select, Refresh & CSV Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* shadcn/ui Dropdown Select for Auction Filtering */}
          <Select value={activeAuctionId} onValueChange={handleAuctionChange}>
            <SelectTrigger style={{ height: 35, fontSize: 12.5, minWidth: 240, borderColor: 'var(--border-subtle)' }}>
              <Building2 size={14} style={{ color: '#64748b', marginRight: 4 }} />
              <SelectValue placeholder="Select Auction..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Auctions (Consolidated Portfolio)</SelectItem>
              {allAuctionsList.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title} ({a.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => loadAnalytics(false)}
            disabled={loading || refreshing}
            title="Refresh analytics from Supabase"
            style={{ height: 35, padding: '0 11px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          {/* CSV Export Button */}
          <button 
            type="button"
            className="btn btn-gold" 
            onClick={handleExportCSV}
            disabled={loading || !analytics || analytics.rawLots.length === 0}
            style={{ height: 35, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}
          >
            <Download size={14} />
            <span style={{ fontWeight: 600 }}>Export Realization CSV</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991b1b', fontSize: 12.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '3px 10px', fontSize: 11.5 }} 
            onClick={() => loadAnalytics(false)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="metric-card-af360" style={{ minHeight: 96, padding: '16px 18px', opacity: 0.6 }}>
                <div style={{ height: 26, width: 26, background: '#f1f5f9', borderRadius: 6 }}></div>
                <div style={{ height: 22, width: '55%', background: '#f1f5f9', borderRadius: 4, marginTop: 10 }}></div>
                <div style={{ height: 12, width: '35%', background: '#f1f5f9', borderRadius: 4, marginTop: 5 }}></div>
              </div>
            ))}
          </div>
          <div className="syndication-card" style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', fontSize: 13 }}>
              <RefreshCw size={14} className="spin-animation" /> Loading analytics from Supabase...
            </span>
          </div>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && analytics && (
        <>
          {/* Section A: Compact Analytics Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {/* 1. Hammer Realized Value */}
            <div className="metric-card-af360" style={{ padding: '16px 18px', minHeight: 102 }}>
              <div className="metric-card-top">
                <div className="metric-icon-box emerald" style={{ width: 32, height: 32, borderRadius: 7 }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="metric-content" style={{ marginTop: 8 }}>
                <div className="metric-val" style={{ color: 'var(--gold-bright)', fontSize: 26, fontWeight: 700 }}>
                  {formatCurrency(analytics.totalHammerRealized)}
                </div>
                <div className="metric-label" style={{ fontSize: 10.5, letterSpacing: '0.05em', marginTop: 3 }}>
                  Hammer Realized Value
                </div>
              </div>
            </div>

            {/* 2. Sell-Through Rate */}
            <div className="metric-card-af360" style={{ padding: '16px 18px', minHeight: 102 }}>
              <div className="metric-card-top">
                <div className="metric-icon-box blue" style={{ width: 32, height: 32, borderRadius: 7 }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="metric-content" style={{ marginTop: 8 }}>
                <div className="metric-val" style={{ fontSize: 26, fontWeight: 700 }}>
                  {analytics.sellThroughRate !== null ? `${analytics.sellThroughRate.toFixed(1)}%` : '0.0%'}
                </div>
                <div className="metric-label" style={{ fontSize: 10.5, letterSpacing: '0.05em', marginTop: 3 }}>
                  Sell-Through Rate
                </div>
              </div>
            </div>

            {/* 3. Hammer vs Low Estimate Ratio */}
            <div className="metric-card-af360" style={{ padding: '16px 18px', minHeight: 102 }}>
              <div className="metric-card-top">
                <div className="metric-icon-box amber" style={{ width: 32, height: 32, borderRadius: 7 }}>
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="metric-content" style={{ marginTop: 8 }}>
                <div className="metric-val" style={{ fontSize: 26, fontWeight: 700 }}>
                  {analytics.hammerVsLowEstimateRatio !== null ? `${analytics.hammerVsLowEstimateRatio.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="metric-label" style={{ fontSize: 10.5, letterSpacing: '0.05em', marginTop: 3 }}>
                  Hammer vs Low Estimate Ratio
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Realization Graph (Visual Realization & Hammer Curve) */}
          <DynamicRealizationChart
            lots={analytics.rawLots}
            totalHammer={analytics.totalHammerRealized}
            categoryStats={analytics.categoryStats}
            auctionTitle={analytics.auctionTitle}
          />

          {/* Section B: Numismatic Category Distribution & Realized Depth */}
          <div className="syndication-card" style={{ padding: '18px 22px' }}>
            <div style={{ marginBottom: 14 }}>
              <h3 className="font-serif" style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Numismatic Category Distribution & Realized Depth
              </h3>
            </div>

            {analytics.categoryStats.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                <Layers size={24} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>No cataloged lot categories found</p>
                <p style={{ margin: '3px 0 0', fontSize: 12 }}>Lots assigned to this auction will automatically populate here.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ boxShadow: 'none', border: '1px solid var(--border-subtle)' }}>
                <table className="luxury-table" style={{ fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '34%', fontSize: 11, padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category Department</th>
                      <th style={{ textAlign: 'center', width: '16%', fontSize: 11, padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cataloged Lots</th>
                      <th style={{ textAlign: 'right', width: '20%', fontSize: 11, padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cumulative Valuation</th>
                      <th style={{ textAlign: 'right', width: '16%', fontSize: 11, padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Price / Lot</th>
                      <th style={{ textAlign: 'right', width: '14%', fontSize: 11, padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.categoryStats.map((stat, i) => (
                      <tr key={stat.category || i} style={{ transition: 'background-color 0.15s ease' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: i === 0 ? 'var(--gold-bright)' : '#38bdf8' }}></span>
                            <span>{stat.category}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 500, padding: '10px 14px' }}>
                          {stat.catalogedLots}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)', padding: '10px 14px' }}>
                          {formatCurrency(stat.cumulativeValuation)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--gold-light)', fontWeight: 500, padding: '10px 14px' }}>
                          {stat.cumulativeValuation > 0 ? formatCurrency(stat.avgPrice) : '$0.00'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '10px 14px' }}>
                          {stat.portfolioShare.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section C & D: Bidding Channel Engagement & Settlement Readiness */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Section C: Bidding Channel Engagement */}
            <div className="syndication-card" style={{ padding: '18px 22px' }}>
              <div style={{ marginBottom: 14 }}>
                <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Bidding Channel Engagement
                </h3>
              </div>

              {analytics.totalChannelActivity === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 6, border: '1px dashed #e2e8f0', margin: '8px 0' }}>
                  <Radio size={20} style={{ margin: '0 auto 5px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600 }}>No channel activity recorded yet</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5 }}>Bids placed and registered bidders will automatically show channel distribution.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {analytics.biddingChannels.map(channel => (
                    <div key={channel.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{channel.name}</span>
                        <strong style={{ fontFamily: 'var(--font-mono)', minWidth: 40, textAlign: 'right', fontSize: 12.5 }}>
                          {channel.percentage.toFixed(1)}%
                        </strong>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-darkest, #0f172a)', borderRadius: 3, overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${channel.percentage}%`, 
                            height: '100%', 
                            background: channel.color,
                            transition: 'width 0.4s ease'
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section D: Settlement Readiness */}
            <div className="syndication-card" style={{ padding: '18px 22px' }}>
              <div style={{ marginBottom: 12 }}>
                <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Settlement Readiness
                </h3>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 14 }}>
                {analytics.settlementReadiness.summaryText}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {analytics.settlementReadiness.checks.map(check => {
                  const isVerified = check.status === 'verified';
                  const isWarning = check.status === 'warning';

                  return (
                    <div 
                      key={check.id} 
                      title={check.detail}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8,
                        fontSize: 12,
                        color: isVerified ? '#d97706' : (isWarning ? '#b45309' : '#64748b')
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {isVerified && <CheckCircle2 size={14} style={{ color: '#d97706' }} />}
                        {isWarning && <AlertCircle size={14} style={{ color: '#d97706' }} />}
                        {!isVerified && !isWarning && <Clock size={14} style={{ color: '#64748b' }} />}
                      </div>
                      <span style={{ lineHeight: 1.35 }}>
                        {check.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
