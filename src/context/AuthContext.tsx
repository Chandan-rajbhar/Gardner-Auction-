import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin, isSupabaseConfigured, SupabaseAuthUser, SUPABASE_URL } from '../lib/supabase';

export interface AuthUser {
  id: string;
  dbId?: string; // Identifier in public.users table if distinct from auth.uid()
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'clerk' | 'consignor_manager' | 'user';
  title: string;
  avatarText: string;
  avatarUrl?: string;
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
  accessDeniedNotice: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; message?: string; error?: string; role?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updateProfile: (profileData: {
    name?: string;
    phone?: string;
    title?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
  clearRecoverySession: () => void;
  clearAccessDeniedNotice: () => void;
  refreshUserRole: () => Promise<AuthUser['role'] | null>;
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
      return 'Registered Customer & Saleroom Bidder';
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [isRecoverySession, setIsRecoverySession] = useState<boolean>(false);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  // Helper to resolve storage paths to public URLs
  const resolveAvatarUrl = (rawUrl?: string): string | undefined => {
    if (!rawUrl) return undefined;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    const cleanPath = rawUrl.replace(/^avatars\//, '');
    const { data } = supabase.storage.from('avatars').getPublicUrl(cleanPath);
    return data?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/avatars/${cleanPath}`;
  };

  // Helper to map Supabase Auth User & Database Profile to AuthUser
  const mapSupabaseUser = (sbUser: SupabaseAuthUser, profile?: any): AuthUser => {
    const fullName = profile?.full_name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Operator';
    const assignedRole: AuthUser['role'] = (profile?.role as AuthUser['role']) || (sbUser.user_metadata?.role as AuthUser['role']) || 'user';
    const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem(`gardner_avatar_cache_${sbUser.id}`) : null;
    const rawAvatarUrl = profile?.avatar_url || sbUser.user_metadata?.avatar_url || cachedAvatar || undefined;
    const avatarUrl = resolveAvatarUrl(rawAvatarUrl);
    const phone = profile?.phone || sbUser.user_metadata?.phone || sbUser.phone || '';
    const title = profile?.title || sbUser.user_metadata?.title || getRoleTitle(assignedRole);
    const dbId = profile?.id || undefined;

    return {
      id: sbUser.id,
      dbId: dbId,
      name: fullName,
      email: sbUser.email || '',
      role: assignedRole,
      title: title,
      avatarText: getInitials(fullName),
      avatarUrl: avatarUrl,
      phone: phone,
      createdAt: profile?.created_at || sbUser.created_at || new Date().toISOString(),
      lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString()
    };
  };

  // Fetch trusted user profile directly from Supabase public.users
  const fetchUserProfile = async (sbUser: SupabaseAuthUser): Promise<AuthUser> => {
    try {
      const cleanEmail = sbUser.email ? sbUser.email.trim().toLowerCase() : '';
      let profileData: any = null;

      // 1. Primary lookup: public.users table directly by auth id
      const { data: byId } = await supabase
        .from('users')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (byId) {
        profileData = byId;
      } else if (cleanEmail) {
        // Fallback: look up by verified email
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (byEmail) {
          profileData = byEmail;
        }
      }

      // 2. Secondary lookup: admin_users table if not in public.users
      if (!profileData) {
        try {
          const { data: adminRecord } = await supabase
            .from('admin_users')
            .select('*')
            .or(`auth_id.eq.${sbUser.id},email.eq.${cleanEmail}`)
            .maybeSingle();

          if (adminRecord) {
            profileData = adminRecord;
          }
        } catch (_) {}
      }

      if (profileData) {
        return mapSupabaseUser(sbUser, profileData);
      }

      // Fallback: check auth metadata or default to 'user'
      const fallbackRole: AuthUser['role'] = (sbUser.user_metadata?.role as AuthUser['role']) || 'user';
      return mapSupabaseUser(sbUser, {
        full_name: sbUser.user_metadata?.full_name,
        role: fallbackRole
      });
    } catch {
      return mapSupabaseUser(sbUser);
    }
  };

  // Real-time synchronization of active user's role from Supabase public.users
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`realtime:active_user_role:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        async (payload: any) => {
          const updatedRow = payload.new;
          if (updatedRow) {
            const newRole = (updatedRow.role || 'user').toLowerCase().trim();
            if (newRole !== 'super_admin') {
              console.warn('[AuthContext] Active user role demoted from super_admin. Terminating session.');
              await supabase.auth.signOut();
              setUser(null);
              setAccessDeniedNotice('Access denied. Only Super Admin accounts are authorized to access the Admin Dashboard.');
            } else {
              setUser(prev => prev ? {
                ...prev,
                role: 'super_admin',
                name: updatedRow.full_name || prev.name,
                title: updatedRow.title || prev.title,
                phone: updatedRow.phone || prev.phone,
                avatarUrl: resolveAvatarUrl(updatedRow.avatar_url) || prev.avatarUrl
              } : null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Initialize session and auth listeners
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. Load remembered email for login convenience
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
            if (profile.role !== 'super_admin') {
              console.warn(`[AuthContext] Restored user has non-super_admin role (${profile.role}). Terminating session.`);
              await supabase.auth.signOut();
              if (isMounted) {
                setUser(null);
                setAccessDeniedNotice('Access denied. Only Super Admin accounts are authorized to access the Admin Dashboard.');
              }
            } else {
              if (isMounted) {
                setUser(profile);
                setAccessDeniedNotice(null);
              }
            }
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
            if (profile.role !== 'super_admin') {
              await supabase.auth.signOut();
              if (isMounted) {
                setUser(null);
                setAccessDeniedNotice('Access denied. Only Super Admin accounts are authorized to access the Admin Dashboard.');
              }
            } else {
              if (isMounted) {
                setUser(profile);
                setAccessDeniedNotice(null);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              setUser(null);
            }
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

  // --- REFRESH USER ROLE ---
  const refreshUserRole = async (): Promise<AuthUser['role'] | null> => {
    if (!user) return null;
    try {
      const { data: freshRecord } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();

      if (freshRecord) {
        const freshRole = (freshRecord.role as AuthUser['role']) || 'user';
        if (freshRole !== 'super_admin') {
          await supabase.auth.signOut();
          setUser(null);
          setAccessDeniedNotice('Access denied. Only Super Admin accounts are authorized to access the Admin Dashboard.');
          return freshRole;
        }

        setUser(prev => prev ? {
          ...prev,
          role: freshRole,
          name: freshRecord.full_name || prev.name,
          title: freshRecord.title || prev.title,
          phone: freshRecord.phone || prev.phone,
          avatarUrl: resolveAvatarUrl(freshRecord.avatar_url) || prev.avatarUrl
        } : null);
        return freshRole;
      }
    } catch (err) {
      console.warn('[AuthContext] refreshUserRole error:', err);
    }
    return user.role;
  };

  // --- LOGIN ---
  const login = async (
    email: string, 
    pass: string, 
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setAccessDeniedNotice(null);
    const cleanEmail = email.trim().toLowerCase();
    const rawPass = pass;

    if (!cleanEmail || !rawPass || !rawPass.trim()) {
      setIsLoading(false);
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
      setSavedEmail(cleanEmail);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      setSavedEmail('');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: rawPass
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
            error: 'Invalid email or password.'
          };
        }

        return { success: false, error: error.message };
      }

      if (data?.user) {
        // Retrieve authoritative user profile from Supabase
        const profile = await fetchUserProfile(data.user);

        // Strict validation: Only super_admin accounts can access the Admin Dashboard
        if (profile.role !== 'super_admin') {
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          const deniedMsg = 'Access denied. Only Super Admin accounts are authorized to access the Admin Dashboard.';
          setAccessDeniedNotice(deniedMsg);
          return {
            success: false,
            error: deniedMsg
          };
        }

        setUser(profile);
        setAccessDeniedNotice(null);
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
  }): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; message?: string; error?: string; role?: string }> => {
    setIsLoading(true);
    setAccessDeniedNotice(null);
    const cleanName = userData.name.trim();
    const cleanEmail = userData.email.trim().toLowerCase();
    const rawPass = userData.password;

    if (!cleanName || !cleanEmail || !rawPass || !rawPass.trim()) {
      setIsLoading(false);
      return { success: false, error: 'Please fill in all required registration fields.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setIsLoading(false);
      return { success: false, error: 'Please enter a valid saleroom email address.' };
    }

    if (rawPass.length < 8) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 8 characters long for administrative security.' };
    }

    try {
      // 1. Register user with Supabase Auth (defaulting to standard user; server decides first Super Admin)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: rawPass,
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

        if (
          errLower.includes('already registered') || 
          errLower.includes('already exists') || 
          errLower.includes('user already exists') || 
          authError.status === 422
        ) {
          return {
            success: false,
            error: 'An account with this email already exists. Please sign in.'
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

      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        setIsLoading(false);
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in.'
        };
      }

      const userId = authData.user.id;

      // 2. Secure Server-Side First-Super-Admin Role Assignment Check
      let assignedRole: AuthUser['role'] = 'super_admin';
      let isFirstSuperAdmin = false;

      try {
        const verifyRes = await fetch('/api/auth/verify-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: cleanEmail,
            fullName: cleanName,
            role: 'super_admin'
          })
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.role) {
            assignedRole = verifyData.role;
            isFirstSuperAdmin = Boolean(verifyData.isFirstSuperAdmin);
          }
        }
      } catch (verifyErr) {
        console.warn('[AuthContext] /api/auth/verify-role error:', verifyErr);
      }

      // Check whether Supabase requires email confirmation before login
      const requiresEmailConfirmation = Boolean(
        !authData.session && 
        authData.user.identities && 
        authData.user.identities.length > 0
      );

      try {
        localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
        setSavedEmail(cleanEmail);
      } catch (_) {}

      try {
        await supabase.auth.signOut();
      } catch (_) {}
      setUser(null);
      setIsLoading(false);

      const successNotice = 'Super Admin account created successfully! Please sign in with your credentials.';

      return {
        success: true,
        requiresEmailConfirmation,
        role: assignedRole,
        message: requiresEmailConfirmation
          ? 'Registration received! Please check your email to confirm your account before signing in.'
          : successNotice
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
    setAccessDeniedNotice(null);
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

  // --- UPDATE PROFILE ---
  const updateProfile = async (profileData: {
    name?: string;
    phone?: string;
    title?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No authenticated user session found.' };
    }

    try {
      const trimmedName = profileData.name !== undefined ? profileData.name.trim() : user.name;
      const trimmedPhone = profileData.phone !== undefined ? profileData.phone.trim() : user.phone;
      const customTitle = profileData.title !== undefined ? profileData.title.trim() : user.title;
      const nextAvatarUrl = profileData.avatarUrl !== undefined ? profileData.avatarUrl : user.avatarUrl;

      // 1. Update Supabase Auth user metadata
      if (isSupabaseConfigured) {
        try {
          const authMetaData: Record<string, any> = {
            full_name: trimmedName,
            phone: trimmedPhone,
            title: customTitle
          };
          if (nextAvatarUrl !== undefined) {
            authMetaData.avatar_url = nextAvatarUrl;
          }

          await supabase.auth.updateUser({
            data: authMetaData
          });
        } catch (_) {}

        // 2. Update public.users database table
        try {
          const cleanEmail = user.email.trim().toLowerCase();
          const targetRecordId = user.dbId || user.id;

          if (nextAvatarUrl !== undefined) {
            try {
              await supabase.rpc('update_user_avatar', {
                p_avatar_url: nextAvatarUrl
              });
            } catch (_) {}
          }

          const dbPayload: Record<string, any> = {
            full_name: trimmedName,
            phone: trimmedPhone,
            title: customTitle,
            updated_at: new Date().toISOString()
          };
          if (nextAvatarUrl !== undefined) {
            dbPayload.avatar_url = nextAvatarUrl;
          }

          await supabase
            .from('users')
            .update(dbPayload)
            .or(`id.eq.${targetRecordId},email.eq.${cleanEmail}`);
        } catch (dbErr: any) {
          console.warn('[AuthContext] Supabase public.users update notice:', dbErr);
        }
      }

      if (nextAvatarUrl) {
        try {
          localStorage.setItem(`gardner_avatar_cache_${user.id}`, nextAvatarUrl);
        } catch (_) {}
      }

      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          name: trimmedName,
          avatarText: getInitials(trimmedName),
          avatarUrl: nextAvatarUrl,
          phone: trimmedPhone,
          title: customTitle
        };
      });

      return {
        success: true,
        message: 'Profile information updated and synchronized successfully.'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to update profile.'
      };
    }
  };

  const clearRecoverySession = () => {
    setIsRecoverySession(false);
    if (window.location.hash === '#reset-password') {
      window.location.hash = 'login';
    }
  };

  const clearAccessDeniedNotice = () => {
    setAccessDeniedNotice(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      savedEmail,
      isSupabaseConnected: isSupabaseConfigured,
      isRecoverySession,
      accessDeniedNotice,
      login,
      signup,
      logout,
      resetPassword,
      updatePassword,
      updateProfile,
      clearRecoverySession,
      clearAccessDeniedNotice,
      refreshUserRole
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
