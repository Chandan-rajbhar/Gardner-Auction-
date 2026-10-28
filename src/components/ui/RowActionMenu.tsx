import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface RowActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  buttonId?: string;
}

export const RowActionMenu: React.FC<RowActionMenuProps> = ({
  items,
  ariaLabel = 'Row actions menu',
  buttonId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 175;
    const menuHeight = items.length * 38 + 12;

    // Check if dropdown goes below the viewport
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight + 10 && rect.top > menuHeight;

    const top = openUpwards 
      ? Math.max(10, rect.top - menuHeight - 4) 
      : Math.min(window.innerHeight - menuHeight - 10, rect.bottom + 4);

    // Align right with the trigger button
    let right = window.innerWidth - rect.right;
    if (right < 10) right = 10;
    if (rect.right - menuWidth < 10) {
      // If it would overflow left, align left
      setMenuPosition({ top, left: 10 });
    } else {
      setMenuPosition({ top, right });
    }
  }, [items.length]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current && 
        !menuRef.current.contains(target) && 
        triggerRef.current && 
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: menuPosition.top,
        ...(menuPosition.right !== undefined ? { right: menuPosition.right } : { left: menuPosition.left }),
        width: 175,
        background: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        padding: '5px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        animation: 'fadeInMenu 0.12s ease-out'
      }}
    >
      <style>{`
        @keyframes fadeInMenu {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {items.map((item, idx) => {
        const isDanger = item.variant === 'danger';

        return (
          <button
            key={idx}
            role="menuitem"
            type="button"
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              item.onClick();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: isDanger ? '#dc2626' : '#1e293b',
              fontSize: 12.5,
              fontWeight: 600,
              textAlign: 'left',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.45 : 1,
              transition: 'background 0.12s ease, color 0.12s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              if (item.disabled) return;
              if (isDanger) {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.color = '#b91c1c';
              } else {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#0f172a';
              }
            }}
            onMouseLeave={(e) => {
              if (item.disabled) return;
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = isDanger ? '#dc2626' : '#1e293b';
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: isDanger ? '#dc2626' : '#64748b'
            }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        id={buttonId}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={toggleOpen}
        style={{
          width: 32,
          height: 32,
          padding: 0,
          borderRadius: 6,
          background: isOpen ? '#f1f5f9' : 'transparent',
          border: '1px solid',
          borderColor: isOpen ? '#cbd5e1' : '#e2e8f0',
          color: isOpen ? '#0f172a' : '#475569',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(15, 23, 42, 0.08)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#94a3b8';
            e.currentTarget.style.color = '#0f172a';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#475569';
          }
        }}
      >
        <MoreVertical size={16} strokeWidth={2.2} />
      </button>

      {typeof document !== 'undefined' && menuContent ? createPortal(menuContent, document.body) : null}
    </div>
  );
};
