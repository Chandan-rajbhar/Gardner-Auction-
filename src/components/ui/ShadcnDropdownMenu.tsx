import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Context for Compound DropdownMenu Components
// ============================================================================
interface DropdownContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  position: { top: number; left?: number; right?: number; placement: 'bottom' | 'top' };
  updatePosition: () => void;
}

const DropdownMenuContext = createContext<DropdownContextType | null>(null);

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  open: controlledOpen,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const triggerRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number; placement: 'bottom' | 'top' }>({
    top: 0,
    placement: 'bottom'
  });

  const setOpen = useCallback(
    (newVal: boolean) => {
      if (!isControlled) {
        setInternalOpen(newVal);
      }
      onOpenChange?.(newVal);
    },
    [isControlled, onOpenChange]
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 185;
    const menuHeight = 135;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight + 10 && rect.top > menuHeight;

    const top = openUpwards
      ? Math.max(10, rect.top - menuHeight - 4)
      : Math.min(window.innerHeight - menuHeight - 10, rect.bottom + 4);

    let right = window.innerWidth - rect.right;
    if (right < 8) right = 8;

    if (rect.right - menuWidth < 10) {
      setPosition({ top, left: 10, placement: openUpwards ? 'top' : 'bottom' });
    } else {
      setPosition({ top, right, placement: openUpwards ? 'top' : 'bottom' });
    }
  }, []);

  // Close when window resized
  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      setOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [open, setOpen]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, position, updatePosition }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

export interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
  asChild = false,
  className = '',
  style = {}
}) => {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error('DropdownMenuTrigger must be used within a DropdownMenu');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ctx.updatePosition();
    ctx.setOpen(!ctx.open);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.updatePosition();
      ctx.setOpen(!ctx.open);
    } else if (e.key === 'Escape' && ctx.open) {
      ctx.setOpen(false);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: ctx.triggerRef,
      onClick: (e: React.MouseEvent) => {
        (children as any).props.onClick?.(e);
        handleClick(e);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        (children as any).props.onKeyDown?.(e);
        handleKeyDown(e);
      },
      'aria-haspopup': 'menu',
      'aria-expanded': ctx.open
    });
  }

  return (
    <button
      ref={ctx.triggerRef as any}
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      className={className}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {children}
    </button>
  );
};

export interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: 'start' | 'end' | 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  align = 'end',
  className = '',
  style = {}
}) => {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error('DropdownMenuContent must be used within a DropdownMenu');

  const contentRef = useRef<HTMLDivElement>(null);

  // Close on outside click & escape (delayed slightly to avoid closing immediately on trigger click)
  useEffect(() => {
    if (!ctx.open) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        contentRef.current &&
        !contentRef.current.contains(target) &&
        ctx.triggerRef.current &&
        !ctx.triggerRef.current.contains(target)
      ) {
        ctx.setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ctx.setOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 20);

    document.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [ctx]);

  if (!ctx.open) return null;

  const content = (
    <div
      ref={contentRef}
      role="menu"
      id="af360-dropdown-menu-content"
      className={`shadcn-dropdown-content ${className}`}
      style={{
        position: 'fixed',
        top: ctx.position.top,
        ...(ctx.position.right !== undefined ? { right: ctx.position.right } : { left: ctx.position.left }),
        minWidth: 180,
        background: '#ffffff',
        borderRadius: 6,
        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.16), 0 4px 8px -2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        border: '1px solid #e2e8f0',
        padding: '5px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        animation: 'af360MenuFadeIn 0.12s ease-out',
        ...style
      }}
    >
      <style>{`
        @keyframes af360MenuFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {children}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};

export interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  disabled = false,
  destructive = false,
  className = '',
  style = {}
}) => {
  const ctx = useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onClick?.(e);
    ctx?.setOpen(false);
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={`shadcn-dropdown-item ${destructive ? 'destructive' : ''} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 12px',
        borderRadius: 4,
        border: 'none',
        background: 'transparent',
        color: destructive ? '#dc2626' : 'var(--text-main, #0f172a)',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.03em',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.12s ease, color 0.12s ease',
        outline: 'none',
        textTransform: 'uppercase',
        ...style
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = destructive ? '#fef2f2' : 'rgba(163, 122, 59, 0.08)';
        if (!destructive) e.currentTarget.style.color = 'var(--gold-dark, #8c6428)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = destructive ? '#dc2626' : 'var(--text-main, #0f172a)';
      }}
    >
      {children}
    </button>
  );
};

// ============================================================================
// Original ShadcnDropdownMenu interface preserved for compatibility
// ============================================================================
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
