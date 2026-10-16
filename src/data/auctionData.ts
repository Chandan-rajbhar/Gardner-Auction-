export interface LotItem {
  id: string;
  lotNumber: string;
  categoryTag: string;
  department: string;
  title: string;
  description: string;
  details: string;
  image: string;
  currentBid: number;
  startingBid: number;
  nextBid: number;
  bidIncrement: number;
  estimateLow: number;
  estimateHigh: number;
  bidsCount: number;
  reserveMet: boolean;
  timeRemainingSeconds: number;
  closingTimeLabel?: string;
  provenance: string;
  conditionReport: string;
  dimensions?: string;
  specialistNote: string;
}

export interface CuratedEvent {
  id: string;
  badge: string;
  badgeType: 'gold' | 'red' | 'green';
  lotsCount: number;
  typeTag: string;
  title: string;
  description: string;
  estimate: string;
  dateLabel: string;
  buttonText: string;
  buttonVariant: 'dark' | 'gold' | 'outline';
  image: string;
}

export interface Department {
  id: string;
  name: string;
  lotsCount: number;
  iconName: string;
}

export const SPOTLIGHT_LOT: LotItem = {
  id: 'spotlight-104',
  lotNumber: 'LOT 104',
  categoryTag: 'UNITED STATES RARE NUMISMATICS',
  department: 'Coins & Currency',
  title: '1907 $20 Saint-Gaudens High Relief (PCGS MS-65+ CAC)',
  description: 'Wire-rim variety, exceptional satiny surfaces with radiant original roman gold luster.',
  details: 'Design by Augustus Saint-Gaudens. Struck in exceptionally high relief with lettered edge "E PLURIBUS UNUM". Verified by Certified Acceptance Corporation (CAC). Encapsulated in PCGS museum grade security slab with gold shield verification.',
  image: '/images/hero_coin.jpg',
  currentBid: 18500,
  startingBid: 12000,
  nextBid: 19000,
  bidIncrement: 500,
  estimateLow: 18000,
  estimateHigh: 22000,
  bidsCount: 34,
  reserveMet: true,
  timeRemainingSeconds: 9960, // 2h 46m 00s
  closingTimeLabel: 'CLOSING TODAY',
  provenance: 'Ex. John H. Clapp Collection (1942); Private Sewickley Heights Estate (1988-2026).',
  conditionReport: 'Superb Gem Uncirculated condition. PCGS MS-65+ CAC. Exceptional strike definition with needle-sharp feathers and gown drapery.',
  dimensions: 'Diameter: 34mm · Weight: 33.436 grams · .900 Fine Gold',
  specialistNote: 'One of fewer than 50 specimens with verified CAC green sticker in this grade tier.'
};

export const LIVE_LOTS: LotItem[] = [
  {
    id: 'lot-701',
    lotNumber: 'LOT 701',
    categoryTag: 'KEY DATE MORGAN DOLLAR',
    department: 'Coins & Currency',
    title: '1893-S Morgan Silver Dollar NGC VF30',
    description: 'Key date of the series. Strong rims, full reverse shield.',
    details: 'The undisputed premier key date of the Morgan silver dollar circulation strikes. Well-balanced medium dove-grey patina with darker slate toning around the stars and lettering.',
    image: '/images/morgan_dollar.jpg',
    currentBid: 1450,
    startingBid: 800,
    nextBid: 1500,
    bidIncrement: 50,
    estimateLow: 1400,
    estimateHigh: 1800,
    bidsCount: 16,
    reserveMet: true,
    timeRemainingSeconds: 522, // ~08m 42s
    provenance: 'Discovered in a Western Pennsylvania bank safe deposit box unopened since 1964.',
    conditionReport: 'NGC VF30 certified. Problem-free surfaces with wholesome honest wear for the assigned grade.',
    dimensions: 'Diameter: 38.1mm · .900 Fine Silver',
    specialistNote: 'Extremely scarce in all grades; genuinely uncleaned example.'
  },
  {
    id: 'lot-702',
    lotNumber: 'LOT 702',
    categoryTag: 'GIA CERTIFIED ESTATE',
    department: 'Jewelry & Watches',
    title: 'Art Deco 3.20ct Platinum Solitaire Diamond Ring',
    description: 'Old European cut, VS1 clarity, fine hand-engraved shank.',
    details: 'Featuring an exceptional 3.20-carat Old European cut diamond with K color, VS1 clarity, set in an intricately pierced and millgrained platinum mounting characteristic of the 1920s Edwardian-to-Deco transitional masters.',
    image: '/images/diamond_ring.jpg',
    currentBid: 8800,
    startingBid: 5000,
    nextBid: 9000,
    bidIncrement: 200,
    estimateLow: 8500,
    estimateHigh: 11000,
    bidsCount: 28,
    reserveMet: true,
    timeRemainingSeconds: 852, // ~14m 12s
    provenance: 'Heirloom estate of Eleanor M. Mellon, Fox Chapel, PA.',
    conditionReport: 'Mounting retains sharp piercing with crisp filigree. Central diamond is 100% natural, unenhanced, accompanied by full GIA dossier.',
    dimensions: 'Ring Size: 6.5 (sizable) · Total weight 5.4 grams Pt950',
    specialistNote: 'Exceptional fire and scintillation under incandescent gallery lighting.'
  },
  {
    id: 'lot-703',
    lotNumber: 'LOT 703',
    categoryTag: 'PENNSYLVANIA HOROLOGY',
    department: 'Americana & Antiques',
    title: 'Chippendale Walnut Tall Case Clock, c. 1785',
    description: 'Lancaster County, PA origin, eight-day brass moon dial movement.',
    details: 'Attributed to the Lancaster County school of cabinetmakers with rosettes, fluted quarter-columns, and bracket feet. The arched brass dial features painted phases of the moon and subsidiary seconds register.',
    image: '/images/grandfather_clock.jpg',
    currentBid: 3500,
    startingBid: 2000,
    nextBid: 3700,
    bidIncrement: 200,
    estimateLow: 3500,
    estimateHigh: 5000,
    bidsCount: 12,
    reserveMet: true,
    timeRemainingSeconds: 1199, // ~19m 59s
    provenance: 'By descent through five generations of the Hostetter family of Lititz, PA.',
    conditionReport: 'Original movement cleaned and oiled in 2021; strikes on the hour. Case possesses undisturbed 19th-century shellac finish.',
    dimensions: 'Height: 94 inches (7 ft 10 in) · Width: 20.5 inches · Depth: 11 inches',
    specialistNote: 'Retains both cast lead weights, original brass pendulum bob, and winding crank.'
  },
  {
    id: 'lot-704',
    lotNumber: 'LOT 704',
    categoryTag: 'AMERICAN IMPRESSIONISM',
    department: 'Fine Art & Prints',
    title: 'A.H. Gorson \'Golden Monongahela\' Oil on Canvas',
    description: 'Signed lower right. Provenance: Private Sewickley estate.',
    details: 'Masterpiece by Aaron Henry Gorson (American, 1872–1932) depicting the atmospheric night luminescence of blast furnaces over the Monongahela river in Pittsburgh. Housed in an authentic period gilded cove frame.',
    image: '/images/gorson_painting.jpg',
    currentBid: 6200,
    startingBid: 3500,
    nextBid: 6500,
    bidIncrement: 300,
    estimateLow: 6000,
    estimateHigh: 8500,
    bidsCount: 19,
    reserveMet: true,
    timeRemainingSeconds: 1330, // ~22m 10s
    provenance: 'Purchased directly from the artist, thence by descent; Sewickley, PA collection.',
    conditionReport: 'Oil on original unlined canvas. Minor stable craquelure consistent with age. Under UV light: no evident inpainting or restoration.',
    dimensions: 'Canvas: 24 x 30 inches · Framed: 33 x 39 inches',
    specialistNote: 'Prime subject matter by Pittsburgh\'s foremost nocturne industrial painter.'
  }
];

export const CURATED_EVENTS: CuratedEvent[] = [
  {
    id: 'event-1',
    badge: 'ONLINE-ONLY CATALOG EVENT',
    badgeType: 'gold',
    lotsCount: 362,
    typeTag: 'TIMED ONLINE BIDDING',
    title: 'Spring Fine Gold, Rare Coins & Bullion Showcase',
    description: 'Featuring an unsearched private Pittsburgh vault collection spanning pre-1933 U.S. gold, Morgan silver hoard, and investment-grade bullion.',
    estimate: 'Est. $840,000 – $1,140,000',
    dateLabel: 'AGGREGATE VALUE',
    buttonText: 'ENTER AUCTION CATALOG',
    buttonVariant: 'dark',
    image: '/images/gold_bullion.jpg'
  },
  {
    id: 'event-2',
    badge: '● SPOTLIGHT LIVE EVENT',
    badgeType: 'red',
    lotsCount: 485,
    typeTag: 'LIVE FLOOR & WEBCAST',
    title: 'Historic Americana & Estate Jewelry Collection',
    description: 'Exceptional Fox Chapel estate liquidation including GIA-certified diamond rings, 18k Patek Philippe pocket watches, and museum sterling silver.',
    estimate: 'Est. $1,250,000 – $1,650,000',
    dateLabel: 'OPENING SESSION 10:00 AM',
    buttonText: 'VIEW LOTS & PRE-BID',
    buttonVariant: 'gold',
    image: '/images/antique_silver.jpg'
  },
  {
    id: 'event-3',
    badge: 'CATALOG OPEN',
    badgeType: 'green',
    lotsCount: 290,
    typeTag: 'IN-ROOM & WEBCAST',
    title: 'Curated Fine Art & Mid-Century Antiques',
    description: 'Highlighted by Aaron Harry Gorson oil masterpieces, George Nakashima studio furnishings, and authenticated 18th-century decorative arts.',
    estimate: 'Est. $740,000 – $980,000',
    dateLabel: 'SUNDAY, OCT 19',
    buttonText: 'REQUEST CONDITION',
    buttonVariant: 'outline',
    image: '/images/art_gallery.jpg'
  }
];

export const DEPARTMENTS: Department[] = [
  { id: 'coins', name: 'Coins & Currency', lotsCount: 528, iconName: 'Coins' },
  { id: 'bullion', name: 'Gold & Bullion', lotsCount: 190, iconName: 'Boxes' },
  { id: 'jewelry', name: 'Jewelry & Watches', lotsCount: 262, iconName: 'Gem' },
  { id: 'americana', name: 'Americana & Antiques', lotsCount: 205, iconName: 'Clock' },
  { id: 'art', name: 'Fine Art & Prints', lotsCount: 143, iconName: 'Palette' },
  { id: 'memorabilia', name: 'Vintage Memorabilia', lotsCount: 192, iconName: 'Award' }
];
