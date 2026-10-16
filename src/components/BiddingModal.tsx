import React, { useState } from 'react';
import { X, Zap, ShieldCheck } from 'lucide-react';
import type { LotItem } from '../data/auctionData';

interface BiddingModalProps {
  lot: LotItem | null;
  onClose: () => void;
  onConfirmBid: (lotId: string, amount: number) => void;
}

export const BiddingModal: React.FC<BiddingModalProps> = ({
  lot,
  onClose,
  onConfirmBid
}) => {
  const [selectedBid, setSelectedBid] = useState<number>(lot?.nextBid || 0);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!lot) return null;

  const buyersPremium = Math.round(selectedBid * 0.15);
  const totalSettlement = selectedBid + buyersPremium;

  const increments = [
    lot.nextBid,
    lot.nextBid + lot.bidIncrement,
    lot.nextBid + lot.bidIncrement * 2,
    lot.nextBid + lot.bidIncrement * 4
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onConfirmBid(lot.id, selectedBid);
      setIsSubmitting(false);
      onClose();
    }, 450);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card bidding-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-titles">
            <span className="modal-tag">{lot.lotNumber} · BIDDING DESK</span>
            <h3 className="modal-title">{lot.title}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-lot-preview">
            <img src={lot.image} alt={lot.title} className="modal-lot-thumb" />
            <div className="modal-lot-meta">
              <span className="preview-cat">{lot.categoryTag}</span>
              <div className="preview-bid-row">
                <span>Current Bid: <strong>${lot.currentBid.toLocaleString()}</strong></span>
                <span>Estimate: <strong>${lot.estimateLow.toLocaleString()} – ${lot.estimateHigh.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Bid Selector */}
          <div className="bid-selection-section">
            <label className="section-label">Select Your Bid Amount (USD)</label>
            <div className="bid-increments-grid">
              {increments.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  className={`bid-inc-btn ${selectedBid === inc ? 'active' : ''}`}
                  onClick={() => setSelectedBid(inc)}
                >
                  <span className="inc-price">${inc.toLocaleString()}</span>
                  <span className="inc-tag">{inc === lot.nextBid ? 'Next Valid Bid' : 'Max Bid'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="settlement-breakdown">
            <div className="breakdown-row">
              <span>Hammer Price Bid:</span>
              <span>${selectedBid.toLocaleString()}.00</span>
            </div>
            <div className="breakdown-row">
              <span>Standard Buyer's Premium (15%):</span>
              <span>+${buyersPremium.toLocaleString()}.00</span>
            </div>
            <div className="breakdown-divider"></div>
            <div className="breakdown-row total">
              <span>Estimated Total Settlement:</span>
              <span className="total-price">${totalSettlement.toLocaleString()}.00</span>
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="terms-checkbox-wrap">
            <input
              type="checkbox"
              id="auction-terms-check"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <label htmlFor="auction-terms-check">
              I certify that I am registered under PA Lic. # AY-002004 rules. All bids are irrevocable and legally binding contracts subject to Gardner Auction Terms.
            </label>
          </div>

          {/* Submit Action */}
          <div className="modal-actions">
            <button
              type="submit"
              className="btn-confirm-bid"
              disabled={!agreedToTerms || isSubmitting}
            >
              <Zap size={18} />
              <span>{isSubmitting ? 'Submitting Bid...' : `CONFIRM BID ($${selectedBid.toLocaleString()})`}</span>
            </button>
          </div>

          <div className="bid-security-notice">
            <ShieldCheck size={14} className="gold-icon" />
            <span>Encrypted 256-bit SSL auction floor transmission · Instant bid verification</span>
          </div>
        </form>
      </div>
    </div>
  );
};
