import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, User, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newRole: 'super_admin' | 'user') => Promise<void>;
  customerName: string;
  customerEmail: string;
  customerCode?: string;
  currentRole: string;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  customerEmail,
  customerCode,
  currentRole,
  isLoading = false,
  errorMessage = null,
}) => {
  const currentNormalized = (currentRole || '').toLowerCase().trim();
  const initialRole: 'super_admin' | 'user' = currentNormalized === 'super_admin' ? 'super_admin' : 'user';
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'user'>(initialRole);

  useEffect(() => {
    if (isOpen) {
      const r = (currentRole || '').toLowerCase().trim();
      setSelectedRole(r === 'super_admin' ? 'super_admin' : 'user');
    }
  }, [isOpen, currentRole]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onConfirm(selectedRole);
  };

  const isRoleChanged = selectedRole !== initialRole;

  const content = (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 500,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'modalFadeIn 0.18s ease-out'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-role-title"
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.97) translateY(4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#fef3c7',
              color: '#a37a3b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 id="change-role-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Change Customer Role
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Manage account role and administrative clearance in Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Customer Summary Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{customerName || 'Customer'}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{customerEmail || 'No email registered'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {customerCode && (
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: 4,
                  display: 'inline-block',
                  marginBottom: 4
                }}>
                  {customerCode}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Current: <strong style={{ color: currentNormalized === 'super_admin' ? '#059669' : '#475569' }}>
                  {currentNormalized === 'super_admin' ? 'Super Admin' : 'User'}
                </strong>
              </div>
            </div>
          </div>

          {/* Role Selection Label */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
            Select New Role &amp; Access Level *
          </div>

          {/* Role Radio Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {/* Option 1: Super Admin */}
            <label
              htmlFor="role-super-admin"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                border: selectedRole === 'super_admin' ? '2px solid #a37a3b' : '1px solid #e2e8f0',
                background: selectedRole === 'super_admin' ? '#fdfcf9' : '#ffffff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                id="role-super-admin"
                type="radio"
                name="customer-role"
                value="super_admin"
                checked={selectedRole === 'super_admin'}
                disabled={isLoading}
                onChange={() => setSelectedRole('super_admin')}
                style={{ marginTop: 3, accentColor: '#a37a3b', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Super Admin</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#059669',
                    background: '#d1fae5',
                    padding: '1px 6px',
                    borderRadius: 4
                  }}>
                    ADMIN ACCESS
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                  Full executive clearance to the Gardner Auction Admin Dashboard, saleroom clerking, financial settlements, customer role management, and activity logs.
                </p>
              </div>
            </label>

            {/* Option 2: User */}
            <label
              htmlFor="role-user"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                border: selectedRole === 'user' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                background: selectedRole === 'user' ? '#f8fafc' : '#ffffff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                id="role-user"
                type="radio"
                name="customer-role"
                value="user"
                checked={selectedRole === 'user'}
                disabled={isLoading}
                onChange={() => setSelectedRole('user')}
                style={{ marginTop: 3, accentColor: '#0f172a', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>User</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#475569',
                    background: '#e2e8f0',
                    padding: '1px 6px',
                    borderRadius: 4
                  }}>
                    STANDARD CLIENT
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                  Standard customer account. Authorized to register for auctions, place live bids, and receive settlements. Blocked from accessing the Admin Dashboard.
                </p>
              </div>
            </label>
          </div>

          {/* Context Notice */}
          {selectedRole === 'super_admin' && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#065f46',
              marginBottom: 16
            }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>Promoting this customer will grant them login access to the Gardner Auction Admin Console.</span>
            </div>
          )}

          {selectedRole === 'user' && currentNormalized === 'super_admin' && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 6,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#92400e',
              marginBottom: 16
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Demoting this account to User will immediately revoke access to the Admin Dashboard.</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#dc2626',
              marginBottom: 16
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isRoleChanged}
              id="btn-confirm-role-change"
              style={{
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: '#ffffff',
                background: !isRoleChanged ? '#94a3b8' : '#0f172a',
                border: 'none',
                borderRadius: 6,
                cursor: (isLoading || !isRoleChanged) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.15s ease'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="spin-animation" />
                  <span>Saving Role...</span>
                </>
              ) : (
                <span>Save Role Change</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

