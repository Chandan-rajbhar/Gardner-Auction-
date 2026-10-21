import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  X,
  Layers,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin }) => {
  const { signup } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  // Field touch tracking for clean inline validation
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Password criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate required fields
    if (!fullName.trim()) {
      const msg = 'Please enter your full legal name.';
      setErrorMessage(msg);
      showToast('warning', 'Missing Required Field', msg);
      return;
    }

    if (!email.trim() || !isValidEmail) {
      const msg = 'Please enter a valid saleroom email address.';
      setErrorMessage(msg);
      showToast('warning', 'Invalid Email Format', msg);
      return;
    }

    if (!password) {
      const msg = 'Please create a secure password for your account.';
      setErrorMessage(msg);
      showToast('warning', 'Password Required', msg);
      return;
    }

    if (!hasMinLength) {
      const msg = 'Password must be at least 8 characters long for administrative security.';
      setErrorMessage(msg);
      showToast('warning', 'Password Security Requirement', msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Password and Confirm Password do not match. Please verify both fields.';
      setErrorMessage(msg);
      showToast('error', 'Password Mismatch', msg);
      return;
    }

    if (!acceptTerms) {
      const msg = 'You must acknowledge and accept the Gardner Auction Saleroom Authorization Policy.';
      setErrorMessage(msg);
      showToast('warning', 'Authorization Required', msg);
      return;
    }

    setIsLoading(true);
    const result = await signup({
      name: fullName.trim(),
      email: email.trim(),
      password
    });

    setIsLoading(false);

    if (!result.success) {
      const errText = result.error || 'Failed to complete registration.';
      setErrorMessage(errText);

      if (errText.toLowerCase().includes('already exists') || errText.toLowerCase().includes('already registered')) {
        showToast('error', 'Account Already Exists', 'An account with this email address already exists. Please sign in instead.');
      } else {
        showToast('error', 'Registration Failed', errText);
      }
    } else {
      if (result.requiresEmailConfirmation) {
        setRequiresEmailConfirmation(true);
        const confirmMsg = result.message || 'Registration received! Please check your email to confirm your account.';
        setSuccessMessage(confirmMsg);
        showToast('info', 'Confirmation Required', 'Account registered! Please check your email inbox to confirm your account before signing in.');
      } else {
        setSuccessMessage('Account created successfully! Redirecting to Sign In...');
        showToast('success', 'Account Created Successfully', 'Your AF360 administrative account has been registered! Redirecting to Sign In...');
        setTimeout(() => {
          onSwitchToLogin();
        }, 1400);
      }
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
                  // Graceful fallback to crest if image fails
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
              <span>Operator Onboarding</span>
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
              Register your certified administrative account for real-time live rostrum clerking, multi-session catalog management, and secure buyer settlements.
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
          RIGHT PANEL: Clean, Minimal, Vertically Centered Signup Form
          ===================================================================== */}
      <div className="auth-split-form-panel">
        <div className="auth-form-inner" style={{ maxWidth: 440 }}>
          {/* Mobile Header (rendered when left visual panel is hidden) */}
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
            <div className="auth-tag">ADMINISTRATIVE ONBOARDING</div>
            <h2 className="auth-title font-serif">Create AF360 Account</h2>
            <p className="auth-subtitle">
              Enter your credentials to join Gardner Auction saleroom and clerking operations.
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="auth-alert-error" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert-success" role="status">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {requiresEmailConfirmation ? (
            <div className="auth-confirmation-box">
              <CheckCircle2 size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Check Your Email Inbox
              </h3>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 18 }}>
                We have sent an authentication verification link to <strong>{email}</strong>. Once confirmed, you can sign in directly to your AF360 console.
              </p>
              <button
                type="button"
                className="btn-auth-primary"
                onClick={onSwitchToLogin}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Return to Sign In</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {/* Field 1: Full Name */}
              <div className="auth-form-field">
                <label className="auth-label" htmlFor="signup-name">
                  Full Name *
                </label>
                <div className="auth-input-wrapper">
                  <User size={16} className="auth-input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Todd Gardner"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => markTouched('name')}
                    className={`auth-input ${touched.name && !fullName.trim() ? 'invalid-border' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {touched.name && !fullName.trim() && (
                  <span className="auth-field-error">Full name is required.</span>
                )}
              </div>

              {/* Field 2: Email Address */}
              <div className="auth-form-field">
                <label className="auth-label" htmlFor="signup-email">
                  Email Address *
                </label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@gardner-auction.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => markTouched('email')}
                    className={`auth-input ${touched.email && (!email.trim() || !isValidEmail) ? 'invalid-border' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {touched.email && !email.trim() && (
                  <span className="auth-field-error">Email address is required.</span>
                )}
                {touched.email && email.trim() && !isValidEmail && (
                  <span className="auth-field-error">Please enter a valid email format.</span>
                )}
              </div>

              {/* Field 3: Password */}
              <div className="auth-form-field">
                <label className="auth-label" htmlFor="signup-password">
                  Password *
                </label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => markTouched('password')}
                    className={`auth-input ${touched.password && !hasMinLength ? 'invalid-border' : ''}`}
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

              {/* Field 4: Confirm Password */}
              <div className="auth-form-field">
                <label className="auth-label" htmlFor="signup-confirm-password">
                  Confirm Password *
                </label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => markTouched('confirmPassword')}
                    className={`auth-input ${touched.confirmPassword && (!passwordsMatch || !confirmPassword) ? 'invalid-border' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.confirmPassword && confirmPassword && !passwordsMatch && (
                  <span className="auth-field-error">Passwords do not match.</span>
                )}
              </div>

              {/* Password Validation Checklist */}
              {password.length > 0 && (
                <div className="auth-password-criteria">
                  <div className={`auth-criteria-item ${hasMinLength ? 'met' : 'unmet'}`}>
                    {hasMinLength ? <Check size={12} /> : <X size={12} />}
                    <span>8+ characters</span>
                  </div>
                  <div className={`auth-criteria-item ${hasUppercase ? 'met' : 'unmet'}`}>
                    {hasUppercase ? <Check size={12} /> : <X size={12} />}
                    <span>Uppercase letter</span>
                  </div>
                  <div className={`auth-criteria-item ${hasNumber ? 'met' : 'unmet'}`}>
                    {hasNumber ? <Check size={12} /> : <X size={12} />}
                    <span>Number</span>
                  </div>
                  <div className={`auth-criteria-item ${passwordsMatch ? 'met' : 'unmet'}`}>
                    {passwordsMatch ? <Check size={12} /> : <X size={12} />}
                    <span>Passwords match</span>
                  </div>
                </div>
              )}

              {/* Required Terms Checkbox */}
              <div className="auth-terms-box">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="auth-checkbox"
                    id="signup-terms-check"
                    required
                  />
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                    I acknowledge and accept the Gardner Auction Saleroom Authorization Policy and Pennsylvania Auctioneer Fiduciary Protocol (63 P.S. § 734).
                  </span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={isLoading}
                id="btn-signup-submit"
              >
                {isLoading ? (
                  <>
                    <span className="auth-spinner" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Create AF360 Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Navigation to Login */}
          <div className="auth-signup-prompt">
            <span>Already have an account?</span>
            <button
              type="button"
              className="auth-switch-link"
              onClick={onSwitchToLogin}
              id="btn-switch-to-login"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
