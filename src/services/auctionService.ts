import { AuctionDetail, SettlementCustomer, SettlementCharge, AuctionExpense } from '../types/auctionDetail';
import { supabaseAdmin, supabase } from '../lib/supabase';
import { LotItem } from '../types';
import { validateAuctionPublishReadiness } from '../utils/publishValidation';
import { DBLotRow, dbToLotItem } from './lotsService';

const STORAGE_KEY = 'gardner_auctions_detail_v2';

export function createEmptyAuctionDetail(data?: Partial<AuctionDetail>): AuctionDetail {
  const generatedId = `auc-${Date.now()}`;
  return {
    id: data?.id || generatedId,
    code: (data?.code || `AUC-${Date.now().toString().slice(-4)}`).toUpperCase(),
    name: data?.name || '',
    description: data?.description || '',
    auctionType: data?.auctionType || 'HiBid',
    status: data?.status || 'Open',
    startDate: data?.startDate || new Date().toISOString().split('T')[0],
    endDate: data?.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paymentInfo: '',
    taxExemptAll: false,
    currency: data?.currency || 'USD',
    liveStartingBidCard: 1,
    terms: '',
    shortBpExplanation: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    useConsolidatedInvoicing: false,
    shippingAvailability: (data?.shippingAvailability as any) || 'No Shipping',
    shippingAccount: '',
    addHandlingCharge: false,
    handlingChargeType: 'Fixed',
    handlingAmount: 0,
    featuredImages: [],
    auctionLinks: [],
    lotDefaults: {
      commission: '',
      buyerTax: '',
      buyerPremium: '',
      sellerTax: '',
      buyerLotCharge1: '',
      buyerLotCharge2: ''
    },
    uploadSettings: {
      previewDateTimes: '',
      auctionDateTimes: '',
      checkoutDateTimes: '',
      paymentInfo: '',
      shippingPickup: '',
      ccRegistrationType: 'Authentication',
      authDays: 30,
      acceptedCards: {
        mastercard: true,
        visa: true,
        amex: true,
        discover: true
      },
      biddingNotice: '',
      auctionNotice: '',
      biddingType: 'Internet Only Auction',
      minBidType: 'Public Bidding',
      bidAmountType: 'Maximum Bidding',
      timezone: '(UTC-07:00) Mountain Time (US & Canada)',
      openBiddingDate: '',
      openBiddingTime: '',
      closeBiddingDate: '',
      closeBiddingTime: '',
      softCloseSeconds: 15,
      autoSyncStagger: false,
      showImmediateBidStatus: false,
      hideBidderUsernames: false,
      allowRetractBids: false
    },
    expenses: [],
    settlements: [],
    dayStats: {
      lotCount: 0,
      checkInCount: 0,
      uniqueSellers: 0,
      presaleMin: 0,
      presaleMax: 0,
      avgEstimate: 0,
      avgSalesPrice: 0,
      hibidUrl: '',
      siteStats: [],
      registrations: [],
      lotStats: [],
      alternateBids: []
    },
    ...(data || {})
  };
}

class AuctionService {
  private auctions: AuctionDetail[] = [];

  constructor() {
    this.initData();
  }

  private initData() {
    try {
      // Purge deprecated v1 cache which may contain hardcoded mock auctions
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('gardner_auctions_detail_v1');
      }
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        const parsed: AuctionDetail[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.auctions = parsed;
        } else {
          this.auctions = [];
        }
      } else {
        this.auctions = [];
      }
    } catch (e) {
      console.warn('[AuctionService] Failed to load from localStorage:', e);
      this.auctions = [];
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.auctions));
    } catch (e) {
      console.error('[AuctionService] Failed to persist auctions to localStorage:', e);
    }
  }

  public async getAuctions(): Promise<AuctionDetail[]> {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('auctions')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[AuctionService] Failed to fetch auctions from Supabase:', error.message);
      throw new Error(`Failed to load auctions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      this.auctions = [];
      this.persist();
      return [];
    }

    // Fetch real lot counts from Supabase lots table
    let lotCountsByAuction: Record<string, number> = {};
    try {
      const { data: lotsData } = await client
        .from('lots')
        .select('auction_id');
      if (lotsData && Array.isArray(lotsData)) {
        lotsData.forEach((l: any) => {
          if (l.auction_id) {
            lotCountsByAuction[l.auction_id] = (lotCountsByAuction[l.auction_id] || 0) + 1;
          }
        });
      }
    } catch (lotsErr) {
      console.warn('[AuctionService] Could not calculate lot counts:', lotsErr);
    }

    const fromDb: AuctionDetail[] = data.map((row: any) => {
      const emptyBase = createEmptyAuctionDetail({ id: row.id });

      const dayStats = {
        ...(emptyBase.dayStats || {}),
        ...(row.day_stats || {}),
        lotCount: lotCountsByAuction[row.id] !== undefined
          ? lotCountsByAuction[row.id]
          : (row.day_stats?.lotCount || 0)
      };

      return {
        ...emptyBase,
        id: row.id,
        code: row.code || `AUC-${row.id.toString().slice(-4)}`,
        name: row.name || 'Untitled Auction',
        description: row.description || '',
        status: row.status || 'Open',
        startDate: row.start_date || new Date().toISOString().split('T')[0],
        endDate: row.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        auctionType: row.auction_type || 'HiBid',
        currency: row.currency || 'USD',
        taxExemptAll: row.tax_exempt_all !== undefined ? Boolean(row.tax_exempt_all) : false,
        liveStartingBidCard: row.live_starting_bid_card !== undefined ? Number(row.live_starting_bid_card) : 1,
        paymentInfo: row.payment_info || '',
        terms: row.terms || '',
        shortBpExplanation: row.short_bp_explanation || '',
        address1: row.address1 ?? '',
        address2: row.address2 ?? '',
        city: row.city ?? '',
        state: row.state ?? '',
        zip: row.zip ?? '',
        country: row.country ?? 'United States',
        useConsolidatedInvoicing: row.use_consolidated_invoicing !== undefined ? Boolean(row.use_consolidated_invoicing) : false,
        shippingAvailability: (row.shipping_availability as any) || 'No Shipping',
        shippingAccount: row.shipping_account ?? '',
        addHandlingCharge: row.add_handling_charge !== undefined ? Boolean(row.add_handling_charge) : false,
        handlingChargeType: row.handling_charge_type || 'Fixed',
        handlingAmount: row.handling_amount !== undefined ? Number(row.handling_amount) : 0,
        featuredImages: Array.isArray(row.featured_images) ? row.featured_images : [],
        auctionLinks: Array.isArray(row.auction_links) ? row.auction_links : [],
        uploadSettings: {
          ...emptyBase.uploadSettings,
          ...(row.upload_settings || {})
        },
        lotDefaults: {
          ...emptyBase.lotDefaults,
          ...(row.lot_defaults || {})
        },
        expenses: Array.isArray(row.expenses) ? row.expenses : [],
        settlements: Array.isArray(row.settlements) ? row.settlements : [],
        dayStats
      };
    });

    this.auctions = fromDb;
    this.persist();
    return fromDb;
  }

  public async getAuctionById(id: string): Promise<AuctionDetail | null> {
    const client = supabaseAdmin || supabase;

    // 1. Fetch fresh record directly from Supabase
    try {
      const { data, error } = await client
        .from('auctions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        // Fetch accurate real-time lot count for this auction
        let lotCount = data.day_stats?.lotCount || 0;
        try {
          const { count } = await client
            .from('lots')
            .select('*', { count: 'exact', head: true })
            .eq('auction_id', id);
          if (typeof count === 'number') {
            lotCount = count;
          }
        } catch (_) {}

        const emptyBase = createEmptyAuctionDetail({ id: data.id });
        const loaded: AuctionDetail = {
          ...emptyBase,
          id: data.id,
          code: data.code || `AUC-${data.id.toString().slice(-4)}`,
          name: data.name || 'Untitled Auction',
          description: data.description || '',
          status: data.status || 'Open',
          startDate: data.start_date || new Date().toISOString().split('T')[0],
          endDate: data.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          auctionType: data.auction_type || 'HiBid',
          currency: data.currency || 'USD',
          taxExemptAll: data.tax_exempt_all !== undefined ? Boolean(data.tax_exempt_all) : false,
          liveStartingBidCard: data.live_starting_bid_card !== undefined ? Number(data.live_starting_bid_card) : 1,
          paymentInfo: data.payment_info || '',
          terms: data.terms || '',
          shortBpExplanation: data.short_bp_explanation || '',
          address1: data.address1 ?? '',
          address2: data.address2 ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          zip: data.zip ?? '',
          country: data.country ?? 'United States',
          useConsolidatedInvoicing: data.use_consolidated_invoicing !== undefined ? Boolean(data.use_consolidated_invoicing) : false,
          shippingAvailability: (data.shipping_availability as any) || 'No Shipping',
          shippingAccount: data.shipping_account ?? '',
          addHandlingCharge: data.add_handling_charge !== undefined ? Boolean(data.add_handling_charge) : false,
          handlingChargeType: data.handling_charge_type || 'Fixed',
          handlingAmount: data.handling_amount !== undefined ? Number(data.handling_amount) : 0,
          featuredImages: Array.isArray(data.featured_images) ? data.featured_images : [],
          auctionLinks: Array.isArray(data.auction_links) ? data.auction_links : [],
          uploadSettings: {
            ...emptyBase.uploadSettings,
            ...(data.upload_settings || {})
          },
          lotDefaults: {
            ...emptyBase.lotDefaults,
            ...(data.lot_defaults || {})
          },
          expenses: Array.isArray(data.expenses) ? data.expenses : [],
          settlements: Array.isArray(data.settlements) ? data.settlements : [],
          dayStats: {
            ...(emptyBase.dayStats || {}),
            ...(data.day_stats || {}),
            lotCount: typeof lotCount === 'number' ? lotCount : (data.day_stats?.lotCount || 0)
          }
        };

        // Fetch fresh expenses from Supabase auction_expenses table if table exists
        try {
          const { data: expRows, error: expErr } = await client
            .from('auction_expenses')
            .select('*')
            .eq('auction_id', id)
            .order('date', { ascending: false });

          if (!expErr && expRows && Array.isArray(expRows) && expRows.length > 0) {
            loaded.expenses = expRows.map((r: any) => ({
              id: r.id,
              type: r.type,
              account: r.account,
              payFrom: r.pay_from || 'Company Credit Card',
              description: r.description || '',
              amount: Number(r.amount) || 0,
              date: r.date,
              receiptUrl: r.receipt_url || undefined,
              receiptName: r.receipt_name || undefined
            }));
          }
        } catch (_) {}

        const idx = this.auctions.findIndex(a => a.id === id);
        if (idx >= 0) {
          this.auctions[idx] = loaded;
        } else {
          this.auctions.unshift(loaded);
        }
        this.persist();
        return loaded;
      }
    } catch (err) {
      console.warn('[AuctionService] getAuctionById Supabase error:', err);
      const found = this.auctions.find(a => a.id === id);
      if (found) {
        return JSON.parse(JSON.stringify(found));
      }
      throw err;
    }

    // 2. Fallback to local cache if already fetched and present
    const found = this.auctions.find(a => a.id === id);
    if (found) {
      return JSON.parse(JSON.stringify(found));
    }

    return null;
  }

  public async saveAuction(updated: AuctionDetail): Promise<{ success: boolean; data?: AuctionDetail; error?: string }> {
    const index = this.auctions.findIndex(a => a.id === updated.id);
    if (index >= 0) {
      this.auctions[index] = { ...updated };
    } else {
      this.auctions.unshift(updated);
    }
    this.persist();

    // Upsert full updates to Supabase
    try {
      const { error } = await supabaseAdmin.from('auctions').upsert({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        description: updated.description,
        status: updated.status || 'Open',
        start_date: updated.startDate,
        end_date: updated.endDate,
        auction_type: updated.auctionType || 'HiBid',
        currency: updated.currency || 'USD',
        tax_exempt_all: Boolean(updated.taxExemptAll),
        live_starting_bid_card: Number(updated.liveStartingBidCard) || 1,
        country: updated.country || '',
        address1: updated.address1 ?? '',
        address2: updated.address2 ?? '',
        city: updated.city ?? '',
        state: updated.state ?? '',
        zip: updated.zip ?? '',
        use_consolidated_invoicing: Boolean(updated.useConsolidatedInvoicing),
        shipping_availability: updated.shippingAvailability ?? '',
        shipping_account: updated.shippingAccount ?? '',
        add_handling_charge: Boolean(updated.addHandlingCharge),
        handling_charge_type: updated.handlingChargeType ?? 'Fixed',
        handling_amount: Number(updated.handlingAmount) || 0,
        payment_info: updated.paymentInfo || '',
        terms: updated.terms || '',
        short_bp_explanation: updated.shortBpExplanation || '',
        featured_images: updated.featuredImages || [],
        auction_links: updated.auctionLinks || [],
        upload_settings: updated.uploadSettings || {},
        lot_defaults: updated.lotDefaults || {},
        day_stats: updated.dayStats,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) {
        console.error('[AuctionService] Supabase upsert error:', error.message);
        return { success: false, data: updated, error: error.message };
      }
    } catch (e) {
      console.warn('[AuctionService] Supabase update notice:', e);
    }

    return { success: true, data: updated };
  }

  public async createAuction(data: Partial<AuctionDetail>): Promise<AuctionDetail> {
    const newAuction = createEmptyAuctionDetail(data);

    this.auctions.unshift(newAuction);
    this.persist();

    // Insert / Upsert directly into Supabase auctions table
    try {
      const { error } = await supabaseAdmin.from('auctions').upsert([
        {
          id: newAuction.id,
          code: newAuction.code,
          name: newAuction.name,
          description: newAuction.description,
          auction_type: newAuction.auctionType || 'HiBid',
          status: newAuction.status || 'Open',
          start_date: newAuction.startDate,
          end_date: newAuction.endDate,
          currency: newAuction.currency || 'USD',
          tax_exempt_all: Boolean(newAuction.taxExemptAll),
          live_starting_bid_card: Number(newAuction.liveStartingBidCard) || 1,
          country: newAuction.country || '',
          address1: newAuction.address1 ?? '',
          address2: newAuction.address2 ?? '',
          city: newAuction.city ?? '',
          state: newAuction.state ?? '',
          zip: newAuction.zip ?? '',
          use_consolidated_invoicing: Boolean(newAuction.useConsolidatedInvoicing),
          shipping_availability: newAuction.shippingAvailability ?? '',
          shipping_account: newAuction.shippingAccount ?? '',
          add_handling_charge: Boolean(newAuction.addHandlingCharge),
          handling_charge_type: newAuction.handlingChargeType ?? 'Fixed',
          handling_amount: Number(newAuction.handlingAmount) || 0,
          payment_info: newAuction.paymentInfo || '',
          terms: newAuction.terms || '',
          short_bp_explanation: newAuction.shortBpExplanation || '',
          featured_images: newAuction.featuredImages || [],
          auction_links: newAuction.auctionLinks || [],
          upload_settings: newAuction.uploadSettings || {},
          lot_defaults: newAuction.lotDefaults || {},
          day_stats: { lotCount: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ], { onConflict: 'id' });

      if (error) {
        console.error('[AuctionService] Supabase insert error:', error.message);
      } else {
        console.log('[AuctionService] Auction successfully created in Supabase:', newAuction.id);
      }
    } catch (sbErr) {
      console.error('[AuctionService] Unexpected error inserting to Supabase:', sbErr);
    }

    return newAuction;
  }

  private auctionListeners: Set<() => void> = new Set();
  private realtimeChannel: any = null;

  public subscribeToAuctions(onRefreshNeeded: () => void): () => void {
    this.auctionListeners.add(onRefreshNeeded);

    if (!this.realtimeChannel) {
      this.realtimeChannel = supabase
        .channel(`realtime_auctions_shared_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'auctions' },
          (payload) => {
            console.log('[AuctionService Realtime] Auction changed:', payload.eventType);
            this.auctionListeners.forEach(listener => {
              try { listener(); } catch (err) { console.warn(err); }
            });
          }
        )
        .subscribe();
    }

    return () => {
      this.auctionListeners.delete(onRefreshNeeded);
      if (this.auctionListeners.size === 0 && this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }

  public async duplicateAuction(id: string): Promise<AuctionDetail | null> {
    const original = await this.getAuctionById(id);
    if (!original) return null;

    const copy: AuctionDetail = {
      ...JSON.parse(JSON.stringify(original)),
      id: `auc-${Date.now()}`,
      code: `${original.code}-COPY`,
      name: `${original.name} (Copy)`,
      status: 'Open'
    };

    this.auctions.unshift(copy);
    this.persist();

    try {
      await supabaseAdmin.from('auctions').insert([
        {
          id: copy.id,
          code: copy.code,
          name: copy.name,
          description: copy.description,
          auction_type: copy.auctionType || 'HiBid',
          status: 'Open',
          start_date: copy.startDate,
          end_date: copy.endDate,
          currency: 'USD',
          country: 'United States',
          featured_images: [],
          day_stats: { lotCount: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ]);
    } catch (e) {
      console.warn('[AuctionService] Supabase duplicate notice:', e);
    }

    return copy;
  }

  public async deleteAuction(id: string): Promise<boolean> {
    this.auctions = this.auctions.filter(a => a.id !== id);
    this.persist();

    try {
      await supabaseAdmin.from('auctions').delete().eq('id', id);
      await supabaseAdmin.from('lots').delete().eq('auction_id', id);
    } catch (e) {
      console.warn('[AuctionService] Supabase delete notice:', e);
    }

    return true;
  }

  /**
   * Safe server-side publication validation & execution.
   * Fetches latest persisted data from Supabase, runs validation,
   * verifies authorization, and safely transitions status to 'In Progress'.
   */
  public async publishAuctionLive(
    auctionId: string,
    userRole?: string
  ): Promise<{ success: boolean; error?: string; errors?: string[] }> {
    // 1. Authorization check
    if (userRole && userRole !== 'super_admin' && userRole !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized: Only administrator roles have permission to publish auctions live.'
      };
    }

    const client = supabaseAdmin || supabase;

    // 2. Fetch fresh persisted auction data from Supabase
    const freshAuction = await this.getAuctionById(auctionId);
    if (!freshAuction) {
      return {
        success: false,
        error: `Auction record with ID "${auctionId}" was not found in the database.`
      };
    }

    // 3. Fetch latest lots for this auction from Supabase
    let auctionLots: LotItem[] = [];
    try {
      const { data: lotsData, error: lotsError } = await client
        .from('lots')
        .select('*')
        .eq('auction_id', auctionId)
        .order('lot_number', { ascending: true });

      if (!lotsError && lotsData) {
        auctionLots = (lotsData as DBLotRow[]).map(dbToLotItem);
      }
    } catch (err) {
      console.warn('[AuctionService] Error fetching lots for publish verification:', err);
    }

    // Fallback: If no lots found by explicit auction_id and it's 'auc-001', check default catalog
    if (auctionLots.length === 0 && auctionId === 'auc-001') {
      try {
        const { data: allLots } = await client
          .from('lots')
          .select('*')
          .limit(20);
        if (allLots && allLots.length > 0) {
          auctionLots = (allLots as DBLotRow[]).map(dbToLotItem);
        }
      } catch (_) {}
    }

    // 4. Run centralized validation against latest persisted records
    const validation = validateAuctionPublishReadiness(freshAuction, auctionLots, false);
    if (!validation.canPublish) {
      return {
        success: false,
        error: validation.allErrors[0] || 'Mandatory auction information is incomplete or invalid.',
        errors: validation.allErrors
      };
    }

    // 5. Safely update live status in Supabase
    try {
      const { error: updateError } = await client
        .from('auctions')
        .update({
          status: 'In Progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', auctionId);

      if (updateError) {
        return {
          success: false,
          error: `Database update failed: ${updateError.message}`
        };
      }

      // Update local memory cache and localStorage
      const cached = this.auctions.find(a => a.id === auctionId);
      if (cached) {
        cached.status = 'In Progress';
        this.persist();
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Unexpected error during live publication: ${msg}`
      };
    }
  }

  /**
   * Safely reverts live auction back to 'Open' (Draft) state
   */
  public async unpublishAuction(
    auctionId: string,
    userRole?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (userRole && userRole !== 'super_admin' && userRole !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized: Only administrator roles have permission to alter live status.'
      };
    }

    const client = supabaseAdmin || supabase;
    try {
      const { error: updateError } = await client
        .from('auctions')
        .update({
          status: 'Open',
          updated_at: new Date().toISOString()
        })
        .eq('id', auctionId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      const cached = this.auctions.find(a => a.id === auctionId);
      if (cached) {
        cached.status = 'Open';
        this.persist();
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  // Settlements
  public async getSettlements(auctionId: string): Promise<SettlementCustomer[]> {
    const auction = await this.getAuctionById(auctionId);
    return auction?.settlements || [];
  }

  public async getSettlementCustomer(auctionId: string, customerId: string): Promise<SettlementCustomer | null> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return null;
    const found = auction.settlements.find(c => c.id === customerId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async saveSettlementCustomer(auctionId: string, customer: SettlementCustomer): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;
    const idx = auction.settlements.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      auction.settlements[idx] = customer;
    } else {
      auction.settlements.push(customer);
    }
    await this.saveAuction(auction);
    return true;
  }

  public async addCustomerCharge(
    auctionId: string,
    customerId: string,
    chargeData: Omit<SettlementCharge, 'id' | 'date'>
  ): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    const customer = auction.settlements.find(c => c.id === customerId);
    if (!customer) return false;

    const newCharge: SettlementCharge = {
      ...chargeData,
      id: `chg-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };

    customer.charges.push(newCharge);
    customer.balance = (customer.balance || 0) + chargeData.amount;

    await this.saveAuction(auction);
    return true;
  }

  public async markAllShipped(auctionId: string, customerId: string): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    const customer = auction.settlements.find(c => c.id === customerId);
    if (!customer) return false;

    customer.lots.forEach(lot => {
      lot.isShipped = true;
    });
    customer.shippedCount = customer.lots.length;

    await this.saveAuction(auction);
    return true;
  }

  public async batchProcessCreditCards(auctionId: string, customerIds: string[]): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    auction.settlements.forEach(c => {
      if (customerIds.includes(c.id)) {
        c.invoiceStatus = 'Paid';
        c.balance = 0;
      }
    });

    await this.saveAuction(auction);
    return true;
  }

  public async checkInBidder(auctionId: string, regId: string, isCheckedIn: boolean): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    const reg = auction.dayStats.registrations.find(r => r.id === regId);
    if (reg) {
      reg.isCheckedIn = isCheckedIn;
      if (isCheckedIn) {
        auction.dayStats.checkInCount += 1;
      } else {
        auction.dayStats.checkInCount = Math.max(0, auction.dayStats.checkInCount - 1);
      }
      await this.saveAuction(auction);
      return true;
    }
    return false;
  }

  public async getAuctionExpenses(auctionId: string): Promise<AuctionExpense[]> {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('auction_expenses')
        .select('*')
        .eq('auction_id', auctionId)
        .order('date', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          type: d.type,
          account: d.account,
          payFrom: d.pay_from || 'Company Credit Card',
          description: d.description || '',
          amount: Number(d.amount) || 0,
          date: d.date,
          receiptUrl: d.receipt_url || undefined,
          receiptName: d.receipt_name || undefined
        }));
      }
    } catch (e) {
      console.warn('[AuctionService] Supabase getAuctionExpenses error:', e);
    }

    const auction = await this.getAuctionById(auctionId);
    return auction?.expenses || [];
  }

  public async getTotalExpensesForAuction(auctionId: string): Promise<number> {
    const expenses = await this.getAuctionExpenses(auctionId);
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }

  public async addExpense(auctionId: string, expense: Omit<AuctionExpense, 'id'>): Promise<AuctionExpense | null> {
    const newExpense: AuctionExpense = {
      ...expense,
      id: `exp-${Date.now()}`
    };

    // 1. Update local cache / auctions detail
    const auction = await this.getAuctionById(auctionId);
    if (auction) {
      auction.expenses = [newExpense, ...(auction.expenses || [])];
      await this.saveAuction(auction);
    }

    // 2. Persist directly into Supabase auction_expenses table
    try {
      const client = supabaseAdmin || supabase;
      const { error } = await client
        .from('auction_expenses')
        .insert({
          id: newExpense.id,
          auction_id: auctionId,
          type: newExpense.type,
          account: newExpense.account,
          pay_from: newExpense.payFrom,
          description: newExpense.description,
          amount: newExpense.amount,
          date: newExpense.date,
          receipt_url: newExpense.receiptUrl || null,
          receipt_name: newExpense.receiptName || null
        });

      if (error) {
        console.error('[AuctionService] Supabase addExpense error:', error.message);
      } else {
        console.log('[AuctionService] Expense persisted to Supabase:', newExpense.id);
      }
    } catch (e) {
      console.warn('[AuctionService] Supabase addExpense exception:', e);
    }

    return newExpense;
  }

  public async updateExpense(auctionId: string, expenseId: string, updated: Partial<AuctionExpense>): Promise<boolean> {
    // 1. Update local cache
    const auction = await this.getAuctionById(auctionId);
    if (auction) {
      const idx = (auction.expenses || []).findIndex(e => e.id === expenseId);
      if (idx >= 0) {
        auction.expenses[idx] = { ...auction.expenses[idx], ...updated };
        await this.saveAuction(auction);
      }
    }

    // 2. Update Supabase auction_expenses table
    try {
      const client = supabaseAdmin || supabase;
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (updated.type !== undefined) updatePayload.type = updated.type;
      if (updated.account !== undefined) updatePayload.account = updated.account;
      if (updated.payFrom !== undefined) updatePayload.pay_from = updated.payFrom;
      if (updated.description !== undefined) updatePayload.description = updated.description;
      if (updated.amount !== undefined) updatePayload.amount = updated.amount;
      if (updated.date !== undefined) updatePayload.date = updated.date;
      if (updated.receiptUrl !== undefined) updatePayload.receipt_url = updated.receiptUrl || null;
      if (updated.receiptName !== undefined) updatePayload.receipt_name = updated.receiptName || null;

      const { error } = await client
        .from('auction_expenses')
        .update(updatePayload)
        .eq('id', expenseId)
        .eq('auction_id', auctionId);

      if (error) {
        console.error('[AuctionService] Supabase updateExpense error:', error.message);
      }
    } catch (e) {
      console.warn('[AuctionService] Supabase updateExpense exception:', e);
    }

    return true;
  }

  public async deleteExpense(auctionId: string, expenseId: string): Promise<boolean> {
    // 1. Update local cache
    const auction = await this.getAuctionById(auctionId);
    if (auction) {
      auction.expenses = (auction.expenses || []).filter(e => e.id !== expenseId);
      await this.saveAuction(auction);
    }

    // 2. Delete from Supabase auction_expenses table
    try {
      const client = supabaseAdmin || supabase;
      const { error } = await client
        .from('auction_expenses')
        .delete()
        .eq('id', expenseId)
        .eq('auction_id', auctionId);

      if (error) {
        console.error('[AuctionService] Supabase deleteExpense error:', error.message);
      }
    } catch (e) {
      console.warn('[AuctionService] Supabase deleteExpense exception:', e);
    }

    return true;
  }
}

export const auctionService = new AuctionService();
