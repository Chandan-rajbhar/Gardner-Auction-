import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    if (path === '/') {
      if (window.location.pathname !== '/' || window.location.hash) {
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (onNavigate) {
        onNavigate('/');
      }
    } else {
      if (window.location.hash !== path) {
        window.history.pushState(null, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (onNavigate) {
        onNavigate(path);
      }
    }
  };

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container-fluid footer-container">
        {/* Main Footer Row */}
        <div className="footer-main-row">
          {/* Brand Col */}
          <div className="footer-brand-col">
            <div className="footer-brand-logo">
              <img
                src="/images/gardner_logo.png"
                alt="Gardner Auction Since 1960"
                className="footer-logo-img"
              />
              <div>
                <span className="footer-brand-name">GARDNER AUCTION</span>
                <span className="footer-brand-tag">APPRAISERS &amp; AUCTIONEERS</span>
              </div>
            </div>
            <p className="footer-summary">
              Pennsylvania's premier certified auction institution specializing in rare gold, fine silver, numismatics, and fine estate collections.
            </p>
          </div>

          {/* Quick Links Col: ONLY the 4 required links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">NAVIGATION</h4>
            <ul className="footer-nav-list">
              <li>
                <a href="/" onClick={(e) => handleNavClick(e, '/')}>
                  Home
                </a>
              </li>
              <li>
                <a href="#auctions" onClick={(e) => handleNavClick(e, '#auctions')}>
                  Current Auctions
                </a>
              </li>
              <li>
                <a href="#catalogs" onClick={(e) => handleNavClick(e, '#catalogs')}>
                  Past Auctions
                </a>
              </li>
              <li>
                <a href="#email-list" onClick={(e) => handleNavClick(e, '#email-list')}>
                  Email List
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Information Col */}
          <div className="footer-contact-col">
            <h4 className="footer-col-title">GALLERY CONTACT</h4>
            <ul className="footer-contact-list">
              <li>
                <MapPin size={15} className="footer-icon" />
                <span>4200 Commercial Boulevard, Suite 100, Pittsburgh, PA 15201</span>
              </li>
              <li>
                <Phone size={15} className="footer-icon" />
                <a href="tel:4125550199">(412) 555-0199</a>
              </li>
              <li>
                <Mail size={15} className="footer-icon" />
                <a href="mailto:info@gardnerauction.com">info@gardnerauction.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal / Copyright Row */}
        <div className="footer-bottom-row">
          <p className="footer-copyright">
            © 1960–2026 Gardner Auction LLC. All Rights Reserved. Regulated PA Auctioneer License #AY-002004.
          </p>

          <div className="footer-licensure">
            <ShieldCheck size={14} className="lic-icon" />
            <span>Commonwealth of Pennsylvania Registered &amp; Bonded Auction House</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
