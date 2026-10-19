import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, Globe, DollarSign, Building, Database, Activity, CheckCircle, RefreshCw } from 'lucide-react';
import { checkSupabaseConnection, SUPABASE_URL } from '../../lib/supabase';

export const SettingsView: React.FC = () => {
  const [cashBP, setCashBP] = useState('15.0');
  const [creditBP, setCreditBP] = useState('18.0');
  const [defaultTax, setDefaultTax] = useState('7.5');
  const [syncFreq, setSyncFreq] = useState('5');
  const [hibidKey, setHibidKey] = useState('AF360-GARDNER-PROD-9482910');
  const [savedNotice, setSavedNotice] = useState(false);

  // Supabase Live Connection Telemetry
  const [supaStatus, setSupaStatus] = useState<{
    tested: boolean;
    connecting: boolean;
    connected: boolean;
    latencyMs: number;
    details: string;
  }>({
    tested: false,
    connecting: false,
    connected: true,
    latencyMs: 0,
    details: 'Embedded credentials loaded (Git-pull ready)',
  });

  const runConnectionCheck = async () => {
    setSupaStatus(prev => ({ ...prev, connecting: true }));
    const result = await checkSupabaseConnection();
    setSupaStatus({
      tested: true,
      connecting: false,
      connected: result.connected,
      latencyMs: result.latencyMs,
      details: result.details,
    });
  };

  useEffect(() => {
    runConnectionCheck();
  }, []);

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
            System & Portal Configuration
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Saleroom parameters, buyer's premium tiers, and Supabase Edge infrastructure
          </p>
        </div>

        {savedNotice && (
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#b45309', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            ✓ Configuration saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Supabase & Edge Function Infrastructure */}
        <div className="syndication-card" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 className="font-serif" style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Database size={18} color="#f59e0b" />
              Supabase Database & Edge Functions
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 6, 
                padding: '4px 10px', 
                borderRadius: 20, 
                fontSize: 12, 
                fontWeight: 600,
                background: supaStatus.connected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                color: supaStatus.connected ? '#b45309' : '#f87171',
                border: `1px solid ${supaStatus.connected ? '#f59e0b' : '#ef4444'}`
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: supaStatus.connected ? '#f59e0b' : '#ef4444' }}></span>
                {supaStatus.connected ? 'Connected' : 'Offline'}
                {supaStatus.latencyMs > 0 && ` (${supaStatus.latencyMs}ms)`}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={runConnectionCheck}
                disabled={supaStatus.connecting}
              >
                <RefreshCw size={12} className={supaStatus.connecting ? 'animate-spin' : ''} />
                <span>{supaStatus.connecting ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Bids, auctions, and telemetry are synchronized with Supabase Edge Runtime. Fallback credentials are built into the client, so anyone who pulls from Git can develop immediately without configuring a <code>.env</code> file.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Project Endpoint URL</label>
              <input type="text" value={SUPABASE_URL} readOnly />
            </div>
            <div className="form-group">
              <label>Publishable Client Key</label>
              <input type="text" value="sb_publishable_AtKdmtFDHhIa...-H0s" readOnly />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div className="form-group">
              <label>Active Edge Functions</label>
              <input type="text" value="auction-edge, hibid-sync, stripe-checkout" readOnly />
            </div>
            <div className="form-group">
              <label>Secret Key Storage</label>
              <input type="text" value="Edge Runtime / Deno ctx.supabaseAdmin" readOnly />
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} color="#f59e0b" />
            <span>Status details: {supaStatus.details}</span>
          </div>
        </div>
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
            HiBid Network Connection
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Master Gateway License Key</label>
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
