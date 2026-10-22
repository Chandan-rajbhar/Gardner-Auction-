import { AuctionDetail, SettlementCustomer, SettlementCharge, AuctionExpense } from '../types/auctionDetail';
import { MOCK_AUCTIONS_DETAIL } from '../data/mockAuctionDetailData';
import { supabaseAdmin, supabase } from '../lib/supabase';

const STORAGE_KEY = 'gardner_auctions_detail_v1';

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
    shippingAvailability: '',
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
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AuctionDetail[] = JSON.parse(stored);
        // Clean any dynamically created auctions that previously inherited mock data
        this.auctions = parsed.map(a => {
          if (a.id !== 'auc-001') {
            if (a.address1 === '119 Jewel Basin Ct') a.address1 = '';
            if (a.address2 === 'Suite 100') a.address2 = '';
            if (a.city === 'Bigfork') a.city = '';
            if (a.state === 'MT') a.state = '';
            if (a.zip === '59911') a.zip = '';
            if (a.shippingAccount === 'shipping & handling') a.shippingAccount = '';
            if (a.handlingAmount === 4.5 || a.handlingAmount === 4.50) {
              a.handlingAmount = 0;
              a.addHandlingCharge = false;
            }
            if (a.useConsolidatedInvoicing && (a.address1 === '' || !a.address1)) {
              a.useConsolidatedInvoicing = false;
            }
            if (a.terms && a.terms.includes('HGS Terms & Conditions')) {
              a.terms = '';
            }
            if (a.paymentInfo && a.paymentInfo.includes('3% processing fee applied')) {
              a.paymentInfo = '';
            }
            if (a.shortBpExplanation && a.shortBpExplanation.includes("15% Buyer's Premium")) {
              a.shortBpExplanation = '';
            }
            if (a.uploadSettings && a.uploadSettings.previewDateTimes?.includes('119 Jewel Basin')) {
              a.uploadSettings = createEmptyAuctionDetail().uploadSettings;
            }
            if (a.lotDefaults) {
              if (a.lotDefaults.commission?.includes('CSS_52F3ABA3')) a.lotDefaults.commission = '';
              if (a.lotDefaults.buyerTax?.includes('BTAX_0%')) a.lotDefaults.buyerTax = '';
              if (a.lotDefaults.buyerPremium?.includes('BP_15')) a.lotDefaults.buyerPremium = '';
            }
            if (a.featuredImages && a.featuredImages.length === 4 && a.featuredImages[0]?.title?.includes('Morgan')) {
              a.featuredImages = [];
            }
            if (a.auctionLinks && a.auctionLinks.length === 2 && a.auctionLinks[0]?.url?.includes('highlandcrggoldandsilver')) {
              a.auctionLinks = [];
            }
            if (a.expenses && a.expenses.length > 0 && a.expenses[0]?.amount === 1200) {
              a.expenses = [];
            }
          }
          return a;
        });
        this.persist();
      } else {
        this.auctions = MOCK_AUCTIONS_DETAIL;
        this.persist();
      }
    } catch (e) {
      console.warn('[AuctionService] Failed to load from localStorage, using mock data:', e);
      this.auctions = MOCK_AUCTIONS_DETAIL;
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
    try {
      const { data, error } = await supabaseAdmin
        .from('auctions')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data && data.length > 0) {
        const fromDb: AuctionDetail[] = data.map((row: any) => {
          const isMockAuction = row.id === 'auc-001';
          const existing = this.auctions.find(a => a.id === row.id);
          const base = isMockAuction
            ? (existing || MOCK_AUCTIONS_DETAIL[0])
            : (existing || createEmptyAuctionDetail({ id: row.id }));

          // Sanitize any residual mock defaults for newly created/custom auctions
          if (!isMockAuction) {
            if (base.address1 === '119 Jewel Basin Ct') base.address1 = '';
            if (base.address2 === 'Suite 100') base.address2 = '';
            if (base.city === 'Bigfork') base.city = '';
            if (base.state === 'MT') base.state = '';
            if (base.zip === '59911') base.zip = '';
            if (base.shippingAccount === 'shipping & handling') base.shippingAccount = '';
            if (base.handlingAmount === 4.5 || base.handlingAmount === 4.50) {
              base.handlingAmount = 0;
              base.addHandlingCharge = false;
            }
            if (base.shortBpExplanation === "15% Buyer's Premium") base.shortBpExplanation = '';
            if (base.terms && base.terms.includes('HGS Terms & Conditions')) base.terms = '';
            if (base.paymentInfo && base.paymentInfo.includes('3% processing fee applied')) base.paymentInfo = '';
            if (base.uploadSettings && base.uploadSettings.previewDateTimes?.includes('119 Jewel Basin')) {
              base.uploadSettings = createEmptyAuctionDetail().uploadSettings;
            }
          }

          return {
            ...JSON.parse(JSON.stringify(base)),
            id: row.id,
            code: row.code || `AUC-${row.id.toString().slice(-4)}`,
            name: row.name || '',
            description: row.description || '',
            status: row.status || 'Open',
            startDate: row.start_date || new Date().toISOString().split('T')[0],
            endDate: row.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            auctionType: row.auction_type || 'HiBid',
            currency: row.currency || 'USD',
            taxExemptAll: row.tax_exempt_all !== undefined ? Boolean(row.tax_exempt_all) : (isMockAuction ? base.taxExemptAll : false),
            liveStartingBidCard: row.live_starting_bid_card !== undefined ? Number(row.live_starting_bid_card) : (isMockAuction ? base.liveStartingBidCard : 1),
            paymentInfo: row.payment_info ?? (isMockAuction ? base.paymentInfo : ''),
            terms: row.terms ?? (isMockAuction ? base.terms : ''),
            shortBpExplanation: row.short_bp_explanation ?? (isMockAuction ? base.shortBpExplanation : ''),
            address1: row.address1 ?? (isMockAuction ? base.address1 : ''),
            address2: row.address2 ?? (isMockAuction ? base.address2 : ''),
            city: row.city ?? (isMockAuction ? base.city : ''),
            state: row.state ?? (isMockAuction ? base.state : ''),
            zip: row.zip ?? (isMockAuction ? base.zip : ''),
            country: row.country ?? (isMockAuction ? base.country : ''),
            useConsolidatedInvoicing: row.use_consolidated_invoicing !== undefined ? Boolean(row.use_consolidated_invoicing) : false,
            shippingAvailability: row.shipping_availability ?? (isMockAuction ? base.shippingAvailability : ''),
            shippingAccount: row.shipping_account ?? (isMockAuction ? base.shippingAccount : ''),
            addHandlingCharge: row.add_handling_charge !== undefined ? Boolean(row.add_handling_charge) : false,
            handlingChargeType: row.handling_charge_type || (isMockAuction ? base.handlingChargeType : 'Fixed'),
            handlingAmount: row.handling_amount !== undefined ? Number(row.handling_amount) : (isMockAuction ? base.handlingAmount : 0),
            featuredImages: Array.isArray(row.featured_images) ? row.featured_images : (isMockAuction ? base.featuredImages : []),
            auctionLinks: Array.isArray(row.auction_links) ? row.auction_links : (isMockAuction ? base.auctionLinks : []),
            uploadSettings: {
              ...(isMockAuction ? base.uploadSettings : createEmptyAuctionDetail().uploadSettings),
              ...(row.upload_settings || {})
            },
            lotDefaults: {
              ...(isMockAuction ? base.lotDefaults : createEmptyAuctionDetail().lotDefaults),
              ...(row.lot_defaults || {})
            },
            expenses: isMockAuction ? base.expenses : (base.expenses || [])
          };
        });

        const dbIds = new Set(fromDb.map(a => a.id));
        const merged = [...fromDb, ...this.auctions.filter(a => !dbIds.has(a.id))];
        this.auctions = merged;
        this.persist();
        return merged;
      }
    } catch (err) {
      console.warn('[AuctionService] Failed to fetch auctions from Supabase, using local fallback:', err);
    }
    return [...this.auctions];
  }

  public async getAuctionById(id: string): Promise<AuctionDetail | null> {
    const isMockAuction = id === 'auc-001';

    // 1. Fetch fresh record directly from Supabase
    try {
      const { data, error } = await supabaseAdmin
        .from('auctions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const base = isMockAuction ? MOCK_AUCTIONS_DETAIL[0] : createEmptyAuctionDetail({ id: data.id });
        const loaded: AuctionDetail = {
          ...JSON.parse(JSON.stringify(base)),
          id: data.id,
          code: data.code || `AUC-${data.id.toString().slice(-4)}`,
          name: data.name || '',
          description: data.description || '',
          status: data.status || 'Open',
          startDate: data.start_date || new Date().toISOString().split('T')[0],
          endDate: data.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          auctionType: data.auction_type || 'HiBid',
          currency: data.currency || 'USD',
          taxExemptAll: data.tax_exempt_all !== undefined ? Boolean(data.tax_exempt_all) : (isMockAuction ? base.taxExemptAll : false),
          liveStartingBidCard: data.live_starting_bid_card !== undefined ? Number(data.live_starting_bid_card) : (isMockAuction ? base.liveStartingBidCard : 1),
          paymentInfo: data.payment_info || '',
          terms: data.terms || '',
          shortBpExplanation: data.short_bp_explanation || '',
          address1: data.address1 ?? '',
          address2: data.address2 ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          zip: data.zip ?? '',
          country: data.country ?? '',
          useConsolidatedInvoicing: data.use_consolidated_invoicing !== undefined ? Boolean(data.use_consolidated_invoicing) : false,
          shippingAvailability: data.shipping_availability ?? '',
          shippingAccount: data.shipping_account ?? '',
          addHandlingCharge: data.add_handling_charge !== undefined ? Boolean(data.add_handling_charge) : false,
          handlingChargeType: data.handling_charge_type || 'Fixed',
          handlingAmount: data.handling_amount !== undefined ? Number(data.handling_amount) : 0,
          featuredImages: Array.isArray(data.featured_images) ? data.featured_images : (isMockAuction ? base.featuredImages : []),
          auctionLinks: Array.isArray(data.auction_links) ? data.auction_links : (isMockAuction ? base.auctionLinks : []),
          uploadSettings: {
            ...(isMockAuction ? base.uploadSettings : createEmptyAuctionDetail().uploadSettings),
            ...(data.upload_settings || {})
          },
          lotDefaults: {
            ...(isMockAuction ? base.lotDefaults : createEmptyAuctionDetail().lotDefaults),
            ...(data.lot_defaults || {})
          },
          expenses: isMockAuction ? base.expenses : []
        };

        const idx = this.auctions.findIndex(a => a.id === id);
        if (idx >= 0) {
          this.auctions[idx] = loaded;
        } else {
          this.auctions.unshift(loaded);
        }
        this.persist();
        return JSON.parse(JSON.stringify(loaded));
      }
    } catch (err) {
      console.warn('[AuctionService] getAuctionById Supabase error:', err);
    }

    // 2. Fallback to local cache if offline or not in Supabase
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
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) {
        console.error('[AuctionService] Supabase upsert error:', error.message);
        return { success: true, data: updated, error: error.message };
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
    const auction = await this.getAuctionById(auctionId);
    return auction?.expenses || [];
  }

  public async getTotalExpensesForAuction(auctionId: string): Promise<number> {
    const expenses = await this.getAuctionExpenses(auctionId);
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }

  public async addExpense(auctionId: string, expense: Omit<AuctionExpense, 'id'>): Promise<AuctionExpense | null> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return null;
    const newExpense: AuctionExpense = {
      ...expense,
      id: `exp-${Date.now()}`
    };
    auction.expenses = [newExpense, ...(auction.expenses || [])];
    await this.saveAuction(auction);
    return newExpense;
  }

  public async updateExpense(auctionId: string, expenseId: string, updated: Partial<AuctionExpense>): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;
    const idx = (auction.expenses || []).findIndex(e => e.id === expenseId);
    if (idx >= 0) {
      auction.expenses[idx] = { ...auction.expenses[idx], ...updated };
      await this.saveAuction(auction);
      return true;
    }
    return false;
  }

  public async deleteExpense(auctionId: string, expenseId: string): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;
    auction.expenses = (auction.expenses || []).filter(e => e.id !== expenseId);
    await this.saveAuction(auction);
    return true;
  }
}

export const auctionService = new AuctionService();
