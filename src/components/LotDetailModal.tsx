import React from 'react';
import { X, Zap, Bookmark, ShieldCheck, CheckCircle2, Clock, FileText, Info } from 'lucide-react';
import type { LotItem } from '../data/auctionData';

interface LotDetailModalProps {
  lot: LotItem | null;
  timeRemaining: string;
  isWatchlisted: boolean;
  onToggleWatchlist: (lotId: string) => void;
  onPlaceBid: (lot: LotItem) => void;
  onClose: () => void;
}

export const LotDetailModal: React.FC<LotDetailModalProps> = ({
  lot,
  timeRemaining,
  isWatchlisted,
  onToggleWatchlist,
  onPlaceBid,
  onClose
}) => {
  if (!lot) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card lot-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-titles">
            <span className="modal-tag">{lot.lotNumber} · SPECIMEN DOSSIER</span>
            <h2 className="modal-title">{lot.title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="lot-detail-body">
          <div className="lot-detail-layout">
            {/* Left: Specimen Media */}
            <div className="lot-detail-media-pane">
              <div className="detail-image-frame">
                <img src={lot.image} alt={lot.title} className="detail-main-img" />
              </div>
              <div className="detail-media-caption">
                <ShieldCheck size={14} className="gold-icon" />
                <span>Certified Original Authentic Specimen · Photographed under calibrated 5000K daylight</span>
              </div>
            </div>

            {/* Right: Specimen Information */}
            <div className="lot-detail-info-pane">
              <div className="detail-category-badge">{lot.categoryTag}</div>
              <h3 className="detail-item-title">{lot.title}</h3>
              <p className="detail-lead-desc">{lot.description}</p>

              {/* Bidding Quick Widget */}
              <div className="detail-bid-widget">
                <div className="bid-widget-stats">
                  <div>
                    <span className="widget-label">CURRENT HIGH BID</span>
                    <span className="widget-value">${lot.currentBid.toLocaleString()}.00</span>
                  </div>
                  <div>
                    <span className="widget-label">ESTIMATE RANGE</span>
                    <span className="widget-value-sm">${lot.estimateLow.toLocaleString()} – ${lot.estimateHigh.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="widget-label">TIME REMAINING</span>
                    <div className="widget-timer">
                      <Clock size={14} />
                      <span>{timeRemaining}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-widget-actions">
                  <button
                    className="btn-place-bid-gold full-w"
                    onClick={() => {
                      onClose();
                      onPlaceBid(lot);
                    }}
                  >
                    <Zap size={18} />
                    <span>BID NOW (${lot.nextBid.toLocaleString()})</span>
                  </button>

                  <button
                    className={`btn-watchlist-toggle ${isWatchlisted ? 'active' : ''}`}
                    onClick={() => onToggleWatchlist(lot.id)}
                    title="Toggle Watchlist"
                  >
                    <Bookmark size={18} fill={isWatchlisted ? "#cba135" : "none"} />
                  </button>
                </div>
              </div>

              {/* Tabbed / Structured Sections */}
              <div className="detail-text-sections">
                <div className="detail-section-block">
                  <h4 className="detail-section-heading">
                    <Info size={15} /> Catalog Description &amp; Specifications
                  </h4>
                  <p>{lot.details}</p>
                  {lot.dimensions && (
                    <p className="detail-dimensions"><strong>Specifications:</strong> {lot.dimensions}</p>
                  )}
                </div>

                <div className="detail-section-block">
                  <h4 className="detail-section-heading">
                    <FileText size={15} /> Provenance &amp; Chain of Custody
                  </h4>
                  <p>{lot.provenance}</p>
                </div>

                <div className="detail-section-block">
                  <h4 className="detail-section-heading">
                    <CheckCircle2 size={15} /> Specialist Condition Report
                  </h4>
                  <p>{lot.conditionReport}</p>
                  <p className="specialist-note"><strong>Specialist Note:</strong> {lot.specialistNote}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
