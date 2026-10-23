import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertCircle, Gavel } from 'lucide-react';
import type { CurrentAuctionsHeroContent } from '../../types/siteContent';
import { ImageUploadField } from './ImageUploadField';
import { UnsavedChangesModal } from './UnsavedChangesModal';

interface CurrentAuctionsHeroEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: CurrentAuctionsHeroContent;
  onSave: (updated: CurrentAuctionsHeroContent) => Promise<{ success: boolean; error?: string }>;
}

export const CurrentAuctionsHeroEditModal: React.FC<CurrentAuctionsHeroEditModalProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSave
}) => {
  const [form, setForm] = useState<CurrentAuctionsHeroContent>(initialContent);
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

  const handleChange = <K extends keyof CurrentAuctionsHeroContent>(field: K, val: CurrentAuctionsHeroContent[K]) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setIsDirty(true);
  };

  const handleQuoteLineChange = (index: number, val: string) => {
    const lines = [...(form.supportingText?.lines || ['Exceptional Items.', 'Trusted Expertise.', 'Since 1960.'])];
    lines[index] = val;
    setForm(prev => ({
      ...prev,
      supportingText: {
        ...prev.supportingText,
        lines,
        quote: lines.join('\n')
      }
    }));
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
      setErrorMsg(res.error || 'Failed to persist Current Auctions hero content.');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{ maxWidth: 740, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
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
              <Gavel size={18} color="var(--gold-primary)" />
              Edit Current Auctions Hero Section
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Configure headline, subtitle description, back button, luxury quote lines, and background banner image
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

          {/* 1. Eyebrow Tag */}
          <div className="form-group">
            <label>Eyebrow Section Tag</label>
            <input
              type="text"
              value={form.eyebrow || ''}
              onChange={(e) => handleChange('eyebrow', e.target.value)}
              placeholder="LIVE & UPCOMING AUCTIONS"
              required
            />
          </div>

          {/* 2. Main Heading */}
          <div className="form-group">
            <label>Catalog Page Title / Heading</label>
            <input
              type="text"
              value={form.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              placeholder="Current & Upcoming Auctions"
              required
            />
          </div>

          {/* 3. Subtitle Description */}
          <div className="form-group">
            <label>Subtitle / Supporting Text</label>
            <textarea
              rows={3}
              value={form.subtitle || ''}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              placeholder="Browse live auction sessions, explore our catalog of exceptional items..."
              required
            />
          </div>

          {/* 4. Top Back Navigation Button */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Top Navigation Action Button
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Button Label</label>
                <input
                  type="text"
                  value={form.backButton?.label || ''}
                  onChange={(e) => {
                    setForm(prev => ({
                      ...prev,
                      backButton: {
                        ...prev.backButton,
                        label: e.target.value
                      }
                    }));
                    setIsDirty(true);
                  }}
                  placeholder="Back to Home"
                  required
                />
              </div>
              <div className="form-group">
                <label>Target Destination</label>
                <input
                  type="text"
                  value={form.backButton?.destination || ''}
                  onChange={(e) => {
                    setForm(prev => ({
                      ...prev,
                      backButton: {
                        ...prev.backButton,
                        destination: e.target.value
                      }
                    }));
                    setIsDirty(true);
                  }}
                  placeholder="/"
                  required
                />
              </div>
            </div>
          </div>

          {/* 5. Luxury Quote Box (3 Lines) */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Right Luxury Quote Box (3 Lines)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label style={{ fontSize: 11 }}>Quote Line 1</label>
                <input
                  type="text"
                  value={form.supportingText?.lines?.[0] || ''}
                  onChange={(e) => handleQuoteLineChange(0, e.target.value)}
                  placeholder="Exceptional Items."
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11 }}>Quote Line 2</label>
                <input
                  type="text"
                  value={form.supportingText?.lines?.[1] || ''}
                  onChange={(e) => handleQuoteLineChange(1, e.target.value)}
                  placeholder="Trusted Expertise."
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11 }}>Quote Line 3</label>
                <input
                  type="text"
                  value={form.supportingText?.lines?.[2] || ''}
                  onChange={(e) => handleQuoteLineChange(2, e.target.value)}
                  placeholder="Since 1960."
                  required
                />
              </div>
            </div>
          </div>

          {/* 6. Background Image Asset */}
          <ImageUploadField
            label="Hero Background Banner Image"
            value={form.backgroundImage?.url || ''}
            altText={form.backgroundImage?.alt || ''}
            onChange={(url) => {
              handleChange('backgroundImage', { ...form.backgroundImage, url });
            }}
            onAltChange={(alt) => {
              handleChange('backgroundImage', { ...form.backgroundImage, alt });
            }}
            presetOptions={[
              { label: 'Gavel Hero Banner', url: '/images/current_auction_hero.jpg' },
              { label: 'Coin Still Life', url: '/images/hero_auction_coins.jpg' }
            ]}
            helperText="Dark navy overlay gradient is automatically applied on top of this background image."
          />

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
                  <span>Save &amp; Publish Hero</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        sectionName="Current Auctions Hero"
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </div>
  );
};
