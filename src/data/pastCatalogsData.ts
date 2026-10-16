import { SPOTLIGHT_LOT, LIVE_LOTS } from './auctionData';

export interface PastLotItem {
  id: string;
  auctionId: string;
  auctionTitle: string;
  lotNumber: string;
  categoryTag: string;
  department: string;
  title: string;
  description: string;
  details: string;
  image: string;
  priceRealized: string;
  startingBid: number;
  estimateLow: number;
  estimateHigh: number;
  bidsCount: number;
  dateSold: string;
  auctionHouse: string;
  location: string;
  shipping: string;
  provenance: string;
  conditionReport: string;
  dimensions?: string;
  specialistNote: string;
}

export interface PastAuction {
  id: string;
  title: string;
  auctionType: 'Online Only Auction' | 'Live Webcast Auction' | 'In-Room & Online';
  status: 'Past Auction';
  companyName: string;
  address: string;
  cityStateZip: string;
  mapQuery: string;
  dateRange: string;
  scheduleText: string;
  description: string;
  biddingNotice: string;
  auctionNotice: string;
  image: string;
  category: string;
  lotsCount: number;
  totalRealized: string;
  shipping: string;
  lots: PastLotItem[];
}

export const PAST_AUCTIONS: PastAuction[] = [
  {
    id: 'past-auction-091726',
    title: 'Gardner Auction — Fall Keystone Numismatics & Rare U.S. Gold 09/17/26',
    auctionType: 'Online Only Auction',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 9/11/2026 - 9/18/2026',
    scheduleText: '09/10/26 @ 05:30 PM thru 09/17/26 @ 05:00 PM EST',
    description: 'Welcome to Gardner Auction\'s premier Keystone Numismatics catalog. Highlighting extraordinary pre-1933 United States gold rarities, high-grade Carson City Morgan silver dollars, historic Pennsylvania territorial issues, and investment-grade bullion portfolios. All lots cataloged under museum conservation protocols with accredited third-party verification.',
    biddingNotice: 'All lots in this catalog have concluded and closed for live bidding. Realized prices reflect the final gavel hammer price including standard 15% Buyer\'s Premium. Registered winning bidders received electronic settlement invoices within 24 hours of session adjournment. Title transferred with full legal guarantee.',
    auctionNotice: 'PA Auctioneer Lic. # AY-002004. Certified numismatic specimens encapsulated by PCGS, NGC, or CAC with tamper-evident sonic seal security holders. In-person property previews were conducted at our Pittsburgh gallery. Direct specialist inquiries to coins@gardnerauction.com.',
    image: '/images/hero_coin.jpg',
    category: 'Coins & Currency',
    lotsCount: 284,
    totalRealized: '$1,485,200',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-101',
        auctionId: 'past-auction-091726',
        auctionTitle: 'Gardner Auction — Fall Keystone Numismatics 09/17/26',
        lotNumber: 'Lot 101',
        categoryTag: 'UNITED STATES RARE NUMISMATICS',
        department: 'Coins & Currency',
        title: '1907 $20 Saint-Gaudens High Relief (PCGS MS-65+ CAC)',
        description: 'Wire-rim variety, exceptional satiny surfaces with radiant original roman gold luster.',
        details: 'Designed by Augustus Saint-Gaudens. Struck in ultra-high relief with lettered edge "E PLURIBUS UNUM". Verified by Certified Acceptance Corporation (CAC). Encapsulated in PCGS museum grade security slab with gold shield verification.',
        image: '/images/hero_coin.jpg',
        priceRealized: '$18,500.00',
        startingBid: 12000,
        estimateLow: 18000,
        estimateHigh: 22000,
        bidsCount: 34,
        dateSold: '09/17/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Ex. John H. Clapp Collection (1942); Private Sewickley Heights Estate (1988-2026).',
        conditionReport: 'Superb Gem Uncirculated condition. PCGS MS-65+ CAC. Exceptional strike definition with needle-sharp feathers and gown drapery.',
        dimensions: 'Diameter: 34mm · Weight: 33.436 grams · .900 Fine Gold',
        specialistNote: 'One of fewer than 50 specimens with verified CAC green sticker in this grade tier.'
      },
      {
        id: 'past-lot-102',
        auctionId: 'past-auction-091726',
        auctionTitle: 'Gardner Auction — Fall Keystone Numismatics 09/17/26',
        lotNumber: 'Lot 102',
        categoryTag: 'KEY DATE MORGAN DOLLAR',
        department: 'Coins & Currency',
        title: '1893-S Morgan Silver Dollar NGC VF30',
        description: 'Key date of the series. Strong rims, full reverse eagle shield.',
        details: 'The undisputed premier key date of the Morgan silver dollar circulation strikes. Well-balanced medium dove-grey patina with darker slate toning around the stars and lettering.',
        image: '/images/morgan_dollar.jpg',
        priceRealized: '$3,850.00',
        startingBid: 1800,
        estimateLow: 3500,
        estimateHigh: 4500,
        bidsCount: 22,
        dateSold: '09/17/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Discovered in a Western Pennsylvania bank safe deposit box unopened since 1964.',
        conditionReport: 'NGC VF30 certified. Problem-free surfaces with wholesome honest wear for the assigned grade.',
        dimensions: 'Diameter: 38.1mm · .900 Fine Silver',
        specialistNote: 'Extremely scarce in all grades; genuinely uncleaned example.'
      },
      {
        id: 'past-lot-103',
        auctionId: 'past-auction-091726',
        auctionTitle: 'Gardner Auction — Fall Keystone Numismatics 09/17/26',
        lotNumber: 'Lot 103',
        categoryTag: 'CARSON CITY MINT HOARD',
        department: 'Coins & Currency',
        title: '1889-CC Morgan Silver Dollar PCGS AU-53',
        description: 'Rare frontier mint strike. Sharp breast feathers, original frost.',
        details: 'Struck at the historic Carson City, Nevada mint during the peak of Comstock Lode extraction. Retains bright mint luster beneath warm champagne toning.',
        image: '/images/morgan_dollar.jpg',
        priceRealized: '$4,600.00',
        startingBid: 2500,
        estimateLow: 4200,
        estimateHigh: 5500,
        bidsCount: 19,
        dateSold: '09/17/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Private Reno, Nevada estate; acquired by Sewickley collector in 1974.',
        conditionReport: 'PCGS AU-53 verified. Excellent eye appeal with only slight friction on high points.',
        dimensions: 'Diameter: 38.1mm · Weight: 26.73g',
        specialistNote: 'Tough key date with exceptionally sharp reverse eagle.'
      },
      {
        id: 'past-lot-104',
        auctionId: 'past-auction-091726',
        auctionTitle: 'Gardner Auction — Fall Keystone Numismatics 09/17/26',
        lotNumber: 'Lot 104',
        categoryTag: 'INVESTMENT BULLION',
        department: 'Gold & Bullion',
        title: '1908 $20 Saint-Gaudens No Motto MS-64',
        description: 'Lustrous cartwheel flow lines, choice mint state condition.',
        details: 'First year of the modified Saint-Gaudens double eagle design without motto, as originally intended by Theodore Roosevelt. Struck at the Philadelphia Mint.',
        image: '/images/hero_coin.jpg',
        priceRealized: '$2,450.00',
        startingBid: 1800,
        estimateLow: 2200,
        estimateHigh: 2800,
        bidsCount: 15,
        dateSold: '09/17/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Swiss Bank vault deaccession, Zurich.',
        conditionReport: 'NGC MS-64. Clean fields with full satiny mint frost throughout.',
        dimensions: 'Diameter: 34mm · .900 Fine Gold',
        specialistNote: 'Solid type coin for serious numismatic portfolios.'
      }
    ]
  },
  {
    id: 'past-auction-091026',
    title: 'Gardner Auction — Allegheny Estate Jewelry & Horology Masterpieces 09/10/26',
    auctionType: 'Live Webcast Auction',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 9/02/2026 - 9/10/2026',
    scheduleText: '09/02/26 @ 09:00 AM thru 09/10/26 @ 06:00 PM EST',
    description: 'Curated liquidation of historic Allegheny County jewelry vaults and horology collections. Featuring GIA-certified Old European cut diamonds, Art Deco platinum filigree mountings, natural untreated Colombian emeralds, and Swiss fine horology from Patek Philippe, Audemars Piguet, and Rolex.',
    biddingNotice: 'Live webcast and floor gavel concluded. All absentee books reconciled with floor bidding records. Winning bidders have been invoiced with insured delivery or scheduled gallery concierge pickup options available.',
    auctionNotice: 'All gemological evaluations conducted under GIA master stone standards by Graduate Gemologists. Horological timepieces tested for water resistance, amplitude, and movement authenticity on Witschi timing equipment.',
    image: '/images/diamond_ring.jpg',
    category: 'Jewelry & Watches',
    lotsCount: 196,
    totalRealized: '$1,892,400',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-201',
        auctionId: 'past-auction-091026',
        auctionTitle: 'Gardner Auction — Allegheny Estate Jewelry 09/10/26',
        lotNumber: 'Lot 201',
        categoryTag: 'GIA CERTIFIED ESTATE',
        department: 'Jewelry & Watches',
        title: 'Art Deco 3.20ct Platinum Solitaire Diamond Ring',
        description: 'Old European cut, VS1 clarity, fine hand-engraved shank.',
        details: 'Featuring an exceptional 3.20-carat Old European cut diamond with K color, VS1 clarity, set in an intricately pierced and millgrained platinum mounting characteristic of the 1920s Edwardian-to-Deco transitional masters.',
        image: '/images/diamond_ring.jpg',
        priceRealized: '$9,200.00',
        startingBid: 5000,
        estimateLow: 8500,
        estimateHigh: 11000,
        bidsCount: 28,
        dateSold: '09/10/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Heirloom estate of Eleanor M. Mellon, Fox Chapel, PA.',
        conditionReport: 'Mounting retains sharp piercing with crisp filigree. Central diamond is 100% natural, unenhanced, accompanied by full GIA dossier.',
        dimensions: 'Ring Size: 6.5 (sizable) · Total weight 5.4 grams Pt950',
        specialistNote: 'Exceptional fire and scintillation under incandescent gallery lighting.'
      },
      {
        id: 'past-lot-202',
        auctionId: 'past-auction-091026',
        auctionTitle: 'Gardner Auction — Allegheny Estate Jewelry 09/10/26',
        lotNumber: 'Lot 202',
        categoryTag: 'HISTORIC HOROLOGY',
        department: 'Jewelry & Watches',
        title: 'Patek Philippe 18k Yellow Gold Open-Face Pocket Watch c. 1912',
        description: 'Triple-signed dial, movement, and case. Extract from the Archives.',
        details: 'High-grade 18-jewel manual-wind movement with wolf\'s tooth winding wheels, counterpoised lever escapement, and bimetallic balance. Pristine white enamel dial with Roman numerals and blued steel spade hands.',
        image: '/images/diamond_ring.jpg',
        priceRealized: '$6,800.00',
        startingBid: 3500,
        estimateLow: 6000,
        estimateHigh: 8500,
        bidsCount: 24,
        dateSold: '09/10/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Presented to Pittsburgh railroad executive James McCrea, thence by family descent.',
        conditionReport: 'Flawless enamel dial without hairline cracks. Movement runs smoothly and keeps exceptional vintage time.',
        dimensions: 'Case diameter: 48mm · Total weight: 78.2 grams',
        specialistNote: 'Accompanied by official Patek Philippe Extract from the Archives confirming manufacture in 1912.'
      },
      {
        id: 'past-lot-203',
        auctionId: 'past-auction-091026',
        auctionTitle: 'Gardner Auction — Allegheny Estate Jewelry 09/10/26',
        lotNumber: 'Lot 203',
        categoryTag: 'VINTAGE CARTIER',
        department: 'Jewelry & Watches',
        title: 'Cartier Paris 1960s 18k Gold & Sapphire Ribbon Brooch',
        description: 'Numbered and stamped French hallmarks, natural sapphire cluster.',
        details: 'Sculpted in rich textured 18k yellow gold ribbons accented with twelve round brilliant cabochon Ceylon blue sapphires totaling approximately 4.80 carats.',
        image: '/images/diamond_ring.jpg',
        priceRealized: '$4,100.00',
        startingBid: 2200,
        estimateLow: 3800,
        estimateHigh: 5200,
        bidsCount: 17,
        dateSold: '09/10/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Acquired at Cartier Rue de la Paix, Paris in 1968; private Shadyside estate.',
        conditionReport: 'Signed Cartier Paris, numbered, with French eagle head hallmark. Excellent condition.',
        dimensions: 'Dimensions: 52mm x 38mm · Weight: 22.8 grams',
        specialistNote: 'Original fitted red morocco leather Cartier presentation case included.'
      }
    ]
  },
  {
    id: 'past-auction-082826',
    title: 'Gardner Auction — Colonial Americana & Pennsylvania Antiques 08/28/26',
    auctionType: 'In-Room & Online',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 8/20/2026 - 8/28/2026',
    scheduleText: '08/20/26 @ 10:00 AM thru 08/28/26 @ 04:30 PM EST',
    description: 'Exceptional collection of 18th and early 19th-century Pennsylvania decorative arts and historic Americana. Highlighting Lancaster County moon-dial tall case clocks, Philadelphia Chippendale carved walnut armchairs, Berks County dower chests, illuminated fraktur documents, and wrought architectural iron.',
    biddingNotice: 'Floor gavel concluded at our downtown Pittsburgh exhibition galleries. Buyer pick-ups in gallery scheduled by appointment. Specialized antique freight crating and white-glove transport in process.',
    auctionNotice: 'Accredited by the Appraisers Association of America (AAA). Furniture woodwork examined by specialist conservators for original joinery, undisturbed patination, and hardware authenticity.',
    image: '/images/grandfather_clock.jpg',
    category: 'Americana & Antiques',
    lotsCount: 215,
    totalRealized: '$945,800',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-301',
        auctionId: 'past-auction-082826',
        auctionTitle: 'Gardner Auction — Colonial Americana 08/28/26',
        lotNumber: 'Lot 301',
        categoryTag: 'PENNSYLVANIA HOROLOGY',
        department: 'Americana & Antiques',
        title: 'Chippendale Walnut Tall Case Clock, c. 1785',
        description: 'Lancaster County, PA origin, eight-day brass moon dial movement.',
        details: 'Attributed to the Lancaster County school of cabinetmakers with rosettes, fluted quarter-columns, and bracket feet. The arched brass dial features painted phases of the moon and subsidiary seconds register.',
        image: '/images/grandfather_clock.jpg',
        priceRealized: '$4,200.00',
        startingBid: 2000,
        estimateLow: 3500,
        estimateHigh: 5000,
        bidsCount: 16,
        dateSold: '08/28/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'By descent through five generations of the Hostetter family of Lititz, PA.',
        conditionReport: 'Original movement cleaned and oiled; strikes on the hour. Case possesses undisturbed 19th-century shellac finish.',
        dimensions: 'Height: 94 inches · Width: 20.5 inches · Depth: 11 inches',
        specialistNote: 'Retains both cast lead weights, original brass pendulum bob, and winding crank.'
      },
      {
        id: 'past-lot-302',
        auctionId: 'past-auction-082826',
        auctionTitle: 'Gardner Auction — Colonial Americana 08/28/26',
        lotNumber: 'Lot 302',
        categoryTag: 'PENNSYLVANIA FOLK ART',
        department: 'Americana & Antiques',
        title: 'Illuminated Taufschein Fraktur, Berks County, 1794',
        description: 'Attributed to the Sussel-Washington artist, watercolor and ink on wove paper.',
        details: 'Vibrant baptismal certificate with flanking tulips, songbirds (Distelfinken), and celestial angels in bold carmine, cobalt, and saffron yellow mineral pigments.',
        image: '/images/antique_silver.jpg',
        priceRealized: '$5,400.00',
        startingBid: 2500,
        estimateLow: 4500,
        estimateHigh: 6500,
        bidsCount: 21,
        dateSold: '08/28/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Collection of Titus C. Geesey; thence to private Westmoreland County estate.',
        conditionReport: 'Housed in custom museum UV-filtering archival frame. Rich, unfaded color saturation.',
        dimensions: 'Sheet: 13 x 16 inches · Framed: 18 x 21 inches',
        specialistNote: 'Pristine specimen with highly desirable bird and floral iconography.'
      },
      {
        id: 'past-lot-303',
        auctionId: 'past-auction-082826',
        auctionTitle: 'Gardner Auction — Colonial Americana 08/28/26',
        lotNumber: 'Lot 303',
        categoryTag: 'PENNSYLVANIA FOLK ART',
        department: 'Americana & Antiques',
        title: 'Berks County Painted Pine Dower Chest, Dated 1789',
        description: 'Original sulfur-inlaid tulips, arched reserves, wrought iron strap hinges.',
        details: 'Attributed to the "Compass Artist" shop of Berks County. Retains untouched original Venetian red ground with chalk-white and Prussian blue compass-drawn star roundels.',
        image: '/images/grandfather_clock.jpg',
        priceRealized: '$6,500.00',
        startingBid: 3200,
        estimateLow: 5500,
        estimateHigh: 8000,
        bidsCount: 24,
        dateSold: '08/28/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Acquired from descendant of Heinrich and Anna Fisher, Oley Valley, PA.',
        conditionReport: 'Remarkable survivor. Retains interior till with secret sliding compartment and original iron lock.',
        dimensions: 'Width: 50 inches · Depth: 22 inches · Height: 26 inches',
        specialistNote: 'Rare untouched 18th-century painted surface.'
      },
      {
        id: 'past-lot-304',
        auctionId: 'past-auction-082826',
        auctionTitle: 'Gardner Auction — Colonial Americana 08/28/26',
        lotNumber: 'Lot 304',
        categoryTag: 'CHIPPENDALE FURNITURE',
        department: 'Americana & Antiques',
        title: 'Philadelphia Chippendale Carved Mahogany Side Chair, c. 1770',
        description: 'Serpentine crest rail with carved cockleshell, pierce-carved vase splat.',
        details: 'Attributed to the workshop of Thomas Affleck or Benjamin Randolph. Features cabriole legs terminating in vigorous ball-and-claw feet with through-tenon side rails.',
        image: '/images/grandfather_clock.jpg',
        priceRealized: '$3,900.00',
        startingBid: 2000,
        estimateLow: 3500,
        estimateHigh: 5000,
        bidsCount: 17,
        dateSold: '08/28/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Private Philadelphia Main Line estate; thence to Sewickley Heights collection.',
        conditionReport: 'Microscopic finish analysis confirms undisturbed 18th-century resin varnish patina.',
        dimensions: 'Height: 39 inches · Seat Width: 21.5 inches',
        specialistNote: 'Superb proportions representative of Philadelphia high style.'
      }
    ]
  },
  {
    id: 'past-auction-081426',
    title: 'Gardner Auction — American Impressionism & Monongahela Industrial Fine Art 08/14/26',
    auctionType: 'Live Webcast Auction',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 8/05/2026 - 8/14/2026',
    scheduleText: '08/05/26 @ 11:00 AM thru 08/14/26 @ 07:00 PM EST',
    description: 'Museum-grade showcase of Pennsylvania and American Impressionism. Featuring Aaron Henry Gorson nocturne steel furnace oils, George Hetzel Scalp Level paintings, Malcolm Parcell portraits, and William Coventry Wall river landscapes. High institutional attendance and record gallery hammer prices.',
    biddingNotice: 'Session concluded. Official hammer records validated. Museum acquisitions registered for archival record. Private treaty inquiries welcomed.',
    auctionNotice: 'All fine art inspectable with ultraviolet fluorescence analysis and infrared reflectography. Complete provenance dossiers and museum exhibition histories accompany each artwork.',
    image: '/images/gorson_painting.jpg',
    category: 'Fine Art & Prints',
    lotsCount: 142,
    totalRealized: '$1,340,600',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-401',
        auctionId: 'past-auction-081426',
        auctionTitle: 'Gardner Auction — American Impressionism 08/14/26',
        lotNumber: 'Lot 401',
        categoryTag: 'AMERICAN IMPRESSIONISM',
        department: 'Fine Art & Prints',
        title: 'A.H. Gorson \'Golden Monongahela\' Oil on Canvas',
        description: 'Signed lower right. Provenance: Private Sewickley estate.',
        details: 'Masterpiece by Aaron Henry Gorson (American, 1872–1932) depicting the atmospheric night luminescence of blast furnaces over the Monongahela river in Pittsburgh. Housed in an authentic period gilded cove frame.',
        image: '/images/gorson_painting.jpg',
        priceRealized: '$7,800.00',
        startingBid: 3500,
        estimateLow: 6000,
        estimateHigh: 8500,
        bidsCount: 26,
        dateSold: '08/14/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Purchased directly from the artist, thence by descent; Sewickley, PA collection.',
        conditionReport: 'Oil on original unlined canvas. Minor stable craquelure consistent with age. Under UV light: no evident inpainting or restoration.',
        dimensions: 'Canvas: 24 x 30 inches · Framed: 33 x 39 inches',
        specialistNote: 'Prime subject matter by Pittsburgh\'s foremost nocturne industrial painter.'
      },
      {
        id: 'past-lot-402',
        auctionId: 'past-auction-081426',
        auctionTitle: 'Gardner Auction — American Impressionism 08/14/26',
        lotNumber: 'Lot 402',
        categoryTag: 'SCALP LEVEL SCHOOL',
        department: 'Fine Art & Prints',
        title: 'George Hetzel (1826–1899) \'Trout Stream in Autumn\' Oil on Board',
        description: 'Signed and dated 1888 lower left. Golden afternoon forest light.',
        details: 'Hetzel is regarded as the founder of the Scalp Level School of landscape painting near Johnstown, PA. This work captures dapple light through beech and hemlock trees over crystalline mountain brook waters.',
        image: '/images/art_gallery.jpg',
        priceRealized: '$5,200.00',
        startingBid: 2800,
        estimateLow: 4500,
        estimateHigh: 6500,
        bidsCount: 18,
        dateSold: '08/14/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Exhibited at Carnegie Institute International Exhibition; private Ligonier estate.',
        conditionReport: 'Excellent condition in vintage carved giltwood frame. Cleaned and revarnished in 2019.',
        dimensions: 'Sight: 18 x 24 inches · Framed: 26 x 32 inches',
        specialistNote: 'Important regional museum-level landscape specimen.'
      },
      {
        id: 'past-lot-403',
        auctionId: 'past-auction-081426',
        auctionTitle: 'Gardner Auction — American Impressionism 08/14/26',
        lotNumber: 'Lot 403',
        categoryTag: 'REGIONAL REALISM',
        department: 'Fine Art & Prints',
        title: 'Malcolm Parcell (American, 1896–1987) \'Allegheny Foothills\' Oil on Canvas',
        description: 'Signed and dated 1934 lower right. Washington County rolling hills.',
        details: 'Parcell was two-time winner of the Carnegie International Popular Prize. This lyrical painting depicts rural farmers tending pasture in late afternoon golden light.',
        image: '/images/gorson_painting.jpg',
        priceRealized: '$8,900.00',
        startingBid: 4500,
        estimateLow: 7500,
        estimateHigh: 11000,
        bidsCount: 22,
        dateSold: '08/14/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Acquired directly from the artist\'s Moon Lorn studio; private Greensburg estate.',
        conditionReport: 'Excellent condition on original stretcher keys. Unrelined canvas with luminous original color.',
        dimensions: 'Canvas: 28 x 36 inches · Framed: 35 x 43 inches',
        specialistNote: 'Rare major exhibition canvas by Parcell.'
      }
    ]
  },
  {
    id: 'past-auction-073026',
    title: 'Gardner Auction — Summer Sovereign Gold Bullion & World Specimen Showcase 07/30/26',
    auctionType: 'Online Only Auction',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 7/22/2026 - 7/30/2026',
    scheduleText: '07/22/26 @ 08:00 AM thru 07/30/26 @ 05:00 PM EST',
    description: 'High-value physical bullion and numismatic bullion showcase. Featuring 100 oz .999 Engelhard silver bars, Royal Canadian Mint 1 oz gold maple leaves, South African Krugerrands, Pre-1933 $10 Indian eagles, and Mexican 50 Pesos centenarios.',
    biddingNotice: '100% white-glove sell-through rate achieved across all precious metal items. Armored courier dispatch completed.',
    auctionNotice: 'Purity verified by nondestructive X-ray fluorescence spectrometry (XRF) and specific gravity buoyancy balance.',
    image: '/images/gold_bullion.jpg',
    category: 'Gold & Bullion',
    lotsCount: 310,
    totalRealized: '$2,150,000',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-501',
        auctionId: 'past-auction-073026',
        auctionTitle: 'Gardner Auction — Summer Sovereign Gold 07/30/26',
        lotNumber: 'Lot 501',
        categoryTag: 'INVESTMENT BULLION',
        department: 'Gold & Bullion',
        title: 'Credit Suisse 1oz .9999 Pure Gold Ingot in Assay',
        description: 'Original tamper-evident sealed blister pack with matching serial certificates.',
        details: 'Recognized worldwide as standard institutional gold bullion. Serial number certified with official Swiss refinery hallmark.',
        image: '/images/gold_bullion.jpg',
        priceRealized: '$2,680.00',
        startingBid: 2200,
        estimateLow: 2500,
        estimateHigh: 2800,
        bidsCount: 31,
        dateSold: '07/30/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Purchased directly from Republic National Bank of New York; single owner vault.',
        conditionReport: 'Flawless mint ingot in unblemished factory assay card.',
        dimensions: 'Weight: 31.103 grams (1 Troy Ounce) · Fineness: 999.9/1000',
        specialistNote: 'Essential high-liquidity gold ingot.'
      },
      {
        id: 'past-lot-502',
        auctionId: 'past-auction-073026',
        auctionTitle: 'Gardner Auction — Summer Sovereign Gold 07/30/26',
        lotNumber: 'Lot 502',
        categoryTag: 'WORLD GOLD RARITY',
        department: 'Gold & Bullion',
        title: 'Mexico 1947 50 Pesos Centenario Gold Coin (1.2057 oz AGW)',
        description: 'Winged Victory standing with popocatepetl volcano reverse.',
        details: 'One of the most famous and artistically renowned world gold coins ever minted. Contains over 1.2 troy ounces of pure gold.',
        image: '/images/hero_coin.jpg',
        priceRealized: '$3,250.00',
        startingBid: 2600,
        estimateLow: 3000,
        estimateHigh: 3500,
        bidsCount: 29,
        dateSold: '07/30/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Acquired at Banco de Mexico, Mexico City; thence by descent.',
        conditionReport: 'Brilliant Uncirculated with rich rose-gold luster and sharp strike.',
        dimensions: 'Diameter: 37mm · Total weight: 41.67 grams · AGW: 1.2057 oz',
        specialistNote: 'Impressive hand presence and commanding aesthetic.'
      },
      {
        id: 'past-lot-503',
        auctionId: 'past-auction-073026',
        auctionTitle: 'Gardner Auction — Summer Sovereign Gold 07/30/26',
        lotNumber: 'Lot 503',
        categoryTag: 'SILVER BULLION',
        department: 'Gold & Bullion',
        title: '100 oz Engelhard .999 Fine Silver Cast Pour Ingot',
        description: 'Historic "P-Loaf" variety with stamped serial number and bull logo.',
        details: 'Vintage 1970s Engelhard 100 troy ounce hand-poured silver bullion bar. Stamped with 7-digit serial number and 999+ fineness hallmark.',
        image: '/images/gold_bullion.jpg',
        priceRealized: '$3,450.00',
        startingBid: 2800,
        estimateLow: 3200,
        estimateHigh: 3800,
        bidsCount: 27,
        dateSold: '07/30/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Purchased directly from Deak-Perera Precious Metals in 1978.',
        conditionReport: 'Pleasing honest cast-pour cooling ripples and authentic frosted patina.',
        dimensions: 'Weight: 100.00 Troy Ounces · .999 Fine Silver',
        specialistNote: 'Iconic vintage American bullion bar.'
      }
    ]
  },
  {
    id: 'past-auction-071526',
    title: 'Gardner Auction — Pittsburgh Steel Baron Heirlooms & Sterling Silver 07/15/26',
    auctionType: 'Online Only Auction',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 7/07/2026 - 7/15/2026',
    scheduleText: '07/07/26 @ 09:30 AM thru 07/15/26 @ 05:30 PM EST',
    description: 'Magnificent deaccessions from historic Western Pennsylvania industrial families. Featuring Tiffany & Co. sterling silver presentation services, Gorham Martelé hand-hammered vases, English George III salvers, and 19th-century presidential banquet silver.',
    biddingNotice: 'Auction closed. Invoices finalized. All lots safely transferred.',
    auctionNotice: 'Silver hallmarked and assayed. Exact net troy weights cataloged.',
    image: '/images/antique_silver.jpg',
    category: 'Americana & Antiques',
    lotsCount: 188,
    totalRealized: '$875,300',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-601',
        auctionId: 'past-auction-071526',
        auctionTitle: 'Gardner Auction — Pittsburgh Steel Baron Heirlooms 07/15/26',
        lotNumber: 'Lot 601',
        categoryTag: 'TIFFANY & CO. STERLING',
        department: 'Americana & Antiques',
        title: 'Tiffany & Co. \'Chrysanthemum\' Pattern 6-Piece Sterling Tea Service',
        description: 'Circa 1895, designed by Charles T. Grosjean. Total weight 218 troy ounces.',
        details: 'Including kettle on warming stand, coffee pot, tea pot, covered sugar bowl, waste bowl, and creamer. Elaborately chased with blooming chrysanthemums on undulating fluted bodies.',
        image: '/images/antique_silver.jpg',
        priceRealized: '$14,200.00',
        startingBid: 8000,
        estimateLow: 12000,
        estimateHigh: 18000,
        bidsCount: 38,
        dateSold: '07/15/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Commissioned by a prominent Pittsburgh steel industrialist; thence by family descent.',
        conditionReport: 'Crisp chasing with original ebony insulators on handles. Hand-polished to museum luster.',
        dimensions: 'Kettle Height: 15.5 inches · Weight: 6,780 grams (218 oz troy)',
        specialistNote: 'One of the undisputed masterpieces of American high Victorian silversmithing.'
      },
      {
        id: 'past-lot-602',
        auctionId: 'past-auction-071526',
        auctionTitle: 'Gardner Auction — Pittsburgh Steel Baron Heirlooms 07/15/26',
        lotNumber: 'Lot 602',
        categoryTag: 'AMERICAN ART NOUVEAU SILVER',
        department: 'Americana & Antiques',
        title: 'Gorham Martelé .950 Britannia Silver Loving Cup, c. 1904',
        description: 'Master hand-hammered Art Nouveau handles with undulating lily pads.',
        details: 'Sample code stamped under base. Entirely hand-wrought and chased in higher-than-sterling .950 silver. Recorded in Gorham factory archives as taking over 78 hours of hand chasing.',
        image: '/images/antique_silver.jpg',
        priceRealized: '$9,800.00',
        startingBid: 5500,
        estimateLow: 8500,
        estimateHigh: 13000,
        bidsCount: 25,
        dateSold: '07/15/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Exhibited at 1904 St. Louis World\'s Fair; private Fox Chapel estate.',
        conditionReport: 'Flawless preservation of original Martelé planishing hammer marks.',
        dimensions: 'Height: 11 inches · Weight: 1,420 grams .950 Silver',
        specialistNote: 'Pinnacle specimen of American hand-hammered silver craftsmanship.'
      }
    ]
  },
  {
    id: 'past-auction-062526',
    title: 'Gardner Auction — Historic Sports & Presidential Ephemera 06/25/26',
    auctionType: 'Online Only Auction',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 6/17/2026 - 6/25/2026',
    scheduleText: '06/17/26 @ 10:00 AM thru 06/25/26 @ 05:00 PM EST',
    description: 'Rare historical artifacts, sports relics, and early political ephemera. Including Forbes Field Pittsburgh Pirates championship programs, Roberto Clemente game-used memorabilia, 1920s autographed baseballs, and early colonial Pennsylvania land patents.',
    biddingNotice: 'All items finalized and closed. High bid records permanently logged.',
    auctionNotice: 'Autographs certified by PSA/DNA, JSA, and Beckett Authentication Services.',
    image: '/images/art_gallery.jpg',
    category: 'Vintage Memorabilia',
    lotsCount: 164,
    totalRealized: '$620,000',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-701',
        auctionId: 'past-auction-062526',
        auctionTitle: 'Gardner Auction — Historic Sports & Ephemera 06/25/26',
        lotNumber: 'Lot 701',
        categoryTag: 'FORBES FIELD HERITAGE',
        department: 'Vintage Memorabilia',
        title: '1960 Pittsburgh Pirates World Series Game 7 Ticket Stub & Program',
        description: 'Authenticated Mazeroski walk-off championship game ephemera.',
        details: 'Original October 13, 1960 Game 7 ticket stub from Forbes Field, seat Lower Box 12-A, paired with official World Series scoring program neatly preserved.',
        image: '/images/art_gallery.jpg',
        priceRealized: '$1,850.00',
        startingBid: 800,
        estimateLow: 1500,
        estimateHigh: 2200,
        bidsCount: 20,
        dateSold: '06/25/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Attended by lifelong Oakland, Pittsburgh resident; preserved in family album.',
        conditionReport: 'PSA Authenticated. Clean perforations with strong vibrant color printing.',
        dimensions: 'Ticket: 4.5 x 2.25 inches · Program: 8.5 x 11 inches',
        specialistNote: 'Historic artifact from the greatest game-ending home run in baseball history.'
      },
      {
        id: 'past-lot-702',
        auctionId: 'past-auction-062526',
        auctionTitle: 'Gardner Auction — Historic Sports & Ephemera 06/25/26',
        lotNumber: 'Lot 702',
        categoryTag: 'BASEBALL HALL OF FAME',
        department: 'Vintage Memorabilia',
        title: 'Roberto Clemente 1971 Game-Used H&B Louisville Slugger Bat (PSA/DNA GU 9.5)',
        description: 'Model U1, uncracked, heavy ball marks, ball stitch impressions, cleat marks.',
        details: 'Used by Roberto Clemente during the 1971 National League Championship and World Series winning season. Accompanied by full Letter of Authenticity from John Taube / PSA/DNA.',
        image: '/images/art_gallery.jpg',
        priceRealized: '$24,500.00',
        startingBid: 12000,
        estimateLow: 20000,
        estimateHigh: 30000,
        bidsCount: 42,
        dateSold: '06/25/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Gifted by Clemente to Forbes Field batboy in September 1971; thence by family.',
        conditionReport: 'Museum-grade preservation. Clear burned factory center branding and Clemente signature model stamped on barrel.',
        dimensions: 'Length: 36 inches · Weight: 35.8 ounces',
        specialistNote: 'Monumental provenance directly from Pittsburgh championship folklore.'
      }
    ]
  },
  {
    id: 'past-auction-060826',
    title: 'Gardner Auction — Carson City Silver Hoard & Territorial Coins 06/08/26',
    auctionType: 'Online Only Auction',
    status: 'Past Auction',
    companyName: 'Gardner Auction Appraisers',
    address: '4200 Commercial Boulevard, Suite 100',
    cityStateZip: 'Pittsburgh, PA 15201',
    mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
    dateRange: 'Date(s) 5/30/2026 - 6/08/2026',
    scheduleText: '05/30/26 @ 09:00 AM thru 06/08/26 @ 06:00 PM EST',
    description: 'Unsearched GSA Hoard Carson City Morgan silver dollars in original black Government Services Administration plastic presentation holders with numbered certificates. Highlighting key dates 1885-CC, 1889-CC, and 1893-CC with brilliant frosty mirrors.',
    biddingNotice: 'Session completed. Registered bidders settled electronically.',
    auctionNotice: 'All coins in original uncracked Gov GSA cases with matching serial inserts.',
    image: '/images/morgan_dollar.jpg',
    category: 'Coins & Currency',
    lotsCount: 240,
    totalRealized: '$1,180,000',
    shipping: 'Shipping Available',
    lots: [
      {
        id: 'past-lot-801',
        auctionId: 'past-auction-060826',
        auctionTitle: 'Gardner Auction — Carson City Silver Hoard 06/08/26',
        lotNumber: 'Lot 801',
        categoryTag: 'GSA HOARD SILVER',
        department: 'Coins & Currency',
        title: '1885-CC Morgan Silver Dollar in Original GSA Hard Pack with Box',
        description: 'Low mintage key date, blazing original mint luster, NGC MS-64.',
        details: 'One of the lowest mintage Carson City Morgan dollars, with only 228,000 struck. Encapsulated in the original 1970s GSA hard plastic pack with official Treasury certificate.',
        image: '/images/morgan_dollar.jpg',
        priceRealized: '$1,650.00',
        startingBid: 900,
        estimateLow: 1400,
        estimateHigh: 1900,
        bidsCount: 23,
        dateSold: '06/08/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Purchased directly from the 1973 U.S. General Services Administration mail auction.',
        conditionReport: 'NGC MS-64 GSA. Untouched blast-white surfaces with deep cameo frost on the device.',
        dimensions: 'Diameter: 38.1mm · Weight: 26.73g · .900 Silver',
        specialistNote: 'Exceptional condition for this tough date; complete with original blue velvet box.'
      },
      {
        id: 'past-lot-802',
        auctionId: 'past-auction-060826',
        auctionTitle: 'Gardner Auction — Carson City Silver Hoard 06/08/26',
        lotNumber: 'Lot 802',
        categoryTag: 'KEY DATE CARSON CITY',
        department: 'Coins & Currency',
        title: '1893-CC Morgan Silver Dollar PCGS MS-62',
        description: 'Final year of Carson City Mint coining. Full radial luster, bold mintmark.',
        details: 'The celebrated 1893-CC Morgan is among the most sought-after silver dollars in American numismatics. Very scarce in uncirculated grades.',
        image: '/images/morgan_dollar.jpg',
        priceRealized: '$7,200.00',
        startingBid: 4000,
        estimateLow: 6500,
        estimateHigh: 8500,
        bidsCount: 36,
        dateSold: '06/08/2026',
        auctionHouse: 'Gardner Auction',
        location: 'Pittsburgh, PA',
        shipping: 'Shipping Available',
        provenance: 'Discovered in a safe deposit vault in Oil City, Pennsylvania in 1991.',
        conditionReport: 'PCGS MS-62 certified with Gold Shield verification. Untoned lustrous cartwheel surfaces.',
        dimensions: 'Diameter: 38.1mm · .900 Fine Silver',
        specialistNote: 'Key frontier date in demand by advanced collectors.'
      }
    ]
  }
];

// Helper to extract all past lots across all past auctions
export const ALL_PAST_LOTS: PastLotItem[] = PAST_AUCTIONS.flatMap((auction) => auction.lots);

// Lookup helpers for routing and dynamic binding
export const getPastAuctionById = (id: string): PastAuction | undefined => {
  return PAST_AUCTIONS.find((a) => a.id.toLowerCase() === id.toLowerCase());
};

export const getPastLotsByAuctionId = (auctionId: string): PastLotItem[] => {
  const auction = getPastAuctionById(auctionId);
  return auction ? auction.lots : [];
};

export const getPastLotById = (id: string): PastLotItem | undefined => {
  if (!id) return undefined;
  const clean = id.toLowerCase().trim();
  
  // 1. Direct ID match
  const direct = ALL_PAST_LOTS.find((l) => l.id.toLowerCase() === clean);
  if (direct) return direct;

  // 2. Normalized prefix match (e.g. "past-lot-402" <-> "lot-402" <-> "402")
  const digitsOnly = clean.replace(/^(past-)?lot-?/i, '');
  const byDigits = ALL_PAST_LOTS.find((l) => {
    const lotDigits = l.id.toLowerCase().replace(/^(past-)?lot-?/i, '');
    const numDigits = l.lotNumber.toLowerCase().replace(/\D/g, '');
    return lotDigits === digitsOnly || numDigits === digitsOnly;
  });
  if (byDigits) return byDigits;

  // 3. Match by lotNumber (e.g. "Lot 402" -> "lot402")
  return ALL_PAST_LOTS.find(
    (l) => l.lotNumber.toLowerCase().replace(/\s+/g, '') === clean.replace(/\s+/g, '')
  );
};

export interface ResolvedLotData {
  lot: PastLotItem;
  parentAuction?: PastAuction;
  prevLot: PastLotItem | null;
  nextLot: PastLotItem | null;
  galleryImages: string[];
  isLive: boolean;
}

/**
 * Returns contextual gallery images for a given lot based on its media and category
 */
export const getLotGalleryImages = (lot: PastLotItem): string[] => {
  const primary = lot.image;
  const list: string[] = [primary];

  const dept = (lot.department || '').toLowerCase();
  const cat = (lot.categoryTag || '').toLowerCase();
  const title = (lot.title || '').toLowerCase();

  if (dept.includes('coin') || cat.includes('numismatic') || title.includes('coin') || title.includes('dollar') || title.includes('saint-gaudens')) {
    list.push('/images/hero_coin.jpg', '/images/morgan_dollar.jpg', '/images/gold_bullion.jpg');
  } else if (dept.includes('art') || cat.includes('impressionism') || cat.includes('realism') || title.includes('oil') || title.includes('painting')) {
    list.push('/images/art_gallery.jpg', '/images/gorson_painting.jpg');
  } else if (dept.includes('bullion') || title.includes('ingot') || title.includes('bullion') || title.includes('gold') || title.includes('silver')) {
    list.push('/images/gold_bullion.jpg', '/images/hero_coin.jpg', '/images/antique_silver.jpg');
  } else if (dept.includes('jewelry') || dept.includes('watch') || title.includes('ring') || title.includes('patek') || title.includes('brooch')) {
    list.push('/images/diamond_ring.jpg', '/images/gold_bullion.jpg');
  } else if (dept.includes('furniture') || dept.includes('americana') || title.includes('clock') || title.includes('desk') || title.includes('cabinet')) {
    list.push('/images/grandfather_clock.jpg', '/images/antique_silver.jpg');
  } else if (dept.includes('silver') || title.includes('silver') || title.includes('sterling')) {
    list.push('/images/antique_silver.jpg', '/images/gold_bullion.jpg');
  } else {
    list.push('/images/art_gallery.jpg', '/images/gold_bullion.jpg');
  }

  // Deduplicate preserving primary as the very first element
  const deduped: string[] = [];
  for (const img of list) {
    if (!deduped.includes(img)) {
      deduped.push(img);
    }
  }
  return deduped;
};

/**
 * Resolves full lot data, parent auction, neighboring lots for pagination, and gallery images
 */
export const resolveLotData = (lotId: string, preferredAuctionId?: string): ResolvedLotData | null => {
  if (!lotId) return null;
  const clean = lotId.toLowerCase().trim();

  const lot = getPastLotById(clean);
  if (lot) {
    // Determine parent auction
    const targetAuctionId = preferredAuctionId || lot.auctionId;
    const parentAuction = getPastAuctionById(targetAuctionId) || getPastAuctionById(lot.auctionId);

    // Determine prev and next lots in the catalog
    let prevLot: PastLotItem | null = null;
    let nextLot: PastLotItem | null = null;

    const lotList = parentAuction ? parentAuction.lots : ALL_PAST_LOTS;
    const currentIndex = lotList.findIndex((l) => l.id.toLowerCase() === lot.id.toLowerCase());

    if (currentIndex > 0) {
      prevLot = lotList[currentIndex - 1];
    }
    if (currentIndex >= 0 && currentIndex < lotList.length - 1) {
      nextLot = lotList[currentIndex + 1];
    }

    const galleryImages = getLotGalleryImages(lot);

    return {
      lot,
      parentAuction,
      prevLot,
      nextLot,
      galleryImages,
      isLive: false
    };
  }

  // Fallback check in live lots
  const allLive = [SPOTLIGHT_LOT, ...LIVE_LOTS];
  const liveMatch = allLive.find(
    (l) =>
      l.id.toLowerCase() === clean ||
      l.lotNumber.toLowerCase().replace(/\s+/g, '') === clean.replace(/\s+/g, '') ||
      l.id.toLowerCase().replace(/^lot-?/, '') === clean.replace(/^(past-)?lot-?/, '')
  );

  if (liveMatch) {
    // Adapt live lot into PastLotItem format for consistent view rendering
    const adapted: PastLotItem = {
      id: liveMatch.id,
      auctionId: 'live-keystone-session-1',
      auctionTitle: 'Gardner Auction — Spring Continental Art & Americana Session 1',
      lotNumber: liveMatch.lotNumber,
      categoryTag: liveMatch.categoryTag,
      department: liveMatch.department,
      title: liveMatch.title,
      description: liveMatch.description,
      details: liveMatch.details,
      image: liveMatch.image,
      priceRealized: `$${liveMatch.currentBid.toLocaleString()}.00`,
      startingBid: liveMatch.startingBid,
      estimateLow: liveMatch.estimateLow,
      estimateHigh: liveMatch.estimateHigh,
      bidsCount: liveMatch.bidsCount,
      dateSold: 'Active Live Bidding',
      auctionHouse: 'Gardner Auction Appraisers',
      location: 'Pittsburgh, PA Gallery & Online Webcast',
      shipping: 'Insured White-Glove Shipping Available',
      provenance: liveMatch.provenance,
      conditionReport: liveMatch.conditionReport,
      dimensions: liveMatch.dimensions,
      specialistNote: liveMatch.specialistNote
    };

    const galleryImages = getLotGalleryImages(adapted);

    return {
      lot: adapted,
      parentAuction: {
        id: 'live-keystone-session-1',
        title: 'Gardner Auction — Spring Continental Art & Americana Session 1',
        auctionType: 'Live Webcast Auction',
        status: 'Past Auction',
        companyName: 'Gardner Auction Appraisers',
        address: '4200 Commercial Boulevard, Suite 100',
        cityStateZip: 'Pittsburgh, PA 15201',
        mapQuery: '4200+Commercial+Boulevard+Pittsburgh+PA+15201',
        dateRange: 'Active Session Live Webcast',
        scheduleText: 'Live Gavel in Progress',
        description: 'Active premier live bidding session broadcast directly from our Pittsburgh gallery floor.',
        biddingNotice: 'Live webcast bidding active with real-time floor increments.',
        auctionNotice: 'PA Auctioneer Lic. #AY-002004.',
        image: liveMatch.image,
        category: liveMatch.department,
        lotsCount: allLive.length,
        totalRealized: 'Active',
        shipping: 'Shipping Available',
        lots: []
      },
      prevLot: null,
      nextLot: null,
      galleryImages,
      isLive: true
    };
  }

  return null;
};



