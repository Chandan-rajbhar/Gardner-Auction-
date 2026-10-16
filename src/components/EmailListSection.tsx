import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';

interface EmailListSectionProps {
  onSubscribe: (email: string) => void;
}

export const EmailListSection: React.FC<EmailListSectionProps> = ({ onSubscribe }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      setError('Please provide a valid email address (e.g. collector@domain.com).');
      return;
    }

    setError('');
    setIsSuccess(true);
    onSubscribe(trimmed);
  };

  return (
    <section id="email-list" className="email-list-section" aria-label="Join Auction Email List">
      <div className="section-container container-fluid">
        <div className="email-cta-box">
          <div className="email-cta-content">
            <span className="email-eyebrow">AUCTION NOTIFICATIONS</span>
            <h2 className="email-title">Join Our Auction Email List</h2>
            <p className="email-subtitle">
              Receive advance catalog releases, private preview invitations, and consignment dates for upcoming gold, silver, and rare coin sales.
            </p>

            {isSuccess ? (
              <div className="email-success-message" role="status" aria-live="polite">
                <CheckCircle2 size={20} className="success-icon" />
                <div>
                  <h4>Thank You for Subscribing</h4>
                  <p>You have been enrolled to receive advance catalog previews at <strong>{email}</strong>.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="email-form" noValidate>
                <div className="email-input-wrap">
                  <Mail size={18} className="email-input-icon" />
                  <input
                    type="email"
                    id="email-input-field"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter your email address..."
                    aria-label="Email address for auction updates"
                    className={`email-input ${error ? 'input-error' : ''}`}
                    required
                  />
                  <button type="submit" className="btn-email-submit">
                    <span>Join Email List</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
                {error && (
                  <p className="email-error-text" role="alert">
                    {error}
                  </p>
                )}
                <p className="email-privacy-note">
                  Fiduciary privacy guaranteed. Unsubscribe at any time with one click.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
