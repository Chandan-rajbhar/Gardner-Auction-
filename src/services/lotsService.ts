import { supabaseAdmin, supabase } from '../lib/supabase';
import { LotItem, LotCategory, LotStatus } from '../types';
import { INITIAL_LOTS } from '../data/mockData';

export interface DBLotRow {
  id: string;
  auction_id?: string;
  lot_number: number;
  title: string;
  category: string;
  image?: string;
  starting_bid: number;
  reserve_price: number;
  estimate_low: number;
  estimate_high: number;
  current_bid: number;
  high_bidder_paddle?: string | null;
  high_bidder_name?: string | null;
  status: string;
  certification?: string;
  grade?: string;
  cert_number?: string | null;
  consignor_name?: string;
  condition_report?: string;
  provenance?: string;
  bids_count?: number;
  hammer_price?: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Maps Supabase snake_case table row to application LotItem
 */
export function dbToLotItem(row: DBLotRow): LotItem {
  return {
    id: row.id,
    auctionId: row.auction_id || '',
    lotNumber: row.lot_number,
    title: row.title,
    category: (row.category || 'Rare US Gold') as LotCategory,
    image: row.image || '/assets/gold-coin.jpg',
    startingBid: Number(row.starting_bid) || 0,
    reservePrice: Number(row.reserve_price) || 0,
    estimateLow: Number(row.estimate_low) || 0,
    estimateHigh: Number(row.estimate_high) || 0,
    currentBid: Number(row.current_bid) || Number(row.starting_bid) || 0,
    highBidderPaddle: row.high_bidder_paddle || null,
    highBidderName: row.high_bidder_name || null,
    status: (row.status || 'upcoming') as LotStatus,
    certification: (row.certification || 'PCGS') as LotItem['certification'],
    grade: row.grade || 'MS-65 Gem Uncirculated',
    certNumber: row.cert_number || undefined,
    consignorId: 'c-01',
    consignorName: row.consignor_name || 'Estate Consignor',
    conditionReport: row.condition_report || 'Preserved in high-grade numismatic state with original luster.',
    provenance: row.provenance || 'Gardner Certified Vault Archive.',
    bidsCount: Number(row.bids_count) || 0,
    hammerPrice: row.hammer_price ? Number(row.hammer_price) : undefined,
  };
}

/**
 * Maps application LotItem to Supabase snake_case row
 */
export function lotItemToDB(lot: LotItem): DBLotRow {
  return {
    id: lot.id,
    auction_id: lot.auctionId || undefined,
    lot_number: lot.lotNumber,
    title: lot.title,
    category: lot.category || 'Rare Numismatics & Curated Lots',
    image: lot.image || '/assets/gold-coin.jpg',
    starting_bid: Number(lot.startingBid) || 0,
    reserve_price: Number(lot.reservePrice) || 0,
    estimate_low: Number(lot.estimateLow) || 0,
    estimate_high: Number(lot.estimateHigh) || 0,
    current_bid: Number(lot.currentBid) || Number(lot.startingBid) || 0,
    high_bidder_paddle: lot.highBidderPaddle || null,
    high_bidder_name: lot.highBidderName || null,
    status: lot.status,
    certification: lot.certification,
    grade: lot.grade,
    cert_number: lot.certNumber || null,
    consignor_name: lot.consignorName,
    condition_report: lot.conditionReport,
    provenance: lot.provenance,
    bids_count: lot.bidsCount || 0,
    hammer_price: lot.hammerPrice || null,
    updated_at: new Date().toISOString()
  };
}

export const lotsService = {
  /**
   * Fetch all lots dynamically from Supabase database
   */
  async fetchLots(): Promise<LotItem[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('lots')
        .select('*')
        .order('lot_number', { ascending: true });

      if (error) {
        console.warn('[lotsService] Supabase fetch error, using fallback:', error.message);
        return INITIAL_LOTS;
      }

      if (!data || data.length === 0) {
        // If empty, auto-seed INITIAL_LOTS into Supabase so table is populated
        console.log('[lotsService] Table empty, seeding initial lots into Supabase...');
        await this.seedLots(INITIAL_LOTS);
        return INITIAL_LOTS;
      }

      return (data as DBLotRow[]).map(dbToLotItem);
    } catch (err) {
      console.error('[lotsService] Unexpected error in fetchLots:', err);
      return INITIAL_LOTS;
    }
  },

  /**
   * Insert a new lot into Supabase
   */
  async createLot(lot: LotItem): Promise<{ success: boolean; lot?: LotItem; error?: string }> {
    try {
      const row = lotItemToDB(lot);
      let { data, error } = await supabaseAdmin
        .from('lots')
        .upsert([row], { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        const fallback = await supabase
          .from('lots')
          .insert([row])
          .select()
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('[lotsService] Create lot error:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true, lot: dbToLotItem(data as DBLotRow) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  /**
   * Update an existing lot in Supabase
   */
  async updateLot(id: string, updates: Partial<LotItem>): Promise<{ success: boolean; error?: string }> {
    try {
      const dbUpdates: Partial<DBLotRow> = {
        updated_at: new Date().toISOString()
      };

      if (updates.lotNumber !== undefined) dbUpdates.lot_number = updates.lotNumber;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.image !== undefined) dbUpdates.image = updates.image;
      if (updates.images !== undefined && updates.images.length > 0) dbUpdates.image = updates.images[0];
      if (updates.startingBid !== undefined) dbUpdates.starting_bid = updates.startingBid;
      if (updates.reservePrice !== undefined) dbUpdates.reserve_price = updates.reservePrice;
      if (updates.estimateLow !== undefined) dbUpdates.estimate_low = updates.estimateLow;
      if (updates.estimateHigh !== undefined) dbUpdates.estimate_high = updates.estimateHigh;
      if (updates.currentBid !== undefined) dbUpdates.current_bid = updates.currentBid;
      if (updates.highBidderPaddle !== undefined) dbUpdates.high_bidder_paddle = updates.highBidderPaddle;
      if (updates.highBidderName !== undefined) dbUpdates.high_bidder_name = updates.highBidderName;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.certification !== undefined) dbUpdates.certification = updates.certification;
      if (updates.grade !== undefined) dbUpdates.grade = updates.grade;
      if (updates.certNumber !== undefined) dbUpdates.cert_number = updates.certNumber;
      if (updates.consignorName !== undefined) dbUpdates.consignor_name = updates.consignorName;
      if (updates.sellerName !== undefined && !updates.consignorName) dbUpdates.consignor_name = updates.sellerName;
      if (updates.conditionReport !== undefined) dbUpdates.condition_report = updates.conditionReport;
      if (updates.description !== undefined && !updates.conditionReport) dbUpdates.condition_report = updates.description;
      if (updates.provenance !== undefined) dbUpdates.provenance = updates.provenance;
      if (updates.bidsCount !== undefined) dbUpdates.bids_count = updates.bidsCount;
      if (updates.hammerPrice !== undefined) dbUpdates.hammer_price = updates.hammerPrice;

      let { error } = await supabaseAdmin
        .from('lots')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        const fallback = await supabase
          .from('lots')
          .update(dbUpdates)
          .eq('id', id);
        error = fallback.error;
      }

      if (error) {
        console.error('[lotsService] Update lot error:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  /**
   * Delete a lot from Supabase
   */
  async deleteLot(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      let { error } = await supabaseAdmin
        .from('lots')
        .delete()
        .eq('id', id);

      if (error) {
        const fallback = await supabase
          .from('lots')
          .delete()
          .eq('id', id);
        error = fallback.error;
      }

      if (error) {
        console.error('[lotsService] Delete lot error:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  /**
   * Transmit a lot to Live Clerking Block (on_block)
   * Automatically sets any other on_block lot back to upcoming
   */
  async sendLotToBlock(lotId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Demote any currently on_block lot to upcoming
      await supabaseAdmin
        .from('lots')
        .update({ status: 'upcoming', updated_at: new Date().toISOString() })
        .eq('status', 'on_block');

      // 2. Promote target lot to on_block
      const { error } = await supabaseAdmin
        .from('lots')
        .update({ status: 'on_block', updated_at: new Date().toISOString() })
        .eq('id', lotId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  /**
   * Seed multiple initial lots
   */
  async seedLots(lots: LotItem[]): Promise<void> {
    try {
      const rows = lots.map(lotItemToDB);
      await supabaseAdmin.from('lots').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.warn('[lotsService] Error seeding lots:', err);
    }
  },

  /**
   * Realtime WebSockets subscription to listen for live database changes
   */
  subscribeToLots(onRefreshNeeded: () => void): () => void {
    if (!globalThis.__lotListeners) {
      globalThis.__lotListeners = new Set();
    }
    globalThis.__lotListeners.add(onRefreshNeeded);

    if (!globalThis.__lotRealtimeChannel) {
      globalThis.__lotRealtimeChannel = supabase
        .channel(`realtime_lots_shared_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lots' },
          (payload) => {
            console.log('[lotsService Realtime] Lot changed:', payload.eventType);
            globalThis.__lotListeners?.forEach((listener: () => void) => {
              try { listener(); } catch (err) { console.warn(err); }
            });
          }
        )
        .subscribe();
    }

    return () => {
      globalThis.__lotListeners?.delete(onRefreshNeeded);
      if (globalThis.__lotListeners?.size === 0 && globalThis.__lotRealtimeChannel) {
        supabase.removeChannel(globalThis.__lotRealtimeChannel);
        globalThis.__lotRealtimeChannel = null;
      }
    };
  }
};
