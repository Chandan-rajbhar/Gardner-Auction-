import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

export interface ColumnItem {
  key: string;
  label: string;
  visible: boolean;
}

interface SelectColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  onSave: (updated: ColumnItem[]) => void;
}

export const SelectColumnsModal: React.FC<SelectColumnsModalProps> = ({
  isOpen,
  onClose,
  columns,
  onSave
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnItem[]>(columns);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalColumns([...columns]);
    }
  }, [isOpen, columns]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    setLocalColumns(prev =>
      prev.map(col =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localColumns);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 6,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'selectColFadeIn 0.15s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes selectColFadeIn {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 14px'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: '#334155'
            }}
          >
            Select Columns
          </h2>

          <button
            type="button"
            onClick={onClose}
            id="btn-close-column-modal"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Checkbox List */}
        <form onSubmit={handleSave} style={{ padding: '8px 24px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {localColumns.map((col) => (
              <label
                key={col.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: '#1e293b',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(col.key)}
                  id={`col-toggle-${col.key}`}
                  style={{
                    width: 17,
                    height: 17,
                    accentColor: '#0f172a',
                    cursor: 'pointer',
                    borderRadius: 3
                  }}
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>

          {/* Footer Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 26,
              paddingTop: 8
            }}
          >
            <button
              type="submit"
              id="btn-save-column-config"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #0f172a',
                borderRadius: 4,
                padding: '0 18px',
                height: 36,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.05))',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e293b';
                e.currentTarget.style.borderColor = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0f172a';
                e.currentTarget.style.borderColor = '#0f172a';
              }}
            >
              <Save size={15} />
              <span>SAVE</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              id="btn-cancel-column-config"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                padding: '6px 12px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748b';
              }}
            >
              CLOSE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
