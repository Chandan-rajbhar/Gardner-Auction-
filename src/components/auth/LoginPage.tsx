import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginPageProps {
  onSwitchToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup }) => {
  const { login, savedEmail } = useAuth();

  const [email, setEmail] = useState<string>(savedEmail || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(Boolean(savedEmail));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<boolean>(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

  const markTouched = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  React.useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [savedEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate login requests

    setErrorMessage(null);

    const cleanEmail = email.trim();
    const errors: { email?: string; password?: string } = {};

    if (!cleanEmail) {
      errors.email = 'Please enter a valid email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Do not allow empty or whitespace-only passwords
    if (!password || !password.trim()) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched({ email: true, password: true });

      if (!cleanEmail || !password || !password.trim()) {
        toast.error('Please complete all required fields.');
      } else if (errors.email) {
        toast.error('Please enter a valid email address.');
      }
      return;
    }

    setIsLoading(true);
    try {
      // Do not silently trim or modify password before authentication
      const res = await login(cleanEmail, password, rememberMe);

      if (!res.success) {
        const errText = res.error || 'Authentication failed.';
        const lower = errText.toLowerCase();

        let displayMsg = errText;
        if (
          lower.includes('invalid email or password') ||
          lower.includes('invalid login credentials') ||
          lower.includes('invalid credentials')
        ) {
          displayMsg = 'Invalid email or password.';
        } else if (lower.includes('unauthorized') || lower.includes('not authorized')) {
          displayMsg = 'You are not authorized to access this console.';
        } else if (lower.includes('fetch') || lower.includes('network') || lower.includes('connection')) {
          displayMsg = 'Unable to connect. Please try again.';
        }

        setErrorMessage(displayMsg);
        toast.error(displayMsg);
      } else {
        setSuccessNotice(true);
        toast.success('Signed in successfully.');
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
        toast.error('Unable to connect. Please try again.');
        setErrorMessage('Unable to connect. Please try again.');
      } else {
        toast.error('Authentication failed. Please try again.');
        setErrorMessage('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-split-page">
      {/* =====================================================================
          LEFT PANEL: Visual Branding, Auction Imagery & Feature Highlights
          ===================================================================== */}
      <div className="auth-split-visual">
        <img
          src="/images/Login_Image.png"
          alt=""
          className="auth-visual-bg-img"
          aria-hidden="true"
        />
        <div className="auth-visual-overlay" />

        <div className="auth-visual-content">
          {/* Top Brand & Gateway Status */}
          <div className="auth-visual-top">
            <div className="auth-brand-logo-group">
              <img
                src="/images/gardner_logo.png"
                alt="Gardner Auction Logo"
                className="auth-brand-emblem"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const next = e.currentTarget.nextElementSibling as HTMLElement;
                  if (next) next.style.display = 'flex';
                }}
              />
              <div className="brand-crest" style={{ display: 'none', width: 44, height: 44, fontSize: 22 }}>
                G
              </div>
              <div>
                <h1 className="auth-brand-name">Gardner Auction</h1>
                <p className="auth-brand-subtitle">Master Administrative Console</p>
              </div>
            </div>

            <div className="auth-badge-pill">
              <span className="auth-status-dot" />
              <span>Rostrum Active</span>
            </div>
          </div>

          {/* Bottom Security Trust Badge */}
          <div className="auth-visual-bottom">
            <div className="auth-legal-pill">
              <ShieldCheck size={14} color="#10b981" />
              <span>State Licensed &amp; Bonded Auctioneers • Supabase Auth 256-Bit TLS</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          RIGHT PANEL: Clean, Minimal, Vertically Centered Login Form
          ===================================================================== */}
      <div className="auth-split-form-panel">
        <div className="auth-form-inner" style={{ maxWidth: 440 }}>
          {/* Mobile Header (rendered when left panel is collapsed) */}
          <div className="auth-mobile-brand">
            <img
              src="/images/gardner_logo.png"
              alt="Gardner Auction Logo"
              style={{ height: 38, objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Gardner Auction</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Admin Console</div>
            </div>
          </div>

          <div className="auth-form-header">
            <div className="auth-tag">ADMINISTRATOR SIGN IN</div>
            <h2 className="auth-title font-serif">Sign In to Console</h2>
            <p className="auth-subtitle">
              Enter your administrative credentials to access the saleroom rostrum and live bidding desk.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="auth-alert-error" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successNotice && (
            <div className="auth-alert-success" role="status">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>Credentials verified! Synchronizing saleroom...</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-form-field">
              <label className="auth-label" htmlFor="login-email">
                Email Address *
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@gardner-auction.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  onBlur={() => markTouched('email')}
                  className={`auth-input ${(touched.email && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) || fieldErrors.email ? 'invalid-border' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {(fieldErrors.email || (touched.email && !email.trim())) && (
                <span className="auth-field-error">
                  {fieldErrors.email || 'Email address is required.'}
                </span>
              )}
            </div>

            <div className="auth-form-field">
              <div className="auth-label-row">
                <label className="auth-label" htmlFor="login-password">
                  Password *
                </label>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  id="btn-forgot-password"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  onBlur={() => markTouched('password')}
                  className={`auth-input ${(touched.password && (!password || !password.trim())) || fieldErrors.password ? 'invalid-border' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {(fieldErrors.password || (touched.password && (!password || !password.trim()))) && (
                <span className="auth-field-error">
                  {fieldErrors.password || 'Password is required.'}
                </span>
              )}
            </div>

            {/* Remember Me */}
            <div className="auth-remember-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="auth-checkbox"
                  id="login-remember-me"
                />
                <span>Remember my email on this device</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="btn-auth-submit"
              disabled={isLoading}
              id="btn-login-submit"
            >
              {isLoading ? (
                <>
                  <span className="auth-spinner" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Legal Security Disclaimer */}
          <p className="auth-disclaimer-text">
            This console is strictly for authorized Gardner Auction administrative personnel. Unauthorized access is prohibited and subject to legal action under PA 63 P.S. § 734.
          </p>

          {/* Navigation to Signup */}
          <div className="auth-signup-prompt">
            <span>Don't have an account?</span>
            <button
              type="button"
              className="auth-switch-link"
              onClick={onSwitchToSignup}
              id="btn-switch-to-signup"
            >
              Create Account →
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
