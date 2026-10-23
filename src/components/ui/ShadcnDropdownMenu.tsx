import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ShadcnDropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  badge?: string | number;
}

export interface ShadcnDropdownMenuGroup {
  label?: string;
  items: ShadcnDropdownMenuItem[];
}

export interface ShadcnDropdownMenuProps {
  trigger: React.ReactNode;
  groups?: ShadcnDropdownMenuGroup[];
  children?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  contentClassName?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ShadcnDropdownMenu: React.FC<ShadcnDropdownMenuProps> = ({
  trigger,
  groups,
  children,
  align = 'left',
  className = '',
  contentClassName = '',
  isOpen: controlledIsOpen,
  onOpenChange
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalIsOpen;

  const containerRef = useRef<HTMLDivElement>(null);

  const setOpen = useCallback(
    (newVal: boolean) => {
      if (!isControlled) {
        setInternalIsOpen(newVal);
      }
      onOpenChange?.(newVal);
    },
    [isControlled, onOpenChange]
  );

  // Close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [open, setOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, setOpen]);

  return (
    <div ref={containerRef} className={`shadcn-dropdown-root ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <div 
        onClick={() => setOpen(!open)}
        role="button"
        aria-haspopup="menu"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        style={{ display: 'inline-block', outline: 'none' }}
      >
        {trigger}
      </div>

      {open && (
        <div 
          className={`shadcn-dropdown-content align-${align} ${contentClassName}`}
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 100
          }}
        >
          {children ? (
            children
          ) : (
            groups?.map((group, groupIdx) => (
              <React.Fragment key={groupIdx}>
                {group.label && (
                  <div className="shadcn-dropdown-label">
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick?.();
                        setOpen(false);
                      }
                    }}
                    className={`shadcn-dropdown-item ${item.destructive ? 'destructive' : ''} ${item.disabled ? 'is-disabled' : ''}`}
                    role="menuitem"
                  >
                    {item.icon && <span className="shadcn-dropdown-item-icon">{item.icon}</span>}
                    <span className="shadcn-dropdown-item-label">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="shadcn-dropdown-item-badge">{item.badge}</span>
                    )}
                  </button>
                ))}
                {groupIdx < (groups.length - 1) && (
                  <div className="shadcn-dropdown-separator" />
                )}
              </React.Fragment>
            ))
          )}
        </div>
      )}
    </div>
  );
};
