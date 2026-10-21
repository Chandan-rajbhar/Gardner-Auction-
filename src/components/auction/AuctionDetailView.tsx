import React, { useState, useEffect, useRef } from 'react';
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
  FileText, 
  Trash2, 
  AlertTriangle,
  Eye,
  Check,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { auctionService } from '../../services/auctionService';
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
  onNavigateReports,
  onNavigateClerking,
  initialStage = 'pre-auction',
  initialSubTab,
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock,
  onDeleteLot
}) => {
  const { state, saveAuction, isLoading } = useAuctionDetail();
  const { showToast } = useToast();
  const auction = state.data;

  const [preAuctionSubTab, setPreAuctionSubTab] = useState<PreAuctionSubTab>(
    (initialSubTab as PreAuctionSubTab) || 'details'
  );

  // Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveAuction();
    setIsSaving(false);
    if (success) {
      showToast('success', 'Saved', 'Auction configuration saved successfully!');
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

  // Filtered lots & expenses total for tab badges
  const filteredAuctionLots = lots.filter(l => 
    !l.auctionId || l.auctionId === auction.id || ['lot-ref-1', 'lot-ref-2', 'lot-ref-3', 'lot-ref-4', 'lot-ref-6'].includes(l.id)
  );
  const expensesTotal = (auction.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  const subTabs: { key: PreAuctionSubTab; label: string; badge?: string | number; badgeType?: 'neutral' | 'green' }[] = [
    { key: 'details', label: 'Details' },
    { key: 'upload-settings', label: 'Upload Settings' },
    { key: 'preview', label: 'Preview' },
    { key: 'lots', label: 'Lots', badge: filteredAuctionLots.length, badgeType: 'neutral' },
    { key: 'lot-images', label: 'Lot Images' },
    { 
      key: 'expenses', 
      label: 'Expenses', 
      badge: `$${expensesTotal.toLocaleString()}`, 
      badgeType: 'green' 
    }
  ];

  return (
    <div className="auction-details-page-root" style={{ paddingBottom: state.isDirty ? 80 : 20 }}>
      {/* Top Header Bar: All buttons (subtabs and actions) aligned in the SAME line */}
      <div className="auction-top-action-bar">
        {/* Left Side: Sub-tabs matching Preview Catalog button style */}
        <div className="auction-subtabs-btn-group">
          {subTabs.map(tab => {
            const isActive = preAuctionSubTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPreAuctionSubTab(tab.key)}
                className={`btn-screenshot-tab ${isActive ? 'active' : ''}`}
              >
                {isActive && <span className="image2-subtab-dot" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`image2-tab-badge ${tab.badgeType === 'green' ? 'green' : 'neutral'}`}>
                    {tab.badge}
                  </span>
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
            title="Preview Catalog View"
          >
            <Eye size={14} color="#64748b" />
            <span>Preview Catalog</span>
          </button>

          <button
            type="button"
            className="btn-screenshot-white"
            onClick={handleSave}
            disabled={isSaving}
            title="Save as Draft"
          >
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            className="btn-screenshot-publish"
            onClick={handleSave}
            disabled={isSaving}
            title="Publish and Save Configuration"
          >
            <Check size={14} strokeWidth={2.5} color="#10b981" />
            <span>Publish Live</span>
          </button>

          {/* More actions dropdown for Reports & Delete Auction */}
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
                {onNavigateReports && (
                  <button
                    type="button"
                    className="auction-dropdown-item"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onNavigateReports();
                    }}
                  >
                    <FileText size={14} color="#64748b" />
                    <span>Reports</span>
                  </button>
                )}
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

      {/* Pre-Auction View (hideSubtabs={true} because subtabs are now aligned in the unified top action bar) */}
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
              disabled={isSaving}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
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
