import React, { useState } from 'react';
import { ShieldCheck, Info, X, Clock, AlertTriangle } from 'lucide-react';

interface AntiSnipingBadgeProps {
  isEnabled: boolean;
  autoExtendCount: number;
  secondsRemaining: number;
}

export const AntiSnipingBadge: React.FC<AntiSnipingBadgeProps> = ({
  isEnabled,
  autoExtendCount,
  secondsRemaining
}) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  if (!isEnabled) {
    return null;
  }

  const isWithinWindow = secondsRemaining > 0 && secondsRemaining <= 120;

  return (
    <div className="cap-antisniping-wrapper">
      <div className="cap-antisniping-badge-row">
        <button
          type="button"
          className={`cap-antisniping-badge ${isWithinWindow ? 'active-window' : ''}`}
          onClick={() => setShowTooltip(!showTooltip)}
          title="Click to view Anti-Sniping & Soft Close rules"
          aria-expanded={showTooltip}
        >
          <span className="cap-antisniping-dot"></span>
          <ShieldCheck size={13} className="cap-antisniping-icon" />
          <span className="cap-antisniping-label">
            Auto-Extend ON
          </span>
          {autoExtendCount > 0 && (
            <span className="cap-extend-counter">
              Extended {autoExtendCount}x
            </span>
          )}
          <Info size={12} className="cap-info-icon" />
        </button>

        {isWithinWindow && (
          <div className="cap-softclose-alert-pill">
            <AlertTriangle size={12} />
            <span>Soft-Close Active (&lt; 2m)</span>
          </div>
        )}
      </div>

      {/* Explanatory Tooltip Popover */}
      {showTooltip && (
        <div className="cap-antisniping-popover" role="dialog" aria-label="Anti-sniping explanation">
          <div className="cap-popover-header">
            <div className="cap-popover-title">
              <Clock size={14} className="cap-gold-icon" />
              <span>Anti-Sniping &amp; Soft-Close Protocol</span>
            </div>
            <button
              type="button"
              className="cap-popover-close"
              onClick={() => setShowTooltip(false)}
              aria-label="Close anti-sniping explanation"
            >
              <X size={14} />
            </button>
          </div>

          <div className="cap-popover-body">
            <p>
              To ensure all floor, phone, and webcast bidders have equal opportunity to counter competing bids:
            </p>
            <ul className="cap-popover-list">
              <li>
                <strong>2-Minute Trigger Window:</strong> Any verified bid accepted with less than 2 minutes remaining will automatically extend the closing time by an additional <strong>2 minutes (120 seconds)</strong>.
              </li>
              <li>
                <strong>Server-Authoritative Clock:</strong> All extensions are executed atomically on the auction server and synchronized across all live terminals.
              </li>
              <li>
                <strong>No Last-Second Sniping:</strong> Protects legitimate bidders from automated bot manipulation and network latency disadvantages.
              </li>
            </ul>
            <div className="cap-popover-footer">
              <span>Standard PA Auction House Rule · PA Lic. # AY-002004</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
