import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertCircle, Layers, Plus, Trash2 } from 'lucide-react';
import type { SiteFooterContent } from '../../types/siteContent';
import { ImageUploadField } from './ImageUploadField';
import { UnsavedChangesModal } from './UnsavedChangesModal';

interface FooterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: SiteFooterContent;
  onSave: (updated: SiteFooterContent) => Promise<{ success: boolean; error?: string }>;
}

export const FooterEditModal: React.FC<FooterEditModalProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSave
}) => {
  const [form, setForm] = useState<SiteFooterContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialContent);
      setIsDirty(false);
      setErrorMsg(null);
      setShowUnsavedConfirm(false);
    }
  }, [isOpen, initialContent]);

  // Handle Escape key for graceful dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showUnsavedConfirm) {
          setShowUnsavedConfirm(false);
        } else if (isDirty) {
          setShowUnsavedConfirm(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showUnsavedConfirm, isDirty, onClose]);

  if (!isOpen) return null;

  const handleBrandChange = (key: string, val: any) => {
    setForm(prev => ({
      ...prev,
      brand: {
        ...prev.brand,
        [key]: val
      }
    }));
    setIsDirty(true);
  };

  const handleContactChange = (category: 'address' | 'phone' | 'email', key: string, val: string) => {
    setForm(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [category]: {
          ...(prev.contact as any)?.[category],
          [key]: val
        }
      }
    }));
    setIsDirty(true);
  };

  const handleNavLinkChange = (index: number, key: 'label' | 'destination', val: string) => {
    const links = [...(form.navigation?.links || [])];
    if (links[index]) {
      links[index] = { ...links[index], [key]: val };
      setForm(prev => ({
        ...prev,
        navigation: {
          ...prev.navigation,
          links
        }
      }));
      setIsDirty(true);
    }
  };

  const handleLegalChange = (key: 'copyright' | 'licensureText', val: string) => {
    if (key === 'copyright') {
      setForm(prev => ({
        ...prev,
        legal: {
          ...prev.legal,
          copyright: val
        }
      }));
    } else {
      setForm(prev => ({
        ...prev,
        legal: {
          ...prev.legal,
          licensure: {
            ...prev.legal?.licensure,
            text: val
          }
        }
      }));
    }
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    setShowUnsavedConfirm(false);
    setIsDirty(false);
    setForm(initialContent);
    onClose();
  };

  const handleKeepEditing = () => {
    setShowUnsavedConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const res = await onSave(form);
    setSaving(false);
    if (res.success) {
      setIsDirty(false);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to persist footer content.');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)'
        }}>
          <div>
            <h3 className="font-serif" style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="var(--gold-primary)" />
              Edit Website Footer &amp; Navigation
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Update shared footer branding, navigation menu links, saleroom gallery contacts, and legal notices
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={handleClose} title="Close editor">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Brand Identity */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Footer Branding &amp; Logo
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Brand Name</label>
                <input
                  type="text"
                  value={form.brand?.name || ''}
                  onChange={(e) => handleBrandChange('name', e.target.value)}
                  placeholder="GARDNER AUCTION"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tagline</label>
                <input
                  type="text"
                  value={form.brand?.tagline || ''}
                  onChange={(e) => handleBrandChange('tagline', e.target.value)}
                  placeholder="APPRAISERS & AUCTIONEERS · SINCE 1960"
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <ImageUploadField
                label="Footer Brand Logo"
                value={form.brand?.logo?.url || ''}
                altText={form.brand?.logo?.alt || ''}
                onChange={(url) => {
                  handleBrandChange('logo', { ...form.brand?.logo, url });
                }}
                onAltChange={(alt) => {
                  handleBrandChange('logo', { ...form.brand?.logo, alt });
                }}
                presetOptions={[
                  { label: 'Gardner Gold Logo', url: '/images/gardner_logo.png' }
                ]}
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Footer Overview Summary</label>
              <textarea
                rows={2}
                value={form.description || ''}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Institutional summary paragraph..."
                required
              />
            </div>
          </div>

          {/* 2. Navigation Menu Links */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Footer Navigation Links
            </span>

            {(form.navigation?.links || []).map((link, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: idx < (form.navigation?.links?.length || 0) - 1 ? 10 : 0
              }}>
                <div className="form-group">
                  <label style={{ fontSize: 11 }}>Link #{idx + 1} Label</label>
                  <input
                    type="text"
                    value={link.label || ''}
                    onChange={(e) => handleNavLinkChange(idx, 'label', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 11 }}>Destination Route / Anchor</label>
                  <input
                    type="text"
                    value={link.destination || ''}
                    onChange={(e) => handleNavLinkChange(idx, 'destination', e.target.value)}
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 3. Saleroom Gallery Contact */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Saleroom Gallery Contact
            </span>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Gallery Physical Address</label>
              <input
                type="text"
                value={form.contact?.address?.text || ''}
                onChange={(e) => handleContactChange('address', 'text', e.target.value)}
                placeholder="4200 Commercial Boulevard, Suite 100, Pittsburgh, PA 15201"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Gallery Telephone</label>
                <input
                  type="text"
                  value={form.contact?.phone?.label || ''}
                  onChange={(e) => handleContactChange('phone', 'label', e.target.value)}
                  placeholder="(412) 555-0199"
                  required
                />
              </div>
              <div className="form-group">
                <label>Gallery Email</label>
                <input
                  type="email"
                  value={form.contact?.email?.label || ''}
                  onChange={(e) => handleContactChange('email', 'label', e.target.value)}
                  placeholder="info@gardnerauction.com"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. Social Media Links */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Social Media Channels &amp; Links
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Facebook Saleroom URL</label>
                <input
                  type="text"
                  value={form.socialLinks?.find(s => s.platform.toLowerCase() === 'facebook')?.url || ''}
                  onChange={(e) => {
                    const existing = [...(form.socialLinks || [])];
                    const idx = existing.findIndex(s => s.platform.toLowerCase() === 'facebook');
                    if (idx >= 0) existing[idx] = { ...existing[idx], url: e.target.value };
                    else existing.push({ platform: 'Facebook', url: e.target.value });
                    setForm(prev => ({ ...prev, socialLinks: existing }));
                    setIsDirty(true);
                  }}
                  placeholder="https://facebook.com/gardnerauction"
                />
              </div>
              <div className="form-group">
                <label>Instagram Profile URL</label>
                <input
                  type="text"
                  value={form.socialLinks?.find(s => s.platform.toLowerCase() === 'instagram')?.url || ''}
                  onChange={(e) => {
                    const existing = [...(form.socialLinks || [])];
                    const idx = existing.findIndex(s => s.platform.toLowerCase() === 'instagram');
                    if (idx >= 0) existing[idx] = { ...existing[idx], url: e.target.value };
                    else existing.push({ platform: 'Instagram', url: e.target.value });
                    setForm(prev => ({ ...prev, socialLinks: existing }));
                    setIsDirty(true);
                  }}
                  placeholder="https://instagram.com/gardnerauction"
                />
              </div>
            </div>
          </div>

          {/* 5. Legal & Licensure */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Legal Copyright &amp; State Licensure
            </span>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Copyright Statement</label>
              <textarea
                rows={2}
                value={form.legal?.copyright || ''}
                onChange={(e) => handleLegalChange('copyright', e.target.value)}
                placeholder="© 1960–2026 Gardner Auction LLC..."
                required
              />
            </div>

            <div className="form-group">
              <label>State Licensure Notice</label>
              <input
                type="text"
                value={form.legal?.licensure?.text || ''}
                onChange={(e) => handleLegalChange('licensureText', e.target.value)}
                placeholder="Commonwealth of Pennsylvania Registered & Bonded Auction House"
                required
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-gold"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save &amp; Publish Footer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        sectionName="Footer"
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </div>
  );
};
