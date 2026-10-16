import React from 'react';
import { Search, UserCheck, ShieldCheck, Award, Lock, Percent, FileCheck } from 'lucide-react';

export const BidderTrustProtocol: React.FC = () => {
  return (
    <section id="how-to-bid" className="bidder-trust-section">
      <div className="section-container container-fluid">
        {/* Header */}
        <div className="dept-header-center">
          <span className="section-eyebrow">BIDDER TRUST PROTOCOL</span>
          <h2 className="section-main-title">Participating with Confidence</h2>
          <p className="section-subtitle">
            A transparent, regulated auction experience backed by Pennsylvania licensure.
          </p>
        </div>

        {/* 3 Step Protocol Cards */}
        <div className="protocol-steps-grid">
          {/* Step 01 */}
          <div className="protocol-card">
            <div className="protocol-card-top">
              <div className="protocol-icon-box">
                <Search size={22} className="protocol-icon" />
              </div>
              <span className="protocol-step-number">01</span>
            </div>
            <h3 className="protocol-step-title">Discover Auctions</h3>
            <p className="protocol-step-desc">
              Review comprehensive, high-resolution condition reports, PCGS/NGC certifications,
              provenance dossiers, and scheduled preview times in person.
            </p>
          </div>

          {/* Step 02 */}
          <div className="protocol-card">
            <div className="protocol-card-top">
              <div className="protocol-icon-box">
                <UserCheck size={22} className="protocol-icon" />
              </div>
              <span className="protocol-step-number">02</span>
            </div>
            <h3 className="protocol-step-title">Register &amp; Be Approved</h3>
            <p className="protocol-step-desc">
              Seamless bidder identity verification for telephone, absentee, or real-time webcast floor access
              with instant credit pre-authorization.
            </p>
          </div>

          {/* Step 03 */}
          <div className="protocol-card">
            <div className="protocol-card-top">
              <div className="protocol-icon-box">
                <ShieldCheck size={22} className="protocol-icon" />
              </div>
              <span className="protocol-step-number">03</span>
            </div>
            <h3 className="protocol-step-title">Win &amp; Settle Securely</h3>
            <p className="protocol-step-desc">
              Transparent 15% standard buyer's premium, escrow bank-wire settlement, and insured white-glove
              packaging with worldwide recorded courier dispatch.
            </p>
          </div>
        </div>

        {/* 4 Trust Seals Banner */}
        <div className="trust-seals-banner">
          <div className="trust-seal-strip-item">
            <Award size={24} className="gold-seal-icon" />
            <div className="seal-text-group">
              <h4 className="seal-title">PA-LICENSED AUCTIONEER</h4>
              <p className="seal-sub">Regulated under PA Act 85, AY-002004</p>
            </div>
          </div>

          <div className="trust-seal-strip-item">
            <Lock size={24} className="gold-seal-icon" />
            <div className="seal-text-group">
              <h4 className="seal-title">LICENSED &amp; BONDED</h4>
              <p className="seal-sub">$500,000 Surety Bond with Commonwealth</p>
            </div>
          </div>

          <div className="trust-seal-strip-item">
            <Percent size={24} className="gold-seal-icon" />
            <div className="seal-text-group">
              <h4 className="seal-title">15% BUYER'S PREMIUM</h4>
              <p className="seal-sub">Competitive, transparent tiered fee rates</p>
            </div>
          </div>

          <div className="trust-seal-strip-item">
            <FileCheck size={24} className="gold-seal-icon" />
            <div className="seal-text-group">
              <h4 className="seal-title">TITLE GUARANTEE</h4>
              <p className="seal-sub">100% Unconditional Authenticity</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
