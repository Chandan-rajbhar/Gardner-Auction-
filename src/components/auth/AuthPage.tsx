import React, { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { ResetPasswordModal } from './ResetPasswordModal';
import { useAuth } from '../../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { isRecoverySession, clearRecoverySession } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#signup') {
      return 'signup';
    }
    return 'login';
  });

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash === '#reset-password' || window.location.hash.includes('type=recovery');
    }
    return false;
  });

  useEffect(() => {
    if (isRecoverySession) {
      setIsResetModalOpen(true);
    }
  }, [isRecoverySession]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#signup') {
        setMode('signup');
      } else if (hash === '#reset-password' || hash.includes('type=recovery')) {
        setIsResetModalOpen(true);
      } else {
        setMode('login');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSwitchToSignup = () => {
    window.location.hash = 'signup';
    setMode('signup');
  };

  const handleSwitchToLogin = () => {
    window.location.hash = 'login';
    setMode('login');
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    clearRecoverySession();
  };

  return (
    <div className="auth-wrapper-root">
      {mode === 'login' ? (
        <LoginPage onSwitchToSignup={handleSwitchToSignup} />
      ) : (
        <SignupPage onSwitchToLogin={handleSwitchToLogin} />
      )}

      {/* Supabase Password Recovery Flow Modal */}
      <ResetPasswordModal 
        isOpen={isResetModalOpen}
        onClose={handleCloseResetModal}
      />
    </div>
  );
};
