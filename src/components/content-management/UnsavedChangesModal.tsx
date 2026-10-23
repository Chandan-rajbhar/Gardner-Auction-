import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X, ArrowLeft, Trash2 } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  sectionName: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  sectionName,
  onKeepEditing,
  onDiscard
}) => {
  const keepEditingButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: Escape to Keep Editing & autofocus default action
  useEffect(() => {
    if (!isOpen) return;

    // Focus safe action by default
    const timer = setTimeout(() => {
      keepEditingButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onKeepEditing();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onKeepEditing]);

  if (!isOpen) return null;

  return (
    <div
      className="unsaved-modal-overlay"
      onClick={onKeepEditing}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
    >
      <div
        className="unsaved-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="unsaved-modal-header">
          <div className="unsaved-modal-title-group">
            <div className="unsaved-modal-icon-box">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 id="unsaved-modal-title" className="unsaved-modal-title">
                Unsaved Changes
              </h3>
              <p className="unsaved-modal-subtitle">
                Warning • Unsaved edits detected
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onKeepEditing}
            title="Keep editing and close warning"
            aria-label="Keep editing"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="unsaved-modal-body">
          <p className="unsaved-modal-message">
            You have unsaved changes to the <strong>{sectionName}</strong>. Do you want to discard your edits?
          </p>

          <div className="unsaved-modal-callout">
            <span>
              Discarding will undo any modifications made during this editing session and restore the last saved database values.
            </span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="unsaved-modal-footer">
          <button
            type="button"
            ref={keepEditingButtonRef}
            className="unsaved-btn-keep"
            onClick={onKeepEditing}
          >
            <ArrowLeft size={14} />
            <span>Keep Editing</span>
          </button>
          <button
            type="button"
            className="unsaved-btn-discard"
            onClick={onDiscard}
          >
            <Trash2 size={14} />
            <span>Discard Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
