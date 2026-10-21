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
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin }) => {
  const { signup } = useAuth();

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
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

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

    const errors: FormErrors = {};
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    // 1. Full Name validation
    if (!cleanName) {
      errors.fullName = 'Please enter your full legal name.';
    }

    // 2. Email Address validation
    if (!cleanEmail) {
      errors.email = 'Please enter a valid email address.';
    } else if (!isValidEmail) {
      errors.email = 'Please enter a valid email address.';
    }

    // 3. Password validation
    if (!password) {
      errors.password = 'Password is required.';
    } else if (!hasMinLength || !hasUppercase || !hasNumber) {
      errors.password = 'Password must meet all security requirements.';
    }

    // 4. Confirm Password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    // 5. Terms Checkbox validation
    if (!acceptTerms) {
      errors.terms = 'Please accept the authorization policy to continue.';
    }

    // If any validation errors exist, show inline errors & appropriate toast
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched({
        name: true,
        email: true,
        password: true,
        confirmPassword: true,
        terms: true
      });

      if (!cleanName || !cleanEmail || !password || !confirmPassword) {
        toast.error('Please complete all required fields.');
      } else if (!isValidEmail) {
        toast.error('Please enter a valid email address.');
      } else if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
      } else if (!acceptTerms) {
        toast.error('Please accept the authorization policy to continue.');
      } else {
        toast.error('Please complete all required fields.');
      }
      return;
    }

    setIsLoading(true);
    try {
      const result = await signup({
        name: cleanName,
        email: cleanEmail,
        password
      });

      if (!result.success) {
        const errText = result.error || 'Account creation failed.';
        setErrorMessage(errText);

        const lower = errText.toLowerCase();
        if (
          lower.includes('already exists') ||
          lower.includes('already registered') ||
          lower.includes('user already exists')
        ) {
          toast.error('An account with this email already exists. Please sign in.');
        } else if (lower.includes('fetch') || lower.includes('network') || lower.includes('connection')) {
          toast.error('Unable to connect. Please try again.');
        } else {
          toast.error(errText);
        }
      } else {
        if (result.requiresEmailConfirmation) {
          setRequiresEmailConfirmation(true);
          const confirmMsg = result.message || 'Please check your email to confirm your account.';
          setSuccessMessage(confirmMsg);
          toast(confirmMsg, { icon: '✉️' });
        } else {
          setSuccessMessage('Account created successfully.');
          toast.success('Account created successfully.');
          setTimeout(() => {
            onSwitchToLogin();
          }, 1200);
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
        toast.error('Unable to connect. Please try again.');
      } else {
        toast.error('Account creation failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-split-page">
      {/* =====================================================================
          LEFT PANEL: Visual Branding, Auction Imagery & Gateway Status
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
              <div style={{ fontSize: 11, color: '#64748b' }}>Admin Console</div>
            </div>
          </div>

          <div className="auth-form-header">
            <div className="auth-tag">ADMINISTRATIVE ONBOARDING</div>
            <h2 className="auth-title font-serif">Create Account</h2>
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
                We have sent an authentication verification link to <strong>{email}</strong>. Once confirmed, you can sign in directly to your console.
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
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) {
                        setFieldErrors(prev => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    onBlur={() => markTouched('name')}
                    className={`auth-input ${(touched.name && !fullName.trim()) || fieldErrors.fullName ? 'invalid-border' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {(fieldErrors.fullName || (touched.name && !fullName.trim())) && (
                  <span className="auth-field-error">{fieldErrors.fullName || 'Please enter your full legal name.'}</span>
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors(prev => ({ ...prev, email: undefined }));
                      }
                    }}
                    onBlur={() => markTouched('email')}
                    className={`auth-input ${(touched.email && (!email.trim() || !isValidEmail)) || fieldErrors.email ? 'invalid-border' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {fieldErrors.email ? (
                  <span className="auth-field-error">{fieldErrors.email}</span>
                ) : (
                  <>
                    {touched.email && !email.trim() && (
                      <span className="auth-field-error">Please enter a valid email address.</span>
                    )}
                    {touched.email && email.trim() && !isValidEmail && (
                      <span className="auth-field-error">Please enter a valid email address.</span>
                    )}
                  </>
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors(prev => ({ ...prev, password: undefined }));
                      }
                    }}
                    onBlur={() => markTouched('password')}
                    className={`auth-input ${(touched.password && !hasMinLength) || fieldErrors.password ? 'invalid-border' : ''}`}
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
                {fieldErrors.password && (
                  <span className="auth-field-error">{fieldErrors.password}</span>
                )}
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
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    onBlur={() => markTouched('confirmPassword')}
                    className={`auth-input ${(touched.confirmPassword && (!passwordsMatch || !confirmPassword)) || fieldErrors.confirmPassword ? 'invalid-border' : ''}`}
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
                {(fieldErrors.confirmPassword || (touched.confirmPassword && confirmPassword && !passwordsMatch)) && (
                  <span className="auth-field-error">{fieldErrors.confirmPassword || 'Passwords do not match.'}</span>
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
                    onChange={(e) => {
                      setAcceptTerms(e.target.checked);
                      if (fieldErrors.terms) {
                        setFieldErrors(prev => ({ ...prev, terms: undefined }));
                      }
                    }}
                    className="auth-checkbox"
                    id="signup-terms-check"
                    required
                  />
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                    I acknowledge and accept the Gardner Auction Saleroom Authorization Policy and Pennsylvania Auctioneer Fiduciary Protocol (63 P.S. § 734).
                  </span>
                </label>
                {fieldErrors.terms && (
                  <span className="auth-field-error" style={{ marginTop: 6 }}>
                    {fieldErrors.terms}
                  </span>
                )}
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
                    <span>Create Account</span>
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
              Sign In →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
