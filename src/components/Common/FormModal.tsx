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
  maxWidth = 520,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const content = (
    <div 
      className="modal-content" 
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth }}
    >
      <div className="modal-header">
        <h3 className="font-serif" style={{ fontSize: 18, color: 'var(--text-main)', margin: 0 }}>
          {title}
        </h3>
        <button 
          type="button" 
          className="icon-btn" 
          onClick={onClose}
          aria-label="Close"
          disabled={isLoading}
        >
          <X size={18} />
        </button>
      </div>

      <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
        {children}
      </div>

      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
        {onSubmit && (
          <button 
            type="submit" 
            className="btn btn-gold"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : submitLabel}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 90 }}>
      {onSubmit ? (
        <form onSubmit={onSubmit} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {content}
        </form>
      ) : (
        content
      )}
    </div>
  );
};
