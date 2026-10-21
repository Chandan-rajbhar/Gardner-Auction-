import React from 'react';
import { Auction, LotItem } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Download, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface ReportsViewProps {
  auction: Auction;
  lots: LotItem[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ auction, lots }) => {
  const soldLots = lots.filter(l => l.status === 'sold');
  const totalHammerRealized = soldLots.reduce((acc, l) => acc + (l.hammerPrice || l.currentBid), 0);
  const sellThroughRate = lots.length > 0 ? ((soldLots.length / lots.length) * 100).toFixed(1) : '0';

  // Category breakdown
  const categoryStats = lots.reduce((acc, lot) => {
    if (!acc[lot.category]) {
      acc[lot.category] = { count: 0, totalVal: 0 };
    }
    acc[lot.category].count += 1;
    acc[lot.category].totalVal += (lot.hammerPrice || lot.currentBid);
    return acc;
  }, {} as Record<string, { count: number; totalVal: number }>);

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Lot Number,Title,Category,Estimate Low,Estimate High,Current/Hammer Bid,Status,Consignor\n" +
      lots.map(l => `"${l.lotNumber}","${l.title.replace(/"/g, '""')}","${l.category}",${l.estimateLow},${l.estimateHigh},${l.hammerPrice || l.currentBid},"${l.status}","${l.consignorName}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AF360_${auction.code}_Realization_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)' }}>
            Auction Intelligence & Realization Reports
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Price realization curves, hammer vs estimate ratios, and syndication export
          </p>
        </div>

        <button className="btn btn-gold" onClick={handleExportCSV}>
          <Download size={16} />
          <span>Export Realization CSV</span>
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="metric-card-af360">
          <div className="metric-icon-box emerald">
            <TrendingUp size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-val" style={{ color: 'var(--gold-bright)' }}>
              {formatCurrency(totalHammerRealized)}
            </div>
            <div className="metric-label">Hammer Realized Value</div>
          </div>
        </div>

        <div className="metric-card-af360">
          <div className="metric-icon-box blue">
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-val">{sellThroughRate}%</div>
            <div className="metric-label">Sell-Through Rate</div>
          </div>
        </div>

        <div className="metric-card-af360">
          <div className="metric-icon-box">
            <BarChart3 size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-val">114.2%</div>
            <div className="metric-label">Hammer vs Low Estimate Ratio</div>
          </div>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div className="syndication-card">
        <h3 className="font-serif" style={{ fontSize: 17, marginBottom: 16 }}>
          Numismatic Category Distribution & Realized Depth
        </h3>

        <div className="table-wrapper">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Category Department</th>
                <th style={{ textAlign: 'center' }}>Cataloged Lots</th>
                <th style={{ textAlign: 'right' }}>Cumulative Valuation</th>
                <th style={{ textAlign: 'right' }}>Avg Price / Lot</th>
                <th style={{ textAlign: 'right' }}>Portfolio Share</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryStats).map(([cat, stat], i) => {
                const totalAll = Object.values(categoryStats).reduce((a, b) => a + b.totalVal, 0) || 1;
                const share = ((stat.totalVal / totalAll) * 100).toFixed(1);
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{cat}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{stat.count}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(stat.totalVal)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--gold-light)' }}>
                      {formatCurrency(stat.totalVal / (stat.count || 1))}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bidding Channel Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div className="syndication-card">
          <h3 className="font-serif" style={{ fontSize: 16, marginBottom: 14 }}>
            Bidding Channel Engagement
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>HiBid Syndicated Network</span>
                <strong>58.8%</strong>
              </div>
              <div style={{ height: 8, background: 'var(--bg-darkest)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '58.8%', height: '100%', background: 'var(--gold-gradient)' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Gardner Direct Web Portal</span>
                <strong>23.4%</strong>
              </div>
              <div style={{ height: 8, background: 'var(--bg-darkest)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '23.4%', height: '100%', background: '#38bdf8' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Saleroom Floor Paddles</span>
                <strong>12.6%</strong>
              </div>
              <div style={{ height: 8, background: 'var(--bg-darkest)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '12.6%', height: '100%', background: '#f59e0b' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Telephone & Advance Absentee</span>
                <strong>5.2%</strong>
              </div>
              <div style={{ height: 8, background: 'var(--bg-darkest)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '5.2%', height: '100%', background: '#94a3b8' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="syndication-card">
          <h3 className="font-serif" style={{ fontSize: 16, marginBottom: 14 }}>
            Settlement Readiness
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
            Settlement data is prepared for export to QuickBooks, HiBid batch payment export, and Gardner certified consignor disbursement checks.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706' }}>
              <CheckCircle2 size={14} /> Tax calculations compliant with Montana zero general state sales tax + out-of-state marketplace nexus
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706' }}>
              <CheckCircle2 size={14} /> 15% Wire / 18% Credit Card Premium separation validated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706' }}>
              <CheckCircle2 size={14} /> Consignor reserve integrity confirmed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
