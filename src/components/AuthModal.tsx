import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './auth/ForgotPasswordModal';
import { ResetPasswordModal } from './auth/ResetPasswordModal';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'register';
  onLoginSuccess: (name: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onLoginSuccess
}) => {
  const { login, signup, savedEmail, isRecoverySession, clearRecoverySession } = useAuth();

  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);

  // Form states
  const [email, setEmail] = useState(savedEmail || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Recovery modals
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sync mode with prop when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessNotice(null);
      setPassword('');
      if (savedEmail && !email) {
        setEmail(savedEmail);
      }
    }
  }, [isOpen, initialMode, savedEmail]);

  // Handle escape key and lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isForgotModalOpen && !isResetModalOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, isForgotModalOpen, isResetModalOpen]);

  useEffect(() => {
    if (isRecoverySession && isOpen) {
      setIsResetModalOpen(true);
    }
  }, [isRecoverySession, isOpen]);

  if (!isOpen) return null;

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleTabSwitch = (newMode: 'signin' | 'register') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessNotice(null);
  };

  // Sign In submit handler
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
      setTimeout(() => {
        onLoginSuccess(displayName);
        onClose();
      }, 500);
    } else {
      setErrorMessage(result.error || 'Invalid email or password. Please verify your credentials.');
    }
  };

  // Sign Up submit handler
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
      setErrorMessage('Please accept the Pennsylvania Auctioneer Fiduciary Protocol.');
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
        setTimeout(() => {
          onLoginSuccess(cleanName);
          onClose();
        }, 600);
      }
    } else {
      setErrorMessage(result.error || 'Failed to create account. Email may already be registered.');
    }
  };

  return (
    <>
      <div
        className="auth-popup-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Gardner Auction Authentication"
      >
        <div className="auth-popup-card">
          {/* Top Close Button */}
          <button
            type="button"
            className="auth-popup-close-btn"
            onClick={onClose}
            aria-label="Close authentication modal"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>

          {/* =====================================================================
              1. LEFT VISUAL PANEL: Uploaded Saleroom Asset with Vignette & Crest
              ===================================================================== */}
          <div className="auth-popup-visual-col">
            <div className="auth-popup-visual-bg" />
            <div className="auth-popup-visual-overlay" />

            <div className="auth-popup-visual-inner">
              {/* Brand Header */}
              <div className="auth-popup-visual-brand">
                <img
                  src="/images/gardner_logo.png"
                  alt="Gardner Auction"
                  className="auth-popup-brand-logo-img"
                />
                <div>
                  <h3 className="auth-popup-brand-name font-serif">GARDNER AUCTION</h3>
                  <p className="auth-popup-brand-sub">PA LICENSED SALEROOM • EST. 1960</p>
                </div>
              </div>

              {/* Central / Bottom Narrative */}
              <div className="auth-popup-visual-narrative">
                <div className="auth-popup-tag">
                  <Sparkles size={12} className="gold-sparkle" />
                  <span>PA LICENSED BIDDER PORTAL</span>
                </div>

                <h4 className="auth-popup-visual-title font-serif">
                  Where Distinguished Heritage Meets Live Bidding
                </h4>

                <p className="auth-popup-visual-desc">
                  Accredited saleroom rostrum clearance, authenticated paddle allocations.
                </p>
              </div>
            </div>
          </div>

          {/* =====================================================================
              2. RIGHT AUTHENTICATION PANEL: Header, Tabs & Forms
              ===================================================================== */}
          <div className="auth-popup-form-col">
            {/* Top Header */}
            <div className="auth-popup-form-header">
              <h2 className="auth-popup-title font-serif">
                {mode === 'signin' ? 'Welcome Back' : 'Create Bidder Account'}
              </h2>
              <p className="auth-popup-subtitle">
                {mode === 'signin'
                  ? 'Sign in to access your bidder paddle and participate in live auctions.'
                  : 'Register for live webcast bidding and authenticated floor clearance.'}
              </p>

              {/* Segmented Tab Control: Sign In / Register */}
              <div className="auth-popup-segmented-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  className={`auth-popup-tab ${mode === 'signin' ? 'active' : ''}`}
                  onClick={() => handleTabSwitch('signin')}
                  id="tab-btn-signin"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  className={`auth-popup-tab ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => handleTabSwitch('register')}
                  id="tab-btn-register"
                >
                  Register
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="auth-popup-form-scroll-body">
              {/* Feedback Alerts */}
              {errorMessage && (
                <div className="auth-alert-banner error" role="alert">
                  <AlertCircle size={15} className="alert-icon" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successNotice && (
                <div className="auth-alert-banner success" role="status">
                  <CheckCircle2 size={15} className="alert-icon" />
                  <span>{successNotice}</span>
                </div>
              )}

              {mode === 'signin' ? (
                /* =================== SIGN IN FORM =================== */
                <form onSubmit={handleSignIn} className="auth-popup-form" noValidate>
                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="popup-signin-email">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <div className="auth-input-container">
                      <Mail size={15} className="auth-field-icon" />
                      <input
                        id="popup-signin-email"
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
                      <label className="auth-field-label" htmlFor="popup-signin-password">
                        Password <span className="req-star">*</span>
                      </label>
                      <button
                        type="button"
                        className="auth-link-inline-btn"
                        onClick={() => setIsForgotModalOpen(true)}
                        id="btn-popup-forgot-password"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="auth-input-container">
                      <Lock size={15} className="auth-field-icon" />
                      <input
                        id="popup-signin-password"
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
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
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
                    id="btn-submit-popup-signin"
                  >
                    {isLoading ? (
                      <>
                        <span className="auth-btn-spinner" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Sign In</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>



                  <div className="auth-fiduciary-disclaimer">
                    <ShieldCheck size={13} className="disclaimer-gold-shield" />
                    <span>Fiduciary discretion guaranteed under Pennsylvania Licensure Code</span>
                  </div>
                </form>
              ) : (
                /* =================== REGISTER FORM =================== */
                <form onSubmit={handleSignUp} className="auth-popup-form" noValidate>
                  <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor="popup-signup-name">
                      Full Legal Name <span className="req-star">*</span>
                    </label>
                    <div className="auth-input-container">
                      <User size={15} className="auth-field-icon" />
                      <input
                        id="popup-signup-name"
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
                    <label className="auth-field-label" htmlFor="popup-signup-email">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <div className="auth-input-container">
                      <Mail size={15} className="auth-field-icon" />
                      <input
                        id="popup-signup-email"
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
                    <label className="auth-field-label" htmlFor="popup-signup-password">
                      Create Secure Password <span className="req-star">*</span>
                    </label>
                    <div className="auth-input-container">
                      <Lock size={15} className="auth-field-icon" />
                      <input
                        id="popup-signup-password"
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
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Password validation criteria */}
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

                  <div className="auth-options-row">
                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="auth-custom-checkbox"
                        required
                      />
                      <span style={{ fontSize: 11, lineHeight: 1.45 }}>
                        I accept the Gardner Auction Saleroom Terms and Pennsylvania Auctioneer Fiduciary Protocol (63 P.S. § 734).
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn-auth-gold-primary"
                    disabled={isLoading}
                    id="btn-submit-popup-signup"
                  >
                    {isLoading ? (
                      <>
                        <span className="auth-btn-spinner" />
                        <span>Creating Bidder Account...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Create Account</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>



                  <div className="auth-fiduciary-disclaimer">
                    <ShieldCheck size={13} className="disclaimer-gold-shield" />
                    <span>Fiduciary discretion guaranteed under Pennsylvania Licensure Code</span>
                  </div>
                </form>
              )}
            </div>
          </div>
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
    </>
  );
};
