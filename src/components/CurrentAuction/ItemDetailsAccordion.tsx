import React, { useState } from 'react';
import { Award } from 'lucide-react';
import type { EnrichedLotItem } from './types';

interface ItemDetailsAccordionProps {
  lot: EnrichedLotItem;
  onRequestConditionReport: () => void;
}

interface LotSpecItem {
  label: string;
  value: string;
}

const getLotSpecs = (lot: EnrichedLotItem): LotSpecItem[] => {
  if (lot.id === 'spotlight-104') {
    return [
      { label: 'Category', value: 'Rare Numismatics' },
      { label: 'Grade & Service', value: 'PCGS MS-65+ CAC Gold Shield' },
      { label: 'Composition', value: '.900 Fine Gold (0.9675 oz AGW)' },
      { label: 'Variety & Mintage', value: '1907 Wire-Rim High Relief' },
      { label: 'Provenance', value: 'Ex. John H. Clapp Collection' },
      { label: 'Authentication', value: 'Verified CAC Green Sticker' }
    ];
  }
  if (lot.id === 'lot-701') {
    return [
      { label: 'Category', value: 'Key Date Numismatics' },
      { label: 'Grade & Service', value: 'NGC VF30 Problem-Free' },
      { label: 'Composition', value: '.900 Silver (26.73g)' },
      { label: 'Mint & Date', value: '1893-S (San Francisco Mint)' },
      { label: 'Provenance', value: 'Western PA Safe Deposit Discovery' },
      { label: 'Scarcity', value: 'Key Circulation Strike of Series' }
    ];
  }
  if (lot.id === 'lot-702') {
    return [
      { label: 'Category', value: 'GIA Certified Estate Jewelry' },
      { label: 'Center Stone', value: '3.20ct Old European Cut Diamond' },
      { label: 'Clarity & Color', value: 'VS1 Clarity · K Color' },
      { label: 'Metal & Setting', value: 'Platinum Hand-Pierced Filigree' },
      { label: 'Era & Style', value: 'Art Deco c. 1920–1925' },
      { label: 'Certification', value: 'GIA Laboratory Report #2185493011' }
    ];
  }
  if (lot.id === 'lot-703') {
    return [
      { label: 'Category', value: 'Americana & Early Horology' },
      { label: 'Case Material', value: 'Solid PA Black Walnut' },
      { label: 'Movement', value: 'Eight-Day Brass Moon Dial Works' },
      { label: 'Origin & Era', value: 'Lancaster County, PA, c. 1785' },
      { label: 'Dimensions', value: '94" H × 20.5" W × 11" D' },
      { label: 'Provenance', value: 'Hostetter Family Lineage (Lititz, PA)' }
    ];
  }
  // Default / lot-704
  return [
    { label: 'Category', value: 'American Fine Art' },
    { label: 'Artist', value: lot.artistName || 'Aaron Harry Gorson (1872–1932)' },
    { label: 'Medium', value: 'Original Oil on Fine Linen' },
    { label: 'Dimensions', value: '30 × 36 in. (Framed: 41 × 47 in.)' },
    { label: 'Frame', value: lot.artworkFrameSpecs || 'Newcomb-Macklin Gilt Rococo' },
    { label: 'Exhibition', value: lot.carnegieExhibition || 'Carnegie Institute (1913, #98)' }
  ];
};

const getConciseDescription = (lot: EnrichedLotItem): string => {
  if (lot.id === 'spotlight-104') {
    return 'Rare 1907 high-relief wire-rim variety struck in Roman gold with radiant satin surfaces. Encapsulated in PCGS museum-grade security slab with verified CAC endorsement.';
  }
  if (lot.id === 'lot-701') {
    return 'The premier key date of the Morgan silver dollar series featuring authentic dove-slate toning. Certified problem-free NGC VF30 from a historic Pennsylvania estate deposit.';
  }
  if (lot.id === 'lot-702') {
    return 'Exquisite Art Deco 3.20ct Old European cut diamond set in intricately pierced platinum filigree. Accompanied by full official GIA laboratory grading certification.';
  }
  if (lot.id === 'lot-703') {
    return 'Late 18th-century Lancaster County Chippendale tall case clock with eight-day brass movement and painted lunar dial, preserved in undisturbed period shellac finish.';
  }
  if (lot.id === 'lot-704') {
    return 'Museum-caliber nocturne masterwork by Aaron Harry Gorson capturing twilight over Pittsburgh\'s industrial steelworks. Features French Impressionist luminosity and rich impasto on fine linen.';
  }
  return lot.description;
};

export const ItemDetailsAccordion: React.FC<ItemDetailsAccordionProps> = ({
  lot,
  onRequestConditionReport
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'provenance' | 'condition' | 'terms'>('details');

  const specs = getLotSpecs(lot);
  const conciseDesc = getConciseDescription(lot);

  return (
    <div className="cap-details-card">
      {/* Tab Navigation Header */}
      <div className="cap-details-tabs" role="tablist" aria-label="Item Dossier Sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'details'}
          className={`cap-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <span>OVERVIEW &amp; SPECS</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'provenance'}
          className={`cap-tab-btn ${activeTab === 'provenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('provenance')}
        >
          <span>PROVENANCE</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'condition'}
          className={`cap-tab-btn ${activeTab === 'condition' ? 'active' : ''}`}
          onClick={() => setActiveTab('condition')}
        >
          <span>CONDITION REPORT</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'terms'}
          className={`cap-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          <span>BUYER TERMS (15%)</span>
        </button>
      </div>

      {/* Tab Panel Content */}
      <div className="cap-tab-panel" role="tabpanel">
        {activeTab === 'details' && (
          <div className="cap-panel-section">
            <p className="cap-lead-desc">{conciseDesc}</p>

            {/* Clean Specifications Grid */}
            <div className="cap-specs-grid">
              {specs.map((spec, i) => (
                <div key={i} className="cap-spec-item">
                  <span className="cap-spec-label">{spec.label}</span>
                  <span className="cap-spec-value">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'provenance' && (
          <div className="cap-panel-section">
            <h4 className="cap-section-header">Verified Provenance &amp; Chain of Custody</h4>
            <div className="cap-provenance-box">
              <Award size={20} className="cap-gold-icon" />
              <div>
                <span className="cap-provenance-consignor">{lot.consignorProvenance}</span>
                <p className="cap-provenance-text">{lot.provenance}</p>
              </div>
            </div>
            <p className="cap-subtext-note">
              Official institutional archive documentation and estate chain of custody records are sealed and transferred to the winning high bidder upon settlement.
            </p>
          </div>
        )}

        {activeTab === 'condition' && (
          <div className="cap-panel-section">
            <div className="cap-condition-header-row">
              <h4 className="cap-section-header">Specialist Condition Report</h4>
              <button
                type="button"
                className="cap-btn-req-report"
                onClick={onRequestConditionReport}
              >
                Request Full PDF Report
              </button>
            </div>

            <div className="cap-condition-report-card">
              <p className="cap-condition-body">{lot.conditionReport}</p>

              <div className="cap-specialist-signoff">
                <div className="cap-specialist-avatar">
                  <span>{lot.specialistName.charAt(0)}</span>
                </div>
                <div>
                  <span className="cap-specialist-name">{lot.specialistName}</span>
                  <span className="cap-specialist-title">{lot.specialistTitle}</span>
                  <p className="cap-specialist-quote">"{lot.specialistNote}"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="cap-panel-section">
            <h4 className="cap-section-header">Buyer Terms &amp; Conditions</h4>
            <ul className="cap-terms-list">
              <li>
                <strong>15% Buyer's Premium:</strong> A standard 15% Buyer's Premium is added to the hammer price of each lot.
              </li>
              <li>
                <strong>Guaranteed Authenticity:</strong> All catalog lots are backed by Gardner Auction's verified authenticity guarantee.
              </li>
              <li>
                <strong>Settlement &amp; Invoicing:</strong> Successful bidders receive an invoice immediately post-auction. Wire transfer, certified check, and credit cards accepted.
              </li>
              <li>
                <strong>Insured Shipping:</strong> White-glove insured worldwide delivery or secure vault collection available.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

