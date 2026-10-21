import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
  Award,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { ResetPasswordModal } from './ResetPasswordModal';

interface AuthPageProps {
  initialMode?: 'signin' | 'register';
  onClose?: () => void;
  onSuccess?: (displayName: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  onClose,
  onSuccess
}) => {
  const { login, signup, savedEmail, isRecoverySession, clearRecoverySession } = useAuth();

  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);

  // Form input states
  const [email, setEmail] = useState(savedEmail || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // State & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modals
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sync mode with hash if present
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#signup' || hash === '#register') {
        setMode('register');
      } else if (hash === '#signin' || hash === '#login') {
        setMode('signin');
      } else if (hash === '#reset-password' || hash.includes('type=recovery')) {
        setIsResetModalOpen(true);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (isRecoverySession) {
      setIsResetModalOpen(true);
    }
  }, [isRecoverySession]);

  useEffect(() => {
    if (savedEmail && !email) {
      setEmail(savedEmail);
    }
  }, [savedEmail]);

  // Password security criteria for registration
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  // Mode switch handlers
  const handleSwitchMode = (newMode: 'signin' | 'register') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessNotice(null);
    window.location.hash = newMode === 'register' ? 'signup' : 'signin';
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const result = await login(cleanEmail, password, rememberMe);
    setIsLoading(false);

    if (result.success) {
      const displayName = cleanEmail.split('@')[0] || 'Collector';
      setSuccessNotice(`Welcome back, ${displayName}!`);
      if (onSuccess) {
        onSuccess(displayName);
      }
      if (onClose) {
        setTimeout(onClose, 600);
      }
    } else {
      setErrorMessage(result.error || 'Invalid email or password. Please verify your credentials.');
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!cleanEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Please accept the Pennsylvania Auctioneer Fiduciary Protocol to proceed.');
      return;
    }

    setIsLoading(true);
    const result = await signup({
      name: cleanName,
      email: cleanEmail,
      password
    });
    setIsLoading(false);

    if (result.success) {
      if (result.requiresEmailConfirmation) {
        setSuccessNotice(result.message || 'Registration submitted! Please verify your email to activate live bidding.');
      } else {
        setSuccessNotice(`Account created successfully! Welcome, ${cleanName}.`);
        if (onSuccess) {
          onSuccess(cleanName);
        }
        if (onClose) {
          setTimeout(onClose, 800);
        }
      }
    } else {
      setErrorMessage(result.error || 'Failed to create account. Email may already be registered.');
    }
  };

  const handleReturnClick = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="full-auth-page-root">
      {/* =====================================================================
          1. LEFT COLUMN: Immersive Luxury Visual Panel (Using Uploaded Asset)
          ===================================================================== */}
      <div className="auth-split-visual-panel">
        <div className="auth-visual-image-container">
          <img
            src="/images/auth_luxury_saleroom.jpg"
            alt="Gardner Auction luxury saleroom rostrum with gold bullion, antique horology, and gavel"
            className="auth-visual-img"
          />
          <div className="auth-visual-gradient-overlay" />
          <div className="auth-visual-radial-glow" />
        </div>

        {/* Brand Header overlay */}
        <div className="auth-visual-top-brand">
          <div className="auth-brand-monogram">
            <span className="auth-brand-letter font-serif">G</span>
            <div className="auth-brand-shimmer" />
          </div>
          <div className="auth-brand-text">
            <h1 className="auth-brand-title font-serif">GARDNER AUCTION</h1>
            <p className="auth-brand-subtitle">PA LICENSED SALEROOM • EST. 1960</p>
          </div>
        </div>

        {/* Narrative & Value Props overlay at bottom */}
        <div className="auth-visual-content">
          <div className="auth-visual-tag">
            <Sparkles size={13} className="gold-sparkle" />
            <span>PA LICENSED BIDDER PORTAL</span>
          </div>

          <h2 className="auth-visual-headline font-serif">
            Where Distinguished Heritage Meets Live Bidding
          </h2>

          <p className="auth-visual-copy">
            Accredited auction rostrum clearance, authenticated paddle allocations, and fiduciary escrow protection under Pennsylvania Auctioneer Licensure Code (63 P.S. § 734).
          </p>

          {/* Luxury Micro-Trust Badges */}
          <div className="auth-visual-trust-grid">

            <div className="auth-trust-chip">
              <Lock size={14} className="chip-icon" />
              <span>256-Bit Encrypted Saleroom Access</span>
            </div>
            <div className="auth-trust-chip">
              <Award size={14} className="chip-icon" />
              <span>PCGS • NGC • GIA Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. RIGHT COLUMN: Centered, High-Contrast Luxury Form Panel
          ===================================================================== */}
      <div className="auth-split-form-panel">
        {/* Top Utility Bar: Return & Status */}
        <div className="auth-form-top-bar">
          <button
            type="button"
            className="auth-return-btn"
            onClick={handleReturnClick}
            aria-label="Return to Saleroom"
            title="Return to Saleroom"
          >
            <ArrowLeft size={16} />
            <span>Return to Saleroom</span>
          </button>

          <div className="auth-saleroom-status-pill">
            <span className="saleroom-status-dot" />
            <span>Rostrum Node Active</span>
          </div>
        </div>

        {/* Centered Form Wrapper */}
        <div className="auth-form-card-wrapper">
          {/* Mobile Brand Area */}
          <div className="auth-mobile-header-brand">
            <div className="auth-brand-monogram sm">
              <span className="auth-brand-letter font-serif">G</span>
            </div>
            <div>
              <span className="auth-mobile-brand-name font-serif">Gardner Auction</span>
              <span className="auth-mobile-brand-meta">PA Licensed Saleroom</span>
            </div>
          </div>

          {/* Understated Mode Switcher (Sign In / Signup Tabs) */}
          <div className="auth-segmented-switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`auth-switch-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-switch-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('register')}
            >
              Sign Up
            </button>
          </div>

          {/* Form Header */}
          <div className="auth-form-heading-area">
            <span className="auth-form-eyebrow">
              {mode === 'signin' ? 'REGISTERED COLLECTORS & BIDDERS' : 'NEW COLLECTOR REGISTRATION'}
            </span>
            <h2 className="auth-form-title font-serif">
              {mode === 'signin' ? 'Sign In to Your Bidder Account' : 'Register for Live Webcast Bidding'}
            </h2>
            <p className="auth-form-subtitle">
              {mode === 'signin'
                ? 'Enter your verified credentials to access live rostrum clerking and synchronized catalog bidding.'
                : 'Establish your accredited collector identity for live simulcast and saleroom catalog paddles.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="auth-alert-banner error" role="alert">
              <AlertCircle size={16} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="auth-alert-banner success" role="status">
              <CheckCircle2 size={16} className="alert-icon" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="auth-interactive-form" noValidate>
              <div className="auth-field-group">
                <label className="auth-field-label" htmlFor="auth-signin-email">
                  Email Address <span className="req-star">*</span>
                </label>
                <div className="auth-input-container">
                  <Mail size={16} className="auth-field-icon" />
                  <input
                    id="auth-signin-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="bidder@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-text-input"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <div className="auth-label-flex-row">
                  <label className="auth-field-label" htmlFor="auth-signin-password">
                    Password <span className="req-star">*</span>
                  </label>
                  <button
                    type="button"
                    className="auth-link-inline-btn"
                    onClick={() => setIsForgotModalOpen(true)}
                    id="btn-forgot-password-inline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="auth-input-container">
                  <Lock size={16} className="auth-field-icon" />
                  <input
                    id="auth-signin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-text-input"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="auth-custom-checkbox"
                  />
                  <span>Remember my email on this device</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-auth-gold-primary"
                disabled={isLoading}
                id="btn-submit-signin"
              >
                {isLoading ? (
                  <>
                    <span className="auth-btn-spinner" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={17} />
                    <span>Sign In to Bidder Console</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>



              <div className="auth-fiduciary-disclaimer">
                <ShieldCheck size={14} className="disclaimer-gold-shield" />
                <span>Fiduciary discretion guaranteed under Pennsylvania Auctioneer Licensure Code</span>
              </div>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} className="auth-interactive-form" noValidate>
              <div className="auth-field-group">
                <label className="auth-field-label" htmlFor="auth-signup-name">
                  Full Legal Name <span className="req-star">*</span>
                </label>
                <div className="auth-input-container">
                  <User size={16} className="auth-field-icon" />
                  <input
                    id="auth-signup-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Robert J. Sterling"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="auth-text-input"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-field-label" htmlFor="auth-signup-email">
                  Email Address <span className="req-star">*</span>
                </label>
                <div className="auth-input-container">
                  <Mail size={16} className="auth-field-icon" />
                  <input
                    id="auth-signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="bidder@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-text-input"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-field-label" htmlFor="auth-signup-password">
                  Create Secure Password <span className="req-star">*</span>
                </label>
                <div className="auth-input-container">
                  <Lock size={16} className="auth-field-icon" />
                  <input
                    id="auth-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-text-input"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password criteria checklist */}
              {password.length > 0 && (
                <div className="auth-password-criteria-row">
                  <span className={`criteria-badge ${hasMinLength ? 'met' : ''}`}>
                    {hasMinLength ? <Check size={11} /> : '•'} 8+ Characters
                  </span>
                  <span className={`criteria-badge ${hasUppercase ? 'met' : ''}`}>
                    {hasUppercase ? <Check size={11} /> : '•'} Uppercase
                  </span>
                  <span className={`criteria-badge ${hasNumber ? 'met' : ''}`}>
                    {hasNumber ? <Check size={11} /> : '•'} Number
                  </span>
                </div>
              )}

              {/* Terms checkbox */}
              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="auth-custom-checkbox"
                    required
                  />
                  <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                    I acknowledge and accept the Gardner Auction Saleroom Terms and Pennsylvania Auctioneer Fiduciary Protocol (63 P.S. § 734).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-auth-gold-primary"
                disabled={isLoading}
                id="btn-submit-signup"
              >
                {isLoading ? (
                  <>
                    <span className="auth-btn-spinner" />
                    <span>Creating Bidder Account...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={17} />
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="auth-switch-prompt-row">
                <span>Already have a registered bidder paddle?</span>
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => handleSwitchMode('signin')}
                  id="btn-switch-to-signin"
                >
                  Sign In →
                </button>
              </div>

              <div className="auth-fiduciary-disclaimer">
                <ShieldCheck size={14} className="disclaimer-gold-shield" />
                <span>Fiduciary discretion guaranteed under Pennsylvania Auctioneer Licensure Code</span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Supabase Password Recovery Modals */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
      />

      <ResetPasswordModal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          clearRecoverySession();
        }}
      />
    </div>
  );
};
