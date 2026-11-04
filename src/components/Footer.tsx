import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import type { SiteFooterContent } from '../types/siteContent';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const DEFAULT_FOOTER_CONTENT: SiteFooterContent = {
  brand: {
    name: 'GARDNER AUCTION',
    tagline: 'APPRAISERS & AUCTIONEERS · SINCE 1960',
    logo: {
      url: '/images/gardner_logo.png',
      alt: 'Gardner Auction Since 1960'
    }
  },
  description: "Pennsylvania's premier certified auction institution specializing in rare gold, fine silver, numismatics, and fine estate collections.",
  navigation: {
    title: 'NAVIGATION',
    links: [
      { label: 'Home', destination: '/' },
      { label: 'Current Auctions', destination: '#auctions' },
      { label: 'Past Auctions', destination: '#catalogs' },
      { label: 'Email List', destination: '#email-list' }
    ]
  },
  contact: {
    title: 'GALLERY CONTACT',
    address: {
      text: '4200 Commercial Boulevard, Suite 100, Pittsburgh, PA 15201',
      icon: 'MapPin'
    },
    phone: {
      label: '(412) 555-0199',
      destination: 'tel:4125550199',
      icon: 'Phone'
    },
    email: {
      label: 'info@gardnerauction.com',
      destination: 'mailto:info@gardnerauction.com',
      icon: 'Mail'
    }
  },
  legal: {
    copyright: '© 1960–2026 Gardner Auction LLC. All Rights Reserved. Regulated PA Auctioneer License #AY-002004.',
    licensure: {
      text: 'Commonwealth of Pennsylvania Registered & Bonded Auction House',
      icon: 'ShieldCheck'
    }
  }
};

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { content } = useSiteContent('site_footer', DEFAULT_FOOTER_CONTENT);
  const footer = content || DEFAULT_FOOTER_CONTENT;

  const brand = footer.brand || DEFAULT_FOOTER_CONTENT.brand;
  const description = footer.description || DEFAULT_FOOTER_CONTENT.description;
  const navigation = footer.navigation || DEFAULT_FOOTER_CONTENT.navigation;
  const contact = footer.contact || DEFAULT_FOOTER_CONTENT.contact;
  const legal = footer.legal || DEFAULT_FOOTER_CONTENT.legal;

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
                src={brand.logo?.url || '/images/gardner_logo.png'}
                alt={brand.logo?.alt || 'Gardner Auction Since 1960'}
                className="footer-logo-img"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/gardner_logo.png';
                }}
              />
              <div>
                <span className="footer-brand-name">{brand.name || 'GARDNER AUCTION'}</span>
                <span className="footer-brand-tag">{brand.tagline || 'APPRAISERS & AUCTIONEERS'}</span>
              </div>
            </div>
            <p className="footer-summary">
              {description}
            </p>
          </div>

          {/* Quick Links Col */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">{navigation.title || 'NAVIGATION'}</h4>
            <ul className="footer-nav-list">
              {(navigation.links || DEFAULT_FOOTER_CONTENT.navigation.links).map((link, idx) => (
                <li key={idx}>
                  <a href={link.destination} onClick={(e) => handleNavClick(e, link.destination)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Information Col */}
          <div className="footer-contact-col">
            <h4 className="footer-col-title">{contact.title || 'GALLERY CONTACT'}</h4>
            <ul className="footer-contact-list">
              {contact.address?.text && (
                <li>
                  <MapPin size={15} className="footer-icon" />
                  <span>{contact.address.text}</span>
                </li>
              )}
              {contact.phone?.label && (
                <li>
                  <Phone size={15} className="footer-icon" />
                  <a href={contact.phone.destination || `tel:${contact.phone.label.replace(/\D/g, '')}`}>
                    {contact.phone.label}
                  </a>
                </li>
              )}
              {contact.email?.label && (
                <li>
                  <Mail size={15} className="footer-icon" />
                  <a href={contact.email.destination || `mailto:${contact.email.label}`}>
                    {contact.email.label}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Legal / Copyright Row */}
        <div className="footer-bottom-row">
          <p className="footer-copyright">
            {legal.copyright || DEFAULT_FOOTER_CONTENT.legal.copyright}
          </p>

          {legal.licensure?.text && (
            <div className="footer-licensure">
              <ShieldCheck size={14} className="lic-icon" />
              <span>{legal.licensure.text}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
