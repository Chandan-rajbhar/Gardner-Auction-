import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  AuctionDetailProvider, 
  useAuctionDetail 
} from '../../context/AuctionDetailContext';
import { 
  StageType,
  PreAuctionSubTab 
} from '../../types/auctionDetail';
import { PreAuctionTab } from './tabs/PreAuctionTab';
import { ConfirmModal } from '../Common/ConfirmModal';
import { LotItem } from '../../types';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  AlertTriangle,
  Eye,
  Check,
  MoreHorizontal,
  Radio,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { auctionService } from '../../services/auctionService';
import { validateAuctionPublishReadiness } from '../../utils/publishValidation';
import './AuctionDetailsStyles.css';

interface AuctionDetailViewProps {
  auctionId: string;
  initialStage?: StageType;
  initialSubTab?: string;
  onReturnToList: () => void;
  onNavigateReports?: () => void;
  onNavigateClerking?: () => void;
  lots: LotItem[];
  onAddLot: (lot: LotItem) => void;
  onUpdateLot: (lot: LotItem) => void;
  onSendToBlock: (lot: LotItem) => void;
  onDeleteLot: (id: string) => Promise<any>;
}

const AuctionDetailContent: React.FC<{
  onReturnToList: () => void;
  onNavigateReports?: () => void;
  onNavigateClerking?: () => void;
  initialStage?: StageType;
  initialSubTab?: string;
  lots: LotItem[];
  onAddLot: (lot: LotItem) => void;
  onUpdateLot: (lot: LotItem) => void;
  onSendToBlock: (lot: LotItem) => void;
  onDeleteLot: (id: string) => Promise<any>;
}> = ({
  onReturnToList,
  initialStage = 'pre-auction',
  initialSubTab,
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock,
  onDeleteLot
}) => {
  const { state, saveAuction, isLoading, dispatch } = useAuctionDetail();
  const { showToast } = useToast();
  const { user } = useAuth();
  const auction = state.data;

  const [preAuctionSubTab, setPreAuctionSubTab] = useState<PreAuctionSubTab>(
    (initialSubTab as PreAuctionSubTab) || 'details'
  );

  // Modals & Async States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  // Handle Return to All Auctions with unsaved changes check
  const handleReturnClick = () => {
    if (state.isDirty) {
      setIsLeaveModalOpen(true);
    } else {
      onReturnToList();
    }
  };

  // Save handler (saves draft regardless of completion)
  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveAuction();
    setIsSaving(false);
    if (success) {
      showToast('success', 'Saved Draft', 'Auction draft saved to database successfully!');
    }
  };

  const isPublished = auction?.status === 'In Progress';

  // Filtered lots for this specific auction
  const filteredAuctionLots = lots.filter(l => l.auctionId === auction?.id);
  const expensesTotal = (auction?.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  // Centralized Publish Readiness Validation Calculation
  const readiness = useMemo(() => {
    return validateAuctionPublishReadiness(auction, filteredAuctionLots, state.isDirty);
  }, [auction, filteredAuctionLots, state.isDirty]);

  // Publish Live handler: validates against server-side data, persists to Supabase, updates status
  const handlePublishLive = async () => {
    if (!auction) return;
    if (isPublishing || isSaving) return; // Prevent duplicate requests

    // 1. If currently Published Live, allow reverting to Open / Draft
    if (isPublished) {
      setIsPublishing(true);
      try {
        const res = await auctionService.unpublishAuction(auction.id, user?.role);
        if (res.success) {
          dispatch({ type: 'UPDATE_FIELD', field: 'status', value: 'Open' });
          showToast('info', 'Status Updated', `Auction reverted to Draft / Open state.`);
        } else {
          showToast('error', 'Status Update Error', res.error || 'Failed to revert live status.');
        }
      } catch (err) {
        showToast('error', 'Error', 'Failed to update live status in Supabase.');
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    // 2. Publishing Live: Check validation rules
    if (!readiness.canPublish) {
      showToast('warning', 'Incomplete Configuration', readiness.allErrors[0] || 'Please complete all required fields before publishing live.');
      setShowValidationModal(true);
      return;
    }

    // 3. If there are unsaved draft edits, persist them to Supabase first
    if (state.isDirty) {
      setIsSaving(true);
      const saveOk = await saveAuction();
      setIsSaving(false);
      if (!saveOk) {
        showToast('error', 'Save Failed', 'Could not save latest draft changes before publishing. Please resolve errors.');
        return;
      }
    }

    // 4. Run server-side verified publication
    setIsPublishing(true);
    try {
      const res = await auctionService.publishAuctionLive(auction.id, user?.role);
      if (res.success) {
        dispatch({ type: 'UPDATE_FIELD', field: 'status', value: 'In Progress' });
        showToast('success', 'Published Live!', `"${auction.name}" is now live on the public catalog!`);
      } else {
        showToast('error', 'Publication Blocked', res.error || 'Server validation failed.');
        if (res.errors && res.errors.length > 0) {
          setShowValidationModal(true);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to publish auction';
      showToast('error', 'Publish Error', msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete Auction handler
  const handleDeleteAuction = async () => {
    if (!auction) return;
    setIsDeleting(true);
    try {
      await auctionService.deleteAuction(auction.id);
      showToast('info', 'Deleted', `Auction "${auction.name}" deleted.`);
      setIsDeleteModalOpen(false);
      onReturnToList();
    } catch (e) {
      showToast('error', 'Error', 'Failed to delete auction');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !auction) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-muted)' }}>
        Loading auction details...
      </div>
    );
  }

  // Exact required tab ordering: Details -> Upload Settings -> Lots -> Lot Images -> Expenses -> Preview
  const subTabs: { 
    key: PreAuctionSubTab; 
    label: string; 
    badge?: string | number; 
    badgeType?: 'neutral' | 'green' | 'amber';
    isComplete?: boolean;
    errorCount?: number;
  }[] = [
    { 
      key: 'details', 
      label: 'Details',
      isComplete: readiness.sections.details.isComplete,
      errorCount: readiness.sections.details.errors.length
    },
    { 
      key: 'upload-settings', 
      label: 'Upload Settings',
      isComplete: readiness.sections.uploadSettings.isComplete,
      errorCount: readiness.sections.uploadSettings.errors.length
    },
    { 
      key: 'lots', 
      label: 'Lots', 
      badge: filteredAuctionLots.length, 
      badgeType: filteredAuctionLots.length === 0 ? 'amber' : 'neutral',
      isComplete: readiness.sections.lots.isComplete,
      errorCount: readiness.sections.lots.errors.length
    },
    { 
      key: 'lot-images', 
      label: 'Lot Images',
      isComplete: true
    },
    { 
      key: 'expenses', 
      label: 'Expenses', 
      badge: `$${expensesTotal.toLocaleString()}`, 
      badgeType: 'green',
      isComplete: true
    },
    { 
      key: 'preview', 
      label: 'Preview',
      badge: readiness.canPublish ? 'Ready' : undefined,
      badgeType: 'green',
      isComplete: readiness.canPublish
    }
  ];

  return (
    <div className="auction-details-page-root" style={{ paddingBottom: state.isDirty ? 80 : 20 }}>
      {/* Top Header Bar: Tabs & Action Buttons */}
      <div className="auction-top-action-bar">
        {/* Left Side: Sub-tabs in strict workflow order with completion/warning indicators */}
        <div className="auction-subtabs-btn-group">
          {subTabs.map(tab => {
            const isActive = preAuctionSubTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPreAuctionSubTab(tab.key)}
                className={`btn-screenshot-tab ${isActive ? 'active' : ''}`}
                title={tab.errorCount && tab.errorCount > 0 ? `${tab.errorCount} missing requirement(s)` : tab.label}
              >
                {isActive && <span className="image2-subtab-dot" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`image2-tab-badge ${tab.badgeType === 'green' ? 'green' : tab.badgeType === 'amber' ? 'amber' : 'neutral'}`}>
                    {tab.badge}
                  </span>
                )}
                {tab.errorCount !== undefined && tab.errorCount > 0 && !isActive && (
                  <span 
                    className="tab-warning-dot" 
                    title={`${tab.errorCount} missing requirement(s)`} 
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side: Action Controls (Preview Catalog, Save Draft, Publish Live + More Dropdown) */}
        <div className="auction-top-actions">
          <button
            type="button"
            className="btn-screenshot-white"
            onClick={() => setPreAuctionSubTab('preview')}
            title="Preview Catalog & Validation Status"
          >
            <Eye size={14} color="#64748b" />
            <span>Preview Catalog</span>
          </button>

          <button
            type="button"
            className="btn-screenshot-white"
            onClick={handleSave}
            disabled={isSaving || isPublishing}
            title="Save changes as incomplete draft"
          >
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {/* Publish Live Button with Validation Protection & Feedback */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn-screenshot-publish ${isPublished ? 'published' : readiness.canPublish ? 'ready' : 'draft disabled'}`}
              onClick={handlePublishLive}
              disabled={isSaving || isPublishing || (!isPublished && !readiness.canPublish)}
              title={
                isPublished 
                  ? 'Auction is Live (Click to switch back to Draft / Open)' 
                  : readiness.canPublish 
                    ? 'Publish Live to Public Website Catalog' 
                    : `Cannot Publish: ${readiness.allErrors[0] || 'Required information incomplete'}`
              }
            >
              {isPublishing ? (
                <Loader2 size={14} className="spin-animation" color="#ffffff" />
              ) : isPublished ? (
                <Check size={14} strokeWidth={2.8} color="#10b981" />
              ) : (
                <Radio size={14} color={readiness.canPublish ? '#38bdf8' : '#94a3b8'} />
              )}
              <span>
                {isPublishing 
                  ? 'Publishing...' 
                  : isSaving 
                    ? 'Saving...' 
                    : isPublished 
                      ? 'Published Live' 
                      : 'Publish Live'}
              </span>
            </button>

            {/* Incomplete Warning Trigger */}
            {!isPublished && !readiness.canPublish && (
              <button
                type="button"
                onClick={() => setShowValidationModal(true)}
                title="View requirements needed before publishing"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#f59e0b'
                }}
              >
                <AlertCircle size={15} />
              </button>
            )}
          </div>

          {/* More actions dropdown (Delete Auction, Return to List) */}
          <div className="auction-more-menu-wrapper" ref={moreMenuRef}>
            <button
              type="button"
              className="btn-screenshot-more"
              onClick={() => setShowMoreMenu(prev => !prev)}
              title="More Actions"
            >
              <MoreHorizontal size={15} color="#64748b" />
            </button>

            {showMoreMenu && (
              <div className="auction-dropdown-menu">
                <button
                  type="button"
                  className="auction-dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleReturnClick();
                  }}
                >
                  <ArrowLeft size={14} color="#64748b" />
                  <span>Return to Auctions</span>
                </button>
                <button
                  type="button"
                  className="auction-dropdown-item destructive"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  <Trash2 size={14} color="#dc2626" />
                  <span>Delete Auction</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pre-Auction View (hideSubtabs={true} because subtabs are in top action bar) */}
      <PreAuctionTab
        currentTab={preAuctionSubTab}
        onSelectTab={setPreAuctionSubTab}
        lots={lots}
        onAddLot={onAddLot}
        onUpdateLot={onUpdateLot}
        onSendToBlock={onSendToBlock}
        onDeleteLot={onDeleteLot}
        hideSubtabs={true}
      />

      {/* Sticky Bottom Save Bar when there are unsaved changes */}
      {state.isDirty && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-sidebar)',
          color: '#ffffff',
          padding: '14px 24px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 80
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="var(--gold-primary)" />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              You have unsaved changes to this auction configuration.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReturnClick}
              style={{ background: 'transparent', color: '#cbd5e1', borderColor: '#475569' }}
            >
              Discard Changes
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleSave}
              disabled={isSaving || isPublishing}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Auction Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Auction Event"
        message={`Are you sure you want to permanently delete "${auction.name}"? This action cannot be reversed.`}
        confirmLabel="Delete Auction"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteAuction}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Unsaved Changes Leave Confirmation Modal */}
      <ConfirmModal
        isOpen={isLeaveModalOpen}
        title="Unsaved Changes Warning"
        message="You have unsaved changes that will be lost if you leave this page. Do you want to discard your changes?"
        confirmLabel="Discard & Leave"
        cancelLabel="Keep Editing"
        isDestructive={true}
        onConfirm={() => {
          setIsLeaveModalOpen(false);
          onReturnToList();
        }}
        onCancel={() => setIsLeaveModalOpen(false)}
      />

      {/* Publish Readiness Validation Checklist Modal */}
      {showValidationModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
          onClick={() => setShowValidationModal(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: 540,
              maxWidth: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: readiness.canPublish ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: readiness.canPublish ? '#10b981' : '#d97706'
                }}>
                  {readiness.canPublish ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Publish Readiness Checklist
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                    {readiness.canPublish 
                      ? 'All mandatory requirements complete. Ready to publish live.' 
                      : `${readiness.allErrors.length} required step${readiness.allErrors.length === 1 ? '' : 's'} need attention.`}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowValidationModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Checklist Items */}
            <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 1. Details Section */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                background: readiness.sections.details.isComplete ? '#f8fafc' : '#fffbeb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {readiness.sections.details.isComplete ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#d97706" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>1. Auction Details</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowValidationModal(false);
                      setPreAuctionSubTab('details');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold-primary, #b48324)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Go to Details &rarr;
                  </button>
                </div>
                {readiness.sections.details.errors.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 22, fontSize: 12, color: '#b45309' }}>
                    {readiness.sections.details.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 2. Upload Settings Section */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                background: readiness.sections.uploadSettings.isComplete ? '#f8fafc' : '#fffbeb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {readiness.sections.uploadSettings.isComplete ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#d97706" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>2. Upload Settings</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowValidationModal(false);
                      setPreAuctionSubTab('upload-settings');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold-primary, #b48324)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Go to Upload Settings &rarr;
                  </button>
                </div>
                {readiness.sections.uploadSettings.errors.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 22, fontSize: 12, color: '#b45309' }}>
                    {readiness.sections.uploadSettings.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 3. Lots Section */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                background: readiness.sections.lots.isComplete ? '#f8fafc' : '#fffbeb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {readiness.sections.lots.isComplete ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#d97706" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      3. Lots Catalog ({filteredAuctionLots.length} lot{filteredAuctionLots.length === 1 ? '' : 's'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowValidationModal(false);
                      setPreAuctionSubTab('lots');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold-primary, #b48324)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Manage Lots &rarr;
                  </button>
                </div>
                {readiness.sections.lots.errors.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 22, fontSize: 12, color: '#b45309' }}>
                    {readiness.sections.lots.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 4. Lot Images (Optional) */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      4. Lot Images (Optional)
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {auction.featuredImages?.length || 0} Featured
                  </span>
                </div>
              </div>

              {/* 5. Expenses (Optional) */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      5. Expenses (Optional)
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    ${expensesTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 6. Saved State */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                background: readiness.sections.saved.isComplete ? '#f8fafc' : '#fffbeb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {readiness.sections.saved.isComplete ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#d97706" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      6. Database Persistence
                    </span>
                  </div>
                  {state.isDirty && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleSave();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--gold-primary, #b48324)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Save Draft Now &rarr;
                    </button>
                  )}
                </div>
                {readiness.sections.saved.errors.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 22, fontSize: 12, color: '#b45309' }}>
                    {readiness.sections.saved.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              background: '#f8fafc',
              gap: 10
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowValidationModal(false)}
                style={{ padding: '6px 14px', fontSize: 12.5 }}
              >
                Close
              </button>
              {readiness.canPublish && !isPublished && (
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => {
                    setShowValidationModal(false);
                    handlePublishLive();
                  }}
                  disabled={isPublishing}
                  style={{ padding: '6px 16px', fontSize: 12.5 }}
                >
                  Publish Live Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AuctionDetailView: React.FC<AuctionDetailViewProps> = (props) => {
  const { showToast } = useToast();

  return (
    <AuctionDetailProvider
      auctionId={props.auctionId}
      onSavedSuccess={() => showToast('success', 'Saved', 'Auction saved successfully!')}
      onSavedError={(err) => showToast('error', 'Error', err)}
    >
      <AuctionDetailContent {...props} />
    </AuctionDetailProvider>
  );
};
