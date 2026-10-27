export type AuctionStatus = 'draft' | 'cataloging' | 'preview' | 'live' | 'closed' | 'settled';

export interface SyndicationSite {
  site: string;
  registrations: number;
  ccAuths: number;
  views: number;
  uniqueBidders: number;
  uniqueBids: number;
  totalBids: number;
  highBid: number;
  maxBid: number;
}

export interface Auction {
  id: string;
  code: string;
  title: string;
  category: string;
  status: AuctionStatus;
  startDate: string;
  endDate: string;
  location: string;
  address: string;
  cityStateZip: string;
  country: string;
  lotCount: number;
  checkInCount: number;
  uniqueSellers: number;
  presaleMin: number;
  presaleMax: number;
  avgEstimate: number;
  avgSalesPrice: number;
  buyersPremiumCash: number;
  buyersPremiumCredit: number;
  taxRate: number;
  description: string;
  terms: string;
  bpExplanation: string;
  taxExemptInfo: string;
  hibidSyncStatus: 'synced' | 'pending' | 'syncing' | 'error';
  lastSyncedAt?: string;
  syndications: SyndicationSite[];
}

export type LotStatus = 'upcoming' | 'on_block' | 'sold' | 'passed' | 'withdrawn';
export type LotCategory = 
  | 'Rare US Gold'
  | 'Fine Silver & Morgan Dollars'
  | 'Ancient & World Numismatics'
  | 'Rare Paper Currency'
  | 'Estate Jewelry & Watches'
  | 'Historic Bullion';

export type ClerkingState = 'READY' | 'LIVE' | 'GOING_ONCE' | 'GOING_TWICE' | 'PAUSED' | 'SOLD' | 'UNSOLD';

export interface LotItem {
  id: string;
  auctionId: string;
  lotNumber: number;
  title: string;
  category: LotCategory;
  image: string;
  startingBid: number;
  reservePrice: number;
  estimateLow: number;
  estimateHigh: number;
  currentBid: number;
  highBidderPaddle: string | null;
  highBidderName: string | null;
  status: LotStatus;
  certification: 'PCGS' | 'NGC' | 'CAC' | 'ANACS' | 'Raw' | 'GIA';
  grade: string;
  certNumber?: string;
  consignorId: string;
  consignorName: string;
  conditionReport: string;
  provenance: string;
  bidsCount: number;
  hammerPrice?: number;
  passReason?: string;
  clerkingState?: ClerkingState;
  quantity?: number;
  description?: string;
  images?: string[];
  sellerId?: string;
  sellerName?: string;
  staggerSeconds?: number;
  saleOrder?: number;
  commission?: string;
  buyerPremium?: string;
  buyerTax?: string;
  chargesOverridden?: boolean;
}

export type BidderStatus = 'verified' | 'pending_verification' | 'suspended' | 'vip';
export type UserType = 'bidder' | 'consignor' | 'both';

export interface UserBidder {
  id: string;
  customerCode?: string;
  firstName?: string;
  lastName?: string;
  phone1?: string;
  paddleNumber: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  companyName?: string;
  siteOrigin: string;
  registrationDate: string;
  status: BidderStatus;
  creditCardAuthorized: boolean;
  cardLast4: string;
  bidLimit: number;
  totalBidsPlaced: number;
  lotsWon: number;
  totalSpent: number;
  type: UserType;
  address: string;
  cityStateZip: string;
  notes: string;
  driversLicenseNumber?: string;
  taxId?: string;
  taxIdExpirationDate?: string;
  taxExemptAllPurchases?: boolean;
  isSeller?: boolean;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  isPermanentBidder?: boolean;
}

export interface LiveBid {
  id: string;
  lotId: string;
  lotNumber: number;
  amount: number;
  paddleNumber: string;
  bidderName: string;
  source: 'Floor' | 'HiBid Online' | 'Gardner Web' | 'Phone' | 'Absentee';
  timestamp: string;
  isWinning: boolean;
}

export interface InvoiceSettlement {
  id: string;
  invoiceNumber: string;
  auctionId: string;
  auctionCode: string;
  paddleNumber: string;
  buyerName: string;
  buyerEmail: string;
  itemsCount: number;
  lots: Array<{ lotNumber: number; title: string; hammerPrice: number }>;
  hammerSubtotal: number;
  buyersPremium: number;
  taxAmount: number;
  shippingFee: number;
  totalDue: number;
  paymentStatus: 'Paid' | 'Pending Wire' | 'Card Authorized' | 'Check Received' | 'Unpaid';
  paymentMethod?: string;
  paymentDate?: string;
  notes: string;
}

export interface ConsignorSettlement {
  id: string;
  consignorCode: string;
  consignorName: string;
  auctionCode: string;
  totalLotsSold: number;
  grossHammer: number;
  commissionRate: number;
  commissionAmount: number;
  photographyFees: number;
  netPayout: number;
  status: 'Paid' | 'Ready for Payout' | 'Pending Review';
  checkNumber?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  category: 'Auction' | 'Lot' | 'Bidder' | 'Clerking' | 'Settlement' | 'HiBid Sync';
  severity: 'info' | 'success' | 'warning' | 'alert';
  details: string;
}

export type NavigationSection = 
  | 'overview'
  | 'users'
  | 'admins'
  | 'auctions'
  | 'lots'
  | 'live_clerking'
  | 'payments'
  | 'reports'
  | 'logs'
  | 'notifications'
  | 'settings'
  | 'profile';

export type NotificationType = 
  | 'auction'
  | 'bidder'
  | 'clerking'
  | 'settlement'
  | 'system'
  | 'security';

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: NotificationType | string;
  recipient_id?: string | null;
  recipient_role?: string;
  related_module?: NavigationSection | string | null;
  related_record_id?: string | null;
  action_url?: string | null;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface AdminUserRecord {
  id: string;
  authId?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'clerk' | 'consignor_manager' | 'operator';
  title: string;
  department: string;
  avatarUrl?: string;
  status: 'active' | 'suspended' | 'pending';
  permissions?: Record<string, boolean>;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
