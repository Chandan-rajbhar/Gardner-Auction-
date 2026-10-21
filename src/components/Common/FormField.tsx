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
  return (
    <div 
      className="form-group" 
      style={{ 
        display: inline ? 'flex' : 'block', 
        alignItems: inline ? 'center' : undefined,
        gap: inline ? 12 : undefined,
        marginBottom: 14,
        ...style 
      }}
    >
      <label style={{ 
        display: 'block', 
        fontSize: 12.5, 
        fontWeight: 600, 
        color: 'var(--text-main)', 
        marginBottom: inline ? 0 : 6,
        minWidth: inline ? 140 : undefined
      }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <div style={{ flex: 1, width: '100%' }}>
        {children}
        {hint && !error && (
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '4px 0 0' }}>{hint}</p>
        )}
        {error && (
          <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 0 0', fontWeight: 500 }}>{error}</p>
        )}
      </div>
    </div>
  );
};
