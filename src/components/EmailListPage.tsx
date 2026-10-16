import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface EmailListPageProps {
  onSubscribe?: (email: string) => void;
}

export const EmailListPage: React.FC<EmailListPageProps> = ({ onSubscribe }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }

    // Standard RFC-compliant email pattern check
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      setError('Please provide a valid email address (e.g. collector@domain.com).');
      return;
    }

    setError('');
    setSubmittedEmail(trimmed);
    setIsSuccess(true);
    if (onSubscribe) {
      onSubscribe(trimmed);
    }
  };

  const handleReset = () => {
    setEmail('');
    setError('');
    setIsSuccess(false);
    setSubmittedEmail('');
  };

  return (
    <main className="email-page-main" role="main" aria-label="Join Auction Email List">
      <div className="email-page-ambient-glow" aria-hidden="true"></div>

      <div className="container-fluid email-page-container">
        <div className="email-page-card">
          {/* Eyebrow Label */}
          <div className="email-page-eyebrow-wrap">
            <span className="email-page-dash">——</span>
            <span className="email-page-eyebrow">AUCTION NOTIFICATIONS</span>
            <span className="email-page-dash">——</span>
          </div>

          {/* Main Heading */}
          <h1 className="email-page-heading">
            Join Our Auction Email List
          </h1>

          {/* Supporting Description */}
          <p className="email-page-description">
            Receive advance catalog releases, private preview invitations, and consignment dates for upcoming gold, silver, and rare coin sales.
          </p>

          {isSuccess ? (
            <div className="email-page-success-card" role="status" aria-live="polite">
              <div className="success-icon-badge">
                <CheckCircle2 size={28} className="success-badge-icon" />
              </div>
              <h2 className="success-title">Thank You for Subscribing</h2>
              <p className="success-text">
                You have been enrolled to receive advance catalog previews at{' '}
                <strong className="success-highlight-email">{submittedEmail}</strong>.
              </p>
              <div className="success-subtext">
                <ShieldCheck size={16} />
                <span>Private collector communication protocol active.</span>
              </div>
              <button
                type="button"
                className="btn-subscribe-another"
                onClick={handleReset}
              >
                Register Another Email Address
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="email-page-form" noValidate>
              <div className="email-page-input-row">
                <div className={`email-page-input-wrapper ${error ? 'has-error' : ''}`}>
                  <Mail size={19} className="email-field-icon" aria-hidden="true" />
                  <input
                    type="email"
                    id="dedicated-email-input"
                    className="email-page-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter your email address..."
                    aria-label="Email address for auction catalog notifications"
                    required
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  className="email-page-submit-btn"
                  id="btn-join-email-list"
                  aria-label="Join Email List"
                >
                  <span>Join Email List</span>
                  <ArrowRight size={17} className="btn-arrow-icon" />
                </button>
              </div>

              {error && (
                <div className="email-page-error-msg" role="alert" aria-live="polite">
                  <span>{error}</span>
                </div>
              )}

              {/* Fiduciary Privacy Note */}
              <div className="email-page-privacy-container">
                <ShieldCheck size={14} className="privacy-shield-icon" />
                <p className="email-page-privacy-text">
                  Fiduciary privacy guaranteed. Unsubscribe at any time with one click.
                </p>
              </div>
            </form>
          )}

          {/* Subtle Trust Indicators */}
          <div className="email-page-trust-footer">
            <div className="trust-pill">
              <span className="trust-pill-dot"></span>
              <span>Advance Catalogs</span>
            </div>
            <div className="trust-pill">
              <span className="trust-pill-dot"></span>
              <span>Private Previews</span>
            </div>
            <div className="trust-pill">
              <span className="trust-pill-dot"></span>
              <span>No Spam Guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
