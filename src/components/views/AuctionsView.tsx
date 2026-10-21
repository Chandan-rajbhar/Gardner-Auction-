import React, { useState, useEffect } from 'react';
import { Auction, NavigationSection, LotItem } from '../../types';
import { AuctionsListView } from '../auction/AuctionsListView';
import { AuctionDetailView } from '../auction/AuctionDetailView';
import { StageType } from '../../types/auctionDetail';

interface AuctionsViewProps {
  auctions?: Auction[];
  selectedAuctionId: string;
  onSelectAuction: (id: string) => void;
  onAddAuction?: (auction: Auction) => void;
  onNavigate: (section: NavigationSection) => void;
  onSyncHiBid?: () => void;
  activeAuctionDetailId?: string | null;
  onSetActiveAuctionDetailId?: (id: string | null) => void;
  initialStage?: StageType;
  initialSubTab?: string;
  lots: LotItem[];
  onAddLot: (lot: LotItem) => void;
  onUpdateLot: (lot: LotItem) => void;
  onSendToBlock: (lot: LotItem) => void;
  onDeleteLot: (id: string) => Promise<any>;
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({
  selectedAuctionId,
  onSelectAuction,
  onNavigate,
  activeAuctionDetailId,
  onSetActiveAuctionDetailId,
  initialStage = 'pre-auction',
  initialSubTab,
  lots,
  onAddLot,
  onUpdateLot,
  onSendToBlock,
  onDeleteLot
}) => {
  // Local active auction detail state if not controlled from parent
  const [localActiveId, setLocalActiveId] = useState<string | null>(activeAuctionDetailId || null);

  useEffect(() => {
    if (activeAuctionDetailId !== undefined) {
      setLocalActiveId(activeAuctionDetailId);
    }
  }, [activeAuctionDetailId]);

  const handleOpenAuction = (id: string) => {
    onSelectAuction(id);
    if (onSetActiveAuctionDetailId) {
      onSetActiveAuctionDetailId(id);
    } else {
      setLocalActiveId(id);
    }

    // Reflect in browser URL history
    try {
      window.history.pushState({}, '', `/auctions/${id}`);
    } catch (e) {
      // ignore
    }
  };

  const handleReturnToList = () => {
    if (onSetActiveAuctionDetailId) {
      onSetActiveAuctionDetailId(null);
    } else {
      setLocalActiveId(null);
    }

    try {
      window.history.pushState({}, '', '/auctions');
    } catch (e) {
      // ignore
    }
  };

  if (localActiveId) {
    return (
      <AuctionDetailView
        auctionId={localActiveId}
        initialStage={initialStage}
        initialSubTab={initialSubTab}
        onReturnToList={handleReturnToList}
        onNavigateReports={() => onNavigate('reports')}
        onNavigateClerking={() => onNavigate('live_clerking')}
        lots={lots}
        onAddLot={onAddLot}
        onUpdateLot={onUpdateLot}
        onSendToBlock={onSendToBlock}
        onDeleteLot={onDeleteLot}
      />
    );
  }

  return (
    <AuctionsListView
      onOpenAuction={handleOpenAuction}
      onNavigateReports={() => onNavigate('reports')}
    />
  );
};
