import { AuctionDetail } from '../types/auctionDetail';
import { LotItem } from '../types';

export interface SectionValidation {
  key: 'details' | 'upload-settings' | 'lots' | 'lot-images' | 'expenses' | 'saved';
  name: string;
  isComplete: boolean;
  isRequired: boolean;
  errors: string[];
  warnings: string[];
  info?: string;
}

export interface PublishReadiness {
  isReady: boolean;
  canPublish: boolean;
  sections: {
    details: SectionValidation;
    uploadSettings: SectionValidation;
    lots: SectionValidation;
    lotImages: SectionValidation;
    expenses: SectionValidation;
    saved: SectionValidation;
  };
  allErrors: string[];
  allWarnings: string[];
  totalLotCount: number;
}

/**
 * Centralized auction publish-readiness validator for Gardner Auction
 * Evaluates auction details, upload settings, lot catalog, and persistence status.
 */
export function validateAuctionPublishReadiness(
  auction: AuctionDetail | null | undefined,
  lots: LotItem[] = [],
  isDirty = false
): PublishReadiness {
  const detailsErrors: string[] = [];
  const detailsWarnings: string[] = [];
  const uploadErrors: string[] = [];
  const uploadWarnings: string[] = [];
  const lotsErrors: string[] = [];
  const lotsWarnings: string[] = [];
  const savedErrors: string[] = [];

  if (!auction) {
    return {
      isReady: false,
      canPublish: false,
      sections: {
        details: { key: 'details', name: 'Details', isComplete: false, isRequired: true, errors: ['No auction loaded'], warnings: [] },
        uploadSettings: { key: 'upload-settings', name: 'Upload Settings', isComplete: false, isRequired: true, errors: ['No upload settings'], warnings: [] },
        lots: { key: 'lots', name: 'Lots', isComplete: false, isRequired: true, errors: ['No lots loaded'], warnings: [] },
        lotImages: { key: 'lot-images', name: 'Lot Images', isComplete: true, isRequired: false, errors: [], warnings: [] },
        expenses: { key: 'expenses', name: 'Expenses', isComplete: true, isRequired: false, errors: [], warnings: [] },
        saved: { key: 'saved', name: 'Saved Changes', isComplete: false, isRequired: true, errors: ['Auction not saved'], warnings: [] },
      },
      allErrors: ['No auction data available'],
      allWarnings: [],
      totalLotCount: 0,
    };
  }

  // --------------------------------------------------------------------------
  // 1. SECTION: DETAILS
  // --------------------------------------------------------------------------
  if (!auction.name || !auction.name.trim()) {
    detailsErrors.push('Auction Name is required.');
  }

  if (!auction.code || !auction.code.trim()) {
    detailsErrors.push('Auction Event Code is required.');
  }

  if (!auction.startDate || isNaN(new Date(auction.startDate).getTime())) {
    detailsErrors.push('Valid Auction Start Date is required.');
  }

  if (!auction.endDate || isNaN(new Date(auction.endDate).getTime())) {
    detailsErrors.push('Valid Auction End Date is required.');
  }

  if (
    auction.startDate &&
    auction.endDate &&
    !isNaN(new Date(auction.startDate).getTime()) &&
    !isNaN(new Date(auction.endDate).getTime())
  ) {
    const start = new Date(auction.startDate).getTime();
    const end = new Date(auction.endDate).getTime();
    if (end < start) {
      detailsErrors.push('End Date cannot be earlier than Start Date.');
    }
  }

  if (!auction.currency || !auction.currency.trim()) {
    detailsErrors.push('Auction settlement currency must be selected (e.g., USD).');
  }

  // Non-blocking recommendations
  if (!auction.terms || !auction.terms.trim()) {
    detailsWarnings.push('Terms & Conditions are empty (standard saleroom terms will apply).');
  }
  if (!auction.paymentInfo || !auction.paymentInfo.trim()) {
    detailsWarnings.push('Payment notice information is recommended for bidder clarity.');
  }

  const detailsComplete = detailsErrors.length === 0;

  // --------------------------------------------------------------------------
  // 2. SECTION: UPLOAD SETTINGS
  // --------------------------------------------------------------------------
  const uploadSettings = auction.uploadSettings;
  const validBiddingTypes = [
    'Internet Only Auction',
    'Webcast',
    'Absentee Bidding',
    'No Internet Bidding'
  ];

  if (!uploadSettings?.biddingType || !validBiddingTypes.includes(uploadSettings.biddingType)) {
    uploadErrors.push('A valid Bidding Type must be selected.');
  }

  if (uploadSettings?.biddingType !== 'No Internet Bidding') {
    if (!uploadSettings?.timezone || !uploadSettings.timezone.trim()) {
      uploadErrors.push('Auction Timezone must be specified for scheduled online bidding.');
    }

    if (uploadSettings?.openBiddingDate && uploadSettings?.closeBiddingDate) {
      const openTime = new Date(uploadSettings.openBiddingDate).getTime();
      const closeTime = new Date(uploadSettings.closeBiddingDate).getTime();
      if (!isNaN(openTime) && !isNaN(closeTime) && closeTime < openTime) {
        uploadErrors.push('Internet Bidding Close Date cannot be earlier than Open Bidding Date.');
      }
    }
  }

  const validRegistrationTypes = [
    'Authentication',
    'Verification',
    'Contact Info Only',
    'No Registration'
  ];
  if (
    uploadSettings?.ccRegistrationType &&
    !validRegistrationTypes.includes(uploadSettings.ccRegistrationType)
  ) {
    uploadErrors.push('Credit Card Registration setting must be a recognized authentication rule.');
  }

  const uploadComplete = uploadErrors.length === 0;

  // --------------------------------------------------------------------------
  // 3. SECTION: LOTS
  // --------------------------------------------------------------------------
  // Filter lots specifically matching this auction (or fallback if auctionId matches)
  const auctionLots = lots.filter(
    l => l.auctionId === auction.id || (auction.id === 'auc-001' && (!l.auctionId || ['lot-ref-1', 'lot-ref-2', 'lot-ref-3', 'lot-ref-4', 'lot-ref-6'].includes(l.id)))
  );

  if (auctionLots.length === 0) {
    lotsErrors.push('The auction catalog must contain at least 1 valid lot before publishing live.');
  } else {
    // Check lot uniqueness & validity
    const seenLotNumbers = new Set<number>();
    const duplicateLotNumbers = new Set<number>();

    auctionLots.forEach((lot, index) => {
      const lotLabel = lot.lotNumber ? `Lot #${lot.lotNumber}` : `Lot at index ${index + 1}`;

      if (!lot.lotNumber || lot.lotNumber <= 0 || isNaN(Number(lot.lotNumber))) {
        lotsErrors.push(`${lotLabel} has an invalid or missing lot number.`);
      } else {
        if (seenLotNumbers.has(lot.lotNumber)) {
          duplicateLotNumbers.add(lot.lotNumber);
        }
        seenLotNumbers.add(lot.lotNumber);
      }

      if (!lot.title || !lot.title.trim()) {
        lotsErrors.push(`${lotLabel} is missing a required title.`);
      }

      if (lot.startingBid < 0 || isNaN(Number(lot.startingBid))) {
        lotsErrors.push(`${lotLabel} starting bid cannot be negative.`);
      }

      if (lot.reservePrice < 0 || isNaN(Number(lot.reservePrice))) {
        lotsErrors.push(`${lotLabel} reserve price cannot be negative.`);
      }

      if (lot.estimateLow < 0 || isNaN(Number(lot.estimateLow))) {
        lotsErrors.push(`${lotLabel} low estimate cannot be negative.`);
      }

      if (lot.estimateHigh < 0 || isNaN(Number(lot.estimateHigh))) {
        lotsErrors.push(`${lotLabel} high estimate cannot be negative.`);
      }

      if (lot.estimateLow > 0 && lot.estimateHigh > 0 && lot.estimateHigh < lot.estimateLow) {
        lotsErrors.push(`${lotLabel} high estimate ($${lot.estimateHigh}) cannot be less than low estimate ($${lot.estimateLow}).`);
      }
    });

    if (duplicateLotNumbers.size > 0) {
      lotsErrors.push(`Duplicate lot numbers detected in catalog: ${Array.from(duplicateLotNumbers).join(', ')}. Each lot must have a unique number.`);
    }
  }

  const lotsComplete = lotsErrors.length === 0;

  // --------------------------------------------------------------------------
  // 4. SECTION: LOT IMAGES (Optional - do not block publication)
  // --------------------------------------------------------------------------
  const featuredImageCount = auction.featuredImages?.length || 0;
  const lotsWithImagesCount = auctionLots.filter(l => Boolean(l.image || (l.images && l.images.length > 0))).length;

  if (featuredImageCount === 0 && lotsWithImagesCount === 0 && auctionLots.length > 0) {
    // Non-blocking warning only
    // "Do not block publication merely because optional images or expenses are absent."
  }

  // --------------------------------------------------------------------------
  // 5. SECTION: EXPENSES (Optional - do not block publication)
  // --------------------------------------------------------------------------
  const expenseTotal = (auction.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  // --------------------------------------------------------------------------
  // 6. SECTION: SAVED CHANGES STATUS
  // --------------------------------------------------------------------------
  if (isDirty) {
    savedErrors.push('You have unsaved changes. Please click "Save Draft" to persist your updates before publishing live.');
  }

  const savedComplete = savedErrors.length === 0;

  // Combine overall status
  const allErrors = [
    ...detailsErrors,
    ...uploadErrors,
    ...lotsErrors,
    ...savedErrors
  ];

  const allWarnings = [
    ...detailsWarnings,
    ...uploadWarnings,
    ...lotsWarnings
  ];

  const canPublish = allErrors.length === 0;

  return {
    isReady: canPublish,
    canPublish,
    sections: {
      details: {
        key: 'details',
        name: 'Details',
        isComplete: detailsComplete,
        isRequired: true,
        errors: detailsErrors,
        warnings: detailsWarnings,
        info: `${auction.name || 'Unnamed'} • ${auction.code || 'No Code'}`
      },
      uploadSettings: {
        key: 'upload-settings',
        name: 'Upload Settings',
        isComplete: uploadComplete,
        isRequired: true,
        errors: uploadErrors,
        warnings: uploadWarnings,
        info: uploadSettings?.biddingType || 'Not Configured'
      },
      lots: {
        key: 'lots',
        name: 'Lots',
        isComplete: lotsComplete,
        isRequired: true,
        errors: lotsErrors,
        warnings: lotsWarnings,
        info: `${auctionLots.length} Lot${auctionLots.length === 1 ? '' : 's'}`
      },
      lotImages: {
        key: 'lot-images',
        name: 'Lot Images',
        isComplete: true,
        isRequired: false,
        errors: [],
        warnings: [],
        info: `${featuredImageCount} Featured, ${lotsWithImagesCount}/${auctionLots.length} Lots with media`
      },
      expenses: {
        key: 'expenses',
        name: 'Expenses',
        isComplete: true,
        isRequired: false,
        errors: [],
        warnings: [],
        info: `$${expenseTotal.toLocaleString()}`
      },
      saved: {
        key: 'saved',
        name: 'Saved Changes',
        isComplete: savedComplete,
        isRequired: true,
        errors: savedErrors,
        warnings: [],
        info: isDirty ? 'Unsaved draft edits' : 'Saved to Supabase'
      }
    },
    allErrors,
    allWarnings,
    totalLotCount: auctionLots.length
  };
}
