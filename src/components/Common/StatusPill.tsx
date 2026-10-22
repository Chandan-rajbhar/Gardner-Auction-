import React from 'react';

interface StatusPillProps {
  status: string;
  type?: 'status' | 'category' | 'reserve';
  style?: React.CSSProperties;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  type = 'status',
  style
}) => {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');

  let badgeClass = 'badge';

  if (type === 'category') {
    return (
      <span className="badge badge-category" style={style}>
        {status}
      </span>
    );
  }

  if (type === 'reserve') {
    const isMet = normalized.includes('met');
    return (
      <span className={`badge ${isMet ? 'badge-reserve-met' : 'badge-reserve-under'}`} style={style}>
        {status}
      </span>
    );
  }

  // General Status
  if (normalized.includes('open') || normalized.includes('live') || normalized.includes('on_block')) {
    badgeClass = 'badge badge-live';
  } else if (normalized.includes('progress')) {
    badgeClass = 'badge badge-in-progress';
  } else if (normalized.includes('closed') || normalized.includes('sold') || normalized.includes('paid')) {
    badgeClass = 'badge badge-closed';
  } else if (normalized.includes('preview') || normalized.includes('upcoming')) {
    badgeClass = 'badge badge-preview';
  } else if (normalized.includes('pending')) {
    badgeClass = 'badge badge-pending';
  }

  const defaultStatusStyle: React.CSSProperties = type === 'status' ? {
    width: '108px',
    minWidth: '108px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box'
  } : {};

  return (
    <span className={badgeClass} style={{ ...defaultStatusStyle, ...style }}>
      {status}
    </span>
  );
};
