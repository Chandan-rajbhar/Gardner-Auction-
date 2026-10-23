import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertCircle, Mail, ShieldCheck } from 'lucide-react';
import type { EmailListPageContent } from '../../types/siteContent';
import { UnsavedChangesModal } from './UnsavedChangesModal';

interface EmailListPageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: EmailListPageContent;
  onSave: (updated: EmailListPageContent) => Promise<{ success: boolean; error?: string }>;
}

export const EmailListPageEditModal: React.FC<EmailListPageEditModalProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSave
}) => {
  const [form, setForm] = useState<EmailListPageContent>(initialContent);
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

  const handleChange = <K extends keyof EmailListPageContent>(field: K, val: EmailListPageContent[K]) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setIsDirty(true);
  };

  const handleFormConfigChange = (key: string, val: string) => {
    setForm(prev => ({
      ...prev,
      form: {
        ...prev.form,
        [key]: val
      }
    }));
    setIsDirty(true);
  };

  const handleTrustBadgeChange = (index: number, label: string) => {
    const list = [...(form.trustBadges || [])];
    if (list[index]) {
      list[index] = { ...list[index], label };
      setForm(prev => ({ ...prev, trustBadges: list }));
      setIsDirty(true);
    }
  };

  const handleSuccessChange = (key: string, val: string) => {
    setForm(prev => ({
      ...prev,
      successMessage: {
        ...prev.successMessage,
        [key]: val
      }
    }));
    setIsDirty(true);
  };

  const handleAuthNoticeChange = (key: string, val: string) => {
    setForm(prev => ({
      ...prev,
      authNotice: {
        ...prev.authNotice,
        [key]: val
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
      setErrorMsg(res.error || 'Failed to persist Email List page content.');
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
              <Mail size={18} color="var(--gold-primary)" />
              Edit Email List Page Presentation
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Configure headline, catalog release copy, form placeholders, button text, privacy guarantee, and success message
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

          {/* 1. Eyebrow & Title */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
            <div className="form-group">
              <label>Eyebrow Label</label>
              <input
                type="text"
                value={form.eyebrow || ''}
                onChange={(e) => handleChange('eyebrow', e.target.value)}
                placeholder="AUCTION NOTIFICATIONS"
                required
              />
            </div>
            <div className="form-group">
              <label>Page Heading</label>
              <input
                type="text"
                value={form.heading || ''}
                onChange={(e) => handleChange('heading', e.target.value)}
                placeholder="Join Our Auction Email List"
                required
              />
            </div>
          </div>

          {/* 2. Description */}
          <div className="form-group">
            <label>Supporting Description Paragraph</label>
            <textarea
              rows={3}
              value={form.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Receive advance catalog releases, private preview invitations..."
              required
            />
          </div>

          {/* 3. Subscription Form Controls */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Subscription Form Inputs &amp; Actions
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              <div className="form-group">
                <label>Input Placeholder (Authenticated User)</label>
                <input
                  type="text"
                  value={form.form?.placeholderAuthenticated || ''}
                  onChange={(e) => handleFormConfigChange('placeholderAuthenticated', e.target.value)}
                  placeholder="Enter email address to subscribe..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Input Placeholder (Guest Mode)</label>
                <input
                  type="text"
                  value={form.form?.placeholderGuest || ''}
                  onChange={(e) => handleFormConfigChange('placeholderGuest', e.target.value)}
                  placeholder="Log in to subscribe your email..."
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Submit Button Label</label>
                <input
                  type="text"
                  value={form.form?.submitButtonLabel || ''}
                  onChange={(e) => handleFormConfigChange('submitButtonLabel', e.target.value)}
                  placeholder="Join Email List"
                  required
                />
              </div>
              <div className="form-group">
                <label>Submitting State Text</label>
                <input
                  type="text"
                  value={form.form?.submittingButtonLabel || ''}
                  onChange={(e) => handleFormConfigChange('submittingButtonLabel', e.target.value)}
                  placeholder="Subscribing..."
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. Privacy Guarantee & Trust Badges */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Privacy Statement &amp; Trust Badges
            </span>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Fiduciary Privacy Guarantee Text</label>
              <input
                type="text"
                value={form.privacyNotice?.text || ''}
                onChange={(e) => {
                  setForm(prev => ({
                    ...prev,
                    privacyNotice: {
                      ...prev.privacyNotice,
                      text: e.target.value
                    }
                  }));
                  setIsDirty(true);
                }}
                placeholder="Fiduciary privacy guaranteed. Unsubscribe at any time with one click."
                required
              />
            </div>

            <label style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Trust Badges (3 Items)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {(form.trustBadges || []).map((b, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={b.label || ''}
                  onChange={(e) => handleTrustBadgeChange(idx, e.target.value)}
                  placeholder={`Badge #${idx + 1}`}
                  required
                />
              ))}
            </div>
          </div>

          {/* 5. Success State Card */}
          <div style={{
            background: '#faf8f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e8e2d5'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-primary)', display: 'block', marginBottom: 12 }}>
              Subscription Success Feedback Dialog
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              <div className="form-group">
                <label>Success Title</label>
                <input
                  type="text"
                  value={form.successMessage?.title || ''}
                  onChange={(e) => handleSuccessChange('title', e.target.value)}
                  placeholder="Thank You for Subscribing"
                  required
                />
              </div>
              <div className="form-group">
                <label>Reset Button Label</label>
                <input
                  type="text"
                  value={form.successMessage?.resetButtonLabel || ''}
                  onChange={(e) => handleSuccessChange('resetButtonLabel', e.target.value)}
                  placeholder="Register Another Email Address"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Success Message Template (Use &#123;email&#125; placeholder)</label>
              <textarea
                rows={2}
                value={form.successMessage?.messageTemplate || ''}
                onChange={(e) => handleSuccessChange('messageTemplate', e.target.value)}
                placeholder="You have been enrolled to receive advance catalog previews at {email}."
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
                  <span>Save &amp; Publish Email Page</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        sectionName="Email List Page"
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </div>
  );
};
