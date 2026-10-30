import React from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 420,
        width: 'calc(100vw - 40px)',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .af360-toast-card {
          animation: toastSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 size={19} style={{ color: '#10b981', flexShrink: 0 }} />;
            case 'warning':
              return <AlertTriangle size={19} style={{ color: '#f59e0b', flexShrink: 0 }} />;
            case 'error':
              return <AlertCircle size={19} style={{ color: '#ef4444', flexShrink: 0 }} />;
            default:
              return <Info size={19} style={{ color: '#cba135', flexShrink: 0 }} />;
          }
        };

        const getBorderColor = () => {
          switch (toast.type) {
            case 'success':
              return '#10b981';
            case 'error':
              return '#ef4444';
            case 'warning':
              return '#f59e0b';
            default:
              return '#cba135';
          }
        };

        return (
          <div
            key={toast.id}
            className={`af360-toast-card toast-card toast-${toast.type}`}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '13px 16px',
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              borderLeft: `5px solid ${getBorderColor()}`,
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.16), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ paddingTop: 1 }}>{getIcon()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: '#475569', marginTop: 3, lineHeight: 1.4, wordBreak: 'break-word' }}>
                {toast.message}
              </div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss toast"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                marginTop: 1,
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
