import { supabaseAdmin, supabase } from '../lib/supabase';
import { SettlementCustomer, SettlementLotItem, SettlementCharge, SettlementPayment } from '../types/auctionDetail';
import { InvoiceSettlement, ConsignorSettlement } from '../types';

export interface BatchShipmentData {
  carrier: string;
  trackingNumber: string;
  shipDate: string;
  notes?: string;
}

export interface SettlementEmailPayload {
  to: string;
  replyTo?: string;
  bcc?: string;
  subject: string;
  body: string;
  customerName: string;
  paddleNumber: string;
  invoiceNumber: string;
  auctionTitle?: string;
  settlementLink?: string;
}

export interface ShipmentRecord {
  id: string;
  invoiceId: string;
  auctionId: string;
  invoiceLotId?: string;
  carrier?: string;
  trackingNumber?: string;
  shipDate?: string;
  shippedBy?: string;
  notes?: string;
  status: 'Pending' | 'Shipped' | 'Picked Up' | 'Returned';
}

/**
 * Helper: Parse recorded customer payments from invoice notes.
 * Supports structured JSON [PAYMENTS_DATA]:[...] and legacy [Payment Cashier] tags.
 */
export function parsePaymentsFromNotes(notes?: string): SettlementPayment[] {
  if (!notes) return [];

  const marker = '[PAYMENTS_DATA]:';
  const markerIdx = notes.indexOf(marker);
  if (markerIdx !== -1) {
    try {
      const rest = notes.slice(markerIdx + marker.length);
      const endIdx = rest.indexOf('\n');
      const jsonStr = endIdx === -1 ? rest.trim() : rest.slice(0, endIdx).trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => ({
          id: String(p.id || 'pay-' + Math.random().toString(36).slice(2, 6)),
          amount: Number(p.amount) || 0,
          method: String(p.method || 'Credit Card'),
          date: String(p.date || new Date().toISOString().split('T')[0]),
          notes: String(p.notes || ''),
          status: (p.status as any) || 'Successful'
        }));
      }
    } catch (_) {}
  }

  // Fallback: parse legacy tags: [Payment Cashier] Check Written: $100.00
  const legacyRegex = /\[Payment Cashier\]\s*([^:\n]+):\s*\$([0-9,.]+)(?:\s*-\s*([^\n]*))?/gi;
  const legacyPayments: SettlementPayment[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = legacyRegex.exec(notes)) !== null) {
    const method = match[1]?.trim() || 'Cashier';
    const amount = parseFloat(match[2].replace(/,/g, '')) || 0;
    const noteText = match[3]?.trim() || '';
    if (amount > 0) {
      legacyPayments.push({
        id: 'legacy-pay-' + (idx++),
        amount,
        method,
        date: new Date().toISOString().split('T')[0],
        notes: noteText,
        status: 'Successful'
      });
    }
  }

  return legacyPayments;
}

/**
 * Helper: Serialize payments array cleanly into invoice notes.
 */
export function serializePaymentsToNotes(payments: SettlementPayment[], originalNotes?: string): string {
  const marker = '[PAYMENTS_DATA]:';
  let cleanedNotes = originalNotes || '';
  if (cleanedNotes.includes(marker)) {
    cleanedNotes = cleanedNotes
      .split('\n')
      .filter(line => !line.startsWith(marker))
      .join('\n')
      .trim();
  }

  const jsonLine = marker + JSON.stringify(payments);
  if (!cleanedNotes) {
    return jsonLine;
  }
  return jsonLine + '\n' + cleanedNotes;
}

export class SettlementService {
  private get client() {
    return supabaseAdmin || supabase;
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Fetch invoice_lots rows for a given invoice and map to SettlementLotItem[].
   */
  private async fetchLotsForInvoice(invoiceId: string): Promise<SettlementLotItem[]> {
    try {
      const { data, error } = await this.client
        .from('invoice_lots')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('lot_number', { ascending: true });

      if (error || !data) return [];

      return data.map((row: any): SettlementLotItem => ({
        id: row.id,
        lotNumber: Number(row.lot_number) || 0,
        title: row.title || '',
        status: (row.status as SettlementLotItem['status']) || 'Sold',
        qtySold: Number(row.qty_sold) || 1,
        isShipped: Boolean(row.is_shipped),
        entries: Array.isArray(row.entries) ? row.entries : []
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetch invoice_charges rows for a given invoice and map to SettlementCharge[].
   */
  private async fetchChargesForInvoice(invoiceId: string): Promise<SettlementCharge[]> {
    try {
      const { data, error } = await this.client
        .from('invoice_charges')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return data.map((row: any): SettlementCharge => ({
        id: row.id,
        account: row.account || '',
        description: row.description || '',
        amount: Number(row.amount) || 0,
        type: (row.charge_type as SettlementCharge['type']) || 'buyer',
        date: row.charge_date || new Date(row.created_at).toLocaleDateString()
      }));
    } catch {
      return [];
    }
  }

  /**
   * Map a raw invoices DB row to SettlementCustomer, resolving lots and charges.
   */
    /**
   * Recalculate dynamic financials for a specific invoice using live records from Supabase:
   * - invoice_lots entries (hammer, buyer's premium, taxes, fees)
   * - invoice_charges (shipping & handling, storage, custom charges)
   * - bidder_deposits (matching paddle/bidder, active only)
   * - recorded payments from invoice notes
   * 
   * Outstanding Balance = Total Charges - Deposits Applied - Successful Payments
   * Updates Supabase invoices table with the calculated total_due, balance, and payment_status.
   */
  public async recalculateInvoiceFinancials(invoiceId: string): Promise<{
    lotSubtotal: number;
    additionalCharges: number;
    shippingFee: number;
    taxAmount: number;
    totalDue: number;
    depositApplied: number;
    depositRemaining: number;
    paymentsReceived: number;
    payments: SettlementPayment[];
    balance: number;
    invoiceStatus: 'Paid' | 'Pending';
  } | null> {
    const client = this.client;
    try {
      const { data: inv, error: invErr } = await client
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .maybeSingle();

      if (invErr || !inv) {
        console.error('[SettlementService] recalculateInvoiceFinancials: Invoice not found', invoiceId);
        return null;
      }

      const lots = await this.fetchLotsForInvoice(invoiceId);
      const lotSubtotal = Math.round(
        lots.reduce((sum, l) => sum + (l.entries || []).reduce((eSum, e) => eSum + (Number(e.amount) || 0), 0), 0) * 100
      ) / 100;

      const charges = await this.fetchChargesForInvoice(invoiceId);
      const additionalCharges = Math.round(
        charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) * 100
      ) / 100;

      const shippingFee = Number(inv.shipping_fee) || 0;
      const taxAmount = Number(inv.tax_amount) || 0;
      const totalDue = Math.round((lotSubtotal + additionalCharges + shippingFee + taxAmount) * 100) / 100;

      let totalDepositAvailable = 0;
      let matchedDepRows: any[] = [];
      try {
        const { data: depRows } = await client
          .from('bidder_deposits')
          .select('id, amount, amount_applied, amount_remaining, status, bid_card_number, bidder_name')
          .eq('auction_id', inv.auction_id)
          .neq('status', 'Refunded');

        if (depRows && depRows.length > 0) {
          const pLower = (inv.paddle_number || '').trim().toLowerCase();
          const bLower = (inv.buyer_name || '').trim().toLowerCase();
          matchedDepRows = depRows.filter((d: any) =>
            (d.bid_card_number && String(d.bid_card_number).trim().toLowerCase() === pLower) ||
            (d.bidder_name && String(d.bidder_name).trim().toLowerCase() === bLower)
          );
          totalDepositAvailable = matchedDepRows.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        }
      } catch (_) {}

      const payments = parsePaymentsFromNotes(inv.notes);
      const isDepositPayment = (p: SettlementPayment) => {
        const m = (p.method || '').toLowerCase();
        return m.includes('deposit') || m.includes('credit');
      };

      const depositPayments = Math.round(
        payments
          .filter(p => (!p.status || p.status === 'Successful' || (p.status as any) === 'Paid') && isDepositPayment(p))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
      ) / 100;

      const externalPayments = Math.round(
        payments
          .filter(p => (!p.status || p.status === 'Successful' || (p.status as any) === 'Paid') && !isDepositPayment(p))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
      ) / 100;

      const initialLotDeposit = Math.round(Math.min(lotSubtotal, totalDepositAvailable) * 100) / 100;
      const depositApplied = Math.round(Math.min(totalDepositAvailable, initialLotDeposit + depositPayments) * 100) / 100;
      const depositRemaining = Math.max(0, Math.round((totalDepositAvailable - depositApplied) * 100) / 100);

      // Sync bidder_deposits table so Bidder Deposits modal & receipts reflect updated amount_applied and amount_remaining
      if (matchedDepRows.length > 0) {
        let remainingToApply = depositApplied;
        for (const depRow of matchedDepRows) {
          const depAmt = Number(depRow.amount) || 0;
          const appliedForThis = Math.round(Math.min(depAmt, Math.max(0, remainingToApply)) * 100) / 100;
          const remainingForThis = Math.round((depAmt - appliedForThis) * 100) / 100;
          const newDepStatus = remainingForThis === 0 ? 'Applied' : 'Collected';

          if (depRow.amount_applied !== appliedForThis || depRow.amount_remaining !== remainingForThis || depRow.status !== newDepStatus) {
            try {
              await client.from('bidder_deposits').update({
                amount_applied: appliedForThis,
                amount_remaining: remainingForThis,
                status: newDepStatus,
                updated_at: new Date().toISOString()
              }).eq('id', depRow.id);
            } catch (_) {}
          }
          remainingToApply = Math.round((remainingToApply - appliedForThis) * 100) / 100;
        }
      }

      const paymentsReceived = externalPayments;
      const rawBal = Math.round((totalDue - depositApplied - paymentsReceived) * 100) / 100;
      const balance = Math.max(0, rawBal);
      const invoiceStatus: 'Paid' | 'Pending' = balance === 0 ? 'Paid' : 'Pending';

      await client.from('invoices').update({
        total_due: totalDue,
        balance,
        payment_status: invoiceStatus,
        updated_at: new Date().toISOString()
      }).eq('id', invoiceId);

      return {
        lotSubtotal,
        additionalCharges,
        shippingFee,
        taxAmount,
        totalDue,
        depositApplied,
        depositRemaining,
        paymentsReceived,
        payments,
        balance,
        invoiceStatus
      };
    } catch (err) {
      console.error('[SettlementService] recalculateInvoiceFinancials error:', err);
      return null;
    }
  }

  /**
   * Record a customer payment in Supabase, saving to invoices.notes and updating balance dynamically.
   */
  public async recordCustomerPayment(
    auctionId: string,
    customerId: string,
    paymentData: {
      amount: number;
      paymentType: string;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    balance: number;
    invoiceStatus: 'Paid' | 'Pending';
    depositApplied?: number;
    depositRemaining?: number;
    paymentsReceived?: number;
    payment?: SettlementPayment;
  }> {
    const client = this.client;
    try {
      const { data: inv, error: fetchErr } = await client
        .from('invoices')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

      if (fetchErr || !inv) {
        throw new Error('Invoice ' + customerId + ' not found');
      }

      const existingPayments = parsePaymentsFromNotes(inv.notes);
      const newPayment: SettlementPayment = {
        id: 'pay-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        amount: Math.round(Number(paymentData.amount) * 100) / 100,
        method: paymentData.paymentType || 'Credit Card',
        date: new Date().toISOString().split('T')[0],
        notes: paymentData.notes || '',
        status: 'Successful'
      };

      const updatedPayments = [...existingPayments, newPayment];
      const serializedNotes = serializePaymentsToNotes(
        updatedPayments,
        '[Payment Cashier] ' + paymentData.paymentType + ': $' + newPayment.amount.toFixed(2) + (paymentData.notes ? ' - ' + paymentData.notes : '')
      );

      await client.from('invoices').update({
        notes: serializedNotes,
        payment_method: paymentData.paymentType,
        payment_date: newPayment.date,
        updated_at: new Date().toISOString()
      }).eq('id', customerId);

      const financials = await this.recalculateInvoiceFinancials(customerId);

      try {
        await client.from('activity_logs').insert([{
          category: 'FINANCE',
          event_action: 'Payment Recorded: $' + newPayment.amount.toFixed(2),
          operator_service: 'AF360 Cashier Desk',
          audit_details: 'Recorded ' + paymentData.paymentType + ' payment of $' + newPayment.amount.toFixed(2) + ' on invoice ' + customerId + '. Remaining balance: $' + (financials?.balance ?? 0).toFixed(2) + '.',
          status: 'SUCCESS'
        }]);
      } catch (_) {}

      return {
        success: true,
        balance: financials?.balance ?? 0,
        invoiceStatus: financials?.invoiceStatus ?? 'Pending',
        depositApplied: financials?.depositApplied,
        depositRemaining: financials?.depositRemaining,
        paymentsReceived: financials?.paymentsReceived,
        payment: newPayment
      };
    } catch (err: any) {
      console.error('[SettlementService] recordCustomerPayment error:', err);
      throw err;
    }
  }

  /**
   * Map a raw invoices DB row to SettlementCustomer, resolving lots and charges.
   */
  private async mapInvoiceRowToCustomer(row: any, userEmailMap?: Map<string, string>): Promise<SettlementCustomer> {
    const lots = await this.fetchLotsForInvoice(row.id);
    const charges = await this.fetchChargesForInvoice(row.id);

    let resolvedEmail = row.buyer_email;
    if ((!resolvedEmail || resolvedEmail.includes('example.com') || resolvedEmail.startsWith('paddle')) && userEmailMap) {
      const paddleKey = (row.paddle_number || '').toLowerCase();
      const numKey = paddleKey.replace('cust-', '');
      const nameKey = (row.buyer_name || '').toLowerCase();
      resolvedEmail = userEmailMap.get(paddleKey) || userEmailMap.get(numKey) || userEmailMap.get(nameKey) || resolvedEmail;
    }

    const lotSubtotal = Math.round(
      lots.reduce((sum, l) => sum + (l.entries || []).reduce((eSum, e) => eSum + (Number(e.amount) || 0), 0), 0) * 100
    ) / 100;

    const additionalCharges = Math.round(
      charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) * 100
    ) / 100;

    const shippingFee = Number(row.shipping_fee) || 0;
    const taxAmount = Number(row.tax_amount) || 0;
    const totalDue = Math.round((lotSubtotal + additionalCharges + shippingFee + taxAmount) * 100) / 100;

    let totalDepositAvailable = 0;
    try {
      const { data: depRows } = await this.client
        .from('bidder_deposits')
        .select('amount, amount_applied, amount_remaining, status, bid_card_number, bidder_name')
        .eq('auction_id', row.auction_id)
        .neq('status', 'Refunded');

      if (depRows && depRows.length > 0) {
        const pLower = (row.paddle_number || '').trim().toLowerCase();
        const bLower = (row.buyer_name || '').trim().toLowerCase();
        const matched = depRows.filter((d: any) => 
          (d.bid_card_number && String(d.bid_card_number).trim().toLowerCase() === pLower) ||
          (d.bidder_name && String(d.bidder_name).trim().toLowerCase() === bLower)
        );
        totalDepositAvailable = matched.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
      }
    } catch (_) {}

    const payments = parsePaymentsFromNotes(row.notes);
    const isDepositPayment = (p: SettlementPayment) => {
      const m = (p.method || '').toLowerCase();
      return m.includes('deposit') || m.includes('credit');
    };

    const depositPayments = Math.round(
      payments
        .filter(p => (!p.status || p.status === 'Successful' || (p.status as string) === 'Paid') && isDepositPayment(p))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
    ) / 100;

    const externalPayments = Math.round(
      payments
        .filter(p => (!p.status || p.status === 'Successful' || (p.status as string) === 'Paid') && !isDepositPayment(p))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
    ) / 100;

    const initialLotDeposit = Math.round(Math.min(lotSubtotal, totalDepositAvailable) * 100) / 100;
    const depositApplied = Math.round(Math.min(totalDepositAvailable, initialLotDeposit + depositPayments) * 100) / 100;
    const depositRemaining = Math.max(0, Math.round((totalDepositAvailable - depositApplied) * 100) / 100);

    const paymentsReceived = externalPayments;
    const rawBalance = Math.round((totalDue - depositApplied - paymentsReceived) * 100) / 100;
    const calculatedBalance = Math.max(0, rawBalance);
    const invoiceStatus = calculatedBalance === 0 ? 'Paid' : 'Pending';

    if (Number(row.balance) !== calculatedBalance || Number(row.total_due) !== totalDue || row.payment_status !== invoiceStatus) {
      try {
        await this.client.from('invoices').update({
          balance: calculatedBalance,
          total_due: totalDue,
          payment_status: invoiceStatus,
          updated_at: new Date().toISOString()
        }).eq('id', row.id);
      } catch (_) {}
    }

    return {
      id: row.id,
      auctionId: row.auction_id,
      bidderNumber: row.paddle_number,
      name: row.buyer_name,
      email: resolvedEmail || undefined,
      isSeller: row.paddle_number === 'HOUSE',
      isCashBuyer: Boolean(row.is_cash_buyer),
      lotCount: Number(row.items_count) || lots.length || 0,
      shippedCount: Number(row.shipped_count) || 0,
      totalLotsCount: Number(row.total_lots_count) || Number(row.items_count) || lots.length || 0,
      totalDue,
      depositApplied,
      depositRemaining,
      paymentsReceived,
      payments,
      balance: calculatedBalance,
      invoiceNumber: row.invoice_number,
      invoiceStatus,
      shippingRequested: Boolean(row.shipping_requested !== false),
      notes: row.notes || undefined,
      lots,
      charges
    };
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Automatically synchronizes Bidder Settlements (invoices + invoice_lots)
   * and Seller Settlements (seller_settlements) in Supabase from all sold lots
   * for a given auction. Accurately deducts bidder deposits and updates balances.
   */
  public async syncSettlementsFromSoldLots(auctionId: string, fallbackAuctionCode?: string): Promise<void> {
    if (!auctionId) return;
    const client = this.client;

    try {
      // 1. Fetch auction to get code if not provided
      let auctionCode = fallbackAuctionCode || '';
      if (!auctionCode) {
        const { data: auc } = await client.from('auctions').select('code').eq('id', auctionId).maybeSingle();
        if (auc && auc.code) {
          auctionCode = auc.code;
        }
      }

      // 2. Fetch all sold lots for this auction
      const { data: soldLots, error: lotsErr } = await client
        .from('lots')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('status', 'sold');

      if (lotsErr) {
        console.error('[SettlementService] syncSettlements lotsErr:', lotsErr.message);
        return;
      }

      // 3. Fetch all bidder deposits for this auction
      const { data: rawDeposits } = await client
        .from('bidder_deposits')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: true });
      const allDeposits = rawDeposits || [];

      // If no sold lots exist, reset all deposits and remove auto-generated records for lots no longer sold
      if (!soldLots || soldLots.length === 0) {
        if (allDeposits && allDeposits.length > 0) {
          for (const dep of allDeposits) {
            if (dep.status !== 'Refunded') {
              if (dep.amount_applied !== 0 || dep.amount_remaining !== dep.amount || dep.status !== 'Collected') {
                await client.from('bidder_deposits').update({
                  amount_applied: 0,
                  amount_remaining: dep.amount,
                  status: 'Collected',
                  updated_at: new Date().toISOString()
                }).eq('id', dep.id);
                dep.amount_applied = 0;
                dep.amount_remaining = dep.amount;
                dep.status = 'Collected';
              }
            }
          }
        }

        const { data: exLots } = await client.from('invoice_lots').select('id').eq('auction_id', auctionId);
        if (exLots && exLots.length > 0) {
          await client.from('invoice_lots').delete().eq('auction_id', auctionId);
          await client.from('invoices').delete().eq('auction_id', auctionId);
          await client.from('seller_settlements').delete().eq('auction_id', auctionId);
        }

        // Sync day_stats deposits
        try {
          const { data: aucRow } = await client.from('auctions').select('day_stats').eq('id', auctionId).maybeSingle();
          if (aucRow && aucRow.day_stats) {
            const dayStats = aucRow.day_stats;
            dayStats.deposits = allDeposits.map((d: any) => ({
              id: d.id,
              auctionId: d.auction_id,
              registrationId: d.registration_id,
              bidCardNumber: d.bid_card_number,
              bidderName: d.bidder_name,
              amount: Number(d.amount) || 0,
              amountApplied: 0,
              amountRemaining: Number(d.amount) || 0,
              paymentMethod: d.payment_method || 'Credit Card',
              status: 'Collected',
              date: d.date || new Date(d.created_at).toISOString().split('T')[0],
              referenceNumber: d.reference_number || '',
              notes: d.notes || '',
              receivedBy: d.received_by || '',
              createdAt: d.created_at
            }));
            await client.from('auctions').update({ day_stats: dayStats, updated_at: new Date().toISOString() }).eq('id', auctionId);
          }
        } catch (_) {}

        return;
      }

      // 4. Fetch users/customers to resolve name, email, paddle
      const { data: usersData } = await client
        .from('users')
        .select('id, full_name, first_name, last_name, email, permanent_bidder_number, customer_code');

      const userByPaddle = new Map<string, any>();
      if (usersData && Array.isArray(usersData)) {
        usersData.forEach((u: any) => {
          if (u.permanent_bidder_number) userByPaddle.set(String(u.permanent_bidder_number).toLowerCase(), u);
          if (u.customer_code) userByPaddle.set(String(u.customer_code).toLowerCase(), u);
          if (u.id) userByPaddle.set(String(u.id).toLowerCase(), u);
        });
      }

      // 5. Fetch bidder registrations for paddle mappings
      const { data: regData } = await client
        .from('bidder_registrations')
        .select('id, bid_card_number, bidder_name, email')
        .eq('auction_id', auctionId);
      const registrations = regData || [];

      // 6. Fetch existing invoices for this auction
      const { data: existingInvoices } = await client
        .from('invoices')
        .select('*')
        .eq('auction_id', auctionId);

      const invoiceByPaddle = new Map<string, any>();
      if (existingInvoices && Array.isArray(existingInvoices)) {
        existingInvoices.forEach((inv: any) => {
          if (inv.paddle_number) {
            invoiceByPaddle.set(String(inv.paddle_number).toLowerCase(), inv);
          }
        });
      }

      // 7. Group sold lots by paddle number
      const lotsByPaddle = new Map<string, any[]>();
      soldLots.forEach((lot: any) => {
        const paddle = String(lot.high_bidder_paddle || '101').trim();
        const list = lotsByPaddle.get(paddle.toLowerCase()) || [];
        list.push(lot);
        lotsByPaddle.set(paddle.toLowerCase(), list);
      });

      // Track deposit IDs applied across this auction
      const appliedDepositIds = new Set<string>();

      // 8. Process Bidder Settlements (Invoices)
      for (const [paddleLower, paddleLots] of lotsByPaddle.entries()) {
        const firstLot = paddleLots[0];
        const paddleRaw = firstLot.high_bidder_paddle || '101';
        const matchedUser = userByPaddle.get(paddleLower);
        const matchedReg = registrations.find((r: any) => String(r.bid_card_number).toLowerCase() === paddleLower);

        const buyerName = firstLot.high_bidder_name?.trim() || matchedReg?.bidder_name?.trim() || matchedUser?.full_name?.trim() || ((matchedUser?.first_name || '') + ' ' + (matchedUser?.last_name || '')).trim() || ('Bidder #' + paddleRaw);
        const buyerEmail = matchedReg?.email || matchedUser?.email || ('paddle' + paddleRaw + '@gardner-auction.com');

        let invoice = invoiceByPaddle.get(paddleLower);
        let invoiceId = invoice?.id;

        if (!invoice) {
          const invoiceNumber = 'INV-GA-' + new Date().getFullYear() + '-' + paddleRaw.replace(/[^a-zA-Z0-9]/g, '');
          invoiceId = 'inv-' + auctionId + '-' + paddleRaw.replace(/[^a-zA-Z0-9_-]/g, '');
        }

        // Upsert lot rows in invoice_lots only if not already existing (preserve refunds/modifications)
        if (invoiceId) {
          for (const lot of paddleLots) {
            const ilotId = 'ilot-' + invoiceId + '-' + lot.id;
            const hammer = Number(lot.hammer_price) || 0;
            const bp = Math.round(hammer * 0.15 * 100) / 100;

            const { data: exLot } = await client
              .from('invoice_lots')
              .select('id')
              .eq('id', ilotId)
              .maybeSingle();

            if (!exLot) {
              await client.from('invoice_lots').insert([{
                id: ilotId,
                invoice_id: invoiceId,
                auction_id: auctionId,
                lot_id: lot.id,
                lot_number: lot.lot_number,
                title: lot.title || ('Lot #' + lot.lot_number),
                status: 'Sold',
                qty_sold: 1,
                is_shipped: false,
                entries: [
                  { id: 'entry-hammer-' + lot.id, type: 'sold_lot', label: 'Sold Lot #' + lot.lot_number, amount: hammer },
                  { id: 'entry-bp-' + lot.id, type: 'buyers_premium', label: "Buyer's Premium (15%)", amount: bp }
                ],
                updated_at: new Date().toISOString()
              }]);
            }
          }
        }

        // Fetch actual lots and charges to calculate accurate subtotal
        const currentLots = invoiceId ? await this.fetchLotsForInvoice(invoiceId) : [];
        const lotSubtotal = Math.round(
          currentLots.reduce((sum, l) => sum + (l.entries || []).reduce((eSum, e) => eSum + (Number(e.amount) || 0), 0), 0) * 100
        ) / 100;

        const currentCharges = invoiceId ? await this.fetchChargesForInvoice(invoiceId) : [];
        const existingChargesTotal = Math.round(
          currentCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) * 100
        ) / 100;

        const hammerSubtotal = paddleLots.reduce((sum: number, l: any) => sum + (Number(l.hammer_price) || 0), 0);
        const buyersPremium = Math.round(hammerSubtotal * 0.15 * 100) / 100;
        const taxAmount = 0;
        const shippingFee = 0;
        const itemsCount = paddleLots.length;
        const totalPurchaseAmount = Math.round((lotSubtotal + existingChargesTotal + taxAmount + shippingFee) * 100) / 100;

        // Find available deposits for this paddle
        const bidderDeposits = allDeposits.filter((d: any) => {
          if (d.status === 'Refunded') return false;
          const depPaddle = String(d.bid_card_number || '').trim().toLowerCase();
          const depName = String(d.bidder_name || '').trim().toLowerCase();
          return depPaddle === paddleLower || (depName && depName === buyerName.toLowerCase());
        });

        const totalDepositAvailable = bidderDeposits.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
        const payments = invoice ? parsePaymentsFromNotes(invoice.notes) : [];
        const isDepPay = (p: SettlementPayment) => {
          const m = (p.method || '').toLowerCase();
          return m.includes('deposit') || m.includes('credit');
        };
        const depositPayments = Math.round(
          payments
            .filter(p => (!p.status || p.status === 'Successful' || (p.status as any) === 'Paid') && isDepPay(p))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
        ) / 100;

        const depositAppliedLimit = Math.round(Math.min(totalDepositAvailable, lotSubtotal + depositPayments) * 100) / 100;

        let depositToApply = depositAppliedLimit;
        let totalDepositApplied = 0;

        for (const dep of bidderDeposits) {
          appliedDepositIds.add(dep.id);
          const depAmount = Number(dep.amount) || 0;
          const canApply = Math.round(Math.min(depAmount, Math.max(0, depositToApply)) * 100) / 100;
          const newRemaining = Math.round((depAmount - canApply) * 100) / 100;
          const newStatus = newRemaining === 0 ? 'Applied' : 'Collected';

          if (dep.amount_applied !== canApply || dep.amount_remaining !== newRemaining || dep.status !== newStatus) {
            await client.from('bidder_deposits').update({
              amount_applied: canApply,
              amount_remaining: newRemaining,
              status: newStatus,
              updated_at: new Date().toISOString()
            }).eq('id', dep.id);

            dep.amount_applied = canApply;
            dep.amount_remaining = newRemaining;
            dep.status = newStatus;
          }

          totalDepositApplied = Math.round((totalDepositApplied + canApply) * 100) / 100;
          depositToApply = Math.round((depositToApply - canApply) * 100) / 100;
        }

        const paymentsReceived = Math.round(
          payments
            .filter(p => (!p.status || p.status === 'Successful' || (p.status as any) === 'Paid') && !isDepPay(p))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
        ) / 100;

        const finalBalance = Math.max(0, Math.round((totalPurchaseAmount - totalDepositApplied - paymentsReceived) * 100) / 100);
        const paymentStatus = finalBalance === 0 ? 'Paid' : (invoice?.payment_status === 'Paid' && finalBalance > 0 ? 'Pending' : (invoice?.payment_status || 'Pending'));
        const depositNote = totalDepositApplied > 0 ? ('Deposit Applied: $' + totalDepositApplied.toFixed(2)) : '';
        const preservedNotes = invoice?.notes ? invoice.notes : depositNote;

        if (!invoice) {
          const invoiceNumber = 'INV-GA-' + new Date().getFullYear() + '-' + paddleRaw.replace(/[^a-zA-Z0-9]/g, '');
          const { data: inserted, error: invErr } = await client.from('invoices').upsert([{
            id: invoiceId,
            invoice_number: invoiceNumber,
            auction_id: auctionId,
            auction_code: auctionCode,
            paddle_number: paddleRaw,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            items_count: itemsCount,
            hammer_subtotal: hammerSubtotal,
            buyers_premium: buyersPremium,
            tax_amount: taxAmount,
            shipping_fee: shippingFee,
            total_due: totalPurchaseAmount,
            balance: finalBalance,
            payment_status: paymentStatus,
            notes: preservedNotes,
            is_cash_buyer: false,
            is_shipped: false,
            shipped_count: 0,
            total_lots_count: itemsCount,
            shipping_requested: true,
            updated_at: new Date().toISOString()
          }], { onConflict: 'id' }).select();

          if (invErr) {
            console.error('[SettlementService] Failed to upsert invoice:', invErr.message);
          } else if (inserted && inserted[0]) {
            invoice = inserted[0];
            invoiceId = inserted[0].id;
            invoiceByPaddle.set(paddleLower, invoice);
          }
        } else {
          await client.from('invoices').update({
            items_count: itemsCount,
            total_lots_count: itemsCount,
            hammer_subtotal: hammerSubtotal,
            buyers_premium: buyersPremium,
            tax_amount: taxAmount,
            total_due: totalPurchaseAmount,
            balance: finalBalance,
            payment_status: paymentStatus,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            updated_at: new Date().toISOString()
          }).eq('id', invoiceId);
        }
      }

      // 9. Reset deposits for bidders in this auction who did not purchase lots
      for (const dep of allDeposits) {
        if (dep.status !== 'Refunded' && !appliedDepositIds.has(dep.id)) {
          if (dep.amount_applied !== 0 || dep.amount_remaining !== dep.amount || dep.status !== 'Collected') {
            await client.from('bidder_deposits').update({
              amount_applied: 0,
              amount_remaining: dep.amount,
              status: 'Collected',
              updated_at: new Date().toISOString()
            }).eq('id', dep.id);
            dep.amount_applied = 0;
            dep.amount_remaining = dep.amount;
            dep.status = 'Collected';
          }
        }
      }

      // 10. Remove orphaned invoices for paddles no longer having sold lots
      if (existingInvoices && existingInvoices.length > 0) {
        for (const inv of existingInvoices) {
          const p = (inv.paddle_number || '').trim().toLowerCase();
          if (!lotsByPaddle.has(p)) {
            await client.from('invoice_lots').delete().eq('invoice_id', inv.id);
            await client.from('invoices').delete().eq('id', inv.id);
          }
        }
      }

      // 11. Sync day_stats deposits in auctions table
      try {
        const { data: aucRow } = await client.from('auctions').select('day_stats').eq('id', auctionId).maybeSingle();
        if (aucRow && aucRow.day_stats) {
          const dayStats = aucRow.day_stats;
          dayStats.deposits = allDeposits.map((d: any) => ({
            id: d.id,
            auctionId: d.auction_id,
            registrationId: d.registration_id,
            bidCardNumber: d.bid_card_number,
            bidderName: d.bidder_name,
            amount: Number(d.amount) || 0,
            amountApplied: Number(d.amount_applied) || 0,
            amountRemaining: Number(d.amount_remaining !== undefined ? d.amount_remaining : ((Number(d.amount) || 0) - (Number(d.amount_applied) || 0))),
            paymentMethod: d.payment_method || 'Credit Card',
            status: d.status || 'Collected',
            date: d.date || new Date(d.created_at).toISOString().split('T')[0],
            referenceNumber: d.reference_number || '',
            notes: d.notes || '',
            receivedBy: d.received_by || '',
            createdAt: d.created_at
          }));
          await client.from('auctions').update({ day_stats: dayStats, updated_at: new Date().toISOString() }).eq('id', auctionId);
        }
      } catch (_) {}

      // 12. Process Seller Settlements (Consignor Statements)
      const lotsByConsignor = new Map<string, any[]>();
      soldLots.forEach((lot: any) => {
        const consignorName = (lot.consignor_name || lot.consignorName || 'House Consignor').trim();
        const list = lotsByConsignor.get(consignorName.toLowerCase()) || [];
        list.push(lot);
        lotsByConsignor.set(consignorName.toLowerCase(), list);
      });

      for (const [consignorLower, cLots] of lotsByConsignor.entries()) {
        const consignorName = cLots[0].consignor_name || cLots[0].consignorName || 'House Consignor';
        const consignorClean = consignorName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8);
        const consignorCode = `CON-${consignorClean.toUpperCase() || '101'}`;

        const totalLotsSold = cLots.length;
        const grossHammer = cLots.reduce((sum: number, l: any) => sum + (Number(l.hammer_price) || 0), 0);
        const commissionRate = 10;
        const commissionAmount = grossHammer * 0.10;
        const photographyFees = 0;
        const netPayout = grossHammer - commissionAmount;
        const sellerSettlementId = `sell-${auctionId}-${consignorClean || 'con'}`;

        await client.from('seller_settlements').upsert([{
          id: sellerSettlementId,
          auction_id: auctionId,
          auction_code: auctionCode,
          consignor_code: consignorCode,
          consignor_name: consignorName,
          total_lots_sold: totalLotsSold,
          gross_hammer: grossHammer,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          photography_fees: photographyFees,
          net_payout: netPayout,
          status: 'Pending Review',
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      }
    } catch (err) {
      console.error('[SettlementService] syncSettlementsFromSoldLots error:', err);
    }
  }

  /**
   * Load Bidder Settlements for the specified auction from Supabase.
   * Returns an empty array (not mock data) if the table has no records.
   */
  public async getBidderSettlements(auctionId: string): Promise<SettlementCustomer[]> {
    try {
      await this.syncSettlementsFromSoldLots(auctionId);
    } catch (syncErr) {
      console.warn('[SettlementService] syncSettlementsFromSoldLots notice in getBidderSettlements:', syncErr);
    }

    const { data, error } = await this.client
      .from('invoices')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SettlementService] Failed to load invoices:', error.message);
      throw new Error(`Failed to load bidder settlements: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    // Query users to map registered emails for bidders without a stored invoice email
    const userEmailMap = new Map<string, string>();
    try {
      const { data: usersData } = await this.client
        .from('users')
        .select('customer_code, full_name, email');
      if (usersData && Array.isArray(usersData)) {
        usersData.forEach((u: any) => {
          if (u.email && !u.email.includes('example.com') && !u.email.startsWith('paddle')) {
            if (u.customer_code) {
              const code = String(u.customer_code).toLowerCase();
              userEmailMap.set(code, u.email);
              userEmailMap.set(code.replace('cust-', ''), u.email);
            }
            if (u.full_name) {
              userEmailMap.set(String(u.full_name).toLowerCase(), u.email);
            }
          }
        });
      }
    } catch (usersErr) {
      console.warn('[SettlementService] Could not preload users table emails:', usersErr);
    }

    // Resolve lots + charges for each invoice in parallel
    const customers = await Promise.all(
      data.map((row: any) => this.mapInvoiceRowToCustomer(row, userEmailMap))
    );

    return customers;
  }

  /**
   * Load Seller Settlements (Consignor Statements) for the specified auction.
   * Returns an empty array if no records exist.
   */
  public async getSellerSettlements(auctionId: string): Promise<ConsignorSettlement[]> {
    try {
      await this.syncSettlementsFromSoldLots(auctionId);
    } catch (syncErr) {
      console.warn('[SettlementService] syncSettlementsFromSoldLots notice in getSellerSettlements:', syncErr);
    }

    const { data, error } = await this.client
      .from('seller_settlements')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SettlementService] Failed to load seller settlements:', error.message);
      throw new Error(`Failed to load seller settlements: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any): ConsignorSettlement => ({
      id: row.id,
      consignorCode: row.consignor_code,
      consignorName: row.consignor_name,
      auctionCode: row.auction_code || '',
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

  /**
   * Create a new invoice record in Supabase.
   * Generates a unique invoice number if not provided.
   */
  public async createInvoice(data: {
    auctionId: string;
    paddleNumber: string;
    buyerName: string;
    buyerEmail?: string;
    auctionCode?: string;
  }): Promise<string> {
    const client = this.client;
    const ts = Date.now().toString().slice(-6);
    const invoiceNumber = `INV-GA-${new Date().getFullYear()}-${ts}`;
    const invoiceId = `inv-${ts}-${Math.random().toString(36).slice(2, 6)}`;

    const { error } = await client.from('invoices').insert([{
      id: invoiceId,
      invoice_number: invoiceNumber,
      auction_id: data.auctionId,
      auction_code: data.auctionCode || '',
      paddle_number: data.paddleNumber,
      buyer_name: data.buyerName,
      buyer_email: data.buyerEmail || null,
      items_count: 0,
      hammer_subtotal: 0,
      buyers_premium: 0,
      tax_amount: 0,
      shipping_fee: 0,
      total_due: 0,
      balance: 0,
      payment_status: 'Pending',
      is_cash_buyer: false,
      is_shipped: false,
      shipped_count: 0,
      total_lots_count: 0,
      shipping_requested: true
    }]);

    if (error) throw new Error(`Failed to create invoice: ${error.message}`);
    return invoiceId;
  }

  /**
   * Toggle Cash Buyer status for a bidder and persist to Supabase.
   */
  public async updateCashBuyer(auctionId: string, customerId: string, isCashBuyer: boolean): Promise<boolean> {
    const { error } = await this.client
      .from('invoices')
      .update({ is_cash_buyer: isCashBuyer, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (error) {
      console.error('[SettlementService] updateCashBuyer failed:', error.message);
      return false;
    }

    try {
      await this.client.from('activity_logs').insert([{
        category: 'SETTLEMENT',
        event_action: `Cash Buyer status updated for invoice ${customerId}`,
        operator_service: 'AF360 Settlement Desk',
        audit_details: `Set isCashBuyer=${isCashBuyer} on invoice ${customerId} (auction ${auctionId}).`,
        status: 'SUCCESS'
      }]);
    } catch (_) {}

    return true;
  }

  /**
   * Batch mark settlements as shipped with carrier and tracking details.
   * Updates invoice_lots shipping flags and creates shipment_records entries.
   */
  public async markBatchShipped(
    auctionId: string,
    customerIds: string[],
    shipmentData?: BatchShipmentData
  ): Promise<boolean> {
    const client = this.client;
    const carrier = shipmentData?.carrier || 'Armored Courier';
    const tracking = shipmentData?.trackingNumber || `TRK-${Date.now().toString().slice(-8)}`;
    const shipDate = shipmentData?.shipDate || new Date().toISOString().split('T')[0];
    const notes = shipmentData?.notes || '';

    // For each invoice, update lot shipping flags and invoice counts
    for (const invoiceId of customerIds) {
      try {
        // 1. Get current invoice lots
        const { data: lots } = await client
          .from('invoice_lots')
          .select('id, qty_sold')
          .eq('invoice_id', invoiceId);

        const totalLots = lots?.length || 1;

        // 2. Mark all invoice_lots as shipped
        if (lots && lots.length > 0) {
          const lotIds = lots.map((l: any) => l.id);
          await client
            .from('invoice_lots')
            .update({ is_shipped: true, updated_at: new Date().toISOString() })
            .in('id', lotIds);

          // 3. Create shipment records for each lot
          const shipmentRows = lots.map((l: any) => ({
            id: `shp-${invoiceId}-${l.id}-${Date.now().toString().slice(-6)}`,
            invoice_id: invoiceId,
            auction_id: auctionId,
            invoice_lot_id: l.id,
            carrier,
            tracking_number: tracking,
            ship_date: shipDate,
            notes,
            status: 'Shipped'
          }));

          await client.from('shipment_records').upsert(shipmentRows, { onConflict: 'id' });
        }

        // 4. Update invoice-level shipped_count + is_shipped
        await client
          .from('invoices')
          .update({
            is_shipped: true,
            shipped_count: totalLots,
            shipping_carrier: carrier,
            tracking_number: tracking,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId);
      } catch (err) {
        console.error(`[SettlementService] markBatchShipped error for ${invoiceId}:`, err);
      }
    }

    try {
      await client.from('activity_logs').insert([{
        category: 'SHIPPING',
        event_action: `Batch Shipment Dispatched (${customerIds.length} orders)`,
        operator_service: 'AF360 Shipping Desk',
        audit_details: `Dispatched ${customerIds.length} settlement orders via ${carrier}. Tracking: ${tracking}.`,
        status: 'SUCCESS'
      }]);
    } catch (_) {}

    return true;
  }

  /**
   * Update invoice payment details and balance; write audit log.
   */
  public async updateInvoice(
    _auctionId: string,
    invoiceId: string,
    updates: {
      paymentStatus: 'Paid' | 'Pending Wire' | 'Card Authorized' | 'Check Received' | 'Unpaid';
      paymentMethod?: string;
      notes?: string;
      shippingFee?: number;
      taxAmount?: number;
      balance?: number;
    }
  ): Promise<boolean> {
    const client = this.client;

    const updateData: Record<string, unknown> = {
      payment_status: updates.paymentStatus,
      updated_at: new Date().toISOString()
    };

    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.shippingFee !== undefined) updateData.shipping_fee = updates.shippingFee;
    if (updates.taxAmount !== undefined) updateData.tax_amount = updates.taxAmount;

    if (updates.balance !== undefined) {
      updateData.balance = Math.max(0, updates.balance);
    } else if (updates.paymentStatus === 'Paid') {
      updateData.balance = 0.00;
    }

    const { error } = await client.from('invoices').update(updateData).eq('id', invoiceId);

    if (error) {
      console.error('[SettlementService] updateInvoice failed:', error.message);
      return false;
    }

    try {
      await client.from('activity_logs').insert([{
        category: 'FINANCE',
        event_action: `Invoice Updated #${invoiceId}`,
        operator_service: 'AF360 Invoice Management',
        audit_details: `Status: ${updates.paymentStatus}, Method: ${updates.paymentMethod || 'N/A'}, Balance: $${
          updates.balance !== undefined ? updates.balance.toFixed(2) : (updates.paymentStatus === 'Paid' ? '0.00' : 'Unchanged')
        }. ${updates.notes || ''}`,
        status: 'SUCCESS'
      }]);
    } catch (_) {}

    return true;
  }

  /**
   * Mark ALL lots in an invoice as shipped and create shipment_records.
   */
  public async markAllShipped(auctionId: string, customerId: string): Promise<boolean> {
    const client = this.client;

    try {
      const { data: lots } = await client
        .from('invoice_lots')
        .select('id, qty_sold')
        .eq('invoice_id', customerId);

      const totalLots = lots?.length || 1;

      if (lots && lots.length > 0) {
        const lotIds = lots.map((l: any) => l.id);

        await client
          .from('invoice_lots')
          .update({ is_shipped: true, updated_at: new Date().toISOString() })
          .in('id', lotIds);

        // Create or update shipment_records
        const shipmentRows = lots.map((l: any) => ({
          id: `shp-${customerId}-${l.id}-all`,
          invoice_id: customerId,
          auction_id: auctionId,
          invoice_lot_id: l.id,
          carrier: 'Saleroom Pickup / Dispatch',
          tracking_number: null,
          ship_date: new Date().toISOString().split('T')[0],
          status: 'Shipped'
        }));

        await client.from('shipment_records').upsert(shipmentRows, { onConflict: 'id' });
      }

      await client
        .from('invoices')
        .update({
          is_shipped: true,
          shipped_count: totalLots,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      await client.from('activity_logs').insert([{
        category: 'SHIPPING',
        event_action: `Order Fully Shipped / Handed Over`,
        operator_service: 'AF360 Shipping Desk',
        audit_details: `Marked all items (${totalLots}) as shipped for invoice ${customerId} (auction ${auctionId}).`,
        status: 'SUCCESS'
      }]);
    } catch (err) {
      console.error('[SettlementService] markAllShipped failed:', err);
      return false;
    }

    return true;
  }

  /**
   * Update an individual lot's shipping status and recalculate invoice shipped_count.
   * Creates or updates the corresponding shipment_record row.
   */
  public async updateLotShipping(
    auctionId: string,
    customerId: string,
    lotId: string,
    isShipped: boolean
  ): Promise<boolean> {
    const client = this.client;

    try {
      // 1. Update invoice_lots row
      await client
        .from('invoice_lots')
        .update({ is_shipped: isShipped, updated_at: new Date().toISOString() })
        .eq('id', lotId);

      // 2. Recalculate shipped_count on invoice
      const { data: allLots } = await client
        .from('invoice_lots')
        .select('id, is_shipped')
        .eq('invoice_id', customerId);

      const shippedCount = (allLots || []).filter((l: any) => l.is_shipped).length;
      const totalCount = (allLots || []).length;

      await client
        .from('invoices')
        .update({
          is_shipped: shippedCount >= totalCount && totalCount > 0,
          shipped_count: shippedCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      // 3. Upsert shipment_record for this lot
      const shipmentId = `shp-${customerId}-${lotId}`;
      if (isShipped) {
        await client.from('shipment_records').upsert([{
          id: shipmentId,
          invoice_id: customerId,
          auction_id: auctionId,
          invoice_lot_id: lotId,
          ship_date: new Date().toISOString().split('T')[0],
          status: 'Shipped',
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      } else {
        await client.from('shipment_records')
          .update({ status: 'Pending', updated_at: new Date().toISOString() })
          .eq('id', shipmentId);
      }

      await client.from('activity_logs').insert([{
        category: 'SHIPPING',
        event_action: `Lot ${lotId} shipping updated to ${isShipped ? 'Shipped' : 'Pending'}`,
        operator_service: 'AF360 Shipping Desk',
        audit_details: `Invoice ${customerId}: ${shippedCount} of ${totalCount} items shipped.`,
        status: 'SUCCESS'
      }]);
    } catch (err) {
      console.error('[SettlementService] updateLotShipping failed:', err);
      return false;
    }

    return true;
  }

  /**
   * Fetch shipment records for an invoice (for the Shipments tab).
   */
  public async getShipmentRecords(invoiceId: string): Promise<ShipmentRecord[]> {
    try {
      const { data, error } = await this.client
        .from('shipment_records')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return data.map((row: any): ShipmentRecord => ({
        id: row.id,
        invoiceId: row.invoice_id,
        auctionId: row.auction_id,
        invoiceLotId: row.invoice_lot_id,
        carrier: row.carrier,
        trackingNumber: row.tracking_number,
        shipDate: row.ship_date,
        shippedBy: row.shipped_by,
        notes: row.notes,
        status: row.status as ShipmentRecord['status']
      }));
    } catch {
      return [];
    }
  }

  /**
   * Add a named auction charge for a customer, persisted to invoice_charges table.
   * Also recalculates and updates the invoice balance and total_due.
   */
  public async addCustomerCharge(
    auctionId: string,
    customerId: string,
    chargeData: Omit<SettlementCharge, 'id' | 'date'>
  ): Promise<SettlementCharge | null> {
    const client = this.client;
    const chargeAmt = Math.max(0, chargeData.amount);
    const chargeId = 'chg-' + customerId + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
    const chargeDate = new Date().toLocaleDateString('en-US');

    try {
      // 1. Insert to invoice_charges
      const { error: insertErr } = await client.from('invoice_charges').insert([{
        id: chargeId,
        invoice_id: customerId,
        auction_id: auctionId,
        account: chargeData.account,
        description: chargeData.description,
        amount: chargeAmt,
        charge_type: chargeData.type || 'buyer',
        charge_date: chargeDate
      }]);

      if (insertErr) {
        console.error('[SettlementService] addCustomerCharge insert failed:', insertErr.message);
        return null;
      }

      // 2. Recalculate invoice financials dynamically
      await this.recalculateInvoiceFinancials(customerId);

      // 3. Audit log
      try {
        await client.from('activity_logs').insert([{
          category: 'FINANCE',
          event_action: 'Charge Added: $' + chargeAmt.toFixed(2),
          operator_service: 'AF360 Ledger Service',
          audit_details: 'Added ' + chargeData.account + ' charge of $' + chargeAmt.toFixed(2) + ' (' + chargeData.description + ') to invoice ' + customerId + '.',
          status: 'SUCCESS'
        }]);
      } catch (_) {}

      return {
        id: chargeId,
        account: chargeData.account,
        description: chargeData.description,
        amount: chargeAmt,
        type: chargeData.type || 'buyer',
        date: chargeDate
      };
    } catch (err) {
      console.error('[SettlementService] addCustomerCharge failed:', err);
      return null;
    }
  }

  public async deleteCustomerCharge(
    auctionId: string,
    customerId: string,
    chargeId: string
  ): Promise<boolean> {
    const client = this.client;

    try {
      // 1. Get charge amount before deleting
      const { data: chg } = await client
        .from('invoice_charges')
        .select('amount')
        .eq('id', chargeId)
        .single();

      const chargeAmt = Number(chg?.amount) || 0;

      // 2. Delete the charge
      const { error } = await client
        .from('invoice_charges')
        .delete()
        .eq('id', chargeId);

      if (error) {
        console.error('[SettlementService] deleteCustomerCharge failed:', error.message);
        return false;
      }

      // 3. Recalculate invoice financials dynamically
      await this.recalculateInvoiceFinancials(customerId);

      // 4. Audit log
      try {
        await client.from('activity_logs').insert([{
          category: 'FINANCE',
          event_action: 'Charge Removed: $' + chargeAmt.toFixed(2),
          operator_service: 'AF360 Ledger Service',
          audit_details: 'Removed charge ' + chargeId + ' ($' + chargeAmt.toFixed(2) + ') from invoice ' + customerId + ' (auction ' + auctionId + ').',
          status: 'SUCCESS'
        }]);
      } catch (_) {}

      return true;
    } catch (err) {
      console.error('[SettlementService] deleteCustomerCharge error:', err);
      return false;
    }
  }

  public async refundLotEntry(
    auctionId: string,
    customerId: string,
    lotId: string,
    entryId: string
  ): Promise<boolean> {
    const client = this.client;

    try {
      // 1. Fetch the lot's current entries
      const { data: lotRow, error: fetchErr } = await client
        .from('invoice_lots')
        .select('entries')
        .eq('id', lotId)
        .single();

      if (fetchErr || !lotRow) {
        console.error('[SettlementService] refundLotEntry: lot not found', lotId);
        return false;
      }

      const entries: any[] = Array.isArray(lotRow.entries) ? lotRow.entries : [];
      const entryToRemove = entries.find((e: any) => e.id === entryId);
      if (!entryToRemove) return false;

      const refundAmt = Number(entryToRemove.amount) || 0;
      const newEntries = entries.filter((e: any) => e.id !== entryId);

      // 2. Update the lot's entries array
      await client
        .from('invoice_lots')
        .update({ entries: newEntries, updated_at: new Date().toISOString() })
        .eq('id', lotId);

      // 3. Recalculate invoice financials dynamically
      await this.recalculateInvoiceFinancials(customerId);

      // 4. Audit log
      try {
        await client.from('activity_logs').insert([{
          category: 'REFUND',
          event_action: 'Lot Entry Refunded: $' + refundAmt.toFixed(2),
          operator_service: 'AF360 Ledger Service',
          audit_details: 'Refunded entry ' + entryId + ' (' + (entryToRemove.label || '') + ') on lot ' + lotId + ' for invoice ' + customerId + ' (auction ' + auctionId + ').',
          status: 'SUCCESS'
        }]);
      } catch (_) {}

      return true;
    } catch (err) {
      console.error('[SettlementService] refundLotEntry error:', err);
      return false;
    }
  }

  public async updateSellerSettlementStatus(
    _auctionId: string,
    settlementId: string,
    status: ConsignorSettlement['status'],
    checkNumber?: string
  ): Promise<boolean> {
    const { error } = await this.client
      .from('seller_settlements')
      .update({
        status,
        check_number: checkNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', settlementId);

    if (error) {
      console.error('[SettlementService] updateSellerSettlementStatus failed:', error.message);
      return false;
    }

    return true;
  }

  /**
   * Batch process credit cards for selected settlements.
   * Updates invoice payment status and logs the batch operation.
   */
  public async batchProcessCreditCards(_auctionId: string, customerIds: string[]): Promise<boolean> {
    const client = this.client;

    for (const invoiceId of customerIds) {
      try {
        await client
          .from('invoices')
          .update({
            payment_status: 'Card Authorized',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId);
      } catch (err) {
        console.error(`[SettlementService] batchProcessCreditCards error for ${invoiceId}:`, err);
      }
    }

    try {
      await client.from('activity_logs').insert([{
        category: 'FINANCE',
        event_action: `Batch Credit Card Processing (${customerIds.length} invoices)`,
        operator_service: 'AF360 Payment Engine',
        audit_details: `Card authorization batch run for ${customerIds.length} settlement(s).`,
        status: 'SUCCESS'
      }]);
    } catch (_) {}

    return true;
  }

  /**
   * Add a lot item (with its breakdown entries) to an invoice.
   * Used when creating/editing invoice lot line items.
   */
  public async addInvoiceLot(
    auctionId: string,
    invoiceId: string,
    lotData: {
      lotId?: string;
      lotNumber: number;
      title: string;
      status?: 'Sold' | 'Unsold' | 'Passed';
      qtySold?: number;
      entries: Array<{ id: string; type: string; label: string; amount: number; isRefundable?: boolean }>;
    }
  ): Promise<SettlementLotItem | null> {
    const client = this.client;
    const lotRowId = `ilot-${invoiceId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

    try {
      const { error } = await client.from('invoice_lots').insert([{
        id: lotRowId,
        invoice_id: invoiceId,
        auction_id: auctionId,
        lot_id: lotData.lotId || null,
        lot_number: lotData.lotNumber,
        title: lotData.title,
        status: lotData.status || 'Sold',
        qty_sold: lotData.qtySold || 1,
        is_shipped: false,
        entries: lotData.entries
      }]);

      if (error) {
        console.error('[SettlementService] addInvoiceLot failed:', error.message);
        return null;
      }

      // Recalculate invoice totals
      const hammerTotal = lotData.entries
        .filter((e: any) => e.type === 'sold_lot')
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      const bpTotal = lotData.entries
        .filter((e: any) => e.type === 'buyers_premium')
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const { data: inv } = await client
        .from('invoices')
        .select('items_count, hammer_subtotal, buyers_premium, total_due, balance')
        .eq('id', invoiceId)
        .single();

      if (inv) {
        const newItems = (Number(inv.items_count) || 0) + (lotData.qtySold || 1);
        const newHammer = (Number(inv.hammer_subtotal) || 0) + hammerTotal;
        const newBp = (Number(inv.buyers_premium) || 0) + bpTotal;
        const newTotal = (Number(inv.total_due) || 0) + hammerTotal + bpTotal;
        const newBalance = (Number(inv.balance) || 0) + hammerTotal + bpTotal;

        await client.from('invoices').update({
          items_count: newItems,
          total_lots_count: newItems,
          hammer_subtotal: newHammer,
          buyers_premium: newBp,
          total_due: newTotal,
          balance: newBalance,
          updated_at: new Date().toISOString()
        }).eq('id', invoiceId);
      }

      return {
        id: lotRowId,
        lotNumber: lotData.lotNumber,
        title: lotData.title,
        status: lotData.status || 'Sold',
        qtySold: lotData.qtySold || 1,
        isShipped: false,
        entries: lotData.entries as any
      };
    } catch (err) {
      console.error('[SettlementService] addInvoiceLot error:', err);
      return null;
    }
  }

  /**
   * Send settlement email through server-side email gateway (/api/settlements/send-email)
   * or Supabase Edge Function with real provider delivery verification.
   */
  public async sendSettlementEmail(payload: SettlementEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.to || !emailRegex.test(payload.to.trim())) {
      return { success: false, error: 'Please enter a valid recipient email address.' };
    }
    if (payload.bcc && payload.bcc.trim() && !emailRegex.test(payload.bcc.trim())) {
      return { success: false, error: 'Please enter a valid BCC email address.' };
    }
    if (!payload.subject || !payload.subject.trim()) {
      return { success: false, error: 'Email subject is required.' };
    }
    if (!payload.body || !payload.body.trim()) {
      return { success: false, error: 'Email body cannot be empty.' };
    }

    // 1. Attempt server-side transactional email endpoint (/api/settlements/send-email)
    try {
      const response = await fetch('/api/settlements/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        return {
          success: true,
          messageId: data.messageId,
          provider: data.provider
        };
      }

      if (data?.error) {
        return {
          success: false,
          error: data.error
        };
      }
    } catch (endpointErr) {
      console.warn('[SettlementService] Local email gateway unreachable, trying Edge Function fallback:', endpointErr);
    }

    // 2. Fallback: Attempt Supabase Edge Function if deployed
    try {
      const { data, error } = await supabase.functions.invoke('auction-edge', {
        body: {
          action: 'send_settlement_email',
          ...payload
        }
      });

      if (!error && data?.success) {
        return {
          success: true,
          messageId: data.messageId
        };
      }

      if (error || data?.error) {
        const edgeError = error?.message || data?.error;
        if (!edgeError.includes('404') && !edgeError.includes('not found')) {
          return { success: false, error: edgeError };
        }
      }
    } catch (_) {}

    // 3. Neither endpoint succeeded: Return actionable error
    return {
      success: false,
      error: 'Email delivery failed: No active email service configured. Please provide RESEND_API_KEY or SMTP credentials (SMTP_USER & SMTP_PASS) in .env to deliver real emails to Gmail.'
    };
  }
}

export const settlementService = new SettlementService();