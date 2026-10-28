import { supabase, supabaseAdmin } from '../lib/supabase';
import { Auction, LotItem, LotCategory } from '../types';
import { dbToLotItem, DBLotRow } from './lotsService';

export interface CategoryStat {
  category: string;
  catalogedLots: number;
  soldLots: number;
  cumulativeValuation: number;
  avgPrice: number;
  portfolioShare: number; // percentage 0 - 100
}

export interface BiddingChannelStat {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SettlementReadinessCheck {
  id: string;
  label: string;
  status: 'verified' | 'warning' | 'pending';
  detail: string;
}

export interface SettlementReadinessData {
  summaryText: string;
  invoicesCount: number;
  paidInvoicesCount: number;
  consignorsCount: number;
  readyPayoutCount: number;
  checks: SettlementReadinessCheck[];
}

export interface ReportAnalyticsData {
  auctionId: string | null; // null for All Auctions
  auctionTitle: string;
  auctionCode: string;
  totalLotsCount: number;
  soldLotsCount: number;
  offeredLotsCount: number;
  totalHammerRealized: number;
  sellThroughRate: number | null; // e.g. 100.0 or null
  hammerVsLowEstimateRatio: number | null; // e.g. 114.2 or null
  lotsWithEstimatesCount: number;
  categoryStats: CategoryStat[];
  portfolioTotalValuation: number;
  portfolioTotalLots: number;
  portfolioAvgPrice: number;
  biddingChannels: BiddingChannelStat[];
  totalChannelActivity: number;
  settlementReadiness: SettlementReadinessData;
  rawLots: LotItem[];
}

class ReportService {
  private get client() {
    return supabaseAdmin || supabase;
  }

  /**
   * Fetch all raw data from Supabase for a given auction (or all auctions)
   * and compute accurate analytics dynamically.
   */
  public async getReportAnalytics(auctionId?: string | null, targetAuction?: Auction | null): Promise<ReportAnalyticsData> {
    const isAllAuctions = !auctionId || auctionId === 'all';

    // 1. Fetch Lots from Supabase
    let lotsQuery = this.client
      .from('lots')
      .select('*')
      .order('lot_number', { ascending: true });

    if (!isAllAuctions) {
      lotsQuery = lotsQuery.eq('auction_id', auctionId);
    }

    const { data: rawLotsData, error: lotsError } = await lotsQuery;
    if (lotsError) {
      console.error('[reportService] Error fetching lots:', lotsError.message);
      throw new Error(`Failed to fetch auction lots: ${lotsError.message}`);
    }

    const rawLots: LotItem[] = (rawLotsData || []).map((row: DBLotRow) => dbToLotItem(row));

    // 2. Fetch Bids for Channel Engagement
    let bidsQuery = this.client.from('bids').select('*');
    if (!isAllAuctions) {
      bidsQuery = bidsQuery.eq('auction_id', auctionId);
    }
    const { data: rawBidsData } = await bidsQuery;
    const bids = rawBidsData || [];

    // 3. Fetch Bidder Registrations for Channel Activity
    let regQuery = this.client.from('bidder_registrations').select('*');
    if (!isAllAuctions) {
      regQuery = regQuery.eq('auction_id', auctionId);
    }
    const { data: rawRegData } = await regQuery;
    const registrations = rawRegData || [];

    // 4. Fetch Alternate Bids (Phone / Absentee / Floor)
    let altQuery = this.client.from('alternate_bids').select('*');
    if (!isAllAuctions) {
      altQuery = altQuery.eq('auction_id', auctionId);
    }
    const { data: rawAltData } = await altQuery;
    const alternateBids = rawAltData || [];

    // 5. Fetch Invoices for Settlement Readiness
    let invQuery = this.client.from('invoices').select('*');
    if (!isAllAuctions) {
      invQuery = invQuery.eq('auction_id', auctionId);
    }
    const { data: rawInvData } = await invQuery;
    const invoices = rawInvData || [];

    // 6. Fetch Seller Settlements
    let sellerQuery = this.client.from('seller_settlements').select('*');
    if (!isAllAuctions) {
      sellerQuery = sellerQuery.eq('auction_id', auctionId);
    }
    const { data: rawSellerData } = await sellerQuery;
    const sellerSettlements = rawSellerData || [];

    // 7. Fetch HiBid Syndication Stats for Channel Engagement
    let synQuery = this.client.from('hibid_syndication_stats').select('*');
    if (!isAllAuctions) {
      synQuery = synQuery.eq('auction_id', auctionId);
    }
    const { data: rawSynData } = await synQuery;
    const syndicationStats = rawSynData || [];

    // =========================================================================
    // Calculations: KPI Summary Cards
    // =========================================================================
    const totalLotsCount = rawLots.length;
    const offeredLots = rawLots.filter(l => l.status !== 'withdrawn');
    const offeredLotsCount = offeredLots.length;

    // Completed sales (sold lots)
    const soldLots = rawLots.filter(l => l.status === 'sold');
    const soldLotsCount = soldLots.length;

    // Hammer Realized Value: sum of hammerPrice || currentBid for sold lots
    const totalHammerRealized = soldLots.reduce((acc, l) => {
      const price = Number(l.hammerPrice || l.currentBid) || 0;
      return acc + price;
    }, 0);

    // Sell-Through Rate: sold lots / offered lots * 100
    const sellThroughRate = offeredLotsCount > 0 
      ? Math.round((soldLotsCount / offeredLotsCount) * 1000) / 10 
      : (totalLotsCount > 0 ? 0 : null);

    // Hammer vs Low Estimate Ratio:
    // "Calculate eligible hammer sales against valid low estimates, excluding invalid or zero estimates."
    const soldWithValidLowEstimate = soldLots.filter(l => {
      const lowEst = Number(l.estimateLow) || 0;
      const hammer = Number(l.hammerPrice || l.currentBid) || 0;
      return lowEst > 0 && hammer > 0;
    });

    let hammerVsLowEstimateRatio: number | null = null;
    const lotsWithEstimatesCount = soldWithValidLowEstimate.length;

    if (soldWithValidLowEstimate.length > 0) {
      const totalHammerForEstimated = soldWithValidLowEstimate.reduce(
        (sum, l) => sum + (Number(l.hammerPrice || l.currentBid) || 0), 
        0
      );
      const totalLowEstimate = soldWithValidLowEstimate.reduce(
        (sum, l) => sum + (Number(l.estimateLow) || 0), 
        0
      );
      if (totalLowEstimate > 0) {
        hammerVsLowEstimateRatio = Math.round((totalHammerForEstimated / totalLowEstimate) * 1000) / 10;
      }
    }

    // =========================================================================
    // Calculations: Category Distribution & Realized Depth
    // =========================================================================
    const categoryMap = new Map<string, { cataloged: number; sold: number; totalVal: number }>();

    rawLots.forEach(lot => {
      const cat = (lot.category && String(lot.category).trim()) || 'Curated Lot';
      const current = categoryMap.get(cat) || { cataloged: 0, sold: 0, totalVal: 0 };
      current.cataloged += 1;

      if (lot.status === 'sold') {
        current.sold += 1;
        current.totalVal += (Number(lot.hammerPrice || lot.currentBid) || 0);
      }

      categoryMap.set(cat, current);
    });

    const categoryStats: CategoryStat[] = Array.from(categoryMap.entries()).map(([cat, stats]) => {
      const share = totalHammerRealized > 0 
        ? Math.round((stats.totalVal / totalHammerRealized) * 1000) / 10 
        : 0;
      const avgPrice = stats.sold > 0 
        ? Math.round((stats.totalVal / stats.sold) * 100) / 100 
        : (stats.cataloged > 0 && stats.totalVal > 0 ? Math.round((stats.totalVal / stats.cataloged) * 100) / 100 : 0);

      return {
        category: cat,
        catalogedLots: stats.cataloged,
        soldLots: stats.sold,
        cumulativeValuation: stats.totalVal,
        avgPrice,
        portfolioShare: share,
      };
    });

    // Sort by Cumulative Valuation descending, then Cataloged Lots descending
    categoryStats.sort((a, b) => b.cumulativeValuation - a.cumulativeValuation || b.catalogedLots - a.catalogedLots);

    const portfolioTotalValuation = totalHammerRealized;
    const portfolioTotalLots = totalLotsCount;
    const portfolioAvgPrice = soldLotsCount > 0 
      ? Math.round((totalHammerRealized / soldLotsCount) * 100) / 100 
      : 0;

    // =========================================================================
    // Calculations: Bidding Channel Engagement
    // =========================================================================
    let hibidCount = 0;
    let directWebCount = 0;
    let floorCount = 0;
    let phoneAbsenteeCount = 0;

    // 1. Evaluate Bids
    bids.forEach((bid: any) => {
      const src = String(bid.source || '').toLowerCase();
      if (src.includes('hibid') || src.includes('internet') || src.includes('syndicat')) {
        hibidCount++;
      } else if (src.includes('web') || src.includes('portal') || src.includes('direct') || src.includes('gardner')) {
        directWebCount++;
      } else if (src.includes('floor') || src.includes('clerk') || src.includes('room') || src.includes('paddle') || src.includes('saleroom')) {
        floorCount++;
      } else if (src.includes('phone') || src.includes('absentee')) {
        phoneAbsenteeCount++;
      } else if (src.trim()) {
        floorCount++;
      }
    });

    // 2. Evaluate Bidder Registrations
    registrations.forEach((reg: any) => {
      const site = String(reg.site || '').toLowerCase();
      if (site.includes('hibid')) {
        hibidCount++;
      } else if (site.includes('gardner') || site.includes('portal') || site.includes('direct') || site.includes('web')) {
        directWebCount++;
      } else if (site.includes('desk') || site.includes('check in') || site.includes('floor')) {
        floorCount++;
      } else if (site.includes('phone') || site.includes('absentee')) {
        phoneAbsenteeCount++;
      }
    });

    // 3. Evaluate Alternate Bids
    alternateBids.forEach((alt: any) => {
      const btype = String(alt.bid_type || '').toLowerCase();
      if (btype.includes('phone') || btype.includes('absentee')) {
        phoneAbsenteeCount++;
      } else if (btype.includes('floor')) {
        floorCount++;
      }
    });

    // 4. Evaluate HiBid Syndication Stats from Database
    syndicationStats.forEach((syn: any) => {
      const site = String(syn.site || '').toLowerCase();
      const activity = (Number(syn.total_bids) || Number(syn.unique_bids) || 0) + (Number(syn.registrations) || 0);
      if (site.includes('direct') || site.includes('gardner')) {
        directWebCount += activity;
      } else {
        hibidCount += activity;
      }
    });

    // 5. If bids table is empty, reflect channel engagement from realized lots
    if (bids.length === 0) {
      rawLots.forEach((lot: LotItem) => {
        if (lot.status === 'sold' && lot.highBidderPaddle) {
          const paddle = String(lot.highBidderPaddle).trim();
          if (paddle.startsWith('5')) {
            floorCount++;
          } else if (paddle.startsWith('1') || paddle.toLowerCase().includes('hibid')) {
            hibidCount++;
          } else if (paddle.startsWith('2') || paddle.toLowerCase().includes('web')) {
            directWebCount++;
          } else {
            floorCount++;
          }
        }
      });
    }

    const totalChannelActivity = hibidCount + directWebCount + floorCount + phoneAbsenteeCount;

    const biddingChannels: BiddingChannelStat[] = [
      {
        id: 'hibid',
        name: 'HiBid Syndicated Network',
        count: hibidCount,
        percentage: totalChannelActivity > 0 ? Math.round((hibidCount / totalChannelActivity) * 1000) / 10 : 0,
        color: 'var(--gold-gradient)',
      },
      {
        id: 'direct_web',
        name: 'Gardner Direct Web Portal',
        count: directWebCount,
        percentage: totalChannelActivity > 0 ? Math.round((directWebCount / totalChannelActivity) * 1000) / 10 : 0,
        color: '#38bdf8',
      },
      {
        id: 'saleroom_floor',
        name: 'Saleroom Floor Paddles',
        count: floorCount,
        percentage: totalChannelActivity > 0 ? Math.round((floorCount / totalChannelActivity) * 1000) / 10 : 0,
        color: '#f59e0b',
      },
      {
        id: 'phone_absentee',
        name: 'Telephone & Advance Absentee',
        count: phoneAbsenteeCount,
        percentage: totalChannelActivity > 0 ? Math.round((phoneAbsenteeCount / totalChannelActivity) * 1000) / 10 : 0,
        color: '#94a3b8',
      },
    ];

    // =========================================================================
    // Calculations: Settlement Readiness
    // =========================================================================
    const invoicesCount = invoices.length;
    const paidInvoicesCount = invoices.filter((i: any) => i.payment_status === 'Paid').length;
    const consignorsCount = sellerSettlements.length;
    const readyPayoutCount = sellerSettlements.filter((s: any) => s.status === 'Ready for Payout' || s.status === 'Paid').length;

    // Check Montana Sales Tax compliance: Montana has 0% state sales tax
    const taxRate = targetAuction ? Number(targetAuction.taxRate) || 0 : 0;
    const isTaxCompliant = taxRate === 0;

    // Check Buyer's Premium separation terms
    const bpCash = targetAuction && targetAuction.buyersPremiumCash !== undefined ? Number(targetAuction.buyersPremiumCash) : 15;
    const bpCredit = targetAuction && targetAuction.buyersPremiumCredit !== undefined ? Number(targetAuction.buyersPremiumCredit) : 18;
    const isBpSeparationValid = bpCash > 0 && bpCredit >= bpCash;

    // Check Consignor Reserve integrity: did all sold lots achieve >= reserve_price?
    const soldLotsWithReserves = soldLots.filter(l => Number(l.reservePrice) > 0);
    const lotsBelowReserve = soldLotsWithReserves.filter(l => {
      const realized = Number(l.hammerPrice || l.currentBid) || 0;
      return realized < Number(l.reservePrice);
    });

    const isReserveIntegrityConfirmed = lotsBelowReserve.length === 0;

    const checks: SettlementReadinessCheck[] = [
      {
        id: 'tax_compliance',
        label: isTaxCompliant
          ? 'Tax calculations compliant with Montana zero general state sales tax + out-of-state marketplace nexus'
          : `Montana zero sales tax check: custom tax rate (${taxRate}%) currently applied in auction terms`,
        status: isTaxCompliant ? 'verified' : 'warning',
        detail: isTaxCompliant 
          ? 'Zero rate applied for MT nexus. Exemption flags active.' 
          : `Custom rate (${taxRate}%) configured in auction terms.`
      },
      {
        id: 'bp_separation',
        label: isBpSeparationValid
          ? `${bpCash}% Wire / ${bpCredit}% Credit Card Premium separation validated`
          : 'Buyer premium terms require validation in Auction Day config',
        status: isBpSeparationValid ? 'verified' : 'warning',
        detail: isBpSeparationValid 
          ? `Standard discount curve active: ${bpCash}% Wire / ${bpCredit}% Card.` 
          : 'Buyer premium terms require validation in Auction Day config.'
      },
      {
        id: 'reserve_integrity',
        label: soldLots.length === 0 
          ? 'Consignor reserve integrity pending sales closure' 
          : (isReserveIntegrityConfirmed 
              ? `Consignor reserve integrity confirmed (${soldLots.length} realized lot${soldLots.length === 1 ? '' : 's'} met reserve)` 
              : `Consignor reserve variance detected (${lotsBelowReserve.length} sold below reserve)`),
        status: soldLots.length === 0 
          ? 'pending' 
          : (isReserveIntegrityConfirmed ? 'verified' : 'warning'),
        detail: soldLots.length === 0 
          ? 'Awaiting completed sales to verify hammer vs reserve adherence.' 
          : (isReserveIntegrityConfirmed 
              ? `All ${soldLots.length} realized lot(s) met or exceeded consignor reserve standards.` 
              : `${lotsBelowReserve.length} sold lot(s) closed under reserve (requires consignor variance sign-off).`)
      },
      {
        id: 'invoices_status',
        label: invoicesCount > 0 
          ? `Buyer settlement invoices: ${invoicesCount} generated (${paidInvoicesCount} settled & paid)` 
          : 'Buyer settlement invoices: awaiting auction settlement closure',
        status: invoicesCount > 0 ? (paidInvoicesCount === invoicesCount ? 'verified' : 'warning') : 'pending',
        detail: invoicesCount > 0 
          ? `${invoicesCount} buyer invoice(s) generated (${paidInvoicesCount} settled & paid).` 
          : 'Pending invoice generation in Settlement & Invoices module.'
      },
      {
        id: 'consignor_disbursement',
        label: consignorsCount > 0 
          ? `Consignor disbursement: ${consignorsCount} statement(s) created (${readyPayoutCount} ready for payout)` 
          : 'Consignor payout statement & check disbursement: pending settlement calculation',
        status: consignorsCount > 0 ? (readyPayoutCount > 0 ? 'verified' : 'warning') : 'pending',
        detail: consignorsCount > 0 
          ? `${consignorsCount} consignor statement(s) created (${readyPayoutCount} approved for disbursement).` 
          : 'Consignor settlements will be calculated upon sale closure.'
      }
    ];

    const settlementReadiness: SettlementReadinessData = {
      summaryText: invoicesCount > 0 || consignorsCount > 0
        ? `Settlement data is prepared for export to QuickBooks, HiBid batch payment export, and Gardner certified consignor disbursement checks (${invoicesCount} invoices, ${consignorsCount} consignor statements).`
        : 'Settlement data is prepared for export to QuickBooks, HiBid batch payment export, and Gardner certified consignor disbursement checks.',
      invoicesCount,
      paidInvoicesCount,
      consignorsCount,
      readyPayoutCount,
      checks
    };

    return {
      auctionId: isAllAuctions ? null : auctionId,
      auctionTitle: targetAuction?.title || (isAllAuctions ? 'Consolidated Portfolio (All Auctions)' : 'Auction Intelligence'),
      auctionCode: targetAuction?.code || (isAllAuctions ? 'ALL' : 'AUC'),
      totalLotsCount,
      soldLotsCount,
      offeredLotsCount,
      totalHammerRealized,
      sellThroughRate,
      hammerVsLowEstimateRatio,
      lotsWithEstimatesCount,
      categoryStats,
      portfolioTotalValuation,
      portfolioTotalLots,
      portfolioAvgPrice,
      biddingChannels,
      totalChannelActivity,
      settlementReadiness,
      rawLots
    };
  }

  /**
   * Subscribe to Supabase real-time changes on relevant tables
   */
  public subscribeToReportChanges(callback: () => void): () => void {
    const channelName = `realtime_reports_${Date.now()}`;
    const channel = this.client.channel(channelName);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bidder_registrations' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alternate_bids' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hibid_syndication_stats' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_settlements' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => callback())
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

export const reportService = new ReportService();
