import React, { useState } from 'react';
import { X, Zap, ShieldCheck } from 'lucide-react';
import type { EnrichedLotItem, SettlementBreakdown } from './types';

interface BidConfirmationDialogProps {
  lot: EnrichedLotItem;
  amount: number;
  isProxy?: boolean;
  settlement: SettlementBreakdown;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const BidConfirmationDialog: React.FC<BidConfirmationDialogProps> = ({
  lot,
  amount,
  isProxy = false,
  settlement,
  isSubmitting,
  onConfirm,
  onClose
}) => {
  const [agreed, setAgreed] = useState<boolean>(true);

  const thumb = lot.images[0]?.url || '/images/hero_coin.jpg';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || isSubmitting) return;
    onConfirm();
  };

  return (
    <div
      className="cap-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="cap-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cap-modal-header">
          <div className="cap-modal-header-titles">
            <span className="cap-modal-tag">{lot.lotNumber} · BID CONFIRMATION</span>
            <h3 id="confirm-modal-title" className="cap-modal-title">
              {isProxy ? 'Authorize Confidential Proxy Ceiling' : 'Confirm Authoritative Floor Bid'}
            </h3>
          </div>
          <button
            type="button"
            className="cap-modal-close-btn"
            onClick={onClose}
            aria-label="Close bid confirmation"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="cap-modal-body">
          {/* Lot Summary Card */}
          <div className="cap-modal-lot-preview">
            <img src={thumb} alt={lot.title} className="cap-modal-thumb" />
            <div className="cap-modal-lot-meta">
              <span className="cap-modal-cat">{lot.categoryTag}</span>
              <h4 className="cap-modal-lot-title">{lot.title}</h4>
              <div className="cap-modal-bids-row">
                <span>Current Bid: <strong>${lot.currentBid.toLocaleString()}</strong></span>
                <span>Estimate: <strong>${lot.estimateLow.toLocaleString()} – ${lot.estimateHigh.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Bid Summary Display */}
          <div className="cap-confirm-amount-box">
            <span className="cap-confirm-amount-label">
              {isProxy ? 'MAXIMUM CEILING BID' : 'SUBMITTED BID AMOUNT'}
            </span>
            <div className="cap-confirm-amount-val">
              ${amount.toLocaleString()}.00 USD
            </div>
            {isProxy && (
              <p className="cap-confirm-proxy-note">
                Our server will only advance bids by the required increment to maintain your lead up to this ceiling.
              </p>
            )}
          </div>

          {/* Settlement Breakdown Table */}
          <div className="cap-modal-settlement">
            <div className="cap-breakdown-row">
              <span>Hammer Price Bid:</span>
              <span>${amount.toLocaleString()}.00</span>
            </div>
            <div className="cap-breakdown-row">
              <span>Standard Buyer's Premium (15%):</span>
              <span>+${settlement.buyersPremium.toLocaleString()}.00</span>
            </div>
            <div className="cap-breakdown-divider"></div>
            <div className="cap-breakdown-row total">
              <span>Estimated Total Settlement:</span>
              <span className="cap-breakdown-total-price">
                ${settlement.estimatedTotal.toLocaleString()}.00
              </span>
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="cap-terms-checkbox-wrap">
            <input
              type="checkbox"
              id="cap-auction-terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={isSubmitting}
            />
            <label htmlFor="cap-auction-terms">
              I certify that I am registered under PA Lic. # AY-002004 rules. All bids are irrevocable, legally binding contracts subject to Gardner Auction Terms of Consignment &amp; Sale.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="cap-modal-actions">
            <button
              type="button"
              className="cap-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="cap-btn-confirm-submit"
              disabled={!agreed || isSubmitting}
            >
              <Zap size={18} />
              <span>
                {isSubmitting
                  ? 'Verifying Floor Transmission...'
                  : `CONFIRM BID ($${amount.toLocaleString()})`}
              </span>
            </button>
          </div>

          {/* Security Assurance */}
          <div className="cap-modal-security">
            <ShieldCheck size={14} className="cap-gold-icon" />
            <span>Encrypted 256-Bit SSL Auction Floor Transmission · Instant Paddle Acknowledgment</span>
          </div>
        </form>
      </div>
    </div>
  );
};
