import { AuctionDetail, SettlementCustomer, SettlementCharge, AuctionExpense } from '../types/auctionDetail';
import { MOCK_AUCTIONS_DETAIL } from '../data/mockAuctionDetailData';
import { supabaseAdmin, supabase } from '../lib/supabase';

const STORAGE_KEY = 'gardner_auctions_detail_v1';

class AuctionService {
  private auctions: AuctionDetail[] = [];

  constructor() {
    this.initData();
  }

  private initData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.auctions = JSON.parse(stored);
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
          const existing = this.auctions.find(a => a.id === row.id);
          const base = existing || this.auctions[0] || MOCK_AUCTIONS_DETAIL[0];
          return {
            ...JSON.parse(JSON.stringify(base)),
            id: row.id,
            code: row.code || `AUC-${row.id.toString().slice(-4)}`,
            name: row.name,
            description: row.description || '',
            status: row.status || 'Open',
            startDate: row.start_date || new Date().toISOString().split('T')[0],
            endDate: row.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            auctionType: row.auction_type || 'HiBid',
            currency: row.currency || 'USD',
            featuredImages: Array.isArray(row.featured_images) && row.featured_images.length > 0 ? row.featured_images : base.featuredImages,
            auctionLinks: Array.isArray(row.auction_links) ? row.auction_links : base.auctionLinks,
            uploadSettings: {
              ...base.uploadSettings,
              ...(row.upload_settings || {})
            },
            lotDefaults: {
              ...base.lotDefaults,
              ...(row.lot_defaults || {})
            }
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
    const found = this.auctions.find(a => a.id === id);
    if (found) return JSON.parse(JSON.stringify(found));

    // Fallback: Check Supabase directly if auction was created elsewhere
    try {
      const { data, error } = await supabaseAdmin
        .from('auctions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const base = this.auctions[0] || MOCK_AUCTIONS_DETAIL[0];
        const loaded: AuctionDetail = {
          ...JSON.parse(JSON.stringify(base)),
          id: data.id,
          code: data.code || `AUC-${data.id.toString().slice(-4)}`,
          name: data.name,
          description: data.description || '',
          status: data.status || 'Open',
          startDate: data.start_date || new Date().toISOString().split('T')[0],
          endDate: data.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          auctionType: data.auction_type || 'HiBid',
          currency: data.currency || 'USD',
          featuredImages: Array.isArray(data.featured_images) ? data.featured_images : base.featuredImages,
          auctionLinks: Array.isArray(data.auction_links) ? data.auction_links : base.auctionLinks,
          uploadSettings: {
            ...base.uploadSettings,
            ...(data.upload_settings || {})
          },
          lotDefaults: {
            ...base.lotDefaults,
            ...(data.lot_defaults || {})
          }
        };
        this.auctions.unshift(loaded);
        this.persist();
        return loaded;
      }
    } catch (err) {
      console.warn('[AuctionService] getAuctionById Supabase error:', err);
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
    const base = this.auctions[0] || MOCK_AUCTIONS_DETAIL[0];
    const generatedId = `auc-${Date.now()}`;
    const newAuction: AuctionDetail = {
      ...JSON.parse(JSON.stringify(base)),
      id: data.id || generatedId,
      code: (data.code || `AUC-${Date.now().toString().slice(-4)}`).toUpperCase(),
      name: data.name || 'New Catalog Auction',
      status: data.status || 'Open',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      description: data.description || 'Fine curated catalog items from private collections.',
      auctionType: data.auctionType || 'HiBid',
      settlements: [],
      ...data
    };

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
          currency: 'USD',
          country: 'United States',
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

  public subscribeToAuctions(onRefreshNeeded: () => void): () => void {
    const channel = supabase
      .channel('realtime:auctions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        (payload) => {
          console.log('[AuctionService Realtime] Auction changed:', payload.eventType);
          onRefreshNeeded();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
