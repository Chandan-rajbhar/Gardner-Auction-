import React from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface PastAuctionsSectionProps {
  onInquirePast?: (auctionTitle: string) => void;
}

export const PastAuctionsSection: React.FC<PastAuctionsSectionProps> = ({ onInquirePast }) => {
  const pastSessions = [
    {
      id: 'past-1',
      title: 'Fall Signature Rare Coins & Bullion Session',
      realized: '$1,420,000',
      soldRate: '98.4% Lots Sold',
      date: 'October 2026',
      leadCategory: 'U.S. Numismatics & Investment Bullion',
      topLots: '1907 $20 High Relief ($18,500) · 1893-S Morgan ($1,450)',
      image: '/images/hero_coin.jpg'
    },
    {
      id: 'past-2',
      title: 'Winter Fine Estate Jewelry & Horology Session',
      realized: '$985,000',
      soldRate: '96.8% Lots Sold',
      date: 'August 2026',
      leadCategory: 'Estate Diamonds & Historic Pocket Watches',
      topLots: 'Art Deco 3.20ct Platinum Ring ($8,800) · Lancaster Tall Clock',
      image: '/images/diamond_ring.jpg'
    },
    {
      id: 'past-3',
      title: 'Pennsylvania Americana & Industrial Fine Art',
      realized: '$760,000',
      soldRate: '100% White Glove Sale',
      date: 'June 2026',
      leadCategory: 'Historic Americana & Oil Nocturnes',
      topLots: 'A.H. Gorson Monongahela Oil ($6,200) · Chippendale Moon Dial',
      image: '/images/gorson_painting.jpg'
    }
  ];

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
                <img src={session.image} alt={session.title} className="past-card-img" />
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

                <h3 className="past-title">{session.title}</h3>
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
                  <button
                    type="button"
                    className="btn-past-archive"
                    onClick={() => {
                      if (onInquirePast) onInquirePast(session.title);
                    }}
                  >
                    <span>Request Realized Prices</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
