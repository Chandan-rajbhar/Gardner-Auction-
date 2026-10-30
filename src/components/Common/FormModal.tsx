import React from 'react';
import { X } from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  maxWidth?: number | string;
  isLoading?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  title,
  onClose,
  onSubmit,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  children,
  maxWidth = 580,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const modalBodyContent = (
    <div 
      className="modal-body custom-scrollbar" 
      style={{ 
        flex: '1 1 auto', 
        overflowY: 'auto', 
        padding: '22px 24px',
        minHeight: 0
      }}
    >
      {children}
    </div>
  );

  const modalFooterContent = (
    <div 
      className="modal-footer" 
      style={{ 
        flexShrink: 0, 
        padding: '14px 24px', 
        borderTop: '1px solid #e2e8f0', 
        background: '#f8fafc',
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center',
        gap: 10 
      }}
    >
      <button 
        type="button" 
        className="btn btn-secondary" 
        onClick={onClose}
        disabled={isLoading}
        style={{
          height: 38,
          padding: '0 18px',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#334155',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        {cancelLabel}
      </button>
      {onSubmit && (
        <button 
          type="submit" 
          id="btn-form-modal-submit"
          className="btn btn-gold"
          disabled={isLoading}
          style={{
            height: 38,
            padding: '0 20px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 8,
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
            transition: 'all 0.15s ease'
          }}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      )}
    </div>
  );

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)'
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 36px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(15, 23, 42, 0.08)',
          animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div 
          className="modal-header" 
          style={{
            flexShrink: 0,
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <h3 style={{ 
            fontSize: 17, 
            fontWeight: 700, 
            color: '#0f172a', 
            margin: 0,
            letterSpacing: '-0.01em',
            fontFamily: 'var(--font-sans)'
          }}>
            {title}
          </h3>
          <button 
            type="button" 
            className="icon-btn" 
            onClick={onClose}
            aria-label="Close"
            disabled={isLoading}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {onSubmit ? (
          <form 
            onSubmit={onSubmit} 
            noValidate
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              minHeight: 0, 
              margin: 0,
              overflow: 'hidden'
            }}
          >
            {modalBodyContent}
            {modalFooterContent}
          </form>
        ) : (
          <>
            {modalBodyContent}
            {modalFooterContent}
          </>
        )}
      </div>
    </div>
  );
};
