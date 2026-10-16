import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Share2,
  Lock,
  Globe,
  MapPin,
  Truck,
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  X,
  RotateCcw,
  Star,
  BookOpen,
  Info,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Award
} from 'lucide-react';
import { resolveLotData } from '../data/pastCatalogsData';
import type { ResolvedLotData } from '../data/pastCatalogsData';

interface LotDetailPageProps {
  lotId: string;
  auctionId?: string;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
  onPlaceBid?: (lot: any) => void;
  onToggleWatchlist?: (lotId: string) => void;
  isWatchlisted?: boolean;
  liveTimeFormatted?: string;
}

export const LotDetailPage: React.FC<LotDetailPageProps> = ({
  lotId,
  auctionId,
  onShowToast,
  onToggleWatchlist,
  isWatchlisted = false
}) => {
  const [data, setData] = useState<ResolvedLotData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isInquiryOpen, setIsInquiryOpen] = useState<boolean>(false);

  // Notice expand toggles (matching Highlander Show More / Show Less pattern)
  const [isBiddingNoticeExpanded, setIsBiddingNoticeExpanded] = useState<boolean>(false);
  const [isAuctionNoticeExpanded, setIsAuctionNoticeExpanded] = useState<boolean>(false);

  // Collapsible section accordions (matching Highlander Information, Auction Information, Terms)
  const [isInfoExpanded, setIsInfoExpanded] = useState<boolean>(true);
  const [isAuctionInfoExpanded, setIsAuctionInfoExpanded] = useState<boolean>(false);
  const [isTermsExpanded, setIsTermsExpanded] = useState<boolean>(false);

  // Inquiry form fields
  const [inquiryName, setInquiryName] = useState<string>('');
  const [inquiryEmail, setInquiryEmail] = useState<string>('');
  const [inquiryNotes, setInquiryNotes] = useState<string>('');

  useEffect(() => {
    const resolved = resolveLotData(lotId, auctionId);
    setData(resolved);
    setSelectedImageIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lotId, auctionId]);

  // Back Navigation handler
  const handleBackToCatalog = () => {
    if (data?.parentAuction?.id) {
      window.location.hash = `#catalog/${data.parentAuction.id}`;
    } else {
      window.location.hash = '#catalogs';
    }
  };

  // Share Lot URL
  const handleShare = () => {
    const currentUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
    }
    onShowToast(
      'success',
      'Lot Link Copied',
      `Direct link for ${data?.lot.lotNumber || 'this lot'} copied to your clipboard.`
    );
  };

  // Contact Auctioneer Form Submit
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryEmail.trim()) {
      onShowToast('warning', 'Email Required', 'Please enter a valid email address.');
      return;
    }

    onShowToast(
      'success',
      'Inquiry Transmitted',
      `Inquiry for ${data?.lot.lotNumber} sent. Senior appraisal staff will contact ${inquiryEmail}.`
    );
    setIsInquiryOpen(false);
    setInquiryName('');
    setInquiryEmail('');
    setInquiryNotes('');
  };

  // Error / Unavailable Lot State
  if (!data || !data.lot) {
    return (
      <div className="lot-detail-page not-found-page">
        <div className="container-fluid">
          <div className="lot-error-card">
            <div className="error-badge">
              <RotateCcw size={18} className="gold-icon" />
              <span>ARCHIVAL RECORD UNLOCATED</span>
            </div>
            <h1 className="error-title">Lot Not Found</h1>
            <p className="error-description">
              The requested lot record with ID <strong>"{lotId}"</strong> does not exist in our historical archive.
            </p>
            <div className="error-actions-group">
              <a href="#catalogs" className="btn-back-catalogs-gold">
                <ArrowLeft size={16} />
                <span>Return to Past Catalogs</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { lot, parentAuction, prevLot, nextLot, galleryImages } = data;
  const activeImage = galleryImages[selectedImageIndex] || lot.image;

  // Extract clean number from "Lot 402" -> "402"
  const lotNumberNumeric = lot.lotNumber.replace(/[^0-9]/g, '') || lot.lotNumber;

  return (
    <div className="highlander-lot-detail-page">
      {/* 1. Top Breadcrumbs / Back Navigation Bar */}
      <section className="hibid-top-nav-bar">
        <div className="container-fluid">
          <div className="hibid-top-nav-inner">
            <button
              type="button"
              className="hibid-back-btn large"
              onClick={handleBackToCatalog}
              title="Return to the auction catalog"
            >
              <ArrowLeft size={18} />
              <span>Back to Catalog</span>
            </button>

            <nav className="hibid-breadcrumbs" aria-label="Breadcrumb">
              <a href="#auctions" className="hibid-crumb-link">Home</a>
              <span className="hibid-crumb-separator">/</span>
              <a href="#catalogs" className="hibid-crumb-link">Past Catalogs</a>
              {parentAuction && (
                <>
                  <span className="hibid-crumb-separator">/</span>
                  <a href={`#catalog/${parentAuction.id}`} className="hibid-crumb-link" title={parentAuction.title}>
                    {parentAuction.title.length > 40 ? `${parentAuction.title.slice(0, 40)}...` : parentAuction.title}
                  </a>
                </>
              )}
              <span className="hibid-crumb-separator">/</span>
              <span className="hibid-crumb-current">Lot {lotNumberNumeric}</span>
            </nav>
          </div>
        </div>
      </section>

      {/* 2. Main Lot Container */}
      <section className="hibid-main-lot-section">
        <div className="container-fluid">
          {/* Exact Highlander Title Pattern: Lot # : 3 - 1925 Lexington Half Dollar MS-65 */}
          <div className="hibid-lot-header-title-block">
            <h1 className="hibid-lot-title">
              Lot # : {lotNumberNumeric} - {lot.title}
            </h1>
            <div className="hibid-auction-type-line">
              <Globe size={14} className="gold-icon" />
              <span>{parentAuction?.auctionType || 'Online Only Auction'}</span>
            </div>
          </div>

          {/* Upper Section: Two Columns (Left Media Gallery, Right Pricing & Auctioneer Box) */}
          <div className="hibid-two-col-layout">
            {/* LEFT COLUMN: Black Media Frame with Arrow Controls, Overlay, Thumbnails */}
            <div className="hibid-media-col">
              {/* Main Image Frame (Exact Highlander Black Box) */}
              <div className="hibid-main-media-frame">
                <div
                  className="hibid-image-viewport"
                  onClick={() => setIsLightboxOpen(true)}
                  title="Click Main Image for Fullscreen Mode"
                >
                  <img
                    src={activeImage}
                    alt={`${lot.lotNumber} - ${lot.title}`}
                    className="hibid-hero-img"
                  />

                  {/* Left Navigation Arrow (<) */}
                  {galleryImages.length > 1 && (
                    <button
                      type="button"
                      className="hibid-media-arrow-btn left"
                      aria-label="Previous image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) =>
                          prev === 0 ? galleryImages.length - 1 : prev - 1
                        );
                      }}
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}

                  {/* Right Navigation Arrow (>) */}
                  {galleryImages.length > 1 && (
                    <button
                      type="button"
                      className="hibid-media-arrow-btn right"
                      aria-label="Next image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) =>
                          prev === galleryImages.length - 1 ? 0 : prev + 1
                        );
                      }}
                    >
                      <ChevronRight size={22} />
                    </button>
                  )}

                  {/* Bottom Title Bar Overlay (Exact Highlander pattern) */}
                  <div className="hibid-media-bottom-overlay">
                    <span>{lot.title}</span>
                  </div>
                </div>

                {/* Thumbnails Row (Exact Highlander pattern) */}
                {galleryImages.length > 1 && (
                  <div className="hibid-thumbnails-row">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`hibid-thumb-item ${selectedImageIndex === idx ? 'active-thumb' : ''}`}
                        onClick={() => setSelectedImageIndex(idx)}
                        title={`Select view ${idx + 1}`}
                      >
                        <img src={img} alt={`View ${idx + 1}`} className="hibid-thumb-img" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Highlander Centered Fullscreen Prompt Text */}
                <p className="hibid-fullscreen-prompt-text">
                  Click Main Image for Fullscreen Mode
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Price Realized, Status, Location, Auctioneer Info, Actions */}
            <div className="hibid-info-col">
              <div className="hibid-info-card">
                {/* Watchlist Star Toggle (Top Right) */}
                <div className="hibid-star-row">
                  <button
                    type="button"
                    className="hibid-star-btn"
                    onClick={() => onToggleWatchlist && onToggleWatchlist(lot.id)}
                    title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    aria-label="Watchlist toggle"
                  >
                    <Star
                      size={22}
                      className={isWatchlisted ? 'gold-star active' : 'empty-star'}
                      fill={isWatchlisted ? '#cba135' : 'none'}
                    />
                  </button>
                </div>

                {/* Price Realized Heading (Exact Highlander pattern) */}
                <div className="hibid-price-realized-block">
                  <h2 className="hibid-price-realized-text">
                    Price Realized: <span className="hibid-price-val text-gold">{lot.priceRealized}</span>
                  </h2>
                </div>

                {/* Status Bar */}
                <div className="hibid-status-row">
                  <div className="hibid-status-badge closed">
                    <Lock size={12} className="closed-icon" />
                    <span>Closed</span>
                  </div>
                </div>

                {/* Shipping Available with Truck Icon */}
                <div className="hibid-meta-spec-row shipping-row">
                  <Truck size={17} className="hibid-blue-icon" />
                  <span className="hibid-meta-spec-text">{lot.shipping || 'Shipping Available'}</span>
                </div>

                {/* Location with MapPin Link */}
                <div className="hibid-meta-spec-row">
                  <MapPin size={16} className="hibid-meta-icon" />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parentAuction?.mapQuery || lot.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hibid-location-link"
                    title="View location in Google Maps"
                  >
                    <span>{parentAuction?.cityStateZip || lot.location}</span>
                    <ExternalLink size={12} className="external-icon" />
                  </a>
                </div>

                {/* Auction Dates with Calendar Icon */}
                <div className="hibid-meta-spec-row">
                  <Calendar size={16} className="hibid-meta-icon" />
                  <span className="hibid-dates-text">
                    {parentAuction?.dateRange || `Date Sold: ${lot.dateSold}`}
                  </span>
                </div>

                {/* Thin Horizontal Divider (Exact Highlander pattern) */}
                <hr className="hibid-divider" />

                {/* Auctioneer Information Box */}
                <div className="hibid-auctioneer-box">
                  <h3 className="hibid-auctioneer-heading">Auctioneer Information</h3>

                  {parentAuction ? (
                    <a
                      href={`#auction/${parentAuction.id}`}
                      className="hibid-auctioneer-company-link"
                      title="View complete auction details"
                    >
                      {parentAuction.companyName || lot.auctionHouse}
                    </a>
                  ) : (
                    <span className="hibid-auctioneer-company-name">
                      {lot.auctionHouse}
                    </span>
                  )}

                  <div className="hibid-auctioneer-phone-row">
                    <Phone size={14} className="gold-icon" />
                    <a href="tel:4125550199" className="hibid-phone-link">
                      +1 (412) 555-0199
                    </a>
                  </div>

                  <button
                    type="button"
                    className="hibid-contact-auctioneer-btn"
                    onClick={() => setIsInquiryOpen(true)}
                  >
                    <Mail size={15} />
                    <span>Contact Auctioneer</span>
                  </button>
                </div>

                {/* Action Buttons: Catalog & Share (Exact Highlander pattern) */}
                <div className="hibid-action-buttons-row">
                  <button
                    type="button"
                    className="hibid-btn-catalog"
                    onClick={handleBackToCatalog}
                    title="Browse all lots in this catalog"
                  >
                    <BookOpen size={16} />
                    <span>Catalog</span>
                  </button>

                  <button
                    type="button"
                    className="hibid-btn-share"
                    onClick={handleShare}
                    title="Share lot direct link"
                  >
                    <Share2 size={16} />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Below Upper Section: Full-Width Notices & Collapsible Information Sections */}
          <div className="hibid-full-width-dossier-section">
            {/* Bidding Notice Card (Exact Highlander Red Label pattern) */}
            {parentAuction?.biddingNotice && (
              <div className="hibid-notice-card bidding-notice">
                <p className="hibid-notice-text">
                  <strong className="hibid-notice-label">Bidding Notice:</strong>{' '}
                  {isBiddingNoticeExpanded
                    ? parentAuction.biddingNotice
                    : `${parentAuction.biddingNotice.slice(0, 220)}... `}
                  <button
                    type="button"
                    className="hibid-notice-toggle-btn"
                    onClick={() => setIsBiddingNoticeExpanded(!isBiddingNoticeExpanded)}
                  >
                    {isBiddingNoticeExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </p>
              </div>
            )}

            {/* Auction Notice Card (Exact Highlander Red Label pattern) */}
            {parentAuction?.auctionNotice && (
              <div className="hibid-notice-card auction-notice">
                <p className="hibid-notice-text">
                  <strong className="hibid-notice-label">Auction Notice:</strong>{' '}
                  {isAuctionNoticeExpanded
                    ? parentAuction.auctionNotice
                    : `${parentAuction.auctionNotice.slice(0, 220)}... `}
                  <button
                    type="button"
                    className="hibid-notice-toggle-btn"
                    onClick={() => setIsAuctionNoticeExpanded(!isAuctionNoticeExpanded)}
                  >
                    {isAuctionNoticeExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </p>
              </div>
            )}

            {/* Collapsible Accordion 1: Information (Expanded by default) */}
            <div className="hibid-accordion-panel">
              <button
                type="button"
                className="hibid-accordion-header"
                onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                aria-expanded={isInfoExpanded}
              >
                <div className="accordion-title-wrap">
                  <Info size={17} className="gold-icon" />
                  <span className="accordion-title-text">Information</span>
                </div>
                {isInfoExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {isInfoExpanded && (
                <div className="hibid-accordion-body">
                  <div className="hibid-lot-spec-header-meta">
                    <span className="spec-meta-badge">Lot #{lotNumberNumeric}</span>
                    <span className="spec-meta-badge department-badge">{lot.department}</span>
                    <span className="spec-meta-badge category-badge">{lot.categoryTag}</span>
                  </div>

                  <h3 className="spec-lot-title">{lot.title}</h3>
                  <p className="spec-lead-desc">{lot.description}</p>

                  <div className="spec-details-block">
                    <h4 className="spec-sub-heading">
                      <FileText size={15} className="gold-icon" /> Description &amp; Catalog Specifications
                    </h4>
                    <p className="spec-body-paragraph">{lot.details}</p>

                    {lot.dimensions && (
                      <div className="spec-callout-line">
                        <strong>Dimensions / Measurements:</strong> {lot.dimensions}
                      </div>
                    )}
                  </div>

                  {lot.provenance && (
                    <div className="spec-details-block">
                      <h4 className="spec-sub-heading">
                        <Award size={15} className="gold-icon" /> Provenance &amp; Chain of Custody
                      </h4>
                      <p className="spec-body-paragraph">{lot.provenance}</p>
                    </div>
                  )}

                  {lot.conditionReport && (
                    <div className="spec-details-block">
                      <h4 className="spec-sub-heading">
                        <CheckCircle2 size={15} className="gold-icon" /> Specialist Condition Report
                      </h4>
                      <p className="spec-body-paragraph">{lot.conditionReport}</p>
                      {lot.specialistNote && (
                        <div className="spec-specialist-note">
                          <strong>Specialist Note:</strong> {lot.specialistNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Accordion 2: Auction Information */}
            <div className="hibid-accordion-panel">
              <button
                type="button"
                className="hibid-accordion-header"
                onClick={() => setIsAuctionInfoExpanded(!isAuctionInfoExpanded)}
                aria-expanded={isAuctionInfoExpanded}
              >
                <div className="accordion-title-wrap">
                  <Calendar size={17} className="gold-icon" />
                  <span className="accordion-title-text">Auction Information</span>
                </div>
                {isAuctionInfoExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {isAuctionInfoExpanded && (
                <div className="hibid-accordion-body">
                  {parentAuction && (
                    <div className="auction-info-content-grid">
                      <div className="auction-info-item">
                        <span className="info-item-label">Auction Title:</span>
                        <a href={`#auction/${parentAuction.id}`} className="info-item-link">
                          {parentAuction.title}
                        </a>
                      </div>

                      <div className="auction-info-item">
                        <span className="info-item-label">Auction Dates:</span>
                        <span className="info-item-val">{parentAuction.dateRange}</span>
                      </div>

                      <div className="auction-info-item">
                        <span className="info-item-label">Gavel &amp; Schedule Window:</span>
                        <span className="info-item-val">{parentAuction.scheduleText}</span>
                      </div>

                      <div className="auction-info-item">
                        <span className="info-item-label">Gallery Venue &amp; Preview:</span>
                        <span className="info-item-val">
                          {parentAuction.address}, {parentAuction.cityStateZip}
                        </span>
                      </div>

                      <div className="auction-info-item">
                        <span className="info-item-label">Buyer's Premium:</span>
                        <span className="info-item-val">
                          15% Standard Gavel Premium included in final realized price
                        </span>
                      </div>

                      <div className="auction-info-item">
                        <span className="info-item-label">Insured Shipping &amp; Transit:</span>
                        <span className="info-item-val">
                          {parentAuction.shipping} via certified fine-art courier handlers
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Accordion 3: Terms and Conditions */}
            <div className="hibid-accordion-panel">
              <button
                type="button"
                className="hibid-accordion-header"
                onClick={() => setIsTermsExpanded(!isTermsExpanded)}
                aria-expanded={isTermsExpanded}
              >
                <div className="accordion-title-wrap">
                  <ShieldCheck size={17} className="gold-icon" />
                  <span className="accordion-title-text">Terms and Conditions</span>
                </div>
                {isTermsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {isTermsExpanded && (
                <div className="hibid-accordion-body">
                  <div className="terms-content-block">
                    <p>
                      <strong>Licensure &amp; Fiduciary Warranty:</strong> All auction sales conducted under Commonwealth of Pennsylvania Auctioneer License # AY-002004. Gardner Auction Appraisers guarantees 100% legal title and authenticity under bonded appraisal fiduciary warranty.
                    </p>
                    <p>
                      <strong>Payment &amp; Settlement:</strong> Electronic settlement invoices were rendered to successful bidders within 24 hours of session adjournment. Acceptable tender includes certified wire transfer, cashier's check, and approved card transactions. Standard 15% Buyer's Premium is reflected in all published realized prices.
                    </p>
                    <p>
                      <strong>Fulfillment &amp; Courier Transit:</strong> All fine-art, numismatic, jewelry, and estate silver lots are dispatched under full-value transit insurance via armored and certified fine-art courier handlers. In-person gallery collection conducted under photo identification verification.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Lot-to-Lot Navigation Strip at Bottom */}
          <div className="hibid-bottom-lot-nav-strip">
            {prevLot ? (
              <a
                href={`#lot/${prevLot.id}`}
                className="hibid-lot-nav-arrow-btn prev"
                title={`Previous Lot: ${prevLot.lotNumber}`}
              >
                <ChevronLeft size={16} />
                <span>Previous Lot ({prevLot.lotNumber})</span>
              </a>
            ) : (
              <div className="nav-spacer"></div>
            )}

            <button
              type="button"
              className="hibid-return-catalog-center-btn large"
              onClick={handleBackToCatalog}
              title="Return to Catalog"
            >
              <ArrowLeft size={18} />
              <span>Back to Catalog</span>
            </button>

            {nextLot ? (
              <a
                href={`#lot/${nextLot.id}`}
                className="hibid-lot-nav-arrow-btn next"
                title={`Next Lot: ${nextLot.lotNumber}`}
              >
                <span>Next Lot ({nextLot.lotNumber})</span>
                <ChevronRight size={16} />
              </a>
            ) : (
              <div className="nav-spacer"></div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Fullscreen Lightbox Modal (Click Main Image for Fullscreen Mode) */}
      {isLightboxOpen && (
        <div
          className="lightbox-overlay"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div className="lightbox-title-box">
                <span className="lightbox-tag">Lot #{lotNumberNumeric} · FULLSCREEN MODE</span>
                <h3 className="lightbox-title">{lot.title}</h3>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close fullscreen"
              >
                <X size={22} />
              </button>
            </div>

            <div className="lightbox-image-frame">
              <img
                src={activeImage}
                alt={`${lot.lotNumber} Fullscreen`}
                className="lightbox-img"
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="lightbox-nav-btn prev"
                    onClick={() => {
                      setSelectedImageIndex((prev) =>
                        prev === 0 ? galleryImages.length - 1 : prev - 1
                      );
                    }}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    className="lightbox-nav-btn next"
                    onClick={() => {
                      setSelectedImageIndex((prev) =>
                        prev === galleryImages.length - 1 ? 0 : prev + 1
                      );
                    }}
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="lightbox-footer-strip">
                <div className="lightbox-thumbs">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`lightbox-thumb-btn ${selectedImageIndex === idx ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} />
                    </button>
                  ))}
                </div>
                <span className="lightbox-counter">
                  Image {selectedImageIndex + 1} of {galleryImages.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Contact Auctioneer Modal */}
      {isInquiryOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsInquiryOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card inquiry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-titles">
                <span className="modal-tag">CONTACT AUCTIONEER · LOT #{lotNumberNumeric}</span>
                <h3 className="modal-title">{lot.title}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsInquiryOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInquirySubmit} className="inquiry-form-body">
              <p className="inquiry-intro-text">
                Send a direct inquiry regarding <strong>{lot.lotNumber}: {lot.title}</strong> to Gardner Auction Appraisers.
              </p>

              <div className="inquiry-input-group">
                <label htmlFor="inq-name" className="inquiry-label">Your Name</label>
                <input
                  id="inq-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  className="inquiry-input"
                />
              </div>

              <div className="inquiry-input-group">
                <label htmlFor="inq-email" className="inquiry-label">
                  Email Address <span className="text-gold">*</span>
                </label>
                <input
                  id="inq-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  className="inquiry-input"
                />
              </div>

              <div className="inquiry-input-group">
                <label htmlFor="inq-notes" className="inquiry-label">Message / Inquiry</label>
                <textarea
                  id="inq-notes"
                  rows={3}
                  placeholder="Questions regarding condition, provenance, or settlement..."
                  value={inquiryNotes}
                  onChange={(e) => setInquiryNotes(e.target.value)}
                  className="inquiry-textarea"
                />
              </div>

              <div className="inquiry-form-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsInquiryOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
