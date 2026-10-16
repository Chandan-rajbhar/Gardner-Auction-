import React from 'react';
import { Award, CheckCircle2, CreditCard } from 'lucide-react';
import type { EnrichedLotItem } from './types';

interface AuctionClosedBannerProps {
  lot: EnrichedLotItem;
  userIsLeading: boolean;
}

export const AuctionClosedBanner: React.FC<AuctionClosedBannerProps> = ({
  lot,
  userIsLeading
}) => {
  const hammerPrice = lot.hammerPrice || lot.currentBid;
  const premium = Math.round(hammerPrice * 0.15);
  const total = hammerPrice + premium;

  return (
    <div className={`cap-closed-banner ${userIsLeading ? 'winner' : 'floor-sold'}`}>
      <div className="cap-closed-banner-inner">
        <div className="cap-closed-badge">
          <Award size={18} className="cap-gold-icon" />
          <span>LOT {lot.catalogIndex} OFFICIALLY CLOSED</span>
        </div>

        {userIsLeading ? (
          <div className="cap-winner-content">
            <h3 className="cap-winner-heading">
              <CheckCircle2 size={24} className="cap-green-icon" />
              <span>Congratulations! You Are the Winning Bidder</span>
            </h3>
            <p className="cap-winner-subtext">
              The gavel has dropped. You have secured <strong>{lot.lotNumber}: {lot.title}</strong> at the authoritative hammer price of <strong>${hammerPrice.toLocaleString()}.00 USD</strong>.
            </p>

            <div className="cap-winner-invoice-summary">
              <div className="cap-invoice-col">
                <span>Final Hammer Price:</span>
                <strong>${hammerPrice.toLocaleString()}.00</strong>
              </div>
              <div className="cap-invoice-col">
                <span>Buyer's Premium (15%):</span>
                <strong>+${premium.toLocaleString()}.00</strong>
              </div>
              <div className="cap-invoice-col total">
                <span>Total Settlement:</span>
                <strong>${total.toLocaleString()}.00 USD</strong>
              </div>
            </div>

            <div className="cap-winner-actions">
              <div className="cap-winner-note">
                <CreditCard size={15} />
                <span>An accredited settlement invoice and wire instructions have been transmitted to your registered account dossier.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="cap-sold-content">
            <h3 className="cap-sold-heading">
              Gavel Dropped — Sold at ${hammerPrice.toLocaleString()} USD
            </h3>
            <p className="cap-sold-subtext">
              Bidding for <strong>{lot.lotNumber}</strong> has concluded. Final hammer price recorded in Pennsylvania state auction ledger #AY-002004.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
