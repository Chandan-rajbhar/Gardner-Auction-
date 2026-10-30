import { supabaseAdmin, supabase } from '../lib/supabase';
import { 
  AuctionDetail, 
  BidderRegistration, 
  AlternateBid, 
  HiBidSiteStat, 
  AuctionLotStat,
  BidderDeposit
} from '../types/auctionDetail';
import { LotItem } from '../types';
import { auctionService } from './auctionService';
import { lotsService } from './lotsService';
import { settlementService } from './settlementService';
import { DEFAULT_HIBID_SITES, MOCK_AUCTIONS_DETAIL } from '../data/mockAuctionDetailData';

export interface AuctionDayMetrics {
  lotCount: number;
  checkInCount: number;
  uniqueSellers: number;
  presaleMin: number;
  presaleMax: number;
  avgEstimate: number | null;
  avgSalesPrice: number | null;
  hibidUrl: string;
}

export interface AuctionDayPayload {
  auction: AuctionDetail;
  lots: LotItem[];
  metrics: AuctionDayMetrics;
  registrations: BidderRegistration[];
  alternateBids: AlternateBid[];
  siteStats: HiBidSiteStat[];
  lotStats: AuctionLotStat[];
  deposits: BidderDeposit[];
}

class AuctionDayService {
  /**
   * Calculate live metrics from lots and registered bidders
   */
  public computeMetrics(
    auctionLots: LotItem[], 
    registrations: BidderRegistration[],
    hibidUrl: string = 'https://hibid.com'
  ): AuctionDayMetrics {
    const lotCount = auctionLots.length;

    // Check In Count: number of registered bidders with isCheckedIn === true
    const checkInCount = registrations.filter(r => r.isCheckedIn).length;

    // Unique Sellers: distinct consignors represented in this auction's lots
    const uniqueConsignors = new Set<string>();
    auctionLots.forEach(lot => {
      const name = lot.consignorName || (lot as any).sellerName || (lot as any).consignor_name;
      if (name && name.trim()) {
        uniqueConsignors.add(name.trim());
      }
    });
    const uniqueSellers = uniqueConsignors.size;

    // Presale Min & Max: sum of low and high estimates
    const presaleMin = auctionLots.reduce((sum, lot) => sum + (Number(lot.estimateLow) || 0), 0);
    const presaleMax = auctionLots.reduce((sum, lot) => sum + (Number(lot.estimateHigh) || 0), 0);

    // Avg Estimate Per Lot: (presaleMin + presaleMax) / 2 / lotCount
    const avgEstimate = lotCount > 0 
      ? Math.round(((presaleMin + presaleMax) / 2 / lotCount) * 100) / 100 
      : null;

    // Avg Sales Price: average realized price based on completed sales with valid prices
    const soldLots = auctionLots.filter(l => l.status === 'sold' && (Number(l.hammerPrice) > 0 || Number(l.currentBid) > 0));
    let avgSalesPrice: number | null = null;
    if (soldLots.length > 0) {
      const totalSoldAmount = soldLots.reduce((sum, l) => sum + (Number(l.hammerPrice) || Number(l.currentBid) || 0), 0);
      avgSalesPrice = Math.round((totalSoldAmount / soldLots.length) * 100) / 100;
    }

    return {
      lotCount,
      checkInCount,
      uniqueSellers,
      presaleMin,
      presaleMax,
      avgEstimate,
      avgSalesPrice,
      hibidUrl
    };
  }

  /**
   * Fetch complete Auction Day dataset for a selected auction
   */
  public async getAuctionDayData(auctionId: string, currentLots: LotItem[] = []): Promise<AuctionDayPayload> {
    // 1. Fetch auction detail from auctionService / Supabase
    let auction = await auctionService.getAuctionById(auctionId);
    if (!auction) {
      const all = await auctionService.getAuctions();
      auction = all.find(a => a.id === auctionId) || all[0] || MOCK_AUCTIONS_DETAIL[0];
    }

    // 2. Fetch lots from Supabase or fallback
    let allLots = currentLots;
    if (!allLots || allLots.length === 0) {
      allLots = await lotsService.fetchLots();
    }

    // Filter lots scoped strictly to this auction (excluding mock reference lots)
    const auctionLots = allLots.filter(l => 
      l.auctionId === auction.id && !l.id?.startsWith('lot-ref-')
    );

    // 3. Load registrations, alternate bids, deposits, and syndication site stats
    let registrations: BidderRegistration[] = [];
    let alternateBids: AlternateBid[] = [];
    let siteStats: HiBidSiteStat[] = [];
    let lotStats: AuctionLotStat[] = [];
    let deposits: BidderDeposit[] = [];

    // Attempt dedicated Supabase tables first: bidder_registrations
    try {
      const { data: regData } = await supabaseAdmin
        .from('bidder_registrations')
        .select('*')
        .eq('auction_id', auction.id)
        .order('created_at', { ascending: false });

      if (regData && regData.length > 0) {
        registrations = regData.map((row: any) => ({
          id: row.id,
          bidCardNumber: row.bid_card_number,
          bidderName: row.bidder_name,
          companyName: row.company_name || '',
          email: row.email || '',
          phone: row.phone || '',
          hearAboutUs: row.hear_about_us || '',
          username: row.username || '',
          hibidReputation: row.hibid_reputation || '5.0 ★',
          bidCount: Number(row.bid_count) || 0,
          permissionText: row.permission_text || 'Approved - Standard',
          dateTime: row.date_time || new Date(row.created_at).toLocaleDateString(),
          site: row.site || 'hibid.com',
          notes: row.notes || '',
          shippingRequested: Boolean(row.shipping_requested),
          bidderNotes: row.bidder_notes || '',
          isCheckedIn: Boolean(row.is_checked_in),
          depositAmount: Number(row.deposit_amount) || 0,
          depositStatus: row.deposit_status || 'Pending',
          createdAt: row.created_at
        }));
      }
    } catch (_) {}

    // Alternate Bids table
    try {
      const { data: altData } = await supabaseAdmin
        .from('alternate_bids')
        .select('*')
        .eq('auction_id', auction.id)
        .order('created_at', { ascending: false });

      if (altData && altData.length > 0) {
        alternateBids = altData.map((row: any) => ({
          id: row.id,
          lotNumber: Number(row.lot_number),
          bidderName: row.bidder_name,
          paddleNumber: row.paddle_number,
          bidType: row.bid_type,
          amount: Number(row.amount),
          maxAmount: Number(row.max_amount),
          notes: row.notes || '',
          status: row.status,
          createdAt: row.created_at
        }));
      }
    } catch (_) {}

    // Bidder Deposits table
    try {
      const { data: depData } = await supabaseAdmin
        .from('bidder_deposits')
        .select('*')
        .eq('auction_id', auction.id)
        .order('created_at', { ascending: false });

      if (depData && depData.length > 0) {
        deposits = depData.map((row: any) => ({
          id: row.id,
          auctionId: row.auction_id,
          registrationId: row.registration_id,
          bidCardNumber: row.bid_card_number,
          bidderName: row.bidder_name,
          amount: Number(row.amount) || 0,
          amountApplied: Number(row.amount_applied) || 0,
          amountRemaining: row.amount_remaining !== undefined && row.amount_remaining !== null
            ? Number(row.amount_remaining)
            : Math.max(0, (Number(row.amount) || 0) - (Number(row.amount_applied) || 0)),
          paymentMethod: row.payment_method || 'Credit Card',
          status: row.status || 'Collected',
          date: row.date || new Date(row.created_at).toISOString().split('T')[0],
          referenceNumber: row.reference_number || '',
          notes: row.notes || '',
          receivedBy: row.received_by || '',
          createdAt: row.created_at
        }));
      }
    } catch (_) {}

    // HiBid Syndication Stats table
    try {
      const { data: statData } = await supabaseAdmin
        .from('hibid_syndication_stats')
        .select('*')
        .eq('auction_id', auction.id);

      if (statData && statData.length > 0) {
        siteStats = statData.map((row: any) => ({
          site: row.site,
          registrations: Number(row.registrations) || 0,
          ccAuths: Number(row.cc_auths) || 0,
          views: Number(row.views) || 0,
          uniqueBidders: Number(row.unique_bidders) || 0,
          uniqueBids: Number(row.unique_bids) || 0,
          totalBids: Number(row.total_bids) || 0,
          highBid: Number(row.high_bid) || 0,
          maxBid: Number(row.max_bid) || 0
        }));
      }
    } catch (_) {}

    // Fallback to auction.dayStats if dedicated tables returned empty (excluding static mock data)
    if (registrations.length === 0 && Array.isArray(auction.dayStats?.registrations)) {
      registrations = auction.dayStats.registrations.filter((r: any) =>
        !['reg-1000', 'reg-5001', 'reg-5002', 'reg-5003'].includes(r?.id) &&
        !['1000', '5001', '5002', '5003'].includes(String(r?.bidCardNumber)) &&
        !['Randy A Stratford', 'Helena Vance', 'Marcus Chen', 'Eleanor Rigby'].includes(r?.bidderName)
      );
    }
    if (alternateBids.length === 0 && Array.isArray(auction.dayStats?.alternateBids)) {
      alternateBids = auction.dayStats.alternateBids.filter((b: any) =>
        !['alt-1', 'alt-2', 'alt-3'].includes(b?.id) &&
        !['Senator James Caldwell', 'Helena Vault Trust'].includes(b?.bidderName) &&
        !['4005', '3012'].includes(String(b?.paddleNumber))
      );
    }
    if (siteStats.length === 0 && Array.isArray(auction.dayStats?.siteStats)) {
      siteStats = [...auction.dayStats.siteStats];
    }
    if (deposits.length === 0 && Array.isArray(auction.dayStats?.deposits)) {
      deposits = auction.dayStats.deposits.filter((d: any) =>
        !['dep-1001', 'dep-1002', 'dep-1003'].includes(d?.id) &&
        !['5001', '2001', '5003'].includes(String(d?.bidCardNumber)) &&
        !['Helena Vance', 'Roger Perry', 'Eleanor Rigby'].includes(d?.bidderName)
      );
    }
    if (Array.isArray(auction.dayStats?.lotStats)) {
      lotStats = [...auction.dayStats.lotStats];
    }

    // If lotStats is empty, generate from real auction lots
    if (lotStats.length === 0 && auctionLots.length > 0) {
      lotStats = auctionLots.map(lot => ({
        id: `lstat-${lot.id}`,
        lotNumber: lot.lotNumber,
        title: lot.title,
        image: lot.image || '/assets/gold-coin.jpg',
        timeLeft: lot.status === 'sold' ? 'Sold' : lot.status === 'on_block' ? 'Live on Block' : 'Upcoming',
        highBid: lot.currentBid || lot.startingBid || 0,
        maxBid: (lot.currentBid || lot.startingBid || 0) * 1.25,
        views: (lot.bidsCount || 0) * 45 + 120,
        watches: (lot.bidsCount || 0) * 3 + 8,
        af360Status: lot.status === 'sold' ? 'Clerked' : lot.status === 'on_block' ? 'On Block' : 'Not Clerked'
      }));
    }

    // Ensure all registrations returned are uniquely identified by paddle number and bidder name
    const seenRegKeys = new Set<string>();
    registrations = registrations.filter(r => {
      const paddle = (r.bidCardNumber || '').toString().trim().toLowerCase();
      const name = (r.bidderName || '').toString().trim().toLowerCase();
      const key = paddle ? `${paddle}:::${name}` : (r.id || name);
      if (!key || seenRegKeys.has(key)) return false;
      seenRegKeys.add(key);
      return true;
    });

    // Calculate live dynamic metrics
    const metrics = this.computeMetrics(
      auctionLots,
      registrations,
      auction.dayStats?.hibidUrl || 'https://hibid.com'
    );

    return {
      auction,
      lots: auctionLots,
      metrics,
      registrations,
      alternateBids,
      siteStats,
      lotStats,
      deposits
    };
  }

  /**
   * Toggle single bidder check-in status and persist to Supabase
   */
  public async toggleCheckIn(
    auctionId: string, 
    regId: string, 
    newCheckedInStatus: boolean
  ): Promise<{ success: boolean; checkInCount: number; error?: string }> {
    try {
      const nowIso = new Date().toISOString();

      // 1. Try updating public.bidder_registrations in Supabase
      try {
        await supabaseAdmin
          .from('bidder_registrations')
          .update({ 
            is_checked_in: newCheckedInStatus,
            updated_at: nowIso
          })
          .eq('id', regId);
      } catch (_) {}

      // 2. Update auction.dayStats in Supabase JSONB
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        const reg = (auction.dayStats?.registrations || []).find(r => r.id === regId);
        if (reg) {
          reg.isCheckedIn = newCheckedInStatus;
        }

        const count = (auction.dayStats?.registrations || []).filter(r => r.isCheckedIn).length;
        auction.dayStats.checkInCount = count;

        await auctionService.saveAuction(auction);

        // Also push direct day_stats patch to Supabase
        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: nowIso
          })
          .eq('id', auctionId);

        return { success: true, checkInCount: count };
      }

      return { success: true, checkInCount: newCheckedInStatus ? 1 : 0 };
    } catch (err) {
      console.error('[AuctionDayService] toggleCheckIn error:', err);
      return { success: false, checkInCount: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Bulk check in or undo check in for multiple selected bidders
   */
  public async bulkCheckIn(
    auctionId: string, 
    regIds: string[], 
    newCheckedInStatus: boolean
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (!regIds || regIds.length === 0) {
        return { success: true, count: 0 };
      }

      const nowIso = new Date().toISOString();

      // 1. Update in public.bidder_registrations
      try {
        await supabaseAdmin
          .from('bidder_registrations')
          .update({
            is_checked_in: newCheckedInStatus,
            updated_at: nowIso
          })
          .in('id', regIds);
      } catch (_) {}

      // 2. Update in auction.dayStats JSONB
      const auction = await auctionService.getAuctionById(auctionId);
      let count = 0;
      if (auction) {
        const idSet = new Set(regIds);
        (auction.dayStats?.registrations || []).forEach(r => {
          if (idSet.has(r.id)) {
            r.isCheckedIn = newCheckedInStatus;
          }
        });

        count = (auction.dayStats?.registrations || []).filter(r => r.isCheckedIn).length;
        auction.dayStats.checkInCount = count;

        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({
            day_stats: auction.dayStats,
            updated_at: nowIso
          })
          .eq('id', auctionId);
      }

      return { success: true, count };
    } catch (err) {
      console.error('[AuctionDayService] bulkCheckIn error:', err);
      return { success: false, count: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Register a new bidder and persist to Supabase
   */
  public async registerBidder(
    auctionId: string, 
    newReg: Omit<BidderRegistration, 'id'>
  ): Promise<{ success: boolean; registration?: BidderRegistration; error?: string }> {
    try {
      const regId = `reg-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const registration: BidderRegistration = {
        ...newReg,
        id: regId,
        createdAt: nowIso
      };

      // 1. Try public.bidder_registrations table in Supabase (with idempotent deduplication)
      try {
        const { data: existingRegs } = await supabaseAdmin
          .from('bidder_registrations')
          .select('id')
          .eq('auction_id', auctionId)
          .eq('bid_card_number', registration.bidCardNumber)
          .limit(1);

        if (existingRegs && existingRegs.length > 0) {
          await supabaseAdmin
            .from('bidder_registrations')
            .update({
              bidder_name: registration.bidderName,
              company_name: registration.companyName || '',
              email: registration.email || '',
              phone: registration.phone || '',
              is_checked_in: registration.isCheckedIn || false,
              updated_at: nowIso
            })
            .eq('id', existingRegs[0].id);

          const auction = await auctionService.getAuctionById(auctionId);
          if (auction) {
            const list = auction.dayStats.registrations || [];
            const idx = list.findIndex((r: any) => String(r.bidCardNumber) === String(registration.bidCardNumber) || r.id === existingRegs[0].id);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...registration, id: existingRegs[0].id };
            } else {
              list.unshift({ ...registration, id: existingRegs[0].id });
            }
            auction.dayStats.registrations = list;
            await auctionService.saveAuction(auction);
          }

          return {
            success: true,
            registration: {
              ...registration,
              id: existingRegs[0].id
            }
          };
        }

        await supabaseAdmin.from('bidder_registrations').insert([
          {
            id: registration.id,
            auction_id: auctionId,
            bid_card_number: registration.bidCardNumber,
            bidder_name: registration.bidderName,
            company_name: registration.companyName || '',
            email: registration.email || '',
            phone: registration.phone || '',
            hear_about_us: registration.hearAboutUs || '',
            username: registration.username || '',
            hibid_reputation: registration.hibidReputation || '5.0 ★',
            bid_count: registration.bidCount || 0,
            permission_text: registration.permissionText || 'Approved - Standard',
            date_time: registration.dateTime || new Date().toLocaleDateString(),
            site: registration.site || 'In-House / Admin',
            notes: registration.notes || '',
            shipping_requested: registration.shippingRequested || false,
            bidder_notes: registration.bidderNotes || '',
            is_checked_in: registration.isCheckedIn || false,
            deposit_amount: registration.depositAmount || 0,
            deposit_status: registration.depositStatus || 'Pending',
            created_at: nowIso
          }
        ]);
      } catch (_) {}

      // 2. Persist in auction.dayStats JSONB
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.registrations = [registration, ...(auction.dayStats.registrations || [])];
        if (registration.isCheckedIn) {
          auction.dayStats.checkInCount = (auction.dayStats.checkInCount || 0) + 1;
        }
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: nowIso
          })
          .eq('id', auctionId);
      }

      return { success: true, registration };
    } catch (err) {
      console.error('[AuctionDayService] registerBidder error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Import multiple bidders from CSV or external data
   */
  public async importBidders(
    auctionId: string, 
    biddersList: Array<Partial<BidderRegistration>>
  ): Promise<{ success: boolean; importedCount: number; skippedCount: number; errors: string[] }> {
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      const existing = auction?.dayStats?.registrations || [];
      const existingPaddleNumbers = new Set(existing.map(r => r.bidCardNumber.trim().toLowerCase()));
      const existingEmails = new Set(existing.map(r => (r.email || '').trim().toLowerCase()).filter(Boolean));

      const validToInsert: BidderRegistration[] = [];
      const errors: string[] = [];
      let skippedCount = 0;

      for (const item of biddersList) {
        const paddle = (item.bidCardNumber || '').trim();
        const name = (item.bidderName || '').trim();
        const email = (item.email || '').trim();

        if (!paddle || !name) {
          skippedCount++;
          errors.push(`Row missing Bidder # or Name: "${name}" (${paddle})`);
          continue;
        }

        // Duplicate checks
        if (existingPaddleNumbers.has(paddle.toLowerCase())) {
          skippedCount++;
          errors.push(`Paddle #${paddle} is already registered in this auction.`);
          continue;
        }

        if (email && existingEmails.has(email.toLowerCase())) {
          skippedCount++;
          errors.push(`Email "${email}" is already registered in this auction.`);
          continue;
        }

        const nowIso = new Date().toISOString();
        const newReg: BidderRegistration = {
          id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          bidCardNumber: paddle,
          bidderName: name,
          companyName: item.companyName || '',
          email: email,
          phone: item.phone || '',
          hearAboutUs: item.hearAboutUs || 'Imported File',
          username: item.username || paddle,
          hibidReputation: item.hibidReputation || '5.0 ★',
          bidCount: 0,
          permissionText: item.permissionText || 'Approved - Standard',
          dateTime: new Date().toLocaleDateString(),
          site: item.site || 'File Import',
          notes: item.notes || 'Bulk imported bidder record',
          shippingRequested: false,
          bidderNotes: '',
          isCheckedIn: Boolean(item.isCheckedIn),
          depositAmount: item.depositAmount || 0,
          depositStatus: item.depositStatus || 'Pending',
          createdAt: nowIso
        };

        existingPaddleNumbers.add(paddle.toLowerCase());
        if (email) existingEmails.add(email.toLowerCase());
        validToInsert.push(newReg);
      }

      if (validToInsert.length > 0) {
        // Try inserting into public.bidder_registrations
        try {
          const rows = validToInsert.map(r => ({
            id: r.id,
            auction_id: auctionId,
            bid_card_number: r.bidCardNumber,
            bidder_name: r.bidderName,
            company_name: r.companyName || '',
            email: r.email || '',
            phone: r.phone || '',
            hear_about_us: r.hearAboutUs || '',
            username: r.username,
            hibid_reputation: r.hibidReputation,
            bid_count: 0,
            permission_text: r.permissionText,
            date_time: r.dateTime,
            site: r.site,
            notes: r.notes,
            shipping_requested: false,
            bidder_notes: '',
            is_checked_in: r.isCheckedIn,
            deposit_amount: r.depositAmount || 0,
            deposit_status: r.depositStatus || 'Pending',
            created_at: r.createdAt
          }));
          await supabaseAdmin.from('bidder_registrations').insert(rows);
        } catch (_) {}

        // Persist in auction.dayStats
        if (auction) {
          auction.dayStats.registrations = [...validToInsert, ...(auction.dayStats.registrations || [])];
          auction.dayStats.checkInCount = (auction.dayStats.registrations || []).filter(r => r.isCheckedIn).length;
          await auctionService.saveAuction(auction);

          await supabaseAdmin
            .from('auctions')
            .update({ 
              day_stats: auction.dayStats,
              updated_at: new Date().toISOString()
            })
            .eq('id', auctionId);
        }
      }

      return {
        success: true,
        importedCount: validToInsert.length,
        skippedCount,
        errors
      };
    } catch (err) {
      console.error('[AuctionDayService] importBidders error:', err);
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: [err instanceof Error ? err.message : String(err)]
      };
    }
  }

  /**
   * Fetch all bidder deposits for a specific auction directly from Supabase
   */
  public async getDeposits(auctionId: string): Promise<BidderDeposit[]> {
    if (!auctionId) return [];
    try {
      const { data: depData, error } = await supabaseAdmin
        .from('bidder_deposits')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: true });

      if (!error && depData && depData.length > 0) {
        return depData.map((row: any) => ({
          id: row.id,
          auctionId: row.auction_id,
          registrationId: row.registration_id,
          bidCardNumber: row.bid_card_number,
          bidderName: row.bidder_name,
          amount: Number(row.amount) || 0,
          amountApplied: Number(row.amount_applied) || 0,
          amountRemaining: row.amount_remaining !== undefined && row.amount_remaining !== null
            ? Number(row.amount_remaining)
            : Math.max(0, (Number(row.amount) || 0) - (Number(row.amount_applied) || 0)),
          paymentMethod: row.payment_method || 'Credit Card',
          status: row.status || 'Collected',
          date: row.date || new Date(row.created_at).toISOString().split('T')[0],
          referenceNumber: row.reference_number || '',
          notes: row.notes || '',
          receivedBy: row.received_by || '',
          createdAt: row.created_at
        }));
      }
    } catch (err) {
      console.warn('[AuctionDayService] getDeposits table error:', err);
    }

    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction?.dayStats?.deposits) {
        return auction.dayStats.deposits.filter((d: any) =>
          !['dep-1001', 'dep-1002', 'dep-1003'].includes(d?.id) &&
          !['5001', '2001', '5003'].includes(String(d?.bidCardNumber)) &&
          !['Helena Vance', 'Roger Perry', 'Eleanor Rigby'].includes(d?.bidderName)
        );
      }
    } catch (_) {}

    return [];
  }

  /**
   * Record a bidder deposit and persist to Supabase
   */
  public async recordDeposit(
    auctionId: string, 
    depositData: Omit<BidderDeposit, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; deposit?: BidderDeposit; error?: string }> {
    try {
      const depId = `dep-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const amount = Number(depositData.amount) || 0;
      const amountApplied = Number(depositData.amountApplied) || 0;
      const amountRemaining = depositData.amountRemaining !== undefined && depositData.amountRemaining !== null
        ? Number(depositData.amountRemaining)
        : Math.max(0, amount - amountApplied);

      const newDeposit: BidderDeposit = {
        ...depositData,
        id: depId,
        amount,
        amountApplied,
        amountRemaining,
        date: depositData.date || nowIso.split('T')[0],
        status: depositData.status || 'Collected',
        createdAt: nowIso
      };

      // 1. Try public.bidder_deposits table
      try {
        await supabaseAdmin.from('bidder_deposits').insert([
          {
            id: newDeposit.id,
            auction_id: auctionId,
            registration_id: newDeposit.registrationId || null,
            bid_card_number: newDeposit.bidCardNumber,
            bidder_name: newDeposit.bidderName,
            amount: newDeposit.amount,
            amount_applied: newDeposit.amountApplied || 0,
            amount_remaining: newDeposit.amountRemaining || 0,
            payment_method: newDeposit.paymentMethod || 'Credit Card',
            status: newDeposit.status,
            date: newDeposit.date,
            reference_number: newDeposit.referenceNumber || '',
            notes: newDeposit.notes || '',
            received_by: newDeposit.receivedBy || 'Admin Staff',
            created_at: nowIso
          }
        ]);

        // Also update registration deposit status if matched
        if (newDeposit.registrationId) {
          await supabaseAdmin
            .from('bidder_registrations')
            .update({
              deposit_amount: newDeposit.amount,
              deposit_status: newDeposit.status,
              updated_at: nowIso
            })
            .eq('id', newDeposit.registrationId);
        }
      } catch (dbErr) {
        console.warn('[AuctionDayService] recordDeposit direct table insert error:', dbErr);
      }

      // 2. Persist in auction.dayStats JSONB
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.deposits = [newDeposit, ...(auction.dayStats.deposits || [])];
        
        // Update matched registration in JSONB
        const reg = (auction.dayStats.registrations || []).find(
          r => r.id === newDeposit.registrationId || r.bidCardNumber === newDeposit.bidCardNumber
        );
        if (reg) {
          reg.depositAmount = (reg.depositAmount || 0) + newDeposit.amount;
          reg.depositStatus = newDeposit.status;
        }

        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: nowIso
          })
          .eq('id', auctionId);
      }

      // 3. Immediately trigger settlement sync so deposit is applied if bidder already has sold lots
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
        // Refresh deposit to reflect any applied amount immediately
        const { data: updatedDep } = await supabaseAdmin
          .from('bidder_deposits')
          .select('*')
          .eq('id', newDeposit.id)
          .maybeSingle();

        if (updatedDep) {
          newDeposit.amountApplied = Number(updatedDep.amount_applied) || 0;
          newDeposit.amountRemaining = Number(updatedDep.amount_remaining);
          newDeposit.status = updatedDep.status || newDeposit.status;
        }
      } catch (syncErr) {
        console.warn('[AuctionDayService] syncSettlements after deposit error:', syncErr);
      }

      return { success: true, deposit: newDeposit };
    } catch (err) {
      console.error('[AuctionDayService] recordDeposit error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Add a new Alternate Bid and persist to Supabase
   */
  public async addAlternateBid(
    auctionId: string, 
    bidData: Omit<AlternateBid, 'id'>
  ): Promise<{ success: boolean; bid?: AlternateBid; error?: string }> {
    try {
      const bidId = `alt-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newBid: AlternateBid = {
        ...bidData,
        id: bidId,
        createdAt: bidData.createdAt || nowIso
      };

      // 1. Try public.alternate_bids table in Supabase
      try {
        await supabaseAdmin.from('alternate_bids').insert([
          {
            id: newBid.id,
            auction_id: auctionId,
            lot_number: newBid.lotNumber,
            bidder_name: newBid.bidderName,
            paddle_number: newBid.paddleNumber,
            bid_type: newBid.bidType,
            amount: newBid.amount,
            max_amount: newBid.maxAmount,
            notes: newBid.notes,
            status: newBid.status,
            created_at: newBid.createdAt
          }
        ]);
      } catch (_) {}

      // 2. Persist in auction.dayStats JSONB
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.alternateBids = [newBid, ...(auction.dayStats.alternateBids || [])];
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: nowIso
          })
          .eq('id', auctionId);
      }

      return { success: true, bid: newBid };
    } catch (err) {
      console.error('[AuctionDayService] addAlternateBid error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Update Alternate Bid status (Active, Executed, Cancelled, Rejected)
   */
  public async updateAlternateBidStatus(
    auctionId: string, 
    bidId: string, 
    status: 'Active' | 'Executed' | 'Cancelled' | 'Rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const nowIso = new Date().toISOString();
      // 1. Try public.alternate_bids table
      try {
        await supabaseAdmin
          .from('alternate_bids')
          .update({ status, updated_at: nowIso })
          .eq('id', bidId);
      } catch (_) {}

      // 2. Update auction.dayStats JSONB
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        const found = (auction.dayStats.alternateBids || []).find(b => b.id === bidId);
        if (found) {
          found.status = status;
          await auctionService.saveAuction(auction);

          await supabaseAdmin
            .from('auctions')
            .update({ 
              day_stats: auction.dayStats,
              updated_at: nowIso
            })
            .eq('id', auctionId);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('[AuctionDayService] updateAlternateBidStatus error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Delete an Alternate Bid
   */
  public async deleteAlternateBid(auctionId: string, bidId: string): Promise<boolean> {
    try {
      try {
        await supabaseAdmin.from('alternate_bids').delete().eq('id', bidId);
      } catch (_) {}

      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.alternateBids = (auction.dayStats.alternateBids || []).filter(b => b.id !== bidId);
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: new Date().toISOString()
          })
          .eq('id', auctionId);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Save or update HiBid syndication site statistics
   */
  public async saveHiBidSiteStat(auctionId: string, stat: HiBidSiteStat): Promise<boolean> {
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        const stats = auction.dayStats.siteStats || [];
        const idx = stats.findIndex(s => s.site === stat.site);
        if (idx >= 0) {
          stats[idx] = stat;
        } else {
          stats.push(stat);
        }
        auction.dayStats.siteStats = stats;
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: new Date().toISOString()
          })
          .eq('id', auctionId);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Clear HiBid stats to test empty state ("Currently No HiBid Auction Stats.")
   */
  public async clearHiBidStats(auctionId: string): Promise<boolean> {
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.siteStats = [];
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: new Date().toISOString()
          })
          .eq('id', auctionId);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Reset / restore default HiBid syndication site stats
   */
  public async restoreDefaultHiBidStats(auctionId: string): Promise<HiBidSiteStat[]> {
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.siteStats = [...DEFAULT_HIBID_SITES];
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({ 
            day_stats: auction.dayStats,
            updated_at: new Date().toISOString()
          })
          .eq('id', auctionId);
      }
      return DEFAULT_HIBID_SITES;
    } catch (_) {
      return [];
    }
  }

  /**
   * Update an existing Bidder Registration (Supabase + cache sync)
   */
  public async updateBidderRegistration(
    auctionId: string,
    regId: string,
    updates: Partial<BidderRegistration>
  ): Promise<{ success: boolean; data?: BidderRegistration; error?: string }> {
    try {
      // 1. Update in public.bidder_registrations
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString()
        };
        if (updates.bidderName !== undefined) payload.bidder_name = updates.bidderName;
        if (updates.companyName !== undefined) payload.company_name = updates.companyName;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.phone !== undefined) payload.phone = updates.phone;
        if (updates.hearAboutUs !== undefined) payload.hear_about_us = updates.hearAboutUs;
        if (updates.permissionText !== undefined) payload.permission_text = updates.permissionText;
        if (updates.notes !== undefined) payload.notes = updates.notes;
        if (updates.isCheckedIn !== undefined) payload.is_checked_in = updates.isCheckedIn;
        if (updates.depositAmount !== undefined) payload.deposit_amount = updates.depositAmount;
        if (updates.depositStatus !== undefined) payload.deposit_status = updates.depositStatus;

        await supabaseAdmin
          .from('bidder_registrations')
          .update(payload)
          .eq('id', regId);
      } catch (dbErr) {
        console.warn('[AuctionDayService] updateBidderRegistration direct table update warning:', dbErr);
      }

      // 2. Sync with auction day_stats
      const auction = await auctionService.getAuctionById(auctionId);
      let updatedRecord: BidderRegistration | undefined;
      if (auction) {
        const regs = auction.dayStats.registrations || [];
        const idx = regs.findIndex(r => r.id === regId);
        if (idx >= 0) {
          regs[idx] = { ...regs[idx], ...updates };
          updatedRecord = regs[idx];
          auction.dayStats.registrations = regs;
          await auctionService.saveAuction(auction);

          await supabaseAdmin
            .from('auctions')
            .update({
              day_stats: auction.dayStats,
              updated_at: new Date().toISOString()
            })
            .eq('id', auctionId);
        }
      }

      // Re-sync settlements to recompute invoice balance
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      return { success: true, data: updatedRecord };
    } catch (err) {
      console.error('[AuctionDayService] updateBidderRegistration error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Delete a Bidder Registration
   */
  public async deleteBidderRegistration(auctionId: string, regId: string): Promise<boolean> {
    try {
      try {
        await supabaseAdmin.from('bidder_registrations').delete().eq('id', regId);
      } catch (_) {}

      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.registrations = (auction.dayStats.registrations || []).filter(r => r.id !== regId);
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({
            day_stats: auction.dayStats,
            updated_at: new Date().toISOString()
          })
          .eq('id', auctionId);
      }

      // Re-sync settlements to recompute invoice balance
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Update an Alternate Bid (Supabase + cache sync)
   */
  public async updateAlternateBid(
    auctionId: string,
    bidId: string,
    updates: Partial<AlternateBid>
  ): Promise<{ success: boolean; data?: AlternateBid; error?: string }> {
    try {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString()
        };
        if (updates.lotNumber !== undefined) payload.lot_number = updates.lotNumber;
        if (updates.bidderName !== undefined) payload.bidder_name = updates.bidderName;
        if (updates.paddleNumber !== undefined) payload.paddle_number = updates.paddleNumber;
        if (updates.bidType !== undefined) payload.bid_type = updates.bidType;
        if (updates.amount !== undefined) payload.amount = updates.amount;
        if (updates.maxAmount !== undefined) payload.max_amount = updates.maxAmount;
        if (updates.notes !== undefined) payload.notes = updates.notes;
        if (updates.status !== undefined) payload.status = updates.status;

        await supabaseAdmin
          .from('alternate_bids')
          .update(payload)
          .eq('id', bidId);
      } catch (dbErr) {
        console.warn('[AuctionDayService] updateAlternateBid direct table update warning:', dbErr);
      }

      const auction = await auctionService.getAuctionById(auctionId);
      let updatedRecord: AlternateBid | undefined;
      if (auction) {
        const bids = auction.dayStats.alternateBids || [];
        const idx = bids.findIndex(b => b.id === bidId);
        if (idx >= 0) {
          bids[idx] = { ...bids[idx], ...updates };
          updatedRecord = bids[idx];
          auction.dayStats.alternateBids = bids;
          await auctionService.saveAuction(auction);

          await supabaseAdmin
            .from('auctions')
            .update({
              day_stats: auction.dayStats,
              updated_at: new Date().toISOString()
            })
            .eq('id', auctionId);
        }
      }

      // Re-sync settlements to recompute invoice balance
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      return { success: true, data: updatedRecord };
    } catch (err) {
      console.error('[AuctionDayService] updateAlternateBid error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Update a Bidder Deposit (Supabase + cache sync)
   */
  public async updateDeposit(
    auctionId: string,
    depositId: string,
    updates: Partial<BidderDeposit>
  ): Promise<{ success: boolean; data?: BidderDeposit; error?: string }> {
    try {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString()
        };
        if (updates.amount !== undefined) payload.amount = updates.amount;
        if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.referenceNumber !== undefined) payload.reference_number = updates.referenceNumber;
        if (updates.notes !== undefined) payload.notes = updates.notes;

        await supabaseAdmin
          .from('bidder_deposits')
          .update(payload)
          .eq('id', depositId);
      } catch (dbErr) {
        console.warn('[AuctionDayService] updateDeposit direct table update warning:', dbErr);
      }

      const auction = await auctionService.getAuctionById(auctionId);
      let updatedRecord: BidderDeposit | undefined;
      if (auction) {
        const deps = auction.dayStats.deposits || [];
        const idx = deps.findIndex(d => d.id === depositId);
        if (idx >= 0) {
          deps[idx] = { ...deps[idx], ...updates };
          updatedRecord = deps[idx];
          auction.dayStats.deposits = deps;
          await auctionService.saveAuction(auction);

          await supabaseAdmin
            .from('auctions')
            .update({
              day_stats: auction.dayStats,
              updated_at: new Date().toISOString()
            })
            .eq('id', auctionId);
        }
      }

      // Re-sync settlements to recompute invoice balance
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      return { success: true, data: updatedRecord };
    } catch (err) {
      console.error('[AuctionDayService] updateDeposit error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Delete a Bidder Deposit
   */
  public async deleteDeposit(auctionId: string, depositId: string): Promise<boolean> {
    try {
      try {
        await supabaseAdmin.from('bidder_deposits').delete().eq('id', depositId);
      } catch (_) {}

      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.deposits = (auction.dayStats.deposits || []).filter(d => d.id !== depositId);
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({
            day_stats: auction.dayStats,
            updated_at: new Date().toISOString()
          })
          .eq('id', auctionId);
      }

      // Re-sync settlements to recompute invoice balance
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Delete a HiBid Site Stat
   */
  public async deleteHiBidSiteStat(auctionId: string, siteName: string): Promise<boolean> {
    try {
      try {
        await supabaseAdmin
          .from('hibid_syndication_stats')
          .delete()
          .eq('auction_id', auctionId)
          .eq('site', siteName);
      } catch (_) {}

      const auction = await auctionService.getAuctionById(auctionId);
      if (auction) {
        auction.dayStats.siteStats = (auction.dayStats.siteStats || []).filter(s => s.site !== siteName);
        await auctionService.saveAuction(auction);

        await supabaseAdmin
          .from('auctions')
          .update({
            day_stats: auction.dayStats,
            updated_at: new Date().toISOString()
          })
          .eq('id', auctionId);
      }

      // Re-sync settlements to recompute invoice balance
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Realtime WebSockets subscription for Auction Day changes
   */
  public subscribeToAuctionDay(auctionId: string, onUpdate: () => void): () => void {
    const channelId = `realtime:auction_day:${auctionId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lots' },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bidder_registrations', filter: `auction_id=eq.${auctionId}` },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alternate_bids', filter: `auction_id=eq.${auctionId}` },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bidder_deposits', filter: `auction_id=eq.${auctionId}` },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const auctionDayService = new AuctionDayService();
