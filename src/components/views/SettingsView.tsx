import React, { useState } from 'react';
import { Settings, Save, Shield, Globe, DollarSign, Building } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [cashBP, setCashBP] = useState('15.0');
  const [creditBP, setCreditBP] = useState('18.0');
  const [defaultTax, setDefaultTax] = useState('7.5');
  const [syncFreq, setSyncFreq] = useState('5');
  const [hibidKey, setHibidKey] = useState('AF360-GARDNER-PROD-9482910');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {/* Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)' }}>
            System & AF360 Portal Configuration
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Saleroom parameters, buyer's premium tiers, and HiBid API syndication endpoints
          </p>
        </div>

        {savedNotice && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            ✓ Configuration saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Buyer's Premium Configuration */}
        <div className="syndication-card">
          <h3 className="font-serif" style={{ fontSize: 17, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={18} color="var(--gold-primary)" />
            Buyer's Premium & Cashiering Tiers
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
            Standard fees automatically added to hammer prices upon gavel fall.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Wire / Cash / Certified Check BP (%)</label>
              <input 
                type="number" 
                step="0.5"
                value={cashBP} 
                onChange={(e) => setCashBP(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Credit Card (Visa/MasterCard/Amex) BP (%)</label>
              <input 
                type="number" 
                step="0.5"
                value={creditBP} 
                onChange={(e) => setCreditBP(e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* HiBid AF360 Syndication Integration */}
        <div className="syndication-card">
          <h3 className="font-serif" style={{ fontSize: 17, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="var(--gold-primary)" />
            HiBid AF360 Network Connection
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>AF360 Master Gateway License Key</label>
              <input 
                type="text" 
                value={hibidKey}
                onChange={(e) => setHibidKey(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Auto-Sync Telemetry Frequency</label>
              <select value={syncFreq} onChange={(e) => setSyncFreq(e.target.value)}>
                <option value="1">Every 1 Minute (Live Auction Cadence)</option>
                <option value="5">Every 5 Minutes (Cataloging & Preview)</option>
                <option value="15">Every 15 Minutes</option>
                <option value="manual">Manual On-Demand Sync Only</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-dim)' }}>
            Endpoints connected: <code>florida.hibid.com</code>, <code>confiscatedassetsauctioneers.hibid.com</code>, <code>www.hibid.com</code>
          </div>
        </div>

        {/* Saleroom House Profile */}
        <div className="syndication-card">
          <h3 className="font-serif" style={{ fontSize: 17, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={18} color="var(--gold-primary)" />
            Gardner Auction Saleroom Profile
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Auction Company Entity</label>
              <input type="text" defaultValue="Gardner Auction — Since 1960" readOnly />
            </div>
            <div className="form-group">
              <label>Lead Auctioneer & License</label>
              <input type="text" defaultValue="Todd Gardner (MT Master Lic. #891)" readOnly />
            </div>
            <div className="form-group">
              <label>Physical Saleroom Address</label>
              <input type="text" defaultValue="1960 Heritage Way, Suite 400, Missoula, MT 59801" readOnly />
            </div>
            <div className="form-group">
              <label>Administrative Contact Phone</label>
              <input type="text" defaultValue="(406) 555-0100" readOnly />
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-gold" style={{ padding: '12px 24px' }}>
            <Save size={16} />
            <span>Save Configuration Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
