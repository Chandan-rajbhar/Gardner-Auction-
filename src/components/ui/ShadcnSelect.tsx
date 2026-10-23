import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Check, Search, Plus, X } from 'lucide-react';

export interface ShadcnSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface ShadcnSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ShadcnSelectOption[];
  placeholder?: string;
  prefixIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  id?: string;
  align?: 'left' | 'right';
  variant?: 'default' | 'subtle' | 'gold';
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  fullWidth?: boolean;
  showAdd?: boolean;
  onAddOption?: () => void;
  addOptionLabel?: string;
  style?: React.CSSProperties;
}

export const ShadcnSelect: React.FC<ShadcnSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  prefixIcon,
  size = 'md',
  disabled = false,
  className = '',
  ariaLabel,
  id,
  align = 'left',
  variant = 'default',
  searchable = false,
  searchPlaceholder = 'Search options...',
  clearable = false,
  fullWidth = false,
  showAdd = false,
  onAddOption,
  addOptionLabel = 'Add New Option',
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen, searchable]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setIsOpen(true);
          const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
          setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
            return filteredOptions[next]?.disabled ? (next < filteredOptions.length - 1 ? next + 1 : 0) : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
            return filteredOptions[next]?.disabled ? (next > 0 ? next - 1 : filteredOptions.length - 1) : next;
          });
          break;
        case 'Enter':
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
            e.preventDefault();
            onChange(filteredOptions[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Tab':
          setIsOpen(false);
          break;
        default:
          break;
      }
    },
    [disabled, isOpen, filteredOptions, value, highlightedIndex, onChange]
  );

  const handleSelect = (option: ShadcnSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div
      ref={containerRef}
      className={`shadcn-select-root ${className} ${disabled ? 'is-disabled' : ''} ${isOpen ? 'is-open' : ''} ${
        fullWidth ? 'is-full-width' : ''
      } size-${size} variant-${variant}`}
      id={id}
      style={fullWidth ? { width: '100%', ...style } : style}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button (shadcn SelectTrigger) */}
      <button
        type="button"
        className="shadcn-select-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
      >
        <div className="shadcn-select-value-wrap">
          {prefixIcon && <span className="shadcn-select-prefix-icon">{prefixIcon}</span>}
          {selectedOption ? (
            <span className="shadcn-select-value-text">
              {selectedOption.icon && <span className="option-icon">{selectedOption.icon}</span>}
              <span className="option-text">{selectedOption.label}</span>
              {selectedOption.badge && <span className="option-inline-badge">{selectedOption.badge}</span>}
            </span>
          ) : (
            <span className="shadcn-select-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="shadcn-select-actions-wrap">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="shadcn-select-clear-btn"
              onClick={handleClear}
              title="Clear selection"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={size === 'sm' ? 14 : 16}
            className={`shadcn-select-chevron ${isOpen ? 'is-rotated' : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Popover Content (shadcn SelectContent) */}
      {isOpen && (
        <div
          ref={listboxRef}
          className={`shadcn-select-content align-${align} ${fullWidth ? 'is-full-width' : ''}`}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel || 'Options'}
        >
          {/* Optional Search Bar */}
          {searchable && (
            <div className="shadcn-select-search-wrap" onClick={(e) => e.stopPropagation()}>
              <Search size={14} className="shadcn-select-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="shadcn-select-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="shadcn-select-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Options Viewport */}
          <div className="shadcn-select-viewport">
            {filteredOptions.length === 0 ? (
              <div className="shadcn-select-empty-msg">No options found</div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = option.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    className={`shadcn-select-item ${isSelected ? 'is-selected' : ''} ${
                      isHighlighted ? 'is-highlighted' : ''
                    } ${option.disabled ? 'is-disabled' : ''}`}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <div className="shadcn-select-item-content">
                      {option.icon && <span className="option-item-icon">{option.icon}</span>}
                      <div className="option-item-text-group">
                        <span className="option-item-label">{option.label}</span>
                        {option.description && (
                          <span className="option-item-desc">{option.description}</span>
                        )}
                      </div>
                      {option.badge && <span className="option-item-badge">{option.badge}</span>}
                    </div>

                    {isSelected && (
                      <span className="shadcn-select-check-icon" aria-hidden="true">
                        <Check size={14} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Optional Add Option Footer */}
          {showAdd && onAddOption && (
            <div className="shadcn-select-add-footer">
              <button
                type="button"
                className="shadcn-select-add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onAddOption();
                }}
              >
                <Plus size={14} />
                <span>{addOptionLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
