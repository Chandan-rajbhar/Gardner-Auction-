import React from 'react';
import { X, ShieldCheck, CheckCircle2, FileText, Info, Award, Lock } from 'lucide-react';
import type { PastLotItem } from '../data/pastCatalogsData';

interface PastLotDetailModalProps {
  lot: PastLotItem | null;
  onClose: () => void;
}

export const PastLotDetailModal: React.FC<PastLotDetailModalProps> = ({
  lot,
  onClose
}) => {
  if (!lot) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card lot-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-titles">
            <span className="modal-tag">{lot.lotNumber} · ARCHIVED SPECIMEN DOSSIER</span>
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
                <div className="specimen-closed-ribbon">
                  <Lock size={12} />
                  <span>CLOSED · REALIZED</span>
                </div>
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

              {/* Price Realized Historical Box */}
              <div className="detail-bid-widget past-realized-widget">
                <div className="bid-widget-stats">
                  <div>
                    <span className="widget-label">PRICE REALIZED (HAMMER + PREMIUM)</span>
                    <span className="widget-value text-gold">{lot.priceRealized}</span>
                  </div>
                  <div>
                    <span className="widget-label">ESTIMATE RANGE</span>
                    <span className="widget-value-sm">
                      ${lot.estimateLow.toLocaleString()} – ${lot.estimateHigh.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="widget-label">DATE SOLD</span>
                    <span className="widget-value-sm text-white">{lot.dateSold}</span>
                  </div>
                </div>

                <div className="past-sale-attribution">
                  <div className="attribution-row">
                    <span className="attr-lbl">Auction:</span>
                    <span className="attr-val">{lot.auctionTitle}</span>
                  </div>
                  <div className="attribution-row">
                    <span className="attr-lbl">Recorded Floor &amp; Webcast Bids:</span>
                    <span className="attr-val">{lot.bidsCount} competitive bids</span>
                  </div>
                  <div className="attribution-row">
                    <span className="attr-lbl">Auctioneer &amp; Location:</span>
                    <span className="attr-val">{lot.auctionHouse} · {lot.location}</span>
                  </div>
                  <div className="attribution-row">
                    <span className="attr-lbl">Fulfillment:</span>
                    <span className="attr-val">{lot.shipping} · Insured Transit</span>
                  </div>
                </div>
              </div>

              {/* Structured Sections */}
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
                  {lot.specialistNote && (
                    <p className="specialist-note"><strong>Specialist Note:</strong> {lot.specialistNote}</p>
                  )}
                </div>

                <div className="detail-section-block">
                  <h4 className="detail-section-heading">
                    <Award size={15} /> Title &amp; Guarantee Verification
                  </h4>
                  <p>
                    100% Guaranteed authentic under Gardner Auction Appraisers Fiduciary Warranty.
                    All lots transferred with clear title and documented bill of sale pursuant to the Commonwealth of Pennsylvania Auctioneer Licensing Act.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            <span>Close Specimen File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
