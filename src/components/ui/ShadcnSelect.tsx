import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface ShadcnSelectOption {
  value: string;
  label: string;
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
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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
          const currentIndex = options.findIndex((opt) => opt.value === value);
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
            const next = prev < options.length - 1 ? prev + 1 : 0;
            return options[next]?.disabled ? (next < options.length - 1 ? next + 1 : 0) : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : options.length - 1;
            return options[next]?.disabled ? (next > 0 ? next - 1 : options.length - 1) : next;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (highlightedIndex >= 0 && options[highlightedIndex] && !options[highlightedIndex].disabled) {
            onChange(options[highlightedIndex].value);
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
    [disabled, isOpen, options, value, highlightedIndex, onChange]
  );

  const handleSelect = (option: ShadcnSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`shadcn-select-root ${className} ${disabled ? 'is-disabled' : ''} ${isOpen ? 'is-open' : ''} size-${size} variant-${variant}`}
      id={id}
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
            </span>
          ) : (
            <span className="shadcn-select-placeholder">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`shadcn-select-chevron ${isOpen ? 'is-rotated' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Popover Content (shadcn SelectContent) */}
      {isOpen && (
        <div
          ref={listboxRef}
          className={`shadcn-select-content align-${align}`}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel || 'Options'}
        >
          <div className="shadcn-select-viewport">
            {options.map((option, idx) => {
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
                    <span className="option-item-label">{option.label}</span>
                    {option.badge && <span className="option-item-badge">{option.badge}</span>}
                  </div>

                  {isSelected && (
                    <span className="shadcn-select-check-icon" aria-hidden="true">
                      <Check size={14} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
