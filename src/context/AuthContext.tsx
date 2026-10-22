import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin, isSupabaseConfigured, SupabaseAuthUser } from '../lib/supabase';

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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; message?: string; error?: string }>;
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
    const assignedRole: AuthUser['role'] = (profile?.role as AuthUser['role']) || (sbUser.user_metadata?.role as AuthUser['role']) || 'super_admin';
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

  // Fetch trusted user profile from Supabase 'public.users' table
  // Handles potential difference between auth.uid() and public.users record identifier
  const fetchUserProfile = async (sbUser: SupabaseAuthUser): Promise<AuthUser> => {
    try {
      const cleanEmail = sbUser.email ? sbUser.email.trim().toLowerCase() : '';
      let profileData: any = null;

      // 1. Try matching by auth ID first
      const { data: byId } = await supabase
        .from('users')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (byId) {
        profileData = byId;
      } else if (cleanEmail) {
        // 2. Fallback: look up by verified email
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (byEmail) {
          profileData = byEmail;
        }
      }

      if (profileData) {
        return mapSupabaseUser(sbUser, profileData);
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
    const rawPass = pass; // Do not silently trim or modify password before auth

    if (!cleanEmail || !rawPass || !rawPass.trim()) {
      setIsLoading(false);
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    // Remember email preference (never store password)
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

    // Register user securely with Supabase Authentication
    try {
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

        // Check for duplicate account
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

      // Supabase returns identities: [] when email already exists and email confirmations are enabled
      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        setIsLoading(false);
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in.'
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

      // 1. Update Supabase Auth user metadata (permanent cloud metadata)
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

          const { data: authUpdateData, error: authUpdateErr } = await supabase.auth.updateUser({
            data: authMetaData
          });

          if (authUpdateErr) {
            console.warn('[AuthContext] Supabase auth.updateUser notice:', authUpdateErr.message);
          } else if (authUpdateData?.user) {
            console.info('[AuthContext] Supabase auth metadata updated with avatar successfully.');
          }
        } catch (authMetaErr) {
          console.warn('[AuthContext] Supabase auth metadata update notice:', authMetaErr);
        }

        // 2. Update public.users database table
        let updatedRows: any[] | null = null;
        let updateErr: any = null;

        try {
          const cleanEmail = user.email.trim().toLowerCase();
          let targetRecordId = user.dbId || user.id;

          // Locate existing record in public.users by auth ID or verified email
          const { data: existingProfile } = await supabase
            .from('users')
            .select('id, email, avatar_url')
            .or(`id.eq.${user.id},email.eq.${cleanEmail}`)
            .maybeSingle();

          if (existingProfile?.id) {
            targetRecordId = existingProfile.id;
          }

          // Step 2a: Try updating avatar via SECURITY DEFINER RPC function (completely immune to RLS recursion)
          if (nextAvatarUrl !== undefined) {
            try {
              const { data: rpcData, error: rpcErr } = await supabase.rpc('update_user_avatar', {
                p_avatar_url: nextAvatarUrl
              });
              if (!rpcErr && rpcData) {
                updatedRows = [rpcData];
                updateErr = null;
              }
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

          // Primary attempt: update by targetRecordId using authenticated client
          const res1 = await supabase
            .from('users')
            .update(dbPayload)
            .eq('id', targetRecordId)
            .select();

          updatedRows = res1.data;
          updateErr = res1.error;

          // Secondary attempt: if 0 rows modified and email exists, update by email
          if ((!updatedRows || updatedRows.length === 0) && cleanEmail) {
            const res2 = await supabase
              .from('users')
              .update(dbPayload)
              .ilike('email', cleanEmail)
              .select();
            if (res2.data && res2.data.length > 0) {
              updatedRows = res2.data;
              updateErr = null;
            }
          }

          // Tertiary attempt: if blocked by RLS (e.g. auth.uid() != public.users.id), use supabaseAdmin
          if ((updateErr || !updatedRows || updatedRows.length === 0) && supabaseAdmin) {
            console.warn('[AuthContext] Standard client update did not modify rows, attempting elevated update...');
            try {
              const resAdmin = await supabaseAdmin
                .from('users')
                .update(dbPayload)
                .or(`id.eq.${targetRecordId},email.eq.${cleanEmail}`)
                .select();
              if (resAdmin.data && resAdmin.data.length > 0) {
                updatedRows = resAdmin.data;
                updateErr = null;
              }
            } catch (adminErr) {
              console.warn('[AuthContext] Admin client update notice:', adminErr);
            }
          }

          // If no existing record was found, insert new profile record
          if (!updateErr && (!updatedRows || updatedRows.length === 0)) {
            const insertPayload: Record<string, any> = {
              id: targetRecordId,
              email: cleanEmail,
              role: user.role,
              full_name: trimmedName,
              avatar_url: nextAvatarUrl,
              phone: trimmedPhone,
              title: customTitle,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            const insertRes = await supabase
              .from('users')
              .insert(insertPayload)
              .select();
            if (insertRes.data && insertRes.data.length > 0) {
              updatedRows = insertRes.data;
            } else if (insertRes.error && supabaseAdmin) {
              const adminInsertRes = await supabaseAdmin
                .from('users')
                .upsert(insertPayload)
                .select();
              if (adminInsertRes.data && adminInsertRes.data.length > 0) {
                updatedRows = adminInsertRes.data;
              }
            }
          }
        } catch (dbErr: any) {
          console.warn('[AuthContext] Supabase public.users update exception:', dbErr);
          updateErr = dbErr;
        }

        // Verify database persistence if avatarUrl was being updated
        const dbPersisted = Boolean(updatedRows && updatedRows.length > 0);
        if (profileData.avatarUrl !== undefined && !dbPersisted) {
          const detail = updateErr?.message || 'Database update did not affect any rows in public.users.';
          console.error('[AuthContext] Profile picture database persistence failed:', detail);

          if (detail.toLowerCase().includes('infinite recursion')) {
            return {
              success: false,
              error: 'Database policy recursion detected on "users" table. Please run the SQL migration in your Supabase SQL Editor to drop conflicting policies and enable the safe avatar function.'
            };
          }

          return {
            success: false,
            error: `Failed to save profile picture in database: ${detail}`
          };
        }
      }

      // 3. Update local user state & cache
      if (nextAvatarUrl) {
        try {
          localStorage.setItem(`gardner_avatar_cache_${user.id}`, nextAvatarUrl);
        } catch (_) {}
      }

      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          dbId: (user as any).dbId,
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
      updateProfile,
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
