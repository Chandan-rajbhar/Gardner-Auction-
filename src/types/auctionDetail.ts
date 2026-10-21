import { LotCategory } from './index';

export type StageType = 'pre-auction' | 'auction-day' | 'settlement';

export type PreAuctionSubTab = 
  | 'details' 
  | 'upload-settings' 
  | 'preview' 
  | 'lots' 
  | 'lot-images' 
  | 'expenses';

export type AuctionDaySubTab = 
  | 'dashboard' 
  | 'check-in' 
  | 'clerking' 
  | 'alternate-bids';

export type AuctionStatusType = 'Open' | 'In Progress' | 'Closed';

export interface FeaturedImage {
  id: string;
  url: string;
  title: string;
  isPrimary?: boolean;
  order: number;
}

export interface AuctionLink {
  id: string;
  url: string;
  description: string;
}

export interface AuctionExpense {
  id: string;
  description: string;
  vendor: string;
  amount: number;
  date: string;
}

export interface HiBidSiteStat {
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

export interface BidderRegistration {
  id: string;
  bidCardNumber: string;
  bidderName: string;
  username: string;
  hibidReputation: string; // e.g. "5.0 ★ (42 reviews)"
  bidCount: number;
  permissionText: string;
  dateTime: string;
  site: string;
  notes: string;
  shippingRequested: boolean;
  bidderNotes: string;
  isCheckedIn: boolean;
}

export interface AuctionLotStat {
  id: string;
  lotNumber: number;
  title: string;
  image: string;
  timeLeft: string; // e.g. "3d 8h 17m"
  highBid: number;
  maxBid: number;
  views: number;
  watches: number;
  af360Status: 'Not Clerked' | 'Clerked' | 'On Block';
}

export interface AlternateBid {
  id: string;
  lotNumber: number;
  bidderName: string;
  paddleNumber: string;
  bidType: 'Phone' | 'Absentee' | 'Floor';
  amount: number;
  maxAmount: number;
  notes: string;
  status: 'Active' | 'Executed' | 'Cancelled';
}

export interface SettlementEntry {
  id: string;
  type: 'sold_lot' | 'buyers_premium' | 'tax' | 'receipt' | 'charge' | 'fee';
  label: string;
  amount: number;
  isRefundable?: boolean;
}

export interface SettlementLotItem {
  id: string;
  lotNumber: number;
  title: string;
  status: 'Sold' | 'Unsold' | 'Passed';
  qtySold: number;
  isShipped: boolean;
  entries: SettlementEntry[];
}

export interface SettlementCharge {
  id: string;
  account: string;
  description: string;
  amount: number;
  type: 'seller' | 'buyer';
  date: string;
}

export interface SettlementCustomer {
  id: string;
  auctionId: string;
  bidderNumber: string; // e.g. "1000", "2001", "HOUSE"
  name: string;
  isSeller: boolean;
  isCashBuyer: boolean;
  lotCount: number;
  shippedCount: number;
  totalLotsCount: number;
  balance: number;
  invoiceNumber: string;
  invoiceStatus: 'Pending' | 'Paid' | 'Processing';
  shippingRequested: boolean;
  lots: SettlementLotItem[];
  charges: SettlementCharge[];
}

export interface AuctionDetail {
  id: string;
  code: string;
  name: string;
  description: string;
  auctionType: 'HiBid' | 'Other Auctions';
  status: AuctionStatusType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  paymentInfo: string;
  taxExemptAll: boolean;
  currency: string;
  liveStartingBidCard: number;
  terms: string;
  shortBpExplanation: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  useConsolidatedInvoicing: boolean;

  // Shipping / Buyer Charges
  shippingAvailability: 'Shipping Offered On All Lots' | 'Selected Lots Only' | 'No Shipping';
  shippingAccount: string;
  addHandlingCharge: boolean;
  handlingChargeType: 'Fixed' | 'Percentage';
  handlingAmount: number;

  // Featured Images
  featuredImages: FeaturedImage[];

  // Auction Links
  auctionLinks: AuctionLink[];

  // New Lot Defaults
  lotDefaults: {
    commission: string;
    buyerTax: string;
    buyerPremium: string;
    sellerTax: string;
    buyerLotCharge1: string;
    buyerLotCharge2: string;
  };

  // Upload Settings
  uploadSettings: {
    previewDateTimes: string;
    auctionDateTimes: string;
    checkoutDateTimes: string;
    paymentInfo: string;
    shippingPickup: string;
    ccRegistrationType: 'Authentication' | 'Verification' | 'Contact Info Only' | 'No Registration';
    authDays: number;
    acceptedCards: {
      mastercard: boolean;
      visa: boolean;
      amex: boolean;
      discover: boolean;
    };
    biddingNotice: string;
    auctionNotice: string;
    biddingType: 'No Internet Bidding' | 'Absentee Bidding' | 'Internet Only Auction' | 'Webcast';
    minBidType: 'Public Bidding' | 'Sealed Bid';
    bidAmountType: 'Maximum Bidding' | 'Fixed / Flat Bidding';
    timezone: string;
    openBiddingDate: string;
    openBiddingTime: string;
    closeBiddingDate: string;
    closeBiddingTime: string;
    softCloseSeconds: number;
    autoSyncStagger: boolean;
    showImmediateBidStatus: boolean;
    hideBidderUsernames: boolean;
    allowRetractBids: boolean;
  };

  // Expenses
  expenses: AuctionExpense[];

  // Auction Day Stats & Data
  dayStats: {
    lotCount: number;
    checkInCount: number;
    uniqueSellers: number;
    presaleMin: number;
    presaleMax: number;
    avgEstimate: number;
    avgSalesPrice: number;
    hibidUrl: string;
    siteStats: HiBidSiteStat[];
    registrations: BidderRegistration[];
    lotStats: AuctionLotStat[];
    alternateBids: AlternateBid[];
  };

  // Settlements
  settlements: SettlementCustomer[];
}
