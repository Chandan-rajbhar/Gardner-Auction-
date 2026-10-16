import React from 'react';
import { Tag } from 'lucide-react';
import type { EnrichedLotItem } from './types';

interface LotQuickSwitcherProps {
  lots: EnrichedLotItem[];
  selectedLotId: string;
  onSelectLot: (lotId: string) => void;
}

const getLotCategory = (lot: EnrichedLotItem): string => {
  if (lot.id === 'spotlight-104') return 'Rare Numismatics';
  if (lot.id === 'lot-701') return 'Silver Currency';
  if (lot.id === 'lot-702') return 'Estate Jewelry';
  if (lot.id === 'lot-703') return 'Americana Antiques';
  if (lot.id === 'lot-704') return 'American Fine Art';
  return lot.department || 'Featured Category';
};

export const LotQuickSwitcher: React.FC<LotQuickSwitcherProps> = ({
  lots,
  selectedLotId,
  onSelectLot
}) => {
  return (
    <div className="cap-lot-switcher-bar" aria-label="Auction Lot Categories">
      <div className="cap-switcher-title-btn">
        <Tag size={13} className="cap-gold-icon" />
        <span className="cap-switcher-label">CATEGORIES</span>
      </div>

      <div className="cap-switcher-scroll-track" role="tablist" aria-label="Auction categories">
        {lots.map((lot) => {
          const isSelected = lot.id === selectedLotId;
          const thumb = lot.images[0]?.url || '/images/hero_coin.jpg';
          const categoryName = getLotCategory(lot);

          return (
            <button
              key={lot.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`cap-switcher-pill ${isSelected ? 'active-lot-pill' : ''}`}
              onClick={() => onSelectLot(lot.id)}
            >
              <img src={thumb} alt={lot.title} className="cap-switcher-thumb" />
              <div className="cap-switcher-meta">
                <div className="cap-switcher-top-line">
                  <span className="cap-switcher-lot-num">
                    {lot.lotNumber}
                  </span>
                  <span className="cap-switcher-bid">
                    ${lot.currentBid.toLocaleString()}
                  </span>
                </div>
                <span className="cap-switcher-item-category">{categoryName}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

