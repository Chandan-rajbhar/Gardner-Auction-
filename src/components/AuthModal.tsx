import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [paddleOrPass, setPaddleOrPass] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = mode === 'signin' ? (email.split('@')[0] || 'Collector') : fullName || 'New Collector';
    onLoginSuccess(displayName);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-titles">
            <span className="modal-tag">PA LICENSED BIDDER PORTAL</span>
            <h3 className="modal-title">
              {mode === 'signin' ? 'Sign In to Your Bidder Account' : 'Register for Live Webcast Bidding'}
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Mode Switcher Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              New Bidder Approval
            </button>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Legal Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Robert J. Sterling"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="bidder@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {mode === 'signin' ? 'Password or Paddle PIN *' : 'Create Secure Password *'}
            </label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={paddleOrPass}
              onChange={(e) => setPaddleOrPass(e.target.value)}
            />
          </div>

          {mode === 'register' && (
            <div className="bid-security-notice" style={{ marginTop: '12px' }}>
              <UserCheck size={14} className="gold-icon" />
              <span>Identity verified via instant PA Bureau of Professional &amp; Occupational Affairs database</span>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn-confirm-bid">
              <KeyRound size={17} />
              <span>{mode === 'signin' ? 'ACCESS BIDDER CONSOLE' : 'REQUEST INSTANT APPROVAL'}</span>
            </button>
          </div>

          <div className="bid-security-notice">
            <ShieldCheck size={14} className="gold-icon" />
            <span>Fiduciary discretion guaranteed under Pennsylvania Auctioneer Licensure Code</span>
          </div>
        </form>
      </div>
    </div>
  );
};
