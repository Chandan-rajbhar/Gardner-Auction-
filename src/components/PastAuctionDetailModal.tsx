import React from 'react';
import { X, Calendar, Clock, MapPin, ShieldCheck, Truck, ExternalLink, BookOpen, FileText } from 'lucide-react';
import type { PastAuction } from '../data/pastCatalogsData';

interface PastAuctionDetailModalProps {
  auction: PastAuction | null;
  onClose: () => void;
  onViewLots: (auction: PastAuction) => void;
}

export const PastAuctionDetailModal: React.FC<PastAuctionDetailModalProps> = ({
  auction,
  onClose,
  onViewLots
}) => {
  if (!auction) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card past-auction-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-titles">
            <span className="modal-tag">ARCHIVED AUCTION DOSSIER · PA LIC. #AY-002004</span>
            <h2 className="modal-title">{auction.title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="past-auction-modal-body">
          {/* Top Banner Row */}
          <div className="past-modal-hero">
            <div className="past-modal-media">
              <img src={auction.image} alt={auction.title} className="past-modal-img" />
              <span className="past-modal-type-badge">{auction.auctionType}</span>
            </div>
            
            <div className="past-modal-quick-meta">
              <div className="quick-meta-pill">
                <span className="pill-lbl">STATUS</span>
                <span className="pill-val status-closed">Concluded / Past Sale</span>
              </div>
              <div className="quick-meta-pill">
                <span className="pill-lbl">TOTAL CATALOGED</span>
                <span className="pill-val">{auction.lotsCount} Catalog Lots</span>
              </div>
              <div className="quick-meta-pill">
                <span className="pill-lbl">AGGREGATE REALIZED</span>
                <span className="pill-val text-gold">{auction.totalRealized}</span>
              </div>
              <div className="quick-meta-pill">
                <span className="pill-lbl">LOGISTICS</span>
                <span className="pill-val">{auction.shipping}</span>
              </div>
            </div>
          </div>

          {/* Schedule & Gallery Details */}
          <div className="past-modal-grid">
            <div className="past-meta-card">
              <div className="meta-card-header">
                <Calendar size={16} className="gold-icon" />
                <h4>Auction Dates &amp; Session Timeline</h4>
              </div>
              <div className="meta-card-body">
                <p><strong>Official Run:</strong> {auction.dateRange}</p>
                <p><strong>Gavel Window:</strong> {auction.scheduleText}</p>
                <div className="meta-highlight-box">
                  <Clock size={14} className="gold-icon" />
                  <span>All floor paddles, internet absentee, and telephone books closed.</span>
                </div>
              </div>
            </div>

            <div className="past-meta-card">
              <div className="meta-card-header">
                <MapPin size={16} className="gold-icon" />
                <h4>Salesroom &amp; Gallery Venue</h4>
              </div>
              <div className="meta-card-body">
                <p className="venue-name">{auction.companyName}</p>
                <p>{auction.address}</p>
                <p>{auction.cityStateZip}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${auction.mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-open-link"
                >
                  <ExternalLink size={13} />
                  <span>View on Google Maps</span>
                </a>
              </div>
            </div>
          </div>

          {/* Catalog Description */}
          <div className="past-modal-section">
            <h4 className="section-title">
              <FileText size={16} className="gold-icon" /> Catalog Overview &amp; Curatorial Statement
            </h4>
            <p className="section-paragraph">{auction.description}</p>
          </div>

          {/* Notices */}
          <div className="past-notices-container">
            <div className="notice-box bidding-notice-box">
              <h5 className="notice-title">Bidding &amp; Settlement Notice:</h5>
              <p className="notice-text">{auction.biddingNotice}</p>
            </div>

            <div className="notice-box auction-notice-box">
              <h5 className="notice-title">Auction Terms &amp; Licensure Notice:</h5>
              <p className="notice-text">{auction.auctionNotice}</p>
            </div>
          </div>

          {/* Compliance & Fiduciary Credentials */}
          <div className="compliance-row">
            <div className="compliance-item">
              <ShieldCheck size={16} className="gold-icon" />
              <span>PA Auctioneer Lic. # AY-002004 · Bonded Sterling $500,000+ Tier A</span>
            </div>
            <div className="compliance-item">
              <Truck size={16} className="gold-icon" />
              <span>Full-Value Transit Insurance &amp; Museum White-Glove Hand-off</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            <span>Close Dossier</span>
          </button>
          <button
            className="btn-gold-action"
            onClick={() => {
              onClose();
              onViewLots(auction);
            }}
          >
            <BookOpen size={16} />
            <span>Browse Catalog Lots ({auction.lotsCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
