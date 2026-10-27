import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Layers, 
  Gavel, 
  ShieldCheck, 
  DollarSign, 
  BarChart3,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { LotItem, LiveBid } from '../../types';

export type TimeRange = '7d' | '30d' | '12m';
export type ChartViewMode = 'area' | 'sessions';

interface DataPoint {
  id: string;
  label: string;
  dateStr: string;
  amount: number;
  lotsSold: number;
  topLotTitle: string;
  topLotPrice: number;
  estimateBaseline: number;
}

interface AnalyticsDataset {
  totalHammer: number;
  avgLotRate: number;
  peakHammer: number;
  peakLotTitle: string;
  points: DataPoint[];
}

const DATASETS: Record<TimeRange, AnalyticsDataset> = {
  '7d': {
    totalHammer: 895400,
    avgLotRate: 8140.00,
    peakHammer: 280000,
    peakLotTitle: '1796 Draped Bust Quarter Eagle (PCGS AU-58)',
    points: [
      { id: 'd1', label: 'Oct 16', dateStr: 'Thu, Oct 16 (Preview Day 1)', amount: 42500, lotsSold: 12, topLotTitle: '1881-S Morgan Dollar DMPL', topLotPrice: 16500, estimateBaseline: 35000 },
      { id: 'd2', label: 'Oct 17', dateStr: 'Fri, Oct 17 (Preview Day 2)', amount: 96800, lotsSold: 24, topLotTitle: '1854-O $20 Liberty Double Eagle', topLotPrice: 38000, estimateBaseline: 80000 },
      { id: 'd3', label: 'Oct 18', dateStr: 'Sat, Oct 18 (Catalog Launch)', amount: 184500, lotsSold: 42, topLotTitle: '1915-S Panama-Pacific $50 Gold', topLotPrice: 96000, estimateBaseline: 150000 },
      { id: 'd4', label: 'Oct 19', dateStr: 'Sun, Oct 19 (Simulcast Opening)', amount: 320000, lotsSold: 68, topLotTitle: 'Rolex Cosmograph Daytona 6263', topLotPrice: 125000, estimateBaseline: 280000 },
      { id: 'd5', label: 'Oct 20', dateStr: 'Mon, Oct 20 (Session 1 & 2)', amount: 565000, lotsSold: 104, topLotTitle: '1893-S Morgan Silver Dollar', topLotPrice: 145000, estimateBaseline: 490000 },
      { id: 'd6', label: 'Oct 21', dateStr: 'Tue, Oct 21 (Session 3 - Today)', amount: 895400, lotsSold: 146, topLotTitle: '1796 Draped Bust Quarter Eagle', topLotPrice: 280000, estimateBaseline: 750000 },
      { id: 'd7', label: 'Oct 22', dateStr: 'Wed, Oct 22 (Session 4 - Live)', amount: 1081116, lotsSold: 199, topLotTitle: '1907 High Relief Wire Rim $20', topLotPrice: 345000, estimateBaseline: 1039764 },
    ]
  },
  '30d': {
    totalHammer: 1081116,
    avgLotRate: 7662.03,
    peakHammer: 345000,
    peakLotTitle: '1907 Saint-Gaudens Double Eagle $20 (High Relief)',
    points: [
      { id: 'w1', label: 'Sep 23', dateStr: 'Consignment Cutoff', amount: 85000, lotsSold: 18, topLotTitle: 'PCGS Certified Morgan Proofs', topLotPrice: 22000, estimateBaseline: 90000 },
      { id: 'w2', label: 'Sep 28', dateStr: 'Cataloging & Photography', amount: 185000, lotsSold: 35, topLotTitle: 'Swiss Chronometer Collection', topLotPrice: 45000, estimateBaseline: 200000 },
      { id: 'w3', label: 'Oct 03', dateStr: 'HiBid Syndication Node Push', amount: 310000, lotsSold: 62, topLotTitle: '1908 Saint-Gaudens No Motto', topLotPrice: 65000, estimateBaseline: 340000 },
      { id: 'w4', label: 'Oct 08', dateStr: 'Absentee Book Opened', amount: 480000, lotsSold: 94, topLotTitle: '1915-S Panama-Pacific $50', topLotPrice: 96000, estimateBaseline: 510000 },
      { id: 'w5', label: 'Oct 13', dateStr: 'Floor Preview Invitations', amount: 695000, lotsSold: 128, topLotTitle: '1893-S Morgan Dollar NGC VF30', topLotPrice: 145000, estimateBaseline: 720000 },
      { id: 'w6', label: 'Oct 18', dateStr: 'Simulcast Live Clerking', amount: 890000, lotsSold: 165, topLotTitle: '1796 Draped Bust Quarter Eagle', topLotPrice: 280000, estimateBaseline: 900000 },
      { id: 'w7', label: 'Oct 23', dateStr: 'Final Gavel Knockdown', amount: 1081116, lotsSold: 199, topLotTitle: '1907 Saint-Gaudens Double Eagle', topLotPrice: 345000, estimateBaseline: 1039764 },
    ]
  },
  '12m': {
    totalHammer: 8416116,
    avgLotRate: 8620.00,
    peakHammer: 485000,
    peakLotTitle: '1933 Eagle Specimen Pattern (Ex. Clapp)',
    points: [
      { id: 'm1', label: 'Nov 25', dateStr: 'Nov 2025: Fall Numismatics', amount: 1420000, lotsSold: 184, topLotTitle: '1879 Flowing Hair Stella $4 Gold', topLotPrice: 195000, estimateBaseline: 1350000 },
      { id: 'm2', label: 'Jan 26', dateStr: 'Jan 2026: Winter Horology Showcase', amount: 3310000, lotsSold: 340, topLotTitle: 'Patek Philippe Perpetual 3970J', topLotPrice: 240000, estimateBaseline: 3100000 },
      { id: 'm3', label: 'Mar 26', dateStr: 'Mar 2026: Spring Rare Coin Premier', amount: 5450000, lotsSold: 550, topLotTitle: '1794 Flowing Hair Silver Dollar', topLotPrice: 380000, estimateBaseline: 5100000 },
      { id: 'm4', label: 'Jun 26', dateStr: 'Jun 2026: Pacific Northwest Vault', amount: 7335000, lotsSold: 728, topLotTitle: 'Territorial Kellogg & Co $50 Gold', topLotPrice: 320000, estimateBaseline: 6900000 },
      { id: 'm5', label: 'Oct 26', dateStr: 'Oct 2026: Current Rolex & Gold Sale', amount: 8416116, lotsSold: 927, topLotTitle: '1933 Eagle Specimen Pattern', topLotPrice: 485000, estimateBaseline: 7950000 },
    ]
  }
};

const SESSION_CARDS = [
  {
    id: 's1',
    sessionName: 'Session 1',
    title: 'Ancient & Colonial Numismatics',
    lotsRange: 'Lots 001 - 048',
    hammerRealized: 145000,
    presaleEstimate: 120000,
    lotsSold: 48,
    totalLots: 48,
    clearanceRate: 100,
    topLot: '1796 Draped Bust Quarter Eagle ($280k)',
    status: 'Completed'
  },
  {
    id: 's2',
    sessionName: 'Session 2',
    title: 'Morgan Proofs & Rare Silver',
    lotsRange: 'Lots 049 - 100',
    hammerRealized: 285000,
    presaleEstimate: 250000,
    lotsSold: 50,
    totalLots: 52,
    clearanceRate: 96.1,
    topLot: '1893-S Morgan Silver Dollar ($145k)',
    status: 'Completed'
  },
  {
    id: 's3',
    sessionName: 'Session 3',
    title: 'Rolex & Historic Chronometers',
    lotsRange: 'Lots 101 - 145',
    hammerRealized: 485000,
    presaleEstimate: 420000,
    lotsSold: 45,
    totalLots: 45,
    clearanceRate: 100,
    topLot: 'Rolex Cosmograph Daytona 6263 ($125k)',
    status: 'Completed'
  },
  {
    id: 's4',
    sessionName: 'Session 4',
    title: 'Premier US Gold & Gavel Fall',
    lotsRange: 'Lots 146 - 199',
    hammerRealized: 166116,
    presaleEstimate: 249764,
    lotsSold: 42,
    totalLots: 54,
    clearanceRate: 77.8,
    topLot: '1907 High Relief Double Eagle ($345k)',
    status: 'On Rostrum Block'
  }
];

export interface AuctionAnalyticsChartProps {
  lots?: LotItem[];
  bids?: LiveBid[];
  totalHammer?: number;
  presaleMin?: number;
  presaleMax?: number;
}

export const AuctionAnalyticsChart: React.FC<AuctionAnalyticsChartProps> = ({
  lots = [],
  bids = [],
  totalHammer,
  presaleMin,
  presaleMax
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [viewMode, setChartViewMode] = useState<ChartViewMode>('area');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Compute dynamic session cards from real lots if present
  const dynamicSessionCards = useMemo(() => {
    if (!lots || lots.length === 0) return SESSION_CARDS;

    // Group lots by category or by 4 equal partitions
    const chunkSize = Math.max(1, Math.ceil(lots.length / 4));
    const chunks: LotItem[][] = [];
    for (let i = 0; i < lots.length; i += chunkSize) {
      chunks.push(lots.slice(i, i + chunkSize));
    }

    return chunks.slice(0, 4).map((chunk, idx) => {
      const soldInChunk = chunk.filter(l => l.status === 'sold');
      const hammer = soldInChunk.reduce((acc, l) => acc + (Number(l.hammerPrice) || Number(l.currentBid) || 0), 0);
      const estMin = chunk.reduce((acc, l) => acc + (Number(l.estimateLow) || Number(l.startingBid) || 0), 0);
      const clearance = chunk.length > 0 ? Math.round((soldInChunk.length / chunk.length) * 1000) / 10 : 0;
      
      const sortedByPrice = [...chunk].sort((a, b) => (Number(b.currentBid) || 0) - (Number(a.currentBid) || 0));
      const top = sortedByPrice[0];
      const topLotStr = top 
        ? `${top.title.slice(0, 28)} ($${formatNumber(Number(top.currentBid) || Number(top.startingBid) || 0)})`
        : 'Catalog Session Item';

      const minLotNum = Math.min(...chunk.map(l => l.lotNumber || 1));
      const maxLotNum = Math.max(...chunk.map(l => l.lotNumber || 1));

      return {
        id: `dyn-s${idx + 1}`,
        sessionName: `Session ${idx + 1}`,
        title: chunk[0]?.category || `Catalog Section ${idx + 1}`,
        lotsRange: `Lots ${String(minLotNum).padStart(3, '0')} - ${String(maxLotNum).padStart(3, '0')}`,
        hammerRealized: hammer > 0 ? hammer : Math.round(estMin * 1.1),
        presaleEstimate: estMin > 0 ? estMin : 120000,
        lotsSold: soldInChunk.length > 0 ? soldInChunk.length : Math.round(chunk.length * 0.9),
        totalLots: chunk.length,
        clearanceRate: clearance > 0 ? clearance : 92.5,
        topLot: topLotStr,
        status: chunk.some(l => l.status === 'on_block') ? 'On Rostrum Block' : idx === 3 ? 'On Rostrum Block' : 'Completed'
      };
    });
  }, [lots]);

  const activeDataset = useMemo(() => {
    const base = DATASETS[timeRange];
    if (!totalHammer && !presaleMin) return base;

    const dynamicTotalHammer = totalHammer !== undefined && totalHammer > 0 ? totalHammer : base.totalHammer;
    const dynamicEst = presaleMin !== undefined && presaleMin > 0 ? presaleMin : (base.points[base.points.length - 1]?.estimateBaseline || 750000);

    const updatedPoints = base.points.map((pt, idx) => {
      if (idx === base.points.length - 1) {
        return {
          ...pt,
          amount: dynamicTotalHammer,
          estimateBaseline: dynamicEst
        };
      }
      return pt;
    });

    return {
      ...base,
      totalHammer: dynamicTotalHammer,
      points: updatedPoints
    };
  }, [timeRange, totalHammer, presaleMin]);

  const points = activeDataset.points;

  // Chart Dimensions
  const svgWidth = 860;
  const svgHeight = 270;
  const padding = { top: 25, right: 35, bottom: 42, left: 75 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Scale calculations
  const maxVal = useMemo(() => {
    const highestData = Math.max(...points.map(p => Math.max(p.amount, p.estimateBaseline)));
    return Math.ceil((highestData * 1.15) / 100000) * 100000;
  }, [points]);

  const minVal = 0;

  // Coordinate projections
  const coordinates = useMemo(() => {
    return points.map((p, idx) => {
      const x = padding.left + (idx / (points.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - ((p.amount - minVal) / (maxVal - minVal)) * graphHeight;
      const baseY = padding.top + graphHeight - ((p.estimateBaseline - minVal) / (maxVal - minVal)) * graphHeight;
      return { ...p, x, y, baseY };
    });
  }, [points, graphWidth, graphHeight, padding, maxVal, minVal]);

  // Smooth SVG Path generator (Cubic Bézier)
  const areaAndLinePath = useMemo(() => {
    if (coordinates.length === 0) return { linePath: '', areaPath: '', basePath: '' };

    let linePath = `M ${coordinates[0].x} ${coordinates[0].y}`;
    let basePath = `M ${coordinates[0].x} ${coordinates[0].baseY}`;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const p0 = i > 0 ? coordinates[i - 1] : coordinates[i];
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];
      const p3 = i < coordinates.length - 2 ? coordinates[i + 2] : p2;

      // Tension factor
      const tension = 0.22;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;

      const bcp1x = p1.x + (p2.x - p0.x) * tension;
      const bcp1y = p1.baseY + (p2.baseY - p0.baseY) * tension;
      const bcp2x = p2.x - (p3.x - p1.x) * tension;
      const bcp2y = p2.baseY - (p3.baseY - p1.baseY) * tension;
      basePath += ` C ${bcp1x} ${bcp1y}, ${bcp2x} ${bcp2y}, ${p2.x} ${p2.baseY}`;
    }

    const lastX = coordinates[coordinates.length - 1].x;
    const firstX = coordinates[0].x;
    const zeroY = padding.top + graphHeight;

    const areaPath = `${linePath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;

    return { linePath, areaPath, basePath };
  }, [coordinates, padding, graphHeight]);

  // Y-axis grid ticks (5 steps)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = (maxVal / count) * i;
      const y = padding.top + graphHeight - (val / maxVal) * graphHeight;
      ticks.push({ val, y });
    }
    return ticks;
  }, [maxVal, graphHeight, padding]);

  // Handle interactive hover over chart SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * svgWidth;

    // Find nearest point
    let closestIndex = 0;
    let minDistance = Infinity;

    coordinates.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    setHoveredPointIndex(closestIndex);
  };

  const activeHoveredPoint = hoveredPointIndex !== null ? coordinates[hoveredPointIndex] : null;

  return (
    <div className="analytics-card-elevated" id="analytics-section">
      {/* Header Row */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <div className="analytics-icon-badge">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="analytics-title-row">
              <h3>Auction Performance & Realization</h3>
              <span className="live-status-pill">
                <span className="live-status-dot" />
                Live Telemetry
              </span>
            </div>
            <p className="analytics-subtitle">
              Dynamic hammer price performance across catalog sessions, floor paddles, and syndicated HiBid orders
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="analytics-controls">
          <div className="view-toggle-pills" role="tablist" aria-label="Chart view mode">
            <button 
              className={`view-pill ${viewMode === 'area' ? 'active' : ''}`}
              onClick={() => setChartViewMode('area')}
              title="Time-series Realization Curve"
            >
              <TrendingUp size={13} />
              <span>Realization Curve</span>
            </button>
            <button 
              className={`view-pill ${viewMode === 'sessions' ? 'active' : ''}`}
              onClick={() => setChartViewMode('sessions')}
              title="Session Breakdown"
            >
              <BarChart3 size={13} />
              <span>Session View</span>
            </button>
          </div>

          <div className="time-range-group" role="tablist" aria-label="Time range selector">
            <button 
              className={`time-pill ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => { setTimeRange('7d'); setHoveredPointIndex(null); }}
            >
              7 Days
            </button>
            <button 
              className={`time-pill ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => { setTimeRange('30d'); setHoveredPointIndex(null); }}
            >
              30 Days
            </button>
            <button 
              className={`time-pill ${timeRange === '12m' ? 'active' : ''}`}
              onClick={() => { setTimeRange('12m'); setHoveredPointIndex(null); }}
            >
              12 Months
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="analytics-summary-banner">
        <div className="analytics-metric-cell">
          <span className="summary-label">
            {timeRange === '7d' ? '7 DAYS REALIZED' : timeRange === '30d' ? 'LAST 30 DAYS TOTAL' : '12-MONTH TRAILING REALIZED'}
          </span>
          <div className="summary-val-wrap">
            <span className="summary-primary-value">
              {formatCurrency(activeDataset.totalHammer)}
            </span>
            <span className="summary-badge positive">
              <ArrowUpRight size={13} />
              <span>+14.2%</span>
            </span>
          </div>
        </div>

        <div className="analytics-metric-cell">
          <span className="summary-label">AVERAGE LOT RATE</span>
          <div className="summary-val-wrap">
            <span className="summary-primary-value slate-val">
              {formatCurrency(activeDataset.avgLotRate)}
            </span>
            <span className="summary-unit">/ catalog lot</span>
          </div>
        </div>

        <div className="analytics-metric-cell">
          <span className="summary-label">PEAK LOT HAMMER</span>
          <div className="summary-val-wrap">
            <span className="summary-primary-value gold-val">
              {formatCurrency(activeDataset.peakHammer)}
            </span>
            <span className="summary-badge gold">Gavel High</span>
          </div>
          <div className="summary-annotation truncate" title={activeDataset.peakLotTitle}>
            {activeDataset.peakLotTitle}
          </div>
        </div>

        <div className="analytics-feed-indicator">
          <div className="feed-signal-ring">
            <span className="feed-dot" />
          </div>
          <div className="feed-text-block">
            <span className="feed-title">Live HiBid Feed</span>
            <span className="feed-sub">5 Portal Nodes In Sync</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      {viewMode === 'area' ? (
        <div className="chart-wrapper-interactive">
          <svg 
            className="analytics-svg-canvas"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPointIndex(null)}
          >
            <defs>
              {/* Premium Champagne Gold Gradient Fill */}
              <linearGradient id="goldAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c5a059" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#c5a059" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#c5a059" stopOpacity="0.0" />
              </linearGradient>

              {/* Stroke Gradient */}
              <linearGradient id="goldLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9a7428" />
                <stop offset="50%" stopColor="#c5a059" />
                <stop offset="100%" stopColor="#d4af37" />
              </linearGradient>

              {/* Drop Shadow for the line */}
              <filter id="goldLineGlow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#9a7428" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((tick, i) => (
              <g key={i} className="chart-grid-line">
                <line 
                  x1={padding.left} 
                  y1={tick.y} 
                  x2={svgWidth - padding.right} 
                  y2={tick.y} 
                  stroke="#e8e4dc" 
                  strokeDasharray={i === 0 ? 'none' : '3 3'} 
                  strokeWidth="1"
                />
                <text 
                  x={padding.left - 12} 
                  y={tick.y + 4} 
                  textAnchor="end" 
                  className="chart-axis-label"
                >
                  {tick.val >= 1000000 ? `$${(tick.val / 1000000).toFixed(1)}M` : `$${Math.round(tick.val / 1000)}k`}
                </text>
              </g>
            ))}

            {/* Presale Estimate Baseline (Dashed Slate) */}
            <path 
              d={areaAndLinePath.basePath} 
              fill="none" 
              stroke="#94a3b8" 
              strokeWidth="1.5" 
              strokeDasharray="4 4" 
              opacity="0.65"
            />

            {/* Area Fill */}
            <path 
              d={areaAndLinePath.areaPath} 
              fill="url(#goldAreaGradient)" 
            />

            {/* Main Realization Line */}
            <path 
              d={areaAndLinePath.linePath} 
              fill="none" 
              stroke="url(#goldLineGradient)" 
              strokeWidth="3" 
              filter="url(#goldLineGlow)"
              strokeLinecap="round"
            />

            {/* X-Axis Labels */}
            {coordinates.map((pt, idx) => (
              <g key={idx} className="chart-x-group">
                <line 
                  x1={pt.x} 
                  y1={padding.top + graphHeight} 
                  x2={pt.x} 
                  y2={padding.top + graphHeight + 6} 
                  stroke="#cbd5e1" 
                  strokeWidth="1" 
                />
                <text 
                  x={pt.x} 
                  y={padding.top + graphHeight + 20} 
                  textAnchor="middle" 
                  className={`chart-axis-label ${hoveredPointIndex === idx ? 'active-label' : ''}`}
                >
                  {pt.label}
                </text>
              </g>
            ))}

            {/* Data Point Dots */}
            {coordinates.map((pt, idx) => {
              const isHovered = hoveredPointIndex === idx;
              return (
                <g key={idx} className="data-point-marker">
                  {isHovered && (
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="12" 
                      fill="rgba(197, 160, 89, 0.22)" 
                      className="point-pulse"
                    />
                  )}
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={isHovered ? '6' : '4'} 
                    fill="#ffffff" 
                    stroke="#a37a3b" 
                    strokeWidth={isHovered ? '3' : '2'} 
                    style={{ transition: 'all 0.15s ease' }}
                  />
                </g>
              );
            })}

            {/* Active Vertical Crosshair Tracker */}
            {activeHoveredPoint && (
              <line 
                x1={activeHoveredPoint.x} 
                y1={padding.top} 
                x2={activeHoveredPoint.x} 
                y2={padding.top + graphHeight} 
                stroke="#a37a3b" 
                strokeWidth="1.2" 
                strokeDasharray="3 3" 
                opacity="0.8"
              />
            )}
          </svg>

          {/* Interactive Floating Tooltip */}
          {activeHoveredPoint && (
            <div 
              className="chart-floating-tooltip"
              style={{
                left: `clamp(10px, ${(activeHoveredPoint.x / svgWidth) * 100}%, calc(100% - 240px))`,
                top: `${Math.max(12, (activeHoveredPoint.y / svgHeight) * 100 - 35)}%`
              }}
            >
              <div className="tooltip-header">
                <span className="tooltip-date">{activeHoveredPoint.dateStr}</span>
                <span className="tooltip-lots-badge">{activeHoveredPoint.lotsSold} Lots Cleared</span>
              </div>
              <div className="tooltip-main-val">
                <span className="tooltip-label">Hammer Realized:</span>
                <span className="tooltip-amount">{formatCurrency(activeHoveredPoint.amount)}</span>
              </div>
              <div className="tooltip-sub-val">
                <span className="tooltip-label">Presale Low Estimate:</span>
                <span className="tooltip-est">{formatCurrency(activeHoveredPoint.estimateBaseline)}</span>
              </div>
              <div className="tooltip-top-lot">
                <Gavel size={12} className="tooltip-icon" />
                <span className="tooltip-top-title truncate">High Lot: {activeHoveredPoint.topLotTitle}</span>
                <span className="tooltip-top-price">{formatCurrency(activeHoveredPoint.topLotPrice)}</span>
              </div>
            </div>
          )}

          {/* Chart Legend Footer */}
          <div className="chart-legend-row">
            <div className="legend-item">
              <span className="legend-indicator solid-gold" />
              <span>Realized Hammer Total (USD)</span>
            </div>
            <div className="legend-item">
              <span className="legend-indicator dashed-slate" />
              <span>Presale Minimum Floor Estimate</span>
            </div>
            <div className="legend-item right-align">
              <span className="legend-note">Hover curve for session details & top gavel items</span>
            </div>
          </div>
        </div>
      ) : (
        /* Session Breakdown View */
        <div className="sessions-breakdown-grid">
          {dynamicSessionCards.map((sess) => {
            const isFinished = sess.status === 'Completed';
            const percentOfEstimate = Math.round((sess.hammerRealized / sess.presaleEstimate) * 100);
            return (
              <div key={sess.id} className="session-progress-card">
                <div className="session-card-top">
                  <div>
                    <span className="session-tag">{sess.sessionName}</span>
                    <h4 className="session-title">{sess.title}</h4>
                    <span className="session-lots-range">{sess.lotsRange}</span>
                  </div>
                  <span className={`session-status-badge ${isFinished ? 'completed' : 'live-rostrum'}`}>
                    {isFinished ? 'Closed' : 'Active On Block'}
                  </span>
                </div>

                <div className="session-financials">
                  <div className="sess-stat">
                    <span className="sess-stat-label">Hammer Realized</span>
                    <span className="sess-stat-val font-mono">{formatCurrency(sess.hammerRealized)}</span>
                  </div>
                  <div className="sess-stat right">
                    <span className="sess-stat-label">Floor Estimate</span>
                    <span className="sess-stat-val text-muted font-mono">{formatCurrency(sess.presaleEstimate)}</span>
                  </div>
                </div>

                {/* Progress bar towards estimate */}
                <div className="session-progress-bar-wrap">
                  <div className="session-bar-track">
                    <div 
                      className="session-bar-fill" 
                      style={{ width: `${Math.min(100, percentOfEstimate)}%` }}
                    />
                  </div>
                  <div className="session-progress-meta">
                    <span>{percentOfEstimate}% of presale low</span>
                    <span>{sess.lotsSold}/{sess.totalLots} Lots Sold ({sess.clearanceRate}%)</span>
                  </div>
                </div>

                <div className="session-top-item">
                  <Gavel size={13} className="text-gold" />
                  <span className="session-item-name truncate">{sess.topLot}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
