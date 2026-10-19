import React, { useState, useMemo, useEffect } from 'react';
import './CurrentAuctionPage.css';
import {
  Search, Heart, X, ChevronDown, ChevronLeft, ChevronRight, Gavel, Diamond, Lock, Percent, FileCheck,
  Volume2, VolumeX, Shield, Radio, ZoomIn, RotateCw, Maximize2, Feather, Users, Phone, Truck, Crown,
  Sun, Moon, ArrowUp
} from 'lucide-react';
import type { EnrichedLotItem } from './types';

interface CurrentAuctionPageProps {
  watchlist: string[];
  searchQuery?: string;
  onToggleWatchlist: (lotId: string) => void;
  onOpenAuth: () => void;
  onRequestConditionDossier?: (lot: EnrichedLotItem) => void;
  onAddToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

import {
  INITIAL_CATALOG_LOTS,
  CURRENT_AUCTIONS
} from '../../data/currentAuctionData';
import type {
  BidEntry,
  CategoryKey,
  CatalogLot,
  CurrentAuction
} from '../../data/currentAuctionData';

export { INITIAL_CATALOG_LOTS, CURRENT_AUCTIONS };
export type { BidEntry, CategoryKey, CatalogLot, CurrentAuction };

export const CurrentAuctionPage: React.FC<CurrentAuctionPageProps> = ({
  watchlist,
  searchQuery,
  onToggleWatchlist,
  onAddToast
}) => {
  const [lots, setLots] = useState<CatalogLot[]>(INITIAL_CATALOG_LOTS);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'ending' | 'featured'>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'bids'>('recommended');
  const [localSearch, setLocalSearch] = useState<string>('');

  // Pagination State: 6 lots per page
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Scroll container reference for smooth internal products scrolling
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Active Lot for New Page Desktop View
  const [activeDetailLotId, setActiveDetailLotId] = useState<string | null>(null);

  // Selected Preset or Custom Bid inside Detail View
  const [selectedPresetInc, setSelectedPresetInc] = useState<number>(100);
  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);

  // Interactive View Lot Terminal States
  const [isLightTheme, setIsLightTheme] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [activeThumb, setActiveThumb] = useState<'obverse' | 'reverse' | 'edge view' | 'full slab'>('obverse');
  const [activeDossierTab, setActiveDossierTab] = useState<'specs' | 'provenance' | 'condition' | 'vaulting'>('specs');
  const [stageZoom, setStageZoom] = useState<boolean>(false);
  const [stageRotated, setStageRotated] = useState<boolean>(false);

  // Countdown timer in seconds (starts at 74s = 01:14 matching user screenshot)
  const [timeLeft, setTimeLeft] = useState<number>(74);
  const [isBidFlashing, setIsBidFlashing] = useState<boolean>(false);

  // Time format helper: MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Decreasing live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Reset to 3 minutes for continuous live webcast simulation
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Live auction: current bid increases automatically every 8 to 11 seconds
  useEffect(() => {
    const paddles = ['Paddle #219', 'Paddle #404', 'Paddle #177', 'Paddle #328', 'Paddle #112', 'Paddle #489'];
    const types: BidEntry['type'][] = ['WEBCAST', 'FLOOR', 'PHONE'];
    const increments = [100, 200, 250, 500];

    const liveBidInterval = setInterval(() => {
      const targetLotId = activeDetailLotId || 'spotlight-104';
      const inc = increments[Math.floor(Math.random() * increments.length)];
      const paddle = paddles[Math.floor(Math.random() * paddles.length)];
      const type = types[Math.floor(Math.random() * types.length)];

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setLots((prevLots) =>
        prevLots.map((lot) => {
          if (lot.id === targetLotId) {
            const newAmount = lot.currentBid + inc;
            const newBid: BidEntry = {
              id: Date.now().toString(),
              paddle: paddle,
              type: type,
              time: `${timeStr} · live bid`,
              amount: newAmount,
              isHighest: true
            };

            const updatedRecent = [
              newBid,
              ...lot.recentBids.map((b) => ({ ...b, isHighest: false }))
            ].slice(0, 5);

            return {
              ...lot,
              currentBid: newAmount,
              bidsCount: lot.bidsCount + 1,
              recentBids: updatedRecent
            };
          }
          return lot;
        })
      );

      // Flash bid element
      setIsBidFlashing(true);
      setTimeout(() => setIsBidFlashing(false), 1200);
    }, 8500);

    return () => clearInterval(liveBidInterval);
  }, [activeDetailLotId]);

  const activeDetailLot = useMemo(() => {
    if (!activeDetailLotId) return null;
    return lots.find((l) => l.id === activeDetailLotId) || null;
  }, [lots, activeDetailLotId]);

  // When opening a detail view, initialize preset and input
  useEffect(() => {
    if (activeDetailLot) {
      const defaultInc = activeDetailLot.presets[0] || 100;
      setSelectedPresetInc(defaultInc);
      setCustomBidInput((activeDetailLot.currentBid + defaultInc).toString());
      setBidError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeDetailLotId]);

  // Reset currentPage to 1 and scroll position smoothly to catalog top whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      if (rect.top < 80) {
        window.scrollTo({
          top: window.scrollY + rect.top - 100,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedCategory, activeTab, localSearch, searchQuery, sortBy]);

  // Search query sync from header if passed
  const effectiveSearch = localSearch || searchQuery || '';

  // Category counts
  const counts = useMemo(() => {
    return {
      all: lots.length,
      coins: lots.filter((l) => l.categoryKey === 'coins').length,
      jewelry: lots.filter((l) => l.categoryKey === 'jewelry').length,
      art: lots.filter((l) => l.categoryKey === 'art').length,
      antiques: lots.filter((l) => l.categoryKey === 'antiques').length,
      horology: lots.filter((l) => l.categoryKey === 'horology').length,
      americana: lots.filter((l) => l.categoryKey === 'americana').length,
      decorative: lots.filter((l) => l.categoryKey === 'decorative').length
    };
  }, [lots]);

  // Filtered and Sorted Lots
  const filteredLots = useMemo(() => {
    let result = [...lots];

    if (selectedCategory !== 'all') {
      result = result.filter((l) => l.categoryKey === selectedCategory);
    }

    if (activeTab === 'ending') {
      result = result.filter((l) => l.isEndingSoon);
    } else if (activeTab === 'featured') {
      result = result.filter((l) => l.isFeatured);
    }

    if (effectiveSearch.trim()) {
      const q = effectiveSearch.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.lotNumber.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.categoryTag.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.currentBid - b.currentBid);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.currentBid - a.currentBid);
    } else if (sortBy === 'bids') {
      result.sort((a, b) => b.bidsCount - a.bidsCount);
    }

    return result;
  }, [lots, selectedCategory, activeTab, effectiveSearch, sortBy]);

  // Pagination calculations (6 lots per page)
  const totalPages = Math.ceil(filteredLots.length / ITEMS_PER_PAGE);
  const safeCurrentPage = totalPages > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;

  // Sliced lots to show only 6 cards per page
  const paginatedLots = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredLots.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLots, safeCurrentPage]);

  // Page change handler with smooth scroll to catalog top
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top - 120,
        behavior: 'smooth'
      });
    }
  };

  // Helper to generate pagination page numbers list (with ellipsis if large)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Handle Preset Click
  const handleSelectPreset = (inc: number, currentBid: number) => {
    setSelectedPresetInc(inc);
    setCustomBidInput((currentBid + inc).toString());
    setBidError(null);
  };

  // Handle Place Bid
  const handlePlaceBid = (lot: CatalogLot) => {
    const amount = parseInt(customBidInput, 10);
    if (!amount || isNaN(amount) || amount <= lot.currentBid) {
      setBidError(`Bid must be greater than current bid ($${lot.currentBid.toLocaleString()})`);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newBidEntry: BidEntry = {
      id: Date.now().toString(),
      paddle: 'Paddle #414',
      type: 'WEBCAST',
      time: `${timeStr} · highest bid`,
      amount: amount,
      isHighest: true
    };

    setLots((prev) =>
      prev.map((item) => {
        if (item.id === lot.id) {
          const updatedRecent = [
            newBidEntry,
            ...item.recentBids.map((b) => ({ ...b, isHighest: false }))
          ].slice(0, 5);

          return {
            ...item,
            currentBid: amount,
            bidsCount: item.bidsCount + 1,
            recentBids: updatedRecent
          };
        }
        return item;
      })
    );

    onAddToast(
      'success',
      'Bid Placed Successfully',
      `Your bid of $${amount.toLocaleString()} is now the leading bid on ${lot.lotNumber}.`
    );

    const defaultInc = lot.presets[0] || 100;
    setSelectedPresetInc(defaultInc);
    setCustomBidInput((amount + defaultInc).toString());
    setBidError(null);
  };

  // Category title display on right side
  const getCategoryTitle = () => {
    if (selectedCategory === 'coins') return 'Coins & currency';
    if (selectedCategory === 'jewelry') return 'Jewelry & watches';
    if (selectedCategory === 'art') return 'Fine art';
    if (selectedCategory === 'antiques') return 'Antiques & silver';
    if (selectedCategory === 'horology') return 'Horology & timepieces';
    if (selectedCategory === 'americana') return 'Americana & manuscripts';
    if (selectedCategory === 'decorative') return 'Mid-century & decorative';
    return 'All products';
  };

  const getBadgeClass = (type: BidEntry['type']) => {
    switch (type) {
      case 'WEBCAST':
        return 'badge-webcast';
      case 'FLOOR':
        return 'badge-floor';
      case 'PHONE':
        return 'badge-phone';
      default:
        return 'badge-default';
    }
  };

  const getLotAboutDetails = (lot: CatalogLot) => {
    switch (lot.id) {
      case 'spotlight-104':
        return {
          aboutText:
            'A certified 1924 $20 gold coin with the celebrated high-relief Liberty design by Augustus Saint-Gaudens. Preserved in a protective grading holder and suited to U.S. gold and numismatic collections.',
          yearOrigin: '1924 · United States',
          material: 'Gold · $20 denomination',
          condition: 'PCGS MS-64 · certified'
        };
      case 'lot-701':
        return {
          aboutText:
            'A classic 1889 Philadelphia mint Morgan silver dollar with sharp breast feathers and frosted cartwheel luster. Housed in a sonically sealed NGC tamper-evident slab.',
          yearOrigin: '1889 · Philadelphia, PA',
          material: 'Silver · $1 denomination',
          condition: 'NGC MS-62 · certified'
        };
      case 'lot-702':
        return {
          aboutText:
            'Finely pierced platinum filigree setting mounting a central 1.85-carat old European-cut diamond, bordered by natural calibre-cut accent stones and milgrain edging.',
          yearOrigin: 'c. 1910 · England',
          material: 'Platinum & 1.85ct Diamond',
          condition: 'Excellent · period authentic'
        };
      case 'lot-703':
        return {
          aboutText:
            'Heavy-gauge four-piece sterling silver service by Gorham, comprising teapot, covered sugar, waste bowl, and creamer with hand-chased floral repoussé scrollwork.',
          yearOrigin: 'c. 1895 · Providence, RI',
          material: 'Sterling Silver (.925)',
          condition: 'Polished · original patina'
        };
      case 'lot-704':
        return {
          aboutText:
            'Nocturnal industrial landscape depicting Pittsburgh blast furnaces reflecting across river waters. Signed lower left in period carved giltwood frame.',
          yearOrigin: 'c. 1912 · Pittsburgh, PA',
          material: 'Oil on linen canvas',
          condition: 'Conserved · framed original'
        };
      case 'lot-705':
        return {
          aboutText:
            'High-grade 18-karat yellow gold hunter-case pocket watch featuring 21-jewel Swiss movement, enamel dial with Roman numerals, and engine-turned scroll case.',
          yearOrigin: 'c. 1905 · Switzerland',
          material: '18k Yellow Gold · Enamel',
          condition: 'Running · excellent case'
        };
      case 'lot-706':
        return {
          aboutText:
            'First year of issue Augustus Saint-Gaudens Indian Head design struck without motto. Displays radiant honey luster with pristine fields and sharp feather definition.',
          yearOrigin: '1907 · Philadelphia, PA',
          material: 'Gold · $10 denomination',
          condition: 'PCGS MS-63 · certified'
        };
      case 'lot-707':
        return {
          aboutText:
            'Geometric French platinum link articulated bracelet mounted with 28 matched calibre-cut untreated Ceylon blue sapphires and 4.2 carats of transition-cut diamonds.',
          yearOrigin: 'c. 1925 · Paris, France',
          material: 'Platinum, Sapphire & Diamond',
          condition: 'Pristine · clasp secure'
        };
      case 'lot-708':
        return {
          aboutText:
            'Dramatic atmospheric night vista of the Monongahela River industrial corridor with smoke plumes illuminated by Bessemer converters. Original Pittsburgh provenance.',
          yearOrigin: '1916 · Pennsylvania',
          material: 'Oil on artist board',
          condition: 'Cleaned · museum glaze'
        };
      case 'lot-709':
        return {
          aboutText:
            'Philadelphia blockfront four-drawer bureau with carved fan prospect door, fluted quarter columns, and bold ogee bracket feet. Retains original brasses.',
          yearOrigin: 'c. 1775 · Philadelphia, PA',
          material: 'Carved solid mahogany',
          condition: 'Historic patina · all original'
        };
      case 'lot-710':
        return {
          aboutText:
            'Classic monochromatic silver sunburst dial chronograph with tachymeter track and Valjoux 72 manual-wind movement in an unpolished stainless steel Oyster case.',
          yearOrigin: '1964 · Geneva, Switzerland',
          material: 'Stainless Steel · Valjoux 72',
          condition: 'Collector grade · serviced'
        };
      case 'lot-711':
        return {
          aboutText:
            'Handwritten folio letter regarding Revolutionary War militia supply logistics, with complete wax seal remnant and ink docketing on heavy chain-laid rag paper.',
          yearOrigin: '1776 · Philadelphia, PA',
          material: 'Rag paper · iron gall ink',
          condition: 'Archivally stabilized'
        };
      case 'lot-712':
        return {
          aboutText:
            'Early production Herman Miller model 670 & 671 featuring figured Brazilian rosewood five-ply shells and supple black glove leather cushions with down filling.',
          yearOrigin: '1968 · Zeeland, Michigan',
          material: 'Rosewood, Leather & Cast Alum',
          condition: 'Light patina · patent labels'
        };
      case 'lot-713':
        return {
          aboutText:
            'High-grade manual-wind observatory chronometer with Breguet overcoil hairspring, Geneva seal finishing, and immaculate guilloché silver dial.',
          yearOrigin: '1968 · Le Locle, Switzerland',
          material: 'Solid 18k Gold & Sapphire',
          condition: 'Pristine · archival papers'
        };
      case 'lot-714':
        return {
          aboutText:
            'Museum-exhibited maritime landscape captured with rich nocturnal chiaroscuro and masterfully layered tonal glazes in an ornate giltwood frame.',
          yearOrigin: 'c. 1895 · Boston, MA',
          material: 'Oil on linen canvas',
          condition: 'Conserved · original frame'
        };
      default:
        return {
          aboutText: lot.description,
          yearOrigin: '1924 · United States',
          material: 'Museum / Collector Grade',
          condition: 'Certified · Authenticated'
        };
    }
  };

  // =========================================================================
  // VIEW LOT DETAIL VIEW (DESKTOP PAGE LAYOUT MATCHING USER SCREENSHOT)
  // =========================================================================
  if (activeDetailLot) {
    const currentInputVal = parseInt(customBidInput, 10) || (activeDetailLot.currentBid + (activeDetailLot.presets[0] || 100));
    const buyersPremiumAmount = Math.round(currentInputVal * 0.15);
    const hammerTotal = currentInputVal + buyersPremiumAmount;
    const lotAbout = getLotAboutDetails(activeDetailLot);

    const lowEstimate = Math.round(activeDetailLot.currentBid * 0.90);
    const highEstimate = Math.round(activeDetailLot.currentBid * 1.15);
    const progressPercent = Math.min(100, Math.max(10, Math.round((activeDetailLot.currentBid / highEstimate) * 100)));

    return (
      <div className={`cap-curated-page-root cap-terminal-root ${isLightTheme ? 'cap-theme-light' : 'cap-theme-dark'}`}>
        <div className="cap-terminal-wrapper">
          {/* Top Bar: Sovereign Galleries, Terminal Connected, Paddle info, Audio, Close button */}
          <header className="cap-terminal-topbar">
            <div className="cap-terminal-brand">
              <div className="cap-terminal-gold-icon">
                <Crown size={15} />
              </div>
              <div className="cap-terminal-brand-titles">
                <span className="cap-terminal-gallery-name">SOVEREIGN GALLERIES</span>
                <span className="cap-terminal-session-name">Session II: Rarities of the United States Mint</span>
              </div>
            </div>

            <div className="cap-terminal-status-pill">
              <span className="cap-pulse-green-dot" />
              <span className="cap-status-bold">Terminal Connected</span>
              <span className="cap-status-sep">·</span>
              <span className="cap-status-muted">Clerk Audio: Synchronized</span>
            </div>

            <div className="cap-terminal-top-actions">
              <div className="cap-terminal-paddle-badge">
                <span className="cap-paddle-lbl">Assigned Paddle:</span>
                <strong className="cap-paddle-val">#518-APP</strong>
                <span className="cap-paddle-divider">|</span>
                <span className="cap-paddle-lbl">Approved Limit:</span>
                <strong className="cap-paddle-val">$75,000</strong>
              </div>

              {/* Light / Dark Mode Quick Switcher */}
              <button
                type="button"
                className="cap-terminal-theme-btn"
                onClick={() => setIsLightTheme(!isLightTheme)}
                title={isLightTheme ? "Switch to Dark Theme" : "Switch to Light Theme"}
                aria-label="Toggle Theme Mode"
              >
                {isLightTheme ? <Moon size={14} /> : <Sun size={14} />}
                <span className="cap-theme-btn-text">{isLightTheme ? 'Dark Mode' : 'Light Mode'}</span>
              </button>

              <button
                type="button"
                className={`cap-terminal-icon-btn ${isAudioMuted ? 'muted' : ''}`}
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                aria-label="Toggle Clerk Audio"
              >
                {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              <button
                type="button"
                className="cap-terminal-close-btn"
                onClick={() => setActiveDetailLotId(null)}
                title="Back to Catalog"
                aria-label="Close Lot View"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Main Lot Banner Header: LOT 104, Breadcrumb, Reserve Met, Big Title, Subtitle, Live Timer, Cam */}
          <div className="cap-terminal-lot-header">
            <div className="cap-lot-header-left">
              <div className="cap-lot-tags-row">
                <span className="cap-lot-pill-gold">{activeDetailLot.lotNumber}</span>
                <span className="cap-lot-cat-breadcrumb">{activeDetailLot.categoryTag} • U.S. DOUBLE EAGLES</span>
                <span className="cap-reserve-met-badge">
                  <Shield size={12} className="cap-shield-icon" />
                  Reserve Met
                </span>
              </div>

              <h1 className="cap-terminal-lot-title">{activeDetailLot.title}</h1>
              <p className="cap-terminal-lot-sub">
                {activeDetailLot.description} • Pop 12/None Finer • Lustrous Original Mint Frost &amp; Deep Die Polish Fields
              </p>
            </div>

            <div className="cap-lot-header-right">
              <div className="cap-live-floor-box">
                <span className="cap-red-pulse-dot" />
                <span className="cap-live-floor-label">LIVE LOT FLOOR</span>
                <span className="cap-live-floor-timer">{formatTime(timeLeft)}</span>
              </div>

              <button
                type="button"
                className="cap-floor-cam-btn"
                onClick={() => onAddToast('info', 'Floor Cam Stream', 'Connecting to high-definition main ballroom floor camera feed...')}
              >
                <Radio size={14} className="cap-cam-icon" />
                Floor Cam HD
              </button>
            </div>
          </div>

          {/* Two-Column Grid: Left (Stage, Dossier, Chart) | Right (Live Bid Console, Recent Bids) */}
          <div className="cap-terminal-grid">
            {/* Left Column (Approx 58% width) */}
            <div className="cap-terminal-col-left">
              {/* Card 1: Interactive Stage */}
              <div className="cap-terminal-card cap-stage-card">
                <div className="cap-stage-viewport">
                  {/* Stage Top Controls Overlay */}
                  <div className="cap-stage-overlay-top">
                    <span className="cap-pcgs-badge">
                      <Shield size={12} />
                      PCGS MS67 WIRE EDGE
                    </span>
                    <span className="cap-cert-pill">Cert #34567890</span>

                    <div className="cap-stage-tools">
                      <button
                        type="button"
                        className="cap-stage-tool-btn"
                        onClick={() => setStageZoom(!stageZoom)}
                        title="Zoom Image"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        className="cap-stage-tool-btn"
                        onClick={() => setStageRotated(!stageRotated)}
                        title="Rotate / Flip View"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        type="button"
                        className="cap-stage-tool-btn"
                        onClick={() => onAddToast('info', 'High Res View', 'Opening ultra-high resolution inspection viewer.')}
                        title="Inspect"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Lot Authentic Image (User said: "bs image jo h whi use krna baki kuch chnage mt krna") */}
                  <div className={`cap-stage-img-frame ${stageZoom ? 'zoomed' : ''} ${stageRotated ? 'rotated' : ''}`}>
                    <img
                      src={activeDetailLot.image}
                      alt={activeDetailLot.title}
                      className="cap-terminal-main-image"
                    />
                  </div>

                  {/* Stage Bottom Controls Overlay */}
                  <div className="cap-stage-overlay-bottom">
                    <span className="cap-drag-hint">👆 Hover &amp; drag to examine wire edge detail</span>
                    <span className="cap-nfc-tag">
                      <Shield size={12} />
                      NFC AUTHENTICATED HOLDER
                    </span>
                  </div>
                </div>

                {/* Sub-stage thumbnails and verification */}
                <div className="cap-stage-sub-bar">
                  <div className="cap-view-thumbs-list">
                    {(['obverse', 'reverse', 'edge view', 'full slab'] as const).map((angle) => (
                      <button
                        key={angle}
                        type="button"
                        className={`cap-view-thumb-pill ${activeThumb === angle ? 'active' : ''}`}
                        onClick={() => setActiveThumb(angle)}
                      >
                        <span className="cap-thumb-dot" />
                        {angle.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="cap-cac-verified-badge">
                    <div className="cap-cac-icon">
                      <Shield size={14} />
                    </div>
                    <div className="cap-cac-text">
                      <span className="cap-cac-title">PCGS CAC Verified</span>
                      <span className="cap-cac-sub">Population 12 · None Higher</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: LOT DOSSIER & SPECIFICATIONS */}
              <div className="cap-terminal-card cap-dossier-card">
                <div className="cap-dossier-header">
                  <div className="cap-dossier-title-wrap">
                    <Feather size={15} className="cap-gold-quill-icon" />
                    <span className="cap-dossier-title">LOT DOSSIER &amp; SPECIFICATIONS</span>
                  </div>

                  <div className="cap-dossier-tabs" role="tablist">
                    {(['specs', 'provenance', 'condition', 'vaulting'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`cap-dossier-tab-btn ${activeDossierTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveDossierTab(tab)}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cap-dossier-narrative">
                  {activeDossierTab === 'specs' && (
                    <p>
                      An impeccably preserved, museum-grade {activeDetailLot.title} exhibiting the celebrated high-relief Liberty design by Augustus Saint-Gaudens. Struck with razor-sharp wire rims, deeply frosted central devices, and swirling cartwheel luster across both obverse and reverse fields. Sealed within an archival PCGS security slab.
                    </p>
                  )}
                  {activeDossierTab === 'provenance' && (
                    <p>
                      Private Philadelphia Collector (1924–1968) · Acquired at Sotheby's New York Fine Numismatics Session (1989, Lot 342) · Private Sovereign Vault Repository (2014–Present). All transfer certificates intact.
                    </p>
                  )}
                  {activeDossierTab === 'condition' && (
                    <p>
                      Flawless surface preservation with complete wire rim extension. Unbroken original mint frost accompanied by sharp central feather definition and vivid golden-amber patina. Graded MS-67 by PCGS with CAC gold endorsement.
                    </p>
                  )}
                  {activeDossierTab === 'vaulting' && (
                    <p>
                      Depository custody at Armored Brink’s High-Security Depository (New York). Covered by comprehensive marine and vaulting insurance policy up to $100,000 USD. Immediate secure courier transit upon cleared settlement.
                    </p>
                  )}
                </div>

                <div className="cap-dossier-metrics-grid">
                  <div className="cap-spec-box">
                    <span className="cap-spec-label">YEAR / ORIGIN</span>
                    <strong className="cap-spec-val">{lotAbout.yearOrigin}</strong>
                    <span className="cap-spec-sub">Philadelphia Mint</span>
                  </div>

                  <div className="cap-spec-box">
                    <span className="cap-spec-label">COMPOSITION</span>
                    <strong className="cap-spec-val">{lotAbout.material}</strong>
                    <span className="cap-spec-sub">0.9675 oz Net AGW</span>
                  </div>

                  <div className="cap-spec-box">
                    <span className="cap-spec-label">CERTIFIED GRADE</span>
                    <strong className="cap-spec-val cap-gold-accent">PCGS MS-67</strong>
                    <span className="cap-spec-sub">Wire Edge Sharp</span>
                  </div>

                  <div className="cap-spec-box">
                    <span className="cap-spec-label">INSURED VALUE</span>
                    <strong className="cap-spec-val cap-green-accent">$35,000 USD</strong>
                    <span className="cap-spec-sub">Armored Brink's</span>
                  </div>
                </div>
              </div>

              {/* Card 3: BID HISTORY PROGRESSION (Glowing Chart) */}
              <div className="cap-terminal-card cap-progression-chart-card">
                <div className="cap-chart-header-row">
                  <div className="cap-chart-title-left">
                    <strong className="cap-chart-heading">BID HISTORY PROGRESSION</strong>
                    <span className="cap-chart-subheading">Dynamic pacing across {activeDetailLot.bidsCount + 12} registered competitive bids</span>
                  </div>

                  <span className="cap-chart-est-badge">+14.2% Over Low Est.</span>
                </div>

                <div className="cap-svg-chart-container">
                  <svg viewBox="0 0 680 180" className="cap-progression-svg" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="terminal-gold-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dfba52" stopOpacity="0.25" />
                        <stop offset="60%" stopColor="#dfba52" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#dfba52" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="terminal-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#dfba52" floodOpacity="0.45" />
                      </filter>
                    </defs>

                    {/* Area under curve */}
                    <path
                      d="M 30 148 L 120 138 L 240 128 L 380 112 L 510 94 L 640 60 L 640 170 L 30 170 Z"
                      fill="url(#terminal-gold-fill)"
                    />

                    {/* Main stroke line */}
                    <path
                      d="M 30 148 L 120 138 L 240 128 L 380 112 L 510 94 L 640 60"
                      fill="none"
                      stroke="#dfba52"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#terminal-glow)"
                    />

                    {/* Data dots */}
                    <circle cx="30" cy="148" r="4.5" fill="#ffffff" stroke="#dfba52" strokeWidth="2.5" />
                    <circle cx="120" cy="138" r="4.5" fill="#ffffff" stroke="#dfba52" strokeWidth="2.5" />
                    <circle cx="240" cy="128" r="4.5" fill="#ffffff" stroke="#dfba52" strokeWidth="2.5" />
                    <circle cx="380" cy="112" r="4.5" fill="#ffffff" stroke="#dfba52" strokeWidth="2.5" />
                    <circle cx="510" cy="94" r="4.5" fill="#ffffff" stroke="#dfba52" strokeWidth="2.5" />

                    {/* Active Pulsing Head Dot */}
                    <circle cx="640" cy="60" r="10" fill="none" stroke="#dfba52" strokeWidth="1.5" opacity="0.6" />
                    <circle cx="640" cy="60" r="6" fill="#ffffff" stroke="#dfba52" strokeWidth="3" />
                  </svg>

                  <div className="cap-chart-x-axis">
                    <span>2:40 PM (Open)</span>
                    <span>3:15 PM</span>
                    <span>3:50 PM</span>
                    <span>4:30 PM</span>
                    <span className="cap-now-point">4:47 PM (Now: ${activeDetailLot.currentBid.toLocaleString()})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Approx 42% width) */}
            <div className="cap-terminal-col-right">
              {/* Card 1: Live Bidding Console */}
              <div className="cap-terminal-card cap-console-card">
                <div className="cap-console-top-row">
                  <div className="cap-console-bid-block">
                    <span className="cap-console-lbl">CURRENT HIGH BID</span>
                    <div className="cap-console-price-row">
                      <span className={`cap-console-price ${isBidFlashing ? 'bid-flash' : ''}`}>
                        ${activeDetailLot.currentBid.toLocaleString()}
                      </span>
                      <span className="cap-winning-floor-pill">Winning: Floor #219</span>
                    </div>
                  </div>

                  <div className="cap-console-inc-block">
                    <span className="cap-console-lbl">NEXT MIN INCREMENT</span>
                    <strong className="cap-inc-val">+$100</strong>
                  </div>
                </div>

                {/* Estimate Range & Dynamic Bar */}
                <div className="cap-console-estimate-box">
                  <div className="cap-est-labels-row">
                    <span className="cap-est-txt">Estimate Range</span>
                    <strong className="cap-est-range-val">{activeDetailLot.estimate}</strong>
                  </div>

                  <div className="cap-est-progress-track">
                    <div className="cap-est-progress-fill" style={{ width: `${progressPercent}%` }} />
                    <div className="cap-est-marker" style={{ left: `${progressPercent}%` }} />
                  </div>

                  <div className="cap-est-sub-row">
                    <span>Low: ${lowEstimate.toLocaleString()}</span>
                    <span className="cap-est-highlight">Current at {progressPercent}% of High</span>
                    <span>High: ${highEstimate.toLocaleString()}</span>
                  </div>
                </div>

                {/* Quick Increment Pre-Select Buttons */}
                <div className="cap-console-increments-section">
                  <span className="cap-console-sec-title">QUICK INCREMENT PRE-SELECT</span>
                  <div className="cap-quick-increments-grid">
                    {[100, 250, 500].map((inc) => {
                      const targetAmt = activeDetailLot.currentBid + inc;
                      const isSelected = selectedPresetInc === inc && parseInt(customBidInput, 10) === targetAmt;

                      return (
                        <button
                          key={inc}
                          type="button"
                          className={`cap-quick-inc-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectPreset(inc, activeDetailLot.currentBid)}
                        >
                          <span className="cap-inc-add">+ ${inc}</span>
                          <strong className="cap-inc-total">${targetAmt.toLocaleString()}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bid Input & PLACE LIVE BID Button */}
                <div className="cap-console-cta-row">
                  <div className="cap-bid-input-container">
                    <span className="cap-input-dollar-sign">$</span>
                    <input
                      type="number"
                      value={customBidInput}
                      onChange={(e) => {
                        setCustomBidInput(e.target.value);
                        setSelectedPresetInc(0);
                        setBidError(null);
                      }}
                      className="cap-console-number-input"
                      aria-label="Custom Bid Amount"
                    />
                  </div>

                  <button
                    type="button"
                    className="cap-place-live-bid-btn"
                    onClick={() => handlePlaceBid(activeDetailLot)}
                  >
                    PLACE LIVE BID
                    <Gavel size={16} className="cap-btn-gavel-icon" />
                  </button>
                </div>

                {bidError && <div className="cap-bid-error-msg">{bidError}</div>}

                {/* Buyer's Premium & Total Box */}
                <div className="cap-console-totals-box">
                  <div className="cap-total-row">
                    <span>Buyer's Premium (15%):</span>
                    <strong>${buyersPremiumAmount.toLocaleString()}</strong>
                  </div>
                  <div className="cap-total-row highlight">
                    <span>Total Due at Hammer:</span>
                    <strong className="cap-hammer-val">${hammerTotal.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="cap-legal-disclaimer">
                  ⚖️ Bids are legally binding. Certified funds required within 7 days.
                </div>
              </div>

              {/* Card 2: RECENT BIDS • FLOOR & REMOTE Feed */}
              <div className="cap-terminal-card cap-live-feed-card">
                <div className="cap-feed-header">
                  <div className="cap-feed-title-left">
                    <span className="cap-pulse-green-dot" />
                    <span className="cap-feed-title">RECENT BIDS • FLOOR &amp; REMOTE</span>
                  </div>
                  <span className="cap-feed-counter">Total: 24 bids</span>
                </div>

                <div className="cap-feed-list">
                  {activeDetailLot.recentBids.map((b, idx) => {
                    const isTop = idx === 0 || b.isHighest;

                    return (
                      <div key={b.id} className={`cap-feed-item ${isTop ? 'winning' : ''}`}>
                        <div className={`cap-feed-icon ${isTop ? 'gold-phone' : (b.type === 'PHONE' ? 'muted-phone' : b.type === 'FLOOR' ? 'muted-users' : 'muted-webcast')}`}>
                          {b.type === 'PHONE' ? <Phone size={isTop ? 15 : 14} /> : b.type === 'FLOOR' ? <Users size={14} /> : <Radio size={14} />}
                        </div>
                        <div className="cap-feed-mid">
                          <div className="cap-feed-paddle-row">
                            <strong className="cap-feed-paddle">{b.paddle}</strong>
                            <span className={`cap-type-pill ${getBadgeClass(b.type)}`}>{b.type}</span>
                          </div>
                          <span className="cap-feed-time">{b.time}</span>
                        </div>
                        <div className="cap-feed-right">
                          <span className={`cap-feed-amount ${isTop ? 'gold' : ''}`}>${b.amount.toLocaleString()}</span>
                          {isTop && <span className="cap-high-bidder-tag">HIGH BIDDER</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Protocol Banner & Security Badges */}
          <div className="cap-terminal-protocol-banner">
            <div className="cap-protocol-notice-row">
              <span className="cap-gold-dot">•</span>
              <strong className="cap-protocol-lead">LIVE AUCTION PROTOCOL</strong>
              <span className="cap-protocol-body">
                Bid activity and hammer figures update with sub-second latency. Bidder identities are masked for discretion.
              </span>
            </div>

            <div className="cap-protocol-badges-row">
              <span className="cap-proto-badge">
                <Lock size={13} className="cap-badge-ico" />
                TLS 1.3 256-bit Encrypted
              </span>
              <span className="cap-proto-badge">
                <Shield size={13} className="cap-badge-ico" />
                100% PCGS Authenticity Guarantee
              </span>
              <span className="cap-proto-badge">
                <Truck size={13} className="cap-badge-ico" />
                Vaulting &amp; Armored Transit
              </span>
            </div>
          </div>

          {/* Bottom Meta Bar */}
          <footer className="cap-terminal-meta-footer">
            <div className="cap-meta-col-left">
              <span>Session ID: <strong>#NY-2024-OCT-104</strong></span>
              <span className="cap-meta-pipe">|</span>
              <span>Auctioneer: <strong>M. Sterling (Lic #84210)</strong></span>
            </div>
            <div className="cap-meta-col-right">
              <span>Time Zone: <strong>New York (EDT UTC-4)</strong></span>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CATALOG COLLECTION GRID VIEW (WITH EXPANDED PRODUCT TYPES & VIEW MORE)
  // =========================================================================
  return (
    <div className="cap-curated-page-root">
      <div className="cap-page-container">
        {/* Top Hero Banner */}
        <header className="cap-hero-header">
          <div className="cap-hero-text-block">
            <span className="cap-hero-tag">BROWSE AUCTION LOTS</span>
            <h1 className="cap-hero-title">Find something remarkable.</h1>
            <p className="cap-hero-sub">Choose a product type and explore the lots in this auction.</p>
          </div>

          <div className="cap-hero-search-wrap">
            <Search size={16} className="cap-search-icon" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search products or lot number"
              className="cap-hero-search-input"
              aria-label="Search products or lot number"
            />
            {localSearch && (
              <button
                type="button"
                className="cap-search-clear-btn"
                onClick={() => setLocalSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        {/* Main 2-Column Catalog Body */}
        <div className="cap-main-catalog-layout">
          {/* Left Column: Expanded Product Types Sidebar Card */}
          <aside className="cap-sidebar-card" aria-label="Product Types Filter">
            <div className="cap-sidebar-top-section">
              <h2 className="cap-sidebar-title">Product types</h2>
              <p className="cap-sidebar-hint">
                Choose a type to explore the products available in this auction.
              </p>

              <nav className="cap-category-list" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'all'}
                  className={`cap-cat-item ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  <span className="cap-cat-name">All products</span>
                  <span className="cap-cat-badge">{counts.all}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'coins'}
                  className={`cap-cat-item ${selectedCategory === 'coins' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('coins')}
                >
                  <span className="cap-cat-name">Coins &amp; currency</span>
                  <span className="cap-cat-badge">{counts.coins}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'jewelry'}
                  className={`cap-cat-item ${selectedCategory === 'jewelry' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('jewelry')}
                >
                  <span className="cap-cat-name">Jewelry &amp; watches</span>
                  <span className="cap-cat-badge">{counts.jewelry}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'art'}
                  className={`cap-cat-item ${selectedCategory === 'art' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('art')}
                >
                  <span className="cap-cat-name">Fine art</span>
                  <span className="cap-cat-badge">{counts.art}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'antiques'}
                  className={`cap-cat-item ${selectedCategory === 'antiques' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('antiques')}
                >
                  <span className="cap-cat-name">Antiques &amp; silver</span>
                  <span className="cap-cat-badge">{counts.antiques}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'horology'}
                  className={`cap-cat-item ${selectedCategory === 'horology' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('horology')}
                >
                  <span className="cap-cat-name">Horology &amp; timepieces</span>
                  <span className="cap-cat-badge">{counts.horology}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'americana'}
                  className={`cap-cat-item ${selectedCategory === 'americana' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('americana')}
                >
                  <span className="cap-cat-name">Americana &amp; manuscripts</span>
                  <span className="cap-cat-badge">{counts.americana}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'decorative'}
                  className={`cap-cat-item ${selectedCategory === 'decorative' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('decorative')}
                >
                  <span className="cap-cat-name">Mid-century &amp; decorative</span>
                  <span className="cap-cat-badge">{counts.decorative}</span>
                </button>
              </nav>
            </div>

            <div className="cap-sidebar-bottom-section">
              <div className="cap-sidebar-divider" />
              <div className="cap-sidebar-footer">
                <span className="cap-sub-label">Showing lots from</span>
                <strong className="cap-session-name">Spring Collector Auction</strong>
                <span className="cap-session-schedule">Ends today · 4:30 PM EST</span>
              </div>
            </div>
          </aside>

          {/* Right Column: Collection Header, Filter Tabs & Product Cards Grid */}
          <section className="cap-catalog-content" aria-label="Curated Lots Collection">
            <div className="cap-content-header">
              <div className="cap-content-title-wrap">
                <span className="cap-gold-tag">SPRING COLLECTOR AUCTION</span>
                <h2 className="cap-content-main-title">{getCategoryTitle()}</h2>
              </div>
              <span className="cap-lots-counter">
                {filteredLots.length} {filteredLots.length === 1 ? 'lot' : 'lots'} · curated collection
              </span>
            </div>

            <div className="cap-controls-bar">
              <div className="cap-filter-pills" role="tablist">
                <button
                  type="button"
                  className={`cap-pill-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`cap-pill-btn ${activeTab === 'ending' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ending')}
                >
                  Ending soon
                </button>
                <button
                  type="button"
                  className={`cap-pill-btn ${activeTab === 'featured' ? 'active' : ''}`}
                  onClick={() => setActiveTab('featured')}
                >
                  Featured
                </button>
              </div>

              <div className="cap-sort-dropdown-wrap">
                <span className="cap-sort-label">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="cap-sort-select"
                  aria-label="Sort lots"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="bids">Most Bids</option>
                </select>
                <ChevronDown size={14} className="cap-select-arrow" />
              </div>
            </div>

            {/* Grid of Lot Cards (Displays 6 initially, expandable) */}
            {filteredLots.length === 0 ? (
              <div className="cap-empty-state">
                <p>No products match your current filters or search term.</p>
                <button
                  type="button"
                  className="cap-reset-btn"
                  onClick={() => {
                    setSelectedCategory('all');
                    setActiveTab('all');
                    setLocalSearch('');
                  }}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="cap-products-scroll-wrapper" ref={scrollContainerRef}>
                <div className="cap-products-grid">
                  {paginatedLots.map((lot) => {
                    const isWatchlisted = watchlist.includes(lot.id);

                    return (
                      <article key={lot.id} className="cap-lot-card">
                        <div className="cap-card-stage-container">
                          <img
                            src={lot.image}
                            alt={lot.title}
                            className="cap-card-img"
                            loading="lazy"
                          />
                          <div className="cap-stage-gradient-overlay" />

                          <div className="cap-lot-badge">{lot.lotNumber}</div>

                          <button
                            type="button"
                            className={`cap-wishlist-btn ${isWatchlisted ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(lot.id);
                              onAddToast(
                                'info',
                                isWatchlisted ? 'Removed from Watchlist' : 'Added to Watchlist',
                                `${lot.lotNumber}: ${lot.title}`
                              );
                            }}
                            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                            aria-label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          >
                            <Heart
                              size={16}
                              fill={isWatchlisted ? '#e11d48' : 'none'}
                              stroke={isWatchlisted ? '#e11d48' : '#ffffff'}
                            />
                          </button>
                        </div>

                        <div className="cap-card-body">
                          <div className="cap-card-meta-row">
                            <span className="cap-card-cat-tag">{lot.categoryTag}</span>
                            <span className="cap-card-bid-val">${lot.currentBid.toLocaleString()}</span>
                          </div>

                          <h3 className="cap-card-title" title={lot.title}>
                            {lot.title}
                          </h3>

                          <p className="cap-card-desc">{lot.description}</p>

                          <div className="cap-card-divider" />

                          <div className="cap-card-footer">
                            <span className="cap-card-bid-count">
                              Current bid · {lot.bidsCount} bids
                            </span>

                            <button
                              type="button"
                              className={`cap-view-lot-btn ${lot.buttonVariant === 'gold' ? 'btn-gold' : 'btn-dark'}`}
                              onClick={() => {
                                setActiveDetailLotId(lot.id);
                              }}
                            >
                              VIEW LOT
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination Controls when lots exceed 6 */}
                {totalPages > 1 && (
                  <div className="cap-pagination-container">
                    <nav className="cap-pagination-nav" aria-label="Catalog lots pagination">
                      <button
                        type="button"
                        className="cap-page-nav-btn cap-page-prev-btn"
                        disabled={safeCurrentPage === 1}
                        onClick={() => handlePageChange(safeCurrentPage - 1)}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                        <span>PREV</span>
                      </button>

                      <div className="cap-page-numbers-list">
                        {getPageNumbers().map((pageNum, idx) => {
                          if (pageNum === '...') {
                            return (
                              <span key={`dots-${idx}`} className="cap-page-dots">
                                ...
                              </span>
                            );
                          }
                          const isCurrent = pageNum === safeCurrentPage;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              className={`cap-page-number-btn ${isCurrent ? 'active' : ''}`}
                              onClick={() => handlePageChange(Number(pageNum))}
                              aria-current={isCurrent ? 'page' : undefined}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="cap-page-nav-btn cap-page-next-btn"
                        disabled={safeCurrentPage === totalPages}
                        onClick={() => handlePageChange(safeCurrentPage + 1)}
                        aria-label="Next page"
                      >
                        <span>NEXT</span>
                        <ChevronRight size={16} />
                      </button>
                    </nav>
                  </div>
                )}

                {filteredLots.length > 0 && (
                  <div className="cap-catalog-end-bar">
                    <div className="cap-end-bar-line" />
                    <div className="cap-end-bar-content">
                      <span className="cap-end-bar-text">
                        {totalPages > 1
                          ? `Showing ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                              safeCurrentPage * ITEMS_PER_PAGE,
                              filteredLots.length
                            )} of ${filteredLots.length} lots (Page ${safeCurrentPage} of ${totalPages})`
                          : `Showing all ${filteredLots.length} ${filteredLots.length === 1 ? 'lot' : 'lots'} in this session`}
                      </span>
                      <button
                        type="button"
                        className="cap-btn-back-top"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        title="Back to top"
                        aria-label="Back to top"
                      >
                        <ArrowUp size={14} />
                        <span>Back to top</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Bidder Trust Protocol Section */}
        <section className="cap-trust-protocol-section" aria-label="Bidder Trust Protocol">
          <div className="cap-trust-header">
            <span className="cap-trust-eyebrow">BIDDER TRUST PROTOCOL</span>
            <h2 className="cap-trust-title">Participating with confidence</h2>
            <p className="cap-trust-sub">
              A transparent, regulated auction experience, backed by clear bidder protections.
            </p>
          </div>

          <div className="cap-trust-cards-grid">
            {/* Card 01 */}
            <div className="cap-trust-card">
              <div className="cap-trust-card-top">
                <div className="cap-trust-icon-box">
                  <Search size={16} />
                </div>
                <span className="cap-trust-step-num">01</span>
              </div>
              <h3 className="cap-trust-card-title">Discover auctions</h3>
              <p className="cap-trust-card-desc">
                Review condition reports, certification details, provenance and scheduled preview times before bidding.
              </p>
            </div>

            {/* Card 02 */}
            <div className="cap-trust-card">
              <div className="cap-trust-card-top">
                <div className="cap-trust-icon-box">
                  <Gavel size={16} />
                </div>
                <span className="cap-trust-step-num">02</span>
              </div>
              <h3 className="cap-trust-card-title">Register &amp; get approved</h3>
              <p className="cap-trust-card-desc">
                Complete bidder verification and choose floor, phone, absentee or webcast bidding.
              </p>
            </div>

            {/* Card 03 */}
            <div className="cap-trust-card">
              <div className="cap-trust-card-top">
                <div className="cap-trust-icon-box">
                  <Diamond size={16} />
                </div>
                <span className="cap-trust-step-num">03</span>
              </div>
              <h3 className="cap-trust-card-title">Win &amp; settle securely</h3>
              <p className="cap-trust-card-desc">
                See the buyer's premium before bidding, then arrange secure payment and insured delivery.
              </p>
            </div>
          </div>

          {/* Bottom 4 Trust Seals Banner */}
          <div className="cap-trust-seals-strip">
            <div className="cap-seal-item">
              <Gavel size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">PA-LICENSED AUCTIONEER</strong>
                <span className="cap-seal-sub">Regulated under PA Act 85 · AY-002004</span>
              </div>
            </div>

            <div className="cap-seal-item">
              <Lock size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">LICENSED &amp; BONDED</strong>
                <span className="cap-seal-sub">$500,000 surety bond with Commonwealth</span>
              </div>
            </div>

            <div className="cap-seal-item">
              <Percent size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">15% BUYER'S PREMIUM</strong>
                <span className="cap-seal-sub">Competitive, transparent fee rates</span>
              </div>
            </div>

            <div className="cap-seal-item">
              <FileCheck size={16} className="cap-seal-icon" />
              <div className="cap-seal-texts">
                <strong className="cap-seal-title">TITLE GUARANTEE</strong>
                <span className="cap-seal-sub">100% unconditional authenticity</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
