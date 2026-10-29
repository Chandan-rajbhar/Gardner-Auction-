import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary] Caught component error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px 24px',
          margin: '20px auto',
          maxWidth: 600,
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #fed7aa',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#ffedd5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} color="#ea580c" />
          </div>

          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            {this.props.fallbackMessage || 'Something went wrong displaying this section'}
          </h3>

          <p style={{ margin: 0, fontSize: 13, color: '#64748b', maxWidth: 440, lineHeight: 1.5 }}>
            An unexpected error occurred while rendering this component. You can reload this section to continue.
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: 6,
              padding: '8px 18px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <RefreshCw size={14} />
            <span>Reload View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

