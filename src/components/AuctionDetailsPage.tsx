import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Truck,
  Share2,
  ExternalLink,
  BookOpen,
  Lock,
  Globe,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Printer,
  Info,
  DollarSign
} from 'lucide-react';
import { getPastAuctionById } from '../data/pastCatalogsData';
import type { PastLotItem } from '../data/pastCatalogsData';
import { PastLotDetailModal } from './PastLotDetailModal';

interface AuctionDetailsPageProps {
  auctionId: string;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const AuctionDetailsPage: React.FC<AuctionDetailsPageProps> = ({
  auctionId,
  onShowToast
}) => {
  const auction = getPastAuctionById(auctionId);
  const [activeLotModal, setActiveLotModal] = useState<PastLotItem | null>(null);

  // Notice expand toggles (matching Highlander Show More / Show Less pattern)
  const [isBiddingNoticeExpanded, setIsBiddingNoticeExpanded] = useState<boolean>(false);
  const [isAuctionNoticeExpanded, setIsAuctionNoticeExpanded] = useState<boolean>(false);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);

  // Collapsible Accordions state (matching HiBid Auction Details layout)
  const [accordionsOpen, setAccordionsOpen] = useState<{
    info: boolean;
    terms: boolean;
    payment: boolean;
    shipping: boolean;
  }>({
    info: true,
    terms: false,
    payment: false,
    shipping: false
  });

  const toggleAccordion = (key: 'info' | 'terms' | 'payment' | 'shipping') => {
    setAccordionsOpen((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onShowToast('success', 'Link Copied', `Direct archival link for "${auction?.title}" copied to clipboard.`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Error / Not Found State
  if (!auction) {
    return (
      <div className="auction-details-page not-found-page">
        <div className="container-fluid">
          <div className="past-catalogs-empty-state">
            <h2 className="empty-title">Auction Archive Not Found</h2>
            <p className="empty-desc">
              The requested auction catalog for ID "{auctionId}" does not exist in our historical archive.
            </p>
            <a href="#catalogs" className="empty-reset-btn">
              <RotateCcw size={16} />
              <span>Return to Past Catalogs</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auction-details-page">
      {/* 1. Breadcrumbs Navigation Strip */}
      <section className="auction-details-header-strip">
        <div className="container-fluid">
          <div className="auction-details-nav-row">
            <a href="#catalogs" className="btn-back-catalogs large" title="Return to past catalogs directory">
              <ArrowLeft size={18} />
              <span>Back to Past Catalogs</span>
            </a>

            <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
              <a href="#auctions" className="breadcrumb-link">Home</a>
              <span className="breadcrumb-separator">/</span>
              <a href="#catalogs" className="breadcrumb-link">Past Catalogs</a>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{auction.title}</span>
            </nav>
          </div>
        </div>
      </section>

      {/* 2. Main Auction Card (Matching Highlander Gold & Silver / HiBid Layout) */}
      <section className="auction-details-main-section">
        <div className="container-fluid">
          <article className="past-auction-card auction-details-hero-card">
            {/* Header: Title & Auction Type Banner */}
            <header className="past-auction-card-header">
              <div className="header-title-box">
                <h1 className="auction-card-title">{auction.title}</h1>
                <div className="auction-type-strip">
                  <Globe size={13} className="globe-icon" />
                  <span>{auction.auctionType}</span>
                  <span className="strip-divider">·</span>
                  <span className="auction-header-status-badge">
                    <Lock size={12} />
                    <span>Concluded</span>
                  </span>
                </div>
              </div>
              <div className="header-realized-tag">
                <span>Total Realized: <strong>{auction.totalRealized}</strong></span>
              </div>
            </header>

            {/* 3-Column Body: Media, Location & Schedule, Badges */}
            <div className="past-auction-card-body">
              {/* Left Column: Cover Image & Actions */}
              <div className="auction-body-left">
                <div className="auction-img-frame">
                  <img
                    src={auction.image}
                    alt={auction.title}
                    className="auction-featured-img"
                  />
                  <div className="auction-closed-flag">
                    <Lock size={12} />
                    <span>Concluded</span>
                  </div>
                </div>

                <div className="hibid-media-actions-row">
                  <button
                    type="button"
                    className="auction-share-btn"
                    onClick={handlePrint}
                    title="Print auction catalogue"
                  >
                    <Printer size={14} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    className="auction-share-btn"
                    onClick={handleShare}
                    title="Share auction catalog link"
                  >
                    <Share2 size={14} />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Center Column: Company, Location, Schedule & Description */}
              <div className="auction-body-center">
                <h2 className="auction-company-name">{auction.companyName}</h2>

                <div className="auction-location-row">
                  <span className="address-text">{auction.address}</span>
                  <span className="address-text">{auction.cityStateZip}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${auction.mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="auction-map-link"
                    title="Open gallery venue in Google Maps"
                  >
                    <MapPin size={13} />
                    <span>Map</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                <div className="auction-dates-block">
                  <p className="auction-dates-line">
                    <Calendar size={14} className="gold-icon inline-icon" />
                    <strong>Date(s) {auction.dateRange}</strong>
                  </p>
                  <p className="auction-schedule-line">
                    <Clock size={13} className="inline-icon" />
                    <span>{auction.scheduleText}</span>
                  </p>
                </div>

                <div className="auction-description-box">
                  <p className={`auction-desc-text ${isDescExpanded ? 'expanded' : 'clamped'}`}>
                    {auction.description}
                  </p>
                  <button
                    type="button"
                    className="desc-expand-toggle"
                    onClick={() => setIsDescExpanded((prev) => !prev)}
                    aria-expanded={isDescExpanded}
                  >
                    <span>{isDescExpanded ? 'Show Less' : 'Show More'}</span>
                    {isDescExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Right Column: Status, Type & Shipping Badges */}
              <div className="auction-body-right">
                <div className="attribute-badge status-closed-badge">
                  <Lock size={15} className="attr-icon" />
                  <span>Status: <strong>Concluded</strong></span>
                </div>

                <div className="attribute-badge type-badge">
                  <Globe size={15} className="attr-icon" />
                  <span>{auction.auctionType}</span>
                </div>

                <div className="attribute-badge shipping-badge">
                  <Truck size={15} className="attr-icon" />
                  <span>{auction.shipping}</span>
                </div>

                <div className="lots-count-indicator">
                  <BookOpen size={14} className="gold-icon" />
                  <span><strong>{auction.lots.length}</strong> Lots Documented</span>
                </div>

                <div className="realized-total-indicator">
                  <DollarSign size={14} className="gold-icon" />
                  <span>Total Realized: <strong>{auction.totalRealized}</strong></span>
                </div>
              </div>
            </div>

            {/* Prominent Action Button: View Catalog (Matches HiBid Full-Width Primary Action) */}
            <div className="hibid-prominent-action-bar">
              <a
                href={`#catalog/${auction.id}`}
                className="btn-hibid-view-catalog"
                title={`Open catalog lots for ${auction.title}`}
              >
                <BookOpen size={17} />
                <span>View Catalog ({auction.lots.length} Lots)</span>
              </a>
            </div>

            {/* Notices Section: Bidding Notice & Auction Notice (Highlander Red-Label Callouts) */}
            <div className="past-auction-notices-container">
              {/* Bidding Notice */}
              <div className="hibid-notice-card">
                <p className="hibid-notice-text">
                  <strong className="hibid-notice-label">Bidding Notice:</strong>{' '}
                  {isBiddingNoticeExpanded
                    ? auction.biddingNotice
                    : `${auction.biddingNotice.slice(0, 190)}... `}
                  <button
                    type="button"
                    className="hibid-notice-toggle-btn"
                    onClick={() => setIsBiddingNoticeExpanded((prev) => !prev)}
                  >
                    {isBiddingNoticeExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </p>
              </div>

              {/* Auction Notice */}
              <div className="hibid-notice-card">
                <p className="hibid-notice-text">
                  <strong className="hibid-notice-label">Auction Notice:</strong>{' '}
                  {isAuctionNoticeExpanded
                    ? auction.auctionNotice
                    : `${auction.auctionNotice.slice(0, 190)}... `}
                  <button
                    type="button"
                    className="hibid-notice-toggle-btn"
                    onClick={() => setIsAuctionNoticeExpanded((prev) => !prev)}
                  >
                    {isAuctionNoticeExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </p>
              </div>
            </div>
          </article>

          {/* 3. HiBid Collapsible Accordion Dossiers */}
          <div className="hibid-full-width-dossier-section" style={{ marginTop: 24 }}>
            {/* Accordion 1: Auction Information */}
            <div className="hibid-accordion-panel">
              <button
                type="button"
                className="hibid-accordion-header"
                onClick={() => toggleAccordion('info')}
                aria-expanded={accordionsOpen.info}
              >
                <div className="accordion-title-wrap">
                  <Info size={17} className="gold-icon" />
                  <span className="accordion-title-text">Auction Information</span>
                </div>
                {accordionsOpen.info ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {accordionsOpen.info && (
                <div className="hibid-accordion-body">
                  <table className="hibid-info-table">
                    <tbody>
                      <tr>
                        <td className="info-cell-label">Auction Title</td>
                        <td className="info-cell-val">
                          <a href={`#catalog/${auction.id}`} className="info-link-gold">
                            {auction.title}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td className="info-cell-label">Auctioneer / House</td>
                        <td className="info-cell-val">
                          <strong>{auction.companyName}</strong> (PA License #AY-002004)
                        </td>
                      </tr>
                      <tr>
                        <td className="info-cell-label">Auction Type</td>
                        <td className="info-cell-val">{auction.auctionType}</td>
                      </tr>
                      <tr>
                        <td className="info-cell-label">Session Dates</td>
                        <td className="info-cell-val">{auction.dateRange}</td>
                      </tr>
                      <tr>
                        <td className="info-cell-label">Schedule Window</td>
                        <td className="info-cell-val">{auction.scheduleText}</td>
                      </tr>
                      <tr>
                        <td className="info-cell-label">Preview &amp; Location</td>
                        <td className="info-cell-val">
                          {auction.address}, {auction.cityStateZip}
                        </td>
                      </tr>
                      <tr>
                        <td className="info-cell-label">Fiduciary Guarantee</td>
                        <td className="info-cell-val">
                          Bonded Sterling $500,000+ Approved Tier A Surety Guarantee
                        </td>
                      </tr>
                      <tr>
                        <td className="info-cell-label">Curatorial Summary</td>
                        <td className="info-cell-val">{auction.description}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Accordion 2: Terms and Conditions */}
            <div className="hibid-accordion-panel">
              <button
                type="button"
                className="hibid-accordion-header"
                onClick={() => toggleAccordion('terms')}
                aria-expanded={accordionsOpen.terms}
              >
                <div className="accordion-title-wrap">
                  <FileText size={17} className="gold-icon" />
                  <span className="accordion-title-text">Terms and Conditions</span>
                </div>
                {accordionsOpen.terms ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {accordionsOpen.terms && (
                <div className="hibid-accordion-body">
                  <p className="spec-body-paragraph">
                    All lots in this concluded session were cataloged, authenticated, and sold strictly in accordance with Pennsylvania Auctioneers Board statutes and Gardner Auction standard condition criteria.
                  </p>
                  <p className="spec-body-paragraph">
                    Published hammer figures reflect final knock-down gavel transactions plus standard 15% Buyer's Premium. Title passed immediately upon fall of the hammer to the registered winning bidder. All coin and precious metal specimens were authenticated by NGC, PCGS, or certified third-party numismatic graders prior to cataloging.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 3: Payment Information */}
            <div className="hibid-accordion-panel">
              <button
                type="button"
                className="hibid-accordion-header"
                onClick={() => toggleAccordion('payment')}
                aria-expanded={accordionsOpen.payment}
              >
                <div className="accordion-title-wrap">
                  <ShieldCheck size={17} className="gold-icon" />
                  <span className="accordion-title-text">Payment Information</span>
                </div>
                {accordionsOpen.payment ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {accordionsOpen.payment && (
                <div className="hibid-accordion-body">
                  <p className="spec-body-paragraph">
                    Accepted settlement methods: Domestic and international wire transfers, certified bank cashier's checks, and approved credit cards (Visa, MasterCard, American Express, Discover with 3% card processing fee).
                  </p>
                  <p className="spec-body-paragraph">
                    Invoices were dispatched via email within 24 hours of session adjournment. Title deeds and certified provenance dossiers were released upon full ledger verification.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 4: Shipping/Pickup */}
            <div className="hibid-accordion-panel">
              <button
                type="button"
                className="hibid-accordion-header"
                onClick={() => toggleAccordion('shipping')}
                aria-expanded={accordionsOpen.shipping}
              >
                <div className="accordion-title-wrap">
                  <Truck size={17} className="gold-icon" />
                  <span className="accordion-title-text">Shipping / Pickup</span>
                </div>
                {accordionsOpen.shipping ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {accordionsOpen.shipping && (
                <div className="hibid-accordion-body">
                  <p className="spec-body-paragraph">
                    <strong>Shipping Available:</strong> Worldwide insured transit via USPS Registered Priority Mail, FedEx Insured Armored Freight, or specialized fine-art white-glove handlers.
                  </p>
                  <p className="spec-body-paragraph">
                    <strong>Local Collection:</strong> In-person gallery collection from our Pittsburgh showroom (4200 Commercial Boulevard, Suite 100, Pittsburgh, PA 15201) was accommodated by appointment with government-issued photo ID.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4. Featured Catalog Lots Showcase */}
          <div className="auction-lots-preview-section">
            <div className="preview-section-header">
              <div>
                <span className="section-eyebrow">CONCLUDED CATALOG LOTS</span>
                <h3 className="preview-main-title">Lots from this Auction ({auction.lots.length})</h3>
              </div>
              <a
                href={`#catalog/${auction.id}`}
                className="btn-open-full-catalog"
                title={`Open complete catalog for ${auction.title}`}
              >
                <span>Browse Full Catalog</span>
                <BookOpen size={15} />
              </a>
            </div>

            {/* Lots Grid for this Auction */}
            <div className="past-lots-grid">
              {auction.lots.map((lot) => (
                <div key={lot.id} className="past-lot-card">
                  <a
                    href={`#lot/${lot.id}`}
                    className="past-lot-media"
                    title={`View ${lot.lotNumber}: ${lot.title}`}
                  >
                    <img src={lot.image} alt={lot.title} className="past-lot-img" loading="lazy" />
                    <div className="lot-closed-bar">
                      <Lock size={13} className="closed-icon" />
                      <span>Closed</span>
                    </div>
                  </a>

                  <div className="past-lot-body">
                    <div className="lot-number-type-row">
                      <span className="past-lot-num">{lot.lotNumber}</span>
                      <span className="past-lot-type">
                        <Globe size={12} />
                        <span>Online Only</span>
                      </span>
                    </div>

                    <h4 className="past-lot-title" title={lot.title}>
                      <a href={`#lot/${lot.id}`} className="lot-card-title-link">
                        {lot.title}
                      </a>
                    </h4>

                    {/* Price Realized */}
                    <div className="past-lot-price-block">
                      <span className="price-realized-text">{lot.priceRealized}</span>
                    </div>

                    {/* Meta Details */}
                    <div className="past-lot-meta-block">
                      <div className="meta-line">
                        <span className="meta-label">Date Sold:</span>
                        <span className="meta-val">{lot.dateSold}</span>
                      </div>
                      <div className="meta-line company-line">
                        <span>{lot.auctionHouse}</span>
                      </div>
                      <div className="meta-line location-line">
                        <MapPin size={12} />
                        <span>{lot.location}</span>
                      </div>
                      <div className="meta-line shipping-line">
                        <Truck size={12} />
                        <span>{lot.shipping}</span>
                      </div>
                    </div>

                    {/* View Lot Button */}
                    <div className="past-lot-action-wrap">
                      <a
                        href={`#lot/${lot.id}`}
                        className="btn-view-past-lot"
                        title={`View lot details for ${lot.lotNumber}`}
                      >
                        <span>View Lot</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Catalog Action */}
            <div className="preview-bottom-cta">
              <a
                href={`#catalog/${auction.id}`}
                className="btn-view-catalog-gold btn-large"
              >
                <BookOpen size={18} />
                <span>Open Full Catalog ({auction.lots.length} Lots)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Lot Specimen Dossier Modal */}
      {activeLotModal && (
        <PastLotDetailModal
          lot={activeLotModal}
          onClose={() => setActiveLotModal(null)}
        />
      )}
    </div>
  );
};
