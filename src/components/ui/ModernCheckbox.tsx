import React from 'react';
import { Check } from 'lucide-react';

export interface ModernCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'card' | 'switch' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const ModernCheckbox: React.FC<ModernCheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  badge,
  icon,
  variant = 'default',
  size = 'md',
  disabled = false,
  id,
  className = ''
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  if (variant === 'switch') {
    return (
      <div
        id={id}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`modern-switch-wrapper ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''} size-${size} ${className}`}
      >
        <div className="modern-switch-track">
          <div className="modern-switch-thumb" />
        </div>
        {(label || description) && (
          <div className="modern-switch-labels">
            {label && <span className="modern-switch-label">{label}</span>}
            {description && <span className="modern-switch-desc">{description}</span>}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        id={id}
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`modern-checkbox-card ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''} size-${size} ${className}`}
      >
        <div className="modern-checkbox-box">
          <Check size={size === 'sm' ? 12 : 14} strokeWidth={3} className="modern-check-icon" />
        </div>

        {icon && <div className="modern-checkbox-card-icon">{icon}</div>}

        <div className="modern-checkbox-content">
          <div className="modern-checkbox-title-row">
            {label && <span className="modern-checkbox-label">{label}</span>}
            {badge && <span className="modern-checkbox-badge">{badge}</span>}
          </div>
          {description && <span className="modern-checkbox-desc">{description}</span>}
        </div>
      </div>
    );
  }

  return (
    <label
      id={id}
      className={`modern-checkbox-root ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''} size-${size} ${className}`}
      onClick={handleClick}
    >
      <div
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className="modern-checkbox-box"
      >
        <Check size={size === 'sm' ? 11 : 13} strokeWidth={3} className="modern-check-icon" />
      </div>

      {(label || description || badge) && (
        <div className="modern-checkbox-content">
          <div className="modern-checkbox-title-row">
            {label && <span className="modern-checkbox-label">{label}</span>}
            {badge && <span className="modern-checkbox-badge">{badge}</span>}
          </div>
          {description && <span className="modern-checkbox-desc">{description}</span>}
        </div>
      )}
    </label>
  );
};
