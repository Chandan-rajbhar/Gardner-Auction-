import { LiveBid } from '../types';
import { formatCurrency } from './formatters';

export type ClerkingState = 'READY' | 'LIVE' | 'GOING_ONCE' | 'GOING_TWICE' | 'PAUSED' | 'SOLD' | 'UNSOLD';

/**
 * Standard premier auction tiered increment ladder (Gardner Auction & AF360 standard)
 */
export function getStandardBidIncrement(currentBid: number): number {
  if (currentBid <= 0) return 500;
  if (currentBid < 500) return 25;
  if (currentBid < 1000) return 50;
  if (currentBid < 2000) return 100;
  if (currentBid < 5000) return 250;
  if (currentBid < 10000) return 500;
  if (currentBid < 25000) return 1000;
  if (currentBid < 50000) return 2500;
  if (currentBid < 100000) return 5000;
  if (currentBid < 250000) return 10000;
  return 25000;
}

/**
 * Computes the minimum acceptable next bid
 */
export function getNextValidBid(currentBid: number): number {
  return currentBid + getStandardBidIncrement(currentBid);
}

/**
 * Generates quick dynamic increments based on current bid level
 */
export function getQuickIncrementOptions(currentBid: number): Array<{
  increment: number;
  label: string;
  source: LiveBid['source'];
  sublabel: string;
}> {
  const step = getStandardBidIncrement(currentBid);
  const step2 = step * 2;
  const step5 = step >= 5000 ? step * 2.5 : step * 5;

  return [
    {
      increment: step,
      label: `+${formatCurrency(step)}`,
      source: 'Floor',
      sublabel: 'Floor Gavel (1x Step)'
    },
    {
      increment: step2,
      label: `+${formatCurrency(step2)}`,
      source: 'HiBid Online',
      sublabel: 'HiBid Web (2x Step)'
    },
    {
      increment: step5,
      label: `+${formatCurrency(step5)}`,
      source: 'Phone',
      sublabel: 'Phone Desk (Jump)'
    }
  ];
}

/**
 * Calculate reserve status for a lot
 */
export function calculateReserveStatus(currentBid: number, reservePrice?: number): {
  status: 'met' | 'not_met' | 'not_set';
  label: string;
  reservePrice: number;
  diff: number;
} {
  if (reservePrice === undefined || reservePrice === null || reservePrice <= 0) {
    return {
      status: 'not_set',
      label: 'Reserve Not Set',
      reservePrice: 0,
      diff: 0
    };
  }

  if (currentBid >= reservePrice) {
    return {
      status: 'met',
      label: 'Reserve Met',
      reservePrice,
      diff: 0
    };
  }

  const diff = reservePrice - currentBid;
  return {
    status: 'not_met',
    label: `Reserve Not Met (${formatCurrency(diff)} to go)`,
    reservePrice,
    diff
  };
}

/**
 * Validates a proposed bid against all rules
 */
export function validateProposedBid(params: {
  proposedBid: number;
  currentBid: number;
  clerkingState: ClerkingState;
  selectedPaddle: string;
  currentHighPaddle?: string | null;
  bidderLimit?: number;
  bidderName?: string;
}): { isValid: boolean; error?: string } {
  const { 
    proposedBid, 
    currentBid, 
    clerkingState, 
    selectedPaddle, 
    currentHighPaddle, 
    bidderLimit,
    bidderName
  } = params;

  // 1. Check clerking lifecycle state
  if (clerkingState === 'PAUSED') {
    return { isValid: false, error: 'Auction is PAUSED. Resume rostrum calling before accepting bids.' };
  }
  if (clerkingState === 'SOLD') {
    return { isValid: false, error: 'Lot is already SOLD (Hammer Down). New bids are closed.' };
  }
  if (clerkingState === 'UNSOLD') {
    return { isValid: false, error: 'Lot is marked UNSOLD / PASSED. Reopen lot to resume bidding.' };
  }

  // 2. Amount numeric sanity
  if (!proposedBid || isNaN(proposedBid) || proposedBid <= 0) {
    return { isValid: false, error: 'Please enter a valid positive bid amount.' };
  }

  // 3. Minimum bid increment rule
  const minValid = getNextValidBid(currentBid);
  if (proposedBid < minValid) {
    return { 
      isValid: false, 
      error: `Proposed bid of ${formatCurrency(proposedBid)} is below the minimum acceptable bid of ${formatCurrency(minValid)} (minimum increment: ${formatCurrency(getStandardBidIncrement(currentBid))}).` 
    };
  }

  // 4. Duplicate bid from same paddle holding high bid
  if (currentHighPaddle && currentHighPaddle === selectedPaddle) {
    return { 
      isValid: false, 
      error: `Paddle #${selectedPaddle} (${bidderName || 'Selected Bidder'}) already holds the current winning bid of ${formatCurrency(currentBid)}.` 
    };
  }

  // 5. Bidder Limit validation
  if (bidderLimit && bidderLimit > 0 && proposedBid > bidderLimit) {
    return { 
      isValid: false, 
      error: `Bid of ${formatCurrency(proposedBid)} exceeds approved bidding limit of ${formatCurrency(bidderLimit)} for Paddle #${selectedPaddle} (${bidderName || 'Bidder'}).` 
    };
  }

  return { isValid: true };
}
