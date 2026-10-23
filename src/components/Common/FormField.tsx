import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  inline?: boolean;
  style?: React.CSSProperties;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  children,
  inline = false,
  style
}) => {
  // Strip any trailing asterisk from label string to avoid double asterisks "* *"
  const hasAsteriskInLabel = label.trim().endsWith('*');
  const cleanLabel = hasAsteriskInLabel ? label.replace(/\s*\*+\s*$/, '').trim() : label.trim();
  const showRequired = required || hasAsteriskInLabel;

  return (
    <div 
      className="form-group" 
      style={{ 
        display: inline ? 'flex' : 'block', 
        alignItems: inline ? 'center' : undefined,
        gap: inline ? 12 : undefined,
        marginBottom: 12,
        ...style 
      }}
    >
      <label style={{ 
        display: 'block', 
        fontSize: 11.5, 
        fontWeight: 700, 
        color: '#475569', 
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        marginBottom: inline ? 0 : 5,
        minWidth: inline ? 140 : undefined
      }}>
        {cleanLabel} {showRequired && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ flex: 1, width: '100%' }}>
        {children}
        {hint && !error && (
          <p style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 0' }}>{hint}</p>
        )}
        {error && (
          <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>{error}</p>
        )}
      </div>
    </div>
  );
};
