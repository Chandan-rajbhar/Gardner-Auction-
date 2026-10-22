import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Camera,
  Edit3,
  X,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavigationSection } from '../../types';
import { uploadAvatarImage, validateAvatarFile } from '../../services/storageService';

interface ProfileViewProps {
  onNavigate?: (section: NavigationSection) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, updateProfile, updatePassword, logout } = useAuth();

  // Mode: View Mode by default (Requirement 4)
  const [isEditMode, setIsEditMode] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [title, setTitle] = useState(user?.title || '');
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(user?.avatarUrl || '');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback States
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Avatar Photo Input & Preview References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBlobUrlRef = useRef<string | null>(null);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Safely cleanup object URL to prevent memory leaks
  const cleanupPreviewBlob = () => {
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupPreviewBlob();
    };
  }, []);

  // Synchronize initial state when user loads or updates (only when not actively editing)
  useEffect(() => {
    if (user && !isEditMode) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setTitle(user.title || '');
      setAvatarPreviewUrl(user.avatarUrl || '');
    }
  }, [user, isEditMode]);

  // Handle Switch to Edit Mode
  const handleEnterEditMode = () => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setTitle(user.title || '');
      setAvatarPreviewUrl(user.avatarUrl || '');
    }
    cleanupPreviewBlob();
    setProfileErrorMsg(null);
    setIsEditMode(true);
  };

  // Handle Cancel Edit Mode
  const handleCancelEdit = () => {
    cleanupPreviewBlob();
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setTitle(user.title || '');
      setAvatarPreviewUrl(user.avatarUrl || '');
    }
    setProfileErrorMsg(null);
    setIsEditMode(false);
  };

  // Trigger File Input Dialog
  const handleTriggerFileInput = () => {
    if (fileInputRef.current && !isSavingProfile && !isUploadingPhoto) {
      fileInputRef.current.click();
    }
  };

  // Handle Profile Picture File Selection & Upload (Direct Supabase upload & persistence, isolated loading)
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file fires onChange
    e.target.value = '';

    setProfileErrorMsg(null);

    // Validate type (JPG, JPEG, PNG, WebP) and size (up to 10 MB) client-side
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setProfileErrorMsg(validation.error || 'Invalid image file. Please select a JPG, JPEG, PNG, or WebP image up to 10 MB.');
      return;
    }

    // Immediate local preview for responsive visual feedback
    cleanupPreviewBlob();
    const localUrl = URL.createObjectURL(file);
    previewBlobUrlRef.current = localUrl;
    setAvatarPreviewUrl(localUrl);

    // Dedicated upload loading state (only on photo button, no full-page overlay)
    setIsUploadingPhoto(true);

    try {
      if (!user?.id) {
        throw new Error('No authenticated user session found.');
      }

      // Upload to Supabase Storage bucket with unique user-based path and 10MB max limit
      const uploadRes = await uploadAvatarImage(user.id, file);
      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || 'Failed to upload photo to Supabase storage.');
      }

      // Persist avatar URL in Supabase database & Auth user metadata
      const updateRes = await updateProfile({
        avatarUrl: uploadRes.url
      });

      if (!updateRes.success) {
        throw new Error(updateRes.error || 'Failed to update database profile record.');
      }

      // Confirmed persistent URL from Supabase
      cleanupPreviewBlob();
      setAvatarPreviewUrl(uploadRes.url);
      // Photo successfully saved in Supabase Storage and database without displaying visible banner (Req 2)
    } catch (err: any) {
      cleanupPreviewBlob();
      setProfileErrorMsg(err?.message || 'Failed to upload and save profile picture.');
      // Revert preview back to existing saved avatar URL
      setAvatarPreviewUrl(user?.avatarUrl || '');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg(null);

    if (!fullName.trim()) {
      setProfileErrorMsg('Full Name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const result = await updateProfile({
        name: fullName.trim(),
        phone: phone.trim(),
        title: title.trim(),
        avatarUrl: avatarPreviewUrl || user?.avatarUrl
      });

      if (result.success) {
        setIsEditMode(false);
      } else {
        setProfileErrorMsg(result.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'An unexpected error occurred while saving profile.');
    } finally {
      setIsSavingProfile(false);
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

  /*
  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Oct 21, 2026';
  */

  const userDisplayName = user?.name || fullName || 'Chandan Kumar';
  const userDisplayEmail = user?.email || 'chandan873605@gmail.com';
  const userDisplayRole = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'SUPER ADMIN';
  const userDisplayTitle = user?.title || title || 'Master Auctioneer & Executive Admin';
  const userDisplayPhone = user?.phone || phone || '(406) 555-0192';
  const activeAvatarUrl = avatarPreviewUrl || user?.avatarUrl;

  return (
    <div className="profile-view-container">
      {/* Hidden File Input for Profile Picture Upload (JPG, JPEG, PNG, WebP up to 10 MB) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        style={{ display: 'none' }}
        onChange={handleAvatarFileChange}
        aria-hidden="true"
        id="admin-avatar-file-input"
      />

      {/* Header & Breadcrumb */}
      <div className="profile-view-header">
        <div className="profile-header-left">
          {onNavigate && (
            <button 
              type="button" 
              className="profile-back-btn" 
              onClick={() => onNavigate('overview')}
              title="Return to Dashboard Overview"
              id="btn-profile-back"
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

        {/* Commented out: Supabase AF360 Connected badge */}
        {/*
        <div className="profile-header-badge">
          <span className="profile-sync-dot" />
          <span>{isSupabaseConnected ? 'Supabase AF360 Connected' : 'Local Admin Active'}</span>
        </div>
        */}
      </div>

      {/* Admin Identity Hero Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-avatar-wrap">
          <div className="profile-hero-avatar">
            {activeAvatarUrl ? (
              <img 
                src={activeAvatarUrl} 
                alt={userDisplayName} 
                className="profile-hero-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.profile-hero-avatar-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span 
              className="profile-hero-avatar-fallback" 
              style={{ display: activeAvatarUrl ? 'none' : 'flex' }}
            >
              {user?.avatarText || 'CK'}
            </span>
          </div>

          {/* Verified Administrator Badge */}
          <div className="profile-hero-badge-check" title="Verified Administrator">
            <BadgeCheck size={16} />
          </div>

          {/* Camera upload overlay */}
          <button
            type="button"
            className="profile-avatar-camera-btn"
            onClick={handleTriggerFileInput}
            disabled={isUploadingPhoto || isSavingProfile}
            title={activeAvatarUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}
            aria-label="Upload or change profile photo"
            id="btn-upload-photo-icon"
          >
            {isUploadingPhoto ? (
              <Loader2 size={13} className="spin-animation" />
            ) : (
              <Camera size={13} />
            )}
          </button>
        </div>

        <div className="profile-hero-main-info">
          <div className="profile-hero-name-row">
            <h2 className="profile-hero-name">{userDisplayName}</h2>
            <div className="profile-hero-role-tag">
              <ShieldCheck size={13} color="#059669" />
              <span>{userDisplayRole}</span>
            </div>

            {/* Photo action button */}
            <button
              type="button"
              className="profile-photo-action-btn"
              onClick={handleTriggerFileInput}
              disabled={isUploadingPhoto || isSavingProfile}
              id="btn-upload-photo-text"
              title="Change administrator profile photo"
            >
              {isUploadingPhoto ? (
                <>
                  <Loader2 size={12} className="spin-animation" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Camera size={12} />
                  <span>{activeAvatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </>
              )}
            </button>
          </div>
          <div className="profile-hero-sub-row">
            <span className="profile-hero-title">{userDisplayTitle}</span>
            <span className="profile-hero-bullet">•</span>
            <span className="profile-hero-email">{userDisplayEmail}</span>
          </div>

          {!isEditMode && profileErrorMsg && (
            <div className="profile-inline-alert error" style={{ marginTop: 6 }}>
              <AlertCircle size={14} />
              <span>{profileErrorMsg}</span>
            </div>
          )}
        </div>

        {/* Commented out: License Credential, Member Since, Security Tier meta stats */}
        {/*
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
        */}
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="profile-forms-grid">
        {/* Column 1: Administrative Details (View Mode by default / Edit Mode on Demand) */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-wrap">
              <User size={18} />
            </div>
            <div>
              <h3 className="profile-card-title">Administrative Details</h3>
              <p className="profile-card-desc">
                {isEditMode 
                  ? 'Update your administrative contact information, display title, and profile picture.' 
                  : 'View and manage your executive contact details and saleroom administrative identity.'}
              </p>
            </div>

            {/* Edit Profile Action Button (visible in View Mode) */}
            {!isEditMode && (
              <button
                type="button"
                className="btn-edit-profile"
                onClick={handleEnterEditMode}
                id="btn-edit-profile"
                title="Edit administrative profile details"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Profile Feedback Notifications */}
          {profileErrorMsg && (
            <div className="profile-alert profile-alert-error">
              <AlertCircle size={16} />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          {/* VIEW MODE: Clean, Read-Only Display */}
          {!isEditMode ? (
            <div className="profile-view-display">
              {/* Full Name */}
              <div className="profile-field-group">
                <span className="profile-field-label">Full Name</span>
                <div className="profile-view-box">
                  <User size={16} className="profile-view-icon" />
                  <span className="profile-view-text">{userDisplayName}</span>
                </div>
                <span className="profile-field-hint">
                  Persisted to Supabase profile and displayed in activity audit logs.
                </span>
              </div>

              {/* Email Address - Protected */}
              <div className="profile-field-group">
                <span className="profile-field-label">
                  Email Address (Primary Identity)
                </span>
                <div className="profile-view-box protected">
                  <Mail size={16} className="profile-view-icon" />
                  <span className="profile-view-text">{userDisplayEmail}</span>
                  <span className="profile-protected-badge" title="Protected authentication identity">
                    <Lock size={11} />
                    <span>Protected</span>
                  </span>
                </div>
                <span className="profile-field-hint">
                  Primary authentication identity tied to your Supabase security record (immutable).
                </span>
              </div>

              {/* Direct Phone Number */}
              <div className="profile-field-group">
                <span className="profile-field-label">Direct Phone Number</span>
                <div className="profile-view-box">
                  <Phone size={16} className="profile-view-icon" />
                  <span className="profile-view-text">{userDisplayPhone}</span>
                </div>
                <span className="profile-field-hint">
                  Direct contact line for consignor settlements and bank wire verifications.
                </span>
              </div>

              {/* Saleroom Operational Title */}
              <div className="profile-field-group">
                <span className="profile-field-label">Saleroom Operational Title</span>
                <div className="profile-view-box">
                  <Briefcase size={16} className="profile-view-icon" />
                  <span className="profile-view-text">{userDisplayTitle}</span>
                </div>
                <span className="profile-field-hint">
                  Title displayed on generated settlement invoices and clerking consoles.
                </span>
              </div>

              {/* Role & Permission Level - Protected */}
              <div className="profile-field-group">
                <span className="profile-field-label">Role &amp; Permission Level</span>
                <div className="profile-role-display-box">
                  <div className="role-display-left">
                    <ShieldCheck size={16} color="#059669" />
                    <span className="role-display-name">{userDisplayRole}</span>
                  </div>
                  <span className="role-display-policy">Full Rostrum &amp; Vault Clearance</span>
                </div>
                <span className="profile-field-hint">
                  Executive role assignments are governed strictly by administrative policy.
                </span>
              </div>
            </div>
          ) : (
            /* EDIT MODE: Profile Picture Upload + Input Fields + Save Changes & Cancel Buttons */
            <form onSubmit={handleSaveProfile} className="profile-form">
              {/* Dedicated Profile Picture Upload Control inside Edit Mode */}
              <div className="profile-field-group">
                <label className="profile-field-label">
                  Profile Picture
                </label>
                <div className="profile-edit-avatar-row">
                  <div className="profile-edit-avatar-preview">
                    {activeAvatarUrl ? (
                      <img 
                        src={activeAvatarUrl} 
                        alt="Avatar Preview" 
                        className="profile-edit-avatar-img" 
                      />
                    ) : (
                      <span>{user?.avatarText || 'CK'}</span>
                    )}
                  </div>
                  <div className="profile-edit-avatar-actions">
                    <button
                      type="button"
                      className="btn-upload-avatar-form"
                      onClick={handleTriggerFileInput}
                      disabled={isUploadingPhoto || isSavingProfile}
                      id="btn-edit-mode-upload-photo"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 size={14} className="spin-animation" />
                          <span>Uploading Picture...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={14} />
                          <span>{activeAvatarUrl ? 'Change Profile Picture' : 'Upload Profile Picture'}</span>
                        </>
                      )}
                    </button>
                    <span className="profile-field-hint">
                      JPG, JPEG, PNG, or WebP format up to 10 MB.
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Name */}
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
                    placeholder="e.g. Chandan Kumar"
                    required
                  />
                </div>
                <span className="profile-field-hint">
                  Persisted to Supabase profile and displayed in activity audit logs.
                </span>
              </div>

              {/* Email Address - Strictly Read-Only & Protected */}
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
                    value={userDisplayEmail}
                    disabled
                    readOnly
                  />
                  <span className="profile-protected-badge" style={{ position: 'absolute', right: 12 }}>
                    <Lock size={11} />
                    <span>Read Only</span>
                  </span>
                </div>
                <span className="profile-field-hint">
                  Primary authentication identity tied to your Supabase security record (immutable).
                </span>
              </div>

              {/* Direct Phone Number - Editable */}
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

              {/* Saleroom Operational Title - Editable */}
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
                    placeholder="e.g. Master Auctioneer & Executive Admin"
                  />
                </div>
                <span className="profile-field-hint">
                  Title displayed on generated settlement invoices and clerking consoles.
                </span>
              </div>

              {/* Role & Permission Level - Strictly Read-Only */}
              <div className="profile-field-group">
                <label className="profile-field-label">
                  Role &amp; Permission Level
                </label>
                <div className="profile-role-display-box">
                  <div className="role-display-left">
                    <ShieldCheck size={16} color="#059669" />
                    <span className="role-display-name">{userDisplayRole}</span>
                  </div>
                  <span className="role-display-policy">Full Rostrum &amp; Vault Clearance (Protected)</span>
                </div>
                <span className="profile-field-hint">
                  Role assignments cannot be modified through the profile form.
                </span>
              </div>

              {/* Action Controls: Save Profile & Cancel */}
              <div className="profile-card-actions">
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={isSavingProfile || isUploadingPhoto}
                  id="btn-save-profile"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 size={16} className="spin-animation" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-cancel-profile"
                  onClick={handleCancelEdit}
                  disabled={isSavingProfile || isUploadingPhoto}
                  id="btn-cancel-profile"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Column 2: Change Password & Security */}
        <div className="profile-security-column">
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-icon-wrap security">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Security &amp; Password</h3>
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
                    {newPassword.length >= 8 ? (
                      <CheckCircle2 size={13} className="req-icon met" />
                    ) : (
                      <span className="req-bullet" />
                    )}
                    <span>At least 8 characters in length</span>
                  </li>
                  <li className={newPassword && confirmPassword && newPassword === confirmPassword ? 'met' : ''}>
                    {newPassword && confirmPassword && newPassword === confirmPassword ? (
                      <CheckCircle2 size={13} className="req-icon met" />
                    ) : (
                      <span className="req-bullet" />
                    )}
                    <span>Passwords match exactly</span>
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>
                    {/[0-9]/.test(newPassword) ? (
                      <CheckCircle2 size={13} className="req-icon met" />
                    ) : (
                      <span className="req-bullet" />
                    )}
                    <span>Contains at least one number</span>
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
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 size={16} className="spin-animation" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Update Password</span>
                    </>
                  )}
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
