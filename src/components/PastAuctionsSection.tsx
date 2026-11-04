import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  isConcludedAuction,
  isCompletedLot,
  formatAuctionDates,
  calculateAuctionTotalRealized
} from '../lib/auctionHelpers';
import type { PastAuction, PastLotItem } from './PastCatalogs';

interface PastAuctionsSectionProps {
  auctions?: PastAuction[];
  limit?: number;
  onNavigate?: (path: string) => void;
  onInquirePast?: (auctionTitle: string) => void;
}

/**
 * Formats a raw date range string (e.g. "Date(s) 10/22/2026 - 10/29/2026" or ISO dates)
 * into a readable "Month Year" label (e.g. "October 2026").
 */
const formatAuctionDate = (dateRange?: string, startDate?: string, endDate?: string): string => {
  const dStr = endDate || startDate || dateRange;
  if (!dStr) return 'Concluded 2026';

  // Try parsing ISO date
  try {
    const parsed = new Date(dStr);
    if (!isNaN(parsed.getTime())) {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }
  } catch (_) {}

  // Match MM/DD/YYYY in date range string
  const match = dStr.match(/(\d{1,2})\/\d{1,2}\/(\d{4})/);
  if (match) {
    const monthNum = parseInt(match[1], 10);
    const year = match[2];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (monthNum >= 1 && monthNum <= 12) {
      return `${months[monthNum - 1]} ${year}`;
    }
  }
  return dStr.replace(/^Date\(s\)\s*/i, '').trim();
};

/**
 * Extracts a concise top realizations string from the auction's lots.
 */
const getNotableRealizations = (lots?: PastLotItem[]): string => {
  if (!lots || lots.length === 0) {
    return 'Official hammer prices and archive dossiers available upon request.';
  }

  // Sort lots by priceRealized descending to show top highlights
  const sorted = [...lots].sort((a, b) => {
    const priceA = parseFloat(a.priceRealized?.replace(/[^0-9.-]+/g, '') || '0') || 0;
    const priceB = parseFloat(b.priceRealized?.replace(/[^0-9.-]+/g, '') || '0') || 0;
    return priceB - priceA;
  });

  return sorted
    .slice(0, 2)
    .map((l) => {
      const shortTitle = l.title.length > 28 ? `${l.title.slice(0, 26).trim()}…` : l.title;
      const cleanPrice = l.priceRealized ? ` (${l.priceRealized.replace(/\.00$/, '')})` : '';
      return `${shortTitle}${cleanPrice}`;
    })
    .join(' · ');
};

export const PastAuctionsSection: React.FC<PastAuctionsSectionProps> = ({
  auctions,
  limit = 3,
  onNavigate,
  onInquirePast
}) => {
  // 1. Dynamic state for past auctions fetched from Supabase
  const [dynamicAuctions, setDynamicAuctions] = useState<PastAuction[]>([]);
  const [loading, setLoading] = useState<boolean>(!auctions);

  // 2. Fetch concluded auctions dynamically from Supabase
  useEffect(() => {
    if (auctions && auctions.length > 0) {
      setDynamicAuctions(auctions);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPastAuctions() {
      try {
        const [
          { data: auctionsData, error: errA },
          { data: lotsData, error: errL },
          { data: invoicesData },
          { data: settlementsData }
        ] = await Promise.all([
          supabase.from('auctions').select('*').order('created_at', { ascending: false }),
          supabase.from('lots').select('*').order('lot_number', { ascending: true }),
          supabase.from('invoices').select('*'),
          supabase.from('seller_settlements').select('*')
        ]);

        if (!isMounted) return;

        if (errA || errL) {
          console.error('[PastAuctionsSection] Supabase fetch error:', errA || errL);
          setLoading(false);
          return;
        }

        const rawAuctions = Array.isArray(auctionsData) ? auctionsData : [];
        const rawLots = Array.isArray(lotsData) ? lotsData : [];
        const rawInvoices = Array.isArray(invoicesData) ? invoicesData : [];
        const rawSettlements = Array.isArray(settlementsData) ? settlementsData : [];

        // Concluded auctions only (Closed, Concluded, Ended, Past, Completed)
        const concludedRaw = rawAuctions.filter((a) => isConcludedAuction(a.status));

        const mapped: PastAuction[] = concludedRaw.map((a) => {
          // Associated lots in this auction's catalog
          const matchingLots = rawLots.filter(
            (l) => l.auction_id === a.id || l.auction_id === a.code
          );

          // Completed / Sold lots in this auction
          const matchingCompletedLots: PastLotItem[] = matchingLots
            .filter((l) => isCompletedLot(l.status))
            .map((l) => {
              const lotNumberStr = l.lot_number
                ? (String(l.lot_number).toLowerCase().startsWith('lot') ? String(l.lot_number) : `Lot ${l.lot_number}`)
                : 'Lot';
              const soldAmount = Number(l.hammer_price) || Number(l.sold_price) || Number(l.current_bid) || 0;
              return {
                id: l.id,
                auctionId: l.auction_id,
                auctionTitle: a.name || 'Gardner Auction',
                lotNumber: lotNumberStr,
                categoryTag: (l.category || a.category || 'SPECIALTY CATALOG').toUpperCase(),
                department: l.category || a.category || 'Specialty Catalog',
                title: l.title || lotNumberStr,
                description: (l.condition_report || l.description || l.title || '').trim(),
                details: (l.description || l.condition_report || '').trim(),
                image: l.image || '/images/hero_coin.jpg',
                priceRealized: `$${soldAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                startingBid: Number(l.starting_bid) || 0,
                estimateLow: Number(l.estimate_low) || 0,
                estimateHigh: Number(l.estimate_high) || 0,
                bidsCount: Number(l.bids_count) || 0,
                dateSold: l.updated_at || a.end_date || 'Concluded',
                auctionHouse: a.name || 'Gardner Auction Appraisers',
                location: [a.city, a.state].filter(Boolean).join(', ') || 'Pittsburgh, PA',
                shipping: a.shipping_availability || 'Shipping Available',
                provenance: l.provenance || '',
                conditionReport: l.condition_report || '',
                specialistNote: ''
              };
            });

          // Dynamic Total Realized calculation from Invoices, Settlements, and Sold Lots
          const totalRealizedStr = calculateAuctionTotalRealized(a.id, rawLots, rawInvoices, rawSettlements);

          // Featured auction image
          let img = '/images/hero_coin.jpg';
          if (Array.isArray(a.featured_images) && a.featured_images.length > 0) {
            const first = a.featured_images[0];
            img = typeof first === 'string' ? first : (first?.url || img);
          } else if (matchingLots[0]?.image) {
            img = matchingLots[0].image;
          }

          const dateRangeStr = formatAuctionDates(a.start_date, a.end_date) || (a.upload_settings?.auctionDateTimes || '');

          return {
            id: a.id,
            title: a.name || 'Concluded Auction Catalog',
            auctionType: a.auction_type || a.upload_settings?.biddingType || 'Online Only Auction',
            status: 'Past Auction',
            companyName: a.company_name || 'Gardner Auction Appraisers',
            address: [a.address1, a.address2].filter(Boolean).join(', ') || '4200 Commercial Boulevard',
            cityStateZip: [a.city, a.state, a.zip].filter(Boolean).join(' ') || 'Pittsburgh, PA 15201',
            mapQuery: 'Pittsburgh+PA',
            dateRange: dateRangeStr,
            scheduleText: '',
            description: (a.description || 'Verified authentic curated collectibles auction session recorded by Gardner Auction Appraisers.').trim(),
            biddingNotice: a.bidding_notice || '',
            auctionNotice: a.auction_notice || '',
            image: img,
            category: a.category || (matchingLots[0]?.category || 'Coins & Currency'),
            lotsCount: matchingCompletedLots.length > 0 ? matchingCompletedLots.length : matchingLots.length,
            totalRealized: totalRealizedStr,
            shipping: a.shipping_availability || 'Shipping Available',
            lots: matchingCompletedLots
          };
        });

        setDynamicAuctions(mapped);
      } catch (e) {
        console.error('[PastAuctionsSection] Exception loading past auctions:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPastAuctions();

    // Supabase Realtime channel for live synchronisation
    const channel = supabase
      .channel('home-past-auctions-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => {
        loadPastAuctions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => {
        loadPastAuctions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        loadPastAuctions();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [auctions]);

  const dataSource = auctions || dynamicAuctions;

  const pastSessions = useMemo(() => {
    return dataSource.slice(0, limit).map((auction) => {
      const date = formatAuctionDate(auction.dateRange);
      const soldRate =
        (auction as any).soldRate ||
        (auction.lotsCount ? `${auction.lotsCount} Lots Sold` : 'Concluded Session');
      const leadCategory =
        (auction as any).leadCategory ||
        auction.category ||
        'Specialty Catalog';
      const realized = auction.totalRealized || 'Hammer Concluded';
      const topLots =
        (auction as any).topLots ||
        getNotableRealizations(auction.lots);
      const image = auction.image || '/images/hero_coin.jpg';

      // Match the existing auction detail route pattern
      const detailUrl = `#auction/${auction.id}`;

      return {
        id: auction.id,
        title: auction.title,
        realized,
        soldRate,
        date,
        leadCategory,
        topLots,
        image,
        detailUrl
      };
    });
  }, [dataSource, limit]);

  const handleLinkClick = (detailUrl: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(detailUrl);
    }
  };

  return (
    <section id="catalogs" className="past-auctions-section" aria-label="Past Auctions and Realized Catalogs">
      <div className="section-container container-fluid">
        <div className="section-header-row">
          <div className="section-header-left">
            <span className="section-eyebrow">ARCHIVE &amp; REALIZATIONS</span>
            <h2 className="section-main-title">Past Auctions &amp; Catalogs</h2>
            <p className="section-subtitle">
              Review completed hammer prices, clearance rates, and archived lots from recent signature sales.
            </p>
          </div>
        </div>

        {/* Loading skeleton / Dynamic Past Sessions Cards */}
        {loading && pastSessions.length === 0 ? (
          <div className="past-grid">
            {[1, 2, 3].slice(0, limit).map((idx) => (
              <div key={idx} className="past-card" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                <div className="past-card-image-wrap" style={{ background: '#171b26' }} />
                <div className="past-card-body">
                  <div className="past-card-meta-top">
                    <span className="past-date" style={{ background: '#222838', color: 'transparent', borderRadius: 4 }}>Loading 2026</span>
                    <span className="past-sold-rate" style={{ background: '#222838', color: 'transparent', borderRadius: 4 }}>Loading Lots</span>
                  </div>
                  <h3 className="past-title" style={{ background: '#222838', color: 'transparent', borderRadius: 4, height: 24, marginBottom: 8 }}>
                    Loading Auction
                  </h3>
                  <p className="past-category" style={{ background: '#222838', color: 'transparent', borderRadius: 4, width: '40%' }}>
                    Category
                  </p>
                  <div className="past-realized-box" style={{ height: 48, background: '#171b26' }} />
                  <div className="past-top-lots" style={{ height: 36, background: '#171b26', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : pastSessions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '44px 20px',
              background: '#111520',
              border: '1px solid rgba(203, 161, 53, 0.2)',
              borderRadius: '6px',
              marginTop: '36px'
            }}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: '#dfba52', marginBottom: '8px' }}>
              Archive &amp; Realizations
            </p>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', maxWidth: '520px', margin: '0 auto' }}>
              No completed auction sessions recorded in the database yet. Concluded catalog sales will appear here automatically upon gavel close.
            </p>
          </div>
        ) : (
          <div className="past-grid">
            {pastSessions.map((session) => (
              <div key={session.id} className="past-card">
                <div className="past-card-image-wrap">
                  <a
                    href={session.detailUrl}
                    onClick={(e) => handleLinkClick(session.detailUrl, e)}
                    style={{ display: 'block', width: '100%', height: '100%' }}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <img
                      src={session.image}
                      alt={session.title}
                      className="past-card-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/hero_coin.jpg';
                      }}
                    />
                  </a>
                  <div className="past-card-badge">
                    <CheckCircle2 size={13} />
                    <span>CONCLUDED SESSION</span>
                  </div>
                </div>

                <div className="past-card-body">
                  <div className="past-card-meta-top">
                    <span className="past-date">{session.date}</span>
                    <span className="past-sold-rate">{session.soldRate}</span>
                  </div>

                  <h3 className="past-title">
                    <a
                      href={session.detailUrl}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      onClick={(e) => handleLinkClick(session.detailUrl, e)}
                    >
                      {session.title}
                    </a>
                  </h3>
                  <p className="past-category">{session.leadCategory}</p>

                  <div className="past-realized-box">
                    <div className="realized-col">
                      <span className="realized-label">TOTAL HAMMER REALIZED</span>
                      <span className="realized-sum">{session.realized}</span>
                    </div>
                  </div>

                  <div className="past-top-lots">
                    <span className="top-lots-label">NOTABLE REALIZATIONS:</span>
                    <p className="top-lots-text">{session.topLots}</p>
                  </div>

                  <div className="past-card-action">
                    <a
                      href={session.detailUrl}
                      className="btn-past-archive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onInquirePast) {
                          onInquirePast(session.title);
                        }
                        handleLinkClick(session.detailUrl, e);
                      }}
                      aria-label={`Request Realised Prices for ${session.title}`}
                    >
                      <span>Request Realized Prices</span>
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
