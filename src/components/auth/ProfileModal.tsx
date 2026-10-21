import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, updatePassword, logout, isSupabaseConnected } = useAuth();

  // Form states
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state whenever user data updates
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setSuccessMessage(null);
      setErrorMessage(null);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [user, isOpen]);

  // Escape key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage('Full Legal Name cannot be blank.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setErrorMessage('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation password do not match.');
        return;
      }
    }

    setIsSaving(true);

    try {
      // 1. Update Profile Information (Name & Phone)
      const profileResult = await updateProfile({
        name: cleanName,
        phone: phone.trim()
      });

      if (!profileResult.success) {
        setErrorMessage(profileResult.error || 'Failed to update profile.');
        setIsSaving(false);
        return;
      }

      // 2. Update Password if specified
      if (newPassword) {
        const passwordResult = await updatePassword(newPassword);
        if (!passwordResult.success) {
          setErrorMessage(passwordResult.error || 'Profile updated, but password change failed.');
          setIsSaving(false);
          return;
        }
        setNewPassword('');
        setConfirmPassword('');
      }

      setSuccessMessage('Profile and account credentials updated successfully.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = async () => {
    onClose();
    await logout();
  };

  return (
    <div
      className="profile-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Collector Profile &amp; Settings"
    >
      <div className="profile-modal-card">
        {/* Modal Close Button */}
        <button
          type="button"
          className="profile-modal-close-btn"
          onClick={onClose}
          aria-label="Close profile modal"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        {/* Header Hero Area */}
        <div className="profile-modal-header">
          <div className="profile-modal-user-summary">
            <div className="profile-modal-avatar font-serif">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="header-avatar-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <span className="header-avatar-initials">{user.avatarText || 'GA'}</span>
            </div>
            <div className="profile-modal-user-meta">
              <div className="profile-modal-role-badge">
                <Sparkles size={11} className="gold-sparkle" />
                <span>{user.title || 'Registered Bidder'}</span>
              </div>
              <h2 className="profile-modal-name font-serif">{user.name}</h2>
              <span className="profile-modal-email">{user.email}</span>
            </div>
          </div>

          <div className="profile-modal-session-status">
            <div className="session-status-pill">
              <span className="status-live-dot" />
              <span>{isSupabaseConnected ? 'Live Supabase Session Active' : 'Local Session'}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="profile-modal-body">
          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="auth-alert-banner error" role="alert">
              <AlertCircle size={15} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert-banner success" role="status">
              <CheckCircle2 size={15} className="alert-icon" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="profile-modal-form" noValidate>
            {/* Section 1: Personal Details */}
            <div className="profile-section-card">
              <h3 className="profile-section-title">
                <User size={15} className="section-title-icon" />
                <span>Personal &amp; Contact Credentials</span>
              </h3>

              <div className="profile-fields-grid">
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="profile-full-name">
                    Full Legal Name <span className="req-star">*</span>
                  </label>
                  <div className="auth-input-container">
                    <User size={15} className="auth-field-icon" />
                    <input
                      id="profile-full-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="auth-text-input"
                      placeholder="e.g. Robert J. Sterling"
                    />
                  </div>
                </div>

                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="profile-email">
                    Registered Email (Read-Only)
                  </label>
                  <div className="auth-input-container disabled">
                    <Mail size={15} className="auth-field-icon" />
                    <input
                      id="profile-email"
                      type="email"
                      disabled
                      value={user.email}
                      className="auth-text-input"
                      title="Email address is secured by Supabase Auth and cannot be altered directly."
                    />
                  </div>
                </div>

                <div className="auth-field-group full-width">
                  <label className="auth-field-label" htmlFor="profile-phone">
                    Contact Phone Number (For Saleroom Paddle Verification)
                  </label>
                  <div className="auth-input-container">
                    <Phone size={15} className="auth-field-icon" />
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="auth-text-input"
                      placeholder="+1 (412) 555-0192"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Security & Password Update */}
            <div className="profile-section-card">
              <h3 className="profile-section-title">
                <Lock size={15} className="section-title-icon" />
                <span>Update Password (Optional)</span>
              </h3>

              <div className="profile-fields-grid">
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="profile-new-password">
                    New Password
                  </label>
                  <div className="auth-input-container">
                    <Lock size={15} className="auth-field-icon" />
                    <input
                      id="profile-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="auth-text-input"
                      placeholder="Leave blank to keep current"
                    />
                    <button
                      type="button"
                      className="auth-eye-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="profile-confirm-password">
                    Confirm New Password
                  </label>
                  <div className="auth-input-container">
                    <Lock size={15} className="auth-field-icon" />
                    <input
                      id="profile-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-text-input"
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      className="auth-eye-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Licensing & Registration Verification */}
            <div className="profile-section-card subtle">
              <div className="profile-meta-info-row">
                <div className="meta-info-item">
                  <ShieldCheck size={14} className="gold-icon" />
                  <span>PA Auctioneer Code (63 P.S. § 734) Compliant Account</span>
                </div>
                {user.createdAt && (
                  <div className="meta-info-item">
                    <Clock size={13} className="gold-icon" />
                    <span>Member since {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="profile-modal-actions-bar">
              <button
                type="button"
                className="profile-modal-logout-btn"
                onClick={handleLogoutClick}
                id="btn-profile-logout"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>

              <div className="profile-modal-right-actions">
                <button
                  type="button"
                  className="profile-modal-cancel-btn"
                  onClick={onClose}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-auth-gold-primary"
                  disabled={isSaving}
                  id="btn-save-profile"
                >
                  {isSaving ? (
                    <>
                      <span className="auth-btn-spinner" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
