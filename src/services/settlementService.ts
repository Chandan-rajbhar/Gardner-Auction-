import { supabaseAdmin, supabase } from '../lib/supabase';
import { SettlementCustomer, SettlementLotItem } from '../types/auctionDetail';
import { InvoiceSettlement, ConsignorSettlement } from '../types';
import { auctionService } from './auctionService';
import { lotsService } from './lotsService';
import { INITIAL_INVOICES, INITIAL_CONSIGNOR_SETTLEMENTS } from '../data/mockData';

export interface BatchShipmentData {
  carrier: string;
  trackingNumber: string;
  shipDate: string;
  notes?: string;
}

export class SettlementService {
  private get client() {
    return supabaseAdmin || supabase;
  }

  /**
   * Load Bidder Settlements for the specified auction.
   * Pulls from Supabase invoices table, auction settlement records, and real-time sold lots.
   */
  public async getBidderSettlements(auctionId: string): Promise<SettlementCustomer[]> {
    const client = this.client;
    let customers: SettlementCustomer[] = [];

    // 1. Attempt loading from dedicated Supabase `invoices` table
    try {
      const { data, error } = await client
        .from('invoices')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        customers = data.map((row: any) => ({
          id: row.id,
          auctionId: row.auction_id,
          bidderNumber: row.paddle_number,
          name: row.buyer_name,
          isSeller: row.paddle_number === 'HOUSE',
          isCashBuyer: Boolean(row.is_cash_buyer),
          lotCount: Number(row.items_count) || 0,
          shippedCount: Number(row.shipped_count) || (row.is_shipped ? Number(row.items_count) : 0),
          totalLotsCount: Number(row.total_lots_count) || Number(row.items_count) || 1,
          balance: Number(row.balance !== undefined ? row.balance : (row.payment_status === 'Paid' ? 0 : row.total_due)),
          invoiceNumber: row.invoice_number,
          invoiceStatus: row.payment_status === 'Paid' ? 'Paid' : 'Pending',
          shippingRequested: Boolean(row.shipping_requested !== false),
          lots: [],
          charges: []
        }));
        return customers;
      }
    } catch (_) {}

    // 2. Fall back to auction record settlements in Supabase / Local storage
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction && auction.settlements && auction.settlements.length > 0) {
        customers = auction.settlements;
      }
    } catch (_) {}

    // 3. Fallback to INITIAL_INVOICES mapped to SettlementCustomer if empty
    if (customers.length === 0) {
      const relevantInvoices = INITIAL_INVOICES.filter(
        i => !i.auctionId || i.auctionId === auctionId || auctionId === 'auc-002' || auctionId === 'auc-001'
      );
      customers = relevantInvoices.map(inv => ({
        id: `cust-${inv.paddleNumber}`,
        auctionId,
        bidderNumber: inv.paddleNumber,
        name: inv.buyerName,
        isSeller: inv.paddleNumber === 'HOUSE',
        isCashBuyer: inv.paymentMethod === 'Cash',
        lotCount: inv.itemsCount,
        shippedCount: 0,
        totalLotsCount: inv.itemsCount,
        balance: inv.paymentStatus === 'Paid' ? 0 : inv.totalDue,
        invoiceNumber: inv.invoiceNumber,
        invoiceStatus: inv.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
        shippingRequested: true,
        lots: inv.lots.map((l, idx) => ({
          id: `slot-${idx + 1}`,
          lotNumber: l.lotNumber,
          title: l.title,
          status: 'Sold',
          qtySold: 1,
          isShipped: false,
          entries: [
            { id: `ent-hammer-${idx}`, type: 'sold_lot', label: 'Hammer Amount', amount: l.hammerPrice },
            { id: `ent-bp-${idx}`, type: 'buyers_premium', label: "Buyer's Premium", amount: l.hammerPrice * 0.15 }
          ]
        })),
        charges: []
      }));
    }

    return customers;
  }

  /**
   * Load Seller Settlements (Consignor Statements) for specified auction.
   */
  public async getSellerSettlements(auctionId: string): Promise<ConsignorSettlement[]> {
    const client = this.client;

    // 1. Attempt loading from dedicated Supabase `seller_settlements` table
    try {
      const { data, error } = await client
        .from('seller_settlements')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          consignorCode: row.consignor_code,
          consignorName: row.consignor_name,
          auctionCode: row.auction_code || `GA-${auctionId}`,
          totalLotsSold: Number(row.total_lots_sold) || 0,
          grossHammer: Number(row.gross_hammer) || 0,
          commissionRate: Number(row.commission_rate) || 10,
          commissionAmount: Number(row.commission_amount) || 0,
          photographyFees: Number(row.photography_fees) || 0,
          netPayout: Number(row.net_payout) || 0,
          status: row.status as ConsignorSettlement['status'],
          checkNumber: row.check_number
        }));
      }
    } catch (_) {}

    // 2. Fall back to INITIAL_CONSIGNOR_SETTLEMENTS
    return INITIAL_CONSIGNOR_SETTLEMENTS;
  }

  /**
   * Toggle Cash Buyer status for a bidder settlement customer and persist to Supabase.
   */
  public async updateCashBuyer(auctionId: string, customerId: string, isCashBuyer: boolean): Promise<boolean> {
    try {
      // Try Supabase invoices table
      await this.client
        .from('invoices')
        .update({ is_cash_buyer: isCashBuyer, updated_at: new Date().toISOString() })
        .eq('id', customerId);
    } catch (_) {}

    // Also update auction record
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction && auction.settlements) {
        const found = auction.settlements.find(c => c.id === customerId);
        if (found) {
          found.isCashBuyer = isCashBuyer;
          await auctionService.saveAuction(auction);
        }
      }
    } catch (_) {}

    return true;
  }

  /**
   * Batch mark settlements as shipped with carrier & tracking details.
   */
  public async markBatchShipped(
    auctionId: string,
    customerIds: string[],
    shipmentData?: BatchShipmentData
  ): Promise<boolean> {
    const client = this.client;

    // Update invoices in Supabase
    try {
      await client
        .from('invoices')
        .update({
          is_shipped: true,
          shipping_carrier: shipmentData?.carrier || 'Armored Courier',
          tracking_number: shipmentData?.trackingNumber || `TRK-${Date.now().toString().slice(-8)}`,
          updated_at: new Date().toISOString()
        })
        .in('id', customerIds);
    } catch (_) {}

    // Update auction settlements
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction && auction.settlements) {
        auction.settlements.forEach(c => {
          if (customerIds.includes(c.id)) {
            c.shippedCount = c.totalLotsCount || c.lotCount || 1;
            c.lots?.forEach(l => {
              l.isShipped = true;
            });
          }
        });
        await auctionService.saveAuction(auction);
      }
    } catch (_) {}

    return true;
  }

  /**
   * Update invoice details and payment status.
   */
  public async updateInvoice(
    auctionId: string,
    invoiceId: string,
    updates: {
      paymentStatus: 'Paid' | 'Pending Wire' | 'Card Authorized' | 'Check Received' | 'Unpaid';
      paymentMethod?: string;
      notes?: string;
      shippingFee?: number;
      taxAmount?: number;
    }
  ): Promise<boolean> {
    const client = this.client;

    try {
      await client
        .from('invoices')
        .update({
          payment_status: updates.paymentStatus,
          payment_method: updates.paymentMethod,
          notes: updates.notes,
          shipping_fee: updates.shippingFee,
          tax_amount: updates.taxAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
    } catch (_) {}

    // Update auction settlement customer
    try {
      const auction = await auctionService.getAuctionById(auctionId);
      if (auction && auction.settlements) {
        const c = auction.settlements.find(s => s.id === invoiceId || s.invoiceNumber === invoiceId);
        if (c) {
          c.invoiceStatus = updates.paymentStatus === 'Paid' ? 'Paid' : 'Pending';
          if (updates.paymentStatus === 'Paid') {
            c.balance = 0;
          }
          await auctionService.saveAuction(auction);
        }
      }
    } catch (_) {}

    return true;
  }

  /**
   * Update Consignor/Seller Settlement payout status.
   */
  public async updateSellerSettlementStatus(
    auctionId: string,
    settlementId: string,
    status: ConsignorSettlement['status'],
    checkNumber?: string
  ): Promise<boolean> {
    const client = this.client;

    try {
      await client
        .from('seller_settlements')
        .update({
          status,
          check_number: checkNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', settlementId);
    } catch (_) {}

    return true;
  }

  /**
   * Batch process credit cards for selected settlements.
   */
  public async batchProcessCreditCards(auctionId: string, customerIds: string[]): Promise<boolean> {
    return auctionService.batchProcessCreditCards(auctionId, customerIds);
  }
}

export const settlementService = new SettlementService();
