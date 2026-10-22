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
  AlertCircle
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

  // Back Navigation
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else if (onNavigate) {
      onNavigate('#current-auction');
    } else {
      window.location.hash = '#current-auction';
    }
  };

  // Loading State
  if (loading) {
    return (
      <main className="ad-page-root" role="main" aria-label="Loading Auction Dossier">
        <div className="ad-ambient-glow" aria-hidden="true" />
        <div className="ad-container">
          <div className="ad-loading-wrap">
            <div className="ad-loading-spinner" />
            <p>Loading certified saleroom dossier from database...</p>
          </div>
        </div>
      </main>
    );
  }

  // Not Found State
  if (!auction) {
    return (
      <main className="ad-page-root" role="main" aria-label="Auction Not Found">
        <div className="ad-ambient-glow" aria-hidden="true" />
        <div className="ad-container">
          <div className="ad-not-found-card">
            <AlertCircle size={48} style={{ color: '#ef4444' }} />
            <h1 className="ad-not-found-title">Auction Dossier Not Found</h1>
            <p className="ad-not-found-desc">
              The requested auction record for identifier "{auctionId}" does not exist in the database.
            </p>
            <button type="button" className="ad-btn-back" onClick={handleBack}>
              <ArrowLeft size={16} />
              <span>Back to Current Auctions</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ad-page-root" role="main" aria-label={`Auction Details - ${title || 'Saleroom Dossier'}`}>
      {/* Embedded Saleroom Dossier Stylesheet */}
      <style>{`
        .ad-page-root {
          background-color: #101216 !important;
          color: #f5f3ed !important;
          min-height: 100vh !important;
          padding: 24px 0 64px !important;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          position: relative !important;
        }
        .ad-page-root .ad-ambient-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 1280px;
          height: 400px;
          background: radial-gradient(circle at 50% 0%, rgba(197, 160, 74, 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .ad-page-root .ad-container {
          max-width: 1280px !important;
          margin: 0 auto !important;
          padding: 0 24px !important;
          position: relative !important;
          z-index: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 32px !important;
          box-sizing: border-box !important;
        }
        .ad-page-root .ad-btn-back {
          display: inline-flex !important;
          align-items: center !important;
          gap: 10px !important;
          padding: 8px 18px !important;
          border-radius: 8px !important;
          background: #161920 !important;
          border: 1px solid #2b303b !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
          color: #d5d9e2 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
          text-decoration: none !important;
        }
        .ad-page-root .ad-btn-back svg {
          color: #c5a04a !important;
          stroke: #c5a04a !important;
          transition: transform 0.2s ease !important;
        }
        .ad-page-root .ad-hero-card {
          border-radius: 16px !important;
          overflow: hidden !important;
          background: #f4f0e7 !important;
          border: 1px solid #2b303c !important;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.45), 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
        }
        .ad-page-root .ad-hero-header-strip {
          background: #15181f !important;
          padding: 14px 28px !important;
          border-bottom: 1px solid #2a2e3a !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 16px !important;
        }
        .ad-page-root .ad-header-eyebrow {
          display: inline-flex !important;
          align-items: center !important;
          gap: 12px !important;
        }
        .ad-page-root .ad-pulse-dot-gold {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background: #c5a04a !important;
          box-shadow: 0 0 10px #c5a04a !important;
        }
        .ad-page-root .ad-header-eyebrow h2 {
          font-family: 'Cinzel', serif !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          letter-spacing: 2.2px !important;
          text-transform: uppercase !important;
          color: #e5e9f0 !important;
          margin: 0 !important;
        }
        .ad-page-root .ad-header-code-pill {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 10px !important;
          border-radius: 4px !important;
          background: #1f232d !important;
          border: 1px solid #353b4a !important;
          font-family: monospace !important;
          font-size: 12px !important;
          color: #d4af37 !important;
        }
        .ad-page-root .ad-hero-body {
          background: #f4f0e7 !important;
          color: #1e201b !important;
          padding: 36px 40px !important;
          box-sizing: border-box !important;
        }
        .ad-page-root .ad-hero-body-grid {
          display: grid !important;
          grid-template-columns: 5fr 7fr !important;
          gap: 40px !important;
          align-items: start !important;
        }
        .ad-page-root .ad-img-frame {
          position: relative !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          border: 1px solid #d9d3c5 !important;
          background: #0e1015 !important;
          aspect-ratio: 1 / 1 !important;
          width: 100% !important;
          max-height: 460px !important;
          min-height: 320px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08) !important;
        }
        .ad-page-root .ad-main-img {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
          padding: 16px !important;
          display: block !important;
        }
        .ad-page-root .ad-live-badge-wrapper {
          position: absolute !important;
          top: 14px !important;
          left: 14px !important;
          z-index: 5 !important;
        }
        .ad-page-root .ad-live-badge {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 12px !important;
          border-radius: 6px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .ad-page-root .ad-live-badge.red { background: #dc2626 !important; color: #ffffff !important; }
        .ad-page-root .ad-live-badge.green { background: #15803d !important; color: #ffffff !important; }
        .ad-page-root .ad-live-badge.gold { background: #c5a04a !important; color: #101216 !important; }
        .ad-page-root .ad-thumbnails-strip {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          flex-wrap: wrap !important;
          margin-top: 16px !important;
        }
        .ad-page-root .ad-thumb-btn {
          width: 76px !important;
          height: 76px !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          background: #111317 !important;
          padding: 3px !important;
          border: 1px solid #d1cab8 !important;
          cursor: pointer !important;
          box-sizing: border-box !important;
        }
        .ad-page-root .ad-thumb-btn img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 5px !important;
          display: block !important;
        }
        .ad-page-root .ad-thumb-btn.active {
          border: 2px solid #c5a04a !important;
          box-shadow: 0 4px 12px rgba(197, 160, 74, 0.3) !important;
        }
        .ad-page-root .ad-info-col {
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
        }
        .ad-page-root .ad-sync-meta-row {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 10px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #7e8379 !important;
        }
        .ad-page-root .ad-main-title {
          font-family: 'Playfair Display', Georgia, serif !important;
          font-size: 40px !important;
          font-weight: 700 !important;
          color: #1f201b !important;
          line-height: 1.18 !important;
          margin: 0 0 4px 0 !important;
          letter-spacing: -0.5px !important;
        }
        .ad-page-root .ad-lead-desc {
          font-size: 15px !important;
          color: #575b53 !important;
          line-height: 1.6 !important;
          margin: 0 !important;
        }
        .ad-page-root .ad-metadata-cards-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 14px !important;
          padding-top: 4px !important;
        }
        .ad-page-root .ad-meta-card {
          background: #ffffff !important;
          padding: 14px 18px !important;
          border-radius: 12px !important;
          border: 1px solid #dedacd !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03) !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }
        .ad-page-root .ad-meta-card.span-2 {
          grid-column: span 2 !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        .ad-page-root .ad-meta-card-label {
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 1.4px !important;
          text-transform: uppercase !important;
          color: #7d8177 !important;
        }
        .ad-page-root .ad-meta-card-val {
          margin-top: 4px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #1e201b !important;
        }
        .ad-page-root .ad-meta-card-val.red { color: #992222 !important; text-transform: uppercase !important; }
        .ad-page-root .ad-meta-card-val.green { color: #15803d !important; text-transform: uppercase !important; }
        .ad-page-root .ad-meta-card-val.gold { color: #8c6d1f !important; }
        .ad-page-root .ad-meta-card-code-badge {
          font-family: monospace !important;
          font-size: 13.5px !important;
          font-weight: 700 !important;
          color: #8c6d1f !important;
          background: #faf6ed !important;
          padding: 3px 14px !important;
          border-radius: 6px !important;
          border: 1px solid #eadbbd !important;
        }
        .ad-page-root .ad-hero-actions-row {
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
          padding-top: 8px !important;
          flex-wrap: wrap !important;
        }
        .ad-page-root .ad-btn-catalog-gold {
          flex: 1 !important;
          min-width: 200px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          padding: 14px 24px !important;
          border-radius: 12px !important;
          background: #c5a04a !important;
          color: #16181d !important;
          font-size: 13.5px !important;
          font-weight: 700 !important;
          letter-spacing: 0.4px !important;
          text-decoration: none !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: 0 4px 14px rgba(197, 160, 74, 0.35) !important;
        }
        .ad-page-root .ad-btn-catalog-gold:hover { background: #d8b45b !important; transform: translateY(-1px) !important; }
        .ad-page-root .ad-btn-catalog-gold svg { color: #16181d !important; stroke: #16181d !important; }
        .ad-page-root .ad-btn-share-secondary {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 14px 22px !important;
          border-radius: 12px !important;
          background: transparent !important;
          color: #242621 !important;
          font-size: 13.5px !important;
          font-weight: 600 !important;
          border: 1px solid #c6beaa !important;
          cursor: pointer !important;
        }
        .ad-page-root .ad-btn-share-secondary:hover { background: #e8e2d2 !important; border-color: #a39b85 !important; }
        .ad-page-root .ad-two-col-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 32px !important;
        }
        .ad-page-root .ad-two-col-grid.single-col {
          grid-template-columns: 1fr !important;
        }
        .ad-page-root .ad-info-section-card {
          background: #f4f0e7 !important;
          color: #1e201b !important;
          border-radius: 16px !important;
          padding: 26px 30px !important;
          border: 1px solid #d9d3c5 !important;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.45) !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          gap: 16px !important;
          box-sizing: border-box !important;
        }
        .ad-page-root .ad-section-header {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding-bottom: 16px !important;
          border-bottom: 1px solid #e0d9c8 !important;
        }
        .ad-page-root .ad-icon-box-gold {
          width: 36px !important;
          height: 36px !important;
          border-radius: 8px !important;
          background: #faf7f0 !important;
          border: 1px solid #d5cdbd !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #a6802b !important;
          flex-shrink: 0 !important;
        }
        .ad-page-root .ad-icon-box-gold svg {
          color: #a6802b !important;
          stroke: #a6802b !important;
          display: block !important;
        }
        .ad-page-root .ad-section-title {
          font-family: 'Playfair Display', Georgia, serif !important;
          font-size: 19px !important;
          font-weight: 700 !important;
          color: #1e201b !important;
          margin: 0 !important;
          letter-spacing: -0.3px !important;
        }
        .ad-page-root .ad-kv-list { display: flex !important; flex-direction: column !important; }
        .ad-page-root .ad-kv-row {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 16px !important;
          padding: 12px 0 !important;
          border-bottom: 1px solid #e6e0d2 !important;
          font-size: 14px !important;
        }
        .ad-page-root .ad-kv-row:last-child { border-bottom: none !important; }
        .ad-page-root .ad-kv-label { color: #686d62 !important; font-weight: 500 !important; flex-shrink: 0 !important; }
        .ad-page-root .ad-kv-val { color: #1e201b !important; font-weight: 600 !important; text-align: right !important; }
        .ad-page-root .ad-kv-val.gold { color: #8c6d1f !important; font-weight: 700 !important; }
        .ad-page-root .ad-venue-link-wrap { padding-top: 14px !important; }
        .ad-page-root .ad-venue-map-link {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #8c6d1f !important;
          text-decoration: none !important;
        }
        .ad-page-root .ad-venue-map-link:hover { color: #5b4510 !important; }
        .ad-page-root .ad-venue-map-link svg { color: #8c6d1f !important; stroke: #8c6d1f !important; }
        .ad-page-root .ad-notices-full-card {
          background: #f4f0e7 !important;
          color: #1e201b !important;
          border-radius: 16px !important;
          padding: 28px 32px !important;
          border: 1px solid #d9d3c5 !important;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.45) !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
          box-sizing: border-box !important;
        }
        .ad-page-root .ad-bidding-notice-box {
          background: #fff8f8 !important;
          border: 1px solid #f3c7c7 !important;
          border-radius: 12px !important;
          padding: 16px 20px !important;
          display: flex !important;
          align-items: flex-start !important;
          gap: 14px !important;
        }
        .ad-page-root .ad-notice-badge-red {
          width: 26px !important;
          height: 26px !important;
          border-radius: 50% !important;
          background: #fee2e2 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #dc2626 !important;
          flex-shrink: 0 !important;
          margin-top: 2px !important;
        }
        .ad-page-root .ad-notice-badge-red svg { color: #dc2626 !important; stroke: #dc2626 !important; }
        .ad-page-root .ad-bidding-notice-title {
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #991b1b !important;
          margin: 0 !important;
        }
        .ad-page-root .ad-bidding-notice-text {
          margin-top: 4px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #7f1d1d !important;
          line-height: 1.5 !important;
          margin-bottom: 0 !important;
        }
        .ad-page-root .ad-auction-notice-box {
          background: #ffffff !important;
          border: 1px solid #dfd8c7 !important;
          border-radius: 12px !important;
          padding: 16px 20px !important;
          display: flex !important;
          align-items: flex-start !important;
          gap: 14px !important;
        }
        .ad-page-root .ad-notice-badge-gold {
          width: 26px !important;
          height: 26px !important;
          border-radius: 50% !important;
          background: #faf5e6 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #a6802b !important;
          flex-shrink: 0 !important;
          margin-top: 2px !important;
        }
        .ad-page-root .ad-notice-badge-gold svg { color: #a6802b !important; stroke: #a6802b !important; }
        .ad-page-root .ad-auction-notice-title {
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #8c6d1f !important;
          margin: 0 !important;
        }
        .ad-page-root .ad-auction-notice-text {
          margin-top: 4px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #4e524a !important;
          line-height: 1.5 !important;
          margin-bottom: 0 !important;
        }
        .ad-page-root .ad-terms-block { padding-top: 4px !important; }
        .ad-page-root .ad-terms-title {
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #686d62 !important;
          margin: 0 0 6px 0 !important;
        }
        .ad-page-root .ad-terms-text {
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #252822 !important;
          line-height: 1.6 !important;
          margin: 0 !important;
        }
        .ad-page-root .ad-accepted-cards-section {
          padding-top: 14px !important;
          margin-top: 4px !important;
          border-top: 1px solid #e6e0d2 !important;
        }
        .ad-page-root .ad-cards-label {
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #7a7f74 !important;
          display: block !important;
          margin-bottom: 8px !important;
        }
        .ad-page-root .ad-cards-chips-row {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .ad-page-root .ad-card-chip {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 6px 12px !important;
          border-radius: 6px !important;
          background: #ffffff !important;
          border: 1px solid #d5cfbe !important;
          font-size: 11.5px !important;
          font-weight: 700 !important;
          color: #2a2d25 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
        }
        .ad-page-root .ad-page-bottom-actions {
          padding: 12px 0 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 16px !important;
          flex-wrap: wrap !important;
        }
        @media (max-width: 1024px) {
          .ad-page-root .ad-hero-body-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .ad-page-root .ad-two-col-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .ad-page-root .ad-main-title { font-size: 32px !important; }
        }
        @media (max-width: 640px) {
          .ad-page-root .ad-hero-body { padding: 24px 20px !important; }
          .ad-page-root .ad-main-title { font-size: 26px !important; }
          .ad-page-root .ad-metadata-cards-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .ad-page-root .ad-meta-card.span-2 { grid-column: span 1 !important; flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          .ad-page-root .ad-hero-actions-row { flex-direction: column !important; width: 100% !important; }
          .ad-page-root .ad-btn-catalog-gold, .ad-page-root .ad-btn-share-secondary { width: 100% !important; }
          .ad-page-root .ad-info-section-card, .ad-page-root .ad-notices-full-card { padding: 22px 18px !important; }
          .ad-page-root .ad-page-bottom-actions { flex-direction: column !important; width: 100% !important; }
          .ad-page-root .ad-page-bottom-actions .ad-btn-back, .ad-page-root .ad-page-bottom-actions .ad-btn-catalog-gold { width: 100% !important; }
        }
      `}</style>
      <div className="ad-ambient-glow" aria-hidden="true" />

      <div className="ad-container">
        {/* 1. Top Breadcrumb / Back Navigation Action */}
        <div className="ad-top-nav-bar">
          <button
            type="button"
            className="ad-btn-back"
            onClick={handleBack}
            title="Return to Current Auctions"
          >
            <ArrowLeft size={16} />
            <span>Back to Current Auctions</span>
          </button>
        </div>

        {/* 2. Active Saleroom Dossier Hero Card */}
        <section className="ad-hero-card" aria-label="Active Saleroom Dossier">
          {/* Dossier Header Strip */}
          <div className="ad-hero-header-strip">
            <div className="ad-header-eyebrow">
              <span className="ad-pulse-dot-gold" />
              <h2>Active Saleroom Dossier</h2>
            </div>
            {code && (
              <div className="ad-header-code-pill">
                <span className="ad-code-label">Code:</span>
                <span className="ad-code-val">{code}</span>
              </div>
            )}
          </div>

          {/* Main Dossier Body — Warm Ivory Aesthetic Surface */}
          <div className="ad-hero-body">
            <div className="ad-hero-body-grid">
              {/* Left Column: Auction Image & Thumbnail Gallery Strip */}
              <div className="ad-media-col">
                <div className="ad-img-frame">
                  {/* Status Badge */}
                  {statusBadgeInfo && (
                    <div className="ad-live-badge-wrapper">
                      <span className={`ad-live-badge ${statusBadgeInfo.color}`}>
                        {statusBadgeInfo.isPulse && <span className="ad-pulse-ping" />}
                        <span>{statusBadgeInfo.text}</span>
                      </span>
                    </div>
                  )}

                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt={title || 'Auction'}
                      className="ad-main-img"
                    />
                  ) : (
                    <div className="ad-img-placeholder">
                      <BookOpen size={48} />
                      {code && <span>{code}</span>}
                    </div>
                  )}
                </div>

                {/* Thumbnail Reel */}
                {images.length > 1 && (
                  <div className="ad-thumbnails-strip" aria-label="Auction Cover Gallery">
                    {images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`ad-thumb-btn ${activeImgIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveImgIndex(idx)}
                        title={`View image ${idx + 1}`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Title, Metadata Grid & Action Buttons */}
              <div className="ad-info-col">
                <div>
                  {/* Micro Sync Meta */}
                  {(auctionType || currency) && (
                    <div className="ad-sync-meta-row">
                      {auctionType && (
                        <span className="meta-item">
                          <Globe size={14} />
                          <span>{auctionType}</span>
                        </span>
                      )}
                      {auctionType && currency && <span className="meta-bullet">•</span>}
                      {currency && (
                        <span className="meta-item">
                          <span style={{ color: '#8c763e', fontWeight: 700 }}>$</span>
                          <span>Settlement: {currency}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Primary Lot Title */}
                  {title && <h1 className="ad-main-title">{title}</h1>}

                  {/* Verbatim Description */}
                  {description && (
                    <p className="ad-lead-desc">{description}</p>
                  )}
                </div>

                {/* Crisp White Metadata Spec Box Cards */}
                <div className="ad-metadata-cards-grid">
                  {/* Status Card */}
                  {statusBadgeInfo && (
                    <div className="ad-meta-card">
                      <span className="ad-meta-card-label">STATUS</span>
                      <span className={`ad-meta-card-val ${statusBadgeInfo.color}`}>
                        {statusBadgeInfo.text}
                      </span>
                    </div>
                  )}

                  {/* Total Lots Card */}
                  {lotCount > 0 && (
                    <div className="ad-meta-card">
                      <span className="ad-meta-card-label">TOTAL LOTS</span>
                      <span className="ad-meta-card-val">{lotCount} Cataloged Lots</span>
                    </div>
                  )}

                  {/* Logistics Card (if present) */}
                  {shippingPolicy && (
                    <div className="ad-meta-card">
                      <span className="ad-meta-card-label">LOGISTICS</span>
                      <span className="ad-meta-card-val">{shippingPolicy}</span>
                    </div>
                  )}

                  {/* Handling Fee Card (if present) */}
                  {handlingText && (
                    <div className="ad-meta-card">
                      <span className="ad-meta-card-label">HANDLING FEE</span>
                      <span className="ad-meta-card-val">{handlingText}</span>
                    </div>
                  )}

                  {/* Estimate Range Card (if present) */}
                  {aggregateEstimate && (
                    <div className="ad-meta-card">
                      <span className="ad-meta-card-label">ESTIMATE RANGE</span>
                      <span className="ad-meta-card-val gold">{aggregateEstimate}</span>
                    </div>
                  )}

                  {/* Auction Code Card */}
                  {code && (
                    <div className="ad-meta-card span-2">
                      <span className="ad-meta-card-label">AUCTION CODE</span>
                      <span className="ad-meta-card-code-badge">{code}</span>
                    </div>
                  )}
                </div>

                {/* Primary Dossier Action Buttons */}
                <div className="ad-hero-actions-row">
                  <button
                    type="button"
                    className="ad-btn-catalog-gold"
                    onClick={handleOpenCatalog}
                    title={`Browse Catalog Lots ${lotCount > 0 ? `(${lotCount})` : ''}`}
                  >
                    <BookOpen size={16} />
                    <span>Browse Catalog Lots {lotCount > 0 ? `(${lotCount})` : ''}</span>
                  </button>

                  <button
                    type="button"
                    className="ad-btn-share-secondary"
                    onClick={handleShare}
                    title="Copy direct auction link"
                  >
                    <Share2 size={16} />
                    <span>Share Dossier</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Schedule & Saleroom Location Grid */}
        {(hasSchedule || hasLocation) && (
          <div className={`ad-two-col-grid ${(!hasSchedule || !hasLocation) ? 'single-col' : ''}`}>
            {/* Card 1: Schedule & Session Timeline */}
            {hasSchedule && (
              <section className="ad-info-section-card" aria-label="Schedule and Session Timeline">
                <div>
                  <div className="ad-section-header">
                    <div className="ad-icon-box-gold">
                      <Calendar size={18} />
                    </div>
                    <h3 className="ad-section-title">Schedule &amp; Session Timeline</h3>
                  </div>

                  <div className="ad-kv-list">
                    {dateRange && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Official Run:</span>
                        <span className="ad-kv-val gold">{dateRange}</span>
                      </div>
                    )}

                    {timezone && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Timezone:</span>
                        <span className="ad-kv-val">{timezone}</span>
                      </div>
                    )}

                    {previewTimes && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Preview &amp; Inspection:</span>
                        <span className="ad-kv-val">{previewTimes}</span>
                      </div>
                    )}

                    {sessionTimes && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Session Times:</span>
                        <span className="ad-kv-val">{sessionTimes}</span>
                      </div>
                    )}

                    {checkoutTimes && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Checkout &amp; Removal:</span>
                        <span className="ad-kv-val">{checkoutTimes}</span>
                      </div>
                    )}

                    {Boolean(softCloseSeconds) && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Soft-Close Window:</span>
                        <span className="ad-kv-val">{softCloseSeconds} Seconds</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Card 2: Saleroom & Venue Location */}
            {hasLocation && (
              <section className="ad-info-section-card" aria-label="Saleroom and Venue Location">
                <div>
                  <div className="ad-section-header">
                    <div className="ad-icon-box-gold">
                      <MapPin size={18} />
                    </div>
                    <h3 className="ad-section-title">Saleroom &amp; Venue Location</h3>
                  </div>

                  <div className="ad-kv-list">
                    {streetAddress && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Address:</span>
                        <span className="ad-kv-val">{streetAddress}</span>
                      </div>
                    )}

                    {cityStateZip && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">City, State &amp; Zip:</span>
                        <span className="ad-kv-val">{cityStateZip}</span>
                      </div>
                    )}

                    {auction?.country && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Country:</span>
                        <span className="ad-kv-val">{auction.country}</span>
                      </div>
                    )}
                  </div>
                </div>

                {mapQuery && (
                  <div className="ad-venue-link-wrap">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ad-venue-map-link"
                    >
                      <ExternalLink size={14} />
                      <span>View Venue on Google Maps</span>
                    </a>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* 4. Notices, Terms & Settlement Protocols (Full-Width Card) */}
        {(biddingNotice || auctionNotice || termsOfSale) && (
          <section className="ad-notices-full-card" aria-label="Notices, Terms and Settlement Protocols">
            <div className="ad-section-header">
              <div className="ad-icon-box-gold">
                <FileText size={18} />
              </div>
              <h3 className="ad-section-title">Notices, Terms &amp; Settlement Protocols</h3>
            </div>

            {biddingNotice && (
              <div className="ad-bidding-notice-box">
                <div className="ad-notice-badge-red">
                  <AlertCircle size={15} />
                </div>
                <div>
                  <h4 className="ad-bidding-notice-title">Bidding Notice:</h4>
                  <p className="ad-bidding-notice-text">{biddingNotice}</p>
                </div>
              </div>
            )}

            {auctionNotice && (
              <div className="ad-auction-notice-box">
                <div className="ad-notice-badge-gold">
                  <Info size={15} />
                </div>
                <div>
                  <h4 className="ad-auction-notice-title">Auction &amp; Payment Notice:</h4>
                  <p className="ad-auction-notice-text">{auctionNotice}</p>
                </div>
              </div>
            )}

            {termsOfSale && (
              <div className="ad-terms-block">
                <h4 className="ad-terms-title">Official Terms of Sale:</h4>
                <p className="ad-terms-text">{termsOfSale}</p>
              </div>
            )}
          </section>
        )}

        {/* 5. Logistics & Governance Grid */}
        {(hasLogistics || hasGovernance) && (
          <div className={`ad-two-col-grid ${(!hasLogistics || !hasGovernance) ? 'single-col' : ''}`}>
            {/* Card 1: Logistics & Payment Details */}
            {hasLogistics && (
              <section className="ad-info-section-card" aria-label="Logistics and Payment Details">
                <div>
                  <div className="ad-section-header">
                    <div className="ad-icon-box-gold">
                      <Truck size={18} />
                    </div>
                    <h3 className="ad-section-title">Logistics &amp; Payment Details</h3>
                  </div>

                  <div className="ad-kv-list">
                    {shippingPolicy && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Shipping Availability:</span>
                        <span className="ad-kv-val">{shippingPolicy}</span>
                      </div>
                    )}

                    {auction?.shipping_account && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Shipping Account:</span>
                        <span className="ad-kv-val">{auction.shipping_account}</span>
                      </div>
                    )}

                    {handlingText && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Handling Fee:</span>
                        <span className="ad-kv-val gold">{handlingText}</span>
                      </div>
                    )}

                    {auction?.use_consolidated_invoicing !== undefined && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Consolidated Invoicing:</span>
                        <span className="ad-kv-val">
                          {auction.use_consolidated_invoicing ? 'Enabled (Single Invoice)' : 'Per-Lot Invoicing'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {acceptedCards.length > 0 && (
                  <div className="ad-accepted-cards-section">
                    <span className="ad-cards-label">Accepted Cards:</span>
                    <div className="ad-cards-chips-row">
                      {acceptedCards.map((c) => (
                        <span key={c} className="ad-card-chip">
                          <CreditCard size={13} style={{ color: '#6b7065' }} />
                          <span>{c.toUpperCase()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Card 2: Governance & Fiduciary Policy */}
            {hasGovernance && (
              <section className="ad-info-section-card" aria-label="Governance and Fiduciary Policy">
                <div>
                  <div className="ad-section-header">
                    <div className="ad-icon-box-gold">
                      <ShieldCheck size={18} />
                    </div>
                    <h3 className="ad-section-title">Governance &amp; Fiduciary Policy</h3>
                  </div>

                  <div className="ad-kv-list">
                    {auctionType && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Auction Protocol:</span>
                        <span className="ad-kv-val">{auctionType}</span>
                      </div>
                    )}

                    {auction?.tax_exempt_all !== undefined && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Tax Exemption:</span>
                        <span className="ad-kv-val">
                          {auction.tax_exempt_all ? 'All Lots Tax Exempt' : 'Applicable Sales Tax Applied'}
                        </span>
                      </div>
                    )}

                    {auction?.live_starting_bid_card !== undefined && auction?.live_starting_bid_card !== null && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Starting Bid Card:</span>
                        <span className="ad-kv-val">#{auction.live_starting_bid_card}</span>
                      </div>
                    )}

                    {auction?.lot_defaults?.buyerPremium && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Standard Buyer Premium:</span>
                        <span className="ad-kv-val gold">{auction.lot_defaults.buyerPremium}%</span>
                      </div>
                    )}

                    {auction?.lot_defaults?.commission && (
                      <div className="ad-kv-row">
                        <span className="ad-kv-label">Consignor Commission:</span>
                        <span className="ad-kv-val">{auction.lot_defaults.commission}%</span>
                      </div>
                    )}

                    {/* Dynamic rendering of any newly populated database columns */}
                    {dynamicExtraFields.map(([key, val]) => (
                      <div key={key} className="ad-kv-row">
                        <span className="ad-kv-label" style={{ textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="ad-kv-val">
                          {typeof val === 'boolean'
                            ? val ? 'Enabled' : 'Disabled'
                            : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* 6. Page Bottom Action Buttons */}
        <div className="ad-page-bottom-actions">
          <button
            type="button"
            className="ad-btn-back"
            onClick={handleBack}
            title="Return to Current Auctions"
          >
            <ArrowLeft size={16} />
            <span>Back to Current Auctions</span>
          </button>

          <button
            type="button"
            className="ad-btn-catalog-gold"
            onClick={handleOpenCatalog}
            title={`Browse Catalog Lots ${lotCount > 0 ? `(${lotCount})` : ''}`}
          >
            <BookOpen size={16} />
            <span>Browse Catalog Lots {lotCount > 0 ? `(${lotCount})` : ''}</span>
          </button>
        </div>
      </div>
    </main>
  );
};

export default AuctionDetailsPage;
