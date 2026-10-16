export interface BidRecord {
  id: string;
  lotId: string;
  amount: number;
  bidderMasked: string; // e.g. "Paddle #194", "Paddle #332"
  bidderPaddle?: string;
  timestamp: string; // e.g. "14:21:40 EST"
  timeSecondsAgo: number;
  origin: 'webcast' | 'floor' | 'phone' | 'absentee';
  isLeading?: boolean;
  isCurrentUser?: boolean;
}

export interface LotGalleryImage {
  id: string;
  url: string;
  caption: string;
  alt: string;
  thumbnailUrl?: string;
}

export interface EnrichedLotItem {
  id: string;
  lotNumber: string;
  catalogIndex: number;
  sessionTitle: string;
  categoryTag: string;
  department: string;
  title: string;
  subtitle?: string;
  artistName?: string;
  artworkTitle?: string;
  artworkMediumSpecs?: string;
  artworkCanvasStructure?: string;
  artworkFrameSpecs?: string;
  artworkInscriptions?: string;
  carnegieExhibition?: string;
  frickMuseum?: string;
  permanentMuseum?: string;
  catalogRaisonne?: string;
  sensorCaptureLabel?: string;
  description: string;
  details: string;
  images: LotGalleryImage[];
  currentBid: number;
  startingBid: number;
  nextBid: number;
  bidIncrement: number;
  estimateLow: number;
  estimateHigh: number;
  bidsCount: number;
  reserveMet: boolean;
  reserveAmountDisclosed: boolean;
  timeRemainingSeconds: number;
  initialTimeRemainingSeconds: number;
  closingTimeLabel?: string;
  provenance: string;
  conditionReport: string;
  dimensions?: string;
  weightFineness?: string;
  specialistNote: string;
  specialistName: string;
  specialistTitle: string;
  consignorProvenance: string;
  isAutoExtendEnabled: boolean;
  autoExtendCount: number;
  lastExtensionTimestamp?: number;
  initialBids: BidRecord[];
  isClosed?: boolean;
  winnerPaddle?: string;
  hammerPrice?: number;
}

export interface SettlementBreakdown {
  hammerPrice: number;
  buyersPremium: number;
  buyersPremiumRate: number;
  estimatedTax: number;
  estimatedTotal: number;
}
