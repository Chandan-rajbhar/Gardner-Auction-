import React, { useMemo } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { PAST_AUCTIONS } from './PastCatalogs';
import type { PastAuction, PastLotItem } from './PastCatalogs';

interface PastAuctionsSectionProps {
  auctions?: PastAuction[];
  limit?: number;
  onNavigate?: (path: string) => void;
  onInquirePast?: (auctionTitle: string) => void;
}

/**
 * Formats a raw date range string (e.g. "Date(s) 9/11/2026 - 9/18/2026") into a readable "Month Year" label.
 */
const formatAuctionDate = (dateRange?: string): string => {
  if (!dateRange) return 'Concluded 2026';
  const match = dateRange.match(/(\d{1,2})\/\d{1,2}\/(\d{4})/);
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
  return dateRange.replace(/^Date\(s\)\s*/i, '').trim();
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
  const dataSource = auctions || PAST_AUCTIONS;

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

      // Match the existing auction detail route pattern from PastCatalogs.tsx
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

        {/* 3 Past Sessions Cards */}
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
      </div>
    </section>
  );
};
