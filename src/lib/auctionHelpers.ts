/**
 * Shared Auction & Lot Data Helpers for Gardner Auction
 * Provides consistent status filtering, currency formatting, date parsing,
 * and realization calculations between Current Auctions and Past Auctions.
 */

export function isConcludedAuction(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === 'concluded' ||
    s === 'closed' ||
    s === 'ended' ||
    s === 'past' ||
    s === 'past auction' ||
    s === 'completed'
  );
}

export function isCurrentAuction(status?: string): boolean {
  if (!status) return true;
  return !isConcludedAuction(status);
}

export function isCompletedLot(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === 'sold' || s === 'closed' || s === 'completed' || s === 'awarded';
}

export function isEligibleBiddingLot(status?: string): boolean {
  return !isCompletedLot(status);
}

/**
 * Cleanly format auction date ranges
 */
export function formatAuctionDates(start?: string, end?: string): string {
  if (!start && !end) return '';
  try {
    const sDate = start ? new Date(start) : null;
    const eDate = end ? new Date(end) : null;
    const sStr = sDate && !isNaN(sDate.getTime())
      ? sDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
      : (start || '');
    const eStr = eDate && !isNaN(eDate.getTime())
      ? eDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
      : (end || '');
    if (sStr && eStr) return `Date(s) ${sStr} - ${eStr}`;
    return sStr || eStr || '';
  } catch {
    return `Date(s) ${start || ''} - ${end || ''}`;
  }
}

/**
 * Format currency string cleanly
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return '$0.00';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Calculate the Total Realized for an auction from Supabase records
 * Prioritizes invoices total_due / hammer_subtotal, then seller settlements gross_hammer,
 * then sums hammer_price or current_bid of sold lots (+15% buyer's premium).
 */
export function calculateAuctionTotalRealized(
  auctionId: string,
  lots: any[],
  invoices: any[] = [],
  settlements: any[] = []
): string {
  // 1. Try Invoices first
  const matchingInvoices = invoices.filter(
    (inv) => inv.auction_id === auctionId || inv.auction_code === auctionId
  );
  if (matchingInvoices.length > 0) {
    const totalDue = matchingInvoices.reduce((sum, inv) => {
      const amt = Number(inv.total_due) || (Number(inv.hammer_subtotal || 0) + Number(inv.buyers_premium || 0));
      return sum + amt;
    }, 0);
    if (totalDue > 0) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: totalDue % 1 === 0 ? 0 : 2
      }).format(totalDue);
    }
  }

  // 2. Try Seller Settlements
  const matchingSettlements = settlements.filter(
    (s) => s.auction_id === auctionId || s.auction_code === auctionId
  );
  if (matchingSettlements.length > 0) {
    const grossHammer = matchingSettlements.reduce((sum, s) => sum + (Number(s.gross_hammer) || 0), 0);
    if (grossHammer > 0) {
      // Add standard 15% Buyer's Premium
      const totalWithBP = grossHammer * 1.15;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: totalWithBP % 1 === 0 ? 0 : 2
      }).format(totalWithBP);
    }
  }

  // 3. Fallback: Sum sold lots directly
  const soldLots = lots.filter(
    (l) => (l.auction_id === auctionId) && isCompletedLot(l.status)
  );
  if (soldLots.length > 0) {
    const hammerSum = soldLots.reduce((sum, l) => {
      const price = Number(l.hammer_price) || Number(l.sold_price) || Number(l.current_bid) || 0;
      return sum + price;
    }, 0);
    if (hammerSum > 0) {
      const totalWithBP = hammerSum * 1.15;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: totalWithBP % 1 === 0 ? 0 : 2
      }).format(totalWithBP);
    }
  }

  return '$0';
}

