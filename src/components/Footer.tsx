import React from 'react';
import { ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container container-fluid">
        {/* Top 4 Columns */}
        <div className="footer-columns-grid">
          {/* Col 1: Brand & Licensing */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#cba135" strokeWidth="2.5" strokeDasharray="3 2" />
                <circle cx="50" cy="50" r="40" stroke="#cba135" strokeWidth="1.5" />
                <path d="M50 16L53 26H63L55 32L58 42L50 36L42 42L45 32L37 26H47L50 16Z" fill="#cba135" />
                <path d="M34 52C34 43 41 37 50 37C59 37 66 43 66 52C66 62 58 68 50 68C45 68 39 65 36 60L42 56C44 59 47 61 50 61C54 61 58 57 58 52C58 47 54 44 50 44C46 44 42 47 42 52H52V58H34V52Z" fill="#cba135" />
                <path d="M26 78H74" stroke="#cba135" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <span className="footer-brand-title">GARDNER AUCTION</span>
                <span className="footer-brand-sub">AUCTIONEERS &amp; APPRAISERS</span>
              </div>
            </div>

            <p className="footer-about-text">
              Serving estates, institutions, and serious collectors with surgical auction and preservation,
              fiduciary discretion, and refined market reach since 1982.
            </p>

            <div className="footer-licensure-badge">
              <ShieldCheck size={16} className="lic-icon" />
              <span>Regulated &amp; Licensed PA Auction House #AY-002004</span>
            </div>
          </div>

          {/* Col 2: Departments */}
          <div className="footer-col">
            <h4 className="footer-heading">DEPARTMENTS</h4>
            <ul className="footer-links-list">
              <li><a href="#departments">Rare Numismatics</a></li>
              <li><a href="#departments">Estate Jewelry</a></li>
              <li><a href="#departments">Historical Americana</a></li>
              <li><a href="#departments">Fine Art &amp; Sculpture</a></li>
              <li><a href="#departments">Horology &amp; Pocket Watches</a></li>
            </ul>
          </div>

          {/* Col 3: Client Services */}
          <div className="footer-col">
            <h4 className="footer-heading">CLIENT SERVICES</h4>
            <ul className="footer-links-list">
              <li><a href="#absentee">Absentee &amp; Phone Bidding Form</a></li>
              <li><a href="#consign">Consignment Valuation Inquiry</a></li>
              <li><a href="#payment">Payment &amp; Wire Instructions</a></li>
              <li><a href="#shipping">Insured Shipping &amp; Pick-up Rules</a></li>
              <li><a href="#glossary">Glossary of Auction Terms</a></li>
            </ul>
          </div>

          {/* Col 4: Gallery & Salesroom */}
          <div className="footer-col">
            <h4 className="footer-heading">GALLERY &amp; SALESROOM</h4>
            <div className="footer-contact-info">
              <p className="gallery-name">Gardner Auction Galleries</p>
              <p className="gallery-address">
                <MapPin size={14} className="address-icon" />
                4200 Commercial Boulevard, Suite 100<br />
                Pittsburgh, PA 15201
              </p>
              <p className="gallery-contact">
                <Phone size={14} className="contact-icon" />
                <span>Tel: </span>
                <a href="tel:4125550199">(412) 555-0199</a>
              </p>
              <p className="gallery-contact">
                <Mail size={14} className="contact-icon" />
                <span>Email: </span>
                <a href="mailto:info@gardnerauction.com">info@gardnerauction.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Policy Links Strip */}
        <div className="footer-policy-strip">
          <a href="#provenance">PROVENANCE &amp; AUTHENTICATION GUARANTEE</a>
          <span className="policy-divider">·</span>
          <a href="#terms">CONSIGNMENT TERMS</a>
          <span className="policy-divider">·</span>
          <a href="#premium">BUYER'S PREMIUM SCHEDULE</a>
          <span className="policy-divider">·</span>
          <a href="#absentee-policy">ABSENTEE &amp; PHONE BIDDING POLICY</a>
          <span className="policy-divider">·</span>
          <a href="#privacy">PRIVACY STATEMENT</a>
          <span className="policy-divider">·</span>
          <a href="#licensure">PA DEPT. LICENSE #AY-002004</a>
        </div>

        {/* Bottom Copyright & Commonwealth Endorsement */}
        <div className="footer-bottom-row">
          <p className="copyright-text">
            © 1982–2026 Gardner Auctioneer Appraisers LLC. All Rights Reserved. Pennsylvania Auctioneer Agency (PAA) Accredited, Member NAA/PNAA.
          </p>
          <div className="commonwealth-badge">
            <span className="keystone-icon">⬢</span>
            <span>Commonwealth of Pennsylvania Registered Auction House</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
