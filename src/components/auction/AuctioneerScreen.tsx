import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LotItem, Auction, LiveBid, UserBidder } from '../../types';
import { BidderRegistration } from '../../types/auctionDetail';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { lotsService } from '../../services/lotsService';
import { auctionService } from '../../services/auctionService';
import { activityLogService } from '../../services/activityLogService';
import { ShadcnSelect, ShadcnSelectOption } from '../ui/ShadcnSelect';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  Search, 
  Radio, 
  Gavel, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  Tag, 
  Image as ImageIcon 
} from 'lucide-react';
import './AuctioneerScreen.css';

interface AuctioneerScreenProps {
  auctionId: string;
  initialLots?: LotItem[];
  initialRegistrations?: BidderRegistration[];
  availableAuctions?: Array<{ id: string; code: string; title: string }>;
  onReturn?: () => void;
  isStandalone?: boolean;
}

export const AuctioneerScreen: React.FC<AuctioneerScreenProps> = ({
  auctionId: propAuctionId,
  initialLots = [],
  initialRegistrations = [],
  availableAuctions = [],
  onReturn,
  isStandalone = false
}) => {
  // Current active auction ID
  const [selectedAuctionId, setSelectedAuctionId] = useState<string>(propAuctionId || 'auc-001');
  const [auction, setAuction] = useState<any>(null);
  const [auctionsList, setAuctionsList] = useState<Array<{ id: string; code: string; title: string }>>(availableAuctions);

  // Lots & Bidders
  const [lots, setLots] = useState<LotItem[]>(initialLots);
  const [registrations, setRegistrations] = useState<BidderRegistration[]>(initialRegistrations);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active Lot Index
  const [currentLotIndex, setCurrentLotIndex] = useState<number>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Search & Filtering
  const [bidderSearchQuery, setBidderSearchQuery] = useState<string>('');
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);

  // Quick Clerk / Hammer Down Modal
  const [isHammerModalOpen, setIsHammerModalOpen] = useState<boolean>(false);
  const [hammerPriceInput, setHammerPriceInput] = useState<string>('');
  const [winningPaddleInput, setWinningPaddleInput] = useState<string>('');
  const [clerkError, setClerkError] = useState<string | null>(null);
  const [isSubmittingClerk, setIsSubmittingClerk] = useState<boolean>(false);

  // 1. Fetch Auction Details dynamically from Supabase
  const loadAuctionInfo = async (aucId: string) => {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('auctions')
        .select('*')
        .eq('id', aucId)
        .maybeSingle();

      if (!error && data) {
        setAuction(data);
      } else {
        // Fallback fetch all auctions to resolve
        const all = await auctionService.getAuctions();
        if (all && all.length > 0) {
          const found = all.find(a => a.id === aucId) || all[0];
          setAuction(found);
          if (auctionsList.length === 0) {
            setAuctionsList(all.map(a => ({ id: a.id, code: a.code, title: a.name || a.title })));
          }
        }
      }
    } catch (err) {
      console.warn('[AuctioneerScreen] Error loading auction details:', err);
    }
  };

  // 2. Fetch Lots dynamically from Supabase
  const loadLotsFromDB = async (aucId: string) => {
    try {
      const fetchedLots = await lotsService.fetchLotsByAuction(aucId);
      if (fetchedLots && fetchedLots.length > 0) {
        // Sort sequentially by lotNumber
        const sorted = [...fetchedLots].sort((a, b) => a.lotNumber - b.lotNumber);
        setLots(sorted);

        // Find currently on_block lot or maintain index
        const onBlockIdx = sorted.findIndex(l => l.status === 'on_block');
        if (onBlockIdx !== -1) {
          setCurrentLotIndex(onBlockIdx);
        }
      } else if (initialLots.length > 0) {
        const filtered = initialLots.filter(l => l.auctionId === aucId);
        if (filtered.length > 0) {
          setLots(filtered);
        }
      }
    } catch (err) {
      console.warn('[AuctioneerScreen] Error loading lots:', err);
    }
  };

  // 3. Fetch Checked-in Bidders dynamically from Supabase bidder_registrations & users
  const loadRegistrationsFromDB = async (aucId: string) => {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('bidder_registrations')
        .select('*')
        .eq('auction_id', aucId)
        .order('is_checked_in', { ascending: false });

      if (!error && data) {
        const mapped: BidderRegistration[] = data.map((row: any) => ({
          id: row.id,
          bidCardNumber: row.bid_card_number,
          bidderName: row.bidder_name,
          companyName: row.company_name || '',
          email: row.email || '',
          phone: row.phone || '',
          hearAboutUs: row.hear_about_us || '',
          username: row.username || '',
          hibidReputation: row.hibid_reputation || '5.0 ★',
          bidCount: Number(row.bid_count) || 0,
          permissionText: row.permission_text || 'Approved - Standard',
          dateTime: row.date_time || new Date(row.created_at).toLocaleDateString(),
          site: row.site || 'hibid.com',
          notes: row.notes || '',
          shippingRequested: Boolean(row.shipping_requested),
          bidderNotes: row.bidder_notes || '',
          isCheckedIn: Boolean(row.is_checked_in),
          depositAmount: Number(row.deposit_amount) || 0,
          depositStatus: row.deposit_status || 'Pending',
          createdAt: row.created_at
        }));
        setRegistrations(mapped);
      }
    } catch (err) {
      console.warn('[AuctioneerScreen] Error loading registrations:', err);
    }
  };

  // Master initial loader
  const refreshAllData = async (aucId: string) => {
    setIsRefreshing(true);
    await Promise.all([
      loadAuctionInfo(aucId),
      loadLotsFromDB(aucId),
      loadRegistrationsFromDB(aucId)
    ]);
    setIsRefreshing(false);
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    refreshAllData(selectedAuctionId);
  }, [selectedAuctionId]);

  // Real-time Subscriptions for live synchronization with Clerking & Check In
  useEffect(() => {
    let isSubscribed = true;

    // Realtime Lots changes (sold, current_bid, status, hammer_price)
    const channelLots = supabase
      .channel(`realtime_auctioneer_lots_${selectedAuctionId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lots' },
        (payload) => {
          if (!isSubscribed) return;
          console.log('[AuctioneerScreen Realtime] Lot changed:', payload.eventType);
          loadLotsFromDB(selectedAuctionId);
        }
      )
      .subscribe();

    // Realtime Bidder Registrations (check-in, paddle assignment)
    const channelRegs = supabase
      .channel(`realtime_auctioneer_regs_${selectedAuctionId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bidder_registrations' },
        (payload) => {
          if (!isSubscribed) return;
          console.log('[AuctioneerScreen Realtime] Registration changed:', payload.eventType);
          loadRegistrationsFromDB(selectedAuctionId);
        }
      )
      .subscribe();

    // Realtime Auctions
    const channelAuction = supabase
      .channel(`realtime_auctioneer_auc_${selectedAuctionId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        () => {
          if (!isSubscribed) return;
          loadAuctionInfo(selectedAuctionId);
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channelLots);
      supabase.removeChannel(channelRegs);
      supabase.removeChannel(channelAuction);
    };
  }, [selectedAuctionId]);

  // Current active lot object
  const currentLot: LotItem | undefined = lots[currentLotIndex] || lots[0];

  // Available images for the current lot
  const lotImages = useMemo(() => {
    if (!currentLot) return ['/assets/gold-coin.jpg'];
    const imgs: string[] = [];
    if (currentLot.image && currentLot.image.trim()) {
      imgs.push(currentLot.image);
    }
    if ((currentLot as any).images && Array.isArray((currentLot as any).images)) {
      (currentLot as any).images.forEach((img: string) => {
        if (img && !imgs.includes(img)) imgs.push(img);
      });
    }
    if (imgs.length === 0) {
      imgs.push('/assets/gold-coin.jpg');
    }
    return imgs;
  }, [currentLot]);

  // Reset active image index when navigating lots
  useEffect(() => {
    setActiveImageIndex(0);
  }, [currentLot?.id]);

  // ==========================================================================
  // SHADCN DROPDOWN OPTIONS (Requirement: add shadcn in dropdown)
  // ==========================================================================
  // 1. Lot Options for ShadcnSelect
  const lotOptions = useMemo<ShadcnSelectOption[]>(() => {
    return lots.map((l, idx) => ({
      value: l.id,
      label: `Lot #${l.lotNumber} (${idx + 1}/${lots.length}) - ${l.title}`,
      description: `${l.category} • Start: ${formatCurrency(l.startingBid)} • ${l.status.toUpperCase()}`,
      badge: l.status === 'on_block' ? 'LIVE' : l.status.toUpperCase()
    }));
  }, [lots]);

  // 2. Auction Options for ShadcnSelect
  const auctionOptions = useMemo<ShadcnSelectOption[]>(() => {
    return auctionsList.map(a => ({
      value: a.id,
      label: `${a.code} - ${a.title}`,
      badge: a.code
    }));
  }, [auctionsList]);

  // 3. Bidder Paddle Options for Hammer Down Modal
  const bidderPaddleOptions = useMemo<ShadcnSelectOption[]>(() => {
    return registrations
      .filter(r => r.isCheckedIn)
      .map(b => ({
        value: b.bidCardNumber,
        label: `Paddle #${b.bidCardNumber} - ${b.bidderName}`,
        description: b.companyName || b.email,
        badge: `#${b.bidCardNumber}`
      }));
  }, [registrations]);

  // ==========================================================================
  // REAL-TIME AUCTION STATISTICS (Requirement 2 & 5)
  // Dynamic calculation strictly from genuine Supabase data
  // ==========================================================================
  const auctionStats = useMemo(() => {
    const totalLots = lots.length;

    // Total Hammer Price: sum of hammer prices for sold lots
    const soldLots = lots.filter(l => l.status === 'sold' && (Number(l.hammerPrice) > 0 || Number(l.currentBid) > 0));
    const totalHammerPrice = soldLots.reduce((sum, l) => sum + (Number(l.hammerPrice) || Number(l.currentBid) || 0), 0);

    // Average Hammer Price
    const avgHammerPrice = soldLots.length > 0 
      ? Math.round(totalHammerPrice / soldLots.length) 
      : 0;

    // Clerked Lots (sold + passed)
    const clerkedLots = lots.filter(l => l.status === 'sold' || l.status === 'passed').length;

    // Uncleared / Unclerked Lots (upcoming + on_block)
    const unclearedLots = lots.filter(l => l.status === 'upcoming' || l.status === 'on_block').length;

    // Number of Unique Sellers represented in lots
    const uniqueSellersSet = new Set<string>();
    lots.forEach(l => {
      const seller = l.consignorName || (l as any).sellerName || (l as any).consignor_name;
      if (seller && seller.trim()) {
        uniqueSellersSet.add(seller.trim());
      }
    });
    const numberOfSellers = uniqueSellersSet.size > 0 ? uniqueSellersSet.size : 1;

    // Bidders Checked In
    const biddersCheckedIn = registrations.filter(r => r.isCheckedIn).length;

    return {
      totalLots,
      totalHammerPrice,
      avgHammerPrice,
      clerkedLots,
      unclearedLots,
      numberOfSellers,
      biddersCheckedIn,
      soldCount: soldLots.length
    };
  }, [lots, registrations]);

  // ==========================================================================
  // NAVIGATION CONTROLS (Requirement 3)
  // ==========================================================================
  const handlePrevLot = () => {
    if (currentLotIndex > 0) {
      setCurrentLotIndex(prev => prev - 1);
    }
  };

  const handleNextLot = () => {
    if (currentLotIndex < lots.length - 1) {
      setCurrentLotIndex(prev => prev + 1);
    }
  };

  const handleJumpToCurrentOnBlock = () => {
    const onBlockIdx = lots.findIndex(l => l.status === 'on_block');
    if (onBlockIdx !== -1) {
      setCurrentLotIndex(onBlockIdx);
    } else {
      // If no lot currently on_block, jump to first upcoming lot
      const upcomingIdx = lots.findIndex(l => l.status === 'upcoming');
      if (upcomingIdx !== -1) {
        setCurrentLotIndex(upcomingIdx);
      }
    }
  };

  const handleSelectLotFromDropdown = (lotId: string) => {
    const idx = lots.findIndex(l => l.id === lotId);
    if (idx !== -1) {
      setCurrentLotIndex(idx);
    }
  };

  // Pop Out / New Window handler
  const handlePopOut = () => {
    const url = `/auctioneer?auctionId=${selectedAuctionId}`;
    window.open(url, '_blank', 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no');
  };

  // ==========================================================================
  // LIVE CLERKING & STATUS ACTIONS (Requirement 5)
  // ==========================================================================
  const handleSendLotToBlock = async (lot: LotItem) => {
    try {
      const res = await lotsService.sendLotToBlock(lot.id);
      if (res.success) {
        setLots(prev => prev.map(l => 
          l.id === lot.id 
            ? { ...l, status: 'on_block' } 
            : l.status === 'on_block' 
              ? { ...l, status: 'upcoming' } 
              : l
        ));
      }
    } catch (err) {
      console.error('[AuctioneerScreen] Error sending lot to block:', err);
    }
  };

  const handlePassLot = async (lot: LotItem) => {
    try {
      await lotsService.updateLot(lot.id, { status: 'passed' });
      setLots(prev => prev.map(l => l.id === lot.id ? { ...l, status: 'passed' } : l));
      activityLogService.logEvent({
        operatorService: 'Auctioneer Rostrum',
        category: 'Clerking',
        eventAction: `Lot #${lot.lotNumber} PASSED by Auctioneer`,
        auditDetails: `Lot #${lot.lotNumber} marked as Passed (Reserve Not Met / No Bids).`,
        status: 'SUCCESS',
        relatedRecordType: 'lot',
        relatedRecordId: lot.id
      });
    } catch (err) {
      console.error('[AuctioneerScreen] Error passing lot:', err);
    }
  };

  const handleReopenLot = async (lot: LotItem) => {
    try {
      await lotsService.sendLotToBlock(lot.id);
      setLots(prev => prev.map(l => l.id === lot.id ? { ...l, status: 'on_block' } : l));
    } catch (err) {
      console.error('[AuctioneerScreen] Error reopening lot:', err);
    }
  };

  const handleOpenHammerModal = () => {
    if (!currentLot) return;
    setClerkError(null);
    const suggestedPrice = currentLot.currentBid || currentLot.startingBid || 100;
    setHammerPriceInput(String(suggestedPrice));
    setWinningPaddleInput(currentLot.highBidderPaddle || registrations[0]?.bidCardNumber || '101');
    setIsHammerModalOpen(true);
  };

  const handleConfirmHammerSold = async () => {
    if (!currentLot) return;
    const finalAmount = parseFloat(hammerPriceInput.replace(/[^0-9.]/g, ''));
    if (!finalAmount || finalAmount <= 0) {
      setClerkError('Please enter a valid hammer price.');
      return;
    }
    if (!winningPaddleInput.trim()) {
      setClerkError('Please enter winning paddle number.');
      return;
    }

    setIsSubmittingClerk(true);
    setClerkError(null);

    try {
      const matchedBidder = registrations.find(r => r.bidCardNumber === winningPaddleInput.trim());
      const winnerName = matchedBidder ? matchedBidder.bidderName : `Bidder #${winningPaddleInput}`;

      await lotsService.updateLot(currentLot.id, {
        status: 'sold',
        hammerPrice: finalAmount,
        highBidderPaddle: winningPaddleInput.trim(),
        highBidderName: winnerName
      });

      setLots(prev => prev.map(l => l.id === currentLot.id ? {
        ...l,
        status: 'sold',
        hammerPrice: finalAmount,
        highBidderPaddle: winningPaddleInput.trim(),
        highBidderName: winnerName
      } : l));

      await activityLogService.logEvent({
        operatorService: 'Auctioneer Rostrum',
        category: 'Clerking',
        eventAction: `HAMMER DOWN! Lot #${currentLot.lotNumber} SOLD for $${finalAmount.toLocaleString()}`,
        auditDetails: `Sold to Paddle #${winningPaddleInput} (${winnerName}). Auctioneer Screen synchronized with Clerking desk.`,
        status: 'SUCCESS',
        relatedRecordType: 'lot',
        relatedRecordId: currentLot.id,
        metadata: { hammerPrice: finalAmount, winningPaddle: winningPaddleInput, winnerName }
      });

      setIsHammerModalOpen(false);
    } catch (err: any) {
      setClerkError(err.message || 'Failed to record hammer down.');
    } finally {
      setIsSubmittingClerk(false);
    }
  };

  const filteredBidders = useMemo(() => {
    const q = bidderSearchQuery.trim().toLowerCase();
    const checkedInList = registrations.filter(r => r.isCheckedIn);
    if (!q) return checkedInList;
    return checkedInList.filter(b => 
      b.bidCardNumber.toLowerCase().includes(q) ||
      b.bidderName.toLowerCase().includes(q) ||
      (b.companyName && b.companyName.toLowerCase().includes(q)) ||
      (b.email && b.email.toLowerCase().includes(q))
    );
  }, [registrations, bidderSearchQuery]);

  const isReserveMet = useMemo(() => {
    if (!currentLot) return false;
    const reserve = Number(currentLot.reservePrice) || 0;
    if (reserve <= 0) return true;
    const activePrice = Number(currentLot.hammerPrice) || Number(currentLot.currentBid) || Number(currentLot.startingBid) || 0;
    return activePrice >= reserve;
  }, [currentLot]);

  if (isLoading && !currentLot) {
    return (
      <div className={`auctioneer-screen-wrapper ${isStandalone ? 'standalone' : 'embedded'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 450 }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#a37a3b' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Loading Auctioneer Screen...</h3>
          <p style={{ margin: '6px 0 0 0', fontSize: 13 }}>Synchronizing live lots and checked-in bidders with Supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`auctioneer-screen-wrapper ${isStandalone ? 'standalone' : 'embedded'}`}>
      {/* ====================================================================
          TOP ROSTRUM HEADER & NAVIGATION BAR
          ==================================================================== */}
      <header className="auctioneer-header">
        <div className="auctioneer-header-left">
          {onReturn && (
            <button
              type="button"
              className="auctioneer-return-btn"
              onClick={onReturn}
              title="Return to Auction Day workflow"
            >
              <ArrowLeft size={15} />
              <span>Return to Auction Day</span>
            </button>
          )}

          <div className="auctioneer-title-group">
            <div className="auctioneer-event-name">
              <Gavel size={18} color="#dfb74a" />
              <span>{auction?.name || auction?.title || 'Premier Collector Auction'}</span>
              <span className={`auctioneer-status-badge ${String(auction?.status || 'Open').toLowerCase().replace(' ', '_')}`}>
                • {auction?.status || 'Open'}
              </span>
            </div>

            {/* Auction Switcher using ShadcnSelect */}
            {auctionsList.length > 1 && (
              <div style={{ marginTop: 6, minWidth: 200, maxWidth: 280 }}>
                <ShadcnSelect
                  value={selectedAuctionId}
                  onChange={(val) => setSelectedAuctionId(val)}
                  options={auctionOptions}
                  size="sm"
                  className="auctioneer-shadcn-select"
                  ariaLabel="Switch auction event"
                />
              </div>
            )}
          </div>
        </div>

        {/* Center Lot Navigation Controls with ShadcnSelect (Requirement: add shadcn in dropdown) */}
        <div className="auctioneer-nav-center">
          <button
            type="button"
            className="auctioneer-nav-btn"
            onClick={handlePrevLot}
            disabled={currentLotIndex === 0}
            title="Navigate to Previous Lot"
          >
            <ChevronLeft size={16} />
            <span>Prev Lot</span>
          </button>

          {/* Quick Lot Selector Dropdown with ShadcnSelect */}
          <div style={{ minWidth: 240, maxWidth: 320, flex: 1 }}>
            <ShadcnSelect
              value={currentLot?.id || ''}
              onChange={handleSelectLotFromDropdown}
              options={lotOptions}
              size="sm"
              searchable={true}
              searchPlaceholder="Search lot # or title..."
              className="auctioneer-shadcn-select"
              ariaLabel="Jump to lot"
            />
          </div>

          {/* Current Live Lot Button */}
          <button
            type="button"
            className="auctioneer-current-lot-btn"
            onClick={handleJumpToCurrentOnBlock}
            title="Jump to active lot on the block"
          >
            <span className="auctioneer-current-dot" />
            <span>Current Lot</span>
          </button>

          <button
            type="button"
            className="auctioneer-nav-btn"
            onClick={handleNextLot}
            disabled={currentLotIndex >= lots.length - 1}
            title="Navigate to Next Lot"
          >
            <span>Next Lot</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="auctioneer-header-right">
          <div className="auctioneer-sync-indicator" title="Connected to Supabase Realtime WebSocket">
            <Radio size={13} className="animate-pulse" />
            <span>Live Synced</span>
          </div>

          <button
            type="button"
            className="auctioneer-header-btn"
            onClick={() => refreshAllData(selectedAuctionId)}
            disabled={isRefreshing}
            title="Synchronize data with Supabase"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          {!isStandalone && (
            <button
              type="button"
              className="auctioneer-header-btn"
              onClick={handlePopOut}
              title="Open Auctioneer Screen in a separate window or monitor"
            >
              <ExternalLink size={13} />
              <span>Pop Out</span>
            </button>
          )}
        </div>
      </header>

      {/* ====================================================================
          MAIN 3-PANEL ROSTRUM LAYOUT
          1. Lot Images Section
          2. Lot Info Section
          3. Auction Info & Real-Time Stats Section
          ==================================================================== */}
      <main className="auctioneer-main-grid">
        
        {/* ==================================================================
            SECTION 1: LOT IMAGES (Requirement 1 & 2)
            ================================================================== */}
        <div className="auctioneer-card auctioneer-section-lot-images">
          <div className="auctioneer-card-header">
            <h3 className="auctioneer-card-title">
              <ImageIcon size={15} color="#a37a3b" />
              <span>Lot Images</span>
            </h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
              Photo {activeImageIndex + 1} of {lotImages.length}
            </span>
          </div>

          {/* Primary Main Image Hero */}
          <div 
            className="auctioneer-image-main-container"
            onClick={() => setIsZoomModalOpen(true)}
            title="Click to view full-resolution image"
          >
            <img 
              src={lotImages[activeImageIndex] || '/assets/gold-coin.jpg'} 
              alt={currentLot?.title || 'Lot Item'} 
              className="auctioneer-main-image"
              onError={(e) => {
                e.currentTarget.src = '/assets/gold-coin.jpg';
              }}
            />

            <div className="auctioneer-img-lot-tag">
              LOT #{currentLot?.lotNumber}
            </div>

            <button
              type="button"
              className="auctioneer-img-zoom-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomModalOpen(true);
              }}
            >
              <Maximize2 size={13} />
              <span>Zoom</span>
            </button>
          </div>

          {/* Thumbnail Gallery Strip */}
          {lotImages.length > 1 && (
            <div className="auctioneer-thumbnails-strip">
              {lotImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`auctioneer-thumb-item ${activeImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img 
                    src={imgUrl} 
                    alt={`Thumb ${idx + 1}`} 
                    className="auctioneer-thumb-img"
                    onError={(e) => { e.currentTarget.src = '/assets/gold-coin.jpg'; }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ==================================================================
            SECTION 2: LOT INFO (Requirement 1, 2, 5)
            ================================================================== */}
        <div className="auctioneer-card auctioneer-section-lot-info">
          <div className="auctioneer-card-header">
            <h3 className="auctioneer-card-title">
              <Tag size={15} color="#a37a3b" />
              <span>Lot Information</span>
            </h3>
            {currentLot && (
              <span className={`auctioneer-lot-status-pill ${currentLot.status}`}>
                {currentLot.status === 'on_block' && <span className="auctioneer-current-dot" />}
                {currentLot.status === 'on_block' ? 'ON BLOCK (LIVE)' : currentLot.status.toUpperCase()}
              </span>
            )}
          </div>

          <div className="auctioneer-lot-info-body">
            {/* Header: Lot Number & Title */}
            <div className="auctioneer-lot-headline">
              <div>
                <div className="auctioneer-lot-number-display">
                  Lot #{currentLot?.lotNumber}
                </div>
                <div className="auctioneer-lot-category-tag">
                  {currentLot?.category || 'Curated Lot'}
                </div>
              </div>
            </div>

            <h2 className="auctioneer-lot-title-text">
              {currentLot?.title || 'No lot selected'}
            </h2>

            {/* Financial Grid: Starting Bid, Presale Estimate, Reserve Price, Hammer */}
            <div className="auctioneer-price-grid">
              {/* Starting Bid */}
              <div className="auctioneer-price-box">
                <span className="auctioneer-price-label">Starting Bid</span>
                <span className="auctioneer-price-val">
                  {formatCurrency(Number(currentLot?.startingBid) || 0)}
                </span>
                <span className="auctioneer-price-subtext" style={{ color: '#64748b' }}>
                  Floor Opening
                </span>
              </div>

              {/* Presale Estimate */}
              <div className="auctioneer-price-box">
                <span className="auctioneer-price-label">Presale Estimate</span>
                <span className="auctioneer-price-val">
                  {currentLot?.estimateLow && currentLot?.estimateHigh
                    ? `${formatCurrency(currentLot.estimateLow)} – ${formatCurrency(currentLot.estimateHigh)}`
                    : currentLot?.estimateHigh
                      ? formatCurrency(currentLot.estimateHigh)
                      : '$0.00'}
                </span>
                <span className="auctioneer-price-subtext" style={{ color: '#64748b' }}>
                  Catalog Valuation
                </span>
              </div>

              {/* Reserve Price */}
              <div className="auctioneer-price-box">
                <span className="auctioneer-price-label">Reserve Price</span>
                <span className="auctioneer-price-val">
                  {Number(currentLot?.reservePrice) > 0 ? formatCurrency(currentLot?.reservePrice || 0) : 'No Reserve'}
                </span>
                {Number(currentLot?.reservePrice) > 0 && (
                  <span className={`auctioneer-reserve-badge ${isReserveMet ? 'met' : 'unmet'}`}>
                    {isReserveMet ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                    {isReserveMet ? 'Reserve Met' : 'Reserve Not Met'}
                  </span>
                )}
              </div>

              {/* Hammer Price / Current High Bid */}
              <div className="auctioneer-price-box">
                <span className="auctioneer-price-label">
                  {currentLot?.status === 'sold' ? 'Hammer Price' : 'Current Bid'}
                </span>
                <span className={`auctioneer-price-val ${currentLot?.status === 'sold' ? 'sold' : ''}`}>
                  {currentLot?.status === 'sold'
                    ? formatCurrency(Number(currentLot.hammerPrice) || Number(currentLot.currentBid) || 0)
                    : formatCurrency(Number(currentLot?.currentBid) || Number(currentLot?.startingBid) || 0)}
                </span>
                <span className="auctioneer-price-subtext" style={{ color: currentLot?.status === 'sold' ? '#16a34a' : '#64748b' }}>
                  {currentLot?.status === 'sold' ? 'Realized at Gavel Fall' : `${currentLot?.bidsCount || 0} Bids Placed`}
                </span>
              </div>
            </div>

            {/* Consignor / Seller Box */}
            <div className="auctioneer-consignor-box">
              <div className="auctioneer-consignor-header">
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#a37a3b' }}>
                  Seller / Consignor
                </span>
                <span className="auctioneer-consignor-code">
                  {currentLot?.consignorId || 'CUST-RECORD'}
                </span>
              </div>
              <div className="auctioneer-consignor-name">
                {currentLot?.consignorName || (currentLot as any)?.sellerName || 'Estate Consignor'}
              </div>
              {currentLot?.provenance && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  <strong>Provenance:</strong> {currentLot.provenance}
                </div>
              )}
            </div>

            {/* Sold To / High Bidder Banner */}
            {(currentLot?.highBidderPaddle || currentLot?.status === 'sold') && (
              <div className="auctioneer-winner-box">
                <div className="auctioneer-winner-title">
                  {currentLot.status === 'sold' ? 'Winning Bidder / Sold To' : 'Current High Bidder'}
                </div>
                <div className="auctioneer-winner-details">
                  <span className="auctioneer-paddle-badge">
                    Paddle #{currentLot.highBidderPaddle || '101'}
                  </span>
                  <span>{currentLot.highBidderName || 'Registered Bidder'}</span>
                </div>
              </div>
            )}

            {/* Description & Condition Report */}
            <div className="auctioneer-desc-box">
              <div className="auctioneer-desc-title">Description & Catalog Notes</div>
              <p className="auctioneer-desc-text">
                {currentLot?.conditionReport || currentLot?.description || 'Catalog description in preparation.'}
              </p>
              {currentLot?.grade && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#0f172a', fontWeight: 600 }}>
                  Certification: <span style={{ color: '#a37a3b' }}>{currentLot.certification || 'PCGS'} {currentLot.grade}</span>
                  {currentLot.certNumber && ` (Cert #${currentLot.certNumber})`}
                </div>
              )}
            </div>

            {/* Quick Action Bar for Rostrum Live Clerking */}
            {currentLot && (
              <div className="auctioneer-actions-bar">
                {currentLot.status !== 'on_block' && currentLot.status !== 'sold' && (
                  <button
                    type="button"
                    className="btn-rostrum-primary"
                    onClick={() => handleSendLotToBlock(currentLot)}
                    title="Promote this lot to Live on Block"
                  >
                    <Gavel size={15} />
                    <span>Send to Block</span>
                  </button>
                )}

                {currentLot.status !== 'sold' && (
                  <button
                    type="button"
                    className="btn-rostrum-success"
                    onClick={handleOpenHammerModal}
                    title="Record gavel hammer down and mark as sold"
                  >
                    <CheckCircle2 size={15} />
                    <span>Hammer Down / Sold</span>
                  </button>
                )}

                {currentLot.status !== 'passed' && currentLot.status !== 'sold' && (
                  <button
                    type="button"
                    className="btn-rostrum-pass"
                    onClick={() => handlePassLot(currentLot)}
                    title="Mark lot as Passed"
                  >
                    <X size={14} />
                    <span>Pass Lot</span>
                  </button>
                )}

                {(currentLot.status === 'sold' || currentLot.status === 'passed') && (
                  <button
                    type="button"
                    className="btn-rostrum-pass"
                    onClick={() => handleReopenLot(currentLot)}
                    title="Reopen lot for live rostrum bidding"
                  >
                    <RefreshCw size={14} />
                    <span>Reopen Lot</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================
            SECTION 3: AUCTION INFO & REAL-TIME STATS (Requirement 1, 2, 4)
            ================================================================== */}
        <div className="auctioneer-card auctioneer-section-auction-info">
          <div className="auctioneer-card-header">
            <h3 className="auctioneer-card-title">
              <Layers size={15} color="#a37a3b" />
              <span>Auction Info & Real-Time Stats</span>
            </h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>
              ● Live DB
            </span>
          </div>

          <div className="auctioneer-auction-info-body">
            {/* 6 Real-Time Auction Metrics Grid */}
            <div className="auctioneer-stats-grid">
              {/* Metric 1: Total Hammer Price */}
              <div className="auctioneer-stat-card">
                <div className="auctioneer-stat-label">
                  <DollarSign size={13} color="#16a34a" />
                  <span>Total Hammer</span>
                </div>
                <div className="auctioneer-stat-val green">
                  {formatCurrency(auctionStats.totalHammerPrice)}
                </div>
                <div className="auctioneer-stat-sub">
                  Across {auctionStats.soldCount} sold lots
                </div>
              </div>

              {/* Metric 2: Average Hammer Price */}
              <div className="auctioneer-stat-card">
                <div className="auctioneer-stat-label">
                  <DollarSign size={13} color="#a37a3b" />
                  <span>Avg Hammer</span>
                </div>
                <div className="auctioneer-stat-val gold">
                  {formatCurrency(auctionStats.avgHammerPrice)}
                </div>
                <div className="auctioneer-stat-sub">
                  Per realized lot
                </div>
              </div>

              {/* Metric 3: Clerked Lots */}
              <div className="auctioneer-stat-card">
                <div className="auctioneer-stat-label">
                  <CheckCircle size={13} color="#2563eb" />
                  <span>Clerked Lots</span>
                </div>
                <div className="auctioneer-stat-val">
                  {auctionStats.clerkedLots}
                </div>
                <div className="auctioneer-stat-sub">
                  of {auctionStats.totalLots} total lots
                </div>
              </div>

              {/* Metric 4: Uncleared Lots */}
              <div className="auctioneer-stat-card">
                <div className="auctioneer-stat-label">
                  <Layers size={13} color="#d97706" />
                  <span>Uncleared Lots</span>
                </div>
                <div className="auctioneer-stat-val" style={{ color: '#d97706' }}>
                  {auctionStats.unclearedLots}
                </div>
                <div className="auctioneer-stat-sub">
                  Remaining on roster
                </div>
              </div>

              {/* Metric 5: Number of Sellers */}
              <div className="auctioneer-stat-card">
                <div className="auctioneer-stat-label">
                  <Users size={13} color="#64748b" />
                  <span>Number of Sellers</span>
                </div>
                <div className="auctioneer-stat-val">
                  {auctionStats.numberOfSellers}
                </div>
                <div className="auctioneer-stat-sub">
                  Active consignors
                </div>
              </div>

              {/* Metric 6: Bidders Checked In */}
              <div className="auctioneer-stat-card">
                <div className="auctioneer-stat-label">
                  <ShieldCheck size={13} color="#16a34a" />
                  <span>Bidders Checked In</span>
                </div>
                <div className="auctioneer-stat-val green">
                  {auctionStats.biddersCheckedIn}
                </div>
                <div className="auctioneer-stat-sub">
                  of {registrations.length} registered
                </div>
              </div>
            </div>

            {/* Checked-In Bidders Sub-Module (Requirement 4) */}
            <div className="auctioneer-bidders-module">
              <div className="auctioneer-bidders-header">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                  Checked In Bidders ({filteredBidders.length})
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Live Desk
                </span>
              </div>

              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 20, top: 16 }} />
                <input
                  type="text"
                  placeholder="Filter by paddle #, name, company..."
                  value={bidderSearchQuery}
                  onChange={(e) => setBidderSearchQuery(e.target.value)}
                  className="auctioneer-bidders-search"
                />
              </div>

              <div className="auctioneer-bidders-list-scroll">
                {filteredBidders.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    {bidderSearchQuery ? 'No matching checked-in bidders' : 'No checked-in bidders for this auction'}
                  </div>
                ) : (
                  filteredBidders.map(bidder => (
                    <div 
                      key={bidder.id} 
                      className={`auctioneer-bidder-row ${currentLot?.highBidderPaddle === bidder.bidCardNumber ? 'selected' : ''}`}
                    >
                      <div className="auctioneer-bidder-left">
                        <span className="auctioneer-paddle-badge">
                          #{bidder.bidCardNumber}
                        </span>
                        <div className="auctioneer-bidder-meta">
                          <span className="auctioneer-bidder-name">
                            {bidder.bidderName}
                            {bidder.companyName && (
                              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 4 }}>
                                ({bidder.companyName})
                              </span>
                            )}
                          </span>
                          <span className="auctioneer-bidder-email">
                            {bidder.email || bidder.username}
                          </span>
                        </div>
                      </div>

                      <span className="auctioneer-checkin-badge">
                        <CheckCircle size={11} />
                        <span>Checked In</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ====================================================================
          MODAL 1: FULL RESOLUTION IMAGE ZOOM MODAL
          ==================================================================== */}
      {isZoomModalOpen && (
        <div className="auctioneer-modal-overlay" onClick={() => setIsZoomModalOpen(false)}>
          <div 
            style={{ 
              maxWidth: 900, 
              width: '90%', 
              background: '#0f172a', 
              borderRadius: 12, 
              overflow: 'hidden', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)', 
              position: 'relative' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(0,0,0,0.4)', color: '#ffffff' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                Lot #{currentLot?.lotNumber} — High-Resolution Inspection
              </span>
              <button 
                type="button" 
                onClick={() => setIsZoomModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, maxHeight: '80vh' }}>
              <img 
                src={lotImages[activeImageIndex] || '/assets/gold-coin.jpg'} 
                alt={currentLot?.title} 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: QUICK HAMMER DOWN / MARK SOLD MODAL (Uses ShadcnSelect)
          ==================================================================== */}
      {isHammerModalOpen && (
        <div className="auctioneer-modal-overlay" onClick={() => !isSubmittingClerk && setIsHammerModalOpen(false)}>
          <div className="auctioneer-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="auctioneer-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
                <Gavel size={18} color="#dfb74a" />
                <span>Hammer Down — Lot #{currentLot?.lotNumber}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsHammerModalOpen(false)} 
                disabled={isSubmittingClerk}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="auctioneer-modal-body">
              <div style={{ fontSize: 13, color: '#334155' }}>
                Confirm gavel hammer down and record realized price for <strong>{currentLot?.title}</strong>.
              </div>

              {clerkError && (
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 12 }}>
                  {clerkError}
                </div>
              )}

              {/* Hammer Price Input */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Final Hammer Price ($) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={hammerPriceInput}
                  onChange={(e) => setHammerPriceInput(e.target.value)}
                  placeholder="e.g. 585"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Winning Paddle Selector with ShadcnSelect */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Sold to Bidder Paddle # *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    value={winningPaddleInput}
                    onChange={(e) => setWinningPaddleInput(e.target.value)}
                    placeholder="Enter paddle # e.g. 241396"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                  />
                  {bidderPaddleOptions.length > 0 && (
                    <ShadcnSelect
                      value={winningPaddleInput}
                      onChange={(val) => {
                        if (val) setWinningPaddleInput(val);
                      }}
                      options={bidderPaddleOptions}
                      placeholder="Or choose from checked-in bidders..."
                      size="md"
                      searchable={true}
                      searchPlaceholder="Search bidder name or paddle..."
                      fullWidth={true}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="auctioneer-modal-footer">
              <button
                type="button"
                className="btn-rostrum-pass"
                onClick={() => setIsHammerModalOpen(false)}
                disabled={isSubmittingClerk}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-rostrum-success"
                onClick={handleConfirmHammerSold}
                disabled={isSubmittingClerk}
              >
                <CheckCircle2 size={15} />
                <span>{isSubmittingClerk ? 'Recording...' : 'Confirm Sale'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
