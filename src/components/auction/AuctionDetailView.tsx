import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { auctionService } from '../../services/auctionService';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: state.isDirty ? 80 : 20 }}>
      {/* Header matching specification */}
      <div className="card-header-flex" style={{ alignItems: 'flex-start' }}>
        <div>
          {/* Back link */}
          <button
            type="button"
            onClick={handleReturnClick}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold-dark)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 6,
              padding: 0
            }}
          >
            <ArrowLeft size={14} />
            <span>← Return to All Auctions</span>
          </button>

          {/* Title + HiBid Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="font-serif" style={{ fontSize: 24, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
              {auction.name}
            </h1>
            {auction.auctionType === 'HiBid' && (
              <span style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                background: '#e0f2fe', 
                color: '#0369a1', 
                padding: '2px 8px', 
                borderRadius: 4 
              }}>
                HiBid
              </span>
            )}
          </div>
        </div>

        {/* Header Action Buttons: Save (primary), Reports, Delete Auction */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-gold"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'SAVE'}</span>
          </button>

          {onNavigateReports && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onNavigateReports}
            >
              <FileText size={15} />
              <span>REPORTS</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            style={{
              background: '#ffffff',
              border: '1px solid #ef4444',
              color: '#dc2626',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <Trash2 size={14} />
            <span>✕ DELETE AUCTION</span>
          </button>
        </div>
      </div>

      {/* Pre-Auction View */}
      <PreAuctionTab
        currentTab={preAuctionSubTab}
        onSelectTab={setPreAuctionSubTab}
        lots={lots}
        onAddLot={onAddLot}
        onUpdateLot={onUpdateLot}
        onSendToBlock={onSendToBlock}
        onDeleteLot={onDeleteLot}
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
