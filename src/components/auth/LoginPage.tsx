import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginPageProps {
  onSwitchToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup }) => {
  const { login, savedEmail } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState<string>(savedEmail || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(Boolean(savedEmail));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<boolean>(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState<boolean>(false);

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
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      const msg = 'Please provide both your administrator email and password.';
      setErrorMessage(msg);
      showToast('warning', 'Missing Credentials', msg);
      return;
    }

    setIsLoading(true);
    const res = await login(cleanEmail, cleanPassword, rememberMe);
    setIsLoading(false);

    if (!res.success) {
      const errText = res.error || 'Authentication failed. Please verify your credentials.';
      setErrorMessage(errText);
      showToast('error', 'Authentication Failed', errText);
    } else {
      setSuccessNotice(true);
      showToast('success', 'Authentication Verified', 'Welcome back to the Gardner Auction AF360 Administrative Console.');
    }
  };

  return (
    <div className="auth-split-page">
      {/* =====================================================================
          LEFT PANEL: Visual Branding, Auction Imagery & Feature Highlights
          ===================================================================== */}
      <div className="auth-split-visual">
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
                <p className="auth-brand-subtitle">AF360 Master Administrative Console</p>
              </div>
            </div>

            <div className="auth-badge-pill">
              <span className="auth-status-dot" />
              <span>AF360 Rostrum Active</span>
            </div>
          </div>

          {/* Middle: Headline, Description & 3 Concise Feature Highlights */}
          <div className="auth-visual-middle">
            <div className="auth-brand-licensure">
              PA BUREAU OF OCCUPATIONAL AFFAIRS • LIC. #AY002377
            </div>

            <h2 className="auth-hero-title font-serif">
              Join the Gardner Auction Operations
            </h2>

            <p className="auth-hero-desc">
              Direct access to live rostrum clerking block, real-time HiBid node syndication, floor paddle ledger, and automated auction settlement.
            </p>

            {/* 3 Concise Feature Highlights */}
            <div className="auth-features-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <ShieldCheck size={18} color="#d4af37" />
                </div>
                <div>
                  <div className="auth-feature-title">Secure Administrative Access</div>
                  <div className="auth-feature-text">
                    Role-based permissions, automated super-admin provisioning, and multi-tier saleroom authorization.
                  </div>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Layers size={18} color="#10b981" />
                </div>
                <div>
                  <div className="auth-feature-title">Auction &amp; Catalog Management</div>
                  <div className="auth-feature-text">
                    Comprehensive catalog creation, lot certification tracking, and HiBid node telemetry.
                  </div>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <FileText size={18} color="#38bdf8" />
                </div>
                <div>
                  <div className="auth-feature-title">Secure Activity Audit Trail</div>
                  <div className="auth-feature-text">
                    Immutable transaction logging, bid verification histories, and strict Pennsylvania fiduciary compliance.
                  </div>
                </div>
              </div>
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
              <div style={{ fontSize: 11, color: '#64748b' }}>AF360 Admin Console</div>
            </div>
          </div>

          <div className="auth-form-header">
            <div className="auth-tag">ADMINISTRATOR SIGN IN</div>
            <h2 className="auth-title font-serif">Sign In to AF360 Console</h2>
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
              <span>Credentials verified! Synchronizing AF360 saleroom...</span>
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  disabled={isLoading}
                />
              </div>
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
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
