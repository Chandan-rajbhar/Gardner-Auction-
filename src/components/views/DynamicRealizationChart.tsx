

import React, { useState, useMemo } from 'react';
import { LotItem } from '../../types';
import { CategoryStat } from '../../services/reportService';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { TrendingUp, Gavel, BarChart3, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface DynamicRealizationChartProps {
  lots: LotItem[];
  totalHammer: number;
  categoryStats: CategoryStat[];
  auctionTitle: string;
}

export type RealizationChartViewMode = 'curve' | 'variance' | 'categories';

export const DynamicRealizationChart: React.FC<DynamicRealizationChartProps> = ({
  lots = [],
  totalHammer = 0,
  categoryStats = [],
  auctionTitle
}) => {
  const [viewMode, setViewMode] = useState<RealizationChartViewMode>('curve');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter sold and active lots sorted by lot number
  const sortedLots = useMemo(() => {
    return [...lots].sort((a, b) => (Number(a.lotNumber) || 0) - (Number(b.lotNumber) || 0));
  }, [lots]);

  const soldLots = useMemo(() => {
    return sortedLots.filter(l => l.status === 'sold');
  }, [sortedLots]);

  // Compute realization data points
  const points = useMemo(() => {
    if (sortedLots.length === 0) return [];

    let runningHammer = 0;
    let runningEstimate = 0;

    const dataPoints: Array<{
      id: string;
      label: string;
      lotNumber: number | string;
      title: string;
      category: string;
      hammer: number;
      cumulativeHammer: number;
      estimateLow: number;
      cumulativeEstimate: number;
      reserve: number;
      isSold: boolean;
      highBidder: string;
      paddle: string;
    }> = [];

    // Initial baseline point (Sale Start)
    dataPoints.push({
      id: 'pt-start',
      label: 'Open',
      lotNumber: '0',
      title: `${auctionTitle} - Opening Gavel`,
      category: 'Saleroom Opening',
      hammer: 0,
      cumulativeHammer: 0,
      estimateLow: 0,
      cumulativeEstimate: 0,
      reserve: 0,
      isSold: false,
      highBidder: 'Rostrum Floor',
      paddle: '--'
    });

    sortedLots.forEach((lot, i) => {
      const price = Number(lot.hammerPrice || lot.currentBid) || 0;
      const estLow = Number(lot.estimateLow) || (price > 0 ? Math.round(price * 0.85) : 0);
      const reserve = Number(lot.reservePrice) || 0;
      const isSold = lot.status === 'sold';

      if (isSold) {
        runningHammer += price;
      }
      runningEstimate += estLow;

      dataPoints.push({
        id: lot.id || `lot-${i}`,
        label: `Lot #${lot.lotNumber || i + 1}`,
        lotNumber: lot.lotNumber || i + 1,
        title: lot.title || `Catalog Lot #${lot.lotNumber || i + 1}`,
        category: lot.category || 'Curated Lot',
        hammer: price,
        cumulativeHammer: runningHammer,
        estimateLow: estLow,
        cumulativeEstimate: runningEstimate,
        reserve,
        isSold,
        highBidder: lot.highBidderName || 'Floor Bidder',
        paddle: lot.highBidderPaddle || '--'
      });
    });

    return dataPoints;
  }, [sortedLots, auctionTitle]);

  // Overall metrics
  const peakLot = useMemo(() => {
    if (soldLots.length === 0) return null;
    return [...soldLots].sort((a, b) => (Number(b.hammerPrice || b.currentBid) || 0) - (Number(a.hammerPrice || a.currentBid) || 0))[0];
  }, [soldLots]);

  const peakPrice = peakLot ? Number(peakLot.hammerPrice || peakLot.currentBid) || 0 : 0;
  const avgLotPrice = soldLots.length > 0 ? Math.round((totalHammer / soldLots.length) * 100) / 100 : 0;
  const clearanceRate = lots.length > 0 ? Math.round((soldLots.length / lots.length) * 1000) / 10 : 0;

  // SVG Chart Geometry
  const svgWidth = 860;
  const svgHeight = 250;
  const padding = { top: 25, right: 35, bottom: 40, left: 75 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Dynamic Scale
  const maxScaleVal = useMemo(() => {
    if (points.length === 0) return 1000;
    const highestVal = Math.max(
      ...points.map(p => viewMode === 'variance' ? Math.max(p.hammer, p.estimateLow, p.reserve) : Math.max(p.cumulativeHammer, p.cumulativeEstimate))
    );
    if (highestVal <= 0) return 1000;
    // Round up nicely
    const magnitude = Math.pow(10, Math.floor(Math.log10(highestVal)));
    return Math.ceil((highestVal * 1.2) / magnitude) * magnitude;
  }, [points, viewMode]);

  // Y-Axis Ticks
  const yTicks = useMemo(() => {
    const count = 4;
    const ticks: Array<{ y: number; val: number }> = [];
    for (let i = 0; i <= count; i++) {
      const val = Math.round((maxScaleVal / count) * i);
      const y = padding.top + graphHeight - (val / maxScaleVal) * graphHeight;
      ticks.push({ y, val });
    }
    return ticks;
  }, [maxScaleVal, graphHeight, padding]);

  // Coordinates projection for Curve
  const coordinates = useMemo(() => {
    if (points.length === 0) return [];
    return points.map((p, idx) => {
      const x = padding.left + (idx / Math.max(1, points.length - 1)) * graphWidth;
      const targetVal = viewMode === 'variance' ? p.hammer : p.cumulativeHammer;
      const estVal = viewMode === 'variance' ? p.estimateLow : p.cumulativeEstimate;

      const y = padding.top + graphHeight - (Math.min(targetVal, maxScaleVal) / maxScaleVal) * graphHeight;
      const baseY = padding.top + graphHeight - (Math.min(estVal, maxScaleVal) / maxScaleVal) * graphHeight;
      return { ...p, x, y, baseY };
    });
  }, [points, graphWidth, graphHeight, padding, maxScaleVal, viewMode]);

  // SVG Path generation
  const paths = useMemo(() => {
    if (coordinates.length === 0) return { line: '', area: '', base: '' };

    const first = coordinates[0];
    let lineD = `M ${first.x} ${first.y}`;
    let baseD = `M ${first.x} ${first.baseY}`;

    for (let i = 1; i < coordinates.length; i++) {
      const pt = coordinates[i];
      lineD += ` L ${pt.x} ${pt.y}`;
      baseD += ` L ${pt.x} ${pt.baseY}`;
    }

    const last = coordinates[coordinates.length - 1];
    const groundY = padding.top + graphHeight;
    const areaD = `${lineD} L ${last.x} ${groundY} L ${first.x} ${groundY} Z`;

    return { line: lineD, area: areaD, base: baseD };
  }, [coordinates, padding, graphHeight]);

  const activeHover = hoveredIdx !== null && coordinates[hoveredIdx] ? coordinates[hoveredIdx] : null;

  return (
    <div
      className="syndication-card"
      style={{
        padding: '20px 24px',
        background: '#ffffff',
        border: '1px solid var(--border-subtle, #eae5dc)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-card, 0 1px 3px rgba(20, 24, 33, 0.04))'
      }}
    >
      {/* Chart Top Header & Dynamic Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 16,
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 14
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(163, 122, 59, 0.1)',
                border: '1px solid rgba(163, 122, 59, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold-primary, #a37a3b)'
              }}
            >
              <TrendingUp size={18} />
            </div>
            <h3 className="font-serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Price Realization & Cumulative Hammer Curve
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, paddingLeft: 41 }}>
            Dynamic lot-by-lot realized hammer progression vs pre-sale estimate baselines from Supabase
          </p>
        </div>

        {/* View Mode Switcher Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => setViewMode('curve')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: viewMode === 'curve' ? 700 : 500,
              borderRadius: 6,
              border: viewMode === 'curve' ? '1px solid #a37a3b' : '1px solid #e2e8f0',
              background: viewMode === 'curve' ? 'rgba(163, 122, 59, 0.1)' : '#ffffff',
              color: viewMode === 'curve' ? '#a37a3b' : '#64748b',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <TrendingUp size={13} />
            <span>Cumulative Curve</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('variance')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: viewMode === 'variance' ? 700 : 500,
              borderRadius: 6,
              border: viewMode === 'variance' ? '1px solid #a37a3b' : '1px solid #e2e8f0',
              background: viewMode === 'variance' ? 'rgba(163, 122, 59, 0.1)' : '#ffffff',
              color: viewMode === 'variance' ? '#a37a3b' : '#64748b',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <BarChart3 size={13} />
            <span>Lot Realization</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('categories')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: viewMode === 'categories' ? 700 : 500,
              borderRadius: 6,
              border: viewMode === 'categories' ? '1px solid #a37a3b' : '1px solid #e2e8f0',
              background: viewMode === 'categories' ? 'rgba(163, 122, 59, 0.1)' : '#ffffff',
              color: viewMode === 'categories' ? '#a37a3b' : '#64748b',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Layers size={13} />
            <span>Category Share</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip directly on top of the chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16,
          background: '#faf8f5',
          border: '1px solid var(--border-subtle, #eae5dc)',
          borderRadius: 8,
          padding: '10px 16px'
        }}
      >
        <div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            REALIZED HAMMER TOTAL
          </span>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright, #d97706)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(totalHammer)}
          </div>
        </div>

        <div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AVERAGE HAMMER / LOT
          </span>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(avgLotPrice)}
          </div>
        </div>

        <div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            CLEARANCE RATE
          </span>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', fontFamily: 'var(--font-mono)' }}>
            {clearanceRate.toFixed(1)}% <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>({soldLots.length}/{lots.length} lots)</span>
          </div>
        </div>

        {peakLot && (
          <div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PEAK LOT KNOCKDOWN
            </span>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--gold-primary, #a37a3b)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(peakPrice)}</span>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                Lot #{peakLot.lotNumber}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Canvas Area */}
      {viewMode === 'categories' ? (
        /* Category Share Bar View */
        <div style={{ padding: '14px 6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {categoryStats.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                No category data available to plot.
              </div>
            ) : (
              categoryStats.map((cat, idx) => (
                <div key={cat.category || idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: idx === 0 ? '#d97706' : idx === 1 ? '#38bdf8' : '#10b981' }} />
                      <strong style={{ color: '#1e293b' }}>{cat.category}</strong>
                      <span style={{ fontSize: 11, color: '#64748b' }}>({cat.catalogedLots} lot{cat.catalogedLots === 1 ? '' : 's'})</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(cat.cumulativeValuation)}</span>
                      <strong style={{ color: '#d97706', minWidth: 46, textAlign: 'right' }}>{cat.portfolioShare.toFixed(1)}%</strong>
                    </div>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(2, cat.portfolioShare)}%`,
                        height: '100%',
                        background: idx === 0 ? 'linear-gradient(90deg, #c5a059, #d97706)' : idx === 1 ? 'linear-gradient(90deg, #38bdf8, #0284c7)' : 'linear-gradient(90deg, #10b981, #059669)',
                        borderRadius: 4,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : coordinates.length <= 1 ? (
        /* Empty / Pending Lots state */
        <div
          style={{
            height: 190,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#faf8f5',
            borderRadius: 8,
            border: '1px dashed #cbd5e1'
          }}
        >
          <Gavel size={24} style={{ color: '#94a3b8' }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#475569' }}>
            No completed lot hammer data available yet
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
            Realized lots clerked on Auction Day will dynamically generate the price realization curve.
          </p>
        </div>
      ) : (
        /* Interactive SVG Chart */
        <div className="chart-wrapper-interactive" style={{ position: 'relative', width: '100%' }}>
          <svg
            className="analytics-svg-canvas"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: 'auto', overflow: 'visible', cursor: 'crosshair' }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="dynamicGoldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c5a059" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#c5a059" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#c5a059" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="dynamicGoldLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8c6428" />
                <stop offset="50%" stopColor="#c5a059" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              <filter id="dynamicGoldGlow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#9a7428" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
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
                  x={padding.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="chart-axis-label"
                  style={{ fontSize: 10.5, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
                >
                  {tick.val >= 1000000 ? `$${(tick.val / 1000000).toFixed(1)}M` : tick.val >= 1000 ? `$${Math.round(tick.val / 1000)}k` : `$${tick.val}`}
                </text>
              </g>
            ))}

            {/* Pre-sale Estimate Baseline (Dashed Slate) */}
            <path
              d={paths.base}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.65"
            />

            {/* Area Gradient Fill under Realization curve */}
            <path
              d={paths.area}
              fill="url(#dynamicGoldArea)"
            />

            {/* Main Realization Stroke Line */}
            <path
              d={paths.line}
              fill="none"
              stroke="url(#dynamicGoldLine)"
              strokeWidth="2.8"
              filter="url(#dynamicGoldGlow)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-Axis Tick Marks and Labels */}
            {coordinates.map((pt, idx) => (
              <g key={pt.id || idx}>
                <line
                  x1={pt.x}
                  y1={padding.top + graphHeight}
                  x2={pt.x}
                  y2={padding.top + graphHeight + 5}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={pt.x}
                  y={padding.top + graphHeight + 18}
                  textAnchor="middle"
                  className={`chart-axis-label ${hoveredIdx === idx ? 'active-label' : ''}`}
                  style={{
                    fontSize: 10,
                    fill: hoveredIdx === idx ? '#a37a3b' : '#64748b',
                    fontWeight: hoveredIdx === idx ? 700 : 500
                  }}
                >
                  {pt.label}
                </text>

                {/* Point Markers */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIdx === idx ? 6 : pt.isSold ? 4.5 : 3}
                  fill={pt.isSold ? '#d97706' : '#94a3b8'}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                />

                {/* Latest sold point pulse animation */}
                {idx === coordinates.length - 1 && pt.isSold && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={9}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={1.5}
                    opacity="0.5"
                    className="point-pulse"
                  />
                )}
              </g>
            ))}

            {/* Hover vertical crosshair line */}
            {activeHover && (
              <line
                x1={activeHover.x}
                y1={padding.top}
                x2={activeHover.x}
                y2={padding.top + graphHeight}
                stroke="#a37a3b"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                pointerEvents="none"
              />
            )}
          </svg>

          {/* Floating Tooltip Box */}
          {activeHover && (
            <div
              className="chart-floating-tooltip"
              style={{
                position: 'absolute',
                left: Math.min(Math.max(activeHover.x - 110, 10), graphWidth - 160),
                top: Math.max(activeHover.y - 120, 10),
                background: '#0c1017',
                color: '#f8fafc',
                border: '1px solid rgba(197, 160, 89, 0.4)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                borderRadius: 8,
                padding: '10px 14px',
                pointerEvents: 'none',
                zIndex: 30,
                minWidth: 220,
                display: 'flex',
                flexDirection: 'column',
                gap: 5
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{activeHover.label}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, background: activeHover.isSold ? 'rgba(5, 150, 105, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: activeHover.isSold ? '#34d399' : '#94a3b8', padding: '1px 5px', borderRadius: 4 }}>
                  {activeHover.isSold ? 'SOLD' : 'CATALOGED'}
                </span>
              </div>

              <div style={{ fontSize: 11.5, color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeHover.title}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {viewMode === 'variance' ? 'Lot Realized:' : 'Cumulative Realized:'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#c5a059' }}>
                  {formatCurrency(viewMode === 'variance' ? activeHover.hammer : activeHover.cumulativeHammer)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10.5, color: '#94a3b8' }}>Pre-Sale Estimate:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#cbd5e1' }}>
                  {formatCurrency(viewMode === 'variance' ? activeHover.estimateLow : activeHover.cumulativeEstimate)}
                </span>
              </div>

              {activeHover.isSold && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 4, marginTop: 2, fontSize: 10.5 }}>
                  <span style={{ color: '#94a3b8' }}>Buyer:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {activeHover.highBidder} ({activeHover.paddle})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Chart Legend Footer */}
          <div className="chart-legend-row" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 18, fontSize: 12, color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 3, background: '#c5a059', borderRadius: 2 }} />
              <span>Realized Hammer ($)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 2, borderTop: '2px dashed #94a3b8' }} />
              <span>Pre-Sale Estimate Baseline ($)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706' }} />
              <span>Knockdown Gavel Point</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
