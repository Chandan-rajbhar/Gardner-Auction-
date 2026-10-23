import React, { useState, useEffect, useMemo } from 'react';
import './AuctionDetailsPage.css';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ShieldCheck,
  Truck,
  Share2,
  ExternalLink,
  BookOpen,
  Globe,
  FileText,
  Info,
  CreditCard,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuctionDetailsPageProps {
  auctionId: string;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
  onNavigate?: (path: string) => void;
}

// System, metadata, or already-rendered fields that should not appear in generic extra fields list
const INTERNAL_SYSTEM_FIELDS = new Set([
  'id',
  'name',
  'description',
  'code',
  'status',
  'start_date',
  'end_date',
  'auction_type',
  'currency',
  'terms',
  'short_bp_explanation',
  'payment_info',
  'address1',
  'address2',
  'city',
  'state',
  'zip',
  'country',
  'shipping_availability',
  'shipping_account',
  'add_handling_charge',
  'handling_charge_type',
  'handling_amount',
  'use_consolidated_invoicing',
  'tax_exempt_all',
  'live_starting_bid_card',
  'created_at',
  'updated_at',
  'day_stats',
  'featured_images',
  'auction_links',
  'lot_defaults',
  'upload_settings'
]);

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return dateStr;
  } catch {
    return dateStr || '';
  }
}

export const AuctionDetailsPage: React.FC<AuctionDetailsPageProps> = ({
  auctionId,
  onShowToast,
  onNavigate
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [auction, setAuction] = useState<any | null>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [activeImgIndex, setActiveImgIndex] = useState<number>(0);

  // Fetch auction details dynamically from Supabase as single source of truth
  useEffect(() => {
    let isMounted = true;

    async function fetchAuctionDossier() {
      setLoading(true);
      try {
        // Query Supabase auctions table by id or code
        const { data: aucData, error: aucError } = await supabase
          .from('auctions')
          .select('*')
          .or(`id.eq.${auctionId},code.eq.${auctionId}`)
          .maybeSingle();

        if (aucError) {
          console.error('[AuctionDetailsPage] Supabase error:', aucError);
        }

        if (!isMounted) return;

        if (aucData) {
          setAuction(aucData);

          // Fetch cataloged lots strictly for this auction
          const lotFilter = aucData.code
            ? `auction_id.eq.${aucData.id},auction_id.eq.${aucData.code}`
            : `auction_id.eq.${aucData.id}`;

          const { data: lotsData } = await supabase
            .from('lots')
            .select('*')
            .or(lotFilter)
            .order('lot_number', { ascending: true });

          if (isMounted) {
            setLots(Array.isArray(lotsData) ? lotsData : []);
          }
        } else {
          setAuction(null);
          setLots([]);
        }
      } catch (err) {
        console.error('[AuctionDetailsPage] Error fetching auction dossier:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAuctionDossier();

    // Supabase Realtime synchronization
    const channel = supabase
      .channel(`auction-details-sync-${auctionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        (payload: any) => {
          if (payload.new && (payload.new.id === auctionId || payload.new.code === auctionId)) {
            setAuction(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lots' },
        () => {
          fetchAuctionDossier();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  // Dynamic helper properties derived strictly from Supabase record
  const title = (auction?.name || '').trim();
  const code = (auction?.code || '').trim();
  const description = (auction?.description || '').trim();
  const auctionType = (auction?.auction_type || '').trim();
  const statusRaw = (auction?.status || '').trim();
  const currency = (auction?.currency || '').trim();

  // Dynamic date range
  const dateRange = useMemo(() => {
    if (auction?.start_date && auction?.end_date) {
      return `${formatDisplayDate(auction.start_date)} – ${formatDisplayDate(auction.end_date)}`;
    }
    if (auction?.start_date) return `Opens ${formatDisplayDate(auction.start_date)}`;
    if (auction?.end_date) return `Closing ${formatDisplayDate(auction.end_date)}`;
    return '';
  }, [auction]);

  // Dynamic aggregate lot count
  const lotCount = useMemo(() => {
    if (lots.length > 0) return lots.length;
    if (auction?.day_stats?.lotCount) return Number(auction.day_stats.lotCount);
    if (Array.isArray(auction?.day_stats?.lotStats)) return auction.day_stats.lotStats.length;
    return 0;
  }, [lots, auction]);

  // Dynamic aggregate estimate calculated from lots
  const aggregateEstimate = useMemo(() => {
    let low = 0;
    let high = 0;
    lots.forEach((l) => {
      low += Number(l.estimate_low) || 0;
      high += Number(l.estimate_high) || 0;
    });
    if (low > 0 || high > 0) {
      return `$${low.toLocaleString()} – $${high.toLocaleString()}`;
    }
    return '';
  }, [lots]);

  // Dynamic gallery images strictly from Supabase record & associated lots
  const images = useMemo<string[]>(() => {
    const list: string[] = [];
    if (Array.isArray(auction?.featured_images)) {
      auction.featured_images.forEach((img: any) => {
        if (img?.url && typeof img.url === 'string' && !list.includes(img.url)) {
          list.push(img.url);
        }
      });
    }
    if (lots.length > 0) {
      lots.forEach((l) => {
        if (l.image && typeof l.image === 'string' && !list.includes(l.image)) {
          list.push(l.image);
        }
      });
    }
    return list;
  }, [auction, lots]);

  const activeImage = images[activeImgIndex] || images[0] || '';

  // Dynamic notices strictly from database columns
  const biddingNotice = (
    auction?.short_bp_explanation ||
    auction?.upload_settings?.biddingNotice ||
    ''
  ).trim();

  const auctionNotice = (
    auction?.payment_info ||
    auction?.upload_settings?.auctionNotice ||
    ''
  ).trim();

  const termsOfSale = (auction?.terms || '').trim();

  // Dynamic location strictly from database columns
  const streetAddress = [auction?.address1, auction?.address2]
    .filter(Boolean)
    .map((s: string) => s.trim())
    .join(', ');

  const cityStateZip = [auction?.city, auction?.state, auction?.zip]
    .filter(Boolean)
    .map((s: string) => s.trim())
    .join(' ');

  const fullLocation = [streetAddress, cityStateZip, auction?.country]
    .filter(Boolean)
    .join(', ');

  const mapQuery = fullLocation ? encodeURIComponent(fullLocation) : '';
  const hasLocation = Boolean(streetAddress || cityStateZip || auction?.country);

  // Dynamic Schedule fields
  const timezone = auction?.upload_settings?.timezone || '';
  const previewTimes = auction?.upload_settings?.previewDateTimes || '';
  const sessionTimes = auction?.upload_settings?.auctionDateTimes || '';
  const checkoutTimes = auction?.upload_settings?.checkoutDateTimes || '';
  const softCloseSeconds = auction?.upload_settings?.softCloseSeconds;
  const hasSchedule = Boolean(dateRange || timezone || previewTimes || sessionTimes || checkoutTimes || softCloseSeconds);

  // Dynamic shipping & logistics
  const shippingPolicy = (
    auction?.shipping_availability ||
    auction?.shipping_account ||
    auction?.upload_settings?.shippingPickup ||
    ''
  ).trim();

  // Dynamic accepted credit cards
  const acceptedCards = useMemo<string[]>(() => {
    const cardsObj = auction?.upload_settings?.acceptedCards;
    if (!cardsObj || typeof cardsObj !== 'object') return [];
    return Object.entries(cardsObj)
      .filter(([_, val]) => Boolean(val))
      .map(([key]) => key);
  }, [auction]);

  // Dynamic handling fee
  const handlingText = useMemo(() => {
    if (!auction?.add_handling_charge) return '';
    const amt = Number(auction.handling_amount) || 0;
    const type = auction.handling_charge_type || 'Fixed';
    return `$${amt.toFixed(2)} (${type})`;
  }, [auction]);

  // Dynamic Status Badge
  const statusBadgeInfo = useMemo(() => {
    if (!statusRaw) return null;
    const st = statusRaw.toLowerCase();
    if (st.includes('progress') || st.includes('live')) {
      return { text: 'LIVE WEBCAST AUCTION', color: 'red' as const, isPulse: true };
    }
    if (st.includes('open')) {
      return { text: 'CATALOG OPEN', color: 'green' as const, isPulse: false };
    }
    if (st.includes('closing') || st.includes('today')) {
      return { text: 'CLOSING TODAY', color: 'gold' as const, isPulse: false };
    }
    if (st.includes('concluded') || st.includes('closed') || st.includes('ended')) {
      return { text: 'SESSION CONCLUDED', color: 'gold' as const, isPulse: false };
    }
    return { text: statusRaw.toUpperCase(), color: 'green' as const, isPulse: false };
  }, [statusRaw]);

  // Dynamic extra fields
  const dynamicExtraFields = useMemo(() => {
    if (!auction) return [];
    return Object.entries(auction).filter(([key, val]) => {
      if (INTERNAL_SYSTEM_FIELDS.has(key)) return false;
      if (val === null || val === undefined || val === '') return false;
      if (typeof val === 'object' && Object.keys(val).length === 0) return false;
      return true;
    });
  }, [auction]);

  const hasLogistics = Boolean(
    shippingPolicy ||
    auction?.shipping_account ||
    handlingText ||
    auction?.use_consolidated_invoicing !== undefined ||
    acceptedCards.length > 0
  );

  const hasGovernance = Boolean(
    auctionType ||
    auction?.tax_exempt_all !== undefined ||
    auction?.live_starting_bid_card !== undefined ||
    auction?.lot_defaults?.buyerPremium ||
    auction?.lot_defaults?.commission ||
    dynamicExtraFields.length > 0
  );

  // Share action
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    onShowToast('success', 'Link Copied', `Direct archival link for "${title || 'Auction'}" copied to clipboard.`);
  };

  // Navigate to catalog lots for this specific auction
  const handleOpenCatalog = () => {
    const targetId = auction?.id || auctionId;
    const path = `#current-auction?auction=${targetId}&tab=lots`;
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
  };

  // Back Navigation directly to Current Auctions
  const handleBack = () => {
    const targetPath = '#current-auction?tab=auctions';
    if (onNavigate) {
      onNavigate(targetPath);
    } else {
      window.location.hash = targetPath;
    }
  };

  // Loading State
  if (loading) {
    return (
      <main className="g-dossier-page-root" role="main" aria-label="Loading Auction Dossier">
        <div className="g-dossier-loading-container">
          <div className="g-dossier-spinner-ring" />
          <div className="g-dossier-loading-text">
            <span className="g-dossier-loading-title">GARDNER AUCTION ARCHIVE</span>
            <span className="g-dossier-loading-sub">Accessing verified saleroom ledger...</span>
          </div>
        </div>
      </main>
    );
  }

  // Not Found State
  if (!auction) {
    return (
      <main className="g-dossier-page-root" role="main" aria-label="Auction Not Found">
        <div className="g-dossier-container">
          <div className="g-dossier-not-found-panel">
            <div className="g-not-found-icon-wrap">
              <AlertCircle size={40} />
            </div>
            <span className="g-not-found-eyebrow">AUCTION DOSSIER UNRESOLVED</span>
            <h1 className="g-not-found-heading">Auction Record Not Found</h1>
            <p className="g-not-found-desc">
              The requested auction ledger identifier <strong>"{auctionId}"</strong> could not be located in the current database repository.
            </p>
            <button type="button" className="g-btn-back-link" onClick={handleBack} id="btn-ad-notfound-back">
              <ArrowLeft size={16} />
              <span>Return to Current Auctions</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="g-dossier-page-root" role="main" aria-label={`Auction Details - ${title || 'Saleroom Dossier'}`}>
      {/* Fixed Back Navigation Button (Positioned at marked location, fixed while scrolling) */}
      <div className="g-dossier-fixed-back-wrap">
        <button
          type="button"
          className="g-bar-btn-return"
          onClick={handleBack}
          title="Return to Current Auctions"
          id="btn-ad-back"
        >
          <ArrowLeft size={16} />
          <span>Back to Current Auctions</span>
        </button>
      </div>

      {/* Main Content Area — Expansive Responsive Layout */}
      <div className="g-dossier-layout-wrapper">
        <div className="g-dossier-container">

          {/* 2. Panoramic Auction Showcase Hero (Two-Column Asymmetrical Stage) */}
          <section className="g-showcase-hero-stage" aria-label="Auction Overview and Media Showcase">
            {/* Left Media Stage: Museum Gallery Display */}
            <div className="g-gallery-column">
              <div className="g-gallery-frame">
                {/* Floating Status Pill */}
                {statusBadgeInfo && (
                  <div className={`g-gallery-floating-badge ${statusBadgeInfo.color}`}>
                    {statusBadgeInfo.isPulse && <span className="g-gallery-pulse-dot" />}
                    <span>{statusBadgeInfo.text}</span>
                  </div>
                )}

                {/* Main Visual Display */}
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={title || 'Auction'}
                    className="g-gallery-primary-image"
                  />
                ) : (
                  <div className="g-gallery-placeholder">
                    <div className="g-placeholder-emblem">
                      <Sparkles size={32} />
                    </div>
                    <span className="g-placeholder-title">GARDNER AUCTION</span>
                    <span className="g-placeholder-sub">{code || 'CERTIFIED SALEROOM DOSSIER'}</span>
                  </div>
                )}

                {/* Photo Count Tag */}
                {images.length > 0 && (
                  <div className="g-gallery-counter-pill">
                    <span>Photo {activeImgIndex + 1} of {images.length}</span>
                  </div>
                )}
              </div>

              {/* Horizontal Filmstrip Thumbnail Ribbon */}
              {images.length > 1 && (
                <div className="g-gallery-filmstrip" aria-label="Auction Images Gallery">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`g-gallery-thumb-cell ${activeImgIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveImgIndex(idx)}
                      title={`View Photo ${idx + 1}`}
                      aria-label={`Photo ${idx + 1}`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                      {activeImgIndex === idx && <span className="g-thumb-active-indicator" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Information & Command Center */}
            <div className="g-masthead-column">
              {/* Category & Identification Badges */}
              <div className="g-masthead-identity-row">
                <span className="g-badge-category">
                  <Globe size={13} />
                  <span>{auctionType || 'CERTIFIED AUCTION'}</span>
                </span>

                {code && (
                  <span className="g-badge-code">
                    <span className="g-badge-code-label">CODE:</span>
                    <span className="g-badge-code-val">{code}</span>
                  </span>
                )}

                {currency && (
                  <span className="g-badge-currency">
                    <span>SETTLEMENT: {currency}</span>
                  </span>
                )}
              </div>

              {/* Primary Auction Title */}
              <h1 className="g-masthead-title">{title || 'Official Saleroom Auction'}</h1>

              {/* Official Run Dates Banner */}
              {dateRange && (
                <div className="g-masthead-dates-ribbon">
                  <Calendar size={17} className="g-dates-icon" />
                  <div className="g-dates-meta">
                    <span className="g-dates-label">SESSION TIMEFRAME</span>
                    <span className="g-dates-val">{dateRange}</span>
                  </div>
                </div>
              )}

              {/* Verbatim Description */}
              {description && (
                <p className="g-masthead-description">{description}</p>
              )}

              {/* Key Metrics Highlight Dashboard */}
              <div className="g-metrics-ribbon">
                <div className="g-metric-box">
                  <span className="g-metric-title">TOTAL CATALOGED</span>
                  <div className="g-metric-value-wrap">
                    <Layers size={16} className="g-metric-icon" />
                    <span className="g-metric-val">{lotCount} Lots</span>
                  </div>
                </div>

                {aggregateEstimate && (
                  <div className="g-metric-box">
                    <span className="g-metric-title">ESTIMATE RANGE</span>
                    <div className="g-metric-value-wrap">
                      <span className="g-metric-icon-curr">$</span>
                      <span className="g-metric-val gold">{aggregateEstimate}</span>
                    </div>
                  </div>
                )}

                {Boolean(softCloseSeconds) && (
                  <div className="g-metric-box">
                    <span className="g-metric-title">SOFT CLOSE</span>
                    <div className="g-metric-value-wrap">
                      <Clock size={16} className="g-metric-icon" />
                      <span className="g-metric-val">{softCloseSeconds}s Window</span>
                    </div>
                  </div>
                )}

                {shippingPolicy && (
                  <div className="g-metric-box">
                    <span className="g-metric-title">LOGISTICS</span>
                    <div className="g-metric-value-wrap">
                      <Truck size={16} className="g-metric-icon" />
                      <span className="g-metric-val truncate" title={shippingPolicy}>
                        {shippingPolicy.length > 24 ? `${shippingPolicy.slice(0, 24)}…` : shippingPolicy}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Conversion & Action Hub */}
              <div className="g-masthead-action-deck">
                <button
                  type="button"
                  className="g-btn-gold-master"
                  onClick={handleOpenCatalog}
                  title={`Browse Catalog Lots (${lotCount})`}
                  id="btn-ad-browse-catalog"
                >
                  <BookOpen size={18} />
                  <span>Browse Catalog Lots ({lotCount})</span>
                  <ChevronRight size={18} className="g-btn-arrow" />
                </button>

                <button
                  type="button"
                  className="g-btn-secondary-share"
                  onClick={handleShare}
                  title="Share Auction Dossier"
                  id="btn-ad-share-dossier"
                >
                  <Share2 size={16} />
                  <span>Share Dossier</span>
                </button>
              </div>

              {/* Licensure Assurance Tag */}
              <div className="g-licensure-guarantee">
                <ShieldCheck size={16} className="g-guarantee-icon" />
                <span>Commonwealth of Pennsylvania Registered &amp; Bonded Auction House • License #AY-002004</span>
              </div>
            </div>
          </section>

          {/* 3. Priority Saleroom Notices (Bidding & Payment Notices) */}
          {(biddingNotice || auctionNotice) && (
            <section className="g-notices-banner-section" aria-label="Official Saleroom Notices">
              {biddingNotice && (
                <div className="g-notice-card urgent" role="alert">
                  <div className="g-notice-badge red">
                    <AlertCircle size={20} />
                  </div>
                  <div className="g-notice-body">
                    <div className="g-notice-header-row">
                      <span className="g-notice-eyebrow red">CRITICAL BIDDING NOTICE</span>
                    </div>
                    <p className="g-notice-message red">{biddingNotice}</p>
                  </div>
                </div>
              )}

              {auctionNotice && (
                <div className="g-notice-card informational">
                  <div className="g-notice-badge gold">
                    <Info size={20} />
                  </div>
                  <div className="g-notice-body">
                    <div className="g-notice-header-row">
                      <span className="g-notice-eyebrow gold">PAYMENT &amp; AUCTION SETTLEMENT PROTOCOL</span>
                    </div>
                    <p className="g-notice-message">{auctionNotice}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 4. Deep-Dive Asymmetric Command Grid (65% Stage / 35% Sidebar) */}
          <div className="g-dossier-main-grid">

            {/* Left Column (65%): Chronological Timeline & Terms of Sale */}
            <div className="g-dossier-stage-column">

              {/* Block A: Visual Event Milestones & Schedule Timeline */}
              {hasSchedule && (
                <section className="g-dossier-block-card" aria-label="Auction Schedule and Event Timeline">
                  <div className="g-block-header">
                    <div className="g-block-icon-wrap">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h2 className="g-block-title">Schedule &amp; Event Milestones</h2>
                      <p className="g-block-subtitle">Chronological progression of auction inspection, bidding, and checkout</p>
                    </div>
                  </div>

                  {/* Interactive Milestone Timeline */}
                  <div className="g-timeline-flow">
                    {/* Milestone 1: Run Period */}
                    {dateRange && (
                      <div className="g-timeline-node">
                        <div className="g-timeline-marker">
                          <span className="g-marker-dot active" />
                          <div className="g-marker-line" />
                        </div>
                        <div className="g-timeline-content">
                          <div className="g-node-header">
                            <span className="g-node-phase">STAGE 1</span>
                            <span className="g-node-title">Official Auction Run</span>
                          </div>
                          <div className="g-node-body">
                            <span className="g-node-highlight">{dateRange}</span>
                            {timezone && <span className="g-node-detail">Timezone: {timezone}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Milestone 2: Inspection */}
                    {previewTimes && (
                      <div className="g-timeline-node">
                        <div className="g-timeline-marker">
                          <span className="g-marker-dot" />
                          <div className="g-marker-line" />
                        </div>
                        <div className="g-timeline-content">
                          <div className="g-node-header">
                            <span className="g-node-phase">STAGE 2</span>
                            <span className="g-node-title">Preview &amp; In-Person Inspection</span>
                          </div>
                          <div className="g-node-body">
                            <span className="g-node-text">{previewTimes}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Milestone 3: Bidding & Soft Close */}
                    {(sessionTimes || Boolean(softCloseSeconds)) && (
                      <div className="g-timeline-node">
                        <div className="g-timeline-marker">
                          <span className="g-marker-dot pulse" />
                          <div className="g-marker-line" />
                        </div>
                        <div className="g-timeline-content">
                          <div className="g-node-header">
                            <span className="g-node-phase">STAGE 3</span>
                            <span className="g-node-title">Simulcast Bidding &amp; Closing Session</span>
                          </div>
                          <div className="g-node-body">
                            {sessionTimes && <span className="g-node-text">{sessionTimes}</span>}
                            {Boolean(softCloseSeconds) && (
                              <div className="g-softclose-tag">
                                <Clock size={13} />
                                <span>Soft-Close Protection: {softCloseSeconds} Seconds Extended Bidding Window</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Milestone 4: Checkout & Removal */}
                    {checkoutTimes && (
                      <div className="g-timeline-node">
                        <div className="g-timeline-marker">
                          <span className="g-marker-dot" />
                        </div>
                        <div className="g-timeline-content">
                          <div className="g-node-header">
                            <span className="g-node-phase">STAGE 4</span>
                            <span className="g-node-title">Checkout, Settlement &amp; Removal</span>
                          </div>
                          <div className="g-node-body">
                            <span className="g-node-text">{checkoutTimes}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Block B: Official Terms of Sale */}
              {termsOfSale && (
                <section className="g-dossier-block-card terms-block" aria-label="Official Terms of Sale">
                  <div className="g-block-header">
                    <div className="g-block-icon-wrap">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h2 className="g-block-title">Official Terms of Sale</h2>
                      <p className="g-block-subtitle">Standard legal conditions and bidder fiduciary contract</p>
                    </div>
                  </div>

                  <div className="g-terms-parchment-box">
                    <div className="g-terms-text-content">
                      {termsOfSale}
                    </div>
                    <div className="g-terms-footer-seal">
                      <CheckCircle2 size={14} />
                      <span>Certified Saleroom Protocol • Gardner Auction Master Catalog</span>
                    </div>
                  </div>
                </section>
              )}

            </div>

            {/* Right Sidebar Column (35%): Saleroom Venue, Payment Protocol & Governance */}
            <div className="g-dossier-sidebar-column">

              {/* Sidebar Card 1: Saleroom & Physical Inspection Venue (Dark Navy Contrast Card) */}
              {hasLocation && (
                <section className="g-sidebar-card navy-luxury" aria-label="Saleroom Venue Location">
                  <div className="g-sidebar-card-header">
                    <div className="g-sidebar-icon-wrap gold">
                      <MapPin size={17} />
                    </div>
                    <div>
                      <span className="g-sidebar-card-tag">PHYSICAL SALEROOM</span>
                      <h3 className="g-sidebar-card-title">Venue &amp; Gallery</h3>
                    </div>
                  </div>

                  <div className="g-venue-address-block">
                    {streetAddress && <div className="g-address-line primary">{streetAddress}</div>}
                    {cityStateZip && <div className="g-address-line secondary">{cityStateZip}</div>}
                    {auction?.country && <div className="g-address-line country">{auction.country}</div>}
                  </div>

                  {mapQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="g-btn-venue-maps"
                      id="btn-ad-venue-maps"
                    >
                      <ExternalLink size={14} />
                      <span>Locate on Google Maps</span>
                    </a>
                  )}
                </section>
              )}

              {/* Sidebar Card 2: Logistics, Shipping & Payment Protocols */}
              {hasLogistics && (
                <section className="g-sidebar-card white-crisp" aria-label="Logistics and Payment Details">
                  <div className="g-sidebar-card-header">
                    <div className="g-sidebar-icon-wrap dark">
                      <CreditCard size={17} />
                    </div>
                    <div>
                      <span className="g-sidebar-card-tag">SETTLEMENT PROTOCOL</span>
                      <h3 className="g-sidebar-card-title">Logistics &amp; Payment</h3>
                    </div>
                  </div>

                  <div className="g-sidebar-kv-group">
                    {shippingPolicy && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Shipping Availability</span>
                        <span className="g-kv-data">{shippingPolicy}</span>
                      </div>
                    )}

                    {auction?.shipping_account && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Shipping Account</span>
                        <span className="g-kv-data">{auction.shipping_account}</span>
                      </div>
                    )}

                    {handlingText && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Handling Charge</span>
                        <span className="g-kv-data gold-accent">{handlingText}</span>
                      </div>
                    )}

                    {auction?.use_consolidated_invoicing !== undefined && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Consolidated Invoicing</span>
                        <span className="g-kv-data">
                          {auction.use_consolidated_invoicing ? 'Consolidated Statement' : 'Per-Lot Invoicing'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Accepted Credit Cards Chips */}
                  {acceptedCards.length > 0 && (
                    <div className="g-cards-accepted-block">
                      <span className="g-cards-title">Accepted Payment Cards:</span>
                      <div className="g-cards-pills-wrap">
                        {acceptedCards.map((card) => (
                          <span key={card} className="g-card-pill">
                            <CreditCard size={12} />
                            <span>{card.toUpperCase()}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Sidebar Card 3: Governance, Premiums & Consignor Policy */}
              {hasGovernance && (
                <section className="g-sidebar-card cream-refined" aria-label="Governance and Fiduciary Policy">
                  <div className="g-sidebar-card-header">
                    <div className="g-sidebar-icon-wrap gold-border">
                      <ShieldCheck size={17} />
                    </div>
                    <div>
                      <span className="g-sidebar-card-tag">GOVERNANCE PROTOCOL</span>
                      <h3 className="g-sidebar-card-title">Fiduciary Standards</h3>
                    </div>
                  </div>

                  <div className="g-sidebar-kv-group">
                    {auctionType && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Bidding System</span>
                        <span className="g-kv-data">{auctionType}</span>
                      </div>
                    )}

                    {auction?.lot_defaults?.buyerPremium && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Standard Buyer's Premium</span>
                        <span className="g-kv-data gold-accent">{auction.lot_defaults.buyerPremium}%</span>
                      </div>
                    )}

                    {auction?.lot_defaults?.commission && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Consignor Commission</span>
                        <span className="g-kv-data">{auction.lot_defaults.commission}%</span>
                      </div>
                    )}

                    {auction?.tax_exempt_all !== undefined && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Tax Policy</span>
                        <span className="g-kv-data">
                          {auction.tax_exempt_all ? 'All Lots Tax Exempt' : 'Applicable Sales Tax Applied'}
                        </span>
                      </div>
                    )}

                    {auction?.live_starting_bid_card !== undefined && auction?.live_starting_bid_card !== null && (
                      <div className="g-sidebar-kv-item">
                        <span className="g-kv-term">Starting Bid Card</span>
                        <span className="g-kv-data">#{auction.live_starting_bid_card}</span>
                      </div>
                    )}

                    {/* Dynamically render any extra database columns */}
                    {dynamicExtraFields.map(([key, val]) => (
                      <div key={key} className="g-sidebar-kv-item">
                        <span className="g-kv-term" style={{ textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="g-kv-data">
                          {typeof val === 'boolean'
                            ? val ? 'Enabled' : 'Disabled'
                            : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </div>

          {/* 5. Bottom Navigation & Action Terminal */}


        </div>
      </div>
    </main>
  );
};

export default AuctionDetailsPage;
