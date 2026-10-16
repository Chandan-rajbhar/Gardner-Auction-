import type { EnrichedLotItem } from './types';

export const INITIAL_AUCTION_LOTS: EnrichedLotItem[] = [
  {
    id: 'spotlight-104',
    lotNumber: 'LOT 104',
    catalogIndex: 104,
    sessionTitle: 'Spring Fine Gold, Rare Numismatics & Americana Session 1',
    categoryTag: 'UNITED STATES RARE NUMISMATICS',
    department: 'Coins & Currency',
    title: '1907 $20 Saint-Gaudens High Relief (PCGS MS-65+ CAC)',
    subtitle: 'Wire-Rim Variety · Ex. John H. Clapp Collection · Verified CAC Gold Shield',
    description: 'Wire-rim variety, exceptional satiny surfaces with radiant original roman gold luster. Needle-sharp feathers and gown drapery struck under immense hydraulic pressure at the Philadelphia Mint.',
    details: 'Design by Augustus Saint-Gaudens under commission from President Theodore Roosevelt. Struck in exceptionally high relief with lettered edge "E PLURIBUS UNUM" punctuated by thirteen raised stars. Encapsulated in PCGS museum grade security slab with gold shield verification and green CAC endorsement.',
    images: [
      {
        id: 'img-104-obv',
        url: '/images/hero_coin.jpg',
        alt: '1907 $20 Saint-Gaudens High Relief Obverse View',
        caption: 'Obverse: Full view displaying magnificent high-relief figure of Liberty holding torch and olive branch.'
      },
      {
        id: 'img-104-rev',
        url: '/images/hero_coin.jpg',
        alt: '1907 $20 Saint-Gaudens High Relief Macro Focus',
        caption: 'High-relief wing and plumage detail displaying exceptional satiny roman gold luster.'
      },
      {
        id: 'img-104-slab',
        url: '/images/hero_coin.jpg',
        alt: 'PCGS MS-65+ CAC Museum Encapsulation Slab',
        caption: 'Slab Verification: Tamper-evident PCGS ultrasonic encapsulation with verified CAC green sticker.'
      }
    ],
    currentBid: 17200,
    startingBid: 12000,
    nextBid: 17700,
    bidIncrement: 500,
    estimateLow: 18000,
    estimateHigh: 22000,
    bidsCount: 34,
    reserveMet: true,
    reserveAmountDisclosed: false,
    timeRemainingSeconds: 9960, // ~2h 46m 00s
    initialTimeRemainingSeconds: 9960,
    closingTimeLabel: 'CLOSING TODAY · 4:15 PM EST',
    provenance: 'Ex. John H. Clapp Collection (1942); Private Sewickley Heights Estate (1988–2026); Gardner Fine Numismatics Vault Consignment #412-98A.',
    conditionReport: 'Superb Gem Uncirculated condition. PCGS MS-65+ CAC. Exceptional strike definition with needle-sharp feathers and gown drapery. Surfaces are wholly original with deep honey-gold patina in protected recesses.',
    dimensions: 'Diameter: 34mm · Weight: 33.436 grams · .900 Fine Gold (0.9675 oz AGW)',
    weightFineness: '.900 Gold, .100 Copper · Reeded/Lettered Edge',
    specialistNote: 'One of fewer than 50 specimens with verified CAC green sticker in this grade tier. Struck under direct presidential order in 1907.',
    specialistName: 'Edward V. Gardner, GG, USPAP',
    specialistTitle: 'Senior Numismatic Specialist & Licensed Auctioneer #AU-003892',
    consignorProvenance: 'Estate of Eleanor M. Mellon / Sewickley Heights Trust',
    isAutoExtendEnabled: true,
    autoExtendCount: 0,
    initialBids: [
      {
        id: 'bid-104-1',
        lotId: 'spotlight-104',
        amount: 18500,
        bidderMasked: 'b***4',
        bidderPaddle: '#412',
        timestamp: '14:24:02 EST',
        timeSecondsAgo: 45,
        origin: 'floor',
        isLeading: true
      },
      {
        id: 'bid-104-2',
        lotId: 'spotlight-104',
        amount: 18000,
        bidderMasked: 'p***8',
        bidderPaddle: '#109',
        timestamp: '14:22:18 EST',
        timeSecondsAgo: 149,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-104-3',
        lotId: 'spotlight-104',
        amount: 17500,
        bidderMasked: 'c***2',
        bidderPaddle: '#284',
        timestamp: '14:20:44 EST',
        timeSecondsAgo: 243,
        origin: 'phone',
        isLeading: false
      },
      {
        id: 'bid-104-4',
        lotId: 'spotlight-104',
        amount: 17000,
        bidderMasked: 'b***4',
        bidderPaddle: '#412',
        timestamp: '14:18:10 EST',
        timeSecondsAgo: 397,
        origin: 'floor',
        isLeading: false
      },
      {
        id: 'bid-104-5',
        lotId: 'spotlight-104',
        amount: 16500,
        bidderMasked: 'm***9',
        bidderPaddle: '#305',
        timestamp: '14:15:30 EST',
        timeSecondsAgo: 557,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-104-6',
        lotId: 'spotlight-104',
        amount: 15500,
        bidderMasked: 'a***7',
        bidderPaddle: '#501',
        timestamp: '14:11:05 EST',
        timeSecondsAgo: 822,
        origin: 'absentee',
        isLeading: false
      },
      {
        id: 'bid-104-7',
        lotId: 'spotlight-104',
        amount: 14000,
        bidderMasked: 'p***8',
        bidderPaddle: '#109',
        timestamp: '14:05:12 EST',
        timeSecondsAgo: 1175,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-104-8',
        lotId: 'spotlight-104',
        amount: 12000,
        bidderMasked: 'f***1',
        bidderPaddle: '#102',
        timestamp: '14:00:00 EST',
        timeSecondsAgo: 1487,
        origin: 'absentee',
        isLeading: false
      }
    ]
  },
  {
    id: 'lot-701',
    lotNumber: 'LOT 701',
    catalogIndex: 701,
    sessionTitle: 'Spring Fine Gold, Rare Numismatics & Americana Session 1',
    categoryTag: 'KEY DATE MORGAN DOLLAR',
    department: 'Coins & Currency',
    title: '1893-S Morgan Silver Dollar NGC VF30',
    subtitle: 'The King of Morgan Circulation Strikes · Honest Slate Patina',
    description: 'The undisputed premier key date of the Morgan silver dollar circulation strikes. Well-balanced medium dove-grey patina with darker slate toning around the stars and lettering.',
    details: 'Mintage of only 100,000 pieces at the San Francisco Mint. Strong rims, full reverse eagle shield, crisp wing plumage details. Certified and encapsulated by NGC in VF30 problem-free grade.',
    images: [
      {
        id: 'img-701-obv',
        url: '/images/morgan_dollar.jpg',
        alt: '1893-S Morgan Silver Dollar Obverse',
        caption: 'Obverse: Authentic VF30 problem-free portrait of Liberty.'
      }
    ],
    currentBid: 1420,
    startingBid: 800,
    nextBid: 1470,
    bidIncrement: 50,
    estimateLow: 1400,
    estimateHigh: 1800,
    bidsCount: 16,
    reserveMet: true,
    reserveAmountDisclosed: false,
    timeRemainingSeconds: 522, // ~08m 42s
    initialTimeRemainingSeconds: 522,
    closingTimeLabel: 'CLOSING SOON · 2:38 PM EST',
    provenance: 'Discovered in a Western Pennsylvania bank safe deposit box unopened since 1964.',
    conditionReport: 'NGC VF30 certified. Problem-free surfaces with wholesome honest wear for the assigned grade.',
    dimensions: 'Diameter: 38.1mm · Weight: 26.73 grams · .900 Fine Silver',
    weightFineness: '.900 Silver, .100 Copper',
    specialistNote: 'Extremely scarce in all grades; genuinely uncleaned example with wholesome original toning.',
    specialistName: 'Edward V. Gardner, GG',
    specialistTitle: 'Senior Numismatic Specialist',
    consignorProvenance: 'Western PA Safe Deposit Discovery Estate',
    isAutoExtendEnabled: true,
    autoExtendCount: 0,
    initialBids: [
      {
        id: 'bid-701-1',
        lotId: 'lot-701',
        amount: 1450,
        bidderMasked: 'k***6',
        bidderPaddle: '#217',
        timestamp: '14:23:45 EST',
        timeSecondsAgo: 62,
        origin: 'floor',
        isLeading: true
      },
      {
        id: 'bid-701-2',
        lotId: 'lot-701',
        amount: 1400,
        bidderMasked: 'r***2',
        bidderPaddle: '#183',
        timestamp: '14:21:10 EST',
        timeSecondsAgo: 217,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-701-3',
        lotId: 'lot-701',
        amount: 1300,
        bidderMasked: 'd***9',
        bidderPaddle: '#441',
        timestamp: '14:17:35 EST',
        timeSecondsAgo: 432,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-701-4',
        lotId: 'lot-701',
        amount: 1100,
        bidderMasked: 't***5',
        bidderPaddle: '#319',
        timestamp: '14:12:00 EST',
        timeSecondsAgo: 767,
        origin: 'floor',
        isLeading: false
      },
      {
        id: 'bid-701-5',
        lotId: 'lot-701',
        amount: 800,
        bidderMasked: 'h***1',
        bidderPaddle: '#112',
        timestamp: '14:00:00 EST',
        timeSecondsAgo: 1487,
        origin: 'absentee',
        isLeading: false
      }
    ]
  },
  {
    id: 'lot-702',
    lotNumber: 'LOT 702',
    catalogIndex: 702,
    sessionTitle: 'Spring Fine Gold, Rare Numismatics & Americana Session 1',
    categoryTag: 'GIA CERTIFIED ESTATE JEWELRY',
    department: 'Jewelry & Watches',
    title: 'Art Deco 3.20ct Platinum Solitaire Diamond Ring',
    subtitle: 'Old European Cut · VS1 Clarity · Hand-Pierced Edwardian Filigree',
    description: 'Old European cut, VS1 clarity, fine hand-engraved shank. Featuring an exceptional 3.20-carat Old European cut diamond with K color, VS1 clarity.',
    details: 'Set in an intricately pierced and millgrained platinum mounting characteristic of the 1920s Edwardian-to-Deco transitional masters. Accompanied by full GIA laboratory dossier #2185493011.',
    images: [
      {
        id: 'img-702-main',
        url: '/images/diamond_ring.jpg',
        alt: 'Art Deco 3.20ct Platinum Diamond Ring',
        caption: 'Central Old European cut diamond under 5000K daylight illumination.'
      }
    ],
    currentBid: 8500,
    startingBid: 5000,
    nextBid: 8700,
    bidIncrement: 200,
    estimateLow: 8500,
    estimateHigh: 11000,
    bidsCount: 28,
    reserveMet: true,
    reserveAmountDisclosed: false,
    timeRemainingSeconds: 852, // ~14m 12s
    initialTimeRemainingSeconds: 852,
    closingTimeLabel: 'CLOSING SOON · 2:44 PM EST',
    provenance: 'Heirloom estate of Eleanor M. Mellon, Fox Chapel, PA.',
    conditionReport: 'Mounting retains sharp piercing with crisp filigree. Central diamond is 100% natural, unenhanced, accompanied by full GIA dossier.',
    dimensions: 'Ring Size: 6.5 (sizable) · Total weight 5.4 grams Pt950',
    weightFineness: 'Platinum 950/1000 · 3.20 Carats Natural Diamond',
    specialistNote: 'Exceptional fire and scintillation under incandescent gallery lighting.',
    specialistName: 'Margaret Caldwell, FGA',
    specialistTitle: 'Head of Jewelry & Precious Gemstones',
    consignorProvenance: 'Heirloom Mellon Estate, Fox Chapel, PA',
    isAutoExtendEnabled: true,
    autoExtendCount: 0,
    initialBids: [
      {
        id: 'bid-702-1',
        lotId: 'lot-702',
        amount: 8800,
        bidderMasked: 'e***3',
        bidderPaddle: '#314',
        timestamp: '14:22:15 EST',
        timeSecondsAgo: 152,
        origin: 'phone',
        isLeading: true
      },
      {
        id: 'bid-702-2',
        lotId: 'lot-702',
        amount: 8600,
        bidderMasked: 'g***7',
        bidderPaddle: '#198',
        timestamp: '14:20:00 EST',
        timeSecondsAgo: 287,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-702-3',
        lotId: 'lot-702',
        amount: 8200,
        bidderMasked: 'l***0',
        bidderPaddle: '#250',
        timestamp: '14:16:20 EST',
        timeSecondsAgo: 507,
        origin: 'floor',
        isLeading: false
      },
      {
        id: 'bid-702-4',
        lotId: 'lot-702',
        amount: 7500,
        bidderMasked: 'e***3',
        bidderPaddle: '#314',
        timestamp: '14:10:45 EST',
        timeSecondsAgo: 842,
        origin: 'phone',
        isLeading: false
      },
      {
        id: 'bid-702-5',
        lotId: 'lot-702',
        amount: 5000,
        bidderMasked: 'b***2',
        bidderPaddle: '#105',
        timestamp: '14:00:00 EST',
        timeSecondsAgo: 1487,
        origin: 'absentee',
        isLeading: false
      }
    ]
  },
  {
    id: 'lot-703',
    lotNumber: 'LOT 703',
    catalogIndex: 703,
    sessionTitle: 'Spring Fine Gold, Rare Numismatics & Americana Session 1',
    categoryTag: 'PENNSYLVANIA HOROLOGY',
    department: 'Americana & Antiques',
    title: 'Chippendale Walnut Tall Case Clock, c. 1785',
    subtitle: 'Lancaster County, PA Origin · Eight-Day Brass Moon Dial Movement',
    description: 'Lancaster County, PA origin, eight-day brass moon dial movement. Attributed to the Lancaster County school of cabinetmakers with rosettes, fluted quarter-columns, and bracket feet.',
    details: 'The arched brass dial features painted phases of the moon and subsidiary seconds register. Hand-engraved chapter ring with cast corner spandrels.',
    images: [
      {
        id: 'img-703-main',
        url: '/images/grandfather_clock.jpg',
        alt: 'Chippendale Walnut Tall Case Clock c. 1785',
        caption: 'Full view of Lancaster County Chippendale walnut case.'
      }
    ],
    currentBid: 5200,
    startingBid: 2000,
    nextBid: 5400,
    bidIncrement: 200,
    estimateLow: 3500,
    estimateHigh: 5000,
    bidsCount: 12,
    reserveMet: true,
    reserveAmountDisclosed: false,
    timeRemainingSeconds: 1199, // ~19m 59s
    initialTimeRemainingSeconds: 1199,
    closingTimeLabel: 'CLOSING TODAY · 2:50 PM EST',
    provenance: 'By descent through five generations of the Hostetter family of Lititz, PA.',
    conditionReport: 'Original movement cleaned and oiled in 2021; strikes on the hour. Case possesses undisturbed 19th-century shellac finish.',
    dimensions: 'Height: 94 inches (7 ft 10 in) · Width: 20.5 inches · Depth: 11 inches',
    weightFineness: 'Solid Pennsylvania Black Walnut · Brass & Lead Works',
    specialistNote: 'Retains both cast lead weights, original brass pendulum bob, and winding crank.',
    specialistName: 'Arthur Vance, AAA',
    specialistTitle: 'Consultant in Early American Horology',
    consignorProvenance: 'Hostetter Family Lineage, Lititz, PA',
    isAutoExtendEnabled: true,
    autoExtendCount: 0,
    initialBids: [
      {
        id: 'bid-703-1',
        lotId: 'lot-703',
        amount: 3500,
        bidderMasked: 'w***8',
        bidderPaddle: '#409',
        timestamp: '14:18:22 EST',
        timeSecondsAgo: 385,
        origin: 'floor',
        isLeading: true
      },
      {
        id: 'bid-703-2',
        lotId: 'lot-703',
        amount: 3300,
        bidderMasked: 's***4',
        bidderPaddle: '#233',
        timestamp: '14:15:00 EST',
        timeSecondsAgo: 587,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-703-3',
        lotId: 'lot-703',
        amount: 2800,
        bidderMasked: 'p***1',
        bidderPaddle: '#340',
        timestamp: '14:08:12 EST',
        timeSecondsAgo: 995,
        origin: 'phone',
        isLeading: false
      },
      {
        id: 'bid-703-4',
        lotId: 'lot-703',
        amount: 2000,
        bidderMasked: 'a***5',
        bidderPaddle: '#118',
        timestamp: '14:00:00 EST',
        timeSecondsAgo: 1487,
        origin: 'absentee',
        isLeading: false
      }
    ]
  },
  {
    id: 'lot-704',
    lotNumber: 'LOT 704',
    catalogIndex: 704,
    sessionTitle: 'Spring Fine Gold, Rare Numismatics & Americana Session 1',
    categoryTag: 'AMERICAN IMPRESSIONISM FINE ART & HISTORICAL AMERICAN NOCTURNE',
    department: 'American Fine Art',
    title: 'River at Dusk (Industrial Monongahela Nocturne)',
    subtitle: '"River at Dusk (Industrial Monongahela Nocturne)", c. 1912–1914',
    artistName: 'Aaron Harry Gorson (American/Lithuanian, 1872–1932)',
    artworkTitle: '"River at Dusk (Industrial Monongahela Nocturne)", c. 1912–1914',
    artworkMediumSpecs: 'Oil on linen canvas · 30 x 36 in. (76.2 x 91.4 cm) · Framed: 41 x 47 in.',
    artworkInscriptions: "Signed 'A. H. Gorson' lower right",
    artworkCanvasStructure: 'Period Beveled White Pine',
    artworkFrameSpecs: 'Newcomb-Macklin Gilt Rococo',
    carnegieExhibition: 'Annual Exhibition, 1913 (#98)',
    frickMuseum: 'Loan for acquisition, 1966',
    permanentMuseum: 'Industrial Landscapes, 1989',
    catalogRaisonne: 'A.H. Gorson Catalog Raisonné',
    sensorCaptureLabel: 'RAW DNG / 100MP SENSOR CAPTURE',
    description: "A signature, museum-caliber nocturne masterwork by Aaron Harry Gorson, the celebrated chronicler of Western Pennsylvania's fierce industrial epochs. Recorded during the apex of Pittsburgh's tenure of his Pittsburgh studio on Fifth Avenue, this canvas synthesizes French Impressionist luminosity with the monumental gravitas of America's Gilded Age steelworks. The composition depicts the calm waters of the river reflecting burning embers, blast-furnace flares, and the brooding silhouettes of gothic spires against an amber, soot-flecked twilight sky. The paint surface exhibits vibrant impasto in the industrial furnaces counterbalanced by atmospheric, vaporous scumbles throughout the twilight sky.",
    details: 'Physical Specifics: Original Oil on Fine Linen; Period Beveled White Pine stretcher; Newcomb-Macklin Gilt Rococo frame. Hand-titled verso "River at Dusk". Provenance includes Carnegie Institute Annual Exhibition 1913 (#98), Frick Art Museum loan 1966, and inclusion in the A.H. Gorson Catalog Raisonné.',
    images: [
      {
        id: 'img-704-main',
        url: '/images/gorson_painting.jpg',
        alt: 'Aaron Harry Gorson - River at Dusk (Industrial Monongahela Nocturne)',
        caption: 'Aaron Harry Gorson (American/Lithuanian, 1872–1932) "River at Dusk (Industrial Monongahela Nocturne)", c. 1912–1914'
      }
    ],
    currentBid: 6200,
    startingBid: 3500,
    nextBid: 6500,
    bidIncrement: 300,
    estimateLow: 6500,
    estimateHigh: 9000,
    bidsCount: 11,
    reserveMet: true,
    reserveAmountDisclosed: false,
    timeRemainingSeconds: 1011, // 16M 51S
    initialTimeRemainingSeconds: 1011,
    closingTimeLabel: 'CLOSING SOON · 2:48 PM EST',
    provenance: 'Purchased directly from the artist (1914); Thence by descent; Private Pittsburgh Collection; Gardner Auction Fine Art Vault Consignment #704-AHG.',
    conditionReport: 'Superb museum preservation. Original unlined linen on period beveled pine stretchers. UV examination reveals zero inpainting or restoration across the canvas.',
    dimensions: 'Canvas: 30 x 36 in. (76.2 x 91.4 cm) · Framed: 41 x 47 in.',
    weightFineness: 'Original Oil on Fine Linen · Newcomb-Macklin Gilt Rococo Frame',
    specialistNote: 'Arguably Gorson\'s quintessential Monongahela nocturne depicting the Jones & Laughlin mills at dusk.',
    specialistName: 'Genevieve DuMont',
    specialistTitle: 'Director of American Fine Art',
    consignorProvenance: 'Private Collection, Sewickley, PA',
    isAutoExtendEnabled: true,
    autoExtendCount: 0,
    initialBids: [
      {
        id: 'bid-704-1',
        lotId: 'lot-704',
        amount: 6200,
        bidderMasked: 'Paddle #194',
        bidderPaddle: '#194',
        timestamp: '14:31:49 EST',
        timeSecondsAgo: 25,
        origin: 'webcast',
        isLeading: true
      },
      {
        id: 'bid-704-2',
        lotId: 'lot-704',
        amount: 5800,
        bidderMasked: 'Paddle #332',
        bidderPaddle: '#332',
        timestamp: '14:30:16 EST',
        timeSecondsAgo: 118,
        origin: 'floor',
        isLeading: false
      },
      {
        id: 'bid-704-3',
        lotId: 'lot-704',
        amount: 5200,
        bidderMasked: 'Paddle #205',
        bidderPaddle: '#205',
        timestamp: '14:28:42 EST',
        timeSecondsAgo: 212,
        origin: 'phone',
        isLeading: false
      },
      {
        id: 'bid-704-4',
        lotId: 'lot-704',
        amount: 4500,
        bidderMasked: 'Paddle #147',
        bidderPaddle: '#147',
        timestamp: '14:26:12 EST',
        timeSecondsAgo: 362,
        origin: 'webcast',
        isLeading: false
      },
      {
        id: 'bid-704-5',
        lotId: 'lot-704',
        amount: 3500,
        bidderMasked: 'Paddle #106',
        bidderPaddle: '#106',
        timestamp: '14:20:05 EST',
        timeSecondsAgo: 729,
        origin: 'absentee',
        isLeading: false
      }
    ]
  }
];
