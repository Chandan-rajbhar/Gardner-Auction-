// ==============================================================================
// Gardner Auction AF360 Administrative Console
// Shared Payment Service: Centralized PayPal & Online Payment Operations
// File: src/services/paymentService.ts
// ==============================================================================

import { supabase, supabaseAdmin } from '../lib/supabase';
import { BidderDeposit, SettlementPayment, SettlementCustomer } from '../types/auctionDetail';
import { settlementService, parsePaymentsFromNotes, serializePaymentsToNotes } from './settlementService';
import { auctionService } from './auctionService';

export const PAYPAL_ME_BASE_URL = 'https://www.paypal.com/paypalme/HighlanderGoldSilver';

export interface PayPalDepositParams {
  auctionId: string;
  registrationId?: string;
  bidCardNumber: string;
  bidderName: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  status?: 'Pending' | 'Collected' | 'Refunded' | 'Failed' | 'Cancelled';
  receivedBy?: string;
  date?: string;
}

export interface PayPalInvoicePaymentParams {
  auctionId: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  referenceNumber: string;
  notes?: string;
  status?: 'Pending' | 'Successful' | 'Failed' | 'Cancelled';
  adminName?: string;
}

export class PaymentService {
  private client = supabaseAdmin || supabase;

  /**
   * Constructs the official PayPal.me payment URL with formatted currency amount.
   */
  public getPayPalPaymentUrl(amount?: number): string {
    if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
      const formatted = amount.toFixed(2);
      return `${PAYPAL_ME_BASE_URL}/${formatted}`;
    }
    return PAYPAL_ME_BASE_URL;
  }

  /**
   * Opens the PayPal payment page in a new secure browser tab.
   */
  public openPayPalPaymentWindow(amount?: number): Window | null {
    const url = this.getPayPalPaymentUrl(amount);
    if (typeof window !== 'undefined') {
      return window.open(url, '_blank', 'noopener,noreferrer');
    }
    return null;
  }

  /**
   * Generates a unique, collision-resistant reference number for transactions.
   */
  public generateReferenceNumber(prefix: 'DEP' | 'INV', identifier: string): string {
    const cleanId = String(identifier || 'CUST').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PP-${prefix}-${cleanId}-${ts}-${rand}`;
  }

  // ============================================================================
  // 1. BIDDER DEPOSITS PAYPAL OPERATIONS
  // ============================================================================

  /**
   * Record a new PayPal Bidder Deposit in Supabase.
   * If status is 'Pending', funds are held in verification queue.
   * If status is 'Collected' (verified), deposit credit is made active.
   */
  public async recordPayPalDeposit(
    params: PayPalDepositParams
  ): Promise<{ success: boolean; deposit?: BidderDeposit; error?: string }> {
    const {
      auctionId,
      registrationId,
      bidCardNumber,
      bidderName,
      amount,
      referenceNumber,
      notes,
      status = 'Pending',
      receivedBy = 'PayPal Online',
      date
    } = params;

    if (!auctionId || !bidCardNumber || !bidderName) {
      return { success: false, error: 'Auction ID, Bidder #, and Bidder Name are required.' };
    }

    const numAmount = Math.round(Number(amount) * 100) / 100;
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Deposit amount must be greater than $0.00.' };
    }

    const ref = (referenceNumber && referenceNumber.trim()) 
      ? referenceNumber.trim() 
      : this.generateReferenceNumber('DEP', bidCardNumber);

    try {
      // 1. Idempotency Check: Prevent duplicate deposit creation
      const { data: existing } = await this.client
        .from('bidder_deposits')
        .select('id, reference_number, amount')
        .eq('auction_id', auctionId)
        .eq('reference_number', ref)
        .maybeSingle();

      if (existing) {
        return { 
          success: false, 
          error: `A deposit with reference "${ref}" has already been recorded ($${Number(existing.amount).toFixed(2)}).` 
        };
      }

      // Map application status to database-supported check constraint ('Pending', 'Collected', 'Refunded', 'Applied')
      let dbStatus: 'Pending' | 'Collected' | 'Refunded' | 'Applied' = 'Pending';
      if (status === 'Collected') {
        dbStatus = 'Collected';
      } else if (status === 'Refunded' || status === 'Cancelled' || status === 'Failed') {
        dbStatus = 'Refunded';
      } else {
        dbStatus = 'Pending';
      }

      const depId = `dep-pp-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const depDate = date || nowIso.split('T')[0];
      const amountApplied = 0;
      const amountRemaining = (dbStatus === 'Collected') ? numAmount : (dbStatus === 'Pending' ? numAmount : 0);

      const structuredNotes = `[PayPal Online Payment] Ref: ${ref} | Status: ${status}${notes ? ` | Notes: ${notes}` : ''}`;

      const newDeposit: BidderDeposit = {
        id: depId,
        auctionId,
        registrationId: registrationId || undefined,
        bidCardNumber,
        bidderName,
        amount: numAmount,
        amountApplied,
        amountRemaining,
        paymentMethod: 'PayPal (Online Payment)',
        status: status,
        date: depDate,
        referenceNumber: ref,
        notes: structuredNotes,
        receivedBy,
        createdAt: nowIso
      };

      // 2. Insert into public.bidder_deposits
      const { error: insErr } = await this.client
        .from('bidder_deposits')
        .insert([{
          id: depId,
          auction_id: auctionId,
          registration_id: registrationId || null,
          bid_card_number: bidCardNumber,
          bidder_name: bidderName,
          amount: numAmount,
          amount_applied: amountApplied,
          amount_remaining: amountRemaining,
          payment_method: 'PayPal (Online Payment)',
          status: dbStatus,
          date: depDate,
          reference_number: ref,
          notes: structuredNotes,
          received_by: receivedBy,
          created_at: nowIso,
          updated_at: nowIso
        }]);

      if (insErr) {
        console.error('[PaymentService] recordPayPalDeposit insert error:', insErr);
        return { success: false, error: insErr.message };
      }

      // 3. Update registration row if linked
      if (registrationId) {
        await this.client
          .from('bidder_registrations')
          .update({
            deposit_amount: numAmount,
            deposit_status: dbStatus,
            updated_at: nowIso
          })
          .eq('id', registrationId);
      }

      // 4. Synchronize with auction.dayStats JSONB
      try {
        const auction = await auctionService.getAuctionById(auctionId);
        if (auction && auction.dayStats) {
          const currentDeps = (auction.dayStats.deposits || []).filter((d: any) => d.id !== depId);
          auction.dayStats.deposits = [newDeposit, ...currentDeps];
          await this.client
            .from('auctions')
            .update({ day_stats: auction.dayStats, updated_at: nowIso })
            .eq('id', auctionId);
        }
      } catch (_) {}

      // 5. If verified immediately as 'Collected', sync invoice deposit balances
      if (dbStatus === 'Collected') {
        try {
          await settlementService.syncSettlementsFromSoldLots(auctionId);
        } catch (_) {}
      }

      // 6. Audit Trail Logging
      try {
        await this.client.from('activity_logs').insert([{
          category: 'FINANCE',
          event_action: `PayPal Deposit Recorded: $${numAmount.toFixed(2)} (${status})`,
          operator_service: 'AF360 Cashier Desk',
          audit_details: `Logged PayPal deposit of $${numAmount.toFixed(2)} for Bidder #${bidCardNumber} (${bidderName}). Status: ${status}. Reference: ${ref}.`,
          status: status === 'Pending' ? 'PENDING' : 'SUCCESS'
        }]);
      } catch (_) {}

      return { success: true, deposit: newDeposit };
    } catch (err: any) {
      console.error('[PaymentService] recordPayPalDeposit unexpected error:', err);
      return { success: false, error: err?.message || 'Failed to record PayPal deposit.' };
    }
  }

  /**
   * Manually verify a Pending PayPal deposit and activate its deposit credit.
   */
  public async verifyPayPalDeposit(
    auctionId: string,
    depositId: string,
    verifierName: string = 'Authorized Admin'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: dep, error: fetchErr } = await this.client
        .from('bidder_deposits')
        .select('*')
        .eq('id', depositId)
        .maybeSingle();

      if (fetchErr || !dep) {
        return { success: false, error: 'Deposit record not found.' };
      }

      const nowIso = new Date().toISOString();
      const amount = Number(dep.amount) || 0;
      const applied = Number(dep.amount_applied) || 0;
      const remaining = Math.max(0, amount - applied);
      const updatedNotes = `${dep.notes || ''}\n[Verified by ${verifierName} at ${nowIso}]`.trim();

      const { error: updErr } = await this.client
        .from('bidder_deposits')
        .update({
          status: 'Collected',
          amount_remaining: remaining,
          notes: updatedNotes,
          received_by: verifierName,
          updated_at: nowIso
        })
        .eq('id', depositId);

      if (updErr) {
        return { success: false, error: updErr.message };
      }

      // Sync auction dayStats
      try {
        const auction = await auctionService.getAuctionById(auctionId);
        if (auction && auction.dayStats?.deposits) {
          auction.dayStats.deposits = auction.dayStats.deposits.map((d: any) =>
            d.id === depositId
              ? { ...d, status: 'Collected', amountRemaining: remaining, notes: updatedNotes, receivedBy: verifierName }
              : d
          );
          await this.client
            .from('auctions')
            .update({ day_stats: auction.dayStats, updated_at: nowIso })
            .eq('id', auctionId);
        }
      } catch (_) {}

      // Synchronize settlements so invoice balances immediately recognize the new deposit credit
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      // Log verification
      try {
        await this.client.from('activity_logs').insert([{
          category: 'FINANCE',
          event_action: `PayPal Deposit Verified: $${amount.toFixed(2)}`,
          operator_service: 'AF360 Cashier Desk',
          audit_details: `Admin ${verifierName} verified PayPal deposit #${depositId} ($${amount.toFixed(2)}) for Bidder #${dep.bid_card_number} (${dep.bidder_name}). Funds marked Collected.`,
          status: 'SUCCESS'
        }]);
      } catch (_) {}

      return { success: true };
    } catch (err: any) {
      console.error('[PaymentService] verifyPayPalDeposit error:', err);
      return { success: false, error: err?.message || 'Failed to verify deposit.' };
    }
  }

  /**
   * Cancel or reject a PayPal deposit (cannot be done if funds have been applied to invoices).
   */
  public async cancelPayPalDeposit(
    auctionId: string,
    depositId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: dep, error: fetchErr } = await this.client
        .from('bidder_deposits')
        .select('*')
        .eq('id', depositId)
        .maybeSingle();

      if (fetchErr || !dep) {
        return { success: false, error: 'Deposit record not found.' };
      }

      if ((Number(dep.amount_applied) || 0) > 0) {
        return {
          success: false,
          error: `Cannot cancel deposit: $${Number(dep.amount_applied).toFixed(2)} has already been applied to an invoice.`
        };
      }

      const nowIso = new Date().toISOString();
      const updatedNotes = `${dep.notes || ''}\n[Cancelled/Rejected: ${reason || 'Admin action'} at ${nowIso}]`.trim();

      const { error: updErr } = await this.client
        .from('bidder_deposits')
        .update({
          status: 'Refunded',
          amount_remaining: 0,
          notes: updatedNotes,
          updated_at: nowIso
        })
        .eq('id', depositId);

      if (updErr) {
        return { success: false, error: updErr.message };
      }

      // Sync auction dayStats
      try {
        const auction = await auctionService.getAuctionById(auctionId);
        if (auction && auction.dayStats?.deposits) {
          auction.dayStats.deposits = auction.dayStats.deposits.map((d: any) =>
            d.id === depositId ? { ...d, status: 'Refunded', amountRemaining: 0, notes: updatedNotes } : d
          );
          await this.client
            .from('auctions')
            .update({ day_stats: auction.dayStats, updated_at: nowIso })
            .eq('id', auctionId);
        }
      } catch (_) {}

      // Synchronize settlements
      try {
        await settlementService.syncSettlementsFromSoldLots(auctionId);
      } catch (_) {}

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to cancel deposit.' };
    }
  }

  // ============================================================================
  // 2. SETTLEMENT & INVOICES PAYPAL OPERATIONS
  // ============================================================================

  /**
   * Record a PayPal invoice payment on an existing settlement invoice.
   * Supports both Pending (waiting for admin check) and Successful (verified) payments.
   * Fully recalculates customer balance, payment status, and ledger.
   */
  public async recordInvoicePayPalPayment(
    params: PayPalInvoicePaymentParams
  ): Promise<{
    success: boolean;
    balance: number;
    invoiceStatus: 'Paid' | 'Pending';
    depositApplied?: number;
    depositRemaining?: number;
    paymentsReceived?: number;
    payment?: SettlementPayment;
    error?: string;
  }> {
    const {
      auctionId,
      invoiceId,
      customerId,
      amount,
      referenceNumber,
      notes = '',
      status = 'Pending',
      adminName = 'Cashier Desk'
    } = params;

    const numAmount = Math.round(Number(amount) * 100) / 100;
    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        success: false,
        balance: 0,
        invoiceStatus: 'Pending',
        error: 'Payment amount must be greater than $0.00.'
      };
    }

    try {
      // 1. Fetch current invoice
      const targetId = invoiceId || customerId;
      const { data: inv, error: fetchErr } = await this.client
        .from('invoices')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (fetchErr || !inv) {
        return {
          success: false,
          balance: 0,
          invoiceStatus: 'Pending',
          error: `Invoice "${targetId}" not found.`
        };
      }

      // 2. Check for duplicate reference
      const existingPayments = parsePaymentsFromNotes(inv.notes);
      const isDuplicate = existingPayments.some(
        p => p.referenceNumber === referenceNumber || (p.notes && p.notes.includes(referenceNumber))
      );

      if (isDuplicate) {
        return {
          success: false,
          balance: Number(inv.balance) || 0,
          invoiceStatus: inv.payment_status === 'Paid' ? 'Paid' : 'Pending',
          error: `Payment with reference "${referenceNumber}" has already been processed on this invoice.`
        };
      }

      // 3. Create SettlementPayment entry
      const nowIso = new Date().toISOString();
      const paymentDate = nowIso.split('T')[0];
      const newPayment: SettlementPayment = {
        id: `pay-pp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount: numAmount,
        method: 'PayPal (Online Payment)',
        date: paymentDate,
        notes: notes ? `${notes} [Ref: ${referenceNumber}]` : `PayPal.me [Ref: ${referenceNumber}]`,
        status: status,
        referenceNumber
      };

      const updatedPayments = [...existingPayments, newPayment];
      const serializedNotes = serializePaymentsToNotes(
        updatedPayments,
        `[PayPal Online Payment] $${numAmount.toFixed(2)} | Ref: ${referenceNumber} | Status: ${status} (${adminName})`
      );

      // 4. Update invoice notes and basic payment info
      await this.client
        .from('invoices')
        .update({
          notes: serializedNotes,
          payment_method: 'PayPal (Online Payment)',
          payment_date: paymentDate,
          updated_at: nowIso
        })
        .eq('id', inv.id);

      // 5. Recalculate invoice financials
      // If status is 'Successful', the payment will reduce customer balance.
      // If status is 'Pending', balance remains intact until verified.
      const financials = await settlementService.recalculateInvoiceFinancials(inv.id);

      // 6. Log to activity_logs
      try {
        await this.client.from('activity_logs').insert([{
          category: 'FINANCE',
          event_action: `PayPal Invoice Payment Recorded: $${numAmount.toFixed(2)} (${status})`,
          operator_service: 'AF360 Cashier Desk',
          audit_details: `Recorded PayPal payment of $${numAmount.toFixed(2)} for ${inv.buyer_name} (Paddle #${inv.paddle_number}) on invoice ${inv.invoice_number}. Status: ${status}. Ref: ${referenceNumber}. Balance: $${(financials?.balance ?? inv.balance).toFixed(2)}.`,
          status: status === 'Pending' ? 'PENDING' : 'SUCCESS'
        }]);
      } catch (_) {}

      return {
        success: true,
        balance: financials?.balance ?? (Number(inv.balance) || 0),
        invoiceStatus: financials?.invoiceStatus ?? (inv.payment_status === 'Paid' ? 'Paid' : 'Pending'),
        depositApplied: financials?.depositApplied,
        depositRemaining: financials?.depositRemaining,
        paymentsReceived: financials?.paymentsReceived,
        payment: newPayment
      };
    } catch (err: any) {
      console.error('[PaymentService] recordInvoicePayPalPayment error:', err);
      return {
        success: false,
        balance: 0,
        invoiceStatus: 'Pending',
        error: err?.message || 'Failed to record PayPal invoice payment.'
      };
    }
  }

  /**
   * Manually verify a Pending payment on an invoice, updating status to Successful
   * and immediately deducting the amount from the customer balance.
   */
  public async verifyInvoicePayment(
    invoiceId: string,
    paymentId: string,
    verifierName: string = 'Authorized Admin'
  ): Promise<{
    success: boolean;
    balance: number;
    invoiceStatus: 'Paid' | 'Pending';
    paymentsReceived?: number;
    error?: string;
  }> {
    try {
      const { data: inv, error: fetchErr } = await this.client
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .maybeSingle();

      if (fetchErr || !inv) {
        return { success: false, balance: 0, invoiceStatus: 'Pending', error: 'Invoice not found.' };
      }

      const payments = parsePaymentsFromNotes(inv.notes);
      let targetPayment: SettlementPayment | undefined;

      const updatedPayments = payments.map(p => {
        if (p.id === paymentId) {
          targetPayment = {
            ...p,
            status: 'Successful',
            notes: `${p.notes || ''} [Verified by ${verifierName} at ${new Date().toISOString()}]`.trim()
          };
          return targetPayment;
        }
        return p;
      });

      if (!targetPayment) {
        return { success: false, balance: Number(inv.balance) || 0, invoiceStatus: 'Pending', error: 'Payment record not found.' };
      }

      const serializedNotes = serializePaymentsToNotes(
        updatedPayments,
        `[Payment Verified] ${targetPayment.method}: $${targetPayment.amount.toFixed(2)} by ${verifierName}`
      );

      await this.client
        .from('invoices')
        .update({
          notes: serializedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      // Recalculate invoice financials with the newly verified payment
      const financials = await settlementService.recalculateInvoiceFinancials(invoiceId);

      // Log verification
      try {
        await this.client.from('activity_logs').insert([{
          category: 'FINANCE',
          event_action: `PayPal Payment Verified: $${targetPayment.amount.toFixed(2)}`,
          operator_service: 'AF360 Cashier Desk',
          audit_details: `Admin ${verifierName} verified payment ${paymentId} ($${targetPayment.amount.toFixed(2)}) on invoice ${inv.invoice_number}. New balance: $${(financials?.balance ?? 0).toFixed(2)}.`,
          status: 'SUCCESS'
        }]);
      } catch (_) {}

      return {
        success: true,
        balance: financials?.balance ?? 0,
        invoiceStatus: financials?.invoiceStatus ?? 'Pending',
        paymentsReceived: financials?.paymentsReceived
      };
    } catch (err: any) {
      console.error('[PaymentService] verifyInvoicePayment error:', err);
      return { success: false, balance: 0, invoiceStatus: 'Pending', error: err?.message || 'Failed to verify payment.' };
    }
  }

  /**
   * Cancel or mark an invoice payment as Failed or Cancelled.
   */
  public async cancelInvoicePayment(
    invoiceId: string,
    paymentId: string,
    reason: string = 'Cancelled by Admin'
  ): Promise<{
    success: boolean;
    balance: number;
    invoiceStatus: 'Paid' | 'Pending';
    error?: string;
  }> {
    try {
      const { data: inv, error: fetchErr } = await this.client
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .maybeSingle();

      if (fetchErr || !inv) {
        return { success: false, balance: 0, invoiceStatus: 'Pending', error: 'Invoice not found.' };
      }

      const payments = parsePaymentsFromNotes(inv.notes);
      const updatedPayments = payments.map(p => {
        if (p.id === paymentId) {
          return {
            ...p,
            status: 'Cancelled' as const,
            notes: `${p.notes || ''} [Cancelled: ${reason}]`.trim()
          };
        }
        return p;
      });

      const serializedNotes = serializePaymentsToNotes(
        updatedPayments,
        `[Payment Cancelled] Payment ${paymentId} cancelled: ${reason}`
      );

      await this.client
        .from('invoices')
        .update({
          notes: serializedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      const financials = await settlementService.recalculateInvoiceFinancials(invoiceId);

      return {
        success: true,
        balance: financials?.balance ?? (Number(inv.balance) || 0),
        invoiceStatus: financials?.invoiceStatus ?? 'Pending'
      };
    } catch (err: any) {
      return { success: false, balance: 0, invoiceStatus: 'Pending', error: err?.message || 'Failed to cancel payment.' };
    }
  }
}

export const paymentService = new PaymentService();
