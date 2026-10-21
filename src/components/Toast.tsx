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
    <div className="toast-container" style={{ zIndex: 99999 }}>
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 size={18} className="toast-icon-success" style={{ color: '#10b981' }} />;
            case 'warning':
              return <AlertTriangle size={18} className="toast-icon-warning" style={{ color: '#f59e0b' }} />;
            case 'error':
              return <AlertCircle size={18} className="toast-icon-error" style={{ color: '#ef4444' }} />;
            default:
              return <Info size={18} className="toast-icon-info" style={{ color: '#dfba52' }} />;
          }
        };

        const getBorderColor = () => {
          switch (toast.type) {
            case 'success':
              return 'rgba(16, 185, 129, 0.45)';
            case 'error':
              return 'rgba(239, 68, 68, 0.5)';
            case 'warning':
              return 'rgba(245, 158, 11, 0.45)';
            default:
              return 'rgba(203, 161, 53, 0.4)';
          }
        };

        return (
          <div 
            key={toast.id} 
            className={`toast-card toast-${toast.type}`}
            style={{ borderColor: getBorderColor() }}
          >
            <div className="toast-icon-col">{getIcon()}</div>
            <div className="toast-text-col">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss toast"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
