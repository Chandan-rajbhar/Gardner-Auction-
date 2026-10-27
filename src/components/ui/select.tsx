import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { ShadcnSelect, ShadcnSelectOption, ShadcnSelectProps } from './ShadcnSelect';

// Re-export ShadcnSelect and types
export { ShadcnSelect };
export type { ShadcnSelectOption, ShadcnSelectProps };

// ============================================================================
// Composable shadcn/ui Select Components
// (Select, SelectTrigger, SelectValue, SelectContent, SelectItem)
// ============================================================================

interface SelectContextType {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
}

const SelectContext = createContext<SelectContextType | null>(null);

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  children,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: (v) => {
          onValueChange(v);
          setOpen(false);
        },
        open: disabled ? false : open,
        setOpen: disabled ? () => {} : setOpen,
        triggerRef,
        selectedLabel,
        setSelectedLabel
      }}
    >
      <div 
        ref={containerRef} 
        className={`shadcn-select-root ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  className = '',
  children,
  style,
  ...props
}) => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      ref={ctx.triggerRef}
      type="button"
      className={`shadcn-select-trigger ${className}`}
      onClick={() => ctx.setOpen(!ctx.open)}
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        minWidth: 160,
        height: 36,
        padding: '0 12px',
        fontSize: 13,
        fontWeight: 500,
        borderRadius: 6,
        border: '1px solid var(--border-subtle, #cbd5e1)',
        background: '#ffffff',
        color: 'var(--text-main, #0f172a)',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.15s ease',
        ...style
      }}
      {...props}
    >
      <div className="shadcn-select-value-wrap" style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        {children}
      </div>
      <ChevronDown
        size={14}
        className={`shadcn-select-chevron ${ctx.open ? 'is-rotated' : ''}`}
        style={{
          color: '#64748b',
          transition: 'transform 0.2s ease',
          transform: ctx.open ? 'rotate(180deg)' : 'none',
          flexShrink: 0
        }}
      />
    </button>
  );
};

export interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder = 'Select...' }) => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('SelectValue must be used within Select');

  return (
    <span 
      className="shadcn-select-value-text"
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: ctx.selectedLabel ? 'var(--text-main, #0f172a)' : '#94a3b8',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}
    >
      {ctx.selectedLabel || placeholder}
    </span>
  );
};

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = '',
  align = 'left',
  style
}) => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('SelectContent must be used within Select');

  if (!ctx.open) return null;

  return (
    <div
      className={`shadcn-select-content align-${align} ${className}`}
      role="listbox"
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        [align === 'right' ? 'right' : 'left']: 0,
        zIndex: 1050,
        minWidth: '100%',
        width: 'max-content',
        maxWidth: 320,
        maxHeight: 260,
        overflowY: 'auto',
        background: '#ffffff',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: 8,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: 4,
        ...style
      }}
    >
      <div className="shadcn-select-viewport" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </div>
    </div>
  );
};

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  disabled = false,
  className = ''
}) => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('SelectItem must be used within Select');

  const isSelected = ctx.value === value;

  // Sync selected label to context if this item is selected
  useEffect(() => {
    if (isSelected && typeof children === 'string') {
      ctx.setSelectedLabel(children);
    }
  }, [isSelected, children]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      className={`shadcn-select-item ${isSelected ? 'is-selected' : ''} ${className}`}
      onClick={() => {
        if (!disabled) {
          if (typeof children === 'string') {
            ctx.setSelectedLabel(children);
          }
          ctx.onValueChange(value);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '7px 10px',
        fontSize: 13,
        borderRadius: 5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isSelected ? 'rgba(203, 161, 53, 0.1)' : 'transparent',
        color: isSelected ? 'var(--gold-bright, #b45309)' : (disabled ? '#cbd5e1' : 'var(--text-main, #1e293b)'),
        fontWeight: isSelected ? 600 : 400,
        transition: 'background 0.15s ease',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isSelected) {
          e.currentTarget.style.background = '#f8fafc';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isSelected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      {isSelected && (
        <Check size={14} style={{ color: 'var(--gold-bright, #b45309)', flexShrink: 0 }} />
      )}
    </div>
  );
};
