import React, { useState } from 'react';
import { X, KeyRound, Mail, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

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
  const { resetPassword, isSupabaseConnected } = useAuth();
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
      const msg = 'Please enter your registered administrator or operator email address.';
      setErrorMessage(msg);
      toast.error('Please enter a valid email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const msg = 'Please enter a valid email address (e.g. name@gardner-auction.com).';
      setErrorMessage(msg);
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword(cleanEmail);
      if (result.success) {
        setSuccessMessage(result.message || 'If an account exists for this email, you will receive password reset instructions.');
        toast.success('Password reset email sent. Please check your inbox.');
      } else {
        const errText = result.error || 'Failed to dispatch password recovery link.';
        setErrorMessage(errText);
        if (errText.toLowerCase().includes('fetch') || errText.toLowerCase().includes('network')) {
          toast.error('Unable to connect. Please try again.');
        } else {
          toast.error(errText);
        }
      }
    } catch (err: any) {
      toast.error('Unable to connect. Please try again.');
    } finally {
      setIsSubmitting(false);
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
            <KeyRound size={22} color="#b48316" />
          </div>
          <div>
            <h3 className="auth-modal-title">Reset Operator Access</h3>
            <p className="auth-modal-subtitle">Recover administrator &amp; clerking rostrum credentials</p>
          </div>
          <button className="auth-modal-close" onClick={handleClose} type="button" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {successMessage ? (
          <div className="auth-reset-success-box">
            <div className="auth-reset-success-icon">
              <CheckCircle2 size={36} color="#059669" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '12px 0 6px' }}>
              Password Reset Dispatched
            </h4>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
              {successMessage}
            </p>
            <div className="auth-smtp-note">
              <Info size={14} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 11.5, color: '#0369a1', lineHeight: 1.4 }}>
                Please check your inbox (and spam folder) for the secure recovery link. Note that actual delivery depends on your Supabase SMTP/email provider configuration.
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

            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
              Enter your registered Gardner Auction administrative email address. Supabase Auth will send a secure password reset link to your inbox.
            </p>

            <div className="auth-form-field">
              <label className="auth-label" htmlFor="forgot-email">Administrator / Operator Email *</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input 
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="name@gardner-auction.com"
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
