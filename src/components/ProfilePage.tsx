import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Gavel,
  Trophy,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
  Check,
  Edit3,
  X,
  Camera,
  Trash2,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  onNavigate: (path: string) => void;
  onShowToast?: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

type ProfileTab = 'personal' | 'bidding' | 'won' | 'security';

interface BidRecord {
  id: string;
  lot_id?: string;
  lot_number?: number | string;
  lot_title?: string;
  amount: number;
  paddle_number?: string;
  status?: string;
  created_at: string;
}

interface WonLotRecord {
  id: string;
  auction_id?: string;
  lot_number: number | string;
  title: string;
  category?: string;
  image?: string;
  hammer_price?: number;
  current_bid?: number;
  status: string;
  payment_status?: string;
  high_bidder_name?: string;
  created_at?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate, onShowToast }) => {
  const { user, updateProfile, updatePassword, uploadAvatar, deleteAvatar, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  // Profile Photo Management States (Select-Then-Upload Flow)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Personal Info Form & Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Bidding & Won Auctions Database States
  const [biddingHistory, setBiddingHistory] = useState<BidRecord[]>([]);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const [bidsError, setBidsError] = useState<string | null>(null);

  const [wonAuctions, setWonAuctions] = useState<WonLotRecord[]>([]);
  const [isLoadingWon, setIsLoadingWon] = useState(false);
  const [wonError, setWonError] = useState<string | null>(null);

  // Sync personal fields when user updates
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Fetch real bidding activity from Supabase
  const fetchBiddingHistory = useCallback(async () => {
    if (!user) return;
    setIsLoadingBids(true);
    setBidsError(null);

    try {
      // 1. Attempt query from 'bids' table if present
      const { data: bidsData, error: bidsErr } = await supabase
        .from('bids')
        .select('*')
        .or(`bidder_name.eq.${user.name},bidder_name.eq.${user.email}`)
        .order('created_at', { ascending: false });

      if (!bidsErr && bidsData && bidsData.length > 0) {
        setBiddingHistory(
          bidsData.map((b: any) => ({
            id: b.id || `bid-${b.lot_id}-${b.amount}`,
            lot_id: b.lot_id,
            lot_number: b.lot_number,
            lot_title: b.lot_title || `Lot #${b.lot_number}`,
            amount: Number(b.amount || 0),
            paddle_number: b.paddle_number,
            status: b.status || 'Active Bid',
            created_at: b.created_at || new Date().toISOString()
          }))
        );
      } else {
        // Fallback: check 'lots' where current user is high_bidder
        const { data: lotsData } = await supabase
          .from('lots')
          .select('*')
          .eq('high_bidder_name', user.name);

        if (lotsData && lotsData.length > 0) {
          setBiddingHistory(
            lotsData.map((l: any) => ({
              id: `bid-lot-${l.id}`,
              lot_id: l.id,
              lot_number: l.lot_number,
              lot_title: l.title,
              amount: Number(l.current_bid || l.starting_bid || 0),
              paddle_number: l.high_bidder_paddle || 'Registered',
              status: l.status === 'sold' ? 'Winning Bid (Closed)' : 'Current High Bid',
              created_at: l.updated_at || l.created_at || new Date().toISOString()
            }))
          );
        } else {
          setBiddingHistory([]);
        }
      }
    } catch {
      setBiddingHistory([]);
    } finally {
      setIsLoadingBids(false);
    }
  }, [user]);

  // Fetch real won auctions from Supabase lots table
  const fetchWonAuctions = useCallback(async () => {
    if (!user) return;
    setIsLoadingWon(true);
    setWonError(null);

    try {
      const { data: lotsData, error: lotsErr } = await supabase
        .from('lots')
        .select('*')
        .eq('status', 'sold')
        .eq('high_bidder_name', user.name);

      if (!lotsErr && lotsData && lotsData.length > 0) {
        setWonAuctions(
          lotsData.map((l: any) => ({
            id: l.id,
            auction_id: l.auction_id,
            lot_number: l.lot_number,
            title: l.title,
            category: l.category,
            image: l.image,
            hammer_price: l.hammer_price || l.current_bid,
            current_bid: l.current_bid,
            status: 'Sold & Awarded',
            payment_status: 'Wire Transfer / Clerking Clearance Pending',
            high_bidder_name: l.high_bidder_name,
            created_at: l.updated_at || l.created_at
          }))
        );
      } else {
        setWonAuctions([]);
      }
    } catch {
      setWonAuctions([]);
    } finally {
      setIsLoadingWon(false);
    }
  }, [user]);

  // Fetch when tab changes
  useEffect(() => {
    if (activeTab === 'bidding') {
      fetchBiddingHistory();
    } else if (activeTab === 'won') {
      fetchWonAuctions();
    }
  }, [activeTab, fetchBiddingHistory, fetchWonAuctions]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      setProfileErrorMsg('Full Legal Name is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const result = await updateProfile({
        name: cleanName,
        phone: phone.trim()
      });

      if (result.success) {
        setProfileSuccessMsg('Profile information updated successfully.');
        setIsEditingProfile(false);
        if (onShowToast) {
          onShowToast('success', 'Profile Updated', 'Your profile records have been saved.');
        }
      } else {
        setProfileErrorMsg(result.error || 'Failed to update profile records.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'A network error occurred while updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cancel Edit Profile (restores saved values)
  const handleCancelEdit = () => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
    }
    setProfileErrorMsg(null);
    setIsEditingProfile(false);
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    if (newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const result = await updatePassword(newPassword);
      if (result.success) {
        setPasswordSuccessMsg('Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
        if (onShowToast) {
          onShowToast('success', 'Password Updated', 'Your account credentials have been updated.');
        }
      } else {
        setPasswordErrorMsg(result.error || 'Failed to update account password.');
      }
    } catch (err: any) {
      setPasswordErrorMsg(err?.message || 'A network error occurred during password update.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // --- PHOTO MANAGEMENT HANDLERS (SELECT-THEN-UPLOAD FLOW) ---
  // Clean up blob preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const handleOpenPhotoPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset feedback
    setPhotoFeedback(null);

    // Validate image format
    const validFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validFormats.includes(file.type.toLowerCase())) {
      setPhotoFeedback({
        type: 'error',
        message: 'Unsupported format. Please select a JPG, PNG, or WebP photo.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onShowToast) {
        onShowToast('warning', 'Unsupported File', 'Please upload a JPG, PNG, or WebP photo.');
      }
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setPhotoFeedback({
        type: 'error',
        message: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller photo.`
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onShowToast) {
        onShowToast('warning', 'Photo Too Large', 'Please select a photo smaller than 5MB.');
      }
      return;
    }

    // Revoke previous blob preview if any
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    // Create local preview inside profile picture area and enable Upload button
    const preview = URL.createObjectURL(file);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(preview);
    setPhotoFeedback({
      type: 'success',
      message: 'Photo selected! Click "Upload" below to save your profile picture.'
    });
  };

  const handleCancelPhotoSelection = () => {
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSelectedPhoto = async () => {
    if (!selectedPhotoFile) return;

    setIsUploadingPhoto(true);
    setPhotoFeedback(null);

    try {
      const res = await uploadAvatar(selectedPhotoFile);
      if (res.success) {
        if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreviewUrl);
        }
        setSelectedPhotoFile(null);
        setPhotoPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setPhotoFeedback({
          type: 'success',
          message: 'Profile picture uploaded and saved successfully.'
        });
        if (onShowToast) {
          onShowToast('success', 'Profile Photo Saved', 'Your new profile picture is active across the saleroom.');
        }
      } else {
        setPhotoFeedback({
          type: 'error',
          message: res.error || 'Failed to upload profile picture.'
        });
        if (onShowToast) {
          onShowToast('warning', 'Upload Error', res.error || 'Failed to upload profile picture.');
        }
      }
    } catch (err: any) {
      setPhotoFeedback({
        type: 'error',
        message: err?.message || 'A network error occurred while uploading your photo.'
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleConfirmDeletePhoto = async () => {
    setIsDeletingPhoto(true);
    setPhotoFeedback(null);
    try {
      const res = await deleteAvatar();
      if (res.success) {
        if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreviewUrl);
        }
        setSelectedPhotoFile(null);
        setPhotoPreviewUrl(null);
        setIsDeleteModalOpen(false);
        setIsPhotoLightboxOpen(false);
        setPhotoFeedback({
          type: 'success',
          message: 'Profile photo removed. Default initials restored.'
        });
        if (onShowToast) {
          onShowToast('info', 'Photo Removed', 'Your profile photo has been deleted.');
        }
      } else {
        setPhotoFeedback({
          type: 'error',
          message: res.error || 'Failed to remove profile photo.'
        });
      }
    } catch (err: any) {
      setPhotoFeedback({
        type: 'error',
        message: err?.message || 'A network error occurred while deleting your photo.'
      });
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // If loading session on fresh page load
  if (authLoading) {
    return (
      <div className="profile-page-root">
        <div className="profile-loading-state">
          <span className="auth-btn-spinner lg" />
          <p>Verifying secure saleroom credentials...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, prompt to sign in
  if (!user) {
    return (
      <div className="profile-page-root">
        <div className="container-fluid profile-container">
          <div className="profile-unauth-card">
            <div className="unauth-icon-circle">
              <Lock size={32} />
            </div>
            <h2 className="unauth-title font-serif">Authentication Required</h2>
            <p className="unauth-desc">
              Please sign in to access your Gardner Auction bidder credentials, bidding history, won auctions, and account security.
            </p>
            <div className="unauth-action-row">
              <button
                type="button"
                className="btn-auth-gold-primary"
                onClick={() => onNavigate('#signin')}
              >
                Sign In to Bidder Account
              </button>
              <button
                type="button"
                className="profile-unauth-back-btn"
                onClick={() => onNavigate('/')}
              >
                Return to Saleroom
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-root">
      <div className="container-fluid profile-container">
        {/* Top Breadcrumb & Back Bar */}
        <div className="profile-top-nav-bar">
          <nav className="profile-breadcrumbs" aria-label="Breadcrumb">
            <button type="button" onClick={() => onNavigate('/')} className="breadcrumb-link">
              Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <button type="button" onClick={() => onNavigate('#auctions')} className="breadcrumb-link">
              Auctions
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">My Profile</span>
          </nav>

          <button
            type="button"
            className="profile-back-btn"
            onClick={() => onNavigate('#auctions')}
          >
            <ArrowLeft size={15} />
            <span>Back to Auctions</span>
          </button>
        </div>

        {/* 2-Column Master Layout */}
        <div className="profile-dashboard-layout">
          {/* =================================================================
              LEFT SIDEBAR: Profile Card & Tab Navigation
              ================================================================= */}
          <aside className="profile-sidebar-panel">
            {/* Collector Identity Card */}
            <div className="profile-collector-card">
              {/* Hidden file input for photo upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                aria-label="Upload profile photo"
              />

              <div className="collector-avatar-wrap">
                <div
                  className={`collector-avatar-circle font-serif ${(photoPreviewUrl || user.avatarUrl) ? 'has-photo' : ''} ${isUploadingPhoto ? 'uploading' : ''} ${photoPreviewUrl ? 'preview-mode' : ''}`}
                  onClick={() => {
                    if (isUploadingPhoto) return;
                    if (user.avatarUrl && !photoPreviewUrl) {
                      setIsPhotoLightboxOpen(true);
                    } else {
                      handleOpenPhotoPicker();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (isUploadingPhoto) return;
                      if (user.avatarUrl && !photoPreviewUrl) setIsPhotoLightboxOpen(true);
                      else handleOpenPhotoPicker();
                    }
                  }}
                  title={photoPreviewUrl ? 'Selected image preview (Click to change)' : user.avatarUrl ? 'Click to view full photo' : 'Click to select photo'}
                  aria-label={user.avatarUrl ? 'View full profile photo' : 'Select profile photo'}
                >
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Selected preview"
                      className="collector-avatar-img preview"
                    />
                  ) : user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="collector-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{user.avatarText || 'GA'}</span>
                  )}

                  {/* Hover action overlay (hidden while uploading) */}
                  {!isUploadingPhoto && (
                    <div className="avatar-hover-overlay">
                      {photoPreviewUrl ? (
                        <div className="hover-action-hint">
                          <Camera size={16} />
                          <span>Change</span>
                        </div>
                      ) : user.avatarUrl ? (
                        <div className="hover-action-hint">
                          <Eye size={16} />
                          <span>View</span>
                        </div>
                      ) : (
                        <div className="hover-action-hint">
                          <Camera size={16} />
                          <span>Select</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profile Picture Loader: inside avatar circle ONLY */}
                  {isUploadingPhoto && (
                    <div className="avatar-loading-overlay">
                      <span className="auth-btn-spinner sm" />
                      <span className="avatar-loading-label">Saving...</span>
                    </div>
                  )}
                </div>

                {/* Edit Photo Badge Button */}
                <button
                  type="button"
                  className="collector-avatar-upload-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPhotoPicker();
                  }}
                  title={photoPreviewUrl ? 'Choose a different photo' : user.avatarUrl ? 'Change Profile Photo' : 'Select Profile Photo'}
                  aria-label="Select photo"
                  disabled={isUploadingPhoto}
                  id="btn-edit-photo-badge"
                >
                  <Camera size={13} />
                </button>

                <span className="collector-online-badge" title="Authenticated live session" />
              </div>

              {/* Photo Action Buttons: Select-Then-Upload Flow */}
              <div className="collector-photo-actions-bar">
                {selectedPhotoFile ? (
                  /* State A: Photo selected by user. Upload button is ENABLED, with Cancel option */
                  <div className="photo-actions-group">
                    <button
                      type="button"
                      className="photo-action-btn upload-primary"
                      onClick={handleUploadSelectedPhoto}
                      disabled={isUploadingPhoto}
                      id="btn-confirm-upload-photo"
                      title="Upload and save selected photo"
                    >
                      <Upload size={13} />
                      <span>{isUploadingPhoto ? 'Uploading...' : 'Upload'}</span>
                    </button>
                    <button
                      type="button"
                      className="photo-action-btn cancel"
                      onClick={handleCancelPhotoSelection}
                      disabled={isUploadingPhoto}
                      id="btn-cancel-preview-photo"
                      title="Discard selected image"
                    >
                      <X size={13} />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : user.avatarUrl ? (
                  /* State B: User has a saved photo and no pending selection */
                  <>
                    <button
                      type="button"
                      className="photo-action-btn view"
                      onClick={() => setIsPhotoLightboxOpen(true)}
                      title="View full-size photo"
                      id="btn-view-photo"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      className="photo-action-btn change"
                      onClick={handleOpenPhotoPicker}
                      title="Select a new photo to replace current"
                      disabled={isUploadingPhoto}
                      id="btn-change-photo"
                    >
                      <Camera size={13} />
                      <span>Change</span>
                    </button>
                    <button
                      type="button"
                      className="photo-action-btn delete"
                      onClick={() => setIsDeleteModalOpen(true)}
                      title="Remove profile photo"
                      disabled={isUploadingPhoto || isDeletingPhoto}
                      id="btn-delete-photo"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </>
                ) : (
                  /* State C: No photo exists, initially keep Upload button DISABLED until user selects a photo */
                  <div className="photo-actions-group">
                    <button
                      type="button"
                      className="photo-action-btn select-photo"
                      onClick={handleOpenPhotoPicker}
                      disabled={isUploadingPhoto}
                      id="btn-select-photo"
                      title="Select an image from your device"
                    >
                      <Camera size={13} />
                      <span>Select Photo</span>
                    </button>
                    <button
                      type="button"
                      className="photo-action-btn upload-disabled"
                      disabled={true}
                      id="btn-upload-disabled"
                      title="Select an image first to enable upload"
                    >
                      <Upload size={13} />
                      <span>Upload</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Feedback Message Banner */}
              {photoFeedback && (
                <div className={`collector-photo-feedback ${photoFeedback.type}`}>
                  {photoFeedback.type === 'success' ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <AlertCircle size={13} />
                  )}
                  <span>{photoFeedback.message}</span>
                  <button
                    type="button"
                    className="feedback-dismiss-btn"
                    onClick={() => setPhotoFeedback(null)}
                    aria-label="Dismiss message"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <h1 className="collector-name font-serif">{user.name}</h1>
              <span className="collector-email">{user.email}</span>

              <div className="collector-licensure-pill">
                <ShieldCheck size={12} className="pill-gold-icon" />
                <span>{user.title || 'Registered Bidder'}</span>
              </div>

              <div className="collector-meta-stats single">
                <div className="meta-stat-item">
                  <span className="stat-label">Member Since</span>
                  <span className="stat-value">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short'
                        })
                      : 'Oct 2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Only 4 Sections) */}
            <nav className="profile-nav-menu" aria-label="Profile Sections">
              <button
                type="button"
                className={`profile-nav-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('personal');
                  setIsEditingProfile(false);
                }}
                id="tab-profile-personal"
              >
                <div className="tab-btn-content">
                  <User size={18} className="tab-icon" />
                  <div className="tab-text-group">
                    <span className="tab-title">Personal Information</span>
                    <span className="tab-subtitle">Name, contact &amp; account info</span>
                  </div>
                </div>
                <ChevronRight size={16} className="tab-chevron" />
              </button>

              <button
                type="button"
                className={`profile-nav-tab-btn ${activeTab === 'bidding' ? 'active' : ''}`}
                onClick={() => setActiveTab('bidding')}
                id="tab-profile-bidding"
              >
                <div className="tab-btn-content">
                  <Gavel size={18} className="tab-icon" />
                  <div className="tab-text-group">
                    <span className="tab-title">Bidding History</span>
                    <span className="tab-subtitle">Placed bids &amp; lot clerking</span>
                  </div>
                </div>
                <ChevronRight size={16} className="tab-chevron" />
              </button>

              <button
                type="button"
                className={`profile-nav-tab-btn ${activeTab === 'won' ? 'active' : ''}`}
                onClick={() => setActiveTab('won')}
                id="tab-profile-won"
              >
                <div className="tab-btn-content">
                  <Trophy size={18} className="tab-icon" />
                  <div className="tab-text-group">
                    <span className="tab-title">Won Auctions</span>
                    <span className="tab-subtitle">Hammered lots &amp; settlements</span>
                  </div>
                </div>
                <ChevronRight size={16} className="tab-chevron" />
              </button>

              <button
                type="button"
                className={`profile-nav-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
                id="tab-profile-security"
              >
                <div className="tab-btn-content">
                  <ShieldCheck size={18} className="tab-icon" />
                  <div className="tab-text-group">
                    <span className="tab-title">Account &amp; Security</span>
                    <span className="tab-subtitle">Password update</span>
                  </div>
                </div>
                <ChevronRight size={16} className="tab-chevron" />
              </button>
            </nav>
          </aside>

          {/* =================================================================
              RIGHT MAIN CONTENT: Active Section Card
              ================================================================= */}
          <main className="profile-content-panel">
            {/* ==================== 1. PERSONAL INFORMATION ==================== */}
            {activeTab === 'personal' && (
              <div className="profile-section-card">
                <div className="section-card-header">
                  <div>
                    <h2 className="section-title font-serif">Personal Information</h2>
                    <p className="section-subtitle">
                      {isEditingProfile
                        ? 'Update your legal name and contact phone number. Changes are saved to your profile.'
                        : 'Review and manage your accredited collector credentials and contact details.'}
                    </p>
                  </div>
                  {!isEditingProfile && (
                    <button
                      type="button"
                      className="profile-edit-btn"
                      onClick={() => {
                        setFullName(user.name || '');
                        setPhone(user.phone || '');
                        setProfileErrorMsg(null);
                        setProfileSuccessMsg(null);
                        setIsEditingProfile(true);
                      }}
                      id="btn-edit-profile"
                    >
                      <Edit3 size={15} />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {profileSuccessMsg && (
                  <div className="auth-alert-banner success" role="status">
                    <CheckCircle2 size={16} className="alert-icon" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrorMsg && (
                  <div className="auth-alert-banner error" role="alert">
                    <AlertCircle size={16} className="alert-icon" />
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                {!isEditingProfile ? (
                  /* ================= READ-ONLY VIEW (DEFAULT) ================= */
                  <div className="profile-readonly-container">
                    <div className="profile-readonly-grid">
                      <div className="profile-readonly-item">
                        <div className="readonly-item-header">
                          <User size={15} className="readonly-icon" />
                          <span className="readonly-label">Full Legal Name</span>
                        </div>
                        <span className="readonly-value">{user.name || 'Not provided'}</span>
                      </div>

                      <div className="profile-readonly-item">
                        <div className="readonly-item-header">
                          <Mail size={15} className="readonly-icon" />
                          <span className="readonly-label">Email Address</span>
                        </div>
                        <span className="readonly-value">{user.email || 'Not provided'}</span>
                      </div>

                      <div className="profile-readonly-item">
                        <div className="readonly-item-header">
                          <Phone size={15} className="readonly-icon" />
                          <span className="readonly-label">Contact Phone</span>
                        </div>
                        <span className={`readonly-value ${!user.phone ? 'muted' : ''}`}>
                          {user.phone || 'Not provided'}
                        </span>
                      </div>

                      <div className="profile-readonly-item">
                        <div className="readonly-item-header">
                          <ShieldCheck size={15} className="readonly-icon" />
                          <span className="readonly-label">Saleroom Role</span>
                        </div>
                        <span className="readonly-value">{user.title || 'Registered Bidder'}</span>
                      </div>

                      <div className="profile-readonly-item full-width">
                        <div className="readonly-item-header">
                          <Calendar size={15} className="readonly-icon" />
                          <span className="readonly-label">Member Since</span>
                        </div>
                        <span className="readonly-value">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'October 2026'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= EDITABLE FORM VIEW ================= */
                  <form onSubmit={handleSaveProfile} className="profile-form">
                    <div className="profile-grid-2col">
                      <div className="auth-field-group">
                        <label className="auth-field-label" htmlFor="prof-full-name">
                          Full Legal Name <span className="req-star">*</span>
                        </label>
                        <div className="auth-input-container">
                          <User size={16} className="auth-field-icon" />
                          <input
                            id="prof-full-name"
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
                        <label className="auth-field-label" htmlFor="prof-email">
                          Email Address (Read-Only)
                        </label>
                        <div className="auth-input-container disabled">
                          <Mail size={16} className="auth-field-icon" />
                          <input
                            id="prof-email"
                            type="email"
                            disabled
                            value={user.email}
                            className="auth-text-input"
                            title="Email is managed by Supabase authentication"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="profile-grid-2col">
                      <div className="auth-field-group">
                        <label className="auth-field-label" htmlFor="prof-phone">
                          Contact Phone Number
                        </label>
                        <div className="auth-input-container">
                          <Phone size={16} className="auth-field-icon" />
                          <input
                            id="prof-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="auth-text-input"
                            placeholder="+1 (412) 555-0192"
                          />
                        </div>
                      </div>

                      <div className="auth-field-group">
                        <label className="auth-field-label" htmlFor="prof-role">
                          Saleroom Role
                        </label>
                        <div className="auth-input-container disabled">
                          <ShieldCheck size={16} className="auth-field-icon" />
                          <input
                            id="prof-role"
                            type="text"
                            disabled
                            value={user.title || 'Registered Bidder'}
                            className="auth-text-input"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="profile-form-action-bar edit-mode">
                      <button
                        type="button"
                        className="btn-profile-cancel"
                        onClick={handleCancelEdit}
                        disabled={isSavingProfile}
                        id="btn-cancel-edit-profile"
                      >
                        <X size={15} />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="submit"
                        className="btn-auth-gold-primary"
                        disabled={isSavingProfile}
                        id="btn-save-personal-info"
                      >
                        {isSavingProfile ? (
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
                  </form>
                )}
              </div>
            )}

            {/* ==================== 2. BIDDING HISTORY ==================== */}
            {activeTab === 'bidding' && (
              <div className="profile-section-card">
                <div className="section-card-header">
                  <div>
                    <h2 className="section-title font-serif">Bidding History</h2>
                    <p className="section-subtitle">
                      Chronological ledger of your live clerking desk and webcast bids placed across Gardner Auction sales sessions.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="profile-refresh-btn"
                    onClick={fetchBiddingHistory}
                    disabled={isLoadingBids}
                    title="Refresh bid ledger"
                  >
                    Refresh
                  </button>
                </div>

                {isLoadingBids ? (
                  <div className="profile-empty-state">
                    <span className="auth-btn-spinner lg" />
                    <p>Retrieving your bidding records from Supabase...</p>
                  </div>
                ) : bidsError ? (
                  <div className="auth-alert-banner error" role="alert">
                    <AlertCircle size={16} className="alert-icon" />
                    <span>{bidsError}</span>
                  </div>
                ) : biddingHistory.length > 0 ? (
                  <div className="profile-table-container">
                    <table className="profile-data-table">
                      <thead>
                        <tr>
                          <th>Lot Number &amp; Item</th>
                          <th>Bid Amount</th>
                          <th>Paddle</th>
                          <th>Timestamp</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {biddingHistory.map((bid) => (
                          <tr key={bid.id}>
                            <td>
                              <div className="table-item-cell">
                                <span className="item-lot-tag">Lot #{bid.lot_number}</span>
                                <span className="item-title">{bid.lot_title}</span>
                              </div>
                            </td>
                            <td>
                              <span className="table-price font-serif">
                                ${bid.amount.toLocaleString()}
                              </span>
                            </td>
                            <td>
                              <span className="table-paddle-pill">Paddle #{bid.paddle_number || '104'}</span>
                            </td>
                            <td>
                              <span className="table-date">
                                {new Date(bid.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </td>
                            <td>
                              <span className="table-status-badge active">
                                {bid.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Clean Empty State */
                  <div className="profile-empty-state">
                    <div className="empty-icon-circle">
                      <Gavel size={32} />
                    </div>
                    <h3 className="empty-title font-serif">No Bidding Activity Yet</h3>
                    <p className="empty-desc">
                      You have not placed bids on any active auction lots in the current salesroom session. Bids placed on live lots will automatically register here.
                    </p>
                    <button
                      type="button"
                      className="btn-auth-gold-primary"
                      onClick={() => onNavigate('#auctions')}
                    >
                      Explore Live Auctions →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ==================== 3. WON AUCTIONS ==================== */}
            {activeTab === 'won' && (
              <div className="profile-section-card">
                <div className="section-card-header">
                  <div>
                    <h2 className="section-title font-serif">Won Auctions</h2>
                    <p className="section-subtitle">
                      Catalog lots awarded to your bidder paddle with hammer prices and post-sale clearance statuses.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="profile-refresh-btn"
                    onClick={fetchWonAuctions}
                    disabled={isLoadingWon}
                    title="Refresh won auction records"
                  >
                    Refresh
                  </button>
                </div>

                {isLoadingWon ? (
                  <div className="profile-empty-state">
                    <span className="auth-btn-spinner lg" />
                    <p>Scanning certified salesroom records for awarded lots...</p>
                  </div>
                ) : wonError ? (
                  <div className="auth-alert-banner error" role="alert">
                    <AlertCircle size={16} className="alert-icon" />
                    <span>{wonError}</span>
                  </div>
                ) : wonAuctions.length > 0 ? (
                  <div className="won-lots-grid">
                    {wonAuctions.map((lot) => (
                      <div key={lot.id} className="won-lot-card">
                        {lot.image && (
                          <div className="won-lot-img-wrap">
                            <img src={lot.image} alt={lot.title} className="won-lot-img" />
                            <span className="won-badge">
                              <Trophy size={12} /> WON LOT
                            </span>
                          </div>
                        )}
                        <div className="won-lot-info">
                          <span className="won-lot-number">Lot #{lot.lot_number} • {lot.category || 'Catalog Specimen'}</span>
                          <h3 className="won-lot-title font-serif">{lot.title}</h3>
                          
                          <div className="won-price-row">
                            <span className="won-price-label">Winning Hammer Price:</span>
                            <span className="won-price-amount font-serif">
                              ${(lot.hammer_price || lot.current_bid || 0).toLocaleString()}
                            </span>
                          </div>

                          <div className="won-settlement-status">
                            <span className="settlement-label">Settlement Status:</span>
                            <span className="settlement-pill">{lot.payment_status}</span>
                          </div>

                          <button
                            type="button"
                            className="won-inspect-btn"
                            onClick={() => onNavigate(`#lot/${lot.id}`)}
                          >
                            <span>Inspect Specimen Details</span>
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Clean Empty State */
                  <div className="profile-empty-state">
                    <div className="empty-icon-circle">
                      <Trophy size={32} />
                    </div>
                    <h3 className="empty-title font-serif">No Won Auctions Yet</h3>
                    <p className="empty-desc">
                      Lots you successfully win in live salesroom sessions or webcast clerkings will appear here with your invoice dossier, hammer price, and paddle clearance.
                    </p>
                    <button
                      type="button"
                      className="btn-auth-gold-primary"
                      onClick={() => onNavigate('#catalogs')}
                    >
                      Browse Catalog Lots →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ==================== 4. ACCOUNT & SECURITY (PASSWORD ONLY) ==================== */}
            {activeTab === 'security' && (
              <div className="profile-section-card">
                <div className="section-card-header">
                  <div>
                    <h2 className="section-title font-serif">Account &amp; Security</h2>
                    <p className="section-subtitle">
                      Update your account password to maintain security.
                    </p>
                  </div>
                </div>

                {passwordSuccessMsg && (
                  <div className="auth-alert-banner success" role="status">
                    <CheckCircle2 size={16} className="alert-icon" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrorMsg && (
                  <div className="auth-alert-banner error" role="alert">
                    <AlertCircle size={16} className="alert-icon" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                {/* Password Update Form Only */}
                <form onSubmit={handleUpdatePassword} className="profile-form">
                  <div className="profile-grid-2col">
                    <div className="auth-field-group">
                      <label className="auth-field-label" htmlFor="sec-new-password">
                        New Password <span className="req-star">*</span>
                      </label>
                      <div className="auth-input-container">
                        <Lock size={16} className="auth-field-icon" />
                        <input
                          id="sec-new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="auth-text-input"
                          placeholder="Minimum 8 characters"
                        />
                        <button
                          type="button"
                          className="auth-eye-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="auth-field-group">
                      <label className="auth-field-label" htmlFor="sec-confirm-password">
                        Confirm New Password <span className="req-star">*</span>
                      </label>
                      <div className="auth-input-container">
                        <Lock size={16} className="auth-field-icon" />
                        <input
                          id="sec-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
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
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {newPassword.length > 0 && (
                    <div className="auth-password-criteria-row" style={{ marginTop: 8 }}>
                      <span className={`criteria-badge ${newPassword.length >= 8 ? 'met' : ''}`}>
                        {newPassword.length >= 8 ? <Check size={11} /> : '•'} 8+ Characters
                      </span>
                      <span className={`criteria-badge ${/[A-Z]/.test(newPassword) ? 'met' : ''}`}>
                        {/[A-Z]/.test(newPassword) ? <Check size={11} /> : '•'} Uppercase
                      </span>
                      <span className={`criteria-badge ${/[0-9]/.test(newPassword) ? 'met' : ''}`}>
                        {/[0-9]/.test(newPassword) ? <Check size={11} /> : '•'} Number
                      </span>
                    </div>
                  )}

                  <div className="profile-form-action-bar" style={{ marginTop: 20 }}>
                    <button
                      type="submit"
                      className="btn-auth-gold-primary"
                      disabled={isUpdatingPassword}
                      id="btn-update-password"
                    >
                      {isUpdatingPassword ? (
                        <>
                          <span className="auth-btn-spinner" />
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
            )}
          </main>
        </div>
      </div>

      {/* =================================================================
          PHOTO PREVIEW LIGHTBOX MODAL
          ================================================================= */}
      {isPhotoLightboxOpen && user.avatarUrl && (
        <div
          className="photo-lightbox-backdrop"
          onClick={() => setIsPhotoLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Profile Photo Lightbox"
        >
          <div
            className="photo-lightbox-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="photo-lightbox-header">
              <div className="lightbox-title-wrap">
                <h3 className="lightbox-title font-serif">Profile Photo</h3>
                <span className="lightbox-subtitle">{user.name} · {user.title || 'Registered Bidder'}</span>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setIsPhotoLightboxOpen(false)}
                aria-label="Close photo preview"
                id="btn-close-lightbox"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Photo Frame */}
            <div className="photo-lightbox-preview-wrap">
              <img
                src={user.avatarUrl}
                alt={`${user.name} profile full preview`}
                className="photo-lightbox-image"
              />
            </div>

            {/* Modal Footer Actions */}
            <div className="photo-lightbox-footer">
              <div className="lightbox-footer-left">
                <span className="lightbox-format-hint">JPG, PNG, WebP · Max 5MB</span>
              </div>
              <div className="lightbox-footer-actions">
                <button
                  type="button"
                  className="btn-lightbox-change"
                  onClick={() => {
                    handleOpenPhotoPicker();
                  }}
                  disabled={isUploadingPhoto}
                  id="btn-lightbox-change-photo"
                >
                  <Camera size={14} />
                  <span>Change Photo</span>
                </button>
                <button
                  type="button"
                  className="btn-lightbox-delete"
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                  }}
                  disabled={isDeletingPhoto}
                  id="btn-lightbox-delete-photo"
                >
                  <Trash2 size={14} />
                  <span>Delete Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          DELETE PHOTO CONFIRMATION MODAL
          ================================================================= */}
      {isDeleteModalOpen && (
        <div
          className="photo-delete-backdrop"
          onClick={() => {
            if (!isDeletingPhoto) setIsDeleteModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Photo Deletion"
        >
          <div
            className="photo-delete-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-modal-icon-wrap">
              <AlertTriangle size={24} className="delete-icon" />
            </div>

            <h3 className="delete-modal-title font-serif">Remove Profile Photo?</h3>
            <p className="delete-modal-text">
              Are you sure you want to remove your profile photo? Your account will return to displaying your initials (<strong className="gold-text">{user.avatarText || 'GA'}</strong>) across the saleroom.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-delete-cancel"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingPhoto}
                id="btn-cancel-delete-photo"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={handleConfirmDeletePhoto}
                disabled={isDeletingPhoto}
                id="btn-confirm-delete-photo"
              >
                {isDeletingPhoto ? (
                  <>
                    <span className="auth-btn-spinner sm" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Remove Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
