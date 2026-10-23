import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ShadcnSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  side?: 'right' | 'left';
  isSubmitting?: boolean;
  className?: string;
}

const sizeWidths: Record<string, string> = {
  sm: '380px',
  md: '520px',
  lg: '680px',
  xl: '820px',
  full: '100vw'
};

export const ShadcnSheet: React.FC<ShadcnSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  side = 'right',
  isSubmitting = false,
  className = ''
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const targetWidth = sizeWidths[size] || sizeWidths.md;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        animation: 'shadcnSheetFadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={sheetRef}
        className={`shadcn-sheet-panel ${className}`}
        style={{
          width: '100%',
          maxWidth: targetWidth,
          height: '100%',
          maxHeight: '100vh',
          background: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          animation: side === 'right' ? 'shadcnSheetSlideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'shadcnSheetSlideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            background: '#fafbfd'
          }}
        >
          <div>
            <h3
              className="font-serif"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.01em'
              }}
            >
              {title}
            </h3>
            {description && (
              <p
                style={{
                  fontSize: 12.5,
                  color: '#64748b',
                  margin: '4px 0 0',
                  lineHeight: 1.45
                }}
              >
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close drawer"
            title="Close (Esc)"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body - Independently scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            fontSize: 13,
            color: '#1e293b'
          }}
        >
          {children}
        </div>

        {/* Footer (Sticky at bottom) */}
        {footer && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#fafbfd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
