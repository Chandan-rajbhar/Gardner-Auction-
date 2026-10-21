import React, { useState } from 'react';
import { X, KeyRound, Mail, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = ''
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your registered bidder email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. bidder@domain.com).');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(cleanEmail);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage(result.message || 'If an account exists for this email, you will receive password reset instructions.');
    } else {
      setErrorMessage(result.error || 'Failed to dispatch password recovery link.');
    }
  };

  const handleClose = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-modal-crest">
            <KeyRound size={20} color="#cba135" />
          </div>
          <div>
            <h3 className="auth-modal-title">Reset Bidder Account Access</h3>
            <p className="auth-modal-subtitle">Recover your live bidding and webcast credentials</p>
          </div>
          <button className="auth-modal-close" onClick={handleClose} type="button" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {successMessage ? (
          <div className="auth-reset-success-box">
            <div className="auth-reset-success-icon">
              <CheckCircle2 size={34} color="#059669" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f5f6f9', margin: '12px 0 6px' }}>
              Password Reset Dispatched
            </h4>
            <p style={{ fontSize: 13, color: '#b5b9c4', lineHeight: 1.5, marginBottom: 14 }}>
              {successMessage}
            </p>
            <div className="auth-smtp-note">
              <Info size={14} color="#dfba52" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 11.5, color: '#eee9e0', lineHeight: 1.4 }}>
                Please check your inbox (and spam folder) for the secure recovery link. The recovery link will allow you to set a new password.
              </span>
            </div>
            <button 
              className="btn-auth-primary" 
              type="button" 
              onClick={handleClose}
              style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}
            >
              <span>Return to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-modal-body" noValidate>
            {errorMessage && (
              <div className="auth-alert-error" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <p style={{ fontSize: 13, color: '#b5b9c4', lineHeight: 1.5, marginBottom: 16 }}>
              Enter your registered bidder email address. Supabase Auth will send a secure password reset link to your inbox.
            </p>

            <div className="auth-form-field">
              <label className="auth-label" htmlFor="forgot-email">Bidder Email Address *</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input 
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="bidder@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="auth-modal-actions">
              <button 
                type="button" 
                className="btn-auth-secondary" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-auth-primary"
                disabled={isSubmitting}
                id="btn-confirm-forgot-password"
              >
                {isSubmitting ? (
                  <>
                    <span className="auth-spinner" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="auth-security-footnote">
              <ShieldCheck size={14} color="#059669" />
              <span>Identity validated under Supabase Auth 256-bit TLS security</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
