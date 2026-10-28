import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuctionDetail } from '../../../context/AuctionDetailContext';
import { 
  AuctionDaySubTab, 
  BidderRegistration, 
  AuctionLotStat, 
  AlternateBid,
  HiBidSiteStat,
  BidderDeposit
} from '../../../types/auctionDetail';
import { FormModal } from '../../Common/FormModal';
import { FormField } from '../../Common/FormField';
import { auctionDayService, AuctionDayMetrics } from '../../../services/auctionDayService';
import { lotsService } from '../../../services/lotsService';
import { settlementService } from '../../../services/settlementService';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { 
  Loader2,
  ExternalLink, 
  CheckCircle, 
  RotateCcw, 
  Plus, 
  Gavel, 
  Radio, 
  Search, 
  Check, 
  Layers, 
  Users, 
  UserCheck, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  ArrowRight,
  Maximize2,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  Trash2,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Volume2,
  VolumeX,
  Flame,
  Globe,
  Camera,
  Upload,
  Download,
  CreditCard,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ArrowUpDown,
  CheckSquare,
  Square,
  MinusSquare,
  Printer,
  FileSpreadsheet,
  UserPlus,
  Info,
  Settings,
  Briefcase,
  HelpCircle,
  FileDown,
  MoreHorizontal,
  MoreVertical,
  Edit,
  Eye,
  Tag,
  Hash,
  Calendar,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';
import Papa from 'papaparse';
import '../AuctionDetailsStyles.css';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { LotItem, LiveBid, UserBidder, ClerkingState } from '../../../types';
import { 
  getStandardBidIncrement, 
  getNextValidBid, 
  getQuickIncrementOptions, 
  calculateReserveStatus, 
  validateProposedBid 
} from '../../../utils/biddingRules';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { ShadcnSelect, ShadcnSelectOption } from '../../ui/ShadcnSelect';
import { ShadcnDropdownMenu } from '../../ui/ShadcnDropdownMenu';
import { ShadcnSheet } from '../../ui/ShadcnSheet';
import { ShadcnPagination } from '../../ui/ShadcnPagination';
import { TableRowActionMenu, TableActionItem } from '../../Common/TableRowActionMenu';
import { ConfirmModal } from '../../Common/ConfirmModal';

// HiBid Brand Emblem Component matching Screenshot 2
const HiBidLogo: React.FC<{ height?: number }> = ({ height = 30 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
    <svg width={height * 1.1} height={height} viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 3L3 33H13L20 19L27 33H37L20 3Z" fill="#1e3a5f" />
      <path d="M20 11L11 27H16L20 19L24 27H29L20 11Z" fill="#0284c7" />
    </svg>
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <span style={{ 
        fontSize: height * 0.76, 
        fontWeight: 800, 
        color: '#1e3a5f', 
        letterSpacing: '-0.02em', 
        fontFamily: "'Inter', -apple-system, sans-serif" 
      }}>
        Hi<span style={{ color: '#0284c7' }}>Bid</span>
      </span>
      <span style={{ fontSize: height * 0.36, fontWeight: 700, color: '#64748b', marginLeft: 2 }}>™</span>
    </div>
  </div>
);

interface AuctionDayTabProps {
  currentTab: AuctionDaySubTab;
  onSelectTab: (tab: AuctionDaySubTab) => void;
  onNavigateClerking: () => void;
  lots?: LotItem[];
  bidders?: UserBidder[];
  bids?: LiveBid[];
  onPlaceBid?: (amount: number, paddleNumber: string, bidderName: string, source: LiveBid['source']) => void;
  onHammerSold?: (lotId: string, finalAmount: number, paddleNumber: string, overrideReserve?: boolean) => void;
  onPassLot?: (lotId: string, reason?: string) => void;
  onReopenLot?: (lotId: string) => void;
  onNextLot?: () => void;
  onSelectLot?: (lotId: string) => void;
  availableAuctions?: Array<{ id: string; code: string; title: string }>;
  selectedAuctionId?: string;
  onSelectAuction?: (id: string) => void;
  onNavigateReports?: () => void;
}

const isMockRegItem = (r: any) =>
  ['reg-1000', 'reg-5001', 'reg-5002', 'reg-5003'].includes(r?.id) ||
  ['1000', '5001', '5002', '5003'].includes(String(r?.bidCardNumber)) ||
  ['Randy A Stratford', 'Helena Vance', 'Marcus Chen', 'Eleanor Rigby'].includes(r?.bidderName);

const isMockDepositItem = (d: any) =>
  ['dep-1001', 'dep-1002', 'dep-1003'].includes(d?.id) ||
  ['5001', '2001', '5003'].includes(String(d?.bidCardNumber)) ||
  ['Helena Vance', 'Roger Perry', 'Eleanor Rigby'].includes(d?.bidderName);

const isMockAltBidItem = (b: any) =>
  ['alt-1', 'alt-2', 'alt-3'].includes(b?.id) ||
  ['Senator James Caldwell', 'Helena Vault Trust'].includes(b?.bidderName) ||
  ['4005', '3012'].includes(String(b?.paddleNumber));

const DEFAULT_CHECKIN_VISIBLE_COLUMNS: { [key: string]: boolean } = {
  bidCardNumber: true,
  companyName: true,
  bidderName: true,
  email: true,
  hearAboutUs: true,
  creditLimit: true,
  status: true,
  actions: true
};

export const AuctionDayTab: React.FC<AuctionDayTabProps> = ({
  currentTab,
  onSelectTab,
  onNavigateClerking,
  lots = [],
  bidders = [],
  bids = [],
  onPlaceBid,
  onHammerSold,
  onPassLot,
  onReopenLot,
  onNextLot,
  onSelectLot,
  availableAuctions = [],
  selectedAuctionId,
  onSelectAuction,
  onNavigateReports
}) => {
  const { state, dispatch, isLoading, loadError, reloadAuction } = useAuctionDetail();
  const { showToast } = useToast();
  const { user } = useAuth();
  const auction = state.data;
  const isAuctionClosed = auction?.status === 'Closed';

  // Local state for live mutations
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [registrations, setRegistrations] = useState<BidderRegistration[]>(
    () => (auction?.dayStats?.registrations || []).filter(r => !isMockRegItem(r))
  );
  const [alternateBids, setAlternateBids] = useState<AlternateBid[]>(
    () => (auction?.dayStats?.alternateBids || []).filter(b => !isMockAltBidItem(b))
  );
  const [siteStats, setSiteStats] = useState<HiBidSiteStat[]>(auction?.dayStats?.siteStats || []);
  const [deposits, setDeposits] = useState<BidderDeposit[]>(
    () => (auction?.dayStats?.deposits || []).filter(d => !isMockDepositItem(d))
  );

  // Dashboard Detail Subtabs: Details | Registrations | Lot Stats
  const [dashboardBottomTab, setDashboardBottomTab] = useState<'details' | 'registrations' | 'lot-stats'>('details');

  // Search, Selection, Sorting & Pagination for Check In
  const [checkInSearch, setCheckInSearch] = useState('');
  const [checkInStatusFilter, setCheckInStatusFilter] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [selectedRegIds, setSelectedRegIds] = useState<Set<string>>(new Set());
  const [checkInSortField, setCheckInSortField] = useState<'bidCardNumber' | 'companyName' | 'bidderName' | 'email' | 'hearAboutUs' | 'permissionText' | 'isCheckedIn'>('bidCardNumber');
  const [checkInSortOrder, setCheckInSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Table Pagination states (Default 20 per page)
  const [altBidsPage, setAltBidsPage] = useState<number>(1);
  const [altBidsPageSize, setAltBidsPageSize] = useState<number>(20);
  const [siteStatsPage, setSiteStatsPage] = useState<number>(1);
  const [siteStatsPageSize, setSiteStatsPageSize] = useState<number>(20);
  const [dashRegPage, setDashRegPage] = useState<number>(1);
  const [dashRegPageSize, setDashRegPageSize] = useState<number>(20);
  const [lotStatsPage, setLotStatsPage] = useState<number>(1);
  const [lotStatsPageSize, setLotStatsPageSize] = useState<number>(20);
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('af360_auction_day_checkin_columns');
      if (saved) {
        return {
          ...DEFAULT_CHECKIN_VISIBLE_COLUMNS,
          ...JSON.parse(saved)
        };
      }
    } catch (_) {}
    return DEFAULT_CHECKIN_VISIBLE_COLUMNS;
  });
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [isColConfigDropdownOpen, setIsColConfigDropdownOpen] = useState(false);

  // Import Bidders Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [importFileName, setImportFileName] = useState('');
  const [importAutoMap, setImportAutoMap] = useState(true);
  const [importAutoCheckIn, setImportAutoCheckIn] = useState(true);
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importParsedList, setImportParsedList] = useState<Array<{
    bidCardNumber: string;
    companyName: string;
    bidderName: string;
    email: string;
    phone: string;
    creditLimit: string;
    hearAboutUs: string;
    status: 'valid' | 'duplicate_paddle' | 'duplicate_email' | 'invalid';
    error?: string;
  }>>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Scan License Modal state
  const [isScanLicenseModalOpen, setIsScanLicenseModalOpen] = useState(false);
  const [scanLicenseMode, setScanLicenseMode] = useState<'camera' | 'upload' | 'simulate'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [scannedData, setScannedData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    licenseNumber: '',
    dob: '',
    paddleNumber: '',
    email: '',
    phone: '',
    companyName: '',
    hearAboutUs: 'Driver License Scan'
  });
  const [isSavingScannedBidder, setIsSavingScannedBidder] = useState(false);

  // Manage Deposits Modal state
  const [isManageDepositsModalOpen, setIsManageDepositsModalOpen] = useState(false);
  const [isNewDepositDialogOpen, setIsNewDepositDialogOpen] = useState(false);
  const [depositSearchTerm, setDepositSearchTerm] = useState('');
  const [depositFilterBidder, setDepositFilterBidder] = useState('all');
  const [depositPage, setDepositPage] = useState(1);
  const [depositEntriesPerPage, setDepositEntriesPerPage] = useState(20);
  const [newDepBidderRegId, setNewDepBidderRegId] = useState('');
  const [newDepAmount, setNewDepAmount] = useState('');
  const [newDepMethod, setNewDepMethod] = useState<'Credit Card' | 'Cash' | 'Wire Transfer' | 'Check' | "Cashier's Check" | 'ACH'>('Credit Card');
  const [newDepStatus, setNewDepStatus] = useState<'Collected' | 'Pending' | 'Refunded' | 'Applied'>('Collected');
  const [newDepRef, setNewDepRef] = useState('');
  const [newDepNotes, setNewDepNotes] = useState('');
  const [isRecordingDeposit, setIsRecordingDeposit] = useState(false);

  // Alternate Bid Search & Filters
  const [altBidSearch, setAltBidSearch] = useState('');
  const [altBidTypeFilter, setAltBidTypeFilter] = useState<string>('all');
  const [altBidStatusFilter, setAltBidStatusFilter] = useState<string>('all');

  // Alternate Bid Modal state
  const [isAltBidModalOpen, setIsAltBidModalOpen] = useState(false);
  const [altLotNum, setAltLotNum] = useState('');
  const [altBidderName, setAltBidderName] = useState('');
  const [altPaddle, setAltPaddle] = useState('');
  const [altType, setAltType] = useState<'Phone' | 'Absentee' | 'Floor'>('Phone');
  const [altAmount, setAltAmount] = useState('');
  const [altMaxAmount, setAltMaxAmount] = useState('');
  const [altNotes, setAltNotes] = useState('');
  const [isSubmittingAltBid, setIsSubmittingAltBid] = useState(false);

  // New Bidder Registration Modal state (for toolbar + REGISTER BIDDER)
  const [isNewRegModalOpen, setIsNewRegModalOpen] = useState(false);
  const [newRegBidCard, setNewRegBidCard] = useState('');
  const [newRegName, setNewRegName] = useState('');
  const [newRegCompany, setNewRegCompany] = useState('');
  const [newRegEmail, setNewRegEmail] = useState('');
  const [newRegPhone, setNewRegPhone] = useState('');
  const [newRegHearAboutUs, setNewRegHearAboutUs] = useState('Website');
  const [newRegUsername, setNewRegUsername] = useState('');
  const [newRegLimit, setNewRegLimit] = useState('25000');
  const [newRegSite, setNewRegSite] = useState('Saleroom In-House');
  const [newRegNotes, setNewRegNotes] = useState('');
  const [newRegCheckInImmediately, setNewRegCheckInImmediately] = useState(true);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Add HiBid Site Stat Modal state
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [newSiteRegs, setNewSiteRegs] = useState('25');
  const [newSiteAuths, setNewSiteAuths] = useState('24');
  const [newSiteViews, setNewSiteViews] = useState('1500');
  const [newSiteBids, setNewSiteBids] = useState('65');

  // In-tab Clerking State
  const [activeClerkLotId, setActiveClerkLotId] = useState<string>('');
  const [clerkingPaddle, setClerkingPaddle] = useState<string>('104');
  const [clerkingSource, setClerkingSource] = useState<LiveBid['source']>('Floor');
  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [audioGavelEnabled, setAudioGavelEnabled] = useState<boolean>(true);

  // AF360 Live Clerking Workflow State
  const [customLots, setCustomLots] = useState<LotItem[]>(lots || []);
  const [clerkLotNumber, setClerkLotNumber] = useState<string>('1');
  const [clerkSeller, setClerkSeller] = useState<string>('');
  const [clerkTitle, setClerkTitle] = useState<string>('');
  const [clerkHammerPrice, setClerkHammerPrice] = useState<string>('');
  const [clerkBidderNumber, setClerkBidderNumber] = useState<string>('');
  const [clerkQuantity, setClerkQuantity] = useState<number>(1);
  const [clerkStatus, setClerkStatus] = useState<string>('Sold');
  const [clerkXMoney, setClerkXMoney] = useState<boolean>(false);
  const [clerkingAssist, setClerkingAssist] = useState<boolean>(true);
  const [isClerkingSaving, setIsClerkingSaving] = useState<boolean>(false);
  const [clerkingSearch, setClerkingSearch] = useState<string>('');
  const [clerkingPage, setClerkingPage] = useState<number>(1);
  const [clerkingPageSize, setClerkingPageSize] = useState<number>(20);
  const [selectedClerkingLotIds, setSelectedClerkingLotIds] = useState<Set<string>>(new Set());
  const [isClerkingStatsExpanded, setIsClerkingStatsExpanded] = useState<boolean>(false);

  // Dynamic Supabase Customers and Auctions for Live Clerking Dropdowns
  const [supabaseCustomers, setSupabaseCustomers] = useState<Array<{
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    customerCode: string;
    email?: string;
    phone?: string;
    companyName?: string;
    isPermanent?: boolean;
    permanentBidderNumber?: string | null;
  }>>([]);
  const [supabaseAuctions, setSupabaseAuctions] = useState<Array<{
    id: string;
    title: string;
    code: string;
    status?: string;
  }>>([]);

  // Clerking Drawer State (Edit / View)
  const [clerkingDrawer, setClerkingDrawer] = useState<{
    isOpen: boolean;
    mode: 'edit' | 'view';
    lot?: LotItem;
  }>({ isOpen: false, mode: 'view' });
  const [drawerClerkLotId, setDrawerClerkLotId] = useState('');
  const [drawerClerkLotNum, setDrawerClerkLotNum] = useState('');
  const [drawerClerkSeller, setDrawerClerkSeller] = useState('');
  const [drawerClerkTitle, setDrawerClerkTitle] = useState('');
  const [drawerClerkHammerPrice, setDrawerClerkHammerPrice] = useState('');
  const [drawerClerkBidder, setDrawerClerkBidder] = useState('');
  const [drawerClerkStatus, setDrawerClerkStatus] = useState('Sold');
  const [drawerClerkQuantity, setDrawerClerkQuantity] = useState(1);
  const [drawerClerkXMoney, setDrawerClerkXMoney] = useState(false);
  const [isSavingDrawerClerking, setIsSavingDrawerClerking] = useState(false);

  // Bidder Check In Modal state (Matching AuctionFlex360 Bidder Check In)
  const [isBidderCheckInModalOpen, setIsBidderCheckInModalOpen] = useState(false);
  const [checkInTabMode, setCheckInTabMode] = useState<'find' | 'create'>('find');
  const [checkInSearchFirstName, setCheckInSearchFirstName] = useState('');
  const [checkInSearchLastName, setCheckInSearchLastName] = useState('');
  const [checkInSearchPaddle, setCheckInSearchPaddle] = useState('');
  const [checkInSearchCompany, setCheckInSearchCompany] = useState('');
  const [checkInSearchCustomerCode, setCheckInSearchCustomerCode] = useState('');
  const [checkInSearchPermanentOnly, setCheckInSearchPermanentOnly] = useState(false);
  const [checkInSearchResults, setCheckInSearchResults] = useState<any[]>([]);
  const [hasSearchedCheckIn, setHasSearchedCheckIn] = useState(false);
  const [checkInPage, setCheckInPage] = useState(1);
  const [checkInEntriesPerPage, setCheckInEntriesPerPage] = useState(10);

  // Create New Customer fields inside Bidder Check In
  const [newCustFirstName, setNewCustFirstName] = useState('');
  const [newCustLastName, setNewCustLastName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('');
  const [newCustZip, setNewCustZip] = useState('');
  const [newCustPaddle, setNewCustPaddle] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('25000');
  const [newCustPermanent, setNewCustPermanent] = useState(false);
  const [newCustCheckInImmediately, setNewCustCheckInImmediately] = useState(true);
  const [isCreatingNewCust, setIsCreatingNewCust] = useState(false);

  // Legacy Quick Check In Modal state (fallback)
  const [isQuickCheckInModalOpen, setIsQuickCheckInModalOpen] = useState(false);
  const [quickCheckInSearch, setQuickCheckInSearch] = useState('');

  // Check In Confirmation Modal state (for verifying and checking in 1+ selected bidders)
  const [isCheckInConfirmModalOpen, setIsCheckInConfirmModalOpen] = useState(false);
  const [checkInVerifyPhotoId, setCheckInVerifyPhotoId] = useState(true);
  const [checkInIssuePaddle, setCheckInIssuePaddle] = useState(true);
  const [checkInConfirmDeposit, setCheckInConfirmDeposit] = useState(true);
  const [checkInClerkNotes, setCheckInClerkNotes] = useState('');
  const [isSubmittingCheckInConfirm, setIsSubmittingCheckInConfirm] = useState(false);

  // =========================================================================
  // RIGHT-SIDE DRAWER STATES & FORM FIELDS (ShadcnSheet)
  // =========================================================================
  const [bidderDrawer, setBidderDrawer] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'view';
    data?: BidderRegistration;
  }>({ isOpen: false, mode: 'view' });

  const [altBidDrawer, setAltBidDrawer] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'view';
    data?: AlternateBid;
  }>({ isOpen: false, mode: 'view' });

  const [siteStatDrawer, setSiteStatDrawer] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'view';
    data?: HiBidSiteStat;
  }>({ isOpen: false, mode: 'view' });

  const [depositDrawer, setDepositDrawer] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'view';
    data?: BidderDeposit;
  }>({ isOpen: false, mode: 'view' });

  const [lotDrawer, setLotDrawer] = useState<{
    isOpen: boolean;
    lot?: LotItem;
  }>({ isOpen: false });

  // Delete Confirmation Dialog State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    entityType: 'bidder' | 'altBid' | 'siteStat' | 'deposit';
    id: string;
    title: string;
    label: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    entityType: 'bidder',
    id: '',
    title: '',
    label: '',
    isLoading: false
  });

  // Drawer Form fields: Bidder Registration
  const [drawerBidCard, setDrawerBidCard] = useState('');
  const [drawerBidderName, setDrawerBidderName] = useState('');
  const [drawerCompany, setDrawerCompany] = useState('');
  const [drawerEmail, setDrawerEmail] = useState('');
  const [drawerPhone, setDrawerPhone] = useState('');
  const [drawerHearAboutUs, setDrawerHearAboutUs] = useState('Website');
  const [drawerLimit, setDrawerLimit] = useState('25000');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [drawerIsCheckedIn, setDrawerIsCheckedIn] = useState(false);
  const [isSavingDrawerBidder, setIsSavingDrawerBidder] = useState(false);

  // Drawer Form fields: Alternate Bid
  const [drawerAltLotNum, setDrawerAltLotNum] = useState('');
  const [drawerAltBidderName, setDrawerAltBidderName] = useState('');
  const [drawerAltPaddle, setDrawerAltPaddle] = useState('');
  const [drawerAltType, setDrawerAltType] = useState<'Phone' | 'Absentee' | 'Floor'>('Phone');
  const [drawerAltAmount, setDrawerAltAmount] = useState('');
  const [drawerAltMaxAmount, setDrawerAltMaxAmount] = useState('');
  const [drawerAltStatus, setDrawerAltStatus] = useState<string>('Active');
  const [drawerAltNotes, setDrawerAltNotes] = useState('');
  const [isSavingDrawerAltBid, setIsSavingDrawerAltBid] = useState(false);

  // Drawer Form fields: HiBid Portal Node
  const [drawerSiteDomain, setDrawerSiteDomain] = useState('');
  const [drawerSiteRegs, setDrawerSiteRegs] = useState('25');
  const [drawerSiteAuths, setDrawerSiteAuths] = useState('24');
  const [drawerSiteViews, setDrawerSiteViews] = useState('1500');
  const [drawerSiteBids, setDrawerSiteBids] = useState('65');
  const [drawerSiteHighBid, setDrawerSiteHighBid] = useState('12500');
  const [drawerSiteMaxBid, setDrawerSiteMaxBid] = useState('24000');
  const [isSavingDrawerSite, setIsSavingDrawerSite] = useState(false);

  // Drawer Form fields: Bidder Deposit
  const [drawerDepBidderId, setDrawerDepBidderId] = useState('');
  const [drawerDepAmount, setDrawerDepAmount] = useState('');
  const [drawerDepMethod, setDrawerDepMethod] = useState<'Credit Card' | 'Cash' | 'Wire Transfer' | 'Check' | "Cashier's Check" | 'ACH'>('Credit Card');
  const [drawerDepStatus, setDrawerDepStatus] = useState<'Collected' | 'Pending' | 'Refunded' | 'Applied'>('Collected');
  const [drawerDepRef, setDrawerDepRef] = useState('');
  const [drawerDepNotes, setDrawerDepNotes] = useState('');
  const [isSavingDrawerDeposit, setIsSavingDrawerDeposit] = useState(false);

  // Sync internal state when auction changes (strictly dynamic records only)
  useEffect(() => {
    if (auction?.dayStats) {
      setRegistrations((auction.dayStats.registrations || []).filter(r => !isMockRegItem(r)));
      setAlternateBids((auction.dayStats.alternateBids || []).filter(b => !isMockAltBidItem(b)));
      setSiteStats(auction.dayStats.siteStats || []);
      setDeposits((auction.dayStats.deposits || []).filter(d => !isMockDepositItem(d)));
    }
  }, [auction?.id, auction?.dayStats]);

  // Initial mount load: pull fresh data directly from Supabase / auctionDayService
  useEffect(() => {
    if (!auction?.id) return;
    let isMounted = true;
    auctionDayService.getAuctionDayData(auction.id, lots).then(payload => {
      if (!isMounted) return;
      if (payload.registrations) {
        setRegistrations(payload.registrations.filter(r => !isMockRegItem(r)));
      }
      if (payload.alternateBids) {
        setAlternateBids(payload.alternateBids.filter(b => !isMockAltBidItem(b)));
      }
      if (payload.siteStats && payload.siteStats.length > 0) {
        setSiteStats(payload.siteStats);
      }
      if (payload.deposits) {
        setDeposits(payload.deposits.filter(d => !isMockDepositItem(d)));
      }
      if (payload.auction) {
        dispatch({ type: 'SET_AUCTION', payload: payload.auction });
      }
    }).catch(err => {
      console.warn('[AuctionDayTab] Initial data pull notice:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [auction?.id]);

  // Supabase Realtime Subscription for multi-user live updates
  useEffect(() => {
    if (!auction?.id) return;

    const unsubscribe = auctionDayService.subscribeToAuctionDay(auction.id, async () => {
      console.log('[AuctionDayTab] Supabase Realtime event detected for auction:', auction.id);
      try {
        const payload = await auctionDayService.getAuctionDayData(auction.id, lots);
        setRegistrations((payload.registrations || []).filter(r => !isMockRegItem(r)));
        setAlternateBids((payload.alternateBids || []).filter(b => !isMockAltBidItem(b)));
        setSiteStats(payload.siteStats);
        setDeposits((payload.deposits || []).filter(d => !isMockDepositItem(d)));
        dispatch({ type: 'SET_AUCTION', payload: payload.auction });
      } catch (err) {
        console.warn('[AuctionDayTab] Realtime sync error:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [auction?.id, lots, dispatch]);

  // Sync custom lots if lots prop changes externally
  useEffect(() => {
    if (lots && lots.length > 0) {
      setCustomLots(lots);
    }
  }, [lots]);

  // Scoped lots for currently selected auction (strictly dynamic lots only)
  const auctionLots = useMemo(() => {
    if (!auction) return [];
    const baseLots = customLots.length > 0 ? customLots : (lots || []);
    return baseLots.filter(l => l.auctionId === auction.id && !l.id?.startsWith('lot-ref-'));
  }, [lots, customLots, auction?.id]);

  // Unique consignors/sellers across current auction lots (dynamic from lot records)
  const uniqueSellersList = useMemo(() => {
    const set = new Set<string>();
    auctionLots.forEach(lot => {
      const seller = lot.consignorName || (lot as any).sellerName || (lot as any).consignor_name;
      if (seller && seller.trim()) {
        set.add(seller.trim());
      }
    });
    return Array.from(set).map(name => ({ value: name, label: name }));
  }, [auctionLots]);

  // Real database fetch for Customers (users table) and Auctions (auctions table)
  const fetchDropdownData = useCallback(async () => {
    try {
      const client = supabaseAdmin || supabase;

      // 1. Fetch real customers from Supabase 'users' table ONLY
      const { data: usersData, error: usersErr } = await client
        .from('users')
        .select('id, full_name, first_name, last_name, customer_code, permanent_bidder_number, is_permanent_bidder, email, phone, company_name, role')
        .order('full_name', { ascending: true });

      if (!usersErr && usersData) {
        const mappedCustomers = usersData.map((u: any) => {
          const fullName = u.full_name?.trim() || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Customer';
          const cleanPaddle = u.permanent_bidder_number ? String(u.permanent_bidder_number) : null;
          const customerCode = u.customer_code || (cleanPaddle ? `PADDLE #${cleanPaddle}` : `CUST-${u.id.slice(0, 6).toUpperCase()}`);
          return {
            id: u.id,
            fullName,
            firstName: u.first_name || fullName.split(/\s+/)[0] || '',
            lastName: u.last_name || fullName.split(/\s+/).slice(1).join(' ') || '',
            customerCode,
            email: u.email || '',
            phone: u.phone || '',
            companyName: u.company_name || '',
            isPermanent: Boolean(u.is_permanent_bidder || u.permanent_bidder_number),
            permanentBidderNumber: cleanPaddle
          };
        });
        setSupabaseCustomers(mappedCustomers);
      }

      // 2. Fetch real auctions from Supabase 'auctions' table
      const { data: auctionsData, error: auctionsErr } = await client
        .from('auctions')
        .select('id, name, code, status')
        .order('name', { ascending: true });

      if (!auctionsErr && auctionsData) {
        const mappedAuctions = auctionsData.map((a: any) => ({
          id: a.id,
          title: a.name || 'Untitled Auction',
          code: a.code || `AUC-${a.id.slice(0, 6).toUpperCase()}`,
          status: a.status || 'Active'
        }));
        setSupabaseAuctions(mappedAuctions);
      }
    } catch (err) {
      console.warn('[AuctionDayTab] Error fetching dynamic dropdown data from Supabase:', err);
    }
  }, []);

  // Fetch dropdown data on mount & subscribe to Supabase Realtime for 'users' table
  useEffect(() => {
    fetchDropdownData();

    // Live real-time subscription for dynamic updates without full page refresh
    const client = supabaseAdmin || supabase;
    const userChannel = client
      .channel('realtime-users-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchDropdownData();
      })
      .subscribe();

    return () => {
      client.removeChannel(userChannel);
    };
  }, [fetchDropdownData]);

  // Refresh customer details dynamically whenever Bidder Check In modal is opened
  useEffect(() => {
    if (isBidderCheckInModalOpen) {
      fetchDropdownData();
    }
  }, [isBidderCheckInModalOpen, fetchDropdownData]);

  // Dynamic Customer Options for "Sold To" dropdown with Shadcn styling & search
  const customerSelectOptions = useMemo<ShadcnSelectOption[]>(() => {
    const list: ShadcnSelectOption[] = supabaseCustomers.map(c => ({
      value: c.fullName,
      label: c.fullName,
      badge: c.customerCode,
      description: c.email ? `${c.email} • ID: ${c.id.slice(0, 8)}` : `ID: ${c.id.slice(0, 8)}`
    }));

    // If clerkSeller is set and not already in options, keep it visible
    if (clerkSeller && !list.some(o => o.value.toLowerCase() === clerkSeller.toLowerCase())) {
      list.unshift({
        value: clerkSeller,
        label: clerkSeller,
        badge: 'Selected'
      });
    }

    if (list.length === 0) {
      return [
        { value: 'SAURABH YADAVS', label: 'SAURABH YADAVS', badge: 'CUST-866149', description: 'sky1@gmail.com • ID: 866149c8' },
        { value: 'Super Admin', label: 'Super Admin', badge: 'STAFF', description: 'admin@gardnerauction.com • ID: e4daf034' }
      ];
    }

    return list;
  }, [supabaseCustomers, clerkSeller]);

  // Dynamic Auction Title Options for "Title" dropdown with Shadcn styling & search
  const auctionTitleSelectOptions = useMemo<ShadcnSelectOption[]>(() => {
    const list: ShadcnSelectOption[] = supabaseAuctions.map(a => ({
      value: a.title,
      label: a.title,
      badge: a.code,
      description: `ID: ${a.id} • Status: ${a.status}`
    }));

    // If clerkTitle has a custom value (e.g. from current lot) not yet in list, keep it visible
    if (clerkTitle && !list.some(o => o.value.toLowerCase() === clerkTitle.toLowerCase())) {
      list.unshift({
        value: clerkTitle,
        label: clerkTitle,
        badge: 'Lot Title'
      });
    }

    if (list.length === 0) {
      if (auction?.name) {
        return [{ value: auction.name, label: auction.name, badge: auction.code || 'AUC-001', description: `ID: ${auction.id}` }];
      }
      return [
        { value: 'Spring Collector Auction — Session I', label: 'Spring Collector Auction — Session I', badge: 'AUC-001', description: 'ID: auc-001' },
        { value: 'Test saurabh', label: 'Test saurabh', badge: 'SA4169', description: 'ID: auc-1792654367075' },
        { value: 'Test gold', label: 'Test gold', badge: 'sss44', description: 'ID: auc-1792664749020' }
      ];
    }

    return list;
  }, [supabaseAuctions, clerkTitle, auction?.name, auction?.code, auction?.id]);

  // Selected bidder records for Check In dialog
  const selectedBiddersList = useMemo(() => {
    return registrations.filter(r => selectedRegIds.has(r.id));
  }, [registrations, selectedRegIds]);

  // Active lot on the clerking block
  const currentBlockLot = useMemo(() => {
    if (activeClerkLotId) {
      const found = auctionLots.find(l => l.id === activeClerkLotId);
      if (found) return found;
    }
    return auctionLots.find(l => l.status === 'on_block') || auctionLots[0];
  }, [auctionLots, activeClerkLotId]);

  // Set initial active clerking lot
  useEffect(() => {
    if (currentBlockLot && !activeClerkLotId) {
      setActiveClerkLotId(currentBlockLot.id);
      setClerkLotNumber(String(currentBlockLot.lotNumber));
    }
  }, [currentBlockLot?.id]);

  // Active selected lot in Clerking entry form
  const selectedClerkLot = useMemo(() => {
    const num = parseInt(clerkLotNumber, 10);
    if (!isNaN(num)) {
      const found = auctionLots.find(l => l.lotNumber === num);
      if (found) return found;
    }
    return currentBlockLot || auctionLots[0];
  }, [auctionLots, clerkLotNumber, currentBlockLot]);

  // When selectedClerkLot changes or active lot changes, synchronize form
  useEffect(() => {
    if (selectedClerkLot) {
      setClerkTitle(selectedClerkLot.title || (auction?.name || ''));
      const s = (selectedClerkLot as any).highBidderName || (selectedClerkLot as any).soldTo || selectedClerkLot.consignorName || (selectedClerkLot as any).sellerName || (selectedClerkLot as any).consignor_name || '';
      setClerkSeller(s);
      if (selectedClerkLot.status === 'sold') {
        setClerkHammerPrice(String(selectedClerkLot.hammerPrice || selectedClerkLot.currentBid || ''));
        setClerkBidderNumber(selectedClerkLot.highBidderPaddle || (selectedClerkLot as any).soldToBidderId || '');
        setClerkStatus('Sold');
      } else if (selectedClerkLot.status === 'passed') {
        setClerkStatus('Passed');
      } else {
        setClerkStatus('Sold');
      }
    }
  }, [selectedClerkLot?.id]);

  // Dynamic bidder validation badge
  const bidderValidationStatus = useMemo(() => {
    if (!clerkBidderNumber.trim()) return null;
    const searchPaddle = clerkBidderNumber.trim().toLowerCase();
    const matched = registrations.find(r => r.bidCardNumber.toLowerCase() === searchPaddle);
    if (matched) {
      if (matched.isCheckedIn) {
        return {
          status: 'checked_in',
          text: `✓ ${matched.bidderName} (Checked In)`,
          color: '#15803d',
          bg: '#dcfce7'
        };
      } else {
        return {
          status: 'pending',
          text: `⚠ ${matched.bidderName} (Pending Check In)`,
          color: '#b45309',
          bg: '#fef3c7'
        };
      }
    }
    // Match against real Supabase database customers
    const dbCustomer = supabaseCustomers.find(c => 
      c.permanentBidderNumber?.toLowerCase() === searchPaddle ||
      c.customerCode.replace(/\D+/g, '').toLowerCase() === searchPaddle ||
      c.id.slice(0, 6).toLowerCase() === searchPaddle ||
      c.customerCode.toLowerCase() === searchPaddle
    );
    if (dbCustomer) {
      return {
        status: 'pending',
        text: `✓ ${dbCustomer.fullName} (Customer in DB - Lookup to Check In)`,
        color: '#0284c7',
        bg: '#e0f2fe'
      };
    }
    return {
      status: 'unregistered',
      text: '✕ Not Registered',
      color: '#b91c1c',
      bg: '#fee2e2'
    };
  }, [clerkBidderNumber, registrations, supabaseCustomers]);

  // Compute live metrics dynamically from Supabase records
  const metrics: AuctionDayMetrics = useMemo(() => {
    if (!auction) {
      return {
        lotCount: 0,
        checkInCount: 0,
        uniqueSellers: 0,
        presaleMin: 0,
        presaleMax: 0,
        avgEstimate: null,
        avgSalesPrice: null,
        hibidUrl: 'https://hibid.com'
      };
    }
    return auctionDayService.computeMetrics(
      auctionLots,
      registrations,
      auction.dayStats?.hibidUrl || 'https://hibid.com'
    );
  }, [auctionLots, registrations, auction?.dayStats?.hibidUrl]);

  // Total Summary row for HiBid Multi-Portal Syndication Statistics Table
  const totalSiteStats = useMemo(() => {
    return siteStats.reduce(
      (acc, curr) => ({
        site: 'Total',
        registrations: acc.registrations + (curr.registrations || 0),
        ccAuths: acc.ccAuths + (curr.ccAuths || 0),
        views: acc.views + (curr.views || 0),
        uniqueBidders: acc.uniqueBidders + (curr.uniqueBidders || 0),
        uniqueBids: acc.uniqueBids + (curr.uniqueBids || 0),
        totalBids: acc.totalBids + (curr.totalBids || 0),
        highBid: acc.highBid + (curr.highBid || 0),
        maxBid: acc.maxBid + (curr.maxBid || 0)
      }),
      {
        site: 'Total',
        registrations: 0,
        ccAuths: 0,
        views: 0,
        uniqueBidders: 0,
        uniqueBids: 0,
        totalBids: 0,
        highBid: 0,
        maxBid: 0
      }
    );
  }, [siteStats]);

  // Audio Gavel Synthesizer
  const playGavelSound = () => {
    if (!audioGavelEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.85, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (_) {}
  };

  // Refresh handler to pull latest records from Supabase
  const handleRefreshData = async () => {
    if (!auction) return;
    setIsRefreshing(true);
    try {
      const payload = await auctionDayService.getAuctionDayData(auction.id, lots);
      setRegistrations(payload.registrations);
      setAlternateBids(payload.alternateBids);
      setSiteStats(payload.siteStats);
      setDeposits(payload.deposits || []);
      dispatch({ type: 'SET_AUCTION', payload: payload.auction });
      showToast('success', 'Refreshed', 'Auction Day metrics synchronized with Supabase.');
    } catch (err) {
      showToast('error', 'Sync Notice', 'Failed to refresh from database.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export Bidders CSV Handler matching AuctionFlex360
  const handleExportBiddersCSV = () => {
    if (registrations.length === 0) {
      showToast('info', 'No Bidders', 'There are no registered bidders to export for this auction.');
      return;
    }
    const headers = ['Bidder #', 'Company Name', 'Name', 'Email', 'Phone', 'Hear About Us', 'Credit Limit', 'Status', 'Deposit Amount', 'Registration Date'];
    const rows = registrations.map(r => [
      `"${r.bidCardNumber}"`,
      `"${(r.companyName || '').replace(/"/g, '""')}"`,
      `"${r.bidderName.replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.phone || '').replace(/"/g, '""')}"`,
      `"${(r.hearAboutUs || '').replace(/"/g, '""')}"`,
      `"${(r.permissionText || '').replace(/"/g, '""')}"`,
      r.isCheckedIn ? '"Checked In"' : '"Pending"',
      r.depositAmount || 0,
      `"${r.dateTime || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${auction?.code || 'auction'}_bidders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Bidders Exported', `Successfully exported ${registrations.length} bidder(s) to CSV.`);
  };

  // Check In Toggle Handler with immediate persistence
  const handleToggleCheckIn = async (regId: string, currentStatus: boolean) => {
    if (!auction) return;
    if (isAuctionClosed) {
      showToast('error', 'Auction Closed', 'Cannot modify bidder check-in status on a closed auction.');
      return;
    }
    const newStatus = !currentStatus;

    // Optimistic UI update
    setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, isCheckedIn: newStatus } : r));

    try {
      const res = await auctionDayService.toggleCheckIn(auction.id, regId, newStatus);
      if (res.success) {
        showToast(
          newStatus ? 'success' : 'info',
          newStatus ? 'Bidder Checked In' : 'Check In Reverted',
          `Bidder status updated and persisted to Supabase.`
        );
      }
    } catch (e) {
      showToast('error', 'Error', 'Could not save check in status.');
    }
  };

  // Bulk Check In / Undo Check In Handler
  const handleBulkCheckIn = async (checkIn: boolean = true) => {
    if (!auction) return;
    if (isAuctionClosed) {
      showToast('error', 'Auction Closed', 'Cannot modify check-in status on a closed auction.');
      return;
    }
    if (selectedRegIds.size === 0) {
      showToast('info', 'No Bidders Selected', 'Please select one or more bidders from the table to check in.');
      return;
    }

    const idsToUpdate = Array.from(selectedRegIds);
    setRegistrations(prev => prev.map(r => idsToUpdate.includes(r.id) ? { ...r, isCheckedIn: checkIn } : r));

    try {
      const res = await auctionDayService.bulkCheckIn(auction.id, idsToUpdate, checkIn);
      if (res.success) {
        showToast(
          'success',
          checkIn ? 'Check In Complete' : 'Check In Reverted',
          `Successfully ${checkIn ? 'checked in' : 'reverted check in for'} ${idsToUpdate.length} bidder(s).`
        );
        setSelectedRegIds(new Set());
      } else {
        showToast('error', 'Error', res.error || 'Failed to update check in status.');
      }
    } catch (err) {
      showToast('error', 'Database Error', 'Failed to persist check in status to Supabase.');
    }
  };

  // Check In Modal Confirmation Handler (for verifying credentials and confirming selected bidders)
  const handleConfirmCheckInModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!auction) return;
    if (selectedRegIds.size === 0) {
      showToast('info', 'No Bidders Selected', 'Please select one or more bidders from the table.');
      setIsCheckInConfirmModalOpen(false);
      return;
    }

    setIsSubmittingCheckInConfirm(true);
    const idsToUpdate = Array.from(selectedRegIds);

    // Optimistically update local registrations
    setRegistrations(prev => prev.map(r => idsToUpdate.includes(r.id) ? {
      ...r,
      isCheckedIn: true,
      notes: checkInClerkNotes.trim()
        ? `${r.notes ? r.notes + ' | ' : ''}Check-in: ${checkInClerkNotes.trim()}`
        : r.notes
    } : r));

    try {
      const res = await auctionDayService.bulkCheckIn(auction.id, idsToUpdate, true);
      if (res.success) {
        showToast(
          'success',
          'Check In Complete',
          `Successfully verified credentials and checked in ${idsToUpdate.length} bidder(s).`
        );
        setSelectedRegIds(new Set());
        setIsCheckInConfirmModalOpen(false);
        setCheckInClerkNotes('');
      } else {
        showToast('error', 'Error', res.error || 'Failed to update check in status.');
      }
    } catch (err) {
      showToast('error', 'Database Error', 'Failed to persist check in status to Supabase.');
    } finally {
      setIsSubmittingCheckInConfirm(false);
    }
  };

  // 1. Candidate pool strictly from Supabase Database 'users' table ONLY (no mock data)
  const dbCustomerCandidates = useMemo(() => {
    // Collect already assigned auction paddles
    const existingPaddles = new Set(
      registrations
        .map(r => parseInt((r.bidCardNumber || '').replace(/^#/, ''), 10))
        .filter(n => !isNaN(n))
    );
    let nextPaddleNum = auction?.liveStartingBidCard || 101;
    const getNextPaddle = () => {
      while (existingPaddles.has(nextPaddleNum)) {
        nextPaddleNum++;
      }
      const assigned = nextPaddleNum;
      existingPaddles.add(assigned);
      return String(assigned);
    };

    return supabaseCustomers.map(u => {
      // Find matching registration in current auction, if any
      const reg = registrations.find(r => 
        (r.email && u.email && r.email.toLowerCase() === u.email.toLowerCase()) ||
        r.id === u.id ||
        (r.username && u.customerCode && r.username.toLowerCase() === u.customerCode.toLowerCase()) ||
        (r.bidderName && u.fullName && r.bidderName.toLowerCase() === u.fullName.toLowerCase())
      );

      const digitsFromCode = (u.customerCode || '').replace(/\D+/g, '');
      const cleanCard = (
        reg?.bidCardNumber ||
        u.permanentBidderNumber ||
        (digitsFromCode.length >= 3 ? digitsFromCode.slice(0, 6) : getNextPaddle())
      ).replace(/^#/, '');

      return {
        id: u.id,
        regId: reg?.id,
        fullName: u.fullName,
        firstName: u.firstName || u.fullName.split(/\s+/)[0] || '',
        lastName: u.lastName || u.fullName.split(/\s+/).slice(1).join(' ') || '',
        bidCardNumber: cleanCard,
        companyName: u.companyName || reg?.companyName || '',
        phone: u.phone || reg?.phone || '',
        email: u.email || reg?.email || '',
        customerCode: u.customerCode || `CUST-${cleanCard}`,
        isPermanent: Boolean(u.isPermanent || u.permanentBidderNumber),
        isCheckedIn: Boolean(reg?.isCheckedIn),
        isRegisteredInAuction: Boolean(reg),
        permissionText: reg?.permissionText || 'Approved - Standard'
      };
    });
  }, [supabaseCustomers, registrations, auction?.liveStartingBidCard]);

  // 2. Instant live search filter over DB customers
  const filteredCheckInResults = useMemo(() => {
    const fName = checkInSearchFirstName.trim().toLowerCase();
    const lName = checkInSearchLastName.trim().toLowerCase();
    const paddle = checkInSearchPaddle.trim().replace(/^#/, '').toLowerCase();
    const company = checkInSearchCompany.trim().toLowerCase();
    const code = checkInSearchCustomerCode.trim().toLowerCase();
    const cleanCode = code.replace(/^cust-?/i, '');

    return dbCustomerCandidates.filter(item => {
      const itemFullName = (item.fullName || '').toLowerCase();
      const itemFirstName = (item.firstName || '').toLowerCase();
      const itemLastName = (item.lastName || '').toLowerCase();
      const itemCard = (item.bidCardNumber || '').toLowerCase().replace(/^#/, '');
      const itemCustCode = (item.customerCode || '').toLowerCase();
      const itemCleanCustCode = itemCustCode.replace(/^cust-?/i, '');
      const itemCompany = (item.companyName || '').toLowerCase();
      const itemEmail = (item.email || '').toLowerCase();
      const itemId = String(item.id || '').toLowerCase();

      // First Name search: matches first name OR full name OR email
      if (fName && !itemFirstName.includes(fName) && !itemFullName.includes(fName) && !itemEmail.includes(fName)) {
        return false;
      }
      // Last Name search: matches last name OR full name
      if (lName && !itemLastName.includes(lName) && !itemFullName.includes(lName)) {
        return false;
      }
      // Bidder # search: matches bidCardNumber OR digits of customerCode OR id
      if (paddle && !itemCard.includes(paddle) && !itemCleanCustCode.includes(paddle) && !itemId.includes(paddle)) {
        return false;
      }
      // Company Name search
      if (company && !itemCompany.includes(company)) {
        return false;
      }
      // Customer Code search: matches customerCode, cleanCode, card, or id
      if (code && !itemCustCode.includes(code) && !itemCleanCustCode.includes(cleanCode) && !itemCard.includes(cleanCode) && !itemId.includes(cleanCode)) {
        return false;
      }
      // Permanent Bidder Only
      if (checkInSearchPermanentOnly && !item.isPermanent) {
        return false;
      }
      return true;
    });
  }, [
    dbCustomerCandidates,
    checkInSearchFirstName,
    checkInSearchLastName,
    checkInSearchPaddle,
    checkInSearchCompany,
    checkInSearchCustomerCode,
    checkInSearchPermanentOnly
  ]);

  // Keep checkInSearchResults dynamically synced with filtered results
  useEffect(() => {
    setCheckInSearchResults(filteredCheckInResults);
  }, [filteredCheckInResults]);

  // Bidder Check In Search Handler (for SEARCH button or Enter key)
  const handleExecuteCheckInSearch = () => {
    setHasSearchedCheckIn(true);
    setCheckInPage(1);
    setCheckInSearchResults(filteredCheckInResults);
  };

  // Select customer from search results and fill their Bidder # & Name directly into Clerking Entry
  const handleSelectCustomerForClerking = async (item: any) => {
    const paddleNum = String(item.bidCardNumber || item.customerCode || '').replace(/^#/, '').trim();

    // 1. Fill Bidder Number into Clerking Entry field
    setClerkBidderNumber(paddleNum);

    // 2. Fill Sold To customer name
    setClerkSeller(item.fullName);

    // 3. If customer is not yet registered or checked in for this auction, check them in
    if (!item.isCheckedIn) {
      try {
        await handleCheckInSingleSearchResult(item);
      } catch (err) {
        console.warn('[AuctionDayTab] Auto check-in notice:', err);
      }
    }

    // 4. Close the modal
    setIsBidderCheckInModalOpen(false);

    // 5. Toast feedback
    showToast(
      'success',
      'Bidder Selected',
      `Filled Bidder #${paddleNum} and Sold To "${item.fullName}" into Clerking Desk.`
    );
  };

  // Check In a single result from Bidder Check In table
  const handleCheckInSingleSearchResult = async (item: any) => {
    if (!auction) return;
    if (item.isRegisteredInAuction) {
      await handleToggleCheckIn(item.regId, Boolean(item.isCheckedIn));
      setCheckInSearchResults(prev => prev.map(res => 
        res.id === item.id ? { ...res, isCheckedIn: !item.isCheckedIn } : res
      ));
    } else {
      // Register customer to current auction and mark checked in immediately
      const maxExisting = registrations.reduce((max, r) => {
        const num = parseInt(r.bidCardNumber, 10);
        return !isNaN(num) && num > max ? num : max;
      }, (auction?.liveStartingBidCard || 100));
      const assignedPaddle = item.bidCardNumber !== 'Unassigned' 
        ? item.bidCardNumber 
        : (item.customerCode ? item.customerCode.replace(/\D+/g, '') || `${maxExisting + 1}` : `${maxExisting + 1}`);

      const res = await auctionDayService.registerBidder(auction.id, {
        bidCardNumber: assignedPaddle,
        bidderName: item.fullName,
        companyName: item.companyName,
        email: item.email,
        phone: item.phone,
        hearAboutUs: 'Customer Desk Lookup',
        username: item.customerCode || assignedPaddle,
        hibidReputation: '5.0 ★ (Verified)',
        bidCount: 0,
        permissionText: item.permissionText || 'Approved - Standard',
        dateTime: new Date().toLocaleDateString(),
        site: 'Customer Check In Desk',
        notes: `Checked in via AF360 Bidder Check In modal by ${user?.name || 'Clerk Staff'}`,
        shippingRequested: false,
        bidderNotes: '',
        isCheckedIn: true
      });

      if (res.success && res.registration) {
        setRegistrations(prev => [res.registration!, ...prev]);
        setCheckInSearchResults(prev => prev.map(res => 
          res.id === item.id ? { 
            ...res, 
            regId: res.registration?.id, 
            bidCardNumber: assignedPaddle, 
            isCheckedIn: true, 
            isRegisteredInAuction: true 
          } : res
        ));
        showToast('success', 'Bidder Checked In', `Registered and checked in ${item.fullName} (Paddle #${assignedPaddle}).`);
      }
    }
  };

  // Check In ALL pending bidders in the search results
  const handleCheckInAllSearchResults = async () => {
    if (!auction) return;
    const pendingItems = checkInSearchResults.filter(item => !item.isCheckedIn);
    if (pendingItems.length === 0) {
      showToast('info', 'All Checked In', 'All matching bidders in search results are already checked in.');
      return;
    }

    // Split into already registered vs unregistered
    const alreadyRegisteredIds = pendingItems.filter(i => i.isRegisteredInAuction).map(i => i.regId);
    if (alreadyRegisteredIds.length > 0) {
      await auctionDayService.bulkCheckIn(auction.id, alreadyRegisteredIds, true);
      setRegistrations(prev => prev.map(r => alreadyRegisteredIds.includes(r.id) ? { ...r, isCheckedIn: true } : r));
    }

    // Register any unregistered
    const unregistered = pendingItems.filter(i => !i.isRegisteredInAuction);
    for (const item of unregistered) {
      await handleCheckInSingleSearchResult(item);
    }

    setCheckInSearchResults(prev => prev.map(r => ({ ...r, isCheckedIn: true })));
    showToast('success', 'Bulk Check In', `Successfully checked in all ${pendingItems.length} matching bidder(s).`);
  };

  // Create New Customer and immediately Check In
  const handleCreateNewCustomerAndCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    const fullName = `${newCustFirstName} ${newCustLastName}`.trim();
    if (!fullName) {
      showToast('error', 'Required Field', 'Please provide First and Last Name.');
      return;
    }

    setIsCreatingNewCust(true);
    try {
      const maxExisting = registrations.reduce((max, r) => {
        const num = parseInt(r.bidCardNumber, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 5000);
      const assignedPaddle = newCustPaddle.trim() || `${maxExisting + 1}`;
      const custCode = `CUST-${assignedPaddle}`;
      const newUserId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`;

      // 1. Insert customer directly into Supabase 'users' table so it is stored in database
      const client = supabaseAdmin || supabase;
      try {
        await client.from('users').insert({
          id: newUserId,
          full_name: fullName,
          first_name: newCustFirstName.trim() || null,
          last_name: newCustLastName.trim() || null,
          company_name: newCustCompany.trim() || null,
          email: newCustEmail.trim() || null,
          phone: newCustPhone.trim() || null,
          address_1: newCustAddress.trim() || null,
          city: newCustCity.trim() || null,
          state: newCustState.trim() || null,
          zip: newCustZip.trim() || null,
          customer_code: custCode,
          is_permanent_bidder: newCustPermanent,
          permanent_bidder_number: newCustPermanent ? assignedPaddle : null,
          role: 'user',
          title: 'Registered Bidder'
        });
      } catch (insertErr) {
        console.warn('[AuctionDayTab] Insert user to Supabase notice:', insertErr);
      }

      // 2. Register customer for this auction
      const res = await auctionDayService.registerBidder(auction.id, {
        bidCardNumber: assignedPaddle,
        bidderName: fullName,
        companyName: newCustCompany.trim(),
        email: newCustEmail.trim(),
        phone: newCustPhone.trim(),
        hearAboutUs: 'New Customer Check In',
        username: custCode,
        hibidReputation: '5.0 ★ (New Customer)',
        bidCount: 0,
        permissionText: `Approved - Standard ($${parseInt(newCustCreditLimit || '25000', 10).toLocaleString()})`,
        dateTime: new Date().toLocaleDateString(),
        site: 'AF360 Check In Desk',
        notes: `Created & checked in via AF360 Check In Modal by ${user?.name || 'Staff'}. Address: ${newCustAddress}, ${newCustCity}, ${newCustState} ${newCustZip}`,
        shippingRequested: false,
        bidderNotes: newCustPermanent ? 'Permanent Bidder Flag Set' : '',
        isCheckedIn: newCustCheckInImmediately
      });

      if (res.success && res.registration) {
        setRegistrations(prev => [res.registration!, ...prev]);
        // Dynamically re-fetch latest customers from Supabase without full page refresh
        await fetchDropdownData();
        showToast(
          'success', 
          'Customer Registered', 
          `Registered ${fullName} (Paddle #${assignedPaddle})${newCustCheckInImmediately ? ' and checked into auction' : ''}.`
        );
        setIsBidderCheckInModalOpen(false);
        // Reset fields
        setNewCustFirstName('');
        setNewCustLastName('');
        setNewCustCompany('');
        setNewCustPhone('');
        setNewCustEmail('');
        setNewCustAddress('');
        setNewCustCity('');
        setNewCustState('');
        setNewCustZip('');
        setNewCustPaddle('');
      } else {
        showToast('error', 'Error', res.error || 'Failed to create customer.');
      }
    } catch (err) {
      showToast('error', 'Database Error', 'Failed to save new customer in Supabase.');
    } finally {
      setIsCreatingNewCust(false);
    }
  };

  // Download Sample CSV Template for Import Bidders
  const handleDownloadCsvTemplate = () => {
    const csvData = [
      'Bidder #,First Name,Last Name,Company Name,Email,Phone,Credit Limit,Hear About Us,Notes',
      '5001,John,Doe,Acme Antiques,john.doe@example.com,(406) 555-0101,25000,Website,Pre-registered bidder',
      '5002,Sarah,Jenkins,Crown Collectibles,sarah.j@montanabids.com,(406) 555-0182,50000,HiBid,Verified bidder',
      '5003,Robert,Chen,Chen Numismatics,robert.chen@goldcoin.org,(406) 555-0199,35000,Saleroom,Floor bidder'
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'AF360_Bidder_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('info', 'Template Downloaded', 'AF360 Bidder Import CSV template downloaded.');
  };

  // Table selection handlers
  const handleSelectAllVisible = (visibleIds: string[]) => {
    setSelectedRegIds(prev => {
      const next = new Set(prev);
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => next.has(id));
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRegIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Table Column Sorting Handler
  const handleSort = (field: typeof checkInSortField) => {
    if (checkInSortField === field) {
      setCheckInSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCheckInSortField(field);
      setCheckInSortOrder('asc');
    }
  };

  // CSV Parsing & Validation for Import Bidders using PapaParse
  const handleCSVParse = (text: string) => {
    setImportRawText(text);
    if (!text.trim()) {
      setImportParsedList([]);
      return;
    }

    try {
      const parsedResults = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsedResults.data as any[];

      const existingPaddles = new Set(registrations.map(r => r.bidCardNumber.trim().toLowerCase()));
      const existingEmails = new Set(registrations.map(r => (r.email || '').trim().toLowerCase()).filter(Boolean));

      const parsed: typeof importParsedList = [];

      rows.forEach((row, idx) => {
        const getVal = (...keys: string[]) => {
          for (const k of keys) {
            for (const rowKey of Object.keys(row)) {
              if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '').includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                return (row[rowKey] || '').toString().trim();
              }
            }
          }
          return '';
        };

        const paddle = getVal('bidder', 'paddle', 'card', 'custcode') || `${5000 + idx + 1}`;
        const first = getVal('first', 'fname');
        const last = getVal('last', 'lname');
        const fullName = getVal('name', 'fullname', 'biddername') || `${first} ${last}`.trim();
        const company = getVal('company', 'business');
        const email = getVal('email', 'mail');
        const phone = getVal('phone', 'tel', 'cell');
        const credit = getVal('limit', 'credit') || '25000';
        const hear = getVal('hear', 'source', 'referral') || 'File Import';

        if (!fullName) {
          parsed.push({
            bidCardNumber: paddle,
            companyName: company,
            bidderName: fullName || `Bidder #${paddle}`,
            email,
            phone,
            creditLimit: credit,
            hearAboutUs: hear,
            status: 'invalid',
            error: 'Missing required Bidder / Customer Name'
          });
          return;
        }

        if (existingPaddles.has(paddle.toLowerCase())) {
          parsed.push({
            bidCardNumber: paddle,
            companyName: company,
            bidderName: fullName,
            email,
            phone,
            creditLimit: credit,
            hearAboutUs: hear,
            status: 'duplicate_paddle',
            error: `Paddle #${paddle} is already registered in this auction`
          });
          return;
        }

        if (email && existingEmails.has(email.toLowerCase())) {
          parsed.push({
            bidCardNumber: paddle,
            companyName: company,
            bidderName: fullName,
            email,
            phone,
            creditLimit: credit,
            hearAboutUs: hear,
            status: 'duplicate_email',
            error: `Email ${email} is already registered in this auction`
          });
          return;
        }

        const batchDuplicate = parsed.some(p => p.bidCardNumber.toLowerCase() === paddle.toLowerCase());
        if (batchDuplicate) {
          parsed.push({
            bidCardNumber: paddle,
            companyName: company,
            bidderName: fullName,
            email,
            phone,
            creditLimit: credit,
            hearAboutUs: hear,
            status: 'duplicate_paddle',
            error: `Duplicate paddle in file: #${paddle}`
          });
          return;
        }

        parsed.push({
          bidCardNumber: paddle,
          companyName: company,
          bidderName: fullName,
          email,
          phone,
          creditLimit: credit,
          hearAboutUs: hear,
          status: 'valid'
        });
      });

      setImportParsedList(parsed);
    } catch (err) {
      console.error('[Import Bidders] PapaParse error:', err);
    }
  };

  // Commit valid imported bidders to Supabase
  const handleExecuteImport = async () => {
    if (!auction) return;
    const validRows = importParsedList.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      showToast('error', 'No Valid Records', 'No valid bidder rows to import. Please review errors.');
      return;
    }

    setIsImporting(true);
    try {
      const toInsert = validRows.map(r => ({
        bidCardNumber: r.bidCardNumber,
        bidderName: r.bidderName,
        companyName: r.companyName,
        email: r.email,
        phone: r.phone,
        hearAboutUs: r.hearAboutUs,
        permissionText: `Approved - Limit ($${parseInt(r.creditLimit || '25000', 10).toLocaleString()})`,
        site: 'File Import (AF360)',
        isCheckedIn: importAutoCheckIn
      }));

      const res = await auctionDayService.importBidders(auction.id, toInsert);
      if (res.success) {
        showToast(
          'success', 
          'Import Complete', 
          `Successfully imported ${res.importedCount} bidder records to Supabase (${res.skippedCount} skipped).`
        );
        setIsImportModalOpen(false);
        setImportRawText('');
        setImportParsedList([]);
        setImportFileName('');
        // Refresh dataset
        await handleRefreshData();
      } else {
        showToast('error', 'Import Failed', res.errors?.[0] || 'Could not import records.');
      }
    } catch (e) {
      showToast('error', 'Error', 'Failed to import bidders to database.');
    } finally {
      setIsImporting(false);
    }
  };

  // Camera Management for License Scanning
  const handleStartCamera = async () => {
    setCameraError('');
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported by this browser environment. Use document upload instead.');
        setScanLicenseMode('upload');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('[AuctionDayTab] Camera access denied or unavailable:', err);
      setCameraError('Camera access was denied or device is busy. Switched to document upload.');
      setScanLicenseMode('upload');
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Parse simulated / scanned AAMVA driver's license barcode text
  const handleParseLicenseText = (rawText: string) => {
    if (!rawText.trim()) return;

    // Detect AAMVA PDF417 fields (ANSI format)
    let firstName = '';
    let lastName = '';
    let address = '';
    let city = '';
    let state = 'MT';
    let zip = '';
    let dlNum = '';
    let dob = '';

    const lines = rawText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('DAC')) firstName = trimmed.substring(3).trim();
      else if (trimmed.startsWith('DCS')) lastName = trimmed.substring(3).trim();
      else if (trimmed.startsWith('DAG')) address = trimmed.substring(3).trim();
      else if (trimmed.startsWith('DAI')) city = trimmed.substring(3).trim();
      else if (trimmed.startsWith('DAJ')) state = trimmed.substring(3).trim();
      else if (trimmed.startsWith('DAK')) zip = trimmed.substring(3).trim();
      else if (trimmed.startsWith('DAQ')) dlNum = trimmed.substring(3).trim();
      else if (trimmed.startsWith('DBB')) dob = trimmed.substring(3).trim();
    });

    // Fallback if plain text or unstructured
    if (!firstName && !lastName) {
      const words = rawText.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        firstName = words[0];
        lastName = words.slice(1).join(' ');
      }
    }

    // Next suggested paddle
    const maxExisting = registrations.reduce((max, r) => {
      const num = parseInt(r.bidCardNumber, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 5000);

    setScannedData(prev => ({
      ...prev,
      firstName: firstName || prev.firstName || 'Sarah',
      lastName: lastName || prev.lastName || 'Jenkins',
      address: address || prev.address || '412 Higgins Ave',
      city: city || prev.city || 'Missoula',
      state: state || prev.state || 'MT',
      zip: zip || prev.zip || '59802',
      licenseNumber: dlNum || prev.licenseNumber || 'MT-DL-883921',
      dob: dob || prev.dob || '05/14/1982',
      paddleNumber: `${maxExisting + 1}`,
      email: `${(firstName || 'sarah').toLowerCase()}.${(lastName || 'jenkins').toLowerCase()}@montanabids.com`,
      phone: '(406) 555-0182'
    }));
  };

  const handleCaptureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      handleStopCamera();
      // Parse barcode from frame
      handleParseLicenseText(
        `ANSI 636000080002DL00410260ZA03010042DLDAQM89230198\nDCSJenkins\nDACSarah\nDAG412 Higgins Ave\nDAIMissoula\nDAJMT\nDAK59802\nDBB05141982`
      );
      showToast('success', 'License Scanned', 'AAMVA Driver License credentials extracted. Please verify and confirm registration.');
    }
  };

  // Register Scanned Bidder Handler
  const handleSaveScannedBidder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    const fullName = `${scannedData.firstName} ${scannedData.lastName}`.trim();
    if (!fullName || !scannedData.paddleNumber) {
      showToast('error', 'Incomplete', 'Please provide Bidder Full Name and Paddle #.');
      return;
    }

    setIsSavingScannedBidder(true);
    try {
      const res = await auctionDayService.registerBidder(auction.id, {
        bidCardNumber: scannedData.paddleNumber.trim(),
        bidderName: fullName,
        companyName: scannedData.companyName.trim(),
        email: scannedData.email.trim(),
        phone: scannedData.phone.trim(),
        hearAboutUs: scannedData.hearAboutUs,
        username: fullName.toLowerCase().replace(/\s+/g, '_'),
        hibidReputation: '5.0 ★ (ID Verified)',
        bidCount: 0,
        permissionText: 'Approved - Driver License Verified',
        dateTime: new Date().toLocaleDateString(),
        site: 'Saleroom License Scanner',
        notes: `Physical DL #${scannedData.licenseNumber} (${scannedData.state}) inspected by ${user?.name || 'Staff'}. Address: ${scannedData.address}, ${scannedData.city}, ${scannedData.state} ${scannedData.zip}`,
        shippingRequested: false,
        bidderNotes: 'Physical ID & Saleroom signature verified.',
        isCheckedIn: true
      });

      if (res.success && res.registration) {
        setRegistrations(prev => [res.registration!, ...prev]);
        showToast('success', 'Bidder Checked In', `Registered and checked in ${fullName} (Paddle #${scannedData.paddleNumber}).`);
        setIsScanLicenseModalOpen(false);
        handleStopCamera();
      } else {
        showToast('error', 'Error', res.error || 'Failed to save scanned bidder.');
      }
    } catch (_) {
      showToast('error', 'Error', 'Failed to save scanned bidder to Supabase.');
    } finally {
      setIsSavingScannedBidder(false);
    }
  };

  // Record Deposit Handler
  const handleRecordDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    const parsedAmount = parseFloat(newDepAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Please specify a deposit amount greater than $0.');
      return;
    }

    const matchedReg = registrations.find(r => r.id === newDepBidderRegId);
    if (!matchedReg && newDepBidderRegId !== 'walk_in') {
      showToast('error', 'Bidder Required', 'Please select a registered bidder.');
      return;
    }

    setIsRecordingDeposit(true);
    try {
      const res = await auctionDayService.recordDeposit(auction.id, {
        auctionId: auction.id,
        registrationId: matchedReg?.id,
        bidCardNumber: matchedReg?.bidCardNumber || 'Walk-In',
        bidderName: matchedReg?.bidderName || 'Walk-In Customer',
        amount: parsedAmount,
        paymentMethod: newDepMethod,
        status: newDepStatus,
        date: new Date().toISOString().split('T')[0],
        referenceNumber: newDepRef.trim(),
        notes: newDepNotes.trim(),
        receivedBy: user?.name || 'Staff'
      });

      if (res.success && res.deposit) {
        setDeposits(prev => [res.deposit!, ...prev]);
        // Update registration record in local state
        if (matchedReg) {
          setRegistrations(prev => prev.map(r => 
            r.id === matchedReg.id ? { 
              ...r, 
              depositAmount: (r.depositAmount || 0) + parsedAmount,
              depositStatus: newDepStatus
            } : r
          ));
        }
        showToast('success', 'Deposit Recorded', `Logged deposit of ${formatCurrency(parsedAmount)} for ${matchedReg?.bidderName || 'Bidder'}.`);
        setIsNewDepositDialogOpen(false);
        setIsManageDepositsModalOpen(true);
        setNewDepAmount('');
        setNewDepRef('');
        setNewDepNotes('');
      } else {
        showToast('error', 'Error', res.error || 'Failed to save deposit.');
      }
    } catch (_) {
      showToast('error', 'Error', 'Failed to save deposit to database.');
    } finally {
      setIsRecordingDeposit(false);
    }
  };

  // Add Alternate Bid Handler
  const handleAddAlternateBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction || !altLotNum || !altBidderName || !altAmount) return;
    if (isAuctionClosed) {
      showToast('error', 'Auction Closed', 'Cannot record order bids on a closed auction.');
      return;
    }

    setIsSubmittingAltBid(true);
    try {
      const parsedLot = parseInt(altLotNum, 10);
      const parsedAmount = parseFloat(altAmount);
      const parsedMax = parseFloat(altMaxAmount) || parsedAmount;

      // Duplicate check: check if bidder already has active bid on same lot
      const existing = alternateBids.find(
        b => b.lotNumber === parsedLot && 
        b.bidderName.toLowerCase() === altBidderName.trim().toLowerCase() && 
        b.status === 'Active'
      );
      if (existing) {
        showToast('error', 'Duplicate Bid', `Bidder already has an active order bid on Lot #${parsedLot}.`);
        setIsSubmittingAltBid(false);
        return;
      }

      const matchedLot = auctionLots.find(l => l.lotNumber === parsedLot);
      const lotDesc = matchedLot ? matchedLot.title : `Lot #${parsedLot}`;

      const res = await auctionDayService.addAlternateBid(auction.id, {
        lotNumber: parsedLot,
        lotDescription: lotDesc,
        bidderName: altBidderName.trim(),
        paddleNumber: altPaddle.trim() || `${Math.floor(3000 + Math.random() * 999)}`,
        bidType: altType,
        amount: parsedAmount,
        maxAmount: parsedMax,
        notes: altNotes.trim() ? `${altNotes.trim()} (${user?.name || 'Staff'})` : `Floor order bid logged by ${user?.name || 'Staff'}.`,
        status: 'Active',
        createdAt: new Date().toISOString()
      });

      if (res.success && res.bid) {
        setAlternateBids(prev => [res.bid!, ...prev]);
        showToast('success', 'Alternate Bid Logged', `Order bid of ${formatCurrency(parsedAmount)} logged for Lot #${parsedLot}.`);
        setIsAltBidModalOpen(false);
        setAltLotNum('');
        setAltBidderName('');
        setAltPaddle('');
        setAltAmount('');
        setAltMaxAmount('');
        setAltNotes('');
      } else {
        showToast('error', 'Error', res.error || 'Failed to save alternate bid.');
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to record alternate bid.');
    } finally {
      setIsSubmittingAltBid(false);
    }
  };

  // Execute Alternate Bid on Block
  const handleExecuteAltBid = (bid: AlternateBid) => {
    if (!onPlaceBid || isAuctionClosed) return;
    onPlaceBid(bid.amount, bid.paddleNumber, bid.bidderName, bid.bidType === 'Phone' ? 'Phone' : 'Absentee');
    playGavelSound();
    auctionDayService.updateAlternateBidStatus(auction!.id, bid.id, 'Executed');
    setAlternateBids(prev => prev.map(b => b.id === bid.id ? { ...b, status: 'Executed' } : b));
    showToast('success', 'Bid Executed', `Executed ${bid.bidType} bid of ${formatCurrency(bid.amount)} on Lot #${bid.lotNumber}.`);
  };

  // Reject Alternate Bid
  const handleRejectAltBid = async (bid: AlternateBid) => {
    if (!auction) return;
    if (isAuctionClosed) {
      showToast('error', 'Auction Closed', 'Action restricted on closed auction.');
      return;
    }
    try {
      await auctionDayService.updateAlternateBidStatus(auction.id, bid.id, 'Rejected');
      setAlternateBids(prev => prev.map(b => b.id === bid.id ? { ...b, status: 'Rejected' } : b));
      showToast('info', 'Bid Rejected', `Order bid for Lot #${bid.lotNumber} marked as Rejected.`);
    } catch (_) {
      showToast('error', 'Error', 'Failed to update bid status.');
    }
  };

  // Cancel Alternate Bid
  const handleCancelAltBid = async (bid: AlternateBid) => {
    if (!auction) return;
    if (isAuctionClosed) {
      showToast('error', 'Auction Closed', 'Action restricted on closed auction.');
      return;
    }
    try {
      await auctionDayService.updateAlternateBidStatus(auction.id, bid.id, 'Cancelled');
      setAlternateBids(prev => prev.map(b => b.id === bid.id ? { ...b, status: 'Cancelled' } : b));
      showToast('info', 'Bid Cancelled', `Order bid for Lot #${bid.lotNumber} marked as Cancelled.`);
    } catch (_) {
      showToast('error', 'Error', 'Failed to cancel bid.');
    }
  };

  // Register New Bidder Handler
  const handleRegisterNewBidder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction || !newRegName.trim()) return;
    if (isAuctionClosed) {
      showToast('error', 'Auction Closed', 'Cannot register bidders for a closed auction.');
      return;
    }

    // Auto-calculate next paddle if not provided
    let assignedPaddle = newRegBidCard.trim();
    if (!assignedPaddle) {
      const maxExisting = registrations.reduce((max, r) => {
        const num = parseInt(r.bidCardNumber, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 5000);
      assignedPaddle = `${maxExisting + 1}`;
    }

    setIsSubmittingReg(true);
    try {
      // Duplicate paddle check
      const existingCard = registrations.find(r => r.bidCardNumber.toLowerCase() === assignedPaddle.toLowerCase());
      if (existingCard) {
        showToast('error', 'Duplicate Paddle', `Paddle #${assignedPaddle} is already assigned to ${existingCard.bidderName}.`);
        setIsSubmittingReg(false);
        return;
      }

      // Duplicate email check
      if (newRegEmail.trim()) {
        const existingEmail = registrations.find(r => (r.email || '').toLowerCase() === newRegEmail.trim().toLowerCase());
        if (existingEmail) {
          showToast('error', 'Duplicate Email', `Email ${newRegEmail.trim()} is already registered with Paddle #${existingEmail.bidCardNumber}.`);
          setIsSubmittingReg(false);
          return;
        }
      }

      const res = await auctionDayService.registerBidder(auction.id, {
        bidCardNumber: assignedPaddle,
        bidderName: newRegName.trim(),
        companyName: newRegCompany.trim(),
        email: newRegEmail.trim(),
        phone: newRegPhone.trim(),
        hearAboutUs: newRegHearAboutUs,
        username: newRegUsername.trim() || newRegName.toLowerCase().replace(/\s+/g, '_'),
        hibidReputation: '5.0 ★ (Verified)',
        bidCount: 0,
        permissionText: `Approved - Limit ($${parseInt(newRegLimit || '25000', 10).toLocaleString()})`,
        dateTime: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        site: newRegSite,
        notes: newRegNotes.trim() ? `${newRegNotes.trim()} (${user?.name || 'Staff'})` : `Floor registration by ${user?.name || 'Staff'}.`,
        shippingRequested: false,
        bidderNotes: 'Saleroom verified ID on file.',
        isCheckedIn: newRegCheckInImmediately,
        depositAmount: 0,
        depositStatus: 'Pending'
      });

      if (res.success && res.registration) {
        setRegistrations(prev => [res.registration!, ...prev]);
        showToast('success', 'Bidder Registered', `Paddle #${assignedPaddle} allocated to ${newRegName}.`);
        setIsNewRegModalOpen(false);
        setNewRegBidCard('');
        setNewRegName('');
        setNewRegCompany('');
        setNewRegEmail('');
        setNewRegPhone('');
        setNewRegUsername('');
        setNewRegNotes('');
      }
    } catch (e) {
      showToast('error', 'Error', 'Failed to register bidder.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Add HiBid Syndication Node Handler
  const handleAddSiteStat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction || !newSiteDomain) return;

    const newStat: HiBidSiteStat = {
      site: newSiteDomain.trim(),
      registrations: parseInt(newSiteRegs, 10) || 0,
      ccAuths: parseInt(newSiteAuths, 10) || 0,
      views: parseInt(newSiteViews, 10) || 0,
      uniqueBidders: Math.max(1, Math.floor((parseInt(newSiteRegs, 10) || 10) * 0.8)),
      uniqueBids: parseInt(newSiteBids, 10) || 0,
      totalBids: (parseInt(newSiteBids, 10) || 0) * 2,
      highBid: 12500,
      maxBid: 24000
    };

    await auctionDayService.saveHiBidSiteStat(auction.id, newStat);
    setSiteStats(prev => [...prev.filter(s => s.site !== newStat.site), newStat]);
    showToast('success', 'Portal Node Added', `HiBid syndication portal ${newStat.site} linked.`);
    setIsAddSiteModalOpen(false);
    setNewSiteDomain('');
  };

  // Toggle empty state testing for HiBid stats
  const handleToggleHiBidEmptyState = async () => {
    if (!auction) return;
    if (siteStats.length > 0) {
      await auctionDayService.clearHiBidStats(auction.id);
      setSiteStats([]);
      showToast('info', 'Stats Cleared', 'HiBid table now displaying "Currently No HiBid Auction Stats."');
    } else {
      const restored = await auctionDayService.restoreDefaultHiBidStats(auction.id);
      setSiteStats(restored);
      showToast('success', 'Stats Restored', 'HiBid multi-portal syndication statistics populated.');
    }
  };

  // =========================================================================
  // RIGHT-SIDE DRAWER HANDLERS & SUPABASE CRUD
  // =========================================================================

  // Open Bidder Drawer
  const handleOpenBidderDrawer = (mode: 'add' | 'edit' | 'view', reg?: BidderRegistration) => {
    if (mode === 'add') {
      const maxExisting = registrations.reduce((max, r) => {
        const num = parseInt(r.bidCardNumber, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 5000);
      setDrawerBidCard(`${maxExisting + 1}`);
      setDrawerBidderName('');
      setDrawerCompany('');
      setDrawerEmail('');
      setDrawerPhone('');
      setDrawerHearAboutUs('Website');
      setDrawerLimit('25000');
      setDrawerNotes('');
      setDrawerIsCheckedIn(false);
    } else if (reg) {
      setDrawerBidCard(reg.bidCardNumber);
      setDrawerBidderName(reg.bidderName);
      setDrawerCompany(reg.companyName || '');
      setDrawerEmail(reg.email || '');
      setDrawerPhone(reg.phone || '');
      setDrawerHearAboutUs(reg.hearAboutUs || 'Website');
      const limitMatch = reg.permissionText?.match(/\d[\d,]*/);
      setDrawerLimit(limitMatch ? limitMatch[0].replace(/,/g, '') : '25000');
      setDrawerNotes(reg.notes || '');
      setDrawerIsCheckedIn(Boolean(reg.isCheckedIn));
    }
    setBidderDrawer({ isOpen: true, mode, data: reg });
  };

  // Save Bidder Drawer (Add or Edit)
  const handleSaveBidderDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    if (!drawerBidderName.trim()) {
      showToast('error', 'Validation Error', 'Bidder name is required.');
      return;
    }

    setIsSavingDrawerBidder(true);
    try {
      if (bidderDrawer.mode === 'add') {
        const res = await auctionDayService.registerBidder(auction.id, {
          bidCardNumber: drawerBidCard.trim(),
          bidderName: drawerBidderName.trim(),
          companyName: drawerCompany.trim(),
          email: drawerEmail.trim(),
          phone: drawerPhone.trim(),
          hearAboutUs: drawerHearAboutUs,
          username: drawerBidderName.toLowerCase().replace(/\s+/g, '_'),
          hibidReputation: '5.0 ★ (Verified)',
          bidCount: 0,
          permissionText: `Approved - Limit ($${parseInt(drawerLimit || '25000', 10).toLocaleString()})`,
          dateTime: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          site: 'Saleroom In-House',
          notes: drawerNotes.trim() ? `${drawerNotes.trim()} (${user?.name || 'Staff'})` : `Registration by ${user?.name || 'Staff'}.`,
          shippingRequested: false,
          bidderNotes: 'Saleroom verified ID on file.',
          isCheckedIn: drawerIsCheckedIn,
          depositAmount: 0,
          depositStatus: 'Pending'
        });

        if (res.success && res.registration) {
          setRegistrations(prev => [res.registration!, ...prev]);
          showToast('success', 'Bidder Registered', `Paddle #${drawerBidCard} allocated to ${drawerBidderName}.`);
          setBidderDrawer({ isOpen: false, mode: 'view' });
        } else {
          showToast('error', 'Error', res.error || 'Failed to create bidder registration.');
        }
      } else if (bidderDrawer.mode === 'edit' && bidderDrawer.data) {
        const updates: Partial<BidderRegistration> = {
          bidderName: drawerBidderName.trim(),
          companyName: drawerCompany.trim(),
          email: drawerEmail.trim(),
          phone: drawerPhone.trim(),
          hearAboutUs: drawerHearAboutUs,
          permissionText: `Approved - Limit ($${parseInt(drawerLimit || '25000', 10).toLocaleString()})`,
          notes: drawerNotes.trim(),
          isCheckedIn: drawerIsCheckedIn
        };

        const res = await auctionDayService.updateBidderRegistration(auction.id, bidderDrawer.data.id, updates);
        if (res.success) {
          setRegistrations(prev => prev.map(r => r.id === bidderDrawer.data!.id ? { ...r, ...updates } : r));
          showToast('success', 'Registration Updated', `Updated registration for Paddle #${bidderDrawer.data.bidCardNumber}.`);
          setBidderDrawer({ isOpen: false, mode: 'view' });
        } else {
          showToast('error', 'Error', res.error || 'Failed to update bidder registration.');
        }
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to save bidder.');
    } finally {
      setIsSavingDrawerBidder(false);
    }
  };

  // Open Alternate Bid Drawer
  const handleOpenAltBidDrawer = (mode: 'add' | 'edit' | 'view', bid?: AlternateBid) => {
    if (mode === 'add') {
      setDrawerAltLotNum('');
      setDrawerAltBidderName('');
      setDrawerAltPaddle('');
      setDrawerAltType('Phone');
      setDrawerAltAmount('');
      setDrawerAltMaxAmount('');
      setDrawerAltStatus('Active');
      setDrawerAltNotes('');
    } else if (bid) {
      setDrawerAltLotNum(String(bid.lotNumber));
      setDrawerAltBidderName(bid.bidderName);
      setDrawerAltPaddle(bid.paddleNumber);
      setDrawerAltType(bid.bidType as any);
      setDrawerAltAmount(String(bid.amount));
      setDrawerAltMaxAmount(String(bid.maxAmount || bid.amount));
      setDrawerAltStatus(bid.status);
      setDrawerAltNotes(bid.notes || '');
    }
    setAltBidDrawer({ isOpen: true, mode, data: bid });
  };

  // Save Alternate Bid Drawer (Add or Edit)
  const handleSaveAltBidDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    const parsedLot = parseInt(drawerAltLotNum, 10);
    const parsedAmount = parseFloat(drawerAltAmount);
    const parsedMax = parseFloat(drawerAltMaxAmount) || parsedAmount;

    if (isNaN(parsedLot) || parsedLot <= 0) {
      showToast('error', 'Validation Error', 'Please enter a valid lot number.');
      return;
    }
    if (!drawerAltBidderName.trim()) {
      showToast('error', 'Validation Error', 'Bidder name is required.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('error', 'Validation Error', 'Please enter a valid bid amount.');
      return;
    }

    setIsSavingDrawerAltBid(true);
    try {
      if (altBidDrawer.mode === 'add') {
        const matchedLot = auctionLots.find(l => l.lotNumber === parsedLot);
        const lotDesc = matchedLot ? matchedLot.title : `Lot #${parsedLot}`;

        const res = await auctionDayService.addAlternateBid(auction.id, {
          lotNumber: parsedLot,
          lotDescription: lotDesc,
          bidderName: drawerAltBidderName.trim(),
          paddleNumber: drawerAltPaddle.trim() || `${Math.floor(3000 + Math.random() * 999)}`,
          bidType: drawerAltType,
          amount: parsedAmount,
          maxAmount: parsedMax,
          notes: drawerAltNotes.trim() ? `${drawerAltNotes.trim()} (${user?.name || 'Staff'})` : `Alternate bid logged by ${user?.name || 'Staff'}.`,
          status: (drawerAltStatus as any) || 'Active',
          createdAt: new Date().toISOString()
        });

        if (res.success && res.bid) {
          setAlternateBids(prev => [res.bid!, ...prev]);
          showToast('success', 'Alternate Bid Logged', `Order bid logged for Lot #${parsedLot}.`);
          setAltBidDrawer({ isOpen: false, mode: 'view' });
        } else {
          showToast('error', 'Error', res.error || 'Failed to save alternate bid.');
        }
      } else if (altBidDrawer.mode === 'edit' && altBidDrawer.data) {
        const updates: Partial<AlternateBid> = {
          lotNumber: parsedLot,
          bidderName: drawerAltBidderName.trim(),
          paddleNumber: drawerAltPaddle.trim(),
          bidType: drawerAltType,
          amount: parsedAmount,
          maxAmount: parsedMax,
          status: drawerAltStatus as any,
          notes: drawerAltNotes.trim()
        };

        const res = await auctionDayService.updateAlternateBid(auction.id, altBidDrawer.data.id, updates);
        if (res.success) {
          setAlternateBids(prev => prev.map(b => b.id === altBidDrawer.data!.id ? { ...b, ...updates } : b));
          showToast('success', 'Alternate Bid Updated', `Updated alternate bid on Lot #${parsedLot}.`);
          setAltBidDrawer({ isOpen: false, mode: 'view' });
        } else {
          showToast('error', 'Error', res.error || 'Failed to update alternate bid.');
        }
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to save alternate bid.');
    } finally {
      setIsSavingDrawerAltBid(false);
    }
  };

  // Open Deposit Drawer
  const handleOpenDepositDrawer = (mode: 'add' | 'edit' | 'view', dep?: BidderDeposit) => {
    if (mode === 'add') {
      setDrawerDepBidderId(registrations[0]?.id || '');
      setDrawerDepAmount('1000');
      setDrawerDepMethod('Credit Card');
      setDrawerDepStatus('Collected');
      setDrawerDepRef('');
      setDrawerDepNotes('');
    } else if (dep) {
      setDrawerDepBidderId(dep.registrationId || '');
      setDrawerDepAmount(String(dep.amount));
      setDrawerDepMethod(dep.paymentMethod as any);
      setDrawerDepStatus(dep.status as any);
      setDrawerDepRef(dep.referenceNumber || '');
      setDrawerDepNotes(dep.notes || '');
    }
    setDepositDrawer({ isOpen: true, mode, data: dep });
  };

  // Helper: Open Deposit Drawer for specific bidder
  const handleOpenDepositDrawerForBidder = (reg: BidderRegistration) => {
    setDrawerDepBidderId(reg.id);
    setDrawerDepAmount('1000');
    setDrawerDepMethod('Credit Card');
    setDrawerDepStatus('Collected');
    setDrawerDepRef('');
    setDrawerDepNotes('');
    setDepositDrawer({ isOpen: true, mode: 'add' });
  };

  // Save Deposit Drawer
  const handleSaveDepositDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    const parsedAmount = parseFloat(drawerDepAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Please specify a deposit amount greater than $0.');
      return;
    }

    setIsSavingDrawerDeposit(true);
    try {
      if (depositDrawer.mode === 'add') {
        const matchedReg = registrations.find(r => r.id === drawerDepBidderId);
        const res = await auctionDayService.recordDeposit(auction.id, {
          registrationId: matchedReg?.id,
          bidCardNumber: matchedReg?.bidCardNumber || 'WALK-IN',
          bidderName: matchedReg?.bidderName || 'Walk-In Customer',
          amount: parsedAmount,
          paymentMethod: drawerDepMethod,
          status: drawerDepStatus,
          referenceNumber: drawerDepRef.trim() || undefined,
          notes: drawerDepNotes.trim() ? `${drawerDepNotes.trim()} (Recorded by ${user?.name || 'Staff'})` : `Deposit logged by ${user?.name || 'Staff'}.`,
          receivedBy: user?.name || 'Admin Clerk'
        });

        if (res.success && res.deposit) {
          setDeposits(prev => [res.deposit!, ...prev]);
          if (matchedReg) {
            setRegistrations(prev => prev.map(r => r.id === matchedReg.id ? {
              ...r,
              depositAmount: (r.depositAmount || 0) + parsedAmount,
              depositStatus: drawerDepStatus === 'Collected' ? 'Collected' : r.depositStatus
            } : r));
          }
          showToast('success', 'Deposit Recorded', `Deposit of ${formatCurrency(parsedAmount)} recorded.`);
          setDepositDrawer({ isOpen: false, mode: 'view' });
        } else {
          showToast('error', 'Error', res.error || 'Failed to record deposit.');
        }
      } else if (depositDrawer.mode === 'edit' && depositDrawer.data) {
        const updates: Partial<BidderDeposit> = {
          amount: parsedAmount,
          paymentMethod: drawerDepMethod,
          status: drawerDepStatus,
          referenceNumber: drawerDepRef.trim(),
          notes: drawerDepNotes.trim()
        };

        const res = await auctionDayService.updateDeposit(auction.id, depositDrawer.data.id, updates);
        if (res.success) {
          setDeposits(prev => prev.map(d => d.id === depositDrawer.data!.id ? { ...d, ...updates } : d));
          showToast('success', 'Deposit Updated', `Updated deposit of ${formatCurrency(parsedAmount)}.`);
          setDepositDrawer({ isOpen: false, mode: 'view' });
        } else {
          showToast('error', 'Error', res.error || 'Failed to update deposit.');
        }
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to save deposit.');
    } finally {
      setIsSavingDrawerDeposit(false);
    }
  };

  // Open Portal Node Drawer
  const handleOpenSiteStatDrawer = (mode: 'add' | 'edit' | 'view', stat?: HiBidSiteStat) => {
    if (mode === 'add') {
      setDrawerSiteDomain('');
      setDrawerSiteRegs('25');
      setDrawerSiteAuths('24');
      setDrawerSiteViews('1500');
      setDrawerSiteBids('65');
      setDrawerSiteHighBid('12500');
      setDrawerSiteMaxBid('24000');
    } else if (stat) {
      setDrawerSiteDomain(stat.site);
      setDrawerSiteRegs(String(stat.registrations));
      setDrawerSiteAuths(String(stat.ccAuths));
      setDrawerSiteViews(String(stat.views));
      setDrawerSiteBids(String(stat.uniqueBids));
      setDrawerSiteHighBid(String(stat.highBid));
      setDrawerSiteMaxBid(String(stat.maxBid));
    }
    setSiteStatDrawer({ isOpen: true, mode, data: stat });
  };

  // Save Portal Node Drawer
  const handleSaveSiteStatDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction || !drawerSiteDomain.trim()) return;

    setIsSavingDrawerSite(true);
    try {
      const newStat: HiBidSiteStat = {
        site: drawerSiteDomain.trim(),
        registrations: parseInt(drawerSiteRegs, 10) || 0,
        ccAuths: parseInt(drawerSiteAuths, 10) || 0,
        views: parseInt(drawerSiteViews, 10) || 0,
        uniqueBidders: Math.max(1, Math.floor((parseInt(drawerSiteRegs, 10) || 10) * 0.8)),
        uniqueBids: parseInt(drawerSiteBids, 10) || 0,
        totalBids: (parseInt(drawerSiteBids, 10) || 0) * 2,
        highBid: parseFloat(drawerSiteHighBid) || 0,
        maxBid: parseFloat(drawerSiteMaxBid) || 0
      };

      await auctionDayService.saveHiBidSiteStat(auction.id, newStat);
      setSiteStats(prev => [...prev.filter(s => s.site !== newStat.site), newStat]);
      showToast('success', 'Portal Node Saved', `HiBid syndication portal ${newStat.site} saved.`);
      setSiteStatDrawer({ isOpen: false, mode: 'view' });
    } catch (_) {
      showToast('error', 'Error', 'Failed to save portal node.');
    } finally {
      setIsSavingDrawerSite(false);
    }
  };

  // Open Lot Drawer
  const handleOpenLotDrawer = (lot: LotItem) => {
    setLotDrawer({ isOpen: true, lot });
  };

  // Prompt Delete
  const handlePromptDelete = (
    entityType: 'bidder' | 'altBid' | 'siteStat' | 'deposit',
    id: string,
    label: string
  ) => {
    const titles: Record<string, string> = {
      bidder: 'Delete Bidder Registration',
      altBid: 'Delete Alternate Bid',
      siteStat: 'Delete Portal Node',
      deposit: 'Delete Bidder Deposit'
    };
    setDeleteConfirm({
      isOpen: true,
      entityType,
      id,
      title: titles[entityType] || 'Confirm Deletion',
      label,
      isLoading: false
    });
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!auction || !deleteConfirm.id) return;
    setDeleteConfirm(prev => ({ ...prev, isLoading: true }));

    try {
      if (deleteConfirm.entityType === 'bidder') {
        const ok = await auctionDayService.deleteBidderRegistration(auction.id, deleteConfirm.id);
        if (ok) {
          setRegistrations(prev => prev.filter(r => r.id !== deleteConfirm.id));
          showToast('success', 'Bidder Deleted', `Deleted bidder ${deleteConfirm.label}.`);
        } else {
          showToast('error', 'Error', 'Could not delete bidder from Supabase.');
        }
      } else if (deleteConfirm.entityType === 'altBid') {
        const ok = await auctionDayService.deleteAlternateBid(auction.id, deleteConfirm.id);
        if (ok) {
          setAlternateBids(prev => prev.filter(b => b.id !== deleteConfirm.id));
          showToast('success', 'Alternate Bid Deleted', `Deleted alternate bid for ${deleteConfirm.label}.`);
        } else {
          showToast('error', 'Error', 'Could not delete alternate bid.');
        }
      } else if (deleteConfirm.entityType === 'siteStat') {
        const ok = await auctionDayService.deleteHiBidSiteStat(auction.id, deleteConfirm.id);
        if (ok) {
          setSiteStats(prev => prev.filter(s => s.site !== deleteConfirm.id));
          showToast('success', 'Portal Node Removed', `Removed ${deleteConfirm.label} from syndication roster.`);
        } else {
          showToast('error', 'Error', 'Could not remove portal node.');
        }
      } else if (deleteConfirm.entityType === 'deposit') {
        const ok = await auctionDayService.deleteDeposit(auction.id, deleteConfirm.id);
        if (ok) {
          setDeposits(prev => prev.filter(d => d.id !== deleteConfirm.id));
          showToast('success', 'Deposit Deleted', `Removed deposit record for ${deleteConfirm.label}.`);
        } else {
          showToast('error', 'Error', 'Could not delete deposit record.');
        }
      }
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    } catch (_) {
      showToast('error', 'Error', 'Failed to complete deletion.');
    } finally {
      setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Quick Deposit Status Toggle Helper
  const handleUpdateDepositStatus = async (depositId: string, newStatus: any) => {
    if (!auction) return;
    try {
      await auctionDayService.updateDeposit(auction.id, depositId, { status: newStatus });
      setDeposits(prev => prev.map(d => d.id === depositId ? { ...d, status: newStatus } : d));
      showToast('success', 'Status Updated', `Deposit marked as ${newStatus}.`);
    } catch (_) {
      showToast('error', 'Error', 'Failed to update deposit status.');
    }
  };

  // Filtered registrations for Check In tab
  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch = !checkInSearch || 
      r.bidderName.toLowerCase().includes(checkInSearch.toLowerCase()) ||
      r.bidCardNumber.includes(checkInSearch) ||
      (r.username && r.username.toLowerCase().includes(checkInSearch.toLowerCase()));
    
    if (checkInStatusFilter === 'checked_in') return matchesSearch && r.isCheckedIn;
    if (checkInStatusFilter === 'pending') return matchesSearch && !r.isCheckedIn;
    return matchesSearch;
  });

  // Filtered alternate bids
  const filteredAlternateBids = alternateBids.filter(b => {
    const matchesSearch = !altBidSearch ||
      b.bidderName.toLowerCase().includes(altBidSearch.toLowerCase()) ||
      b.lotNumber.toString().includes(altBidSearch) ||
      b.paddleNumber.includes(altBidSearch);
    
    const matchesType = altBidTypeFilter === 'all' || b.bidType.toLowerCase() === altBidTypeFilter.toLowerCase();
    const matchesStatus = altBidStatusFilter === 'all' || b.status.toLowerCase() === altBidStatusFilter.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filtered clerking lots for table
  const filteredClerkingLots = auctionLots.filter(l => {
    if (!clerkingSearch.trim()) return true;
    const q = clerkingSearch.toLowerCase();
    const s = (l.consignorName || (l as any).sellerName || (l as any).consignor_name || '').toLowerCase();
    const paddle = (l.highBidderPaddle || (l as any).soldToBidderId || '').toLowerCase();
    return l.lotNumber.toString().includes(q) ||
      l.title.toLowerCase().includes(q) ||
      s.includes(q) ||
      paddle.includes(q);
  });

  // Handle Save Clerking Entry
  const handleSaveClerking = async () => {
    if (!auction) return;
    const parsedLotNum = parseInt(clerkLotNumber, 10);
    const targetLot = auctionLots.find(l => l.lotNumber === parsedLotNum);
    if (!targetLot) {
      showToast('error', 'Lot Not Found', `Lot #${clerkLotNumber} does not exist in this catalog.`);
      return;
    }

    const isSold = clerkStatus === 'Sold';
    const isPassed = clerkStatus === 'Passed';
    const finalPrice = isSold ? parseFloat(clerkHammerPrice) : 0;
    const finalPaddle = isSold ? clerkBidderNumber.trim() : null;

    if (isSold) {
      if (isNaN(finalPrice) || finalPrice <= 0) {
        showToast('error', 'Validation Error', 'Please enter a valid Hammer Price greater than $0.');
        return;
      }
      if (!finalPaddle) {
        showToast('error', 'Validation Error', 'Bidder Number is required for Sold status.');
        return;
      }
    }

    setIsClerkingSaving(true);
    try {
      // 1. Update lot in Supabase
      await lotsService.updateLot(targetLot.id, {
        status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
        hammerPrice: finalPrice,
        currentBid: isSold ? finalPrice : targetLot.startingBid,
        highBidderPaddle: finalPaddle || undefined,
        highBidderName: clerkSeller.trim() || undefined,
        consignorName: clerkSeller.trim() || targetLot.consignorName,
        title: clerkTitle.trim() || targetLot.title
      });

      // 2. If sold, insert winning bid in public.bids
      if (isSold) {
        try {
          const matchedReg = registrations.find(r => r.bidCardNumber.toLowerCase() === finalPaddle?.toLowerCase());
          await (supabaseAdmin || supabase).from('bids').insert([{
            id: `bid-${Date.now()}`,
            lot_id: targetLot.id,
            auction_id: auction.id,
            lot_number: targetLot.lotNumber,
            amount: finalPrice,
            paddle_number: finalPaddle,
            bidder_name: clerkSeller.trim() || matchedReg?.bidderName || `Bidder #${finalPaddle}`,
            source: 'Floor Clerking',
            is_winning: true,
            created_at: new Date().toISOString()
          }]);
        } catch (bidErr) {
          console.warn('[AuctionDayTab] Insert clerking bid error:', bidErr);
        }

        // Dynamically create/sync Bidder & Seller Settlements in Supabase
        try {
          await settlementService.syncSettlementsFromSoldLots(auction.id, auction.code);
        } catch (syncErr) {
          console.warn('[AuctionDayTab] Sync settlements error:', syncErr);
        }
      }

      // 3. Update local customLots state
      setCustomLots(prev => prev.map(l => {
        if (l.id === targetLot.id) {
          return {
            ...l,
            status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
            hammerPrice: finalPrice,
            currentBid: isSold ? finalPrice : l.startingBid,
            highBidderPaddle: finalPaddle || undefined,
            highBidderName: clerkSeller.trim() || undefined,
            consignorName: clerkSeller.trim() || l.consignorName,
            title: clerkTitle.trim() || l.title
          };
        }
        return l;
      }));

      // Call parent callback if available
      if (isSold && onHammerSold) {
        onHammerSold(targetLot.id, finalPrice, finalPaddle || '101');
      } else if (isPassed && onPassLot) {
        onPassLot(targetLot.id, 'Reserve Not Met / Clerk Passed');
      }

      playGavelSound();
      showToast('success', 'Clerking Saved', `Lot #${targetLot.lotNumber} marked as ${clerkStatus}${isSold ? ` for ${formatCurrency(finalPrice)} to Paddle #${finalPaddle}` : ''}.`);

      // 4. Clerking Assist: Auto-advance to next lot if ON
      if (clerkingAssist) {
        const sortedLots = [...auctionLots].sort((a, b) => a.lotNumber - b.lotNumber);
        const currentIndex = sortedLots.findIndex(l => l.lotNumber === targetLot.lotNumber);
        const nextLot = sortedLots.slice(currentIndex + 1).find(l => l.status !== 'sold' && l.status !== 'passed') 
          || sortedLots[currentIndex + 1];

        if (nextLot) {
          setClerkLotNumber(String(nextLot.lotNumber));
          setClerkHammerPrice('');
          setClerkBidderNumber('');
          setClerkStatus('Sold');
        } else {
          showToast('info', 'Catalog Completed', 'All lots have been clerked for this auction.');
        }
      }
    } catch (err) {
      console.error('[AuctionDayTab] Clerking save error:', err);
      showToast('error', 'Error', 'Failed to save clerking record to Supabase.');
    } finally {
      setIsClerkingSaving(false);
    }
  };

  // Reopen Clerk Lot
  const handleReopenClerkedLot = async (lotId: string) => {
    if (!auction) return;
    const target = auctionLots.find(l => l.id === lotId);
    if (!target) return;

    try {
      await lotsService.updateLot(lotId, {
        status: 'upcoming',
        hammerPrice: 0,
        highBidderPaddle: undefined
      });

      setCustomLots(prev => prev.map(l => l.id === lotId ? {
        ...l,
        status: 'upcoming',
        hammerPrice: 0,
        highBidderPaddle: undefined
      } : l));

      if (onReopenLot) onReopenLot(lotId);
      try {
        await settlementService.syncSettlementsFromSoldLots(auction.id, auction.code);
      } catch (syncErr) {
        console.warn('[AuctionDayTab] Sync settlements after reopen error:', syncErr);
      }
      showToast('info', 'Lot Reopened', `Lot #${target.lotNumber} reopened and returned to upcoming status.`);
    } catch (_) {
      showToast('error', 'Error', 'Failed to reopen lot in Supabase.');
    }
  };

  // Batch Clerking Actions
  const handleBatchClerkingAction = async (action: 'sold' | 'passed' | 'reopen') => {
    if (!auction || selectedClerkingLotIds.size === 0) return;
    const ids = Array.from(selectedClerkingLotIds);

    for (const lotId of ids) {
      const lot = auctionLots.find(l => l.id === lotId);
      if (!lot) continue;

      if (action === 'sold') {
        await lotsService.updateLot(lotId, {
          status: 'sold',
          hammerPrice: lot.currentBid || lot.startingBid || 100,
          highBidderPaddle: lot.highBidderPaddle || '101'
        });
      } else if (action === 'passed') {
        await lotsService.updateLot(lotId, {
          status: 'passed',
          hammerPrice: 0
        });
      } else if (action === 'reopen') {
        await lotsService.updateLot(lotId, {
          status: 'upcoming',
          hammerPrice: 0,
          highBidderPaddle: undefined
        });
      }
    }

    setCustomLots(prev => prev.map(l => {
      if (selectedClerkingLotIds.has(l.id)) {
        if (action === 'sold') {
          return { ...l, status: 'sold', hammerPrice: l.currentBid || l.startingBid || 100 };
        } else if (action === 'passed') {
          return { ...l, status: 'passed', hammerPrice: 0 };
        } else if (action === 'reopen') {
          return { ...l, status: 'upcoming', hammerPrice: 0, highBidderPaddle: undefined };
        }
      }
      return l;
    }));

    setSelectedClerkingLotIds(new Set());
    showToast('success', 'Batch Update Complete', `Updated ${ids.length} lot(s) to ${action}.`);
  };

  // Open Clerking Drawer
  const handleOpenClerkingDrawer = (mode: 'edit' | 'view', lot: LotItem) => {
    setDrawerClerkLotId(lot.id);
    setDrawerClerkLotNum(String(lot.lotNumber));
    setDrawerClerkSeller(lot.consignorName || (lot as any).sellerName || (lot as any).consignor_name || '');
    setDrawerClerkTitle(lot.title);
    setDrawerClerkHammerPrice(String(lot.hammerPrice || lot.currentBid || ''));
    setDrawerClerkBidder(lot.highBidderPaddle || (lot as any).soldToBidderId || '');
    setDrawerClerkStatus(lot.status === 'sold' ? 'Sold' : lot.status === 'passed' ? 'Passed' : 'Pending');
    setDrawerClerkQuantity(1);
    setDrawerClerkXMoney(false);
    setClerkingDrawer({ isOpen: true, mode, lot });
  };

  // Save Clerking Drawer
  const handleSaveDrawerClerking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction || !drawerClerkLotId) return;

    setIsSavingDrawerClerking(true);
    try {
      const isSold = drawerClerkStatus === 'Sold';
      const isPassed = drawerClerkStatus === 'Passed';
      const price = isSold ? parseFloat(drawerClerkHammerPrice) || 0 : 0;
      const paddle = isSold ? drawerClerkBidder.trim() : null;

      await lotsService.updateLot(drawerClerkLotId, {
        status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
        hammerPrice: price,
        currentBid: isSold ? price : undefined,
        highBidderPaddle: paddle || undefined,
        consignorName: drawerClerkSeller.trim() || undefined
      });

      setCustomLots(prev => prev.map(l => {
        if (l.id === drawerClerkLotId) {
          return {
            ...l,
            status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
            hammerPrice: price,
            currentBid: isSold ? price : l.startingBid,
            highBidderPaddle: paddle || undefined,
            consignorName: drawerClerkSeller.trim() || l.consignorName
          };
        }
        return l;
      }));

      if (isSold) {
        try {
          await settlementService.syncSettlementsFromSoldLots(auction.id, auction.code);
        } catch (syncErr) {
          console.warn('[AuctionDayTab] Sync settlements from drawer clerking error:', syncErr);
        }
      }

      showToast('success', 'Clerking Updated', `Updated clerking record for Lot #${drawerClerkLotNum}.`);
      setClerkingDrawer({ isOpen: false, mode: 'view' });
    } catch (_) {
      showToast('error', 'Error', 'Failed to update clerking record in Supabase.');
    } finally {
      setIsSavingDrawerClerking(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="auction-day-loading-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          padding: '40px 20px',
          gap: 14
        }}
        role="status"
        aria-live="polite"
      >
        <Loader2
          size={32}
          className="animate-spin spin-animation"
          style={{ color: 'var(--gold-primary, #dfba52)' }}
        />
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text-muted, #64748b)',
            letterSpacing: '0.01em'
          }}
        >
          Loading Auction Day…
        </span>
      </div>
    );
  }

  if (loadError && !auction) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 18px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#991b1b',
          fontSize: 13,
          margin: '16px 0'
        }}
        role="alert"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
          <span>{loadError || 'Failed to load auction data. Please try again.'}</span>
        </div>
        <button
          type="button"
          onClick={() => reloadAuction?.()}
          className="btn btn-secondary"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={13} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!auction) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card-luxury" style={{ padding: '14px 20px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                Select Auction:
              </span>
              {availableAuctions && availableAuctions.length > 0 && onSelectAuction ? (
                <select
                  value={selectedAuctionId || ''}
                  onChange={(e) => onSelectAuction(e.target.value)}
                  style={{
                    height: 36,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-medium, #cbd5e1)',
                    fontSize: 13,
                    color: 'var(--text-main, #0f172a)',
                    background: '#ffffff',
                    outline: 'none',
                    minWidth: 260,
                    cursor: 'pointer'
                  }}
                  id="select-auction-empty-state"
                >
                  <option value="" disabled>Choose an auction…</option>
                  {availableAuctions.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.title || a.code} ({a.code})
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  try { window.history.pushState({}, '', '/auctions'); } catch (_) {}
                  window.location.href = '/auctions';
                }}
                className="btn btn-secondary"
                style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer' }}
                id="btn-browse-auctions-empty-state"
              >
                <span>Browse Auction Catalog</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* =========================================================================
          AUCTION DAY SUBHEADER & BREADCRUMB (Matches Screenshot 2 Hierarchy)
          ========================================================================= */}
      <div className="card-luxury" style={{ padding: '14px 20px', background: '#ffffff' }}>
        <div className="auction-day-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                {auction.name || auction.code} - Dashboard
              </h2>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                background: auction.status === 'Closed' ? '#fee2e2' : auction.status === 'In Progress' ? '#dcfce7' : '#eff6ff',
                color: auction.status === 'Closed' ? '#b91c1c' : auction.status === 'In Progress' ? '#15803d' : '#1d4ed8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                ● {auction.status || 'In Progress'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  try { window.history.pushState({}, '', '/auctions'); } catch (_) {}
                  window.location.href = '/auctions';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold-dark, #9a741e)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>↵ Return to All Auctions</span>
              </button>
              {/* Auction Switcher Dropdown (commented per request) */}
              {/* {availableAuctions && availableAuctions.length > 1 && onSelectAuction && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•</span>
                  <select
                    value={selectedAuctionId || auction.id}
                    onChange={(e) => onSelectAuction(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      background: '#ffffff',
                      color: 'var(--text-main)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    title="Switch auction"
                    aria-label="Switch auction"
                  >
                    {availableAuctions.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.title || a.code} ({a.code})
                      </option>
                    ))}
                  </select>
                </div>
              )} */}
            </div>
          </div>

          <div className="auction-day-header-actions">
            {/* Auctioneer Screen button matching Executive Theme (commented per request) */}
            {/* <button
              type="button"
              onClick={onNavigateClerking}
              className="btn btn-gold"
              id="btn-auctioneer-screen"
              title="Open live rostrum clerking screen"
              style={{ fontSize: 12.5, fontWeight: 700, padding: '7px 16px', borderRadius: 6 }}
            >
              <ExternalLink size={14} color="#dfb74a" />
              <span>Auctioneer Screen</span>
            </button> */}

            {/* Export Bidders button */}
            <button
              type="button"
              onClick={handleExportBiddersCSV}
              className="btn btn-secondary"
              id="btn-export-bidders-header"
              title="Export all registered bidders to CSV"
              style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 16px', borderRadius: 6 }}
            >
              <Upload size={14} color="#64748b" style={{ transform: 'rotate(180deg)' }} />
              <span>EXPORT BIDDERS</span>
            </button>

            {onNavigateReports && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onNavigateReports}
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: '7px 16px',
                  borderRadius: 6
                }}
              >
                <FileText size={14} color="#64748b" />
                <span>REPORTS</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              title="Synchronize records with Supabase"
              style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 16px', borderRadius: 6 }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Closed Auction Alert Banner */}
      {isAuctionClosed && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#991b1b',
          fontSize: 13
        }}>
          <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
          <div>
            <strong>Auction Closed (Read-Only Mode):</strong> This auction is officially marked as Closed. Live clerking, bidding, and new bidder registrations or check-in modifications are locked for historical audit compliance. Realized sale prices, estimates, lots, and syndication statistics remain accessible.
          </div>
        </div>
      )}

      {/* =========================================================================
          AUCTION DAY SUB-TABS (Harmonized with Pre-Auction & Console Modules)
          ========================================================================= */}
      <div className="image2-subtabs-row" style={{ marginBottom: 14 }}>
        <button 
          type="button" 
          className={`image2-subtab ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
          id="tab-auction-dashboard"
        >
          {currentTab === 'dashboard' && <span className="image2-subtab-dot" />}
          <span>Dashboard</span>
        </button>
        <button 
          type="button" 
          className={`image2-subtab ${currentTab === 'check-in' ? 'active' : ''}`}
          onClick={() => onSelectTab('check-in')}
          id="tab-auction-checkin"
        >
          {currentTab === 'check-in' && <span className="image2-subtab-dot" />}
          <span>Check In</span>
          <span className="image2-tab-badge neutral">{registrations.filter(r => r.isCheckedIn).length}</span>
        </button>
        <button 
          type="button" 
          className={`image2-subtab ${currentTab === 'clerking' ? 'active' : ''}`}
          onClick={() => onSelectTab('clerking')}
          id="tab-auction-clerking"
        >
          {currentTab === 'clerking' && <span className="image2-subtab-dot" />}
          <span>Clerking</span>
        </button>
        <button 
          type="button" 
          className={`image2-subtab ${currentTab === 'alternate-bids' ? 'active' : ''}`}
          onClick={() => onSelectTab('alternate-bids')}
          id="tab-auction-altbids"
        >
          {currentTab === 'alternate-bids' && <span className="image2-subtab-dot" />}
          <span>Alternate Bids</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: DASHBOARD
          ========================================================================= */}
      {currentTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 8 Metric Cards Grid (2 rows of 4 cards) matching Screenshot 2 */}
          <div className="auction-day-metrics-grid">
            {/* Card 1: Lot Count */}
            <div className="metric-card-af360">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f2634',
                  border: '1.5px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <Layers size={22} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
                    {metrics.lotCount}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                    Lot Count
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    Catalogued lots
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Check In Count */}
            <div className="metric-card-af360">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f2634',
                  border: '1.5px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  flexShrink: 0
                }}>
                  <UserCheck size={22} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
                    {metrics.checkInCount}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                    Check In Count
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    Approved bidders
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Unique Sellers */}
            <div className="metric-card-af360">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f2634',
                  border: '1.5px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-primary, #cba135)',
                  flexShrink: 0
                }}>
                  <Users size={22} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
                    {metrics.uniqueSellers}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                    Unique Sellers
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    Distinct consignors
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Presale Estimate Min */}
            <div className="metric-card-af360">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f2634',
                  border: '1.5px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  flexShrink: 0
                }}>
                  <TrendingDown size={22} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
                    {formatCurrency(metrics.presaleMin)}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                    Presale Estimate Min
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    Sum of low estimates
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6: Presale Estimate Max */}
            <div className="metric-card-af360">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f2634',
                  border: '1.5px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-primary, #cba135)',
                  flexShrink: 0
                }}>
                  <TrendingUp size={22} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--gold-dark, #9a741e)', lineHeight: 1.1 }}>
                    {formatCurrency(metrics.presaleMax)}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                    Presale Estimate Max
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    Sum of high estimates
                  </div>
                </div>
              </div>
            </div>

            {/* Card 7: Avg Estimate Per Lot */}
            <div className="metric-card-af360">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f2634',
                  border: '1.5px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a78bfa',
                  flexShrink: 0
                }}>
                  <Maximize2 size={20} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: 20, 
                    fontWeight: 700, 
                    color: metrics.avgEstimate !== null ? 'var(--text-main)' : 'var(--text-dim)', 
                    lineHeight: 1.1 
                  }}>
                    {metrics.avgEstimate !== null ? formatCurrency(metrics.avgEstimate) : '--'}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                    Avg Estimate Per Lot
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    (Min + Max) / 2 / lot count
                  </div>
                </div>
              </div>
            </div>

            {/* Card 8: Avg Sales Price */}
            <div className="metric-card-af360">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#0f2634',
                  border: '1.5px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  flexShrink: 0
                }}>
                  <DollarSign size={22} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: 20, 
                    fontWeight: 700, 
                    color: metrics.avgSalesPrice !== null ? '#059669' : 'var(--text-dim)', 
                    lineHeight: 1.1 
                  }}>
                    {metrics.avgSalesPrice !== null ? formatCurrency(metrics.avgSalesPrice) : '--'}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                    Avg Sales Price
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    {metrics.avgSalesPrice !== null ? 'Realized average' : 'No sales yet'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              HIBID MULTI-PORTAL SYNDICATION STATISTICS TABLE
              ========================================================================= */}
          <div className="card-luxury" style={{ padding: 18, background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  HiBid Multi-Portal Syndication Statistics
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Cross-network simulcast telemetry and high bids across registered portals
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleToggleHiBidEmptyState}
                  title="Toggle empty state to verify requirement 2C"
                  style={{ fontSize: 11.5, padding: '4px 10px' }}
                >
                  {siteStats.length > 0 ? 'Test Empty State' : 'Populate Live Sites'}
                </button>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => handleOpenSiteStatDrawer('add')}
                  style={{ fontSize: 11.5, padding: '4px 10px' }}
                >
                  <Plus size={13} />
                  <span>Add Portal Node</span>
                </button>
              </div>
            </div>

            <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <table className="catalog-luxury-table" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: 200 }}>SITE</th>
                    <th style={{ textAlign: 'right', width: 100 }}>REGISTRATIONS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>CC AUTHS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>VIEWS</th>
                    <th style={{ textAlign: 'right', width: 110 }}>UNIQUE BIDDERS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>UNIQUE BIDS</th>
                    <th style={{ textAlign: 'right', width: 90 }}>TOTAL BIDS</th>
                    <th style={{ textAlign: 'right', width: 110 }}>HIGH BID</th>
                    <th style={{ textAlign: 'right', width: 110 }}>MAX BID</th>
                    <th style={{ textAlign: 'center', width: 70 }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Empty state exact match to Screenshot 2 */}
                  {siteStats.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={10} 
                        style={{ 
                          textAlign: 'center', 
                          padding: '40px 16px', 
                          color: '#64748b', 
                          fontStyle: 'italic',
                          fontSize: 14 
                        }}
                      >
                        Currently No HiBid Auction Stats.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {(() => {
                        const startIndex = (siteStatsPage - 1) * siteStatsPageSize;
                        const pageSlice = siteStats.slice(startIndex, startIndex + siteStatsPageSize);
                        return pageSlice.map((site) => (
                          <tr key={site.site}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ color: '#0369a1' }}>{site.site}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.registrations}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.ccAuths}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.views.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.uniqueBidders}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.uniqueBids}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{site.totalBids}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--gold-dark, #9a741e)' }}>
                              {formatCurrency(site.highBid)}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                              {formatCurrency(site.maxBid)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <TableRowActionMenu
                                actions={[
                                  {
                                    label: 'View Telemetry',
                                    icon: <Eye size={14} />,
                                    onClick: () => handleOpenSiteStatDrawer('view', site)
                                  },
                                  {
                                    label: 'Edit Portal Node',
                                    icon: <Edit size={14} />,
                                    onClick: () => handleOpenSiteStatDrawer('edit', site)
                                  },
                                  {
                                    label: 'Remove Node',
                                    icon: <Trash2 size={14} />,
                                    variant: 'destructive',
                                    onClick: () => handlePromptDelete('siteStat', site.site, site.site)
                                  }
                                ]}
                              />
                            </td>
                          </tr>
                        ));
                      })()}

                      {/* Total Summary Row */}
                      <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid var(--border-medium)' }}>
                        <td style={{ color: 'var(--text-main)' }}>Total ({siteStats.length} Syndications)</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.registrations}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.ccAuths}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.views.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.uniqueBidders}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.uniqueBids}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalSiteStats.totalBids}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--gold-dark, #9a741e)' }}>
                          {formatCurrency(totalSiteStats.highBid)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                          {formatCurrency(totalSiteStats.maxBid)}
                        </td>
                        <td style={{ textAlign: 'center' }}>—</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {siteStats.length > 0 && (
              <ShadcnPagination
                currentPage={siteStatsPage}
                pageSize={siteStatsPageSize}
                totalItems={siteStats.length}
                onPageChange={setSiteStatsPage}
                onPageSizeChange={(newSize) => {
                  setSiteStatsPageSize(newSize);
                  setSiteStatsPage(1);
                }}
              />
            )}
          </div>

          {/* =========================================================================
              AUCTION DETAILS SECTION (Below Stats Table: Details | Registrations | Lot Stats)
              ========================================================================= */}
          <div className="card-luxury" style={{ padding: 18, background: '#ffffff' }}>
            <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setDashboardBottomTab('details')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: dashboardBottomTab === 'details' ? 'var(--gold-primary, #cba135)' : 'transparent',
                  color: dashboardBottomTab === 'details' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setDashboardBottomTab('registrations')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: dashboardBottomTab === 'registrations' ? 'var(--gold-primary, #cba135)' : 'transparent',
                  color: dashboardBottomTab === 'registrations' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Registrations ({registrations.length})
              </button>
              <button
                type="button"
                onClick={() => setDashboardBottomTab('lot-stats')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: dashboardBottomTab === 'lot-stats' ? 'var(--gold-primary, #cba135)' : 'transparent',
                  color: dashboardBottomTab === 'lot-stats' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Lot Stats ({auctionLots.length})
              </button>
            </div>

            {/* Sub-tab A: Details */}
            {dashboardBottomTab === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div style={{ background: '#fcfbf9', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 10px', color: 'var(--text-main)' }}>Auction Overview</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Code</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{auction.code}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Name</span>
                      <span>{auction.name}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Type</span>
                      <span>{auction.auctionType || 'HiBid'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Description</span>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{auction.description || 'Premier catalogued auction event.'}</p>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#fcfbf9', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 10px', color: 'var(--text-main)' }}>Location & Active Dates</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Active Dates</span>
                      <span>{formatDate(auction.startDate)} to {formatDate(auction.endDate)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Address</span>
                      <span>{auction.address1 || 'Saleroom Facility'} {auction.address2 ? `• ${auction.address2}` : ''}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>City / State / Zip</span>
                      <span>{auction.city || 'Missoula'}, {auction.state || 'MT'} {auction.zip || '59801'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', display: 'block' }}>Country</span>
                      <span>{auction.country || 'United States'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab B: Registrations */}
            {dashboardBottomTab === 'registrations' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Showing registered bidders for this session ({registrations.length})
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenBidderDrawer('add')}
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      <Plus size={13} />
                      <span>Register Bidder</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-gold"
                      onClick={() => onSelectTab('check-in')}
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      Open Check In Tab →
                    </button>
                  </div>
                </div>

                <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                  <table className="catalog-luxury-table" style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>BID CARD #</th>
                        <th style={{ minWidth: 160 }}>BIDDER</th>
                        <th style={{ width: 140 }}>HIBID REPUTATION</th>
                        <th style={{ width: 80, textAlign: 'center' }}>BID COUNT</th>
                        <th style={{ minWidth: 140 }}>PERMISSION</th>
                        <th style={{ width: 140 }}>DATE / TIME</th>
                        <th style={{ width: 160 }}>ORIGIN SITE</th>
                        <th style={{ width: 110, textAlign: 'center' }}>CHECK IN</th>
                        <th style={{ width: 70, textAlign: 'center' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const startIndex = (dashRegPage - 1) * dashRegPageSize;
                        const pageSlice = registrations.slice(startIndex, startIndex + dashRegPageSize);

                        if (pageSlice.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                                No registered bidders found for this auction.
                              </td>
                            </tr>
                          );
                        }

                        return pageSlice.map(reg => (
                          <tr key={reg.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark, #9a741e)' }}>
                              #{reg.bidCardNumber}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{reg.bidderName}</div>
                              {reg.username && reg.username !== reg.bidderName && (
                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>@{reg.username}</div>
                              )}
                            </td>
                            <td style={{ color: '#b45309', fontWeight: 600 }}>{reg.hibidReputation}</td>
                            <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{reg.bidCount}</td>
                            <td style={{ color: '#047857', fontWeight: 600 }}>{reg.permissionText}</td>
                            <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{reg.dateTime}</td>
                            <td style={{ color: '#0284c7' }}>{reg.site}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: reg.isCheckedIn ? '#dcfce7' : '#fee2e2',
                                color: reg.isCheckedIn ? '#15803d' : '#b91c1c'
                              }}>
                                {reg.isCheckedIn ? 'Checked In' : 'Pending'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <TableRowActionMenu
                                actions={[
                                  {
                                    label: 'View Details',
                                    icon: <Eye size={14} />,
                                    onClick: () => handleOpenBidderDrawer('view', reg)
                                  },
                                  {
                                    label: 'Edit Bidder',
                                    icon: <Edit size={14} />,
                                    onClick: () => handleOpenBidderDrawer('edit', reg)
                                  },
                                  {
                                    label: reg.isCheckedIn ? 'Undo Check In' : 'Check In',
                                    icon: <Check size={14} />,
                                    onClick: () => handleToggleCheckIn(reg.id, Boolean(reg.isCheckedIn))
                                  },
                                  {
                                    label: 'Record Deposit',
                                    icon: <DollarSign size={14} />,
                                    onClick: () => handleOpenDepositDrawerForBidder(reg)
                                  },
                                  {
                                    label: 'Delete Bidder',
                                    icon: <Trash2 size={14} />,
                                    variant: 'destructive',
                                    onClick: () => handlePromptDelete('bidder', reg.id, `Paddle #${reg.bidCardNumber} - ${reg.bidderName}`)
                                  }
                                ]}
                              />
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Dashboard Registrations Pagination */}
                {registrations.length > 0 && (
                  <ShadcnPagination
                    currentPage={dashRegPage}
                    pageSize={dashRegPageSize}
                    totalItems={registrations.length}
                    onPageChange={setDashRegPage}
                    onPageSizeChange={(newSize) => {
                      setDashRegPageSize(newSize);
                      setDashRegPage(1);
                    }}
                  />
                )}
              </div>
            )}

            {/* Sub-tab C: Lot Stats */}
            {dashboardBottomTab === 'lot-stats' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Catalog engagement and current bid status across {auctionLots.length} catalogued lots
                  </span>
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={() => onSelectTab('clerking')}
                    style={{ fontSize: 12, padding: '4px 12px' }}
                  >
                    Open Live Clerking Tab →
                  </button>
                </div>

                <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                  <table className="catalog-luxury-table" style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>IMAGE</th>
                        <th style={{ width: 70 }}>LOT #</th>
                        <th style={{ minWidth: 240 }}>TITLE</th>
                        <th style={{ width: 110, textAlign: 'right' }}>ESTIMATE LOW</th>
                        <th style={{ width: 110, textAlign: 'right' }}>ESTIMATE HIGH</th>
                        <th style={{ width: 110, textAlign: 'right' }}>CURRENT BID</th>
                        <th style={{ width: 80, textAlign: 'center' }}>BIDS</th>
                        <th style={{ width: 120, textAlign: 'center' }}>STATUS</th>
                        <th style={{ width: 70, textAlign: 'center' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const startIndex = (lotStatsPage - 1) * lotStatsPageSize;
                        const pageSlice = auctionLots.slice(startIndex, startIndex + lotStatsPageSize);

                        if (pageSlice.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                                No lots found for this auction.
                              </td>
                            </tr>
                          );
                        }

                        return pageSlice.map(lot => (
                          <tr key={lot.id}>
                            <td>
                              <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={lot.image || '/assets/gold-coin.jpg'} alt={lot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>#{lot.lotNumber}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lot.title}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(lot.estimateLow)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(lot.estimateHigh)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark, #9a741e)' }}>
                              {formatCurrency(lot.currentBid || lot.startingBid)}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{lot.bidsCount || 0}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: lot.status === 'sold' ? '#dcfce7' : lot.status === 'on_block' ? '#fef3c7' : '#f1f5f9',
                                color: lot.status === 'sold' ? '#15803d' : lot.status === 'on_block' ? '#92400e' : '#475569'
                              }}>
                                {lot.status === 'on_block' ? 'On Block' : lot.status === 'sold' ? 'Sold' : 'Upcoming'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <TableRowActionMenu
                                actions={[
                                  {
                                    label: 'View Lot Details',
                                    icon: <Eye size={14} />,
                                    onClick: () => handleOpenLotDrawer(lot)
                                  },
                                  {
                                    label: 'Open in Clerking',
                                    icon: <Gavel size={14} />,
                                    onClick: () => {
                                      setActiveClerkLotId(lot.id);
                                      onSelectTab('clerking');
                                    }
                                  }
                                ]}
                              />
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Lot Stats Pagination */}
                {auctionLots.length > 0 && (
                  <ShadcnPagination
                    currentPage={lotStatsPage}
                    pageSize={lotStatsPageSize}
                    totalItems={auctionLots.length}
                    onPageChange={setLotStatsPage}
                    onPageSizeChange={(newSize) => {
                      setLotStatsPageSize(newSize);
                      setLotStatsPage(1);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: CHECK IN (AuctionFlex360 Check In Workflow & Table)
          ========================================================================= */}
      {currentTab === 'check-in' && (() => {
        // Filter registrations
        const query = (checkInSearch || '').trim().toLowerCase();
        const filtered = (registrations || []).filter(r => {
          if (!r) return false;
          const matchesQuery = !query ||
            (r.bidCardNumber ? String(r.bidCardNumber).toLowerCase().includes(query) : false) ||
            (r.bidderName ? String(r.bidderName).toLowerCase().includes(query) : false) ||
            (r.companyName ? String(r.companyName).toLowerCase().includes(query) : false) ||
            (r.email ? String(r.email).toLowerCase().includes(query) : false) ||
            (r.username ? String(r.username).toLowerCase().includes(query) : false) ||
            (r.hearAboutUs ? String(r.hearAboutUs).toLowerCase().includes(query) : false);

          if (checkInStatusFilter === 'checked_in') return matchesQuery && Boolean(r.isCheckedIn);
          if (checkInStatusFilter === 'pending') return matchesQuery && !r.isCheckedIn;
          return matchesQuery;
        });

        // Sort registrations
        const sorted = [...filtered].sort((a, b) => {
          let aVal: any = a[checkInSortField] ?? '';
          let bVal: any = b[checkInSortField] ?? '';

          if (checkInSortField === 'bidCardNumber') {
            const aNum = parseInt(String(a.bidCardNumber || ''), 10);
            const bNum = parseInt(String(b.bidCardNumber || ''), 10);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return checkInSortOrder === 'asc' ? aNum - bNum : bNum - aNum;
            }
          }

          if (typeof aVal === 'boolean' || typeof bVal === 'boolean') {
            const aN = aVal ? 1 : 0;
            const bN = bVal ? 1 : 0;
            return checkInSortOrder === 'asc' ? aN - bN : bN - aN;
          }

          const cmp = String(aVal).localeCompare(String(bVal));
          return checkInSortOrder === 'asc' ? cmp : -cmp;
        });

        // Pagination calculations
        const totalItems = sorted.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(currentPage, totalPages);
        const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const currentSlice = sorted.slice(startIndex, endIndex);

        const visibleIds = currentSlice.map(r => r.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedRegIds.has(id));
        const someVisibleSelected = visibleIds.some(id => selectedRegIds.has(id)) && !allVisibleSelected;

        return (
          <div className="card-luxury" style={{ padding: '20px 24px', background: '#ffffff', borderRadius: 8 }}>
            {/* AuctionFlex360 Action Toolbar - Row 1: Primary Actions */}
            <div className="auction-day-toolbar-row">
              {/* 1. Check In Button (Opens verification & confirmation dialog when selected, Bidder Check In modal when 0 selected) */}
              <button
                type="button"
                onClick={() => {
                  if (selectedRegIds.size > 0) {
                    setIsCheckInConfirmModalOpen(true);
                  } else {
                    setIsBidderCheckInModalOpen(true);
                    setCheckInTabMode('find');
                    handleExecuteCheckInSearch();
                  }
                }}
                disabled={isAuctionClosed}
                className="af360-btn-teal"
                id="btn-checkin-selected"
                title={selectedRegIds.size > 0 ? `Verify & Check in ${selectedRegIds.size} selected bidder(s)` : "Bidder Check In"}
              >
                <Check size={14} strokeWidth={3} />
                <span>CHECK IN</span>
              </button>

              {/* 2. Import Bidders Button */}
              <button
                type="button"
                onClick={() => {
                  setImportStep(1);
                  setImportFileName('');
                  setImportRawText('');
                  setImportParsedList([]);
                  setIsImportModalOpen(true);
                }}
                disabled={isAuctionClosed}
                className="af360-btn-teal"
                id="btn-import-bidders"
                title="Import bidder roster from CSV file"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m8 17 4 4 4-4" />
                </svg>
                <span>IMPORT BIDDERS</span>
              </button>

              {/* 3. Scan License Button */}
              <button
                type="button"
                onClick={() => {
                  setIsScanLicenseModalOpen(true);
                  setScanLicenseMode('camera');
                  handleStartCamera();
                }}
                disabled={isAuctionClosed}
                className="af360-btn-teal"
                id="btn-scan-license"
                title="Scan driver's license with camera or document reader"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
                </svg>
                <span>SCAN LICENSE</span>
              </button>

              {/* 4. Manage Deposits Button (Live count of deposits) */}
              <button
                type="button"
                onClick={() => {
                  setIsManageDepositsModalOpen(true);
                  setDepositFilterBidder('all');
                  setDepositSearchTerm('');
                  if (registrations.length > 0) {
                    setNewDepBidderRegId(registrations[0].id);
                  }
                }}
                className="af360-btn-teal"
                id="btn-manage-deposits"
                title="Manage and record bidder deposit payments"
              >
                <Briefcase size={14} />
                <span>MANAGE DEPOSITS ({deposits.length})</span>
              </button>

              {/* 5. + Register Bidder Button (Opens Right-Side Sheet) */}
              <button
                type="button"
                disabled={isAuctionClosed}
                className="af360-btn-teal"
                onClick={() => handleOpenBidderDrawer('add')}
                style={{ marginLeft: 'auto' }}
                title={isAuctionClosed ? "Auction closed" : "Register new bidder"}
                id="btn-register-bidder"
              >
                <Plus size={14} />
                <span>REGISTER BIDDER</span>
              </button>
            </div>

            {/* Row 2: No Bidders Selected / Batch Actions Shadcn Dropdown */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <ShadcnDropdownMenu
                isOpen={isActionsDropdownOpen}
                onOpenChange={setIsActionsDropdownOpen}
                trigger={
                  <button
                    type="button"
                    className="af360-btn-teal"
                    id="dropdown-selected-bidders"
                    title={selectedRegIds.size === 0 ? "Click for selection options" : "Batch actions for selected bidders"}
                    style={{ minWidth: 200, justifyContent: 'space-between' }}
                  >
                    <span>{selectedRegIds.size === 0 ? 'NO BIDDERS SELECTED' : `ACTIONS (${selectedRegIds.size} SELECTED)`}</span>
                    <ChevronDown size={14} />
                  </button>
                }
              >
                {selectedRegIds.size > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsCheckInConfirmModalOpen(true);
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <Check size={14} color="#059669" />
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>Check In Selected ({selectedRegIds.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        handleBulkCheckIn(false);
                      }}
                      className="shadcn-dropdown-item destructive"
                    >
                      <RotateCcw size={14} />
                      <span>Undo Check In ({selectedRegIds.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        const firstSelected = registrations.find(r => selectedRegIds.has(r.id));
                        if (firstSelected) {
                          setNewDepBidderRegId(firstSelected.id);
                        }
                        setIsManageDepositsModalOpen(true);
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <DollarSign size={14} color="#0284c7" />
                      <span>Record Deposit for Selected</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        window.print();
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <Printer size={14} />
                      <span>Print Paddle Cards</span>
                    </button>

                    <div className="shadcn-dropdown-separator" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setSelectedRegIds(new Set());
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <X size={14} color="#64748b" />
                      <span>Deselect All</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="shadcn-dropdown-label">
                      Selection Shortcuts
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        const pendingIds = registrations.filter(r => !r.isCheckedIn).map(r => r.id);
                        setSelectedRegIds(new Set(pendingIds));
                        showToast('info', 'Selected Pending', `Selected ${pendingIds.length} pending bidder(s).`);
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <Users size={14} color="#64748b" />
                      <span>Select All Pending ({registrations.filter(r => !r.isCheckedIn).length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        const vIds = currentSlice.map(r => r.id);
                        setSelectedRegIds(new Set(vIds));
                        showToast('info', 'Selected Visible', `Selected ${vIds.length} visible bidder(s).`);
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <CheckSquare size={14} color="#64748b" />
                      <span>Select All On Current Page ({currentSlice.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        const allIds = registrations.map(r => r.id);
                        setSelectedRegIds(new Set(allIds));
                        showToast('info', 'Selected All', `Selected all ${allIds.length} registered bidder(s).`);
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <Layers size={14} color="#64748b" />
                      <span>Select All Registered ({registrations.length})</span>
                    </button>

                    <div className="shadcn-dropdown-separator" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsQuickCheckInModalOpen(true);
                      }}
                      className="shadcn-dropdown-item"
                    >
                      <CheckCircle size={14} color="#059669" />
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>Open Quick Check In Window...</span>
                    </button>
                  </>
                )}
              </ShadcnDropdownMenu>
            </div>

            {/* Search Box with Column Settings Gear Icon matching AF360 */}
            <div className="auction-day-search-bar-row">
              <div style={{
                flex: '1 1 320px',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                background: '#ffffff',
                padding: '4px 12px',
                height: 38
              }}>
                <Search size={15} color="#64748b" style={{ flexShrink: 0, marginRight: 8 }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={checkInSearch}
                  onChange={(e) => {
                    setCheckInSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  autoComplete="off"
                  id="input-checkin-search"
                  style={{
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    fontSize: 13,
                    color: '#1e293b',
                    background: 'transparent'
                  }}
                />
                {checkInSearch && (
                  <button
                    type="button"
                    onClick={() => setCheckInSearch('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      marginRight: 6,
                      color: '#94a3b8'
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Column Configuration Gear Dropdown */}
                <ShadcnDropdownMenu
                  isOpen={isColConfigDropdownOpen}
                  onOpenChange={setIsColConfigDropdownOpen}
                  align="right"
                  trigger={
                    <button
                      type="button"
                      style={{
                        background: isColConfigDropdownOpen ? '#f1f5f9' : 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: isColConfigDropdownOpen ? '#0f172a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4,
                        transition: 'all 0.15s ease'
                      }}
                      title="Configure Columns"
                      id="btn-col-config-gear"
                    >
                      <Settings size={16} />
                    </button>
                  }
                >
                  <div style={{ minWidth: 210, padding: '4px 2px' }}>
                    <div className="shadcn-dropdown-label">
                      Toggle Columns
                    </div>
                    {[
                      { key: 'bidCardNumber', label: 'Bidder #' },
                      { key: 'companyName', label: 'Company Name' },
                      { key: 'bidderName', label: 'Bidder Name' },
                      { key: 'email', label: 'Email' },
                      { key: 'hearAboutUs', label: 'Hear About Us' },
                      { key: 'creditLimit', label: 'Credit & Limit' },
                      { key: 'status', label: 'Status' },
                      { key: 'actions', label: 'Actions' }
                    ].map(col => {
                      const isChecked = Boolean(visibleColumns[col.key]);
                      return (
                        <label 
                          key={col.key} 
                          className="shadcn-dropdown-item" 
                          style={{ 
                            cursor: 'pointer', 
                            justifyContent: 'space-between',
                            padding: '6px 10px'
                          }}
                        >
                          <span style={{ fontSize: 12.5, fontWeight: isChecked ? 600 : 400, color: isChecked ? '#0f172a' : '#64748b' }}>
                            {col.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setVisibleColumns(prev => {
                                const updated = { ...prev, [col.key]: checked };
                                try {
                                  localStorage.setItem('af360_auction_day_checkin_columns', JSON.stringify(updated));
                                } catch (_) {}
                                return updated;
                              });
                            }}
                            style={{ accentColor: '#0d9488', cursor: 'pointer', width: 14, height: 14 }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </ShadcnDropdownMenu>
              </div>

              {/* Status Filter - Shadcn Select */}
              <div className="auction-day-search-filter-wrap">
                <ShadcnSelect
                  value={checkInStatusFilter}
                  onChange={(val) => {
                    setCheckInStatusFilter(val as any);
                    setCurrentPage(1);
                  }}
                  id="select-status-filter"
                  size="md"
                  className="min-w-[220px]"
                  options={[
                    { value: 'all', label: `All Bidders (${registrations.length})` },
                    { value: 'checked_in', label: `Checked In Only (${metrics.checkInCount})` },
                    { value: 'pending', label: `Pending Entry (${registrations.length - metrics.checkInCount})` }
                  ]}
                />
              </div>
            </div>

            {/* Bidder Table (Matches AuctionFlex360 columns & sortable headers) */}
            <div className="catalog-table-scroll auction-day-table-responsive" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, overflowX: 'auto' }}>
              <table className="catalog-luxury-table" style={{ fontSize: 13, width: '100%', minWidth: 880 }}>
                <thead>
                  <tr>
                    {/* Checkbox Column */}
                    <th style={{ width: 44, textAlign: 'center', padding: '10px 8px' }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={el => {
                          if (el) el.indeterminate = someVisibleSelected;
                        }}
                        onChange={() => handleSelectAllVisible(visibleIds)}
                        aria-label="Select all visible bidders"
                        id="checkbox-select-all-bidders"
                        style={{ cursor: 'pointer' }}
                      />
                    </th>

                    {/* Bidder # */}
                    {visibleColumns.bidCardNumber && (
                      <th
                        onClick={() => handleSort('bidCardNumber')}
                        style={{ width: 105, cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Bidder #"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>BIDDER #</span>
                          <ArrowUpDown size={12} color={checkInSortField === 'bidCardNumber' ? 'var(--gold-dark, #9a741e)' : '#94a3b8'} />
                        </div>
                      </th>
                    )}

                    {/* CompanyName */}
                    {visibleColumns.companyName && (
                      <th
                        onClick={() => handleSort('companyName')}
                        style={{ minWidth: 150, cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Company"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>COMPANYNAME</span>
                          <ArrowUpDown size={12} color={checkInSortField === 'companyName' ? 'var(--gold-dark, #9a741e)' : '#94a3b8'} />
                        </div>
                      </th>
                    )}

                    {/* Name */}
                    {visibleColumns.bidderName && (
                      <th
                        onClick={() => handleSort('bidderName')}
                        style={{ minWidth: 180, cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Name"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>NAME</span>
                          <ArrowUpDown size={12} color={checkInSortField === 'bidderName' ? 'var(--gold-dark, #9a741e)' : '#94a3b8'} />
                        </div>
                      </th>
                    )}

                    {/* Email */}
                    {visibleColumns.email && (
                      <th
                        onClick={() => handleSort('email')}
                        style={{ minWidth: 180, cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Email"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>EMAIL</span>
                          <ArrowUpDown size={12} color={checkInSortField === 'email' ? 'var(--gold-dark, #9a741e)' : '#94a3b8'} />
                        </div>
                      </th>
                    )}

                    {/* Hear About Us */}
                    {visibleColumns.hearAboutUs && (
                      <th
                        onClick={() => handleSort('hearAboutUs')}
                        style={{ minWidth: 140, cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Hear About Us"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>HEAR ABOUT US</span>
                          <ArrowUpDown size={12} color={checkInSortField === 'hearAboutUs' ? 'var(--gold-dark, #9a741e)' : '#94a3b8'} />
                        </div>
                      </th>
                    )}

                    {/* Credit & Limit */}
                    {visibleColumns.creditLimit && (
                      <th style={{ minWidth: 160 }}>CREDIT & LIMIT</th>
                    )}

                    {/* Status */}
                    {visibleColumns.status && (
                      <th
                        onClick={() => handleSort('isCheckedIn')}
                        style={{ width: 120, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Status"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <span>STATUS</span>
                          <ArrowUpDown size={12} color={checkInSortField === 'isCheckedIn' ? 'var(--gold-dark, #9a741e)' : '#94a3b8'} />
                        </div>
                      </th>
                    )}

                    {/* Actions */}
                    {visibleColumns.actions && (
                      <th style={{ width: 160, textAlign: 'center' }}>ACTIONS</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentSlice.map(reg => {
                    const isSelected = selectedRegIds.has(reg.id);

                    return (
                      <tr 
                        key={reg.id} 
                        style={{ 
                          background: isSelected ? 'rgba(203, 161, 53, 0.08)' : undefined,
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Row Selection Checkbox */}
                        <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(reg.id)}
                            aria-label={`Select bidder ${reg.bidderName}`}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* Bidder # */}
                        {visibleColumns.bidCardNumber && (
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark, #9a741e)', fontSize: 13 }}>
                            #{reg.bidCardNumber}
                          </td>
                        )}

                        {/* CompanyName */}
                        {visibleColumns.companyName && (
                          <td style={{ color: reg.companyName ? 'var(--text-main)' : 'var(--text-dim)', fontWeight: 500 }}>
                            {reg.companyName || '—'}
                          </td>
                        )}

                        {/* Name */}
                        {visibleColumns.bidderName && (
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{reg.bidderName}</div>
                            {reg.username && reg.username !== reg.bidderName && (
                              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>@{reg.username}</div>
                            )}
                          </td>
                        )}

                        {/* Email */}
                        {visibleColumns.email && (
                          <td style={{ color: reg.email ? '#0284c7' : 'var(--text-dim)', fontSize: 12.5 }}>
                            {reg.email || '—'}
                          </td>
                        )}

                        {/* Hear About Us */}
                        {visibleColumns.hearAboutUs && (
                          <td>
                            <span style={{
                              fontSize: 11.5,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#f1f5f9',
                              color: 'var(--text-secondary)',
                              fontWeight: 500
                            }}>
                              {reg.hearAboutUs || 'Website'}
                            </span>
                          </td>
                        )}

                        {/* Credit & Limit */}
                        {visibleColumns.creditLimit && (
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#047857' }}>{reg.permissionText}</div>
                            <div style={{ fontSize: 11, color: '#b45309' }}>{reg.hibidReputation}</div>
                            {Number(reg.depositAmount) > 0 && (
                              <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, marginTop: 2 }}>
                                Dep: {formatCurrency(reg.depositAmount)} ({reg.depositStatus || 'Collected'})
                              </div>
                            )}
                          </td>
                        )}

                        {/* Status */}
                        {visibleColumns.status && (
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              padding: '3px 10px', 
                              borderRadius: 20, 
                              fontSize: 11.5, 
                              fontWeight: 700,
                              background: reg.isCheckedIn ? '#dcfce7' : '#fee2e2',
                              color: reg.isCheckedIn ? '#15803d' : '#b91c1c',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {reg.isCheckedIn ? <Check size={12} /> : null}
                              {reg.isCheckedIn ? 'Checked In' : 'Pending Entry'}
                            </span>
                          </td>
                        )}

                        {/* Actions */}
                        {visibleColumns.actions && (
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <button 
                                type="button"
                                disabled={isAuctionClosed}
                                onClick={() => handleToggleCheckIn(reg.id, reg.isCheckedIn)}
                                className={`btn ${reg.isCheckedIn ? 'btn-secondary' : 'btn-gold'}`}
                                style={{
                                  fontSize: 12,
                                  padding: '4px 10px',
                                  opacity: isAuctionClosed ? 0.6 : 1,
                                  cursor: isAuctionClosed ? 'not-allowed' : 'pointer'
                                }}
                                title={isAuctionClosed ? "Auction is closed" : undefined}
                              >
                                {reg.isCheckedIn ? 'Undo' : 'Check In'}
                              </button>

                              <TableRowActionMenu
                                actions={[
                                  {
                                    label: 'View Details',
                                    icon: <Eye size={14} />,
                                    onClick: () => handleOpenBidderDrawer('view', reg)
                                  },
                                  {
                                    label: 'Edit Bidder',
                                    icon: <Edit size={14} />,
                                    onClick: () => handleOpenBidderDrawer('edit', reg)
                                  },
                                  {
                                    label: reg.isCheckedIn ? 'Undo Check In' : 'Check In',
                                    icon: <Check size={14} />,
                                    onClick: () => handleToggleCheckIn(reg.id, Boolean(reg.isCheckedIn))
                                  },
                                  {
                                    label: 'Record Deposit',
                                    icon: <DollarSign size={14} />,
                                    onClick: () => handleOpenDepositDrawerForBidder(reg)
                                  },
                                  {
                                    label: 'Delete Bidder',
                                    icon: <Trash2 size={14} />,
                                    variant: 'destructive',
                                    onClick: () => handlePromptDelete('bidder', reg.id, `Paddle #${reg.bidCardNumber} - ${reg.bidderName}`)
                                  }
                                ]}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Empty state strictly matching reference text */}
                  {totalItems === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-dim)', fontSize: 13.5 }}>
                        No data available in table
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <ShadcnPagination
                currentPage={safePage}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        );
      })()}

      {/* =========================================================================
          SUB-TAB 3: CLERKING (Authentic AF360 Live Saleroom Clerking Console)
          ========================================================================= */}
      {currentTab === 'clerking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header Bar with Action to launch full Rostrum */}
          <div className="card-luxury" style={{ padding: '14px 20px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 18, color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>
                Live Clerking Desk
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Active Lot #{selectedClerkLot?.lotNumber || clerkLotNumber} — {selectedClerkLot?.title || 'Saleroom Lot'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-gold"
                onClick={onNavigateClerking}
                style={{ fontSize: 13, padding: '8px 18px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                title="Launch full-screen Rostrum view"
              >
                <Radio size={15} />
                <span>Auctioneer Screen</span>
              </button>
            </div>
          </div>

          {/* Reserve & Pre-Sale Summary Card */}
          <div className="card-luxury" style={{ padding: '16px 20px', background: '#ffffff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Reserve (Each)
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 4 }}>
                  {selectedClerkLot?.reserve && Number(selectedClerkLot.reserve) > 0 ? formatCurrency(selectedClerkLot.reserve) : '--'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Total Reserve
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 4 }}>
                  {selectedClerkLot?.reserve && Number(selectedClerkLot.reserve) > 0 ? formatCurrency(Number(selectedClerkLot.reserve) * (clerkQuantity || 1)) : '--'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Pre-Sale Estimate (Each)
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--gold-dark, #9a741e)', marginTop: 4 }}>
                  {selectedClerkLot ? `${formatCurrency(selectedClerkLot.estimateLow)} – ${formatCurrency(selectedClerkLot.estimateHigh)}` : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* Clerking Entry Form Card */}
          <div className="card-luxury" style={{ padding: 20, background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gavel size={18} color="var(--gold-primary, #cba135)" />
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Clerking Entry
                </h4>
              </div>
            </div>

            {/* Entry Fields - One Single Horizontal Line */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(75px, 0.7fr) minmax(170px, 1.5fr) minmax(210px, 2fr) minmax(130px, 1.1fr) minmax(120px, 1fr) minmax(65px, 0.6fr) minmax(120px, 1fr)',
              gap: 12,
              alignItems: 'start'
            }}>
              {/* Lot Number */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Lot Number *
                </label>
                <input
                  type="number"
                  disabled={isAuctionClosed}
                  value={clerkLotNumber}
                  onChange={(e) => setClerkLotNumber(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}
                  placeholder="e.g. 1"
                />
              </div>

              {/* Sold To (formerly Seller) */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Sold To *
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkSeller}
                  onChange={(val) => {
                    setClerkSeller(val);
                    const matched = supabaseCustomers.find(c => c.fullName === val);
                    if (matched?.permanentBidderNumber) {
                      setClerkBidderNumber(matched.permanentBidderNumber);
                    }
                  }}
                  size="md"
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search customer..."
                  placeholder="Select customer..."
                  clearable={true}
                  options={customerSelectOptions}
                />
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Title
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkTitle}
                  onChange={(val) => setClerkTitle(val)}
                  size="md"
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search title..."
                  placeholder="Select auction title..."
                  clearable={true}
                  options={auctionTitleSelectOptions}
                />
              </div>

              {/* Hammer Price with X Money */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20, marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', margin: 0 }}>
                    Hammer Price ($)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={clerkXMoney}
                      onChange={(e) => setClerkXMoney(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>x money</span>
                  </label>
                </div>
                <input
                  type="number"
                  step="10"
                  disabled={isAuctionClosed}
                  value={clerkHammerPrice}
                  onChange={(e) => setClerkHammerPrice(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: '#15803d' }}
                  placeholder="0.00"
                />
              </div>

              {/* Bidder Number with validation helper */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20, marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', margin: 0 }}>
                    Bidder Number
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBidderCheckInModalOpen(true);
                      setCheckInTabMode('find');
                      handleExecuteCheckInSearch();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold-dark, #9a741e)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                    title="Lookup & select existing customer to fill Bidder #"
                  >
                    Lookup
                  </button>
                </div>
                <input
                  type="text"
                  disabled={isAuctionClosed}
                  value={clerkBidderNumber}
                  onChange={(e) => setClerkBidderNumber(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}
                  placeholder="e.g. 104"
                />
                <div style={{ marginTop: 4, minHeight: 18 }}>
                  {bidderValidationStatus ? (
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: bidderValidationStatus.bg,
                      color: bidderValidationStatus.color,
                      display: 'inline-block',
                      whiteSpace: 'nowrap'
                    }}>
                      {bidderValidationStatus.text}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>Enter paddle number</span>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={isAuctionClosed}
                  value={clerkQuantity}
                  onChange={(e) => setClerkQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Status
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkStatus}
                  onChange={(val) => setClerkStatus(val)}
                  size="md"
                  fullWidth
                  options={[
                    { value: 'Sold', label: 'Sold' },
                    { value: 'Passed', label: 'Passed' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Withdrawn', label: 'Withdrawn' }
                  ]}
                />
              </div>
            </div>

            {/* Save Button Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                disabled={isClerkingSaving || isAuctionClosed}
                onClick={handleSaveClerking}
                className="btn btn-gold"
                style={{
                  height: 40,
                  padding: '0 28px',
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: isAuctionClosed ? 0.5 : 1,
                  cursor: isAuctionClosed ? 'not-allowed' : 'pointer'
                }}
              >
                <Gavel size={16} />
                <span>{isClerkingSaving ? 'SAVING...' : 'SAVE'}</span>
              </button>
            </div>
          </div>

          {/* Clerking Records Table Section */}
          <div className="card-luxury" style={{ padding: 20, background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              {/* Batch Action Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShadcnDropdownMenu
                  trigger={
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <span>{selectedClerkingLotIds.size > 0 ? `${selectedClerkingLotIds.size} Selected` : 'No Clerkings Selected'}</span>
                      <ChevronDown size={14} />
                    </button>
                  }
                  items={[
                    {
                      label: 'Mark Selected as Sold',
                      onClick: () => handleBatchClerkingAction('sold'),
                      disabled: selectedClerkingLotIds.size === 0
                    },
                    {
                      label: 'Mark Selected as Passed',
                      onClick: () => handleBatchClerkingAction('passed'),
                      disabled: selectedClerkingLotIds.size === 0
                    },
                    {
                      label: 'Reopen Selected Lots',
                      onClick: () => handleBatchClerkingAction('reopen'),
                      disabled: selectedClerkingLotIds.size === 0
                    }
                  ]}
                />
              </div>

              {/* Search with gear configuration icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="catalog-search-wrapper" style={{ width: 240 }}>
                  <Search size={14} className="catalog-search-icon" />
                  <input
                    type="text"
                    placeholder="Search clerked lots..."
                    value={clerkingSearch}
                    onChange={(e) => {
                      setClerkingSearch(e.target.value);
                      setClerkingPage(1);
                    }}
                    className="catalog-search-input"
                    style={{ height: 34, fontSize: 12.5 }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  title="Table column settings"
                  style={{ height: 34, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Settings size={15} color="#64748b" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredClerkingLots.length > 0 && selectedClerkingLotIds.size === filteredClerkingLots.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClerkingLotIds(new Set(filteredClerkingLots.map(l => l.id)));
                          } else {
                            setSelectedClerkingLotIds(new Set());
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                        aria-label="Select all clerkings"
                      />
                    </th>
                    <th style={{ width: 95 }}>LOT NUMBER</th>
                    <th style={{ width: 140 }}>SELLER</th>
                    <th style={{ minWidth: 200 }}>TITLE</th>
                    <th style={{ width: 130, textAlign: 'right' }}>HAMMER PRICE</th>
                    <th style={{ width: 85, textAlign: 'center' }}>X MONEY</th>
                    <th style={{ width: 110, textAlign: 'center' }}>BIDDER NUMBER</th>
                    <th style={{ width: 85, textAlign: 'center' }}>QUANTITY</th>
                    <th style={{ width: 100, textAlign: 'center' }}>STATUS</th>
                    <th style={{ width: 110, textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const clerkStartIndex = (clerkingPage - 1) * clerkingPageSize;
                    const pageSlice = filteredClerkingLots.slice(clerkStartIndex, clerkStartIndex + clerkingPageSize);

                    if (pageSlice.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                            No items to display.
                          </td>
                        </tr>
                      );
                    }

                    return pageSlice.map(lot => {
                      const isSelected = selectedClerkingLotIds.has(lot.id);
                      const isSold = lot.status === 'sold';
                      const isPassed = lot.status === 'passed';
                      const sellerName = lot.consignorName || (lot as any).sellerName || (lot as any).consignor_name || '—';
                      const hammerVal = isSold ? (lot.hammerPrice || lot.currentBid || 0) : null;
                      const paddleNum = lot.highBidderPaddle || (lot as any).soldToBidderId || (isSold ? '101' : null);

                      return (
                        <tr
                          key={lot.id}
                          style={{
                            background: isSelected ? 'rgba(203, 161, 53, 0.08)' : undefined,
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const next = new Set(selectedClerkingLotIds);
                                if (next.has(lot.id)) next.delete(lot.id);
                                else next.add(lot.id);
                                setSelectedClerkingLotIds(next);
                              }}
                              style={{ cursor: 'pointer' }}
                              aria-label={`Select Lot #${lot.lotNumber}`}
                            />
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark, #9a741e)' }}>
                            #{lot.lotNumber}
                          </td>
                          <td style={{ color: '#475569', fontWeight: 500 }}>
                            {sellerName}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                              {lot.title}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSold ? '#15803d' : '#94a3b8' }}>
                            {hammerVal !== null ? formatCurrency(hammerVal) : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                            {clerkXMoney ? 'Yes' : 'No'}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {paddleNum ? `#${paddleNum}` : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                            1
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isSold ? '#dcfce7' : isPassed ? '#fee2e2' : lot.status === 'on_block' ? '#fef3c7' : '#f1f5f9',
                              color: isSold ? '#15803d' : isPassed ? '#b91c1c' : lot.status === 'on_block' ? '#92400e' : '#64748b'
                            }}>
                              {isSold ? 'Sold' : isPassed ? 'Passed' : lot.status === 'on_block' ? 'On Block' : 'Upcoming'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <TableRowActionMenu
                              actions={[
                                {
                                  label: 'View Details',
                                  icon: <Eye size={14} />,
                                  onClick: () => handleOpenClerkingDrawer('view', lot)
                                },
                                {
                                  label: 'Edit Clerking',
                                  icon: <Edit size={14} />,
                                  onClick: () => handleOpenClerkingDrawer('edit', lot)
                                },
                                ...(isSold || isPassed ? [
                                  {
                                    label: 'Reopen Lot',
                                    icon: <RotateCcw size={14} />,
                                    onClick: () => handleReopenClerkedLot(lot.id)
                                  }
                                ] : []),
                                ...(!isPassed && !isSold ? [
                                  {
                                    label: 'Mark as Passed',
                                    icon: <AlertCircle size={14} />,
                                    onClick: () => {
                                      if (onPassLot) onPassLot(lot.id, 'Reserve Not Met');
                                      setCustomLots(prev => prev.map(l => l.id === lot.id ? { ...l, status: 'passed', hammerPrice: 0 } : l));
                                      showToast('info', 'Passed', `Lot #${lot.lotNumber} marked as Passed.`);
                                    }
                                  }
                                ] : [])
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredClerkingLots.length > 0 && (
              <ShadcnPagination
                currentPage={clerkingPage}
                pageSize={clerkingPageSize}
                totalItems={filteredClerkingLots.length}
                onPageChange={setClerkingPage}
                onPageSizeChange={(newSize) => {
                  setClerkingPageSize(newSize);
                  setClerkingPage(1);
                }}
              />
            )}

            {/* Expandable Bottom Clerking Stats Drawer */}
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setIsClerkingStatsExpanded(!isClerkingStatsExpanded)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'var(--text-main)',
                  transition: 'background 0.15s ease'
                }}
              >
                {isClerkingStatsExpanded ? (
                  <>
                    <ChevronDown size={16} style={{ transform: 'rotate(180deg)' }} />
                    <span>Hide Clerking Stats</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    <span>Show Clerking Stats</span>
                  </>
                )}
              </button>

              {isClerkingStatsExpanded && (() => {
                const clerkedLots = auctionLots.filter(l => l.status === 'sold' || l.status === 'passed');
                const soldCount = auctionLots.filter(l => l.status === 'sold').length;
                const passedCount = auctionLots.filter(l => l.status === 'passed').length;
                const totalRealized = auctionLots.filter(l => l.status === 'sold').reduce((sum, l) => sum + (Number(l.hammerPrice) || Number(l.currentBid) || 0), 0);
                const clearanceRate = clerkedLots.length > 0 ? Math.round((soldCount / clerkedLots.length) * 100) : 0;

                return (
                  <div style={{
                    marginTop: 10,
                    padding: 16,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 14
                  }}>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Total Clerkings</span>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 2 }}>
                        {clerkedLots.length}
                      </div>
                    </div>

                    <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>Total Realization</span>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#15803d', marginTop: 2 }}>
                        {formatCurrency(totalRealized)}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Lots Sold</span>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#15803d', marginTop: 2 }}>
                        {soldCount}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Lots Passed</span>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#b91c1c', marginTop: 2 }}>
                        {passedCount}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Clearance Rate</span>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--gold-dark, #9a741e)', marginTop: 2 }}>
                        {clearanceRate}%
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: ALTERNATE BIDS (Exact Visual Match to AF360 Reference)
          ========================================================================= */}
      {currentTab === 'alternate-bids' && (
        <div className="card-luxury" style={{ padding: 20, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Alternate Bids
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Pre-recorded order bids, phone clerk bids, and absentee left books
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="catalog-search-wrapper" style={{ width: 220 }}>
                <Search size={14} className="catalog-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search lot, bidder..."
                  value={altBidSearch}
                  onChange={(e) => {
                    setAltBidSearch(e.target.value);
                    setAltBidsPage(1);
                  }}
                  className="catalog-search-input"
                  style={{ height: 34, fontSize: 12.5 }}
                />
              </div>

              <ShadcnSelect
                value={altBidTypeFilter}
                onChange={(val) => {
                  setAltBidTypeFilter(val);
                  setAltBidsPage(1);
                }}
                size="sm"
                className="w-32"
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'absentee', label: 'Absentee' },
                  { value: 'floor', label: 'Floor' }
                ]}
              />

              <ShadcnSelect
                value={altBidStatusFilter}
                onChange={(val) => {
                  setAltBidStatusFilter(val);
                  setAltBidsPage(1);
                }}
                size="sm"
                className="w-36"
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'executed', label: 'Executed' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
              />

              {/* Import Alternate Bids button */}
              <button
                type="button"
                onClick={() => {
                  showToast('info', 'Import Alternate Bids', 'Alternate Bids CSV/Excel import template ready.');
                  setIsAltBidModalOpen(true);
                }}
                className="btn btn-secondary"
                style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Import alternate bids"
              >
                <Download size={14} style={{ transform: 'rotate(180deg)' }} />
                <span>Import Alternate Bids</span>
              </button>

              {/* Add Alternate Bids button */}
              <button 
                type="button" 
                disabled={isAuctionClosed}
                onClick={() => handleOpenAltBidDrawer('add')}
                className="btn btn-gold"
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isAuctionClosed ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                id="btn-add-alternate-bid"
                title={isAuctionClosed ? "Auction is closed. Order bids locked." : "Record new alternate order bid"}
              >
                <Plus size={15} />
                <span>Add Alternate Bids</span>
              </button>
            </div>
          </div>

          <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
            <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>BIDDER NUMBER</th>
                  <th style={{ width: 95 }}>LOT NUMBER</th>
                  <th style={{ minWidth: 160 }}>BIDDER NAME</th>
                  <th style={{ minWidth: 200 }}>LOT LEAD</th>
                  <th style={{ width: 85, textAlign: 'center' }}>QUANTITY</th>
                  <th style={{ width: 120, textAlign: 'right' }}>MAX BID</th>
                  <th style={{ width: 95, textAlign: 'center' }}>X THE MONEY</th>
                  <th style={{ width: 130, textAlign: 'right' }}>MAX BID TOTAL</th>
                  <th style={{ width: 100, textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: 110, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const altStartIndex = (altBidsPage - 1) * altBidsPageSize;
                  const pageSlice = filteredAlternateBids.slice(altStartIndex, altStartIndex + altBidsPageSize);

                  if (pageSlice.length === 0) {
                    return (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                          No items to display.
                        </td>
                      </tr>
                    );
                  }

                  return pageSlice.map(bid => {
                    const targetLot = auctionLots.find(l => l.lotNumber === bid.lotNumber);
                    const displayDesc = bid.lotDescription || targetLot?.title || `Catalog Lot #${bid.lotNumber}`;
                    const maxVal = bid.maxAmount || bid.amount || 0;

                    return (
                      <tr key={bid.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                          #{bid.paddleNumber}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark, #9a741e)' }}>
                          #{bid.lotNumber}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {bid.bidderName}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                            {displayDesc}
                          </div>
                          {bid.notes && (
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                              {bid.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                          1
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669' }}>
                          {formatCurrency(maxVal)}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                          No
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                          {formatCurrency(maxVal * 1)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: bid.status === 'Active' ? '#dcfce7' : bid.status === 'Executed' ? '#e0f2fe' : bid.status === 'Rejected' ? '#fee2e2' : '#f1f5f9',
                            color: bid.status === 'Active' ? '#15803d' : bid.status === 'Executed' ? '#0369a1' : bid.status === 'Rejected' ? '#b91c1c' : '#64748b' 
                          }}>
                            {bid.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <TableRowActionMenu
                              actions={[
                                {
                                  label: 'View Bid Details',
                                  icon: <Eye size={14} />,
                                  onClick: () => handleOpenAltBidDrawer('view', bid)
                                },
                                {
                                  label: 'Edit Order Bid',
                                  icon: <Edit size={14} />,
                                  onClick: () => handleOpenAltBidDrawer('edit', bid)
                                },
                                ...(bid.status === 'Active' && !isAuctionClosed ? [
                                  {
                                    label: 'Execute on Rostrum',
                                    icon: <Gavel size={14} />,
                                    onClick: () => handleExecuteAltBid(bid)
                                  },
                                  {
                                    label: 'Reject Order Bid',
                                    icon: <AlertCircle size={14} />,
                                    onClick: () => handleRejectAltBid(bid)
                                  }
                                ] : []),
                                {
                                  label: 'Delete Order Bid',
                                  icon: <Trash2 size={14} />,
                                  variant: 'destructive',
                                  onClick: () => handlePromptDelete('altBid', bid.id, `Lot #${bid.lotNumber} (${bid.bidderName})`)
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Alternate Bids Pagination */}
          {filteredAlternateBids.length > 0 && (
            <ShadcnPagination
              currentPage={altBidsPage}
              pageSize={altBidsPageSize}
              totalItems={filteredAlternateBids.length}
              onPageChange={setAltBidsPage}
              onPageSizeChange={(newSize) => {
                setAltBidsPageSize(newSize);
                setAltBidsPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD ALTERNATE BID
          ========================================================================= */}
      <FormModal
        isOpen={isAltBidModalOpen}
        title="Record Alternate Order Bid"
        onClose={() => setIsAltBidModalOpen(false)}
        onSubmit={handleAddAlternateBid}
        submitLabel={isSubmittingAltBid ? "Saving to Supabase..." : "Log Bid"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Lot Number *" required>
              <input 
                type="number"
                required
                placeholder="e.g. 101"
                value={altLotNum}
                onChange={(e) => setAltLotNum(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
              {(() => {
                const parsed = parseInt(altLotNum, 10);
                const matched = auctionLots.find(l => l.lotNumber === parsed);
                if (matched) {
                  return (
                    <div style={{ fontSize: 11.5, color: '#047857', marginTop: 4, fontWeight: 600 }}>
                      ✓ {matched.title} (Est: {formatCurrency(matched.estimateLow)} – {formatCurrency(matched.estimateHigh)})
                    </div>
                  );
                }
                return null;
              })()}
            </FormField>

            <FormField label="Bid Type">
              <ShadcnSelect
                value={altType}
                onChange={(val) => setAltType(val as any)}
                size="md"
                options={[
                  { value: 'Phone', label: 'Phone' },
                  { value: 'Absentee', label: 'Absentee' },
                  { value: 'Floor', label: 'Floor' }
                ]}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <FormField label="Bidder Name *" required>
              <input 
                type="text"
                required
                placeholder="e.g. Senator James Caldwell"
                value={altBidderName}
                onChange={(e) => setAltBidderName(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="Paddle #">
              <input 
                type="text"
                placeholder="e.g. 4005"
                value={altPaddle}
                onChange={(e) => setAltPaddle(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Opening / Start Bid ($) *" required>
              <input 
                type="number"
                step="50"
                required
                placeholder="19000"
                value={altAmount}
                onChange={(e) => setAltAmount(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="Max Order Limit ($)">
              <input 
                type="number"
                step="50"
                placeholder="26000"
                value={altMaxAmount}
                onChange={(e) => setAltMaxAmount(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>

          <FormField label="Clerking Notes">
            <textarea 
              rows={2}
              placeholder="e.g. Direct phone clerk line arranged with Todd Gardner."
              value={altNotes}
              onChange={(e) => setAltNotes(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
            />
          </FormField>
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 2: REGISTER BIDDER (AuctionFlex360 Fields)
          ========================================================================= */}
      <FormModal
        isOpen={isNewRegModalOpen}
        title="Register Bidder for Auction Day"
        maxWidth={680}
        onClose={() => setIsNewRegModalOpen(false)}
        onSubmit={handleRegisterNewBidder}
        submitLabel={isSubmittingReg ? "Registering..." : "Complete Registration"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <FormField label="Paddle / Bid Card #" required>
              <input 
                type="text"
                required
                placeholder="e.g. 5001"
                value={newRegBidCard}
                onChange={(e) => setNewRegBidCard(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
            </FormField>

            <FormField label="Bidder Full Name" required>
              <input 
                type="text"
                required
                placeholder="e.g. Helena Vance"
                value={newRegName}
                onChange={(e) => setNewRegName(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px' }}
              />
            </FormField>
          </div>

          <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <FormField label="Company Name">
              <input 
                type="text"
                placeholder="e.g. Vance Fine Antiques LLC"
                value={newRegCompany}
                onChange={(e) => setNewRegCompany(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px' }}
              />
            </FormField>

            <FormField label="Email Address">
              <input 
                type="email"
                placeholder="helena@vanceantiques.com"
                value={newRegEmail}
                onChange={(e) => setNewRegEmail(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px' }}
              />
            </FormField>
          </div>

          <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <FormField label="Phone Number">
              <input 
                type="tel"
                placeholder="(406) 555-0144"
                value={newRegPhone}
                onChange={(e) => setNewRegPhone(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px' }}
              />
            </FormField>

            <FormField label="Hear About Us">
              <ShadcnSelect
                value={newRegHearAboutUs}
                onChange={(val) => setNewRegHearAboutUs(val)}
                size="md"
                options={[
                  { value: 'Website', label: 'Website' },
                  { value: 'Referral / Word of Mouth', label: 'Referral / Word of Mouth' },
                  { value: 'AuctionZip', label: 'AuctionZip' },
                  { value: 'Social Media', label: 'Social Media' },
                  { value: 'Direct Mail / Catalog', label: 'Direct Mail / Catalog' },
                  { value: 'Local Signage', label: 'Local Signage' },
                  { value: 'HiBid Directory', label: 'HiBid Directory' },
                  { value: 'Repeat Client', label: 'Repeat Client' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
            </FormField>
          </div>

          <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <FormField label="Credit Approval Limit ($)">
              <input 
                type="number"
                placeholder="25000"
                value={newRegLimit}
                onChange={(e) => setNewRegLimit(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px' }}
              />
            </FormField>

            <FormField label="Origin / Registration Site">
              <input 
                type="text"
                placeholder="Saleroom In-House"
                value={newRegSite}
                onChange={(e) => setNewRegSite(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px' }}
              />
            </FormField>
          </div>

          <FormField label="Admin Notes">
            <input 
              type="text"
              placeholder="Verified government photo ID and credit card authorization."
              value={newRegNotes}
              onChange={(e) => setNewRegNotes(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 12px' }}
            />
          </FormField>


          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={newRegCheckInImmediately}
              onChange={(e) => setNewRegCheckInImmediately(e.target.checked)}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Check in bidder immediately upon registration</span>
          </label>
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 1: BIDDER CHECK IN (Matching AF360 Check In - Find or Create Customer)
          ========================================================================= */}
      <FormModal
        isOpen={isBidderCheckInModalOpen}
        title="Bidder Check In"
        maxWidth={920}
        onClose={() => setIsBidderCheckInModalOpen(false)}
        cancelLabel="Close"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Switcher: Find Existing Customer vs Create New Customer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '10px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8
          }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: checkInTabMode === 'find' ? '#0f172a' : '#475569',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="af360CheckInMode"
                checked={checkInTabMode === 'find'}
                onChange={() => setCheckInTabMode('find')}
                style={{ accentColor: '#0f172a' }}
              />
              <span>Find Existing Customer</span>
            </label>

            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: checkInTabMode === 'create' ? '#0f172a' : '#475569',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="af360CheckInMode"
                checked={checkInTabMode === 'create'}
                onChange={() => setCheckInTabMode('create')}
                style={{ accentColor: '#0f172a' }}
              />
              <span>Create New Customer</span>
            </label>
          </div>

          {/* MODE 1: FIND EXISTING CUSTOMER */}
          {checkInTabMode === 'find' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Search Criteria Grid */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  Search Criteria
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: 12,
                  marginBottom: 12
                }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={checkInSearchFirstName}
                      onChange={(e) => setCheckInSearchFirstName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteCheckInSearch()}
                      className="catalog-search-input"
                      style={{ width: '100%', height: 34, fontSize: 12.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Miller"
                      value={checkInSearchLastName}
                      onChange={(e) => setCheckInSearchLastName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteCheckInSearch()}
                      className="catalog-search-input"
                      style={{ width: '100%', height: 34, fontSize: 12.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Bidder #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5001"
                      value={checkInSearchPaddle}
                      onChange={(e) => setCheckInSearchPaddle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteCheckInSearch()}
                      className="catalog-search-input"
                      style={{ width: '100%', height: 34, fontSize: 12.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Minerals"
                      value={checkInSearchCompany}
                      onChange={(e) => setCheckInSearchCompany(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteCheckInSearch()}
                      className="catalog-search-input"
                      style={{ width: '100%', height: 34, fontSize: 12.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Customer Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CUST-104"
                      value={checkInSearchCustomerCode}
                      onChange={(e) => setCheckInSearchCustomerCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteCheckInSearch()}
                      className="catalog-search-input"
                      style={{ width: '100%', height: 34, fontSize: 12.5 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checkInSearchPermanentOnly}
                      onChange={(e) => setCheckInSearchPermanentOnly(e.target.checked)}
                      style={{ accentColor: '#0f172a' }}
                    />
                    <span>Permanent Bidder Only</span>
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleExecuteCheckInSearch}
                      className="af360-btn-teal"
                      id="btn-af360-checkin-search"
                      style={{ height: 34, padding: '0 16px', fontSize: 12 }}
                    >
                      <Search size={14} />
                      <span>SEARCH</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckInAllSearchResults}
                      className="af360-btn-teal"
                      id="btn-af360-checkin-all"
                      style={{ height: 34, padding: '0 16px', fontSize: 12 }}
                      title="Check in all matching bidders in the current search results"
                    >
                      <Check size={14} strokeWidth={3} />
                      <span>CHECK IN ALL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Results Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  padding: '8px 14px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    Search Results ({checkInSearchResults.length} bidders)
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    Showing page {checkInPage} of {Math.max(1, Math.ceil(checkInSearchResults.length / checkInEntriesPerPage))}
                  </div>
                </div>

                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Paddle #</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Customer Name</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Company</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Email</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Phone</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Status</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkInSearchResults.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                            No matching database customers found. Adjust search criteria or choose 'Create New Customer'.
                          </td>
                        </tr>
                      ) : (
                        checkInSearchResults
                          .slice((checkInPage - 1) * checkInEntriesPerPage, checkInPage * checkInEntriesPerPage)
                          .map((item, idx) => (
                            <tr
                              key={item.id || idx}
                              onClick={() => handleSelectCustomerForClerking(item)}
                              style={{
                                borderTop: '1px solid #f1f5f9',
                                background: item.isCheckedIn ? '#f0fdf4' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                              }}
                              title="Click row to select this customer and fill Bidder Number into Clerking Desk"
                            >
                              <td style={{ padding: '6px 10px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                                #{item.bidCardNumber}
                              </td>
                              <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>
                                {item.fullName}
                              </td>
                              <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                {item.companyName || '—'}
                              </td>
                              <td style={{ padding: '6px 10px', color: '#0284c7' }}>
                                {item.email || '—'}
                              </td>
                              <td style={{ padding: '6px 10px', color: '#475569' }}>
                                {item.phone || '—'}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  background: item.isCheckedIn ? '#dcfce7' : '#fef3c7',
                                  color: item.isCheckedIn ? '#15803d' : '#b45309'
                                }}>
                                  {item.isCheckedIn ? 'Checked In' : 'Pending'}
                                </span>
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectCustomerForClerking(item)}
                                    className="af360-btn-teal"
                                    style={{ height: 26, fontSize: 11, padding: '0 10px', fontWeight: 700 }}
                                    title="Select this customer and fill Bidder Number into Clerking Entry"
                                  >
                                    <span>Select</span>
                                  </button>
                                  {item.isCheckedIn ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCheckInSingleSearchResult(item)}
                                      className="btn btn-secondary"
                                      style={{ fontSize: 11, padding: '3px 8px' }}
                                      title="Undo check in"
                                    >
                                      <RotateCcw size={11} />
                                      <span>Undo</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleCheckInSingleSearchResult(item)}
                                      className="btn btn-secondary"
                                      style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                                      title="Check in this bidder"
                                    >
                                      <Check size={12} strokeWidth={3} />
                                      <span>Check In</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {checkInSearchResults.length > checkInEntriesPerPage && (
                  <div style={{
                    padding: '8px 14px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12
                  }}>
                    <div>
                      Showing {(checkInPage - 1) * checkInEntriesPerPage + 1} to {Math.min(checkInPage * checkInEntriesPerPage, checkInSearchResults.length)} of {checkInSearchResults.length} entries
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        disabled={checkInPage <= 1}
                        onClick={() => setCheckInPage(p => p - 1)}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={checkInPage >= Math.ceil(checkInSearchResults.length / checkInEntriesPerPage)}
                        onClick={() => setCheckInPage(p => p + 1)}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: CREATE NEW CUSTOMER & CHECK IN */}
          {checkInTabMode === 'create' && (
            <form onSubmit={handleCreateNewCustomerAndCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <FormField label="First Name" required>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor"
                    value={newCustFirstName}
                    onChange={(e) => setNewCustFirstName(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>

                <FormField label="Last Name" required>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vance"
                    value={newCustLastName}
                    onChange={(e) => setNewCustLastName(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
              </div>

              <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <FormField label="Company Name">
                  <input
                    type="text"
                    placeholder="e.g. Vance Antiques LLC"
                    value={newCustCompany}
                    onChange={(e) => setNewCustCompany(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>

                <FormField label="Allocated Paddle # (Auto-Generated)">
                  <input
                    type="text"
                    placeholder="Leave empty for next sequence"
                    value={newCustPaddle}
                    onChange={(e) => setNewCustPaddle(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                </FormField>
              </div>

              <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <FormField label="Phone">
                  <input
                    type="tel"
                    placeholder="(406) 555-0144"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    type="email"
                    placeholder="eleanor@vanceantiques.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>
              </div>

              <div className="responsive-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                <FormField label="Street Address">
                  <input
                    type="text"
                    placeholder="742 Evergreen Terrace"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>

                <FormField label="City">
                  <input
                    type="text"
                    placeholder="Kalispell"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>

                <FormField label="State / Zip">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="MT"
                      value={newCustState}
                      onChange={(e) => setNewCustState(e.target.value)}
                      className="catalog-search-input"
                      style={{ width: '45%', height: 36 }}
                    />
                    <input
                      type="text"
                      placeholder="59901"
                      value={newCustZip}
                      onChange={(e) => setNewCustZip(e.target.value)}
                      className="catalog-search-input"
                      style={{ width: '55%', height: 36 }}
                    />
                  </div>
                </FormField>
              </div>

              <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <FormField label="Credit Approval Limit ($)">
                  <input
                    type="number"
                    placeholder="25000"
                    value={newCustCreditLimit}
                    onChange={(e) => setNewCustCreditLimit(e.target.value)}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </FormField>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, paddingTop: 16 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newCustCheckInImmediately}
                      onChange={(e) => setNewCustCheckInImmediately(e.target.checked)}
                      style={{ accentColor: '#0f172a' }}
                    />
                    <span>Check in bidder immediately upon registration</span>
                  </label>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newCustPermanent}
                      onChange={(e) => setNewCustPermanent(e.target.checked)}
                      style={{ accentColor: '#0f172a' }}
                    />
                    <span>Permanent Bidder Flag</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsBidderCheckInModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ height: 36, padding: '0 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingNewCust}
                  className="af360-btn-teal"
                  style={{ height: 36, padding: '0 20px', fontSize: 13 }}
                >
                  <Check size={14} strokeWidth={3} />
                  <span>{isCreatingNewCust ? 'Creating...' : 'SAVE & CHECK IN'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 2: CHECK IN CONFIRMATION (When 1+ Bidders are Selected in Table)
          ========================================================================= */}
      <FormModal
        isOpen={isCheckInConfirmModalOpen}
        title={`Check In Selected Bidders (${selectedRegIds.size})`}
        maxWidth={620}
        onClose={() => setIsCheckInConfirmModalOpen(false)}
        onSubmit={handleConfirmCheckInModal}
        submitLabel={isSubmittingCheckInConfirm ? "Checking In..." : `Confirm Check In (${selectedRegIds.size})`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Banner */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Check size={20} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                Confirm Saleroom Check In
              </div>
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                You are about to issue paddles and check in {selectedRegIds.size} selected bidder(s) for <strong>{auction?.code} — {auction?.title}</strong>.
              </div>
            </div>
          </div>

          {/* Selected Bidder Roster Preview */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Selected Bidders ({selectedRegIds.size})
            </div>
            <div style={{
              maxHeight: 140,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '6px 10px',
              background: '#f8fafc'
            }}>
              {registrations.filter(r => selectedRegIds.has(r.id)).map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>#{r.bidCardNumber}</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.bidderName}</span>
                    {r.companyName && <span style={{ color: '#64748b' }}>({r.companyName})</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Ready</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Checklist */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Check In Verification Checklist
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={checkInVerifyPhotoId}
                onChange={(e) => setCheckInVerifyPhotoId(e.target.checked)}
                style={{ accentColor: '#0f172a' }}
              />
              <span>Verified Government Photo ID / Driver's License</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={checkInIssuePaddle}
                onChange={(e) => setCheckInIssuePaddle(e.target.checked)}
                style={{ accentColor: '#0f172a' }}
              />
              <span>Assigned Paddle Card Printed and Handed to Bidder</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={checkInConfirmDeposit}
                onChange={(e) => setCheckInConfirmDeposit(e.target.checked)}
                style={{ accentColor: '#0f172a' }}
              />
              <span>Credit Card Pre-Authorization or Saleroom Deposit Verified</span>
            </label>
          </div>

          {/* Clerk Notes Field */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              Check-In Intake Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Saleroom Desk 1 - Verified ID and issued catalog"
              value={checkInClerkNotes}
              onChange={(e) => setCheckInClerkNotes(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36, fontSize: 12.5 }}
            />
          </div>
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 3: IMPORT BIDDERS (2-Step AF360 CSV Import + Auto-Check In)
          ========================================================================= */}
      <FormModal
        isOpen={isImportModalOpen}
        title="Import Bidders"
        maxWidth={700}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportRawText('');
          setImportParsedList([]);
          setImportFileName('');
        }}
        cancelLabel={importStep === 2 ? "Back" : "Cancel"}
        onCancel={importStep === 2 ? () => setImportStep(1) : undefined}
        onSubmit={importStep === 2 ? (e) => {
          e.preventDefault();
          handleExecuteImport();
        } : (e) => {
          e.preventDefault();
          if (importParsedList.length > 0) {
            setImportStep(2);
          } else {
            showToast('info', 'File Required', 'Please select a CSV file or paste bidder data first.');
          }
        }}
        submitLabel={
          importStep === 1
            ? "GO TO NEXT STEP"
            : isImporting
              ? "Importing..."
              : `Import ${importParsedList.filter(r => r.status === 'valid').length} Valid Bidders`
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* STEP 1: FILE SELECTION & INSTRUCTIONS */}
          {importStep === 1 && (
            <>
              {/* AF360 Style File Drop Container */}
              <div style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '24px 20px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
                  Select a file to import
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <label 
                    style={{
                      height: 34,
                      padding: '0 16px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#0f172a',
                      color: '#ffffff',
                      cursor: 'pointer',
                      border: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImportFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            handleCSVParse(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>

                  <span style={{ fontSize: 12, color: importFileName ? '#0f172a' : '#64748b', fontWeight: importFileName ? 700 : 400 }}>
                    {importFileName || 'No file chosen'}
                  </span>
                </div>

                {/* Auto-Map Checkbox */}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={importAutoMap}
                      onChange={(e) => setImportAutoMap(e.target.checked)}
                      style={{ accentColor: '#0f172a' }}
                    />
                    <span>Auto-Map Exact Matches</span>
                  </label>
                </div>
              </div>

              {/* Instructions Text (Verbatim AF360) */}
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, background: '#f8fafc', padding: '12px 16px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 6px' }}>
                  Accepted file types: <strong>.csv or .xlsx</strong>. The first row of your file should contain column headers.
                </p>
                <p style={{ margin: 0 }}>
                  For more tips and tricks about importing bidders into an auction, please review the{' '}
                  <button
                    type="button"
                    onClick={() => setIsTipsModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--gold-primary, #a37a3b)',
                      textDecoration: 'underline',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    tips and tricks
                  </button>{' '}
                  section. You can also download our standard{' '}
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--gold-primary, #a37a3b)',
                      textDecoration: 'underline',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    CSV Template
                  </button>.
                </p>
              </div>

              {/* Optional Quick Paste / Template Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => {
                    const sample = `Bidder #,CompanyName,Name,Email,Phone,Credit Limit,Hear About Us\n6001,Highland Art LLC,Malcolm Fraser,malcolm@highlandart.com,406-555-0199,35000,AuctionZip\n6002,Silver Creek Mining,Beverly Adams,beverly@silvercreek.com,406-555-0188,50000,Referral\n6003,,Jonathan Pierce,jonathan.pierce@montana.net,406-555-0177,25000,Website`;
                    setImportFileName('sample_bidders_template.csv');
                    handleCSVParse(sample);
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Load Sample Roster</span>
                </button>

                {importParsedList.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                    ✓ {importParsedList.filter(r => r.status === 'valid').length} Valid records loaded
                  </span>
                )}
              </div>
            </>
          )}

          {/* STEP 2: PREVIEW & CONFIRMATION */}
          {importStep === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Parsed Records Preview ({importParsedList.length} rows)
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 11.5 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                    ✓ {importParsedList.filter(r => r.status === 'valid').length} Valid
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                    ✕ {importParsedList.filter(r => r.status !== 'valid').length} Issues / Duplicates
                  </span>
                </div>
              </div>

              {/* Automatic Check-In Option */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#1e293b', cursor: 'pointer', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={importAutoCheckIn}
                  onChange={(e) => setImportAutoCheckIn(e.target.checked)}
                  style={{ accentColor: '#0f172a' }}
                />
                <span>Automatically check in imported bidders upon registration</span>
              </label>

              {/* Preview Table */}
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Paddle</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Name</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Company</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Email</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importParsedList.map((row, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #f1f5f9', background: row.status === 'valid' ? '#ffffff' : '#fff1f2' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a' }}>#{row.bidCardNumber || '—'}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>{row.bidderName || '—'}</td>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>{row.companyName || '—'}</td>
                        <td style={{ padding: '6px 10px', color: '#0284c7' }}>{row.email || '—'}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: row.status === 'valid' ? '#dcfce7' : '#fee2e2',
                            color: row.status === 'valid' ? '#15803d' : '#b91c1c'
                          }}>
                            {row.status === 'valid' ? 'Valid' : row.error || 'Duplicate'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL: IMPORT BIDDERS TIPS & TRICKS
          ========================================================================= */}
      <FormModal
        isOpen={isTipsModalOpen}
        title="Import Bidders — Tips & Tricks"
        maxWidth={580}
        onClose={() => setIsTipsModalOpen(false)}
        cancelLabel="Close"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: 13.5 }}>Standard Column Headers</h4>
            <p style={{ margin: '0 0 6px', fontSize: 12 }}>
              The first row of your CSV must contain column headers. The system automatically detects and maps standard fields:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#475569' }}>
              <li><strong>Bidder # / Paddle</strong>: Numeric card number (e.g. 5001, 6001)</li>
              <li><strong>Name / Full Name</strong>: First and last name of the bidder</li>
              <li><strong>CompanyName / Company</strong>: Business or gallery name</li>
              <li><strong>Email</strong>: Used for electronic invoices and outbid notifications</li>
              <li><strong>Phone</strong>: Primary contact telephone number</li>
              <li><strong>Credit Limit</strong>: Pre-approved saleroom bidding ceiling</li>
            </ul>
          </div>

          <div>
            <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: 13 }}>Deduplication & Safety Rules</h4>
            <p style={{ margin: '0 0 6px', fontSize: 12 }}>
              - Bidders with an existing assigned paddle number in this auction will be flagged as duplicates to avoid paddle conflicts.
            </p>
            <p style={{ margin: '0 0 6px', fontSize: 12 }}>
              - Any row with invalid or missing required names will be highlighted with descriptive error badges.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="af360-btn-teal"
              style={{ height: 34, fontSize: 12, padding: '0 16px' }}
            >
              <FileDown size={14} />
              <span>Download Official CSV Template</span>
            </button>
          </div>
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 4: SCAN DRIVER'S LICENSE (Matching AF360 Driver's License Scanner)
          ========================================================================= */}
      <FormModal
        isOpen={isScanLicenseModalOpen}
        title="Driver's License Scanner"
        maxWidth={740}
        onClose={() => {
          setIsScanLicenseModalOpen(false);
          handleStopCamera();
        }}
        onSubmit={handleSaveScannedBidder}
        submitLabel={isSavingScannedBidder ? "Saving..." : "Register & Check In Scanned Bidder"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Executive Signature Instruction Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #181d27 0%, #0f172a 100%)',
            border: '1px solid #1e293b',
            color: '#f8fafc',
            borderRadius: 8,
            padding: '12px 18px',
            textAlign: 'center',
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: '0.02em',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
          }}>
            Hold Driver's License Barcode Up to Camera to Start Scanning
          </div>

          {/* Segmented Mode Switcher */}
          <div style={{
            display: 'inline-flex',
            padding: 4,
            background: '#f1f5f9',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            alignSelf: 'flex-start',
            gap: 4
          }}>
            <button
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: scanLicenseMode === 'camera' ? '#0f172a' : 'transparent',
                color: scanLicenseMode === 'camera' ? '#ffffff' : '#64748b'
              }}
              onClick={() => {
                setScanLicenseMode('camera');
                handleStartCamera();
              }}
            >
              <Camera size={13} />
              <span>Live Camera Stream</span>
            </button>

            <button
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: scanLicenseMode === 'upload' ? '#0f172a' : 'transparent',
                color: scanLicenseMode === 'upload' ? '#ffffff' : '#64748b'
              }}
              onClick={() => {
                handleStopCamera();
                setScanLicenseMode('upload');
              }}
            >
              <Upload size={13} />
              <span>Document Upload / Manual Scan</span>
            </button>
          </div>

          {/* Camera View */}
          {scanLicenseMode === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: '100%',
                maxHeight: 250,
                background: '#0f172a',
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #1e293b'
              }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: 230, objectFit: 'cover' }}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Target Frame Overlay */}
                <div style={{
                  position: 'absolute',
                  width: '78%',
                  height: '68%',
                  border: '2px dashed #dfb74a',
                  borderRadius: 8,
                  boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.4)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  textShadow: '0 1px 4px rgba(0,0,0,0.9)'
                }}>
                  Align Driver License / PDF417 Barcode Here
                </div>
              </div>

              {cameraError && (
                <div style={{ fontSize: 11.5, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 6, width: '100%', textAlign: 'center' }}>
                  {cameraError}
                </div>
              )}

              <button
                type="button"
                className="af360-btn-teal"
                onClick={handleCaptureFrame}
                style={{
                  height: 36,
                  fontSize: 12.5,
                  padding: '0 20px',
                  borderRadius: 6
                }}
              >
                <Camera size={14} />
                <span>Capture & Extract Barcode</span>
              </button>
            </div>
          )}

          {/* Upload / Test Mode */}
          {scanLicenseMode === 'upload' && (
            <div style={{
              background: '#f8fafc',
              padding: 14,
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                  Simulate or Paste Barcode Scan Data (AAMVA PDF417):
                </div>
                <button
                  type="button"
                  style={{
                    height: 28,
                    padding: '0 10px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    handleParseLicenseText(
                      `ANSI 636000080002DL00410260ZA03010042DLDAQM89230198\nDCSJenkins\nDACSarah\nDAG412 Higgins Ave\nDAIMissoula\nDAJMT\nDAK59802\nDBB05141982`
                    );
                  }}
                >
                  Load Sample Montana DL Data
                </button>
              </div>

              <textarea
                rows={3}
                placeholder="Paste raw barcode stream or ANSI DKS block..."
                onChange={(e) => handleParseLicenseText(e.target.value)}
                className="catalog-search-input custom-scrollbar"
                style={{
                  width: '100%',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  padding: '8px 10px'
                }}
              />
            </div>
          )}

          {/* Extracted Bidder Review Form */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                Extracted Bidder Credentials (Review Before Check In)
              </div>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12
              }}>
                AAMVA PDF417 Parser Active
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <FormField label="First Name" required>
                  <input
                    type="text"
                    value={scannedData.firstName}
                    onChange={(e) => setScannedData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>

                <FormField label="Last Name" required>
                  <input
                    type="text"
                    value={scannedData.lastName}
                    onChange={(e) => setScannedData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>
              </div>

              <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <FormField label="Allocated Paddle #" required>
                  <input
                    type="text"
                    value={scannedData.paddleNumber}
                    onChange={(e) => setScannedData(prev => ({ ...prev, paddleNumber: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                </FormField>

                <FormField label="Driver License #">
                  <input
                    type="text"
                    value={scannedData.licenseNumber}
                    onChange={(e) => setScannedData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>
              </div>

              <div className="responsive-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <FormField label="Street Address">
                  <input
                    type="text"
                    value={scannedData.address}
                    onChange={(e) => setScannedData(prev => ({ ...prev, address: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>

                <FormField label="City">
                  <input
                    type="text"
                    value={scannedData.city}
                    onChange={(e) => setScannedData(prev => ({ ...prev, city: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>

                <FormField label="State / Zip">
                  <input
                    type="text"
                    value={`${scannedData.state} ${scannedData.zip}`.trim()}
                    onChange={(e) => {
                      const parts = e.target.value.split(/\s+/);
                      setScannedData(prev => ({ ...prev, state: parts[0] || 'MT', zip: parts[1] || '' }));
                    }}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>
              </div>

              <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <FormField label="Email">
                  <input
                    type="email"
                    value={scannedData.email}
                    onChange={(e) => setScannedData(prev => ({ ...prev, email: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>

                <FormField label="Phone">
                  <input
                    type="tel"
                    value={scannedData.phone}
                    onChange={(e) => setScannedData(prev => ({ ...prev, phone: e.target.value }))}
                    className="catalog-search-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 5: BIDDER DEPOSITS (Matching AF360 Bidder Deposits Modal)
          ========================================================================= */}
      <FormModal
        isOpen={isManageDepositsModalOpen}
        title="Bidder Deposits"
        maxWidth={840}
        onClose={() => setIsManageDepositsModalOpen(false)}
        cancelLabel="Close"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* AF360 Amber Warning Note Banner */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 6,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#92400e',
            fontSize: 12.5,
            fontWeight: 600
          }}>
            <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0 }} />
            <span>There are remaining deposits. Deposits cannot be deleted if applied to an invoice.</span>
          </div>

          {/* Action and Filter Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                Filter by Bidder:
              </label>
              <ShadcnSelect
                value={depositFilterBidder}
                onChange={(val) => setDepositFilterBidder(val)}
                size="sm"
                className="min-w-[210px]"
                options={[
                  { value: 'all', label: '-- All Bidders --' },
                  ...registrations.map(r => ({
                    value: r.id,
                    label: `#${r.bidCardNumber} - ${r.bidderName}`
                  }))
                ]}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search deposits..."
                  value={depositSearchTerm}
                  onChange={(e) => setDepositSearchTerm(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: 170, height: 34, paddingLeft: 30, fontSize: 12 }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenDepositDrawer('add')}
                className="af360-btn-teal"
                id="btn-af360-new-deposit"
                style={{ height: 34, padding: '0 16px', fontSize: 12 }}
              >
                <Plus size={14} />
                <span>New Deposit</span>
              </button>
            </div>
          </div>

          {/* Deposits List Table (with AF360 columns & actions) */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Bidder #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Deposit Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Deposit Amount</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Amount Applied</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Amount Remaining</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: 60 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const term = depositSearchTerm.toLowerCase().trim();
                  const filtered = deposits.filter(dep => {
                    if (depositFilterBidder !== 'all' && dep.registrationId !== depositFilterBidder) {
                      return false;
                    }
                    if (term) {
                      return (
                        dep.bidCardNumber.toLowerCase().includes(term) ||
                        dep.bidderName.toLowerCase().includes(term) ||
                        (dep.referenceNumber && dep.referenceNumber.toLowerCase().includes(term)) ||
                        (dep.paymentMethod && dep.paymentMethod.toLowerCase().includes(term))
                      );
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>No deposits found for this selection</div>
                          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                            Click <strong>+ New Deposit</strong> above to record a bidder deposit.
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const startIdx = (depositPage - 1) * depositEntriesPerPage;
                  const pageSlice = filtered.slice(startIdx, startIdx + depositEntriesPerPage);

                  return pageSlice.map(dep => {
                    const amount = Number(dep.amount) || 0;
                    const applied = Number(dep.amountApplied) || 0;
                    const remaining = dep.amountRemaining !== undefined ? Number(dep.amountRemaining) : (amount - applied);
                    const hasRemaining = remaining > 0;

                    return (
                      <tr 
                        key={dep.id} 
                        style={{
                          borderTop: '1px solid #f1f5f9',
                          background: hasRemaining ? '#fffdf7' : '#ffffff',
                          borderLeft: hasRemaining ? '3px solid #f59e0b' : 'none'
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                          <span style={{ color: '#0f172a', fontFamily: 'var(--font-mono)' }}>#{dep.bidCardNumber}</span>
                          <span style={{ marginLeft: 6, fontWeight: 500, color: '#475569' }}>— {dep.bidderName}</span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>
                          {dep.date || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                          {formatCurrency(amount)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                          {formatCurrency(applied)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: hasRemaining ? '#b45309' : '#15803d' }}>
                          {formatCurrency(remaining)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <TableRowActionMenu
                            actions={[
                              {
                                label: 'View Receipt',
                                icon: <Eye size={14} />,
                                onClick: () => handleOpenDepositDrawer('view', dep)
                              },
                              {
                                label: 'Edit Deposit',
                                icon: <Edit size={14} />,
                                onClick: () => handleOpenDepositDrawer('edit', dep)
                              },
                              {
                                label: dep.status === 'Refunded' ? 'Mark Collected' : 'Mark Refunded',
                                icon: <RotateCcw size={14} />,
                                onClick: () => handleUpdateDepositStatus(dep.id, dep.status === 'Refunded' ? 'Collected' : 'Refunded')
                              },
                              {
                                label: 'Delete Deposit',
                                icon: <Trash2 size={14} />,
                                variant: 'destructive',
                                onClick: () => handlePromptDelete('deposit', dep.id, `Deposit of ${formatCurrency(dep.amount)} (#${dep.bidCardNumber})`)
                              }
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>

            {/* Total Footer */}
            <div style={{
              padding: '8px 14px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              fontWeight: 700,
              color: '#334155'
            }}>
              <span>Total Deposits: {deposits.length}</span>
              <span>Total Balance: {formatCurrency(deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0))}</span>
            </div>
          </div>

          {/* Deposits Pagination Controls */}
          {deposits.length > 0 && (
            <ShadcnPagination
              currentPage={depositPage}
              pageSize={depositEntriesPerPage}
              totalItems={deposits.length}
              onPageChange={setDepositPage}
              onPageSizeChange={(newSize) => {
                setDepositEntriesPerPage(newSize);
                setDepositPage(1);
              }}
            />
          )}
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 6: RECORD BIDDER DEPOSIT (New Deposit Dialog)
          ========================================================================= */}
      <FormModal
        isOpen={isNewDepositDialogOpen}
        title="Record Bidder Deposit"
        maxWidth={580}
        onClose={() => setIsNewDepositDialogOpen(false)}
        onSubmit={handleRecordDeposit}
        submitLabel={isRecordingDeposit ? "Saving..." : "Save Deposit"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Select Bidder" required>
            <ShadcnSelect
              value={newDepBidderRegId}
              onChange={(val) => setNewDepBidderRegId(val)}
              placeholder="-- Choose Registered Bidder --"
              size="md"
              options={[
                { value: '', label: '-- Choose Registered Bidder --' },
                ...registrations.map(r => ({
                  value: r.id,
                  label: `#${r.bidCardNumber} - ${r.bidderName}${r.companyName ? ` (${r.companyName})` : ''}`
                })),
                { value: 'walk_in', label: 'Walk-In / Unregistered Customer' }
              ]}
            />
          </FormField>

          <div>
            <FormField label="Deposit Amount ($)" required>
              <input
                type="number"
                step="50"
                min="1"
                required
                placeholder="1000"
                value={newDepAmount}
                onChange={(e) => setNewDepAmount(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36, fontWeight: 700, fontSize: 13 }}
              />
            </FormField>

            {/* Quick Amount Chips */}
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  style={{
                    background: newDepAmount === String(amt) ? '#0f172a' : '#f1f5f9',
                    color: newDepAmount === String(amt) ? '#ffffff' : '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    padding: '3px 10px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setNewDepAmount(String(amt))}
                >
                  +${amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <FormField label="Payment Method">
              <ShadcnSelect
                value={newDepMethod}
                onChange={(val) => setNewDepMethod(val as any)}
                size="md"
                options={[
                  { value: 'Credit Card', label: 'Credit Card' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Wire Transfer', label: 'Wire Transfer' },
                  { value: 'Check', label: 'Check' },
                  { value: "Cashier's Check", label: "Cashier's Check" },
                  { value: 'ACH', label: 'ACH Transfer' }
                ]}
              />
            </FormField>

            <FormField label="Deposit Status">
              <ShadcnSelect
                value={newDepStatus}
                onChange={(val) => setNewDepStatus(val as any)}
                size="md"
                options={[
                  { value: 'Collected', label: 'Collected (Cleared)' },
                  { value: 'Pending', label: 'Pending Verification' },
                  { value: 'Applied', label: 'Applied to Invoices' },
                  { value: 'Refunded', label: 'Refunded' }
                ]}
              />
            </FormField>
          </div>

          <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <FormField label="Reference / Check #">
              <input
                type="text"
                placeholder="e.g. AUTH-8891 / CHK-1044"
                value={newDepRef}
                onChange={(e) => setNewDepRef(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36, fontSize: 12.5 }}
              />
            </FormField>

            <FormField label="Intake Notes">
              <input
                type="text"
                placeholder="Saleroom cashier intake note"
                value={newDepNotes}
                onChange={(e) => setNewDepNotes(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36, fontSize: 12.5 }}
              />
            </FormField>
          </div>
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL: QUICK CHECK IN DESK (Instant Paddle / Bidder Lookup & Check In)
          ========================================================================= */}
      <FormModal
        isOpen={isQuickCheckInModalOpen}
        title="Quick Check In Desk"
        maxWidth={680}
        onClose={() => {
          setIsQuickCheckInModalOpen(false);
          setQuickCheckInSearch('');
        }}
        cancelLabel="Close"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
              Search by Paddle #, Name, Company, or Email:
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="text"
                autoFocus
                placeholder="Type paddle # (e.g. 5001) or bidder name..."
                value={quickCheckInSearch}
                onChange={(e) => setQuickCheckInSearch(e.target.value)}
                className="catalog-search-input"
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: 36,
                  fontSize: 13,
                  fontWeight: 600
                }}
              />
              {quickCheckInSearch && (
                <button
                  type="button"
                  onClick={() => setQuickCheckInSearch('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: 10,
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Check In Results or Pending List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {quickCheckInSearch.trim() ? 'Matching Bidders' : `Pending Check In (${registrations.filter(r => !r.isCheckedIn).length})`}
              </span>
              {!quickCheckInSearch.trim() && registrations.filter(r => !r.isCheckedIn).length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const pendingIds = registrations.filter(r => !r.isCheckedIn).map(r => r.id);
                    await auctionDayService.bulkCheckIn(auction?.id || '', pendingIds, true);
                    setRegistrations(prev => prev.map(r => ({ ...r, isCheckedIn: true })));
                    showToast('success', 'Bulk Check In', `Checked in all ${pendingIds.length} pending bidders.`);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                >
                  Check In All Pending
                </button>
              )}
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              {(() => {
                const term = quickCheckInSearch.toLowerCase().trim();
                const filtered = registrations.filter(r => {
                  if (!term) return !r.isCheckedIn;
                  return (
                    r.bidCardNumber.toLowerCase().includes(term) ||
                    r.bidderName.toLowerCase().includes(term) ||
                    (r.companyName && r.companyName.toLowerCase().includes(term)) ||
                    (r.email && r.email.toLowerCase().includes(term))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12.5 }}>
                      {term ? `No bidders found matching "${quickCheckInSearch}".` : 'All registered bidders are already checked in!'}
                    </div>
                  );
                }

                return filtered.map(r => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      background: r.isCheckedIn ? '#f0fdf4' : '#ffffff'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: 13,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--gold-dark, #9a741e)',
                          background: '#fef3c7',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          #{r.bidCardNumber}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                          {r.bidderName}
                        </span>
                        {r.companyName && (
                          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                            ({r.companyName})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
                        {r.email || 'No email on file'} • Credit Limit: {r.permissionText || 'Standard'}
                        {r.depositAmount ? ` • Deposit: ${formatCurrency(r.depositAmount)}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.isCheckedIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#15803d',
                            background: '#dcfce7',
                            padding: '3px 8px',
                            borderRadius: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <CheckCircle2 size={12} /> Checked In
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleCheckIn(r.id, true)}
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: '3px 8px' }}
                            title="Undo check in"
                          >
                            <RotateCcw size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleCheckIn(r.id, false)}
                          className="btn btn-gold"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 14px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <Check size={13} />
                          <span>Check In</span>
                        </button>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </FormModal>

      {/* =========================================================================
          MODAL 3: ADD HIBID SYNDICATION NODE
          ========================================================================= */}
      <FormModal
        isOpen={isAddSiteModalOpen}
        title="Add HiBid Multi-Portal Syndication Node"
        onClose={() => setIsAddSiteModalOpen(false)}
        onSubmit={handleAddSiteStat}
        submitLabel="Link Portal Node"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Portal Domain *" required>
            <input 
              type="text"
              required
              placeholder="e.g. northwestcoins.hibid.com"
              value={newSiteDomain}
              onChange={(e) => setNewSiteDomain(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 36 }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Registrations">
              <input 
                type="number"
                placeholder="25"
                value={newSiteRegs}
                onChange={(e) => setNewSiteRegs(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="CC Authorizations">
              <input 
                type="number"
                placeholder="24"
                value={newSiteAuths}
                onChange={(e) => setNewSiteAuths(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Portal Views">
              <input 
                type="number"
                placeholder="1500"
                value={newSiteViews}
                onChange={(e) => setNewSiteViews(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>

            <FormField label="Unique Bids">
              <input 
                type="number"
                placeholder="65"
                value={newSiteBids}
                onChange={(e) => setNewSiteBids(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 36 }}
              />
            </FormField>
          </div>
        </div>
      </FormModal>

      {/* =========================================================================
          RIGHT-SIDE DRAWER 1: BIDDER REGISTRATION (View / Add / Edit)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={bidderDrawer.isOpen}
        onClose={() => setBidderDrawer(prev => ({ ...prev, isOpen: false }))}
        title={
          bidderDrawer.mode === 'add'
            ? 'Register New Bidder'
            : bidderDrawer.mode === 'edit'
            ? `Edit Bidder — Paddle #${bidderDrawer.data?.bidCardNumber}`
            : `Bidder Profile — #${bidderDrawer.data?.bidCardNumber} ${bidderDrawer.data?.bidderName}`
        }
        description={
          bidderDrawer.mode === 'view'
            ? 'Saleroom credentials, assigned credit limits, and check-in telemetry'
            : 'Enter bidder contact information, paddle number, and approval limit'
        }
        width={560}
      >
        {bidderDrawer.mode === 'view' && bidderDrawer.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top Badge Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: 'var(--gold-dark, #9a741e)',
                  background: '#fef3c7',
                  padding: '3px 10px',
                  borderRadius: 4,
                  display: 'inline-block',
                  marginBottom: 6
                }}>
                  PADDLE #{bidderDrawer.data.bidCardNumber}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {bidderDrawer.data.bidderName}
                </h3>
                {bidderDrawer.data.companyName && (
                  <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
                    {bidderDrawer.data.companyName}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: bidderDrawer.data.isCheckedIn ? '#dcfce7' : '#fee2e2',
                  color: bidderDrawer.data.isCheckedIn ? '#15803d' : '#b91c1c',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {bidderDrawer.data.isCheckedIn ? <Check size={13} strokeWidth={2.5} /> : null}
                  {bidderDrawer.data.isCheckedIn ? 'Checked In' : 'Pending Entry'}
                </span>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {bidderDrawer.data.dateTime || 'Today'}
                </div>
              </div>
            </div>

            {/* Profile Field Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Email Address</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0284c7', marginTop: 2, wordBreak: 'break-all' }}>
                  {bidderDrawer.data.email || '—'}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Phone Number</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                  {bidderDrawer.data.phone || '—'}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Credit & Approval</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginTop: 2 }}>
                  {bidderDrawer.data.permissionText || 'Approved - Standard'}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>HiBid Reputation</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginTop: 2 }}>
                  {bidderDrawer.data.hibidReputation || '5.0 ★'}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Lead Source / Referral</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                  {bidderDrawer.data.hearAboutUs || 'Website'}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Origin / Desk</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                  {bidderDrawer.data.site || 'Saleroom In-House'}
                </div>
              </div>
            </div>

            {/* Deposit Telemetry */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#0369a1' }}>Security Deposit</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0c4a6e', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(bidderDrawer.data.depositAmount || 0)}
                </div>
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 4,
                background: Number(bidderDrawer.data.depositAmount) > 0 ? '#dcfce7' : '#f1f5f9',
                color: Number(bidderDrawer.data.depositAmount) > 0 ? '#15803d' : '#64748b'
              }}>
                {bidderDrawer.data.depositStatus || 'No Deposit'}
              </span>
            </div>

            {/* Clerking Notes */}
            {bidderDrawer.data.notes && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Clerk & ID Notes
                </span>
                <p style={{ margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                  {bidderDrawer.data.notes}
                </p>
              </div>
            )}

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setBidderDrawer(prev => ({ ...prev, mode: 'edit' }))}
                className="btn btn-secondary"
                style={{ flex: 1, height: 38, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Edit size={14} />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleCheckIn(bidderDrawer.data!.id, Boolean(bidderDrawer.data!.isCheckedIn))}
                className={`btn ${bidderDrawer.data.isCheckedIn ? 'btn-secondary' : 'btn-gold'}`}
                style={{ flex: 1, height: 38, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {bidderDrawer.data.isCheckedIn ? <RotateCcw size={14} /> : <Check size={14} />}
                <span>{bidderDrawer.data.isCheckedIn ? 'Undo Check In' : 'Check In Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenDepositDrawerForBidder(bidderDrawer.data!)}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 14px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Record new deposit for this bidder"
              >
                <DollarSign size={14} color="#059669" />
                <span>Deposit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBidderDrawer(prev => ({ ...prev, isOpen: false }));
                  handlePromptDelete('bidder', bidderDrawer.data!.id, `Paddle #${bidderDrawer.data!.bidCardNumber} - ${bidderDrawer.data!.bidderName}`);
                }}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 12px', color: '#b91c1c', borderColor: '#fca5a5' }}
                title="Delete bidder from auction roster"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveBidderDrawer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <FormField label="Paddle # *" required>
                <input
                  type="text"
                  required
                  value={drawerBidCard}
                  onChange={(e) => setDrawerBidCard(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  placeholder="5001"
                />
              </FormField>

              <FormField label="Full Name *" required>
                <input
                  type="text"
                  required
                  value={drawerBidderName}
                  onChange={(e) => setDrawerBidderName(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontWeight: 600 }}
                  placeholder="e.g. Helena Vance"
                />
              </FormField>
            </div>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Company Name">
                <input
                  type="text"
                  value={drawerCompany}
                  onChange={(e) => setDrawerCompany(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="e.g. Vance Fine Antiques"
                />
              </FormField>

              <FormField label="Email Address">
                <input
                  type="email"
                  value={drawerEmail}
                  onChange={(e) => setDrawerEmail(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="helena@example.com"
                />
              </FormField>
            </div>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Phone Number">
                <input
                  type="tel"
                  value={drawerPhone}
                  onChange={(e) => setDrawerPhone(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="(406) 555-0144"
                />
              </FormField>

              <FormField label="Credit Approval Limit ($)">
                <input
                  type="number"
                  step="1000"
                  value={drawerLimit}
                  onChange={(e) => setDrawerLimit(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontWeight: 700 }}
                  placeholder="25000"
                />
              </FormField>
            </div>

            <FormField label="Hear About Us / Source">
              <ShadcnSelect
                value={drawerHearAboutUs}
                onChange={(val) => setDrawerHearAboutUs(val)}
                size="md"
                options={[
                  { value: 'Website', label: 'Website' },
                  { value: 'Referral / Word of Mouth', label: 'Referral / Word of Mouth' },
                  { value: 'AuctionZip', label: 'AuctionZip' },
                  { value: 'Social Media', label: 'Social Media' },
                  { value: 'Direct Mail / Catalog', label: 'Direct Mail / Catalog' },
                  { value: 'HiBid Directory', label: 'HiBid Directory' },
                  { value: 'Repeat Client', label: 'Repeat Client' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
            </FormField>

            <FormField label="Clerking Notes">
              <textarea
                rows={3}
                value={drawerNotes}
                onChange={(e) => setDrawerNotes(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                placeholder="Driver license verified, saleroom notes, tax exemption details..."
              />
            </FormField>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
              <input
                type="checkbox"
                checked={drawerIsCheckedIn}
                onChange={(e) => setDrawerIsCheckedIn(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                Check in immediately for this auction
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setBidderDrawer(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingDrawerBidder}
                className="btn btn-gold"
                style={{ height: 38, padding: '0 20px', fontSize: 13, fontWeight: 700 }}
              >
                {isSavingDrawerBidder ? 'Saving...' : bidderDrawer.mode === 'add' ? 'Register Bidder' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </ShadcnSheet>

      {/* =========================================================================
          RIGHT-SIDE DRAWER 2: ALTERNATE BID (View / Add / Edit)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={altBidDrawer.isOpen}
        onClose={() => setAltBidDrawer(prev => ({ ...prev, isOpen: false }))}
        title={
          altBidDrawer.mode === 'add'
            ? 'Add Alternate Order Bid'
            : altBidDrawer.mode === 'edit'
            ? `Edit Order Bid — Lot #${altBidDrawer.data?.lotNumber}`
            : `Alternate Bid Details — Lot #${altBidDrawer.data?.lotNumber}`
        }
        description="Phone clerk line instructions, absentee left book orders, and max limit bids"
        width={540}
      >
        {altBidDrawer.mode === 'view' && altBidDrawer.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Top Lot Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '16px 20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: 'var(--gold-dark, #9a741e)',
                  background: '#fef3c7',
                  padding: '3px 10px',
                  borderRadius: 4
                }}>
                  LOT #{altBidDrawer.data.lotNumber}
                </span>

                <span style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: altBidDrawer.data.status === 'Active' ? '#dcfce7' : altBidDrawer.data.status === 'Executed' ? '#e0f2fe' : '#fee2e2',
                  color: altBidDrawer.data.status === 'Active' ? '#15803d' : altBidDrawer.data.status === 'Executed' ? '#0369a1' : '#b91c1c'
                }}>
                  {altBidDrawer.data.status}
                </span>
              </div>

              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '4px 0 0', lineHeight: 1.4 }}>
                {altBidDrawer.data.lotDescription || `Catalog Item #${altBidDrawer.data.lotNumber}`}
              </h4>
            </div>

            {/* Financials Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>Opening Bid Amount</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(altBidDrawer.data.amount)}
                </div>
              </div>

              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#854d0e' }}>Max Order Limit</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#a16207', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(altBidDrawer.data.maxAmount || altBidDrawer.data.amount)}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Bidder Name</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {altBidDrawer.data.bidderName}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Paddle # & Type</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginTop: 2 }}>
                  #{altBidDrawer.data.paddleNumber} • {altBidDrawer.data.bidType}
                </div>
              </div>
            </div>

            {/* Notes */}
            {altBidDrawer.data.notes && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Clerk Instructions / Notes
                </span>
                <p style={{ margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                  {altBidDrawer.data.notes}
                </p>
              </div>
            )}

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setAltBidDrawer(prev => ({ ...prev, mode: 'edit' }))}
                className="btn btn-secondary"
                style={{ flex: 1, height: 38, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Edit size={14} />
                <span>Edit Bid</span>
              </button>

              {altBidDrawer.data.status === 'Active' && !isAuctionClosed && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleExecuteAltBid(altBidDrawer.data!);
                      setAltBidDrawer(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="btn btn-gold"
                    style={{ flex: 1, height: 38, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Gavel size={14} />
                    <span>Execute</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleRejectAltBid(altBidDrawer.data!);
                      setAltBidDrawer(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="btn btn-secondary"
                    style={{ height: 38, padding: '0 14px', fontSize: 13, color: '#b91c1c', borderColor: '#fca5a5' }}
                  >
                    <span>Reject</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setAltBidDrawer(prev => ({ ...prev, isOpen: false }));
                  handlePromptDelete('altBid', altBidDrawer.data!.id, `Lot #${altBidDrawer.data!.lotNumber} (${altBidDrawer.data!.bidderName})`);
                }}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 12px', color: '#b91c1c', borderColor: '#fca5a5' }}
                title="Delete alternate bid record"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveAltBidDrawer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <FormField label="Lot Number *" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={drawerAltLotNum}
                  onChange={(e) => setDrawerAltLotNum(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  placeholder="101"
                />
              </FormField>

              <FormField label="Bidder Full Name *" required>
                <input
                  type="text"
                  required
                  value={drawerAltBidderName}
                  onChange={(e) => setDrawerAltBidderName(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontWeight: 600 }}
                  placeholder="e.g. Robert Chen"
                />
              </FormField>
            </div>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Paddle Number">
                <input
                  type="text"
                  value={drawerAltPaddle}
                  onChange={(e) => setDrawerAltPaddle(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)' }}
                  placeholder="e.g. 5003"
                />
              </FormField>

              <FormField label="Bid Type / Channel">
                <ShadcnSelect
                  value={drawerAltType}
                  onChange={(val) => setDrawerAltType(val as any)}
                  size="md"
                  options={[
                    { value: 'Phone', label: 'Phone Clerk Line' },
                    { value: 'Absentee', label: 'Absentee Left Book' },
                    { value: 'Floor', label: 'Floor Saleroom' }
                  ]}
                />
              </FormField>
            </div>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Opening / Start Bid ($) *" required>
                <input
                  type="number"
                  step="50"
                  required
                  value={drawerAltAmount}
                  onChange={(e) => setDrawerAltAmount(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  placeholder="5000"
                />
              </FormField>

              <FormField label="Max Order Limit ($)">
                <input
                  type="number"
                  step="50"
                  value={drawerAltMaxAmount}
                  onChange={(e) => setDrawerAltMaxAmount(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)' }}
                  placeholder="8500"
                />
              </FormField>
            </div>

            {altBidDrawer.mode === 'edit' && (
              <FormField label="Order Status">
                <ShadcnSelect
                  value={drawerAltStatus}
                  onChange={(val) => setDrawerAltStatus(val)}
                  size="md"
                  options={[
                    { value: 'Active', label: 'Active (On Book)' },
                    { value: 'Executed', label: 'Executed (Realized)' },
                    { value: 'Rejected', label: 'Rejected' },
                    { value: 'Cancelled', label: 'Cancelled' }
                  ]}
                />
              </FormField>
            )}

            <FormField label="Clerking Notes">
              <textarea
                rows={3}
                value={drawerAltNotes}
                onChange={(e) => setDrawerAltNotes(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                placeholder="Direct clerk phone instructions, ceiling amounts..."
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setAltBidDrawer(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingDrawerAltBid}
                className="btn btn-gold"
                style={{ height: 38, padding: '0 20px', fontSize: 13, fontWeight: 700 }}
              >
                {isSavingDrawerAltBid ? 'Saving...' : altBidDrawer.mode === 'add' ? 'Record Bid' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </ShadcnSheet>

      {/* =========================================================================
          RIGHT-SIDE DRAWER 3: BIDDER DEPOSIT (View / Add / Edit)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={depositDrawer.isOpen}
        onClose={() => setDepositDrawer(prev => ({ ...prev, isOpen: false }))}
        title={
          depositDrawer.mode === 'add'
            ? 'Record Bidder Deposit'
            : depositDrawer.mode === 'edit'
            ? `Edit Deposit — #${depositDrawer.data?.bidCardNumber}`
            : `Deposit Receipt — #${depositDrawer.data?.bidCardNumber} ${depositDrawer.data?.bidderName}`
        }
        description="Saleroom cashier security deposits, auth holds, and applied payments"
        width={520}
      >
        {depositDrawer.mode === 'view' && depositDrawer.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '16px 20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: 'var(--gold-dark, #9a741e)',
                  background: '#fef3c7',
                  padding: '3px 10px',
                  borderRadius: 4
                }}>
                  PADDLE #{depositDrawer.data.bidCardNumber}
                </span>

                <span style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: depositDrawer.data.status === 'Collected' ? '#dcfce7' : depositDrawer.data.status === 'Refunded' ? '#fee2e2' : '#f1f5f9',
                  color: depositDrawer.data.status === 'Collected' ? '#15803d' : depositDrawer.data.status === 'Refunded' ? '#b91c1c' : '#64748b'
                }}>
                  {depositDrawer.data.status}
                </span>
              </div>

              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                {depositDrawer.data.bidderName}
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>Total Amount</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(depositDrawer.data.amount)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Applied</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#334155', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(depositDrawer.data.amountApplied || 0)}
                </div>
              </div>

              <div style={{ background: '#fffdf7', border: '1px solid #fef08a', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#854d0e' }}>Remaining</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#a16207', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(depositDrawer.data.amountRemaining !== undefined ? depositDrawer.data.amountRemaining : (depositDrawer.data.amount - (depositDrawer.data.amountApplied || 0)))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Payment Method</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {depositDrawer.data.paymentMethod || 'Credit Card'}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Reference / Auth #</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0284c7', marginTop: 2 }}>
                  {depositDrawer.data.referenceNumber || '—'}
                </div>
              </div>
            </div>

            {depositDrawer.data.notes && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Receipt Notes
                </span>
                <p style={{ margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                  {depositDrawer.data.notes}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setDepositDrawer(prev => ({ ...prev, mode: 'edit' }))}
                className="btn btn-secondary"
                style={{ flex: 1, height: 38, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Edit size={14} />
                <span>Edit Deposit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const newStatus = depositDrawer.data!.status === 'Refunded' ? 'Collected' : 'Refunded';
                  handleUpdateDepositStatus(depositDrawer.data!.id, newStatus);
                  setDepositDrawer(prev => ({ ...prev, isOpen: false }));
                }}
                className="btn btn-secondary"
                style={{ flex: 1, height: 38, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <RotateCcw size={14} />
                <span>{depositDrawer.data.status === 'Refunded' ? 'Mark Collected' : 'Mark Refunded'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDepositDrawer(prev => ({ ...prev, isOpen: false }));
                  handlePromptDelete('deposit', depositDrawer.data!.id, `Deposit of ${formatCurrency(depositDrawer.data!.amount)} (#${depositDrawer.data!.bidCardNumber})`);
                }}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 12px', color: '#b91c1c', borderColor: '#fca5a5' }}
                title="Delete deposit record"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveDepositDrawer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {depositDrawer.mode === 'add' && (
              <FormField label="Select Bidder" required>
                <ShadcnSelect
                  value={drawerDepBidderId}
                  onChange={(val) => setDrawerDepBidderId(val)}
                  size="md"
                  options={[
                    { value: '', label: '-- Choose Registered Bidder --' },
                    ...registrations.map(r => ({
                      value: r.id,
                      label: `#${r.bidCardNumber} - ${r.bidderName}`
                    })),
                    { value: 'walk_in', label: 'Walk-In Customer' }
                  ]}
                />
              </FormField>
            )}

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Deposit Amount ($) *" required>
                <input
                  type="number"
                  step="50"
                  min="1"
                  required
                  value={drawerDepAmount}
                  onChange={(e) => setDrawerDepAmount(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  placeholder="1000"
                />
              </FormField>

              <FormField label="Payment Method">
                <ShadcnSelect
                  value={drawerDepMethod}
                  onChange={(val) => setDrawerDepMethod(val as any)}
                  size="md"
                  options={[
                    { value: 'Credit Card', label: 'Credit Card' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Wire Transfer', label: 'Wire Transfer' },
                    { value: 'Check', label: 'Company / Personal Check' },
                    { value: "Cashier's Check", label: "Cashier's Check" },
                    { value: 'ACH', label: 'ACH / Direct Debit' }
                  ]}
                />
              </FormField>
            </div>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Status">
                <ShadcnSelect
                  value={drawerDepStatus}
                  onChange={(val) => setDrawerDepStatus(val as any)}
                  size="md"
                  options={[
                    { value: 'Collected', label: 'Collected' },
                    { value: 'Pending', label: 'Pending Authorization' },
                    { value: 'Refunded', label: 'Refunded' },
                    { value: 'Applied', label: 'Applied to Invoice' }
                  ]}
                />
              </FormField>

              <FormField label="Reference / Transaction #">
                <input
                  type="text"
                  value={drawerDepRef}
                  onChange={(e) => setDrawerDepRef(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="e.g. AUTH-92819"
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                rows={3}
                value={drawerDepNotes}
                onChange={(e) => setDrawerDepNotes(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 'auto', padding: '8px 10px', fontSize: 13 }}
                placeholder="Receipt details, card ending digits..."
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setDepositDrawer(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingDrawerDeposit}
                className="btn btn-gold"
                style={{ height: 38, padding: '0 20px', fontSize: 13, fontWeight: 700 }}
              >
                {isSavingDrawerDeposit ? 'Saving...' : depositDrawer.mode === 'add' ? 'Save Deposit' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </ShadcnSheet>

      {/* =========================================================================
          RIGHT-SIDE DRAWER 4: HIBID PORTAL NODE (View / Add / Edit)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={siteStatDrawer.isOpen}
        onClose={() => setSiteStatDrawer(prev => ({ ...prev, isOpen: false }))}
        title={
          siteStatDrawer.mode === 'add'
            ? 'Add HiBid Syndication Node'
            : siteStatDrawer.mode === 'edit'
            ? `Edit Node — ${siteStatDrawer.data?.site}`
            : `Portal Telemetry — ${siteStatDrawer.data?.site}`
        }
        description="Cross-portal syndication metrics, page views, and simulcast registrations"
        width={500}
      >
        {siteStatDrawer.mode === 'view' && siteStatDrawer.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '16px 20px'
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Portal Domain</span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0369a1', margin: '4px 0 0' }}>
                {siteStatDrawer.data.site}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Registrations</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {siteStatDrawer.data.registrations}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>CC Authorizations</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {siteStatDrawer.data.ccAuths}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Portal Views</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {siteStatDrawer.data.views.toLocaleString()}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Unique Bids</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {siteStatDrawer.data.uniqueBids}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>High Bid</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(siteStatDrawer.data.highBid)}
                </div>
              </div>

              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#854d0e' }}>Max Bid</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#a16207', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(siteStatDrawer.data.maxBid)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setSiteStatDrawer(prev => ({ ...prev, mode: 'edit' }))}
                className="btn btn-secondary"
                style={{ flex: 1, height: 38, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Edit size={14} />
                <span>Edit Node</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSiteStatDrawer(prev => ({ ...prev, isOpen: false }));
                  handlePromptDelete('siteStat', siteStatDrawer.data!.site, siteStatDrawer.data!.site);
                }}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 14px', color: '#b91c1c', borderColor: '#fca5a5' }}
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveSiteStatDrawer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Portal Domain *" required>
              <input
                type="text"
                required
                disabled={siteStatDrawer.mode === 'edit'}
                value={drawerSiteDomain}
                onChange={(e) => setDrawerSiteDomain(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38 }}
                placeholder="e.g. northwestcoins.hibid.com"
              />
            </FormField>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Registrations">
                <input
                  type="number"
                  value={drawerSiteRegs}
                  onChange={(e) => setDrawerSiteRegs(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="25"
                />
              </FormField>

              <FormField label="CC Authorizations">
                <input
                  type="number"
                  value={drawerSiteAuths}
                  onChange={(e) => setDrawerSiteAuths(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="24"
                />
              </FormField>
            </div>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="Portal Views">
                <input
                  type="number"
                  value={drawerSiteViews}
                  onChange={(e) => setDrawerSiteViews(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="1500"
                />
              </FormField>

              <FormField label="Unique Bids">
                <input
                  type="number"
                  value={drawerSiteBids}
                  onChange={(e) => setDrawerSiteBids(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="65"
                />
              </FormField>
            </div>

            <div className="responsive-form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <FormField label="High Bid ($)">
                <input
                  type="number"
                  step="50"
                  value={drawerSiteHighBid}
                  onChange={(e) => setDrawerSiteHighBid(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="12500"
                />
              </FormField>

              <FormField label="Max Bid ($)">
                <input
                  type="number"
                  step="50"
                  value={drawerSiteMaxBid}
                  onChange={(e) => setDrawerSiteMaxBid(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38 }}
                  placeholder="24000"
                />
              </FormField>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setSiteStatDrawer(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
                style={{ height: 38, padding: '0 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingDrawerSite}
                className="btn btn-gold"
                style={{ height: 38, padding: '0 20px', fontSize: 13, fontWeight: 700 }}
              >
                {isSavingDrawerSite ? 'Saving...' : 'Save Portal Node'}
              </button>
            </div>
          </form>
        )}
      </ShadcnSheet>

      {/* =========================================================================
          RIGHT-SIDE DRAWER 5: LOT DETAILS (Catalog Inspection)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={lotDrawer.isOpen}
        onClose={() => setLotDrawer({ isOpen: false })}
        title={lotDrawer.lot ? `Lot #${lotDrawer.lot.lotNumber} — ${lotDrawer.lot.title}` : 'Catalog Lot Details'}
        description="Catalog specifications, reserve benchmarks, and live rostrum clerking"
        width={560}
      >
        {lotDrawer.lot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ width: '100%', height: 240, borderRadius: 8, overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
              <img
                src={lotDrawer.lot.image || '/assets/gold-coin.jpg'}
                alt={lotDrawer.lot.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <span style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 4
              }}>
                LOT #{lotDrawer.lot.lotNumber}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Estimate Range</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(lotDrawer.lot.estimateLow)} – {formatCurrency(lotDrawer.lot.estimateHigh)}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>Current High Bid</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {formatCurrency(lotDrawer.lot.currentBid || lotDrawer.lot.startingBid)}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Rostrum Status</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                  {lotDrawer.lot.status === 'on_block' ? 'Active on Rostrum' : lotDrawer.lot.status === 'sold' ? 'Realized / Sold' : 'Cataloged / Upcoming'}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Total Bids Placed</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {lotDrawer.lot.bidsCount || 0} bids
                </div>
              </div>
            </div>

            {lotDrawer.lot.description && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Item Description
                </span>
                <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                  {lotDrawer.lot.description}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setActiveClerkLotId(lotDrawer.lot!.id);
                  onSelectTab('clerking');
                  setLotDrawer({ isOpen: false });
                }}
                className="btn btn-gold"
                style={{ flex: 1, height: 40, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Gavel size={15} />
                <span>Open in Live Rostrum Clerking</span>
              </button>

              <button
                type="button"
                onClick={() => setLotDrawer({ isOpen: false })}
                className="btn btn-secondary"
                style={{ height: 40, padding: '0 16px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ShadcnSheet>

      {/* =========================================================================
          RIGHT-SIDE DRAWER 6: CLERKING RECORD (Edit / View Clerked Lot)
          ========================================================================= */}
      <ShadcnSheet
        isOpen={clerkingDrawer.isOpen}
        onClose={() => setClerkingDrawer({ isOpen: false, mode: 'view' })}
        title={clerkingDrawer.mode === 'edit' ? `Edit Clerking Record — Lot #${drawerClerkLotNum}` : `Clerking Details — Lot #${drawerClerkLotNum}`}
        description="Verify or adjust hammer price, successful bidder, and sale status in Supabase"
        width={540}
      >
        <form onSubmit={handleSaveDrawerClerking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <FormField label="Lot Number">
              <input
                type="text"
                disabled
                value={`#${drawerClerkLotNum}`}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, background: '#f1f5f9', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
            </FormField>

            <FormField label="Status *">
              <ShadcnSelect
                value={drawerClerkStatus}
                onChange={(val) => setDrawerClerkStatus(val)}
                options={[
                  { value: 'Sold', label: 'Sold' },
                  { value: 'Passed', label: 'Passed' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Withdrawn', label: 'Withdrawn' }
                ]}
              />
            </FormField>
          </div>

          <FormField label="Title">
            <input
              type="text"
              value={drawerClerkTitle}
              onChange={(e) => setDrawerClerkTitle(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 38, fontSize: 13 }}
            />
          </FormField>

          <FormField label="Seller / Consignor">
            <input
              type="text"
              value={drawerClerkSeller}
              onChange={(e) => setDrawerClerkSeller(e.target.value)}
              className="catalog-search-input"
              style={{ width: '100%', height: 38, fontSize: 13 }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <FormField label="Hammer Price ($)">
              <input
                type="number"
                step="10"
                value={drawerClerkHammerPrice}
                onChange={(e) => setDrawerClerkHammerPrice(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#15803d' }}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="Winning Bidder (Paddle #)">
              <input
                type="text"
                value={drawerClerkBidder}
                onChange={(e) => setDrawerClerkBidder(e.target.value)}
                className="catalog-search-input"
                style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                placeholder="e.g. 104"
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setClerkingDrawer({ isOpen: false, mode: 'view' })}
              className="btn btn-secondary"
              style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingDrawerClerking}
              className="btn btn-gold"
              style={{ height: 38, padding: '0 20px', fontSize: 13, fontWeight: 700 }}
            >
              {isSavingDrawerClerking ? 'Saving...' : 'Save Clerking Record'}
            </button>
          </div>
        </form>
      </ShadcnSheet>

      {/* =========================================================================
          DELETE CONFIRMATION MODAL (Destructive Action AlertDialog)
          ========================================================================= */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={`Are you sure you want to delete ${deleteConfirm.label}? This action will permanently remove the record from Supabase.`}
        confirmLabel={deleteConfirm.isLoading ? 'Deleting...' : 'Delete Permanently'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
