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
  },
  {
    id: 'lot-705',
    lotNumber: 'LOT 705',
    categoryTag: 'INVESTMENT GRADE BULLION',
    department: 'Gold & Bullion',
    title: 'Credit Suisse 1 Kilo (32.15 oz) .9999 Fine Gold Bar',
    description: 'Stamped Essayeur Fondeur hallmark, serial #123456, sealed in original assay sleeve.',
    details: 'Poured 1-kilogram investment bar of pure .9999 gold (99.99% purity) manufactured by Credit Suisse, Valcambi refinery. Accompanied by official refinery certificate of authenticity.',
    image: '/images/gold_bullion.jpg',
    currentBid: 74500,
    startingBid: 68000,
    nextBid: 75000,
    bidIncrement: 500,
    estimateLow: 74000,
    estimateHigh: 80000,
    bidsCount: 42,
    reserveMet: true,
    timeRemainingSeconds: 1650, // ~27m 30s
    provenance: 'Corporate depository liquidation, Pittsburgh financial trust.',
    conditionReport: 'Mint condition in undisturbed factory tamper-evident security packaging.',
    dimensions: 'Weight: 1,000 grams (32.15 troy oz) · Purity: .9999 Fine Gold',
    specialistNote: 'Immediate vault delivery or insured Brinks armed transport available upon settlement.'
  },
  {
    id: 'lot-706',
    lotNumber: 'LOT 706',
    categoryTag: 'CERTIFIED CARSON CITY / SAN FRANCISCO',
    department: 'Coins & Currency',
    title: '1881-S Morgan Silver Dollar NGC MS65 DPL',
    description: 'Deep prooflike mirrors with frost cameo portrait, untoned satiny fields.',
    details: 'Remarkable strike sharpness with needlepoint hair strands over Liberty\'s ear and flawless eagle breast plumage on reverse. Deep mirror reflection exceeds 4 inches on both faces.',
    image: '/images/morgan_dollar.jpg',
    currentBid: 950,
    startingBid: 500,
    nextBid: 1000,
    bidIncrement: 50,
    estimateLow: 900,
    estimateHigh: 1300,
    bidsCount: 14,
    reserveMet: true,
    timeRemainingSeconds: 1980, // ~33m 00s
    provenance: 'Acquired from the Continental Illinois Bank Hoard (1982).',
    conditionReport: 'NGC MS65 Deep Prooflike. Unblemished open fields with exceptional eye appeal.',
    dimensions: 'Diameter: 38.1mm · Weight: 26.73 grams · .900 Fine Silver',
    specialistNote: 'Highly sought-after branch mint issue in top tier prooflike state.'
  },
  {
    id: 'lot-707',
    lotNumber: 'LOT 707',
    categoryTag: 'VICTORIAN STERLING SILVER',
    department: 'Americana & Antiques',
    title: 'Victorian Repoussé Sterling Silver 5-Piece Tea & Coffee Service, c. 1880',
    description: 'Chased floral scrolls, ivory insulators, cast floral finials, 114 oz troy total.',
    details: 'Comprising a coffee pot, teapot, covered sugar urn, cream jug, and waste bowl. Elaborately repoussé-chased with morning glories, acanthus leaves, and blank cartouches.',
    image: '/images/antique_silver.jpg',
    currentBid: 4200,
    startingBid: 2500,
    nextBid: 4400,
    bidIncrement: 200,
    estimateLow: 4000,
    estimateHigh: 6000,
    bidsCount: 21,
    reserveMet: true,
    timeRemainingSeconds: 2240, // ~37m 20s
    provenance: 'Estate of Governor William A. Stone family, Allegheny County, PA.',
    conditionReport: 'Complete set in pristine condition. No monograms removed; hallmarks struck clearly on bases.',
    dimensions: 'Coffee pot height: 11.5 inches · Total weight: 114.2 Troy Ounces .925 Sterling',
    specialistNote: 'Accompanied by fitted flannel storage sleeves from J.E. Caldwell & Co.'
  },
  {
    id: 'lot-708',
    lotNumber: 'LOT 708',
    categoryTag: 'MUSEUM GEM NUMISMATIC',
    department: 'Coins & Currency',
    title: '1907 $20 Saint-Gaudens High Relief Wire Rim PCGS MS65+ CAC',
    description: 'Golden roman satin luster, fully struck drapery and rays, CAC green sticker.',
    details: 'Masterwork of American numismatics created by Augustus Saint-Gaudens by personal commission of President Theodore Roosevelt. Highest artistic relief authorized for US gold coinage.',
    image: '/images/hero_coin.jpg',
    currentBid: 18500,
    startingBid: 12000,
    nextBid: 19000,
    bidIncrement: 500,
    estimateLow: 18000,
    estimateHigh: 22000,
    bidsCount: 34,
    reserveMet: true,
    timeRemainingSeconds: 2600, // ~43m 20s
    provenance: 'Ex. John H. Clapp Collection (1942); Private Sewickley Heights Estate.',
    conditionReport: 'PCGS MS65+ CAC. Exceptional strike definition with blazing satiny gold surfaces.',
    dimensions: 'Diameter: 34mm · Weight: 33.436 grams · .900 Fine Gold',
    specialistNote: 'One of the finest certified High Reliefs to appear at Pennsylvania auction this decade.'
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
