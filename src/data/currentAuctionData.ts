import type { LotItem, CuratedEvent } from './auctionData';

export interface BidEntry {
  id: string;
  paddle: string;
  type: 'WEBCAST' | 'FLOOR' | 'PHONE' | 'APP' | 'ABSENTEE';
  time: string;
  amount: number;
  isHighest?: boolean;
}

export type CategoryKey = 'all' | 'coins' | 'jewelry' | 'art' | 'antiques' | 'horology' | 'americana' | 'decorative';

export interface CatalogLot {
  id: string;
  lotNumber: string;
  categoryTag: string;
  categoryKey: CategoryKey;
  title: string;
  description: string;
  currentBid: number;
  bidsCount: number;
  buttonVariant: 'gold' | 'dark';
  isEndingSoon: boolean;
  isFeatured: boolean;
  artType:
    | 'gold-slab'
    | 'silver-slab'
    | 'ring'
    | 'urn'
    | 'painting'
    | 'watch'
    | 'gold-coin'
    | 'bracelet'
    | 'nocturne'
    | 'bureau'
    | 'chronograph'
    | 'manuscript';
  image: string;
  estimate: string;
  presets: number[];
  recentBids: BidEntry[];
  sellerName?: string;
  quantity?: number;
}

export interface CurrentAuction extends CuratedEvent {
  id: string;
  title: string;
  sessionTitle: string;
  auctionType: 'Online Only Auction' | 'Live Webcast Auction' | 'In-Room & Online';
  status: 'Live Webcast Auction' | 'Closing Today' | 'Catalog Open' | 'Active Live Bidding';
  badge: string;
  badgeType: 'gold' | 'red' | 'green';
  companyName: string;
  galleryName: string;
  address: string;
  cityStateZip: string;
  location: string;
  dateRange: string;
  dateLabel: string;
  scheduleText: string;
  typeTag: string;
  category: string;
  description: string;
  estimate: string;
  lotsCount: number;
  buttonText: string;
  buttonVariant: 'gold' | 'dark' | 'outline';
  image: string;
  detailUrl: string;
  lots: CatalogLot[];
}

export const INITIAL_CATALOG_LOTS: CatalogLot[] = [
  {
    id: 'spotlight-104',
    lotNumber: 'LOT 104',
    categoryTag: 'COINS & CURRENCY',
    categoryKey: 'coins',
    title: '1924 Saint-Gaudens Gold Eagle',
    description: 'A beautifully preserved $20 gold coin, graded MS-64.',
    sellerName: 'Philadelphia Estate Consignor',
    quantity: 1,
    currentBid: 17200,
    bidsCount: 12,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: true,
    artType: 'gold-slab',
    image: '/images/hero_coin.jpg',
    estimate: '$18,060 – $22,016',
    presets: [100, 250, 500],
    recentBids: [
      { id: 'b104-1', paddle: 'Paddle #194', type: 'WEBCAST', time: '3:32:14 PM', amount: 17200, isHighest: true },
      { id: 'b104-2', paddle: 'Paddle #332', type: 'FLOOR', time: '3:31:02 PM', amount: 17100 },
      { id: 'b104-3', paddle: 'Paddle #205', type: 'PHONE', time: '3:28:46 PM', amount: 17000 },
      { id: 'b104-4', paddle: 'Paddle #147', type: 'WEBCAST', time: '3:26:19 PM', amount: 16900 },
      { id: 'b104-5', paddle: 'Paddle #106', type: 'FLOOR', time: '3:22:51 PM', amount: 16800 }
    ]
  },
  {
    id: 'lot-701',
    lotNumber: 'LOT 701',
    categoryTag: 'COINS & CURRENCY',
    categoryKey: 'coins',
    title: '1889 Morgan Silver Dollar',
    description: 'A classic Morgan dollar in a certified collector grade.',
    currentBid: 1420,
    bidsCount: 8,
    buttonVariant: 'gold',
    isEndingSoon: true,
    isFeatured: false,
    artType: 'silver-slab',
    image: '/images/morgan_dollar.jpg',
    estimate: '$1,400 – $1,800',
    presets: [50, 100, 200],
    recentBids: [
      { id: 'b701-1', paddle: 'Paddle #217', type: 'FLOOR', time: '3:30:10 PM', amount: 1420, isHighest: true },
      { id: 'b701-2', paddle: 'Paddle #183', type: 'WEBCAST', time: '3:27:00 PM', amount: 1400 },
      { id: 'b701-3', paddle: 'Paddle #441', type: 'WEBCAST', time: '3:23:45 PM', amount: 1350 },
      { id: 'b701-4', paddle: 'Paddle #319', type: 'FLOOR', time: '3:18:20 PM', amount: 1300 },
      { id: 'b701-5', paddle: 'Paddle #112', type: 'PHONE', time: '3:12:00 PM', amount: 1250 }
    ]
  },
  {
    id: 'lot-702',
    lotNumber: 'LOT 702',
    categoryTag: 'JEWELRY & WATCHES',
    categoryKey: 'jewelry',
    title: 'Edwardian Diamond Ring',
    description: 'Old European-cut diamonds in a delicate platinum setting.',
    currentBid: 8500,
    bidsCount: 19,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: true,
    artType: 'ring',
    image: '/images/diamond_ring.jpg',
    estimate: '$9,000 – $12,000',
    presets: [100, 250, 500],
    recentBids: [
      { id: 'b702-1', paddle: 'Paddle #412', type: 'WEBCAST', time: '3:33:05 PM', amount: 8500, isHighest: true },
      { id: 'b702-2', paddle: 'Paddle #108', type: 'FLOOR', time: '3:29:12 PM', amount: 8400 },
      { id: 'b702-3', paddle: 'Paddle #290', type: 'PHONE', time: '3:25:30 PM', amount: 8200 },
      { id: 'b702-4', paddle: 'Paddle #311', type: 'WEBCAST', time: '3:20:10 PM', amount: 8000 },
      { id: 'b702-5', paddle: 'Paddle #154', type: 'FLOOR', time: '3:15:00 PM', amount: 7800 }
    ]
  },
  {
    id: 'lot-703',
    lotNumber: 'LOT 703',
    categoryTag: 'ANTIQUES & SILVER',
    categoryKey: 'antiques',
    title: 'American Silver Tea Service',
    description: 'Four-piece sterling set with chased floral motifs.',
    currentBid: 5200,
    bidsCount: 14,
    buttonVariant: 'gold',
    isEndingSoon: true,
    isFeatured: false,
    artType: 'urn',
    image: '/images/antique_silver.jpg',
    estimate: '$5,500 – $7,500',
    presets: [100, 200, 500],
    recentBids: [
      { id: 'b703-1', paddle: 'Paddle #409', type: 'FLOOR', time: '3:31:15 PM', amount: 5200, isHighest: true },
      { id: 'b703-2', paddle: 'Paddle #233', type: 'WEBCAST', time: '3:28:00 PM', amount: 5000 },
      { id: 'b703-3', paddle: 'Paddle #340', type: 'PHONE', time: '3:22:12 PM', amount: 4800 },
      { id: 'b703-4', paddle: 'Paddle #118', type: 'ABSENTEE', time: '3:15:00 PM', amount: 4500 },
      { id: 'b703-5', paddle: 'Paddle #201', type: 'WEBCAST', time: '3:08:40 PM', amount: 4200 }
    ]
  },
  {
    id: 'lot-704',
    lotNumber: 'LOT 704',
    categoryTag: 'FINE ART',
    categoryKey: 'art',
    title: 'River at Dusk, c. 1912',
    description: 'Aaron Harry Gorson · oil on linen · framed 41 x 47 in.',
    currentBid: 6200,
    bidsCount: 11,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: true,
    artType: 'painting',
    image: '/images/gorson_painting.jpg',
    estimate: '$7,000 – $10,000',
    presets: [100, 250, 500],
    recentBids: [
      { id: 'b704-1', paddle: 'Paddle #194', type: 'WEBCAST', time: '3:31:49 PM', amount: 6200, isHighest: true },
      { id: 'b704-2', paddle: 'Paddle #332', type: 'FLOOR', time: '3:30:16 PM', amount: 5800 },
      { id: 'b704-3', paddle: 'Paddle #205', type: 'PHONE', time: '3:28:42 PM', amount: 5200 },
      { id: 'b704-4', paddle: 'Paddle #147', type: 'WEBCAST', time: '3:26:12 PM', amount: 4500 },
      { id: 'b704-5', paddle: 'Paddle #106', type: 'APP', time: '3:20:05 PM', amount: 3500 }
    ]
  },
  {
    id: 'lot-705',
    lotNumber: 'LOT 705',
    categoryTag: 'JEWELRY & WATCHES',
    categoryKey: 'jewelry',
    title: '18k Gold Pocket Watch',
    description: 'Swiss movement in a finely engraved gold case.',
    currentBid: 3950,
    bidsCount: 7,
    buttonVariant: 'gold',
    isEndingSoon: true,
    isFeatured: false,
    artType: 'watch',
    image: '/images/grandfather_clock.jpg',
    estimate: '$4,200 – $5,800',
    presets: [50, 100, 250],
    recentBids: [
      { id: 'b705-1', paddle: 'Paddle #314', type: 'WEBCAST', time: '3:30:00 PM', amount: 3950, isHighest: true },
      { id: 'b705-2', paddle: 'Paddle #119', type: 'FLOOR', time: '3:26:40 PM', amount: 3800 },
      { id: 'b705-3', paddle: 'Paddle #227', type: 'PHONE', time: '3:22:15 PM', amount: 3600 },
      { id: 'b705-4', paddle: 'Paddle #104', type: 'WEBCAST', time: '3:16:30 PM', amount: 3400 },
      { id: 'b705-5', paddle: 'Paddle #402', type: 'FLOOR', time: '3:10:00 PM', amount: 3200 }
    ]
  },
  {
    id: 'lot-706',
    lotNumber: 'LOT 706',
    categoryTag: 'COINS & CURRENCY',
    categoryKey: 'coins',
    title: '1907 $10 Indian Head Eagle',
    description: 'No Motto variety struck in Philadelphia. Rich honey luster.',
    currentBid: 9400,
    bidsCount: 15,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: true,
    artType: 'gold-coin',
    image: '/images/gold_bullion.jpg',
    estimate: '$10,000 – $13,500',
    presets: [100, 250, 500],
    recentBids: [
      { id: 'b706-1', paddle: 'Paddle #177', type: 'WEBCAST', time: '3:29:10 PM', amount: 9400, isHighest: true },
      { id: 'b706-2', paddle: 'Paddle #320', type: 'FLOOR', time: '3:24:00 PM', amount: 9200 },
      { id: 'b706-3', paddle: 'Paddle #218', type: 'PHONE', time: '3:19:30 PM', amount: 8900 }
    ]
  },
  {
    id: 'lot-707',
    lotNumber: 'LOT 707',
    categoryTag: 'JEWELRY & WATCHES',
    categoryKey: 'jewelry',
    title: 'Art Deco Sapphire Bracelet',
    description: 'Platinum link bracelet with calibre-cut French blue sapphires.',
    currentBid: 11800,
    bidsCount: 22,
    buttonVariant: 'gold',
    isEndingSoon: true,
    isFeatured: true,
    artType: 'bracelet',
    image: '/images/diamond_ring.jpg',
    estimate: '$12,500 – $16,000',
    presets: [250, 500, 1000],
    recentBids: [
      { id: 'b707-1', paddle: 'Paddle #415', type: 'WEBCAST', time: '3:32:00 PM', amount: 11800, isHighest: true },
      { id: 'b707-2', paddle: 'Paddle #204', type: 'FLOOR', time: '3:28:15 PM', amount: 11500 },
      { id: 'b707-3', paddle: 'Paddle #339', type: 'PHONE', time: '3:20:45 PM', amount: 11000 }
    ]
  },
  {
    id: 'lot-708',
    lotNumber: 'LOT 708',
    categoryTag: 'FINE ART',
    categoryKey: 'art',
    title: 'Monongahela Steelworks, 1916',
    description: 'A.H. Gorson nocturnal oil on canvas in original giltwood frame.',
    currentBid: 7500,
    bidsCount: 13,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: false,
    artType: 'nocturne',
    image: '/images/gorson_painting.jpg',
    estimate: '$8,000 – $11,500',
    presets: [100, 250, 500],
    recentBids: [
      { id: 'b708-1', paddle: 'Paddle #102', type: 'WEBCAST', time: '3:26:00 PM', amount: 7500, isHighest: true },
      { id: 'b708-2', paddle: 'Paddle #388', type: 'FLOOR', time: '3:21:10 PM', amount: 7200 }
    ]
  },
  {
    id: 'lot-709',
    lotNumber: 'LOT 709',
    categoryTag: 'ANTIQUES & SILVER',
    categoryKey: 'antiques',
    title: 'Chippendale Mahogany Bureau',
    description: 'Philadelphia cabinetmaker origin with carved fluted quarter-columns.',
    currentBid: 6800,
    bidsCount: 9,
    buttonVariant: 'gold',
    isEndingSoon: true,
    isFeatured: false,
    artType: 'bureau',
    image: '/images/grandfather_clock.jpg',
    estimate: '$7,200 – $9,800',
    presets: [100, 200, 500],
    recentBids: [
      { id: 'b709-1', paddle: 'Paddle #219', type: 'FLOOR', time: '3:25:40 PM', amount: 6800, isHighest: true },
      { id: 'b709-2', paddle: 'Paddle #140', type: 'WEBCAST', time: '3:18:20 PM', amount: 6500 }
    ]
  },
  {
    id: 'lot-710',
    lotNumber: 'LOT 710',
    categoryTag: 'HOROLOGY & TIMEPIECES',
    categoryKey: 'horology',
    title: 'Patek Philippe 18k Chronograph',
    description: 'Manual-wind vintage chronograph with original factory archival papers.',
    currentBid: 24500,
    bidsCount: 28,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: true,
    artType: 'chronograph',
    image: '/images/grandfather_clock.jpg',
    estimate: '$26,000 – $34,000',
    presets: [500, 1000, 2500],
    recentBids: [
      { id: 'b710-1', paddle: 'Paddle #490', type: 'WEBCAST', time: '3:33:40 PM', amount: 24500, isHighest: true },
      { id: 'b710-2', paddle: 'Paddle #105', type: 'FLOOR', time: '3:31:00 PM', amount: 24000 },
      { id: 'b710-3', paddle: 'Paddle #312', type: 'PHONE', time: '3:27:15 PM', amount: 23000 }
    ]
  },
  {
    id: 'lot-711',
    lotNumber: 'LOT 711',
    categoryTag: 'AMERICANA & MANUSCRIPTS',
    categoryKey: 'americana',
    title: 'PA 1776 Continental Broadsheet',
    description: 'Rare Philadelphia imprint with embossed state paper seal.',
    currentBid: 14200,
    bidsCount: 16,
    buttonVariant: 'gold',
    isEndingSoon: true,
    isFeatured: true,
    artType: 'manuscript',
    image: '/images/art_gallery.jpg',
    estimate: '$15,000 – $20,000',
    presets: [250, 500, 1000],
    recentBids: [
      { id: 'b711-1', paddle: 'Paddle #288', type: 'WEBCAST', time: '3:30:15 PM', amount: 14200, isHighest: true },
      { id: 'b711-2', paddle: 'Paddle #199', type: 'FLOOR', time: '3:22:00 PM', amount: 13800 }
    ]
  },
  {
    id: 'lot-712',
    lotNumber: 'LOT 712',
    categoryTag: 'MID-CENTURY & DECORATIVE',
    categoryKey: 'decorative',
    title: 'Mid-Century Bronze Studio Vessel',
    description: 'Signed studio bronze with cast geometric relief, c. 1958.',
    currentBid: 3400,
    bidsCount: 10,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: false,
    artType: 'urn',
    image: '/images/antique_silver.jpg',
    estimate: '$3,600 – $4,800',
    presets: [100, 200, 500],
    recentBids: [
      { id: 'b712-1', paddle: 'Paddle #166', type: 'WEBCAST', time: '3:24:30 PM', amount: 3400, isHighest: true },
      { id: 'b712-2', paddle: 'Paddle #315', type: 'FLOOR', time: '3:17:00 PM', amount: 3200 }
    ]
  },
  {
    id: 'lot-713',
    lotNumber: 'LOT 713',
    categoryTag: 'HOROLOGY & TIMEPIECES',
    categoryKey: 'horology',
    title: 'Vintage 1968 Chronometer',
    description: 'Gilt-brass balance with hand-turned guilloché dial and alligator strap.',
    currentBid: 8900,
    bidsCount: 15,
    buttonVariant: 'gold',
    isEndingSoon: true,
    isFeatured: false,
    artType: 'chronograph',
    image: '/images/grandfather_clock.jpg',
    estimate: '$9,500 – $13,000',
    presets: [100, 250, 500],
    recentBids: [
      { id: 'b713-1', paddle: 'Paddle #302', type: 'WEBCAST', time: '3:31:20 PM', amount: 8900, isHighest: true },
      { id: 'b713-2', paddle: 'Paddle #185', type: 'FLOOR', time: '3:27:00 PM', amount: 8700 }
    ]
  },
  {
    id: 'lot-714',
    lotNumber: 'LOT 714',
    categoryTag: 'FINE ART',
    categoryKey: 'art',
    title: 'Moonlit Harbor at Low Tide',
    description: 'Late 19th-century atmospheric marine oil on canvas in ornate period frame.',
    currentBid: 11200,
    bidsCount: 18,
    buttonVariant: 'gold',
    isEndingSoon: false,
    isFeatured: true,
    artType: 'painting',
    image: '/images/gorson_painting.jpg',
    estimate: '$12,000 – $16,500',
    presets: [250, 500, 1000],
    recentBids: [
      { id: 'b714-1', paddle: 'Paddle #419', type: 'WEBCAST', time: '3:33:10 PM', amount: 11200, isHighest: true },
      { id: 'b714-2', paddle: 'Paddle #210', type: 'FLOOR', time: '3:29:45 PM', amount: 10800 }
    ]
  }
];

export const CURRENT_AUCTIONS: CurrentAuction[] = [
  {
    id: 'current-auction-numismatics',
    title: 'Spring Collector Auction — Session II: Rarities of the United States Mint',
    sessionTitle: 'Session II: Rarities of the United States Mint',
    auctionType: 'Live Webcast Auction',
    status: 'Active Live Bidding',
    badge: '● SPOTLIGHT LIVE EVENT',
    badgeType: 'red',
    companyName: 'Gardner Auction Appraisers',
    galleryName: 'Sovereign Galleries',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    location: 'Pittsburgh, PA Gallery & Online Webcast',
    dateRange: 'Active Session Live Webcast — Ends Today',
    dateLabel: 'CLOSING TODAY · 4:30 PM EST',
    scheduleText: 'Live Gavel in Progress',
    typeTag: 'LIVE FLOOR & WEBCAST',
    category: 'Coins & Currency',
    description:
      'Featuring certified private vault numismatics including 1924 Saint-Gaudens Double Eagle, 1889 Morgan Silver Dollar, and 1907 Indian Head Eagle with verified CAC gold shield.',
    estimate: 'Est. $840,000 – $1,140,000',
    lotsCount: 362,
    buttonText: 'VIEW LOTS & PRE-BID',
    buttonVariant: 'gold',
    image: '/images/hero_coin.jpg',
    detailUrl: '#auctions',
    lots: INITIAL_CATALOG_LOTS.filter((l) => l.categoryKey === 'coins')
  },
  {
    id: 'current-auction-jewelry',
    title: 'Spring Fine Estate Jewelry, Diamond Solitaires & Vintage Horology',
    sessionTitle: 'Session III: Estate Jewelry & Horology',
    auctionType: 'Online Only Auction',
    status: 'Closing Today',
    badge: 'ONLINE-ONLY CATALOG EVENT',
    badgeType: 'gold',
    companyName: 'Gardner Auction Appraisers',
    galleryName: 'Sovereign Galleries',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    location: 'Pittsburgh, PA Gallery & Online Webcast',
    dateRange: 'Active Timed Bidding — Closing Today',
    dateLabel: 'AGGREGATE VALUE',
    scheduleText: 'Timed Catalog Bidding',
    typeTag: 'TIMED ONLINE BIDDING',
    category: 'Jewelry & Watches',
    description:
      'Exceptional estate liquidation including Edwardian Old European diamond rings, Art Deco calibre sapphire bracelets, and rare Patek Philippe & chronometer manual-wind timepieces.',
    estimate: 'Est. $1,250,000 – $1,650,000',
    lotsCount: 262,
    buttonText: 'ENTER AUCTION CATALOG',
    buttonVariant: 'dark',
    image: '/images/diamond_ring.jpg',
    detailUrl: '#auctions',
    lots: INITIAL_CATALOG_LOTS.filter((l) => l.categoryKey === 'jewelry' || l.categoryKey === 'horology')
  },
  {
    id: 'current-auction-art-americana',
    title: 'Curated American Fine Art, 1776 Broadsheets & Period Antiques',
    sessionTitle: 'Session IV: Fine Art & Americana',
    auctionType: 'In-Room & Online',
    status: 'Catalog Open',
    badge: 'CATALOG OPEN',
    badgeType: 'green',
    companyName: 'Gardner Auction Appraisers',
    galleryName: 'Sovereign Galleries',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    location: 'Pittsburgh, PA Gallery & Online Webcast',
    dateRange: 'Active Catalog Open — In-Room & Webcast',
    dateLabel: 'SUNDAY, OCT 19',
    scheduleText: 'Exhibition Open',
    typeTag: 'IN-ROOM & WEBCAST',
    category: 'Fine Art & Antiques',
    description:
      'Highlighted by Aaron Harry Gorson oil nocturnes, 1776 Pennsylvania Continental broadsheet, Philadelphia Chippendale bureau, and museum-grade sterling silver tea services.',
    estimate: 'Est. $740,000 – $980,000',
    lotsCount: 290,
    buttonText: 'REQUEST CONDITION',
    buttonVariant: 'outline',
    image: '/images/gorson_painting.jpg',
    detailUrl: '#auctions',
    lots: INITIAL_CATALOG_LOTS.filter(
      (l) =>
        l.categoryKey === 'art' ||
        l.categoryKey === 'americana' ||
        l.categoryKey === 'antiques' ||
        l.categoryKey === 'decorative'
    )
  }
];

/**
 * Adapter that converts a CatalogLot into a LotItem format for unified lot browsing.
 */
export const adaptCatalogLotToLotItem = (lot: CatalogLot): LotItem => {
  const parseEstimate = (estStr: string) => {
    const nums = estStr.replace(/[^0-9–-]/g, '').split(/[–-]/);
    const low = nums[0] ? parseInt(nums[0], 10) : Math.round(lot.currentBid * 0.9);
    const high = nums[1] ? parseInt(nums[1], 10) : Math.round(lot.currentBid * 1.3);
    return { low, high };
  };

  const { low, high } = parseEstimate(lot.estimate);

  const departmentMap: Record<CategoryKey, string> = {
    all: 'General Catalog',
    coins: 'Coins & Currency',
    jewelry: 'Jewelry & Watches',
    art: 'Fine Art & Prints',
    antiques: 'Americana & Antiques',
    horology: 'Jewelry & Watches',
    americana: 'Americana & Antiques',
    decorative: 'Fine Art & Prints'
  };

  return {
    id: lot.id,
    lotNumber: lot.lotNumber,
    categoryTag: lot.categoryTag,
    department: departmentMap[lot.categoryKey] || 'Coins & Currency',
    title: lot.title,
    description: lot.description,
    details: `${lot.title} — ${lot.description} Presented in Session II of the Gardner Current Auction. Verified authentic by licensed auction appraisers.`,
    image: lot.image,
    currentBid: lot.currentBid,
    startingBid: Math.round(lot.currentBid * 0.7),
    nextBid: lot.currentBid + (lot.presets[0] || 100),
    bidIncrement: lot.presets[0] || 100,
    estimateLow: low,
    estimateHigh: high,
    bidsCount: lot.bidsCount,
    reserveMet: true,
    timeRemainingSeconds: lot.isEndingSoon ? 450 : 3600,
    closingTimeLabel: lot.isEndingSoon ? 'CLOSING TODAY' : 'ACTIVE SESSION',
    provenance: 'Consigned from a private Pennsylvania estate vault collection.',
    conditionReport: 'Exemplary specimen condition. Inspected and verified authentic.',
    specialistNote: 'Offered with official certificate of appraisal and provenance.'
  };
};

export const CURRENT_AUCTION_LOT_ITEMS: LotItem[] = INITIAL_CATALOG_LOTS.map(adaptCatalogLotToLotItem);
