import React from 'react';

export interface ModernRadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ModernRadioProps {
  checked: boolean;
  onChange: () => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'card';
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const ModernRadio: React.FC<ModernRadioProps> = ({
  checked,
  onChange,
  label,
  description,
  badge,
  icon,
  variant = 'default',
  disabled = false,
  id,
  className = ''
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    onChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange();
    }
  };

  if (variant === 'card') {
    return (
      <div
        id={id}
        role="radio"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`modern-radio-card ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      >
        <div className="modern-radio-circle">
          <div className="modern-radio-dot" />
        </div>

        {icon && <div className="modern-radio-card-icon">{icon}</div>}

        <div className="modern-radio-content">
          <div className="modern-radio-title-row">
            {label && <span className="modern-radio-label">{label}</span>}
            {badge && <span className="modern-radio-badge">{badge}</span>}
          </div>
          {description && <span className="modern-radio-desc">{description}</span>}
        </div>
      </div>
    );
  }

  return (
    <label
      id={id}
      className={`modern-radio-root ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      onClick={handleClick}
    >
      <div
        role="radio"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className="modern-radio-circle"
      >
        <div className="modern-radio-dot" />
      </div>

      {(label || description || badge) && (
        <div className="modern-radio-content">
          <div className="modern-radio-title-row">
            {label && <span className="modern-radio-label">{label}</span>}
            {badge && <span className="modern-radio-badge">{badge}</span>}
          </div>
          {description && <span className="modern-radio-desc">{description}</span>}
        </div>
      )}
    </label>
  );
};

export interface ModernRadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: ModernRadioOption[];
  variant?: 'default' | 'card' | 'inline';
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const ModernRadioGroup: React.FC<ModernRadioGroupProps> = ({
  value,
  onChange,
  options,
  variant = 'default',
  columns,
  className = ''
}) => {
  const gridStyle: React.CSSProperties = columns
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: '10px'
      }
    : variant === 'inline'
    ? {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      };

  return (
    <div className={`modern-radio-group ${className}`} style={gridStyle}>
      {options.map((opt) => (
        <ModernRadio
          key={opt.value}
          checked={value === opt.value}
          onChange={() => !opt.disabled && onChange(opt.value)}
          label={opt.label}
          description={opt.description}
          badge={opt.badge}
          icon={opt.icon}
          variant={variant === 'card' ? 'card' : 'default'}
          disabled={opt.disabled}
        />
      ))}
    </div>
  );
};
