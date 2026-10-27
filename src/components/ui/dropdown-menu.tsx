import React from 'react';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  type DropdownMenuProps,
  type DropdownMenuTriggerProps,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps
} from './ShadcnDropdownMenu';

export const DropdownMenuSeparator: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ 
  className = '', 
  style = {} 
}) => (
  <div 
    className={`shadcn-dropdown-separator ${className}`}
    role="separator" 
    style={{ 
      height: 1, 
      backgroundColor: 'var(--border-subtle, #e2e8f0)', 
      margin: '4px 0', 
      ...style 
    }} 
  />
);
