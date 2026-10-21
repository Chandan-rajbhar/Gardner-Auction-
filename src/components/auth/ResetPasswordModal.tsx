import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in both password fields.');
      return;
    }

    if (!hasMinLength) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(newPassword);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to update password. Your recovery link may have expired.');
    } else {
      setSuccessMessage(result.message || 'Password successfully updated.');
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-modal-crest">
            <Lock size={20} color="#cba135" />
          </div>
          <div>
            <h3 className="auth-modal-title">Set New Password</h3>
            <p className="auth-modal-subtitle">Update your secure bidder credentials</p>
          </div>
        </div>

        {successMessage ? (
          <div className="auth-reset-success-box">
            <div className="auth-reset-success-icon">
              <CheckCircle2 size={34} color="#059669" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f5f6f9', margin: '12px 0 6px' }}>
              Password Updated Successfully
            </h4>
            <p style={{ fontSize: 13, color: '#b5b9c4', lineHeight: 1.5, marginBottom: 18 }}>
              {successMessage}
            </p>
            <button 
              className="btn-auth-primary" 
              type="button" 
              onClick={onClose}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <span>Continue to Saleroom</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-modal-body" noValidate>
            {errorMessage && (
              <div className="auth-alert-error">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <p style={{ fontSize: 13, color: '#b5b9c4', lineHeight: 1.5, marginBottom: 16 }}>
              Enter a new secure password for your Gardner Auction bidder account.
            </p>

            <div className="auth-form-field">
              <label className="auth-label" htmlFor="reset-new-password">New Password *</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input 
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="auth-input"
                  autoFocus
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-form-field">
              <label className="auth-label" htmlFor="reset-confirm-password">Confirm New Password *</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input 
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`auth-input ${confirmPassword ? (passwordsMatch ? 'valid-border' : 'invalid-border') : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Criteria Checklist */}
            {newPassword.length > 0 && (
              <div className="auth-password-criteria" style={{ marginBottom: 14 }}>
                <div className={`auth-criteria-item ${hasMinLength ? 'met' : 'unmet'}`}>
                  {hasMinLength ? <Check size={12} /> : <X size={12} />}
                  <span>8+ chars</span>
                </div>
                <div className={`auth-criteria-item ${hasUppercase ? 'met' : 'unmet'}`}>
                  {hasUppercase ? <Check size={12} /> : <X size={12} />}
                  <span>Uppercase</span>
                </div>
                <div className={`auth-criteria-item ${hasNumber ? 'met' : 'unmet'}`}>
                  {hasNumber ? <Check size={12} /> : <X size={12} />}
                  <span>Number</span>
                </div>
                <div className={`auth-criteria-item ${passwordsMatch ? 'met' : 'unmet'}`}>
                  {passwordsMatch ? <Check size={12} /> : <X size={12} />}
                  <span>Match</span>
                </div>
              </div>
            )}

            <div className="auth-modal-actions">
              <button 
                type="button" 
                className="btn-auth-secondary" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-auth-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="auth-spinner" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Set Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="auth-security-footnote">
              <ShieldCheck size={14} color="#059669" />
              <span>Password updated securely via Supabase Auth</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
