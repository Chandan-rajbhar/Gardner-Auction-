import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Auction,
  LotItem,
  UserBidder,
  LiveBid,
  InvoiceSettlement,
  ActivityLog,
  NavigationSection
} from '../../types';
import {
  formatCurrency,
  formatNumber,
  formatDate
} from '../../utils/formatters';
import {
  Layers,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Upload,
  Gavel,
  Radio,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Search,
  ChevronRight,
  Info,
  X,
  CreditCard,
  AlertTriangle,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  UserCheck,
  RotateCcw,
  Check,
  ArrowUpRight
} from 'lucide-react';
import { AuctionAnalyticsChart } from './AuctionAnalyticsChart';
import {
  dashboardService,
  DashboardSyndicationRow,
  DashboardBidderRow,
  DashboardOperationalException,
  DashboardMetrics
} from '../../services/dashboardService';
import { lotsService } from '../../services/lotsService';
import { supabase } from '../../lib/supabase';
import { TableRowActionMenu, TableActionItem } from '../Common/TableRowActionMenu';
import { ShadcnPagination } from '../ui/ShadcnPagination';
import { ShadcnSheet } from '../ui/ShadcnSheet';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import { useToast } from '../../context/ToastContext';

interface OverviewViewProps {
  auction: Auction;
  lots: LotItem[];
  bidders: UserBidder[];
  bids?: LiveBid[];
  invoices?: InvoiceSettlement[];
  logs?: ActivityLog[];
  onNavigate: (section: NavigationSection) => void;
  onSyncHiBid: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  auction,
  lots: initialLots,
  bidders: initialBidders,
  bids: initialBids = [],
  invoices = [],
  logs = [],
  onNavigate,
  onSyncHiBid
}) => {
  const { showToast } = useToast();


  const [copiedCode, setCopiedCode] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'info' | 'bidders' | 'lotsSummary'>('info');

  // Live Supabase database states
  const [lots, setLots] = useState<LotItem[]>(initialLots);
  const [syndications, setSyndications] = useState<DashboardSyndicationRow[]>([]);
  const [bidderRegistrations, setBidderRegistrations] = useState<DashboardBidderRow[]>([]);
  const [liveBids, setLiveBids] = useState<LiveBid[]>(initialBids);
  const [exceptions, setExceptions] = useState<DashboardOperationalException[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Table 1: Syndication Table State
  const [syndicationSearch, setSyndicationSearch] = useState('');
  const [syndicationStatusFilter, setSyndicationStatusFilter] = useState<'all' | 'Online' | 'Standby'>('all');
  const [syndicationPage, setSyndicationPage] = useState(1);
  const [syndicationPageSize, setSyndicationPageSize] = useState(10);
  const [isSyndicationColSettingsOpen, setIsSyndicationColSettingsOpen] = useState(false);
  const defaultSyndicationCols = [
    'site',
    'status',
    'registrations',
    'ccAuths',
    'views',
    'uniqueBidders',
    'uniqueBids',
    'totalBids',
    'highBid',
    'maxBid',
    'actions'
  ];
  const [visibleSyndicationCols, setVisibleSyndicationCols] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('af360_syndication_columns');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return defaultSyndicationCols;
  });

  // Table 2: Bidders Table State (Tab 2)
  const [bidderSearch, setBidderSearch] = useState('');
  const [bidderStatusFilter, setBidderStatusFilter] = useState<string>('all');
  const [bidderPage, setBidderPage] = useState(1);
  const [bidderPageSize, setBidderPageSize] = useState(10);
  const [isBidderColSettingsOpen, setIsBidderColSettingsOpen] = useState(false);
  const defaultBidderCols = [
    'paddleNumber',
    'name',
    'siteOrigin',
    'creditCardAuth',
    'bidLimit',
    'checkIn',
    'status',
    'actions'
  ];
  const [visibleBidderCols, setVisibleBidderCols] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('af360_bidders_columns');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return defaultBidderCols;
  });

  // Table 3: Lots & Consignor Reserves Table State (Tab 3)
  const [lotSearch, setLotSearch] = useState('');
  const [lotStatusFilter, setLotStatusFilter] = useState<string>('all');
  const [lotPage, setLotPage] = useState(1);
  const [lotPageSize, setLotPageSize] = useState(10);
  const [isLotColSettingsOpen, setIsLotColSettingsOpen] = useState(false);
  const defaultLotCols = [
    'lotNumber',
    'title',
    'category',
    'consignor',
    'reservePrice',
    'estimates',
    'currentBid',
    'status',
    'actions'
  ];
  const [visibleLotCols, setVisibleLotCols] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('af360_lots_columns');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return defaultLotCols;
  });

  // Modals & Drawer Drawers State
  const [drawerType, setDrawerType] = useState<'syndication' | 'bidder' | 'lot' | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedSyndication, setSelectedSyndication] = useState<DashboardSyndicationRow | null>(null);
  const [selectedBidder, setSelectedBidder] = useState<DashboardBidderRow | null>(null);
  const [selectedLot, setSelectedLot] = useState<LotItem | null>(null);

  // Forms State
  const [syndicationForm, setSyndicationForm] = useState({
    site: '',
    registrations: 0,
    ccAuths: 0,
    views: 0,
    uniqueBidders: 0,
    uniqueBids: 0,
    totalBids: 0,
    highBid: 0,
    maxBid: 0
  });

  const [bidderForm, setBidderForm] = useState({
    bidCardNumber: '',
    bidderName: '',
    companyName: '',
    email: '',
    phone: '',
    site: 'gardner.hibid.com',
    permissionText: 'Approved - Standard ($25,000)',
    notes: '',
    isCheckedIn: false,
    depositAmount: 0,
    depositStatus: 'Collected'
  });

  const [lotForm, setLotForm] = useState({
    lotNumber: 1,
    title: '',
    category: 'Rare US Gold',
    consignorName: '',
    reservePrice: 0,
    estimateLow: 0,
    estimateHigh: 0,
    startingBid: 0,
    status: 'upcoming' as LotItem['status']
  });

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'syndication' | 'bidder' | 'lot';
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all live data from Supabase
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [fetchedLots, fetchedNodes, fetchedBidders, fetchedBids, fetchedExceptions] = await Promise.all([
        lotsService.fetchLots(),
        dashboardService.getSyndicationNodes(auction.id),
        dashboardService.getBidderRegistrations(auction.id),
        dashboardService.getLiveBids(auction.id),
        dashboardService.getOperationalExceptions(auction.id)
      ]);

      if (fetchedLots && fetchedLots.length > 0) {
        setLots(fetchedLots);
      }
      setSyndications(fetchedNodes);
      setBidderRegistrations(fetchedBidders);
      if (fetchedBids && fetchedBids.length > 0) {
        setLiveBids(fetchedBids);
      }
      setExceptions(fetchedExceptions);
    } catch (err) {
      console.error('[OverviewView] Error loading dynamic dashboard data:', err);
      showToast('error', 'Sync Failed', 'Could not fetch live dashboard telemetry from Supabase');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [auction.id, showToast]);

  // Initial fetch and Realtime subscriptions
  useEffect(() => {
    loadDashboardData();

    // Listen for Realtime Postgres Changes across dashboard tables
    const channel = supabase
      .channel(`realtime_dashboard_${auction.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bidder_registrations' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hibid_syndication_stats' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        loadDashboardData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auction.id, loadDashboardData]);

  // Compute 8 Dynamic Metrics from genuine records
  const metrics: DashboardMetrics = useMemo(() => {
    return dashboardService.computeDashboardMetrics(lots, bidderRegistrations, syndications, liveBids);
  }, [lots, bidderRegistrations, syndications, liveBids]);

  // Table 1: Filtered & Paginated Syndication Nodes
  const filteredSyndications = useMemo(() => {
    return syndications.filter(s => {
      const matchesSearch = s.site.toLowerCase().includes(syndicationSearch.toLowerCase().trim());
      const matchesStatus = syndicationStatusFilter === 'all' || s.status === syndicationStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [syndications, syndicationSearch, syndicationStatusFilter]);

  const paginatedSyndications = useMemo(() => {
    const start = (syndicationPage - 1) * syndicationPageSize;
    return filteredSyndications.slice(start, start + syndicationPageSize);
  }, [filteredSyndications, syndicationPage, syndicationPageSize]);

  // Table 1 Grand Totals
  const totalRegs = syndications.reduce((acc, s) => acc + s.registrations, 0);
  const totalCC = syndications.reduce((acc, s) => acc + s.ccAuths, 0);
  const totalViews = syndications.reduce((acc, s) => acc + s.views, 0);
  const totalUniqueBidders = syndications.reduce((acc, s) => acc + s.uniqueBidders, 0);
  const totalUniqueBids = syndications.reduce((acc, s) => acc + s.uniqueBids, 0);
  const totalBids = syndications.reduce((acc, s) => acc + s.totalBids, 0);
  const overallHighBid = syndications.length > 0 ? Math.max(...syndications.map(s => s.highBid), metrics.totalHammer) : metrics.totalHammer;

  // Table 2: Filtered & Paginated Bidders (Tab 2)
  const filteredBidders = useMemo(() => {
    return bidderRegistrations.filter(b => {
      const q = bidderSearch.toLowerCase().trim();
      const matchesQuery = !q || b.bidderName.toLowerCase().includes(q) || b.bidCardNumber.toLowerCase().includes(q) || (b.email && b.email.toLowerCase().includes(q));
      const matchesStatus = bidderStatusFilter === 'all' || b.status === bidderStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [bidderRegistrations, bidderSearch, bidderStatusFilter]);

  const paginatedBidders = useMemo(() => {
    const start = (bidderPage - 1) * bidderPageSize;
    return filteredBidders.slice(start, start + bidderPageSize);
  }, [filteredBidders, bidderPage, bidderPageSize]);

  // Table 3: Filtered & Paginated Lots (Tab 3)
  const filteredLots = useMemo(() => {
    return lots.filter(l => {
      const q = lotSearch.toLowerCase().trim();
      const matchesQuery = !q || l.title.toLowerCase().includes(q) || String(l.lotNumber).includes(q) || (l.consignorName && l.consignorName.toLowerCase().includes(q));
      const matchesStatus = lotStatusFilter === 'all' || l.status === lotStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [lots, lotSearch, lotStatusFilter]);

  const paginatedLots = useMemo(() => {
    const start = (lotPage - 1) * lotPageSize;
    return filteredLots.slice(start, start + lotPageSize);
  }, [filteredLots, lotPage, lotPageSize]);

  // Tab 3 Dynamic KPI stats
  const activeLotOnBlock = lots.find(l => l.status === 'on_block') || lots[0];
  const highestEstimateLot = lots.length > 0
    ? [...lots].sort((a, b) => (Number(b.estimateHigh) || 0) - (Number(a.estimateHigh) || 0))[0]
    : null;
  const totalReserveValue = lots.reduce((acc, l) => acc + (Number(l.reservePrice) || Number(l.startingBid) || 0), 0);

  // Column Visibility Persisters
  const toggleSyndicationCol = (key: string) => {
    if (key === 'site' || key === 'actions') return; // Always keep site & actions
    setVisibleSyndicationCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem('af360_syndication_columns', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const resetSyndicationCols = () => {
    setVisibleSyndicationCols(defaultSyndicationCols);
    try { localStorage.setItem('af360_syndication_columns', JSON.stringify(defaultSyndicationCols)); } catch (_) {}
  };

  const toggleBidderCol = (key: string) => {
    if (key === 'paddleNumber' || key === 'name' || key === 'actions') return;
    setVisibleBidderCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem('af360_bidders_columns', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const resetBidderCols = () => {
    setVisibleBidderCols(defaultBidderCols);
    try { localStorage.setItem('af360_bidders_columns', JSON.stringify(defaultBidderCols)); } catch (_) {}
  };

  const toggleLotCol = (key: string) => {
    if (key === 'lotNumber' || key === 'title' || key === 'actions') return;
    setVisibleLotCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem('af360_lots_columns', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const resetLotCols = () => {
    setVisibleLotCols(defaultLotCols);
    try { localStorage.setItem('af360_lots_columns', JSON.stringify(defaultLotCols)); } catch (_) {}
  };


  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(auction.code);
    setCopiedCode(true);
    showToast('info', 'Copied', `Auction reference code ${auction.code} copied to clipboard`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // CRUD Handlers for Syndication
  const handleOpenAddSyndication = () => {
    setSyndicationForm({
      site: '',
      registrations: 0,
      ccAuths: 0,
      views: 0,
      uniqueBidders: 0,
      uniqueBids: 0,
      totalBids: 0,
      highBid: 0,
      maxBid: 0
    });
    setDrawerType('syndication');
    setDrawerMode('create');
  };

  const handleOpenEditSyndication = (node: DashboardSyndicationRow) => {
    setSelectedSyndication(node);
    setSyndicationForm({
      site: node.site,
      registrations: node.registrations,
      ccAuths: node.ccAuths,
      views: node.views,
      uniqueBidders: node.uniqueBidders,
      uniqueBids: node.uniqueBids,
      totalBids: node.totalBids,
      highBid: node.highBid,
      maxBid: node.maxBid
    });
    setDrawerType('syndication');
    setDrawerMode('edit');
  };

  const handleOpenViewSyndication = (node: DashboardSyndicationRow) => {
    setSelectedSyndication(node);
    setDrawerType('syndication');
    setDrawerMode('view');
  };

  const handleSaveSyndication = async () => {
    if (!syndicationForm.site.trim()) {
      showToast('warning', 'Validation', 'Site node URL or domain is required');
      return;
    }

    if (drawerMode === 'create') {
      const res = await dashboardService.createSyndicationNode({
        auctionId: auction.id,
        ...syndicationForm
      });
      if (res.success && res.data) {
        setSyndications(prev => [res.data!, ...prev]);
        showToast('success', 'Node Added', `Syndication node ${res.data.site} added to network`);
        setDrawerType(null);
      } else {
        showToast('error', 'Error', res.error || 'Failed to create node');
      }
    } else if (drawerMode === 'edit' && selectedSyndication) {
      const res = await dashboardService.updateSyndicationNode(selectedSyndication.id, syndicationForm);
      if (res.success) {
        setSyndications(prev => prev.map(s => s.id === selectedSyndication.id ? { ...s, ...syndicationForm } : s));
        showToast('success', 'Updated', `Syndication node ${selectedSyndication.site} updated`);
        setDrawerType(null);
      } else {
        showToast('error', 'Error', res.error || 'Failed to update node');
      }
    }
  };

  // CRUD Handlers for Bidders
  const handleOpenAddBidder = () => {
    setBidderForm({
      bidCardNumber: String(1000 + bidderRegistrations.length + 1),
      bidderName: '',
      companyName: '',
      email: '',
      phone: '',
      site: 'gardner.hibid.com',
      permissionText: 'Approved - Standard ($25,000)',
      notes: '',
      isCheckedIn: false,
      depositAmount: 0,
      depositStatus: 'Collected'
    });
    setDrawerType('bidder');
    setDrawerMode('create');
  };

  const handleOpenEditBidder = (b: DashboardBidderRow) => {
    setSelectedBidder(b);
    setBidderForm({
      bidCardNumber: b.bidCardNumber,
      bidderName: b.bidderName,
      companyName: b.companyName || '',
      email: b.email || '',
      phone: b.phone || '',
      site: b.site,
      permissionText: b.permissionText,
      notes: b.notes || '',
      isCheckedIn: b.isCheckedIn,
      depositAmount: b.depositAmount,
      depositStatus: b.depositStatus
    });
    setDrawerType('bidder');
    setDrawerMode('edit');
  };

  const handleOpenViewBidder = (b: DashboardBidderRow) => {
    setSelectedBidder(b);
    setDrawerType('bidder');
    setDrawerMode('view');
  };

  const handleToggleCheckIn = async (b: DashboardBidderRow) => {
    const nextState = !b.isCheckedIn;
    const res = await dashboardService.updateBidderRegistration(b.id, { isCheckedIn: nextState });
    if (res.success) {
      setBidderRegistrations(prev => prev.map(item => item.id === b.id ? { ...item, isCheckedIn: nextState } : item));
      showToast('success', nextState ? 'Checked In' : 'Check-In Reverted', `Bidder #${b.bidCardNumber} ${b.bidderName} ${nextState ? 'marked as checked in' : 'check-in reversed'}`);
    } else {
      showToast('error', 'Error', res.error || 'Failed to toggle check-in state');
    }
  };

  const handleSaveBidder = async () => {
    if (!bidderForm.bidderName.trim()) {
      showToast('warning', 'Validation', 'Bidder name is required');
      return;
    }

    if (drawerMode === 'create') {
      const res = await dashboardService.createBidderRegistration({
        auctionId: auction.id,
        ...bidderForm
      });
      if (res.success && res.data) {
        setBidderRegistrations(prev => [res.data!, ...prev]);
        showToast('success', 'Bidder Registered', `Paddle #${res.data.bidCardNumber} assigned to ${res.data.bidderName}`);
        setDrawerType(null);
      } else {
        showToast('error', 'Error', res.error || 'Failed to register bidder');
      }
    } else if (drawerMode === 'edit' && selectedBidder) {
      const res = await dashboardService.updateBidderRegistration(selectedBidder.id, bidderForm);
      if (res.success) {
        setBidderRegistrations(prev => prev.map(item => item.id === selectedBidder.id ? { ...item, ...bidderForm } : item));
        showToast('success', 'Updated', `Bidder record #${selectedBidder.bidCardNumber} updated`);
        setDrawerType(null);
      } else {
        showToast('error', 'Error', res.error || 'Failed to update bidder');
      }
    }
  };

  // CRUD Handlers for Lots
  const handleOpenViewLot = (lot: LotItem) => {
    setSelectedLot(lot);
    setDrawerType('lot');
    setDrawerMode('view');
  };

  const handleOpenEditLot = (lot: LotItem) => {
    setSelectedLot(lot);
    setLotForm({
      lotNumber: lot.lotNumber,
      title: lot.title,
      category: lot.category,
      consignorName: lot.consignorName || '',
      reservePrice: lot.reservePrice || 0,
      estimateLow: lot.estimateLow || 0,
      estimateHigh: lot.estimateHigh || 0,
      startingBid: lot.startingBid || 0,
      status: lot.status
    });
    setDrawerType('lot');
    setDrawerMode('edit');
  };

  const handleSendLotToBlock = async (lot: LotItem) => {
    try {
      const res = await lotsService.sendLotToBlock(lot.id);
      if (res.success) {
        setLots(prev => prev.map(l => l.id === lot.id ? { ...l, status: 'on_block' } : l.status === 'on_block' ? { ...l, status: 'upcoming' } : l));
        showToast('success', 'On Rostrum Block', `Lot #${lot.lotNumber} sent to rostrum block`);
      } else {
        showToast('error', 'Error', 'Could not send lot to block');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to update lot status');
    }
  };

  const handleSaveLot = async () => {
    if (!lotForm.title.trim()) {
      showToast('warning', 'Validation', 'Lot title is required');
      return;
    }

    if (selectedLot && drawerMode === 'edit') {
      const updated: LotItem = {
        ...selectedLot,
        lotNumber: Number(lotForm.lotNumber),
        title: lotForm.title,
        category: lotForm.category as any,
        consignorName: lotForm.consignorName,
        reservePrice: Number(lotForm.reservePrice),
        estimateLow: Number(lotForm.estimateLow),
        estimateHigh: Number(lotForm.estimateHigh),
        startingBid: Number(lotForm.startingBid),
        status: lotForm.status
      };

      const res = await lotsService.updateLot(selectedLot.id, updated);
      if (res.success) {
        setLots(prev => prev.map(l => l.id === selectedLot.id ? updated : l));
        showToast('success', 'Lot Updated', `Lot #${updated.lotNumber} saved successfully`);
        setDrawerType(null);
      } else {
        showToast('error', 'Error', res.error || 'Failed to update lot');
      }
    }
  };

  // Deletion execution
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'syndication') {
        const res = await dashboardService.deleteSyndicationNode(deleteTarget.id);
        if (res.success) {
          setSyndications(prev => prev.filter(s => s.id !== deleteTarget.id));
          showToast('success', 'Deleted', `Syndication node deleted`);
        } else {
          showToast('error', 'Error', res.error || 'Failed to delete node');
        }
      } else if (deleteTarget.type === 'bidder') {
        const res = await dashboardService.deleteBidderRegistration(deleteTarget.id);
        if (res.success) {
          setBidderRegistrations(prev => prev.filter(b => b.id !== deleteTarget.id));
          showToast('success', 'Deleted', `Bidder record deleted`);
        } else {
          showToast('error', 'Error', res.error || 'Failed to delete bidder');
        }
      } else if (deleteTarget.type === 'lot') {
        const res = await lotsService.deleteLot(deleteTarget.id);
        if (res.success) {
          setLots(prev => prev.filter(l => l.id !== deleteTarget.id));
          showToast('success', 'Deleted', `Lot deleted`);
        } else {
          showToast('error', 'Error', res.error || 'Failed to delete lot');
        }
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Operation failed');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="overview-page-container">



      {/* 3. Modern KPI Cards (8 Metrics in Two Cohesive Rows - Clickable Navigation) */}
      <div className="kpi-section">
        {/* Row 1 — Operational metrics */}
        <div className="kpi-grid">
          {/* Card 1: Total Lots -> Navigates to Pre Auction Catalog */}
          <div
            className="executive-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('auctions')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('auctions'); }}
            title="Click to navigate to Pre Auction Catalog Lots"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">TOTAL LOTS</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill gold-tint">
                <Layers size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number">{metrics.totalLots}</div>
              <div className="kpi-supporting">
                <span className="highlight-dark">{metrics.activeLots} active</span>
                <span className="bullet-sep">•</span>
                <span>{metrics.onBlockLots} on block</span>
                {metrics.soldLots > 0 && (
                  <>
                    <span className="bullet-sep">•</span>
                    <span className="text-emerald-600 font-semibold">{metrics.soldLots} sold</span>
                  </>
                )}
              </div>
            </div>
            <div className="kpi-accent-border gold" />
          </div>

          {/* Card 2: Total Check-Ins -> Navigates to Registered Bidders */}
          <div
            className="executive-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('users')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('users'); }}
            title="Click to navigate to Registered Bidders & Customer Desk"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">TOTAL CHECK-INS</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill blue-tint">
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number">{metrics.totalCheckIns}</div>
              <div className="kpi-supporting">
                <span className="highlight-dark">{metrics.onlineCheckIns} online</span>
                <span className="bullet-sep">•</span>
                <span>{metrics.floorCheckIns} floor paddles</span>
              </div>
            </div>
            <div className="kpi-accent-border blue" />
          </div>

          {/* Card 3: Unique Consignors -> Navigates to Customers & Consignors */}
          <div
            className="executive-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('users')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('users'); }}
            title="Click to navigate to Consignors & Sellers Registry"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">UNIQUE CONSIGNORS</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill purple-tint">
                <Users size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number">{metrics.uniqueConsignors}</div>
              <div className="kpi-supporting">
                <span>{metrics.activeConsignors} private collections</span>
              </div>
            </div>
            <div className="kpi-accent-border purple" />
          </div>

          {/* Card 4: HiBid Syndication -> Navigates to Syndication Telemetry */}
          <div
            className="executive-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => {
              const el = document.getElementById('syndication-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else onNavigate('live_clerking');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                const el = document.getElementById('syndication-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            title="Click to view Multi-Site Syndication Telemetry table"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">HIBID SYNDICATION</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill amber-tint">
                <Radio size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number text-val">{metrics.activeNodesCount} Nodes Live</div>
              <div className="kpi-supporting">
                <span className="kpi-live-dot" />
                <span>Simulcast streaming active</span>
              </div>
            </div>
            <div className="kpi-accent-border amber" />
          </div>
        </div>

        {/* Row 2 — Financial metrics */}
        <div className="kpi-grid">
          {/* Card 5: Presale Estimate Min -> Navigates to Pre Auction Catalog Valuation */}
          <div
            className="executive-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('auctions')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('auctions'); }}
            title="Click to view Floor Reserves & Pre Auction Catalog"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">PRESALE ESTIMATE MIN</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill amber-tint">
                <ArrowDownCircle size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono">{formatCurrency(metrics.presaleMin)}</div>
              <div className="kpi-supporting">
                <span>Floor reserves secured</span>
              </div>
            </div>
            <div className="kpi-accent-border amber" />
          </div>

          {/* Card 6: Presale Estimate Max -> Navigates to Pre Auction Estimates */}
          <div
            className="executive-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('auctions')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('auctions'); }}
            title="Click to view High Estimates & Pre Auction Catalog"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">PRESALE ESTIMATE MAX</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill blue-tint">
                <ArrowUpCircle size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono">{formatCurrency(metrics.presaleMax)}</div>
              <div className="kpi-supporting">
                <span>Top institutional bids</span>
              </div>
            </div>
            <div className="kpi-accent-border blue" />
          </div>

          {/* Card 7: Avg Estimate / Lot -> Navigates to Reports & Analytics */}
          <div
            className="executive-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('reports')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('reports'); }}
            title="Click to view Reports & Portfolio Analytics"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">AVG ESTIMATE / LOT</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill purple-tint">
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono">{formatCurrency(metrics.avgEstimate)}</div>
              <div className="kpi-supporting">
                <span>Median value {formatCurrency(metrics.medianEstimate)}</span>
              </div>
            </div>
            <div className="kpi-accent-border purple" />
          </div>

          {/* Card 8: Total Hammer Realized -> Navigates to Settlement & Invoices */}
          <div
            className="executive-kpi-card financial-highlight"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('payments')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('payments'); }}
            title="Click to view Settlement, Invoices & Hammer Realization"
          >
            <div className="kpi-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="kpi-label">TOTAL HAMMER REALIZED</span>
                <ArrowUpRight size={12} className="kpi-nav-arrow" />
              </div>
              <div className="kpi-icon-pill emerald-tint">
                <DollarSign size={17} />
              </div>
            </div>
            <div className="kpi-body">
              <div className="kpi-number font-mono emerald-text">
                {formatCurrency(metrics.totalHammer)}
              </div>
              <div className="kpi-supporting">
                <span className="kpi-trend-badge emerald">
                  +{metrics.realizationPct}% over low estimate
                </span>
              </div>
            </div>
            <div className="kpi-accent-border emerald" />
          </div>
        </div>
      </div>


      {/* 4. Advanced Auction Analytics and Live Charts (Visual Centerpiece) */}
      <AuctionAnalyticsChart 
        lots={lots}
        bids={liveBids}
        totalHammer={metrics.totalHammer}
        presaleMin={metrics.presaleMin}
        presaleMax={metrics.presaleMax}
      />

      {/* 5. Operational Workbench (Live Rostrum Activity & Settlement Exceptions) */}
      <div className="operational-workbench-grid">
        {/* Left: Live Clerking & Bids Stream */}
        <div className="workbench-card">
          <div className="workbench-card-header">
            <div className="workbench-title-group">
              <div className="workbench-icon-pill gold">
                <Gavel size={16} />
              </div>
              <div>
                <h4>Live Clerking & Floor Bids Stream</h4>
                <p>Real-time bids accepted by rostrum auctioneer across all streams</p>
              </div>
            </div>
            {isRefreshing && <RefreshCw size={14} className="animate-spin text-muted" />}
          </div>

          <div className="live-bids-feed-list">
            {liveBids.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No live block bids placed yet. Active rostrum and online bids appear here in real-time.
              </div>
            ) : (
              liveBids.slice(0, 4).map((b) => (
                <div key={b.id} className="live-bid-row">
                  <div className="bid-row-left">
                    <span className="bid-lot-badge">Lot #{b.lotNumber}</span>
                    <div className="bid-paddle-info">
                      <span className="bid-paddle">Paddle #{b.paddleNumber}</span>
                      <span className="bid-name truncate">{b.bidderName}</span>
                    </div>
                  </div>

                  <div className="bid-row-middle">
                    <span className={`bid-source-pill ${(b.source || 'Floor').toLowerCase().replace(/\s+/g, '-')}`}>
                      {b.source}
                    </span>
                    <span className="bid-time">{b.timestamp}</span>
                  </div>

                  <div className="bid-row-right">
                    <span className="bid-amount font-mono">{formatCurrency(b.amount)}</span>
                    {b.isWinning ? (
                      <span className="bid-winning-tag">High Bid</span>
                    ) : (
                      <span className="bid-outbid-tag">Outbid</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="workbench-footer-bar">
            <span className="footer-meta-text">
              Showing latest rostrum bids ({liveBids.length} total)
            </span>
            <button
              className="workbench-action-link"
              onClick={() => onNavigate('live_clerking')}
            >
              Live Block
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right: Operational Flags & Settlement Exceptions */}
        <div className="workbench-card">
          <div className="workbench-card-header">
            <div className="workbench-title-group">
              <div className="workbench-icon-pill amber">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4>Settlement & Operational Exceptions</h4>
                <p>High-value pending wires and bidder verification authorizations</p>
              </div>
            </div>
          </div>

          <div className="operational-flags-list">
            {exceptions.map(exc => (
              <div key={exc.id} className={`op-flag-item ${exc.severity}`}>
                <div className="op-flag-icon">
                  {exc.severity === 'warning' ? (
                    <DollarSign size={16} />
                  ) : exc.severity === 'info' ? (
                    <CreditCard size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                </div>
                <div className="op-flag-content">
                  <div className="op-flag-title-row">
                    <span className="op-flag-title">{exc.title}</span>
                    {exc.amount ? (
                      <span className="op-flag-amount font-mono">{formatCurrency(exc.amount)}</span>
                    ) : exc.badge ? (
                      <span className={`op-badge-pill ${exc.badgeColor || ''}`}>{exc.badge}</span>
                    ) : null}
                  </div>
                  <p className="op-flag-desc">{exc.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="workbench-footer-bar">
            <span className="footer-meta-text">
              Automated 15% wire / 18% credit card premium calculations active
            </span>
            <button
              className="workbench-action-link"
              onClick={() => onNavigate('payments')}
            >
              <span>All Invoices</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Multi-Site Syndication & Bidder Traffic Table (Complete Table Management) */}
      <div className="syndication-section-card" id="syndication-section">
        <div className="syndication-header-row">
          <div className="syndication-title-block">
            <div className="syndication-icon-pill">
              <Radio size={17} />
            </div>
            <div>
              <h3>Multi-Site Syndication & Bidder Traffic</h3>
              <p>Real-time telemetry across HiBid network syndication nodes and Gardner direct web saleroom</p>
            </div>
          </div>

          <div className="syndication-actions">
            {/* Search */}
            <div className="syndication-search-box">
              <Search size={14} className="search-icon text-muted" />
              <input
                type="text"
                placeholder="Search syndication nodes..."
                value={syndicationSearch}
                onChange={(e) => {
                  setSyndicationSearch(e.target.value);
                  setSyndicationPage(1);
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={syndicationStatusFilter}
              onChange={(e) => {
                setSyndicationStatusFilter(e.target.value as any);
                setSyndicationPage(1);
              }}
              style={{
                height: 36,
                padding: '0 10px',
                borderRadius: 8,
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                fontSize: 12.5,
                color: '#334155'
              }}
            >
              <option value="all">All Node Statuses</option>
              <option value="Online">Online Only</option>
              <option value="Standby">Standby Only</option>
            </select>

            {/* Manage Columns Toggle */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSyndicationColSettingsOpen(!isSyndicationColSettingsOpen)}
                title="Manage Columns"
                style={{ height: 36, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <SlidersHorizontal size={14} />
                <span style={{ fontSize: 12.5 }}>Columns</span>
              </button>

              {isSyndicationColSettingsOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 6,
                  zIndex: 50,
                  background: '#ffffff',
                  border: '1px solid #eae5dc',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  padding: '12px 14px',
                  minWidth: 210,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Visible Columns</span>
                    <button
                      type="button"
                      onClick={resetSyndicationCols}
                      style={{ fontSize: 11, color: '#a37a3b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Reset
                    </button>
                  </div>
                  {[
                    { key: 'status', label: 'Node Status' },
                    { key: 'registrations', label: 'Registrations' },
                    { key: 'ccAuths', label: 'CC Authorizations' },
                    { key: 'views', label: 'Views' },
                    { key: 'uniqueBidders', label: 'Unique Bidders' },
                    { key: 'uniqueBids', label: 'Unique Bids' },
                    { key: 'totalBids', label: 'Total Bids' },
                    { key: 'highBid', label: 'High Bid' },
                    { key: 'maxBid', label: 'Max Bid' }
                  ].map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleSyndicationCols.includes(col.key)}
                        onChange={() => toggleSyndicationCol(col.key)}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Add Node Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenAddSyndication}
              style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Plus size={14} />
              <span>Add Node</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="syndication-table-container">
          <table className="executive-table">
            <thead>
              <tr>
                {visibleSyndicationCols.includes('site') && <th>Site Node / URL</th>}
                {visibleSyndicationCols.includes('status') && <th>Node Status</th>}
                {visibleSyndicationCols.includes('registrations') && <th className="align-right">Registrations</th>}
                {visibleSyndicationCols.includes('ccAuths') && <th className="align-right">CC Authorizations</th>}
                {visibleSyndicationCols.includes('views') && <th className="align-right">Views</th>}
                {visibleSyndicationCols.includes('uniqueBidders') && <th className="align-right">Unique Bidders</th>}
                {visibleSyndicationCols.includes('uniqueBids') && <th className="align-right">Unique Bids</th>}
                {visibleSyndicationCols.includes('totalBids') && <th className="align-right">Total Bids</th>}
                {visibleSyndicationCols.includes('highBid') && <th className="align-right">High Bid</th>}
                {visibleSyndicationCols.includes('maxBid') && <th className="align-right">Max Bid</th>}
                {visibleSyndicationCols.includes('actions') && <th style={{ width: 60, textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedSyndications.length === 0 ? (
                <tr>
                  <td colSpan={visibleSyndicationCols.length} style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                    No syndication nodes match your filters. Click "Add Node" to configure an active endpoint.
                  </td>
                </tr>
              ) : (
                paginatedSyndications.map((siteItem) => {
                  const isDirect = siteItem.site.includes('gardner-auction.com') || siteItem.site.includes('direct');
                  const isHiBidMain = siteItem.site === 'www.hibid.com' || siteItem.site === 'hibid.com';

                  const rowActions: TableActionItem[] = [
                    {
                      label: 'View Telemetry',
                      icon: Eye,
                      onClick: () => handleOpenViewSyndication(siteItem)
                    },
                    {
                      label: 'Edit Node',
                      icon: Edit2,
                      onClick: () => handleOpenEditSyndication(siteItem)
                    },
                    {
                      label: 'Delete Node',
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteTarget({
                        type: 'syndication',
                        id: siteItem.id,
                        title: `Delete Syndication Node`,
                        subtitle: siteItem.site
                      })
                    }
                  ];

                  return (
                    <tr key={siteItem.id} className={isDirect ? 'highlight-row' : ''}>
                      {visibleSyndicationCols.includes('site') && (
                        <td className="node-name-cell">
                          <div className="node-name-wrap">
                            <span className="node-url">{siteItem.site}</span>
                            {isDirect && <span className="direct-badge">Host Saleroom</span>}
                            {isHiBidMain && <span className="hibid-main-badge">Primary HiBid</span>}
                          </div>
                        </td>
                      )}

                      {visibleSyndicationCols.includes('status') && (
                        <td>
                          <span className={`node-status-pill ${siteItem.views > 0 ? 'online' : 'standby'}`}>
                            <span className="status-dot-mini" />
                            {siteItem.views > 0 ? 'Online' : 'Standby'}
                          </span>
                        </td>
                      )}

                      {visibleSyndicationCols.includes('registrations') && (
                        <td className="align-right font-mono">{formatNumber(siteItem.registrations)}</td>
                      )}

                      {visibleSyndicationCols.includes('ccAuths') && (
                        <td className="align-right font-mono">
                          <span className="cc-auth-cell">
                            {formatNumber(siteItem.ccAuths)}
                            {siteItem.registrations > 0 && (
                              <span className="cc-pct">
                                ({Math.round((siteItem.ccAuths / siteItem.registrations) * 100)}%)
                              </span>
                            )}
                          </span>
                        </td>
                      )}

                      {visibleSyndicationCols.includes('views') && (
                        <td className="align-right font-mono">{formatNumber(siteItem.views)}</td>
                      )}

                      {visibleSyndicationCols.includes('uniqueBidders') && (
                        <td className="align-right font-mono">{formatNumber(siteItem.uniqueBidders)}</td>
                      )}

                      {visibleSyndicationCols.includes('uniqueBids') && (
                        <td className="align-right font-mono">{formatNumber(siteItem.uniqueBids)}</td>
                      )}

                      {visibleSyndicationCols.includes('totalBids') && (
                        <td className="align-right font-mono">{formatNumber(siteItem.totalBids)}</td>
                      )}

                      {visibleSyndicationCols.includes('highBid') && (
                        <td className="align-right font-mono font-bold text-gold">
                          {formatCurrency(siteItem.highBid)}
                        </td>
                      )}

                      {visibleSyndicationCols.includes('maxBid') && (
                        <td className="align-right font-mono text-dim">
                          {formatCurrency(siteItem.maxBid)}
                        </td>
                      )}

                      {visibleSyndicationCols.includes('actions') && (
                        <td style={{ textAlign: 'center' }}>
                          <TableRowActionMenu actions={rowActions} />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}

              {/* Grand Total Row */}
              {paginatedSyndications.length > 0 && (
                <tr className="executive-total-row">
                  {visibleSyndicationCols.includes('site') && (
                    <td colSpan={visibleSyndicationCols.includes('status') ? 2 : 1} className="total-label-cell">
                      <div className="total-label-wrap">
                        <strong>Syndication Network Total</strong>
                        <span className="total-node-count">{syndications.length} Nodes</span>
                      </div>
                    </td>
                  )}
                  {visibleSyndicationCols.includes('registrations') && (
                    <td className="align-right font-mono font-bold">{formatNumber(totalRegs)}</td>
                  )}
                  {visibleSyndicationCols.includes('ccAuths') && (
                    <td className="align-right font-mono font-bold">{formatNumber(totalCC)}</td>
                  )}
                  {visibleSyndicationCols.includes('views') && (
                    <td className="align-right font-mono font-bold">{formatNumber(totalViews)}</td>
                  )}
                  {visibleSyndicationCols.includes('uniqueBidders') && (
                    <td className="align-right font-mono font-bold">{formatNumber(totalUniqueBidders)}</td>
                  )}
                  {visibleSyndicationCols.includes('uniqueBids') && (
                    <td className="align-right font-mono font-bold">{formatNumber(totalUniqueBids)}</td>
                  )}
                  {visibleSyndicationCols.includes('totalBids') && (
                    <td className="align-right font-mono font-bold">{formatNumber(totalBids)}</td>
                  )}
                  {visibleSyndicationCols.includes('highBid') && (
                    <td className="align-right font-mono font-bold text-gold">
                      {formatCurrency(overallHighBid)}
                    </td>
                  )}
                  {visibleSyndicationCols.includes('maxBid') && (
                    <td className="align-right font-mono text-dim">—</td>
                  )}
                  {visibleSyndicationCols.includes('actions') && (
                    <td></td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination when dataset exceeds 10 records */}
        {filteredSyndications.length > 10 && (
          <div style={{ marginTop: 12 }}>
            <ShadcnPagination
              currentPage={syndicationPage}
              totalItems={filteredSyndications.length}
              pageSize={syndicationPageSize}
              onPageChange={setSyndicationPage}
              onPageSizeChange={(sz) => {
                setSyndicationPageSize(sz);
                setSyndicationPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
              itemLabel="nodes"
            />
          </div>
        )}
      </div>

      {/* 7. Bottom Information Sub-Navigation Tabs */}
      <div className="bottom-info-card">
        <div className="bottom-info-tabs-bar">
          <div className="info-tab-pills" role="tablist">
            <button
              className={`info-pill ${activeInfoTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('info')}
            >
              Auction Information & BP Structure
            </button>
            <button
              className={`info-pill ${activeInfoTab === 'bidders' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('bidders')}
            >
              Recent Registered Bidders ({bidderRegistrations.length})
            </button>
            <button
              className={`info-pill ${activeInfoTab === 'lotsSummary' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('lotsSummary')}
            >
              Catalog & Consignor Reserves ({lots.length})
            </button>
          </div>

          <span className="info-record-ref font-mono">
            Catalog Reference: {auction.code}
          </span>
        </div>

        {/* Tab 1: Details */}
        {activeInfoTab === 'info' && (
          <div className="info-tab-content-grid">
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Auction Code</span>
                <p className="info-value font-mono text-gold">{auction.code}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Catalog Title</span>
                <p className="info-value font-bold">{auction.title}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Curator Description</span>
                <p className="info-text">{auction.description || 'Premier numismatic & vault catalog presenting historically authenticated coinage, gold, and fine chronometers.'}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Buyer's Premium Structure</span>
                <p className="info-value text-gold font-semibold">
                  {auction.bpExplanation || "15% Cash / Wire, 18% Credit Card"}
                </p>
              </div>
            </div>

            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Physical Saleroom & Exhibition Address</span>
                <p className="info-value">{auction.address || '1960 Heritage Way, Suite 400'}</p>
                <p className="info-text">{auction.cityStateZip || 'Missoula, MT 59801'}, {auction.country || 'United States'}</p>
              </div>

              <div className="info-item">
                <span className="info-label">Terms & Conditions of Sale</span>
                <div className="terms-scroll-box">
                  {auction.terms || 'All sales are final upon hammer fall. Bidders agree to pay hammer price plus applicable buyers premium and local sales tax unless valid resale certificate is recorded.'}
                </div>
              </div>

              <div className="info-item">
                <span className="info-label">Tax Exemption Policy</span>
                <p className="info-text">{auction.taxExemptInfo || 'Tax Exempt All Active with verified resale licenses.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Recent Registrations Table with Complete Table Management */}
        {activeInfoTab === 'bidders' && (
          <div className="info-bidders-wrap">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                <div className="syndication-search-box" style={{ width: 280 }}>
                  <Search size={14} className="search-icon text-muted" />
                  <input
                    type="text"
                    placeholder="Search by name, paddle, or email..."
                    value={bidderSearch}
                    onChange={(e) => {
                      setBidderSearch(e.target.value);
                      setBidderPage(1);
                    }}
                  />
                </div>

                <select
                  value={bidderStatusFilter}
                  onChange={(e) => {
                    setBidderStatusFilter(e.target.value);
                    setBidderPage(1);
                  }}
                  style={{
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    fontSize: 12.5,
                    color: '#334155'
                  }}
                >
                  <option value="all">All Bidder Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="vip">VIP</option>
                  <option value="pending_verification">Pending Verification</option>
                </select>

                {/* Manage Columns for Bidders */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsBidderColSettingsOpen(!isBidderColSettingsOpen)}
                    style={{ height: 36, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <SlidersHorizontal size={14} />
                    <span style={{ fontSize: 12.5 }}>Columns</span>
                  </button>

                  {isBidderColSettingsOpen && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '100%',
                      marginTop: 6,
                      zIndex: 50,
                      background: '#ffffff',
                      border: '1px solid #eae5dc',
                      borderRadius: 10,
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      padding: '12px 14px',
                      minWidth: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Columns</span>
                        <button
                          type="button"
                          onClick={resetBidderCols}
                          style={{ fontSize: 11, color: '#a37a3b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Reset
                        </button>
                      </div>
                      {[
                        { key: 'siteOrigin', label: 'Origin Site' },
                        { key: 'creditCardAuth', label: 'Credit Card Auth' },
                        { key: 'bidLimit', label: 'Bid Limit' },
                        { key: 'checkIn', label: 'Check-In Status' },
                        { key: 'status', label: 'Account Status' }
                      ].map(col => (
                        <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={visibleBidderCols.includes(col.key)}
                            onChange={() => toggleBidderCol(col.key)}
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenAddBidder}
                style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <Plus size={14} />
                <span>Register Bidder</span>
              </button>
            </div>

            <div className="syndication-table-container">
              <table className="executive-table compact">
                <thead>
                  <tr>
                    {visibleBidderCols.includes('paddleNumber') && <th>Paddle #</th>}
                    {visibleBidderCols.includes('name') && <th>Bidder Name</th>}
                    {visibleBidderCols.includes('siteOrigin') && <th>Origin Site</th>}
                    {visibleBidderCols.includes('creditCardAuth') && <th>Credit Card Auth</th>}
                    {visibleBidderCols.includes('bidLimit') && <th>Bid Limit</th>}
                    {visibleBidderCols.includes('checkIn') && <th>Check-In</th>}
                    {visibleBidderCols.includes('status') && <th>Status</th>}
                    {visibleBidderCols.includes('actions') && <th style={{ width: 60, textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedBidders.length === 0 ? (
                    <tr>
                      <td colSpan={visibleBidderCols.length} style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                        No bidders registered in this view. Click "Register Bidder" to add a record.
                      </td>
                    </tr>
                  ) : (
                    paginatedBidders.map(b => {
                      const rowActions: TableActionItem[] = [
                        {
                          label: 'View Bidder Profile',
                          icon: Eye,
                          onClick: () => handleOpenViewBidder(b)
                        },
                        {
                          label: b.isCheckedIn ? 'Undo Check-In' : 'Check-In Paddle',
                          icon: UserCheck,
                          onClick: () => handleToggleCheckIn(b)
                        },
                        {
                          label: 'Edit Bidder',
                          icon: Edit2,
                          onClick: () => handleOpenEditBidder(b)
                        },
                        {
                          label: 'Delete Bidder',
                          icon: Trash2,
                          destructive: true,
                          onClick: () => setDeleteTarget({
                            type: 'bidder',
                            id: b.id,
                            title: `Delete Bidder Registration`,
                            subtitle: `#${b.bidCardNumber} ${b.bidderName}`
                          })
                        }
                      ];

                      return (
                        <tr key={b.id}>
                          {visibleBidderCols.includes('paddleNumber') && (
                            <td className="font-mono font-bold text-gold">#{b.bidCardNumber}</td>
                          )}
                          {visibleBidderCols.includes('name') && (
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="font-semibold">{b.bidderName}</span>
                                {b.companyName && <span style={{ fontSize: 11, color: '#94a3b8' }}>{b.companyName}</span>}
                              </div>
                            </td>
                          )}
                          {visibleBidderCols.includes('siteOrigin') && (
                            <td className="text-muted">{b.site}</td>
                          )}
                          {visibleBidderCols.includes('creditCardAuth') && (
                            <td>
                              {b.creditCardAuthorized ? (
                                <span className="badge-auth-yes">
                                  <ShieldCheck size={13} /> Auth ({formatCurrency(b.depositAmount || 1000)})
                                </span>
                              ) : (
                                <span className="badge-auth-no">Pending Auth</span>
                              )}
                            </td>
                          )}
                          {visibleBidderCols.includes('bidLimit') && (
                            <td className="font-mono">{formatCurrency(b.bidLimit)}</td>
                          )}
                          {visibleBidderCols.includes('checkIn') && (
                            <td>
                              <button
                                type="button"
                                onClick={() => handleToggleCheckIn(b)}
                                style={{
                                  background: b.isCheckedIn ? '#ecfdf5' : '#f1f5f9',
                                  color: b.isCheckedIn ? '#059669' : '#64748b',
                                  border: b.isCheckedIn ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                                  borderRadius: 9999,
                                  padding: '2px 8px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                {b.isCheckedIn ? (
                                  <>
                                    <Check size={11} /> Checked In
                                  </>
                                ) : (
                                  'Not Checked In'
                                )}
                              </button>
                            </td>
                          )}
                          {visibleBidderCols.includes('status') && (
                            <td>
                              <span className={`status-tag ${b.status}`}>
                                {b.status}
                              </span>
                            </td>
                          )}
                          {visibleBidderCols.includes('actions') && (
                            <td style={{ textAlign: 'center' }}>
                              <TableRowActionMenu actions={rowActions} />
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Bidders when > 10 */}
            {filteredBidders.length > 10 && (
              <div style={{ marginTop: 12 }}>
                <ShadcnPagination
                  currentPage={bidderPage}
                  totalItems={filteredBidders.length}
                  pageSize={bidderPageSize}
                  onPageChange={setBidderPage}
                  onPageSizeChange={(sz) => {
                    setBidderPageSize(sz);
                    setBidderPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20]}
                  itemLabel="bidders"
                />
              </div>
            )}

            <div className="bidders-footer-link">
              <button className="btn btn-secondary" onClick={() => onNavigate('users')}>
                View Full Customer Registry →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Catalog & Consignor Reserves (Complete Table Management) */}
        {activeInfoTab === 'lotsSummary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top 3 Dynamic Stat Cards */}
            <div className="catalog-reserves-grid">
              <div className="catalog-stat-box">
                <span className="stat-box-label">Active On Rostrum Block</span>
                <div className="stat-box-num font-mono text-gold">
                  {activeLotOnBlock ? `Lot #${activeLotOnBlock.lotNumber}` : '—'}
                </div>
                <div className="stat-box-desc truncate">
                  {activeLotOnBlock?.title || 'No active lot on block'}
                </div>
                <span className="stat-box-meta">
                  Current Bid: {formatCurrency(activeLotOnBlock?.currentBid || activeLotOnBlock?.startingBid || 0)} • {activeLotOnBlock?.status === 'on_block' ? 'Live on Block' : 'Upcoming'}
                </span>
              </div>

              <div className="catalog-stat-box">
                <span className="stat-box-label">Highest Catalog Lot Estimate</span>
                <div className="stat-box-num font-mono">
                  {highestEstimateLot ? formatCurrency(highestEstimateLot.estimateHigh) : '—'}
                </div>
                <div className="stat-box-desc truncate">
                  {highestEstimateLot ? `Lot #${highestEstimateLot.lotNumber} (${highestEstimateLot.title})` : 'Catalog Lot'}
                </div>
                <span className="stat-box-meta">
                  Consigned by {highestEstimateLot?.consignorName || 'Private Vault Estate'}
                </span>
              </div>

              <div className="catalog-stat-box">
                <span className="stat-box-label">Consigned Reserve Value</span>
                <div className="stat-box-num font-mono text-blue">{formatCurrency(totalReserveValue)}</div>
                <div className="stat-box-desc">Representing {metrics.uniqueConsignors} Consignor Estates & Collections</div>
                <span className="stat-box-meta">100% Floor Reserves Secured & Locked</span>
              </div>
            </div>

            {/* Catalog Lots Data Table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <div className="syndication-search-box" style={{ width: 280 }}>
                    <Search size={14} className="search-icon text-muted" />
                    <input
                      type="text"
                      placeholder="Search lot title, number, consignor..."
                      value={lotSearch}
                      onChange={(e) => {
                        setLotSearch(e.target.value);
                        setLotPage(1);
                      }}
                    />
                  </div>

                  <select
                    value={lotStatusFilter}
                    onChange={(e) => {
                      setLotStatusFilter(e.target.value);
                      setLotPage(1);
                    }}
                    style={{
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: 12.5,
                      color: '#334155'
                    }}
                  >
                    <option value="all">All Lot Statuses</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="on_block">On Block</option>
                    <option value="sold">Sold</option>
                    <option value="passed">Passed</option>
                  </select>

                  {/* Manage Columns for Lots */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsLotColSettingsOpen(!isLotColSettingsOpen)}
                      style={{ height: 36, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <SlidersHorizontal size={14} />
                      <span style={{ fontSize: 12.5 }}>Columns</span>
                    </button>

                    {isLotColSettingsOpen && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '100%',
                        marginTop: 6,
                        zIndex: 50,
                        background: '#ffffff',
                        border: '1px solid #eae5dc',
                        borderRadius: 10,
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        padding: '12px 14px',
                        minWidth: 200,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Columns</span>
                          <button
                            type="button"
                            onClick={resetLotCols}
                            style={{ fontSize: 11, color: '#a37a3b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Reset
                          </button>
                        </div>
                        {[
                          { key: 'category', label: 'Category' },
                          { key: 'consignor', label: 'Consignor' },
                          { key: 'reservePrice', label: 'Reserve Price' },
                          { key: 'estimates', label: 'Estimates (Low - High)' },
                          { key: 'currentBid', label: 'Current / Hammer Bid' },
                          { key: 'status', label: 'Lot Status' }
                        ].map(col => (
                          <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={visibleLotCols.includes(col.key)}
                              onChange={() => toggleLotCol(col.key)}
                            />
                            <span>{col.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigate('auctions')}
                  style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span>Pre-Auction Catalog Console →</span>
                </button>
              </div>

              <div className="syndication-table-container">
                <table className="executive-table compact">
                  <thead>
                    <tr>
                      {visibleLotCols.includes('lotNumber') && <th style={{ width: 80 }}>Lot #</th>}
                      {visibleLotCols.includes('title') && <th>Title</th>}
                      {visibleLotCols.includes('category') && <th>Category</th>}
                      {visibleLotCols.includes('consignor') && <th>Consignor</th>}
                      {visibleLotCols.includes('reservePrice') && <th className="align-right">Reserve</th>}
                      {visibleLotCols.includes('estimates') && <th className="align-right">Estimate (Low - High)</th>}
                      {visibleLotCols.includes('currentBid') && <th className="align-right">Current Bid</th>}
                      {visibleLotCols.includes('status') && <th>Status</th>}
                      {visibleLotCols.includes('actions') && <th style={{ width: 60, textAlign: 'center' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLots.length === 0 ? (
                      <tr>
                        <td colSpan={visibleLotCols.length} style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                          No catalog lots found for this auction.
                        </td>
                      </tr>
                    ) : (
                      paginatedLots.map(lot => {
                        const rowActions: TableActionItem[] = [
                          {
                            label: 'View Lot Details',
                            icon: Eye,
                            onClick: () => handleOpenViewLot(lot)
                          },
                          {
                            label: 'Send to Block',
                            icon: Gavel,
                            disabled: lot.status === 'on_block',
                            onClick: () => handleSendLotToBlock(lot)
                          },
                          {
                            label: 'Edit Lot',
                            icon: Edit2,
                            onClick: () => handleOpenEditLot(lot)
                          },
                          {
                            label: 'Delete Lot',
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteTarget({
                              type: 'lot',
                              id: lot.id,
                              title: `Delete Catalog Lot`,
                              subtitle: `Lot #${lot.lotNumber} (${lot.title})`
                            })
                          }
                        ];

                        return (
                          <tr key={lot.id} className={lot.status === 'on_block' ? 'highlight-row' : ''}>
                            {visibleLotCols.includes('lotNumber') && (
                              <td className="font-mono font-bold text-gold">#{lot.lotNumber}</td>
                            )}
                            {visibleLotCols.includes('title') && (
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {lot.image && (
                                    <img
                                      src={lot.image}
                                      alt={lot.title}
                                      style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                    />
                                  )}
                                  <span className="font-semibold">{lot.title}</span>
                                </div>
                              </td>
                            )}
                            {visibleLotCols.includes('category') && (
                              <td className="text-muted">{lot.category}</td>
                            )}
                            {visibleLotCols.includes('consignor') && (
                              <td>{lot.consignorName || 'Private Consignor'}</td>
                            )}
                            {visibleLotCols.includes('reservePrice') && (
                              <td className="align-right font-mono">{formatCurrency(lot.reservePrice || 0)}</td>
                            )}
                            {visibleLotCols.includes('estimates') && (
                              <td className="align-right font-mono">
                                {formatCurrency(lot.estimateLow)} - {formatCurrency(lot.estimateHigh)}
                              </td>
                            )}
                            {visibleLotCols.includes('currentBid') && (
                              <td className="align-right font-mono font-bold text-gold">
                                {formatCurrency(lot.hammerPrice || lot.currentBid || lot.startingBid || 0)}
                              </td>
                            )}
                            {visibleLotCols.includes('status') && (
                              <td>
                                <span className={`node-status-pill ${lot.status === 'on_block' ? 'online' : 'standby'}`}>
                                  {lot.status === 'on_block' ? 'On Block' : lot.status}
                                </span>
                              </td>
                            )}
                            {visibleLotCols.includes('actions') && (
                              <td style={{ textAlign: 'center' }}>
                                <TableRowActionMenu actions={rowActions} />
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Lots when > 10 */}
              {filteredLots.length > 10 && (
                <div style={{ marginTop: 12 }}>
                  <ShadcnPagination
                    currentPage={lotPage}
                    totalItems={filteredLots.length}
                    pageSize={lotPageSize}
                    onPageChange={setLotPage}
                    onPageSizeChange={(sz) => {
                      setLotPageSize(sz);
                      setLotPage(1);
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    itemLabel="lots"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right-Side Drawers (ShadcnSheet) for Details & Forms */}
      {/* 1. Syndication Sheet */}
      <ShadcnSheet
        isOpen={drawerType === 'syndication'}
        onClose={() => setDrawerType(null)}
        title={
          drawerMode === 'create'
            ? 'Add Syndication Node'
            : drawerMode === 'edit'
            ? `Edit Node: ${selectedSyndication?.site}`
            : `Node Telemetry: ${selectedSyndication?.site}`
        }
        description="Configure HiBid network simulcast endpoint and traffic parameters."
        size="md"
        footer={
          drawerMode !== 'view' && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDrawerType(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveSyndication}>
                {drawerMode === 'create' ? 'Add Node' : 'Save Changes'}
              </button>
            </div>
          )
        }
      >
        {drawerMode === 'view' && selectedSyndication ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="info-item">
              <span className="info-label">Node Endpoint URL</span>
              <p className="info-value font-mono font-bold text-gold">{selectedSyndication.site}</p>
            </div>
            <div className="info-item">
              <span className="info-label">Telemetry Status</span>
              <span className={`node-status-pill ${selectedSyndication.views > 0 ? 'online' : 'standby'}`}>
                {selectedSyndication.views > 0 ? 'Online' : 'Standby'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div className="info-item">
                <span className="info-label">Registrations</span>
                <p className="info-value font-mono">{formatNumber(selectedSyndication.registrations)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">CC Authorizations</span>
                <p className="info-value font-mono">{formatNumber(selectedSyndication.ccAuths)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Saleroom Views</span>
                <p className="info-value font-mono">{formatNumber(selectedSyndication.views)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Unique Bidders</span>
                <p className="info-value font-mono">{formatNumber(selectedSyndication.uniqueBidders)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">High Bid Recorded</span>
                <p className="info-value font-mono text-gold font-bold">{formatCurrency(selectedSyndication.highBid)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Max Proxy Bid</span>
                <p className="info-value font-mono">{formatCurrency(selectedSyndication.maxBid)}</p>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => setDrawerMode('edit')}
              >
                <Edit2 size={14} /> Edit Telemetry Parameters
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Site Node Domain / Subdomain *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. mountainwest.hibid.com"
                value={syndicationForm.site}
                onChange={(e) => setSyndicationForm({ ...syndicationForm, site: e.target.value })}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Registrations
                </label>
                <input
                  type="number"
                  value={syndicationForm.registrations}
                  onChange={(e) => setSyndicationForm({ ...syndicationForm, registrations: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  CC Authorizations
                </label>
                <input
                  type="number"
                  value={syndicationForm.ccAuths}
                  onChange={(e) => setSyndicationForm({ ...syndicationForm, ccAuths: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Views
                </label>
                <input
                  type="number"
                  value={syndicationForm.views}
                  onChange={(e) => setSyndicationForm({ ...syndicationForm, views: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Unique Bidders
                </label>
                <input
                  type="number"
                  value={syndicationForm.uniqueBidders}
                  onChange={(e) => setSyndicationForm({ ...syndicationForm, uniqueBidders: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  High Bid ($)
                </label>
                <input
                  type="number"
                  value={syndicationForm.highBid}
                  onChange={(e) => setSyndicationForm({ ...syndicationForm, highBid: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Max Bid ($)
                </label>
                <input
                  type="number"
                  value={syndicationForm.maxBid}
                  onChange={(e) => setSyndicationForm({ ...syndicationForm, maxBid: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}
      </ShadcnSheet>

      {/* 2. Bidder Sheet */}
      <ShadcnSheet
        isOpen={drawerType === 'bidder'}
        onClose={() => setDrawerType(null)}
        title={
          drawerMode === 'create'
            ? 'Register New Bidder'
            : drawerMode === 'edit'
            ? `Edit Bidder #${selectedBidder?.bidCardNumber}`
            : `Bidder Profile #${selectedBidder?.bidCardNumber}`
        }
        description="Manage bidder credentials, paddle numbers, and check-in status."
        size="md"
        footer={
          drawerMode !== 'view' && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDrawerType(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveBidder}>
                {drawerMode === 'create' ? 'Register' : 'Save Changes'}
              </button>
            </div>
          )
        }
      >
        {drawerMode === 'view' && selectedBidder ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="info-item">
              <span className="info-label">Paddle Card Number</span>
              <p className="info-value font-mono font-bold text-gold">#{selectedBidder.bidCardNumber}</p>
            </div>
            <div className="info-item">
              <span className="info-label">Full Name & Organization</span>
              <p className="info-value font-bold">{selectedBidder.bidderName}</p>
              {selectedBidder.companyName && <p className="info-text">{selectedBidder.companyName}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div className="info-item">
                <span className="info-label">Origin Site</span>
                <p className="info-value">{selectedBidder.site}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Check-In Status</span>
                <p className="info-value">{selectedBidder.isCheckedIn ? 'Checked In' : 'Pending Check-In'}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <p className="info-value">{selectedBidder.email || '—'}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Phone</span>
                <p className="info-value">{selectedBidder.phone || '—'}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Credit Limit / Permission</span>
                <p className="info-value font-mono">{selectedBidder.permissionText}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Deposit Collected</span>
                <p className="info-value font-mono text-gold">{formatCurrency(selectedBidder.depositAmount)}</p>
              </div>
            </div>
            {selectedBidder.notes && (
              <div className="info-item">
                <span className="info-label">Curator Notes</span>
                <p className="info-text">{selectedBidder.notes}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => handleToggleCheckIn(selectedBidder)}
              >
                <UserCheck size={14} />
                <span>{selectedBidder.isCheckedIn ? 'Undo Check-In' : 'Mark Checked In'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDrawerMode('edit')}
              >
                <Edit2 size={14} /> Edit Record
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Paddle # *
                </label>
                <input
                  type="text"
                  value={bidderForm.bidCardNumber}
                  onChange={(e) => setBidderForm({ ...bidderForm, bidCardNumber: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Bidder Name *
                </label>
                <input
                  type="text"
                  value={bidderForm.bidderName}
                  onChange={(e) => setBidderForm({ ...bidderForm, bidderName: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Company / Estate Name
              </label>
              <input
                type="text"
                value={bidderForm.companyName}
                onChange={(e) => setBidderForm({ ...bidderForm, companyName: e.target.value })}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={bidderForm.email}
                  onChange={(e) => setBidderForm({ ...bidderForm, email: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Phone
                </label>
                <input
                  type="text"
                  value={bidderForm.phone}
                  onChange={(e) => setBidderForm({ ...bidderForm, phone: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Permission / Limit Tier
              </label>
              <select
                value={bidderForm.permissionText}
                onChange={(e) => setBidderForm({ ...bidderForm, permissionText: e.target.value })}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="Approved - Standard ($25,000)">Approved - Standard ($25,000)</option>
                <option value="Approved - High Limit ($50,000)">Approved - High Limit ($50,000)</option>
                <option value="Approved - VIP ($100,000)">Approved - VIP ($100,000)</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Deposit ($)
                </label>
                <input
                  type="number"
                  value={bidderForm.depositAmount}
                  onChange={(e) => setBidderForm({ ...bidderForm, depositAmount: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 22 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={bidderForm.isCheckedIn}
                    onChange={(e) => setBidderForm({ ...bidderForm, isCheckedIn: e.target.checked })}
                  />
                  <span>Mark checked in on floor</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </ShadcnSheet>

      {/* 3. Lot Sheet */}
      <ShadcnSheet
        isOpen={drawerType === 'lot'}
        onClose={() => setDrawerType(null)}
        title={
          drawerMode === 'edit'
            ? `Edit Lot #${selectedLot?.lotNumber}`
            : `Lot #${selectedLot?.lotNumber}: ${selectedLot?.title}`
        }
        description="Catalog specifications, reserve benchmarks, and rostrum status."
        size="md"
        footer={
          drawerMode === 'edit' && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDrawerType(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveLot}>
                Save Changes
              </button>
            </div>
          )
        }
      >
        {drawerMode === 'view' && selectedLot ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedLot.image && (
              <img
                src={selectedLot.image}
                alt={selectedLot.title}
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            )}
            <div className="info-item">
              <span className="info-label">Title</span>
              <p className="info-value font-bold">{selectedLot.title}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div className="info-item">
                <span className="info-label">Category</span>
                <p className="info-value">{selectedLot.category}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Rostrum Status</span>
                <span className={`node-status-pill ${selectedLot.status === 'on_block' ? 'online' : 'standby'}`}>
                  {selectedLot.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Consignor</span>
                <p className="info-value">{selectedLot.consignorName || 'Private Consignor'}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Floor Reserve</span>
                <p className="info-value font-mono text-gold font-bold">{formatCurrency(selectedLot.reservePrice)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Presale Low Estimate</span>
                <p className="info-value font-mono">{formatCurrency(selectedLot.estimateLow)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Presale High Estimate</span>
                <p className="info-value font-mono">{formatCurrency(selectedLot.estimateHigh)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Starting Bid</span>
                <p className="info-value font-mono">{formatCurrency(selectedLot.startingBid)}</p>
              </div>
              <div className="info-item">
                <span className="info-label">Current / Hammer Bid</span>
                <p className="info-value font-mono text-emerald-600 font-bold">
                  {formatCurrency(selectedLot.hammerPrice || selectedLot.currentBid || selectedLot.startingBid || 0)}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => handleSendLotToBlock(selectedLot)}
                disabled={selectedLot.status === 'on_block'}
              >
                <Gavel size={14} /> Send to Block
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDrawerMode('edit')}
              >
                <Edit2 size={14} /> Edit Lot
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Lot # *
                </label>
                <input
                  type="number"
                  value={lotForm.lotNumber}
                  onChange={(e) => setLotForm({ ...lotForm, lotNumber: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Category
                </label>
                <input
                  type="text"
                  value={lotForm.category}
                  onChange={(e) => setLotForm({ ...lotForm, category: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Title *
              </label>
              <input
                type="text"
                value={lotForm.title}
                onChange={(e) => setLotForm({ ...lotForm, title: e.target.value })}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Consignor Name
              </label>
              <input
                type="text"
                value={lotForm.consignorName}
                onChange={(e) => setLotForm({ ...lotForm, consignorName: e.target.value })}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Reserve ($)
                </label>
                <input
                  type="number"
                  value={lotForm.reservePrice}
                  onChange={(e) => setLotForm({ ...lotForm, reservePrice: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Low Est ($)
                </label>
                <input
                  type="number"
                  value={lotForm.estimateLow}
                  onChange={(e) => setLotForm({ ...lotForm, estimateLow: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  High Est ($)
                </label>
                <input
                  type="number"
                  value={lotForm.estimateHigh}
                  onChange={(e) => setLotForm({ ...lotForm, estimateHigh: Number(e.target.value) })}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Status
              </label>
              <select
                value={lotForm.status}
                onChange={(e) => setLotForm({ ...lotForm, status: e.target.value as any })}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="upcoming">Upcoming</option>
                <option value="on_block">On Rostrum Block</option>
                <option value="sold">Sold</option>
                <option value="passed">Passed</option>
              </select>
            </div>
          </div>
        )}
      </ShadcnSheet>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExecuteDelete}
        title={deleteTarget?.title || 'Delete Record'}
        entityName={deleteTarget?.subtitle || 'Record'}
        warningMessage="This action will permanently delete this record from the Supabase database. All linked telemetry and metrics will update immediately."
        isLoading={isDeleting}
        confirmButtonText="Delete Record"
      />
    </div>
  );
};
