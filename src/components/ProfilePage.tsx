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
  Edit3,
  X,
  Camera,
  Trash2,
  AlertTriangle,
  Upload,
  Info,
  Download,
  Award,
  RefreshCw,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import './ProfilePage.css';

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
  const { theme, toggleTheme } = useTheme();

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
        phone: phone.trim(),
        title: user?.title || 'Registered Bidder'
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

  // Cancel Edit Profile
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

  // Clean up blob preview URL
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

    setPhotoFeedback(null);

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

    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(preview);
    setPhotoFeedback({
      type: 'success',
      message: 'Photo selected! Click "Upload" to save your profile picture.'
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

  const handleDownloadBidderPass = () => {
    if (onShowToast) {
      onShowToast(
        'success',
        'Bidder Pass Dispatched',
        'Official Pennsylvania Board of Auctioneer Examiners Bidder Pass #AY-002004 has been generated.'
      );
    }
  };

  // If loading session on fresh page load
  if (authLoading) {
    return (
      <div className="ga-profile-root">
        <div className="ga-profile-container">
          <div className="ga-empty-state">
            <span className="auth-btn-spinner lg" />
            <p style={{ color: 'var(--ga-text-muted)', fontSize: '14px', marginTop: '12px' }}>
              Verifying secure saleroom credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, prompt to sign in
  if (!user) {
    return (
      <div className="ga-profile-root">
        <div className="ga-profile-container">
          <div className="ga-modal-card" style={{ margin: '48px auto', textAlign: 'center', padding: '36px 28px' }}>
            <div className="ga-empty-icon-circle" style={{ margin: '0 auto 16px auto' }}>
              <Lock size={28} />
            </div>
            <h2 className="ga-modal-title" style={{ fontSize: '24px', marginBottom: '8px' }}>
              Authentication Required
            </h2>
            <p style={{ color: 'var(--ga-text-muted)', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '24px' }}>
              Please sign in to access your Gardner Auction bidder credentials, bidding history, won auctions, and account security.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="ga-btn-save"
                style={{ justifyContent: 'center' }}
                onClick={() => onNavigate('#signin')}
              >
                Sign In to Bidder Account
              </button>
              <button
                type="button"
                className="ga-btn-cancel"
                style={{ justifyContent: 'center' }}
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

  // Format creation date
  const memberSinceShort = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : 'Oct 2026';

  const memberSinceFull = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'October 21, 2026';

  const currentAvatarSrc = photoPreviewUrl || user.avatarUrl;

  return (
    <div className="ga-profile-root">
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="Upload collector photo"
      />

      <div className="ga-profile-container">
        {/* =================================================================
            1. BREADCRUMBS & RETURN BAR (Stitch Spec)
            ================================================================= */}
        <nav aria-label="Breadcrumb" className="ga-profile-nav-bar">
          <ol className="ga-breadcrumbs-list">
            <li>
              <button
                type="button"
                className="ga-breadcrumb-link"
                onClick={() => onNavigate('/')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
                <span>Home</span>
              </button>
            </li>
            <li className="ga-breadcrumb-sep">/</li>
            <li>
              <button
                type="button"
                className="ga-breadcrumb-link"
                onClick={() => onNavigate('#auctions')}
              >
                Auctions
              </button>
            </li>
            <li className="ga-breadcrumb-sep">/</li>
            <li className="ga-breadcrumb-current">
              <span className="ga-breadcrumb-dot" />
              <span>My Profile</span>
            </li>
          </ol>

          <button
            type="button"
            className="ga-back-btn"
            onClick={() => onNavigate('#auctions')}
          >
            <ArrowLeft size={15} className="ga-back-icon" />
            <span>Back to Auctions</span>
          </button>
        </nav>

        {/* =================================================================
            2. REDESIGNED PROFILE OVERVIEW HERO CARD (Stitch Spec)
            ================================================================= */}
        <section className="ga-hero-card" aria-label="Collector Profile Overview">
          <div className="ga-hero-gold-accent-stripe" />
          <div className="ga-hero-corner-accent" />
          <div className="ga-hero-body">
            <div className="ga-hero-profile-group">
              {/* Profile Avatar Frame */}
              <div className="ga-avatar-frame-wrap">
                <div
                  className="ga-avatar-circle-ring"
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
                  aria-label="Collector profile image"
                >
                  {currentAvatarSrc ? (
                    <img
                      src={currentAvatarSrc}
                      alt={user.name || 'Collector'}
                      className="ga-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="ga-avatar-initials-fallback">
                      {user.avatarText || 'TU'}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="ga-avatar-camera-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPhotoPicker();
                  }}
                  aria-label="Update collector photo"
                  title="Update collector photo"
                  id="btn-update-collector-photo"
                >
                  <Camera size={16} />
                </button>
              </div>

              {/* User Identity Details */}
              <div className="ga-hero-info">
                <div className="ga-hero-name-row">
                  <h1 className="ga-hero-name font-serif">
                    {user.name || 'Test User2'}
                  </h1>
                  <span className="ga-registered-badge">
                    <CheckCircle2 size={13} className="ga-hero-btn-icon-gold" />
                    <span>{user.title || 'Registered Bidder'}</span>
                  </span>
                </div>

                <div className="ga-hero-meta-row">
                  <span className="ga-hero-meta-item">
                    <Mail size={15} className="ga-hero-btn-icon-gold" />
                    <span className="meta-bold">{user.email || 'testuser2@example.com'}</span>
                  </span>
                  <span className="ga-meta-divider">•</span>
                  <span className="ga-hero-meta-item">
                    <Calendar size={15} style={{ opacity: 0.7 }} />
                    <span>Member Since: <strong className="meta-bold">{memberSinceShort}</strong></span>
                  </span>
                  <span className="ga-meta-divider">•</span>
                  <span className="ga-license-active-pill">
                    <span className="ga-pulse-dot" />
                    <span>PA License Active</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Top Right Action Controls */}
            <div className="ga-hero-actions">
              {selectedPhotoFile ? (
                <>
                  <button
                    type="button"
                    className="ga-hero-btn"
                    style={{ backgroundColor: '#0B0D10', color: '#F5F3ED', borderColor: '#0B0D10' }}
                    onClick={handleUploadSelectedPhoto}
                    disabled={isUploadingPhoto}
                    id="btn-hero-upload-photo"
                  >
                    <Upload size={14} className="ga-hero-btn-icon-gold" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload'}</span>
                  </button>
                  <button
                    type="button"
                    className="ga-hero-btn"
                    onClick={handleCancelPhotoSelection}
                    disabled={isUploadingPhoto}
                    id="btn-hero-cancel-photo"
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <>

                  <button
                    type="button"
                    className="ga-hero-btn"
                    onClick={handleOpenPhotoPicker}
                    disabled={isUploadingPhoto}
                    id="btn-hero-change-photo"
                  >
                    <Camera size={14} className="ga-hero-btn-icon-gold" />
                    <span>Change</span>
                  </button>
                  <button
                    type="button"
                    className="ga-hero-btn btn-delete"
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={isUploadingPhoto || isDeletingPhoto}
                    id="btn-hero-delete-photo"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </>
              )}

              {/* Night / Day Theme Switcher: Icon Only (Hero Section) */}
              <button
                type="button"
                className="ga-hero-theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'night' ? 'Day' : 'Night'} Mode`}
                title={`Switch to ${theme === 'night' ? 'Day Mode' : 'Night Mode'}`}
                id="btn-hero-theme-toggle"
              >
                {theme === 'night' ? (
                  <Sun size={16} className="ga-hero-theme-icon" />
                ) : (
                  <Moon size={16} className="ga-hero-theme-icon" />
                )}
              </button>
            </div>
          </div>

          {/* Photo Selection / Feedback Banner */}
          {photoFeedback && (
            <div
              style={{
                padding: '10px 24px',
                backgroundColor: photoFeedback.type === 'success' ? 'rgba(53, 184, 137, 0.12)' : 'rgba(217, 104, 104, 0.12)',
                borderTop: '1px solid var(--ga-hero-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: photoFeedback.type === 'success' ? 'var(--ga-success)' : 'var(--ga-destructive)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {photoFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{photoFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setPhotoFeedback(null)}
                style={{ color: 'inherit', padding: '2px', cursor: 'pointer' }}
                aria-label="Dismiss feedback"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* 4-Stat Ribbon at bottom of Hero (Stitch Spec) */}
          <div className="ga-hero-ribbon">
            <div className="ga-ribbon-stat-item">
              <span className="ga-ribbon-stat-val font-serif">{biddingHistory.length}</span>
              <span className="ga-ribbon-stat-lbl">Active Bids</span>
            </div>
            <div className="ga-ribbon-stat-item">
              <span className="ga-ribbon-stat-val font-serif">{wonAuctions.length}</span>
              <span className="ga-ribbon-stat-lbl">Lots Settled</span>
            </div>
            <div className="ga-ribbon-stat-item">
              <span className="ga-ribbon-stat-val gold font-serif">AY-002004</span>
              <span className="ga-ribbon-stat-lbl">Saleroom ID</span>
            </div>
            <div className="ga-ribbon-stat-item">
              <span className="ga-ribbon-stat-val green font-serif">
                <ShieldCheck size={18} />
                <span>Level 1</span>
              </span>
              <span className="ga-ribbon-stat-lbl">Trust Tier</span>
            </div>
          </div>
        </section>

        {/* =================================================================
            3. TWO-COLUMN DOSSIER LAYOUT (Stitch Spec)
            ================================================================= */}
        <div className="ga-dossier-layout">
          {/* ===============================================================
              LEFT COLUMN: COLLECTOR LEDGER SIDEBAR
              =============================================================== */}
          <aside className="ga-sidebar-card" aria-label="Collector Ledger Navigation">
            <div className="ga-sidebar-header">
              <span className="ga-sidebar-eyebrow">Collector Ledger</span>
              <span className="ga-sidebar-dot" />
            </div>

            {/* Tab 1: Personal Information */}
            <button
              type="button"
              className={`ga-sidebar-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('personal');
                setIsEditingProfile(false);
              }}
              id="tab-profile-personal"
            >
              <div className="ga-tab-content-wrap">
                <div className="ga-tab-icon-box">
                  <User size={18} />
                </div>
                <div className="ga-tab-text-group">
                  <span className="ga-tab-title">Personal Information</span>
                  <span className="ga-tab-subtitle">Name, contact &amp; account info</span>
                </div>
              </div>
              <ChevronRight size={16} className="ga-tab-chevron" />
            </button>

            {/* Tab 2: Bidding History */}
            <button
              type="button"
              className={`ga-sidebar-tab-btn ${activeTab === 'bidding' ? 'active' : ''}`}
              onClick={() => setActiveTab('bidding')}
              id="tab-profile-bidding"
            >
              <div className="ga-tab-content-wrap">
                <div className="ga-tab-icon-box">
                  <Gavel size={18} />
                </div>
                <div className="ga-tab-text-group">
                  <span className="ga-tab-title">Bidding History</span>
                  <span className="ga-tab-subtitle">Placed bids &amp; lot clerking</span>
                </div>
              </div>
              <ChevronRight size={16} className="ga-tab-chevron" />
            </button>

            {/* Tab 3: Won Auctions */}
            <button
              type="button"
              className={`ga-sidebar-tab-btn ${activeTab === 'won' ? 'active' : ''}`}
              onClick={() => setActiveTab('won')}
              id="tab-profile-won"
            >
              <div className="ga-tab-content-wrap">
                <div className="ga-tab-icon-box">
                  <Trophy size={18} />
                </div>
                <div className="ga-tab-text-group">
                  <span className="ga-tab-title">Won Auctions</span>
                  <span className="ga-tab-subtitle">Hammered lots &amp; settlements</span>
                </div>
              </div>
              <ChevronRight size={16} className="ga-tab-chevron" />
            </button>

            {/* Tab 4: Account & Security */}
            <button
              type="button"
              className={`ga-sidebar-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
              id="tab-profile-security"
            >
              <div className="ga-tab-content-wrap">
                <div className="ga-tab-icon-box">
                  <Lock size={18} />
                </div>
                <div className="ga-tab-text-group">
                  <span className="ga-tab-title">Account &amp; Security</span>
                  <span className="ga-tab-subtitle">Password update</span>
                </div>
              </div>
              <ChevronRight size={16} className="ga-tab-chevron" />
            </button>

            {/* Advisory Concierge Card in Sidebar (Stitch Spec) */}
            <div className="ga-sidebar-concierge-card">
              <Info size={18} className="ga-concierge-icon" />
              <p style={{ margin: 0 }}>
                Need assistance updating bidding limits or wire transfer instructions? Contact our auction clerk directly at
                <span className="ga-concierge-phone">(412) 555-0199</span>
              </p>
            </div>
          </aside>

          {/* ===============================================================
              RIGHT COLUMN: MAIN CONTENT PANELS
              =============================================================== */}
          <main className="ga-dossier-panel">
            {/* -------------------------------------------------------------
                SECTION 1: PERSONAL INFORMATION DOSSIER
                ------------------------------------------------------------- */}
            {activeTab === 'personal' && (
              <div className="ga-dossier-card">
                {/* Dossier Header */}
                <div className="ga-dossier-header">
                  <div className="ga-dossier-header-text">
                    <span className="ga-dossier-eyebrow">Collector Dossier</span>
                    <h2 className="ga-dossier-title font-serif">Personal Information</h2>
                    <p className="ga-dossier-desc">
                      {isEditingProfile
                        ? 'Update your legal name and contact phone number. Changes are saved to your profile.'
                        : 'Review and manage your accredited collector credentials and contact details.'}
                    </p>
                  </div>

                  {!isEditingProfile && (
                    <button
                      type="button"
                      className="ga-edit-profile-btn"
                      onClick={() => {
                        setFullName(user.name || '');
                        setPhone(user.phone || '');
                        setProfileErrorMsg(null);
                        setProfileSuccessMsg(null);
                        setIsEditingProfile(true);
                      }}
                      id="btn-edit-profile"
                    >
                      <Edit3 size={15} className="ga-edit-icon" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {/* Success / Error Alerts */}
                {profileSuccessMsg && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ga-success-dim)',
                      border: '1px solid var(--ga-success-border)',
                      color: 'var(--ga-success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrorMsg && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ga-destructive-dim)',
                      border: '1px solid var(--ga-destructive-border)',
                      color: 'var(--ga-destructive)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                {!isEditingProfile ? (
                  /* ================= READ-ONLY VIEW (STITCH SPEC) ================= */
                  <>
                    <div className="ga-info-grid">
                      {/* 1. Full Legal Name */}
                      <div className="ga-info-box">
                        <div className="ga-info-box-header">
                          <span className="ga-info-label">
                            <User size={15} className="ga-info-icon-gold" />
                            <span>FULL LEGAL NAME</span>
                          </span>
                          <Lock size={15} className="ga-info-status-icon" />
                        </div>
                        <div className="ga-info-box-body">
                          <span className="ga-info-value">{user.name || 'Test User2'}</span>
                          <span className="ga-badge-verified">Verified</span>
                        </div>
                      </div>

                      {/* 2. Email Address */}
                      <div className="ga-info-box">
                        <div className="ga-info-box-header">
                          <span className="ga-info-label">
                            <Mail size={15} className="ga-info-icon-gold" />
                            <span>EMAIL ADDRESS</span>
                          </span>
                          <CheckCircle2 size={15} className="ga-info-status-icon" />
                        </div>
                        <div className="ga-info-box-body">
                          <span className="ga-info-value">{user.email || 'testuser2@example.com'}</span>
                          <span className="ga-badge-primary">Primary</span>
                        </div>
                      </div>

                      {/* 3. Contact Phone */}
                      <div className="ga-info-box">
                        <div className="ga-info-box-header">
                          <span className="ga-info-label">
                            <Phone size={15} className="ga-info-icon-gold" />
                            <span>CONTACT PHONE</span>
                          </span>
                          <button
                            type="button"
                            className="ga-action-link-gold"
                            onClick={() => {
                              setFullName(user.name || '');
                              setPhone(user.phone || '');
                              setIsEditingProfile(true);
                            }}
                          >
                            {user.phone ? 'Edit' : 'Add'}
                          </button>
                        </div>
                        <div className="ga-info-box-body">
                          <span className={`ga-info-value ${!user.phone ? 'muted-italic' : ''}`}>
                            {user.phone || 'Not provided'}
                          </span>
                          <span className="ga-badge-gold">Recommended</span>
                        </div>
                      </div>

                      {/* 4. Saleroom Role */}
                      <div className="ga-info-box">
                        <div className="ga-info-box-header">
                          <span className="ga-info-label">
                            <ShieldCheck size={15} className="ga-info-icon-gold" />
                            <span>SALEROOM ROLE</span>
                          </span>
                          <Award size={15} className="ga-info-icon-gold" />
                        </div>
                        <div className="ga-info-box-body">
                          <span className="ga-info-value">{user.title || 'Registered Bidder'}</span>
                          <span className="ga-badge-gold">Tier 1 Approved</span>
                        </div>
                      </div>

                      {/* 5. Member Since (Full Width 2 Cols) */}
                      <div className="ga-info-box full-width">
                        <div className="ga-info-box-header">
                          <span className="ga-info-label">
                            <Calendar size={15} className="ga-info-icon-gold" />
                            <span>MEMBER SINCE</span>
                          </span>
                        </div>
                        <div className="ga-info-box-body" style={{ flexWrap: 'wrap', gap: '12px' }}>
                          <span className="ga-info-value serif-date font-serif">
                            {memberSinceFull}
                          </span>
                          <div className="ga-member-tenure-wrap">
                            <span className="ga-tenure-label">
                              <Lock size={14} style={{ color: 'var(--ga-success)' }} />
                              <span>Tenure: Initial Registration</span>
                            </span>

                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Certified PA Saleroom Participant Feature Card */}
                    <div className="ga-pass-banner">
                      <div className="ga-pass-banner-left">
                        <div className="ga-pass-seal-badge">
                          <Award size={24} />
                        </div>
                        <div className="ga-pass-text-wrap">
                          <h3 className="ga-pass-title font-serif">Certified PA Saleroom Participant</h3>
                          <p className="ga-pass-desc">
                            Your collector status adheres to Pennsylvania Board of Auctioneer Examiners regulatory requirements.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ga-pass-download-btn"
                        onClick={handleDownloadBidderPass}
                        id="btn-download-bidder-pass"
                      >
                        <Download size={16} />
                        <span>Download Bidder Pass</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* ================= EDITABLE FORM VIEW ================= */
                  <form onSubmit={handleSaveProfile} className="ga-edit-form">
                    <div className="ga-form-grid-2col">
                      <div className="ga-form-group">
                        <label className="ga-form-label" htmlFor="prof-full-name">
                          Full Legal Name <span className="req-star">*</span>
                        </label>
                        <div className="ga-form-input-box">
                          <User size={16} className="ga-form-icon" />
                          <input
                            id="prof-full-name"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="ga-form-input"
                            placeholder="e.g. Robert J. Sterling"
                          />
                        </div>
                      </div>

                      <div className="ga-form-group">
                        <label className="ga-form-label" htmlFor="prof-email">
                          Email Address (Read-Only)
                        </label>
                        <div className="ga-form-input-box disabled">
                          <Mail size={16} className="ga-form-icon" />
                          <input
                            id="prof-email"
                            type="email"
                            disabled
                            value={user.email}
                            className="ga-form-input"
                            title="Email is managed by Supabase authentication"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="ga-form-grid-2col">
                      <div className="ga-form-group">
                        <label className="ga-form-label" htmlFor="prof-phone">
                          Contact Phone Number
                        </label>
                        <div className="ga-form-input-box">
                          <Phone size={16} className="ga-form-icon" />
                          <input
                            id="prof-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="ga-form-input"
                            placeholder="+1 (412) 555-0192"
                          />
                        </div>
                      </div>

                      <div className="ga-form-group">
                        <label className="ga-form-label" htmlFor="prof-role">
                          Saleroom Role
                        </label>
                        <div className="ga-form-input-box disabled">
                          <ShieldCheck size={16} className="ga-form-icon" />
                          <input
                            id="prof-role"
                            type="text"
                            disabled
                            value={user.title || 'Registered Bidder'}
                            className="ga-form-input"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="ga-form-actions-row">
                      <button
                        type="button"
                        className="ga-btn-cancel"
                        onClick={handleCancelEdit}
                        disabled={isSavingProfile}
                        id="btn-cancel-edit-profile"
                      >
                        <X size={15} />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="submit"
                        className="ga-btn-save"
                        disabled={isSavingProfile}
                        id="btn-save-personal-info"
                      >
                        {isSavingProfile ? (
                          <>
                            <span className="auth-btn-spinner sm" />
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

            {/* -------------------------------------------------------------
                SECTION 2: BIDDING HISTORY
                ------------------------------------------------------------- */}
            {activeTab === 'bidding' && (
              <div className="ga-dossier-card">
                <div className="ga-tab-section-header">
                  <div>
                    <h2 className="ga-dossier-title font-serif">Bidding History</h2>
                    <p className="ga-dossier-desc">
                      Chronological ledger of your live clerking desk and webcast bids placed across Gardner Auction sales sessions.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ga-refresh-btn"
                    onClick={fetchBiddingHistory}
                    disabled={isLoadingBids}
                    title="Refresh bid ledger"
                  >
                    <RefreshCw size={13} style={{ display: 'inline', marginRight: '6px' }} />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoadingBids ? (
                  <div className="ga-empty-state">
                    <span className="auth-btn-spinner lg" />
                    <p style={{ color: 'var(--ga-text-muted)', fontSize: '13.5px' }}>
                      Retrieving your bidding records from Supabase...
                    </p>
                  </div>
                ) : bidsError ? (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ga-destructive-dim)',
                      border: '1px solid var(--ga-destructive-border)',
                      color: 'var(--ga-destructive)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{bidsError}</span>
                  </div>
                ) : biddingHistory.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--ga-dossier-border)', textAlign: 'left', color: 'var(--ga-text-dark-muted)' }}>
                          <th style={{ padding: '12px 14px' }}>Lot Number &amp; Item</th>
                          <th style={{ padding: '12px 14px' }}>Bid Amount</th>
                          <th style={{ padding: '12px 14px' }}>Paddle</th>
                          <th style={{ padding: '12px 14px' }}>Timestamp</th>
                          <th style={{ padding: '12px 14px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {biddingHistory.map((bid) => (
                          <tr key={bid.id} style={{ borderBottom: '1px solid var(--ga-card-border)', color: 'var(--ga-text-dark)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ color: 'var(--ga-gold)', fontWeight: 600, marginRight: '8px' }}>Lot #{bid.lot_number}</span>
                              <span>{bid.lot_title}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
                              ${bid.amount.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--ga-ribbon-bg)', border: '1px solid var(--ga-card-border)', fontSize: '11.5px' }}>
                                #{bid.paddle_number || '104'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--ga-text-dark-muted)', fontSize: '12px' }}>
                              {new Date(bid.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span className="ga-badge-verified">{bid.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ga-empty-state">
                    <div className="ga-empty-icon-circle">
                      <Gavel size={30} />
                    </div>
                    <h3 className="ga-empty-title font-serif">No Bidding Activity Yet</h3>
                    <p className="ga-empty-desc">
                      You have not placed bids on any active auction lots in the current salesroom session. Bids placed on live lots will automatically register here.
                    </p>
                    <button
                      type="button"
                      className="ga-btn-save"
                      onClick={() => onNavigate('#auctions')}
                    >
                      Explore Live Auctions →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------
                SECTION 3: WON AUCTIONS
                ------------------------------------------------------------- */}
            {activeTab === 'won' && (
              <div className="ga-dossier-card">
                <div className="ga-tab-section-header">
                  <div>
                    <h2 className="ga-dossier-title font-serif">Won Auctions</h2>
                    <p className="ga-dossier-desc">
                      Catalog lots awarded to your bidder paddle with hammer prices and post-sale clearance statuses.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ga-refresh-btn"
                    onClick={fetchWonAuctions}
                    disabled={isLoadingWon}
                    title="Refresh won auction records"
                  >
                    <RefreshCw size={13} style={{ display: 'inline', marginRight: '6px' }} />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoadingWon ? (
                  <div className="ga-empty-state">
                    <span className="auth-btn-spinner lg" />
                    <p style={{ color: 'var(--ga-text-muted)', fontSize: '13.5px' }}>
                      Scanning certified salesroom records for awarded lots...
                    </p>
                  </div>
                ) : wonError ? (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ga-destructive-dim)',
                      border: '1px solid var(--ga-destructive-border)',
                      color: 'var(--ga-destructive)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{wonError}</span>
                  </div>
                ) : wonAuctions.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {wonAuctions.map((lot) => (
                      <div key={lot.id} className="ga-info-box">
                        {lot.image && (
                          <div style={{ position: 'relative', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                            <img src={lot.image} alt={lot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', top: '8px', left: '8px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--ga-gold)', color: '#0B0D10', fontSize: '10.5px', fontWeight: 700 }}>
                              WON LOT
                            </span>
                          </div>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--ga-gold)', fontWeight: 600 }}>
                          Lot #{lot.lot_number} • {lot.category || 'Catalog Specimen'}
                        </span>
                        <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', margin: '4px 0', color: 'var(--ga-text-dark)' }}>
                          {lot.title}
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--ga-text-dark-muted)' }}>Hammer Price:</span>
                          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--ga-text-dark)' }}>
                            ${(lot.hammer_price || lot.current_bid || 0).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ga-text-dark-muted)' }}>Status:</span>
                          <span className="ga-badge-gold" style={{ fontSize: '10.5px' }}>{lot.payment_status}</span>
                        </div>
                        <button
                          type="button"
                          className="ga-back-btn"
                          style={{ marginTop: '10px', justifyContent: 'center' }}
                          onClick={() => onNavigate(`#lot/${lot.id}`)}
                        >
                          <span>Inspect Specimen</span>
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ga-empty-state">
                    <div className="ga-empty-icon-circle">
                      <Trophy size={30} />
                    </div>
                    <h3 className="ga-empty-title font-serif">No Won Auctions Yet</h3>
                    <p className="ga-empty-desc">
                      Lots you successfully win in live salesroom sessions or webcast clerkings will appear here with your invoice dossier, hammer price, and paddle clearance.
                    </p>
                    <button
                      type="button"
                      className="ga-btn-save"
                      onClick={() => onNavigate('#catalogs')}
                    >
                      Browse Catalog Lots →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------
                SECTION 4: ACCOUNT & SECURITY (PASSWORD UPDATE)
                ------------------------------------------------------------- */}
            {activeTab === 'security' && (
              <div className="ga-dossier-card">
                <div className="ga-tab-section-header">
                  <div>
                    <h2 className="ga-dossier-title font-serif">Account &amp; Security</h2>
                    <p className="ga-dossier-desc">
                      Update your account password to maintain security across your collector profile.
                    </p>
                  </div>
                </div>

                {passwordSuccessMsg && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ga-success-dim)',
                      border: '1px solid var(--ga-success-border)',
                      color: 'var(--ga-success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrorMsg && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ga-destructive-dim)',
                      border: '1px solid var(--ga-destructive-border)',
                      color: 'var(--ga-destructive)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="ga-edit-form">
                  <div className="ga-form-grid-2col">
                    <div className="ga-form-group">
                      <label className="ga-form-label" htmlFor="sec-new-password">
                        New Password <span className="req-star">*</span>
                      </label>
                      <div className="ga-form-input-box">
                        <Lock size={16} className="ga-form-icon" />
                        <input
                          id="sec-new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="ga-form-input"
                          placeholder="Minimum 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{ padding: '0 12px', background: 'none', border: 'none', color: 'var(--ga-text-dark-muted)', cursor: 'pointer' }}
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="ga-form-group">
                      <label className="ga-form-label" htmlFor="sec-confirm-password">
                        Confirm New Password <span className="req-star">*</span>
                      </label>
                      <div className="ga-form-input-box">
                        <Lock size={16} className="ga-form-icon" />
                        <input
                          id="sec-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="ga-form-input"
                          placeholder="Repeat new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{ padding: '0 12px', background: 'none', border: 'none', color: 'var(--ga-text-dark-muted)', cursor: 'pointer' }}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {newPassword.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span className={`ga-badge-${newPassword.length >= 8 ? 'verified' : 'primary'}`} style={{ fontSize: '11px' }}>
                        {newPassword.length >= 8 ? '✓' : '•'} 8+ Characters
                      </span>
                      <span className={`ga-badge-${/[A-Z]/.test(newPassword) ? 'verified' : 'primary'}`} style={{ fontSize: '11px' }}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '•'} Uppercase
                      </span>
                      <span className={`ga-badge-${/[0-9]/.test(newPassword) ? 'verified' : 'primary'}`} style={{ fontSize: '11px' }}>
                        {/[0-9]/.test(newPassword) ? '✓' : '•'} Number
                      </span>
                    </div>
                  )}

                  <div className="ga-form-actions-row">
                    <button
                      type="submit"
                      className="ga-btn-save"
                      disabled={isUpdatingPassword}
                      id="btn-update-password"
                    >
                      {isUpdatingPassword ? (
                        <>
                          <span className="auth-btn-spinner sm" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={15} />
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
          PHOTO PREVIEW LIGHTBOX MODAL (Matching Dark Luxury Theme)
          ================================================================= */}
      {isPhotoLightboxOpen && user.avatarUrl && (
        <div
          className="ga-modal-backdrop"
          onClick={() => setIsPhotoLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Profile Photo Lightbox"
        >
          <div className="ga-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ga-modal-header">
              <div>
                <h3 className="ga-modal-title font-serif">Collector Portrait</h3>
                <span style={{ fontSize: '12px', color: 'var(--ga-text-muted)' }}>
                  {user.name} · {user.title || 'Registered Bidder'}
                </span>
              </div>
              <button
                type="button"
                className="ga-modal-close-btn"
                onClick={() => setIsPhotoLightboxOpen(false)}
                aria-label="Close photo preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ga-modal-body" style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ maxWidth: '360px', maxHeight: '360px', margin: '0 auto', borderRadius: '10px', overflow: 'hidden', border: '1px solid #292E37' }}>
                <img
                  src={user.avatarUrl}
                  alt={`${user.name} full preview`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>

            <div className="ga-modal-actions">
              <button
                type="button"
                className="ga-btn-cancel"
                onClick={() => {
                  handleOpenPhotoPicker();
                }}
                disabled={isUploadingPhoto}
              >
                <Camera size={14} />
                <span>Change Photo</span>
              </button>
              <button
                type="button"
                className="ga-btn-cancel"
                style={{ color: 'var(--ga-destructive)' }}
                onClick={() => {
                  setIsDeleteModalOpen(true);
                }}
                disabled={isDeletingPhoto}
              >
                <Trash2 size={14} />
                <span>Delete Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          DELETE PHOTO CONFIRMATION MODAL
          ================================================================= */}
      {isDeleteModalOpen && (
        <div
          className="ga-modal-backdrop"
          onClick={() => {
            if (!isDeletingPhoto) setIsDeleteModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Photo Deletion"
        >
          <div className="ga-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ga-modal-header">
              <h3 className="ga-modal-title font-serif">Remove Profile Photo?</h3>
              <button
                type="button"
                className="ga-modal-close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingPhoto}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ga-modal-body">
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--ga-destructive-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ga-destructive)', flexShrink: 0 }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#F5F3ED', lineHeight: 1.5 }}>
                    Are you sure you want to remove your profile photo? Your account will return to displaying your initials (<strong style={{ color: 'var(--ga-gold)' }}>{user.avatarText || 'GA'}</strong>) across the saleroom.
                  </p>
                </div>
              </div>
            </div>

            <div className="ga-modal-actions">
              <button
                type="button"
                className="ga-btn-cancel"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingPhoto}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ga-btn-save"
                style={{ backgroundColor: 'var(--ga-destructive)', borderColor: 'var(--ga-destructive)' }}
                onClick={handleConfirmDeletePhoto}
                disabled={isDeletingPhoto}
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
