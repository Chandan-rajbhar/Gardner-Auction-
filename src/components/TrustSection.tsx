import React from 'react';
import { ShieldCheck, FileCheck, Award } from 'lucide-react';

export const TrustSection: React.FC = () => {
  return (
    <section className="trust-section" aria-label="Trust and Credibility Standards">
      <div className="section-container container-fluid">
        <div className="trust-grid">
          {/* Item 1 */}
          <div className="trust-card">
            <div className="trust-icon-wrap">
              <Award size={22} className="trust-icon" />
            </div>
            <div className="trust-card-content">
              <h3 className="trust-card-title">PA Licensed &amp; Bonded</h3>
              <p className="trust-card-desc">
                Regulated under Pennsylvania Auctioneer Act 85, License #AY-002004 with $500,000 Commonwealth surety bond.
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="trust-card">
            <div className="trust-icon-wrap">
              <FileCheck size={22} className="trust-icon" />
            </div>
            <div className="trust-card-content">
              <h3 className="trust-card-title">Authenticated Provenance</h3>
              <p className="trust-card-desc">
                Every rare coin and precious metal specimen carries certified authentication and grading by PCGS, NGC, or GIA.
              </p>
            </div>
          </div>

          {/* Item 3 */}
          <div className="trust-card">
            <div className="trust-icon-wrap">
              <ShieldCheck size={22} className="trust-icon" />
            </div>
            <div className="trust-card-content">
              <h3 className="trust-card-title">Transparent Bidding &amp; Escrow</h3>
              <p className="trust-card-desc">
                Clear 15% standard buyer's premium schedule, secure escrow settlement, and insured white-glove courier dispatch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
