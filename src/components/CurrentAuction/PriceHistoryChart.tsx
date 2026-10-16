import React, { useState, useMemo } from 'react';
import { TrendingUp, Table, Eye, CheckCircle2 } from 'lucide-react';
import type { BidRecord } from './types';

interface PriceHistoryChartProps {
  bids: BidRecord[];
  startingBid: number;
  estimateLow: number;
  estimateHigh: number;
  currencySymbol?: string;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  bids,
  startingBid,
  estimateLow,
  estimateHigh,
  currencySymbol = '$'
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    amount: number;
    timestamp: string;
    bidderMasked: string;
    origin: string;
    x: number;
    y: number;
    index: number;
  } | null>(null);

  const [showTableView, setShowTableView] = useState<boolean>(false);

  // Chronological chronological sequence from starting bid to current bid
  const chartData = useMemo(() => {
    if (!bids || bids.length === 0) {
      return [];
    }

    // Sort chronologically ascending for the timeline
    const chronologicalBids = [...bids].reverse();

    // Prepend starting bid baseline
    const points = [
      {
        amount: startingBid,
        timestamp: 'Starting Call',
        bidderMasked: 'Auction Floor Opening',
        origin: 'floor',
        timeSecondsAgo: 1800
      },
      ...chronologicalBids
    ];

    return points;
  }, [bids, startingBid]);

  // Dimensions & bounds
  const width = 640;
  const height = 240;
  const padding = { top: 25, right: 35, bottom: 40, left: 65 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Min and max scales
  const { minVal, maxVal, coordinates } = useMemo(() => {
    if (chartData.length === 0) {
      return { minVal: 0, maxVal: 1, coordinates: [] };
    }

    const allValues = [
      ...chartData.map((d) => d.amount),
      estimateLow,
      estimateHigh
    ];

    const min = Math.min(...allValues) * 0.95;
    const max = Math.max(...allValues) * 1.05;

    const coords = chartData.map((point, index) => {
      const x =
        chartData.length === 1
          ? padding.left + innerWidth / 2
          : padding.left + (index / (chartData.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - ((point.amount - min) / (max - min)) * innerHeight;
      return { ...point, x, y };
    });

    return { minVal: min, maxVal: max, coordinates: coords };
  }, [chartData, estimateLow, estimateHigh, innerWidth, innerHeight, padding.left, padding.top]);

  // SVG Stepped Path & Area Path
  const { steppedPath, areaPath } = useMemo(() => {
    if (coordinates.length === 0) return { steppedPath: '', areaPath: '' };

    let lineD = `M ${coordinates[0].x} ${coordinates[0].y}`;
    for (let i = 1; i < coordinates.length; i++) {
      const curr = coordinates[i];
      // Stepped horizontal then vertical
      lineD += ` H ${curr.x} V ${curr.y}`;
    }

    const first = coordinates[0];
    const bottomY = padding.top + innerHeight;
    const areaD = `${lineD} V ${bottomY} H ${first.x} Z`;

    return { steppedPath: lineD, areaPath: areaD };
  }, [coordinates, innerHeight, padding.top]);

  // Y-axis tick intervals
  const yTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const count = 4;
    const ticks: number[] = [];
    const step = (maxVal - minVal) / count;
    for (let i = 0; i <= count; i++) {
      ticks.push(minVal + step * i);
    }
    return ticks;
  }, [minVal, maxVal, chartData.length]);

  // Estimate range band Y positions
  const estimateBandYLow = padding.top + innerHeight - ((estimateLow - minVal) / (maxVal - minVal)) * innerHeight;
  const estimateBandYHigh = padding.top + innerHeight - ((estimateHigh - minVal) / (maxVal - minVal)) * innerHeight;

  if (chartData.length <= 1) {
    return (
      <div className="cap-chart-card cap-chart-empty">
        <div className="cap-chart-header">
          <div className="cap-chart-title">
            <TrendingUp size={16} className="cap-gold-icon" />
            <h4>Real-Time Price Progression</h4>
          </div>
        </div>
        <div className="cap-chart-empty-state">
          <p>Price history chart will populate dynamically as bidding floor activity commences.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cap-chart-card">
      {/* Chart Header */}
      <div className="cap-chart-header">
        <div className="cap-chart-title">
          <TrendingUp size={16} className="cap-gold-icon" />
          <h4>Auction Price Progression Chart</h4>
          <span className="cap-chart-badge">{bids.length} Accepted Bids</span>
        </div>

        <div className="cap-chart-actions">
          <button
            type="button"
            className={`cap-chart-toggle-btn ${showTableView ? 'active' : ''}`}
            onClick={() => setShowTableView(!showTableView)}
            title="Toggle between SVG chart view and accessible table view"
            aria-label="Toggle accessible tabular view"
          >
            {showTableView ? <Eye size={13} /> : <Table size={13} />}
            <span>{showTableView ? 'Chart View' : 'Table View'}</span>
          </button>
        </div>
      </div>

      {showTableView ? (
        /* Accessible Tabular View */
        <div className="cap-chart-table-wrap">
          <table className="cap-chart-table" aria-label="Bid Price Progression Data Table">
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Accepted Bid</th>
                <th scope="col">Time</th>
                <th scope="col">Bidder / Paddle</th>
                <th scope="col">Channel</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((pt, i) => (
                <tr key={i}>
                  <td>#{i}</td>
                  <td className="cap-td-price">
                    {currencySymbol}{pt.amount.toLocaleString()}
                  </td>
                  <td>{pt.timestamp}</td>
                  <td>{pt.bidderMasked}</td>
                  <td>
                    <span className={`cap-table-tag ${pt.origin}`}>
                      {pt.origin.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visual Interactive SVG Chart */
        <div className="cap-svg-chart-container">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="cap-price-svg"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Price progression graph showing accepted bids from starting price to current highest bid"
          >
            <defs>
              {/* Subtle gold area fill gradient */}
              <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cba135" stopOpacity="0.32" />
                <stop offset="70%" stopColor="#cba135" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#cba135" stopOpacity="0.0" />
              </linearGradient>

              {/* Estimate Band Pattern */}
              <pattern id="estStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(203, 161, 53, 0.12)" strokeWidth="1.5" />
              </pattern>
            </defs>

            {/* Specialist Estimate Corridor Band */}
            {estimateBandYHigh > 0 && estimateBandYLow > estimateBandYHigh && (
              <g className="cap-estimate-band-group">
                <rect
                  x={padding.left}
                  y={estimateBandYHigh}
                  width={innerWidth}
                  height={estimateBandYLow - estimateBandYHigh}
                  fill="url(#estStripe)"
                />
                <line
                  x1={padding.left}
                  y1={estimateBandYHigh}
                  x2={padding.left + innerWidth}
                  y2={estimateBandYHigh}
                  stroke="rgba(203, 161, 53, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <line
                  x1={padding.left}
                  y1={estimateBandYLow}
                  x2={padding.left + innerWidth}
                  y2={estimateBandYLow}
                  stroke="rgba(203, 161, 53, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <text
                  x={padding.left + 8}
                  y={estimateBandYHigh + 12}
                  fill="rgba(203, 161, 53, 0.85)"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  HIGH ESTIMATE {currencySymbol}{estimateHigh.toLocaleString()}
                </text>
              </g>
            )}

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {yTicks.map((val, idx) => {
              const y = padding.top + innerHeight - ((val - minVal) / (maxVal - minVal)) * innerHeight;
              return (
                <g key={idx} className="cap-chart-grid-line">
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + innerWidth}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#8d92a0"
                    fontSize="10"
                    fontFamily="sans-serif"
                  >
                    {currencySymbol}{Math.round(val).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={areaPath} fill="url(#goldAreaGrad)" />

            {/* Stepped Progression Stroke */}
            <path
              d={steppedPath}
              fill="none"
              stroke="#cba135"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Data Points on vertices */}
            {coordinates.map((pt, i) => {
              const isCurrent = i === coordinates.length - 1;
              const isHovered = hoveredPoint?.index === i;

              return (
                <g key={i} className="cap-data-point-group">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isCurrent ? 5.5 : isHovered ? 5 : 3.5}
                    fill={isCurrent ? '#dfba52' : '#cba135'}
                    stroke="#0c0e12"
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                    className={`cap-chart-dot ${isCurrent ? 'current-pulse' : ''}`}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        amount: pt.amount,
                        timestamp: pt.timestamp,
                        bidderMasked: pt.bidderMasked,
                        origin: pt.origin,
                        x: pt.x,
                        y: pt.y,
                        index: i
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}

            {/* Interactive Crosshair & Tooltip when hovered */}
            {hoveredPoint && (
              <g className="cap-crosshair-group">
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={padding.top + innerHeight}
                  stroke="rgba(203, 161, 53, 0.5)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              </g>
            )}

            {/* X-Axis Baseline */}
            <line
              x1={padding.left}
              y1={padding.top + innerHeight}
              x2={padding.left + innerWidth}
              y2={padding.top + innerHeight}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />

            {/* X-Axis labels: First and Last */}
            {coordinates.length > 0 && (
              <>
                <text
                  x={coordinates[0].x}
                  y={padding.top + innerHeight + 18}
                  fill="#787e8f"
                  fontSize="10"
                  textAnchor="start"
                  fontFamily="sans-serif"
                >
                  Opening Call
                </text>
                <text
                  x={coordinates[coordinates.length - 1].x}
                  y={padding.top + innerHeight + 18}
                  fill="#cba135"
                  fontWeight="600"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  Current Bid
                </text>
              </>
            )}
          </svg>

          {/* Floating Crosshair Tooltip */}
          {hoveredPoint && (
            <div
              className="cap-chart-tooltip"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100}%`
              }}
            >
              <div className="cap-tooltip-amount">
                {currencySymbol}{hoveredPoint.amount.toLocaleString()}
              </div>
              <div className="cap-tooltip-bidder">
                {hoveredPoint.bidderMasked}
              </div>
              <div className="cap-tooltip-time">
                {hoveredPoint.timestamp} · {hoveredPoint.origin.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Footer Legend */}
      <div className="cap-chart-footer-legend">
        <div className="cap-legend-item">
          <span className="cap-legend-line gold"></span>
          <span>Accepted Floor &amp; Webcast Bids</span>
        </div>
        <div className="cap-legend-item">
          <span className="cap-legend-line dashed"></span>
          <span>Estimate Range (${estimateLow.toLocaleString()} – ${estimateHigh.toLocaleString()})</span>
        </div>
        <div className="cap-legend-item right">
          <CheckCircle2 size={12} className="cap-green-icon" />
          <span>Real-Time Authoritative Floor Data</span>
        </div>
      </div>
    </div>
  );
};
