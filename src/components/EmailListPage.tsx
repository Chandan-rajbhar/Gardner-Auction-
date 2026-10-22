import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface EmailListPageProps {
  onSubscribe?: (email: string) => void;
  onOpenAuth?: () => void;
}

export const EmailListPage: React.FC<EmailListPageProps> = ({ onSubscribe, onOpenAuth }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();

    // 1. Email format validation
    if (!normalized) {
      setError('Please enter your email address.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalized)) {
      setError('Please provide a valid email address (e.g. collector@domain.com).');
      return;
    }

    // 2. Strict Authentication Requirement: guest subscriptions prevented
    if (!user || !user.id) {
      setError('Authentication required: You must be logged in to subscribe to the auction email list. Please log in first.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 3. Dynamic Supabase Storage in "email-list" table
      const { data, error: insertError } = await supabase
        .from('email-list')
        .insert([
          {
            email: normalized,
            user_id: user.id
          }
        ])
        .select();

      if (insertError) {
        // 4. Duplicate Email Validation (platform-wide uniqueness enforcement)
        if (
          insertError.code === '23505' ||
          insertError.message.toLowerCase().includes('duplicate') ||
          insertError.message.toLowerCase().includes('unique')
        ) {
          setError(`The email address "${normalized}" is already subscribed to the auction catalog email list.`);
          return;
        }

        // RLS or permission error
        if (
          insertError.code === '42501' ||
          insertError.message.toLowerCase().includes('policy') ||
          insertError.message.toLowerCase().includes('permission')
        ) {
          setError('Session expired or unauthorized. Please log in again to subscribe.');
          return;
        }

        setError(insertError.message || 'Failed to complete subscription. Please try again.');
        return;
      }

      if (data && data.length > 0) {
        setSubmittedEmail(normalized);
        setIsSuccess(true);
        if (onSubscribe) {
          onSubscribe(normalized);
        }
      } else {
        setError('Subscription was not recorded. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while subscribing.';
      setError(message);
    } finally {
      setIsSubmitting(false);
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

          {/* Authentication Status Pill */}
          <div className="email-page-auth-status">
            {user ? (
              <div className="auth-status-pill">
                <span className="auth-status-dot" />
                <span>Signed in as <strong>{user.name}</strong> ({user.email})</span>
              </div>
            ) : (
              <div className="auth-status-pill">
                <span className="auth-status-dot guest" />
                <span>
                  Guest Mode · {onOpenAuth && (
                    <button type="button" onClick={onOpenAuth} className="guest-login-link">
                      Log in to subscribe
                    </button>
                  )}
                </span>
              </div>
            )}
          </div>

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
                    placeholder={user ? "Enter email address to subscribe..." : "Log in to subscribe your email..."}
                    aria-label="Email address for auction catalog notifications"
                    required
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  className="email-page-submit-btn"
                  id="btn-join-email-list"
                  aria-label="Join Email List"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={17} className="btn-arrow-icon animate-spin" />
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Email List</span>
                      <ArrowRight size={17} className="btn-arrow-icon" />
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="email-page-error-msg" role="alert" aria-live="polite">
                  <div className="error-text-line">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                  {!user && onOpenAuth && (
                    <button
                      type="button"
                      className="btn-error-signin"
                      onClick={onOpenAuth}
                    >
                      <LogIn size={14} />
                      <span>Log In to Subscribe</span>
                    </button>
                  )}
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

export default EmailListPage;
