import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, CheckCircle2, AlertCircle, Award, ShieldCheck, Sparkles } from 'lucide-react';
import type { HomepageHeroContent } from '../../types/siteContent';
import { ImageUploadField } from './ImageUploadField';
import { UnsavedChangesModal } from './UnsavedChangesModal';

interface HeroEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: HomepageHeroContent;
  onSave: (updated: HomepageHeroContent) => Promise<{ success: boolean; error?: string }>;
}

export const HeroEditModal: React.FC<HeroEditModalProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSave
}) => {
  const [form, setForm] = useState<HomepageHeroContent>(initialContent);
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

  const handleChange = <K extends keyof HomepageHeroContent>(field: K, val: HomepageHeroContent[K]) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setIsDirty(true);
  };

  const handleCtaChange = (type: 'ctaPrimary' | 'ctaSecondary', key: string, val: string) => {
    setForm(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: val
      }
    }));
    setIsDirty(true);
  };

  const handleTrustChange = (index: number, key: string, val: string) => {
    const list = [...(form.trustIndicators || [])];
    if (list[index]) {
      list[index] = { ...list[index], [key]: val };
      setForm(prev => ({ ...prev, trustIndicators: list }));
      setIsDirty(true);
    }
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

    // Synchronize combined heading string
    const updated: HomepageHeroContent = {
      ...form,
      heading: `${form.headingLine1 || ''} ${form.headingLine2 || ''}`.trim()
    };

    const res = await onSave(updated);
    setSaving(false);
    if (res.success) {
      setIsDirty(false);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to persist changes.');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
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
              <Sparkles size={18} color="var(--gold-primary)" />
              Edit Homepage Hero Section
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Manage headline typography, introductory summary, conversion buttons, and trust credentials
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={handleClose} title="Close editor">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
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

          {/* 1. Brand Label */}
          <div className="form-group">
            <label>Brand Eyebrow Label</label>
            <input
              type="text"
              value={form.brandLabel || ''}
              onChange={(e) => handleChange('brandLabel', e.target.value)}
              placeholder="e.g. GARDNER AUCTION · EST. 1982"
              required
            />
          </div>

          {/* 2. Main Headline (Line 1, Line 2, Highlighted Word) */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Hero Headline Typography
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Headline Line 1</label>
                <input
                  type="text"
                  value={form.headingLine1 || ''}
                  onChange={(e) => handleChange('headingLine1', e.target.value)}
                  placeholder="Extraordinary Finds."
                  required
                />
              </div>
              <div className="form-group">
                <label>Headline Line 2</label>
                <input
                  type="text"
                  value={form.headingLine2 || ''}
                  onChange={(e) => handleChange('headingLine2', e.target.value)}
                  placeholder="Timeless Historical Value."
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Highlighted Word (Rendered in Gold Serif Italic)</label>
              <input
                type="text"
                value={form.headingHighlight || ''}
                onChange={(e) => handleChange('headingHighlight', e.target.value)}
                placeholder="e.g. Timeless"
              />
            </div>
          </div>

          {/* 3. Description Paragraph */}
          <div className="form-group">
            <label>Introductory Description Paragraph</label>
            <textarea
              rows={4}
              value={form.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Official institutional overview paragraph..."
              required
            />
          </div>

          {/* 4. CTA Buttons Group */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Call to Action Buttons
            </span>

            {/* Primary CTA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group">
                <label>Primary Button Label</label>
                <input
                  type="text"
                  value={form.ctaPrimary?.label || ''}
                  onChange={(e) => handleCtaChange('ctaPrimary', 'label', e.target.value)}
                  placeholder="EXPLORE LIVE AUCTIONS"
                  required
                />
              </div>
              <div className="form-group">
                <label>Primary Destination / Anchor</label>
                <input
                  type="text"
                  value={form.ctaPrimary?.destination || ''}
                  onChange={(e) => handleCtaChange('ctaPrimary', 'destination', e.target.value)}
                  placeholder="#auctions"
                  required
                />
              </div>
            </div>

            {/* Secondary CTA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Secondary Button Label</label>
                <input
                  type="text"
                  value={form.ctaSecondary?.label || ''}
                  onChange={(e) => handleCtaChange('ctaSecondary', 'label', e.target.value)}
                  placeholder="BROWSE ALL 1,420 LOTS"
                  required
                />
              </div>
              <div className="form-group">
                <label>Secondary Destination / Anchor</label>
                <input
                  type="text"
                  value={form.ctaSecondary?.destination || ''}
                  onChange={(e) => handleCtaChange('ctaSecondary', 'destination', e.target.value)}
                  placeholder="#auctions"
                  required
                />
              </div>
            </div>
          </div>

          {/* 5. Trust Indicators */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Saleroom Trust Seals
            </span>

            {(form.trustIndicators || []).map((seal, idx) => (
              <div key={idx} style={{
                padding: 12,
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.03)',
                marginBottom: idx === 0 ? 12 : 0,
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
                  <div className="form-group">
                    <label>Seal #{idx + 1} Title</label>
                    <input
                      type="text"
                      value={seal.title || ''}
                      onChange={(e) => handleTrustChange(idx, 'title', e.target.value)}
                      placeholder="e.g. 42 YEARS INTEGRITY"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={seal.description || ''}
                      onChange={(e) => handleTrustChange(idx, 'description', e.target.value)}
                      placeholder="e.g. Continuous regional leadership"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Icon</label>
                    <select
                      value={seal.icon || 'Award'}
                      onChange={(e) => handleTrustChange(idx, 'icon', e.target.value)}
                    >
                      <option value="Award">Award</option>
                      <option value="ShieldCheck">ShieldCheck</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 6. Hero Visual Photograph */}
          <ImageUploadField
            label="Hero Showcase Photograph"
            value={form.heroImage?.url || ''}
            altText={form.heroImage?.alt || ''}
            onChange={(url) => {
              handleChange('heroImage', { ...form.heroImage, url });
            }}
            onAltChange={(alt) => {
              handleChange('heroImage', { ...form.heroImage, alt });
            }}
            presetOptions={[
              { label: 'Gold Coins Still Life', url: '/images/hero_auction_coins.jpg' },
              { label: 'Historic Gavel', url: '/images/current_auction_hero.jpg' }
            ]}
            helperText="Cinematic photography displayed on the right column of the homepage hero."
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
        sectionName="Homepage Hero"
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </div>
  );
};
