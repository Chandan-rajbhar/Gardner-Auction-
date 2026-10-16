import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CURATED_EVENTS } from '../data/auctionData';
import type { CuratedEvent } from '../data/auctionData';

interface CuratedEventsProps {
  onEventClick: (event: CuratedEvent) => void;
  onRequestCondition: (event: CuratedEvent) => void;
}

export const CuratedEvents: React.FC<CuratedEventsProps> = ({
  onEventClick,
  onRequestCondition
}) => {
  return (
    <section id="auctions" className="curated-events-section" aria-label="Explore Our Auctions">
      <div className="section-container container-fluid">
        {/* Section Header */}
        <div className="section-header-row">
          <div className="section-header-left">
            <span className="section-eyebrow">FEATURED SESSIONS</span>
            <h2 className="section-main-title">Explore Our Auctions</h2>
            <p className="section-subtitle">
              Active and upcoming auctions featuring authenticated rare coins, fine silver, investment bullion, and estate collections.
            </p>
          </div>

          <a href="#catalogs" className="view-calendar-link" title="Browse past completed auctions">
            <span>Browse Completed Auctions</span>
            <ArrowRight size={16} />
          </a>
        </div>

        {/* 3 Event Cards Grid */}
        <div className="events-grid">
          {CURATED_EVENTS.map((event) => {
            const getBadgeClass = () => {
              if (event.badgeType === 'red') return 'badge-live-red';
              if (event.badgeType === 'green') return 'badge-status-green';
              return 'badge-gold-gold';
            };

            return (
              <div key={event.id} className="event-card">
                {/* Event Image Box */}
                <div
                  className="event-card-media"
                  onClick={() => onEventClick(event)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEventClick(event);
                    }
                  }}
                >
                  <img src={event.image} alt={event.title} className="event-img" />
                  
                  {/* Floating Badges */}
                  <div className="event-badges-overlay">
                    <span className={`event-badge-pill ${getBadgeClass()}`}>
                      {event.badge}
                    </span>
                    <span className="event-lots-pill">
                      {event.lotsCount} LOTS
                    </span>
                  </div>
                </div>

                {/* Event Card Content */}
                <div className="event-card-body">
                  <div className="event-type-tag">
                    {event.typeTag}
                  </div>

                  <h3
                    className="event-title"
                    onClick={() => onEventClick(event)}
                    role="button"
                    tabIndex={0}
                  >
                    {event.title}
                  </h3>

                  <p className="event-description">
                    {event.description}
                  </p>

                  {/* Card Footer: Estimate & CTA */}
                  <div className="event-card-footer">
                    <div className="event-estimate-meta">
                      <span className="estimate-label">{event.dateLabel}</span>
                      <span className="estimate-val">{event.estimate}</span>
                    </div>

                    <div className="event-cta-btn-wrap">
                      {event.buttonVariant === 'dark' && (
                        <button
                          type="button"
                          className="btn-event-dark"
                          onClick={() => onEventClick(event)}
                        >
                          <span>{event.buttonText}</span>
                        </button>
                      )}

                      {event.buttonVariant === 'gold' && (
                        <button
                          type="button"
                          className="btn-event-gold"
                          onClick={() => onEventClick(event)}
                        >
                          <span>{event.buttonText}</span>
                        </button>
                      )}

                      {event.buttonVariant === 'outline' && (
                        <button
                          type="button"
                          className="btn-event-outline"
                          onClick={() => onRequestCondition(event)}
                        >
                          <span>{event.buttonText}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
