import React, { useState, useRef, useEffect } from 'react';
import { Plus, Upload, X, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  onAddOption?: () => void;
  onUploadCsv?: () => void;
  showAdd?: boolean;
  showUpload?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  onAddOption,
  onUploadCsv,
  showAdd = false,
  showUpload = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: SelectOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredOptions = normalizedOptions.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      {/* Searchable Select Trigger Container */}
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative', 
          flex: 1, 
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? 'none' : 'auto' 
        }}
      >
        <div 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            minHeight: 38,
            border: isOpen ? '1.5px solid var(--gold-primary, #cba135)' : '1px solid #cbd5e1',
            borderRadius: 6,
            background: disabled ? '#f8fafc' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            gap: 6,
            boxShadow: isOpen ? '0 0 0 3px rgba(203, 161, 53, 0.16)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: value ? 'var(--text-main)' : 'var(--text-muted)' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {value && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                title="Clear selection"
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 7px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.color = '#dc2626';
                  e.currentTarget.style.borderColor = '#fca5a5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                <X size={11} strokeWidth={2.5} />
                <span>Clear</span>
              </button>
            )}

            <ChevronDown size={14} color="#64748b" />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 50,
            maxHeight: 220,
            overflowY: 'auto'
          }}>
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <input 
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: 12,
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ padding: '4px 0' }}>
              {filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      background: isSelected ? '#fbf8f2' : 'transparent',
                      color: isSelected ? 'var(--gold-primary)' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: isSelected ? 600 : 400
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={14} color="var(--gold-primary)" />}
                  </div>
                );
              })}

              {filteredOptions.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (+) and (Upload) */}
      {showAdd && (
        <button
          type="button"
          onClick={onAddOption}
          title="Add New Option"
          disabled={disabled}
          style={{
            background: '#151922',
            color: 'var(--gold-primary, #cba135)',
            border: '1.5px solid var(--gold-primary, #cba135)',
            borderRadius: 6,
            width: 36,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#1e2432';
              e.currentTarget.style.borderColor = '#dfba52';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(203, 161, 53, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#151922';
              e.currentTarget.style.borderColor = 'var(--gold-primary, #cba135)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
            }
          }}
        >
          <Plus size={16} />
        </button>
      )}

      {showUpload && (
        <button
          type="button"
          onClick={onUploadCsv}
          title="Import Options from CSV"
          disabled={disabled}
          style={{
            background: '#151922',
            color: 'var(--gold-primary, #cba135)',
            border: '1.5px solid var(--gold-primary, #cba135)',
            borderRadius: 6,
            width: 36,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#1e2432';
              e.currentTarget.style.borderColor = '#dfba52';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(203, 161, 53, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#151922';
              e.currentTarget.style.borderColor = 'var(--gold-primary, #cba135)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
            }
          }}
        >
          <Upload size={15} />
        </button>
      )}
    </div>
  );
};
