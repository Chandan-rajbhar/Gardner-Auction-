import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Eye, 
  EyeOff, 
  LogOut, 
  Clock, 
  BadgeCheck, 
  ArrowLeft 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavigationSection } from '../../types';

interface ProfileViewProps {
  onNavigate?: (section: NavigationSection) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, updateProfile, updatePassword, logout, isSupabaseConnected } = useAuth();

  // Profile Form States
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [title, setTitle] = useState(user?.title || '');

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback States
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Synchronize initial state when user loads or updates
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setTitle(user.title || '');
    }
  }, [user]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (!fullName.trim()) {
      setProfileErrorMsg('Full Name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    const result = await updateProfile({
      name: fullName.trim(),
      phone: phone.trim(),
      title: title.trim()
    });
    setIsSavingProfile(false);

    if (result.success) {
      setProfileSuccessMsg(result.message || 'Profile details updated successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 5000);
    } else {
      setProfileErrorMsg(result.error || 'Failed to update profile.');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!newPassword) {
      setPasswordErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Password confirmation does not match.');
      return;
    }

    setIsUpdatingPassword(true);
    const result = await updatePassword(newPassword);
    setIsUpdatingPassword(false);

    if (result.success) {
      setPasswordSuccessMsg(result.message || 'Password has been updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 6000);
    } else {
      setPasswordErrorMsg(result.error || 'Failed to update password.');
    }
  };

  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Oct 19, 2026';

  return (
    <div className="profile-view-container">
      {/* Header & Breadcrumb */}
      <div className="profile-view-header">
        <div className="profile-header-left">
          {onNavigate && (
            <button 
              type="button" 
              className="profile-back-btn" 
              onClick={() => onNavigate('overview')}
              title="Return to Dashboard Overview"
            >
              <ArrowLeft size={16} />
              <span>Overview</span>
            </button>
          )}
          <div>
            <h1 className="profile-view-title font-serif">Administrator Profile</h1>
            <p className="profile-view-subtitle">
              Manage your executive credentials, saleroom administrative identity, and account security.
            </p>
          </div>
        </div>

        <div className="profile-header-badge">
          <span className="profile-sync-dot" />
          <span>{isSupabaseConnected ? 'Supabase AF360 Connected' : 'Local Admin Active'}</span>
        </div>
      </div>

      {/* Admin Identity Hero Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-avatar-wrap">
          <div className="profile-hero-avatar">
            {user?.avatarText || 'TG'}
          </div>
          <div className="profile-hero-badge-check" title="Verified Administrator">
            <BadgeCheck size={16} />
          </div>
        </div>

        <div className="profile-hero-main-info">
          <div className="profile-hero-name-row">
            <h2 className="profile-hero-name">{user?.name || 'Todd Gardner'}</h2>
            <div className="profile-hero-role-tag">
              <ShieldCheck size={13} color="#059669" />
              <span>{user?.role ? user.role.replace('_', ' ').toUpperCase() : 'SUPER ADMIN'}</span>
            </div>
          </div>
          <div className="profile-hero-sub-row">
            <span className="profile-hero-title">{user?.title || 'Owner & Master Auctioneer'}</span>
            <span className="profile-hero-bullet">•</span>
            <span className="profile-hero-email">{user?.email || 'admin@gardner-auction.com'}</span>
          </div>
        </div>

        <div className="profile-hero-meta-stats">
          <div className="hero-meta-box">
            <span className="hero-meta-label">License Credential</span>
            <span className="hero-meta-val">PA #AY002377</span>
          </div>
          <div className="hero-meta-box">
            <span className="hero-meta-label">Member Since</span>
            <span className="hero-meta-val">{formattedDate}</span>
          </div>
          <div className="hero-meta-box">
            <span className="hero-meta-label">Security Tier</span>
            <span className="hero-meta-val">Level 4 Saleroom Master</span>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="profile-forms-grid">
        {/* Column 1: Editable Profile Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-wrap">
              <User size={18} />
            </div>
            <div>
              <h3 className="profile-card-title">Administrative Details</h3>
              <p className="profile-card-desc">
                Update your administrative contact information and display title.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-form">
            {profileSuccessMsg && (
              <div className="profile-alert profile-alert-success">
                <CheckCircle2 size={16} />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="profile-alert profile-alert-error">
                <AlertCircle size={16} />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <div className="profile-field-group">
              <label htmlFor="admin-full-name" className="profile-field-label">
                Full Name <span className="required-star">*</span>
              </label>
              <div className="profile-input-wrap">
                <User size={16} className="profile-input-icon" />
                <input
                  id="admin-full-name"
                  type="text"
                  className="profile-text-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Todd Gardner"
                  required
                />
              </div>
              <span className="profile-field-hint">
                Persisted to Supabase profile and displayed in activity audit logs.
              </span>
            </div>

            <div className="profile-field-group">
              <label htmlFor="admin-email" className="profile-field-label">
                Email Address (Primary Identity)
              </label>
              <div className="profile-input-wrap disabled">
                <Mail size={16} className="profile-input-icon" />
                <input
                  id="admin-email"
                  type="email"
                  className="profile-text-input"
                  value={user?.email || 'admin@gardner-auction.com'}
                  disabled
                  readOnly
                />
              </div>
              <span className="profile-field-hint">
                Primary authentication identity tied to your Supabase security record.
              </span>
            </div>

            <div className="profile-field-group">
              <label htmlFor="admin-phone" className="profile-field-label">
                Direct Phone Number
              </label>
              <div className="profile-input-wrap">
                <Phone size={16} className="profile-input-icon" />
                <input
                  id="admin-phone"
                  type="tel"
                  className="profile-text-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(406) 555-0192"
                />
              </div>
              <span className="profile-field-hint">
                Direct contact line for consignor settlements and bank wire verifications.
              </span>
            </div>

            <div className="profile-field-group">
              <label htmlFor="admin-title" className="profile-field-label">
                Saleroom Operational Title
              </label>
              <div className="profile-input-wrap">
                <Briefcase size={16} className="profile-input-icon" />
                <input
                  id="admin-title"
                  type="text"
                  className="profile-text-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Owner & Master Auctioneer"
                />
              </div>
              <span className="profile-field-hint">
                Title displayed on generated settlement invoices and clerking consoles.
              </span>
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">
                Role & Permission Level
              </label>
              <div className="profile-role-display-box">
                <div className="role-display-left">
                  <ShieldCheck size={16} color="#059669" />
                  <span className="role-display-name">
                    {user?.role ? user.role.replace('_', ' ').toUpperCase() : 'SUPER ADMIN'}
                  </span>
                </div>
                <span className="role-display-policy">Full Rostrum & Vault Clearance</span>
              </div>
            </div>

            <div className="profile-card-actions">
              <button
                type="submit"
                className="btn-save-profile"
                disabled={isSavingProfile}
                id="btn-save-profile"
              >
                <Save size={16} />
                <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Column 2: Change Password & Security */}
        <div className="profile-security-column">
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-icon-wrap security">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Security & Password</h3>
                <p className="profile-card-desc">
                  Update your executive authentication password via Supabase Auth.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="profile-form">
              {passwordSuccessMsg && (
                <div className="profile-alert profile-alert-success">
                  <CheckCircle2 size={16} />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="profile-alert profile-alert-error">
                  <AlertCircle size={16} />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <div className="profile-field-group">
                <label htmlFor="new-password" className="profile-field-label">
                  New Password <span className="required-star">*</span>
                </label>
                <div className="profile-input-wrap">
                  <KeyRound size={16} className="profile-input-icon" />
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="profile-text-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="profile-field-hint">
                  Minimum 8 characters. Use letters, numbers, and symbols for high security.
                </span>
              </div>

              <div className="profile-field-group">
                <label htmlFor="confirm-password" className="profile-field-label">
                  Confirm New Password <span className="required-star">*</span>
                </label>
                <div className="profile-input-wrap">
                  <KeyRound size={16} className="profile-input-icon" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="profile-text-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="password-requirements-box">
                <div className="req-title">Password Security Requirements:</div>
                <ul className="req-list">
                  <li className={newPassword.length >= 8 ? 'met' : ''}>
                    At least 8 characters in length
                  </li>
                  <li className={newPassword && confirmPassword && newPassword === confirmPassword ? 'met' : ''}>
                    Passwords match exactly
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>
                    Contains at least one number
                  </li>
                </ul>
              </div>

              <div className="profile-card-actions">
                <button
                  type="submit"
                  className="btn-update-password"
                  disabled={isUpdatingPassword}
                  id="btn-update-password"
                >
                  <Lock size={16} />
                  <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Sign Out Card */}
          <div className="profile-card session-card">
            <div className="session-info-row">
              <div className="session-icon">
                <Clock size={16} />
              </div>
              <div className="session-text">
                <div className="session-title">Active Administrative Session</div>
                <div className="session-desc">
                  Authenticated session established with encrypted Supabase tokens.
                </div>
              </div>
              <button
                type="button"
                className="btn-profile-logout"
                onClick={() => logout()}
                id="btn-profile-signout"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
