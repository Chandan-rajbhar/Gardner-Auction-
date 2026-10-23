import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface TableActionItem {
  label: string;
  icon?: React.ReactNode | React.ElementType;
  onClick: () => void;
  destructive?: boolean;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface TableRowActionMenuProps {
  actions: TableActionItem[];
  ariaLabel?: string;
}

export const TableRowActionMenu: React.FC<TableRowActionMenuProps> = ({
  actions,
  ariaLabel = 'Row actions'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = actions.length * 38 + 14;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = openUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setCoords({ top, left });
  }, [actions.length]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`btn-three-dots ${isOpen ? 'active' : ''}`}
        onClick={toggleOpen}
        onMouseDown={(e) => e.stopPropagation()}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        title="More actions"
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: isOpen ? '#f1f5f9' : 'transparent',
          border: '1px solid',
          borderColor: isOpen ? '#cbd5e1' : 'transparent',
          color: isOpen ? '#0f172a' : '#64748b',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: 190,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.14), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            padding: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 99999,
            animation: 'dropdownIn 0.15s ease-out'
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {actions.map((action, idx) => {
            const isDestructive = Boolean(action.destructive || action.variant === 'destructive');
            
            const renderIcon = () => {
              if (!action.icon) return null;
              if (React.isValidElement(action.icon)) {
                return action.icon;
              }
              const IconComp = action.icon as React.ElementType;
              return (
                <IconComp
                  size={14}
                  style={{
                    color: isDestructive ? '#ef4444' : '#64748b',
                    flexShrink: 0
                  }}
                />
              );
            };

            return (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                className={`dropdown-action-item ${isDestructive ? 'destructive' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: isDestructive ? '#ef4444' : action.disabled ? '#94a3b8' : '#334155',
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!action.disabled) {
                    e.currentTarget.style.background = isDestructive ? '#fef2f2' : '#f8fafc';
                    e.currentTarget.style.color = isDestructive ? '#dc2626' : '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isDestructive ? '#ef4444' : action.disabled ? '#94a3b8' : '#334155';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsOpen(false);
                  action.onClick();
                }}
              >
                {renderIcon()}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
