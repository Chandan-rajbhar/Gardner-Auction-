import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  valueColor?: string;
  isLink?: boolean;
  linkUrl?: string;
  linkText?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  valueColor = 'var(--text-main)',
  isLink = false,
  linkUrl,
  linkText = 'View on HiBid ↗',
  onClick
}) => {
  if (isLink) {
    return (
      <div 
        className="metric-card-af360" 
        style={{ cursor: 'pointer', background: '#fcfbf9' }}
        onClick={() => {
          if (linkUrl) window.open(linkUrl, '_blank', 'noreferrer');
          if (onClick) onClick();
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
              {label}
            </span>
            {Icon && <Icon size={16} color="var(--gold-primary)" />}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {linkText}
            </div>
            {subtext && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{subtext}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card-af360">
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            {label}
          </span>
          {Icon && <Icon size={16} color="var(--gold-primary)" />}
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: 20, 
            fontWeight: 700, 
            color: valueColor,
            lineHeight: 1.2
          }}>
            {value}
          </div>
          {subtext && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{subtext}</div>}
        </div>
      </div>
    </div>
  );
};
