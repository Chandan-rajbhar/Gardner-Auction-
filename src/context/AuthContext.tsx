import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, SupabaseAuthUser } from '../lib/supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'clerk' | 'consignor_manager' | 'user';
  title: string;
  avatarText: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  savedEmail: string;
  isSupabaseConnected: boolean;
  isRecoverySession: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  clearRecoverySession: () => void;
}

const REMEMBER_EMAIL_KEY = 'gardner_af360_saved_email_v1';

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'GA';
};

const getRoleTitle = (role: AuthUser['role']): string => {
  switch (role) {
    case 'super_admin':
      return 'Master Auctioneer & Executive Admin';
    case 'admin':
      return 'Saleroom Operations Administrator';
    case 'clerk':
      return 'Lead Rostrum Clerking Official';
    case 'consignor_manager':
      return 'Consignor Relations Coordinator';
    case 'user':
    default:
      return 'Authorized Saleroom Operator';
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [isRecoverySession, setIsRecoverySession] = useState<boolean>(false);

  // Helper to map Supabase Auth User & Database Profile to AuthUser
  const mapSupabaseUser = (sbUser: SupabaseAuthUser, profile?: any): AuthUser => {
    const fullName = profile?.full_name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Operator';
    const assignedRole: AuthUser['role'] = (profile?.role as AuthUser['role']) || (sbUser.user_metadata?.role as AuthUser['role']) || 'super_admin';

    return {
      id: sbUser.id,
      name: fullName,
      email: sbUser.email || '',
      role: assignedRole,
      title: getRoleTitle(assignedRole),
      avatarText: getInitials(fullName),
      phone: profile?.phone || sbUser.phone,
      createdAt: profile?.created_at || sbUser.created_at || new Date().toISOString(),
      lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString()
    };
  };

  // Fetch trusted user profile from Supabase 'public.users' table
  const fetchUserProfile = async (sbUser: SupabaseAuthUser): Promise<AuthUser> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseUser(sbUser, data);
      }
      
      // Fallback: check metadata or default to super_admin for this console
      const fallbackRole: AuthUser['role'] = (sbUser.user_metadata?.role as AuthUser['role']) || 'super_admin';
      return mapSupabaseUser(sbUser, {
        full_name: sbUser.user_metadata?.full_name,
        role: fallbackRole
      });
    } catch {
      return mapSupabaseUser(sbUser);
    }
  };

  // Helper to safely sync or create user profile in public.users
  const syncProfileToSupabase = async (profileData: {
    id: string;
    fullName: string;
    email: string;
    role: AuthUser['role'];
  }) => {
    if (!isSupabaseConfigured) return;
    try {
      const cleanEmail = profileData.email.trim().toLowerCase();
      // Check if row already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id, email')
        .or(`id.eq.${profileData.id},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('users')
          .update({
            full_name: profileData.fullName,
            role: profileData.role
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('users')
          .insert({
            id: profileData.id,
            full_name: profileData.fullName,
            email: cleanEmail,
            role: profileData.role,
            created_at: new Date().toISOString()
          });
      }
    } catch (e) {
      console.warn('Supabase profile sync notice:', e);
    }
  };

  // Initialize session and auth listeners
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. Load remembered email for login convenience (non-sensitive preference)
      try {
        const remembered = localStorage.getItem(REMEMBER_EMAIL_KEY);
        if (remembered) {
          setSavedEmail(remembered);
        }
      } catch (err) {
        console.error('Failed to load remembered email preference:', err);
      }

      // 2. Check for password recovery hash
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || hash.includes('#reset-password')) {
          setIsRecoverySession(true);
        }
      }

      // 3. Restore session from Supabase Auth
      if (isSupabaseConfigured) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session?.user && isMounted) {
            const profile = await fetchUserProfile(session.user);
            setUser(profile);
          }
        } catch (e) {
          console.error('Supabase getSession error:', e);
        }

        // Supabase Auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;

          if (event === 'PASSWORD_RECOVERY') {
            setIsRecoverySession(true);
          }

          if (event === 'SIGNED_IN' && session?.user) {
            const profile = await fetchUserProfile(session.user);
            setUser(profile);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        });

        if (isMounted) {
          setIsLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      } else {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- LOGIN ---
  const login = async (
    email: string, 
    pass: string, 
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      setIsLoading(false);
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    // Remember email preference
    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
      setSavedEmail(cleanEmail);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      setSavedEmail('');
    }

    // Authenticate exclusively using Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (error) {
        setIsLoading(false);
        const errLower = error.message.toLowerCase();

        if (errLower.includes('email not confirmed')) {
          return {
            success: false,
            error: 'Your email address has not been confirmed yet. Please verify your email inbox.'
          };
        }

        if (errLower.includes('invalid login credentials') || errLower.includes('invalid credentials')) {
          return {
            success: false,
            error: 'Invalid email address or password. Please verify your credentials and try again.'
          };
        }

        return { success: false, error: error.message };
      }

      if (data?.user) {
        // Retrieve trusted profile from Supabase
        let profile = await fetchUserProfile(data.user);

        // Ensure profile exists in public.users
        await syncProfileToSupabase({
          id: data.user.id,
          fullName: profile.name,
          email: cleanEmail,
          role: profile.role
        });

        setUser(profile);
        setIsLoading(false);
        return { success: true };
      }
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err?.message || 'Connection to Supabase authentication service failed. Please check your network.'
      };
    }

    setIsLoading(false);
    return { success: false, error: 'Authentication failed. Please verify your credentials.' };
  };

  // --- SIGNUP ---
  const signup = async (userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    const cleanName = userData.name.trim();
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanPass = userData.password.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      setIsLoading(false);
      return { success: false, error: 'Please fill in all required registration fields.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setIsLoading(false);
      return { success: false, error: 'Please enter a valid saleroom email address.' };
    }

    if (cleanPass.length < 8) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 8 characters long for administrative security.' };
    }

    // Register user securely with Supabase Authentication
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: cleanName,
            role: 'super_admin'
          }
        }
      });

      if (authError) {
        setIsLoading(false);
        const errLower = authError.message.toLowerCase();

        // Check for duplicate account
        if (
          errLower.includes('already registered') || 
          errLower.includes('user already exists') || 
          authError.status === 422
        ) {
          return {
            success: false,
            error: 'An account with this email address already exists. Please sign in instead.'
          };
        }

        if (errLower.includes('rate limit')) {
          return {
            success: false,
            error: 'Supabase email send rate limit reached. Please disable "Confirm email" in Supabase Auth settings or try again shortly.'
          };
        }

        return {
          success: false,
          error: authError.message || 'Registration failed with Supabase Auth.'
        };
      }

      if (!authData?.user) {
        setIsLoading(false);
        return {
          success: false,
          error: 'Registration was not confirmed by Supabase. Please try again.'
        };
      }

      const userId = authData.user.id;

      // Persist profile into Supabase public.users table with super_admin role
      await syncProfileToSupabase({
        id: userId,
        fullName: cleanName,
        email: cleanEmail,
        role: 'super_admin'
      });

      // Check whether Supabase requires email confirmation before login
      const requiresEmailConfirmation = Boolean(
        !authData.session && 
        authData.user.identities && 
        authData.user.identities.length > 0
      );

      // Pre-seed remembered email for login convenience
      try {
        localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
        setSavedEmail(cleanEmail);
      } catch (_) {}

      // Ensure user signs in explicitly
      try {
        await supabase.auth.signOut();
      } catch (_) {}
      setUser(null);
      setIsLoading(false);

      return {
        success: true,
        requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? 'Registration received! Please check your email to confirm your account before signing in.'
          : 'Administrative account created successfully! Please sign in with your credentials.'
      };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err?.message || 'Failed to complete registration due to a network or server error.'
      };
    }
  };

  // --- LOGOUT ---
  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase signOut error:', e);
    }
    setUser(null);
    setIsLoading(false);
  };

  // --- RESET PASSWORD ---
  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setIsLoading(false);
      return { success: false, error: 'Please enter your registered email address.' };
    }

    try {
      const redirectTo = `${window.location.origin}/#reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo
      });

      if (error) {
        console.warn('Supabase resetPassword notice:', error.message);
      }

      setIsLoading(false);
      return {
        success: true,
        message: 'If an account exists for this email, you will receive password reset instructions shortly.'
      };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: true,
        message: 'If an account exists for this email, you will receive password reset instructions shortly.'
      };
    }
  };

  // --- UPDATE PASSWORD ---
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    const cleanPass = newPassword.trim();

    if (cleanPass.length < 8) {
      setIsLoading(false);
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: cleanPass
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      setIsRecoverySession(false);
      setIsLoading(false);
      if (window.location.hash) {
        window.location.hash = 'login';
      }

      return {
        success: true,
        message: 'Your password has been successfully updated. You may now sign in with your new credentials.'
      };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  };

  const clearRecoverySession = () => {
    setIsRecoverySession(false);
    if (window.location.hash === '#reset-password') {
      window.location.hash = 'login';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      savedEmail,
      isSupabaseConnected: isSupabaseConfigured,
      isRecoverySession,
      login,
      signup,
      logout,
      resetPassword,
      updatePassword,
      clearRecoverySession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
