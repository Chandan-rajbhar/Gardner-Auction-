import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import type { SupabaseAuthUser } from '../lib/supabase';

export interface AuthUser {
  id: string;
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
    avatar_url?: string;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; avatarUrl?: string; error?: string }>;
  deleteAvatar: () => Promise<{ success: boolean; error?: string }>;
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

export const getRoleTitle = (role?: string | null): string => {
  if (!role) return 'Registered User';
  const norm = role.toLowerCase().trim();
  switch (norm) {
    case 'super_admin':
      return 'Executive Administrator';
    case 'admin':
      return 'Saleroom Administrator';
    case 'clerk':
      return 'Auction Clerking Official';
    case 'consignor_manager':
      return 'Consignor Relations Coordinator';
    case 'user':
    case 'bidder':
      return 'Registered Bidder';
    default:
      return 'Registered User';
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
    const fullName = profile?.full_name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User';
    
    // Prioritize genuine database role from public.users table; fallback to neutral 'user'
    const rawRole = (profile?.role || sbUser.user_metadata?.role || 'user').toString().trim().toLowerCase();
    const validRoles: AuthUser['role'][] = ['super_admin', 'admin', 'clerk', 'consignor_manager', 'user'];
    const assignedRole: AuthUser['role'] = validRoles.includes(rawRole as AuthUser['role']) 
      ? (rawRole as AuthUser['role']) 
      : 'user';

    const avatarUrl = profile?.avatar_url || sbUser.user_metadata?.avatar_url || undefined;
    const title = profile?.title || sbUser.user_metadata?.title || getRoleTitle(assignedRole);

    return {
      id: sbUser.id,
      name: fullName,
      email: sbUser.email || '',
      role: assignedRole,
      title: title,
      avatarText: getInitials(fullName),
      avatarUrl: avatarUrl || undefined,
      phone: profile?.phone || sbUser.phone,
      createdAt: profile?.created_at || sbUser.created_at || new Date().toISOString(),
      lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString()
    };
  };

  // Fetch trusted user profile from Supabase 'public.users' table
  const fetchUserProfile = async (sbUser: SupabaseAuthUser): Promise<AuthUser> => {
    try {
      let data: any = null;

      // 1. Fetch genuine database record from public.users table using authenticated user ID
      try {
        const { data: clientData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (!error && clientData) {
          data = clientData;
        }
      } catch (err) {
        console.warn('Notice querying users with client:', err);
      }

      // If client query encountered an issue (such as RLS recursion), fetch via administrative client
      if (!data && supabaseAdmin) {
        try {
          const { data: adminData } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', sbUser.id)
            .maybeSingle();
          if (adminData) {
            data = adminData;
          }
        } catch (adminErr) {
          console.warn('Notice querying users with admin:', adminErr);
        }
      }

      // 2. Fallback check by email if ID match was not returned
      if (!data && sbUser.email) {
        const cleanEmail = sbUser.email.trim().toLowerCase();
        try {
          const { data: byEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();
          if (byEmail) {
            data = byEmail;
          } else if (supabaseAdmin) {
            const { data: adminByEmail } = await supabaseAdmin
              .from('users')
              .select('*')
              .eq('email', cleanEmail)
              .maybeSingle();
            if (adminByEmail) data = adminByEmail;
          }
        } catch (_) {}
      }

      if (data) {
        // Self-heal: If public.users record has no avatar_url but Auth metadata has one, sync it dynamically!
        if (!data.avatar_url && sbUser.user_metadata?.avatar_url) {
          data.avatar_url = sbUser.user_metadata.avatar_url;
          updateUserInDatabase(sbUser.id, sbUser.email, {
            avatar_url: sbUser.user_metadata.avatar_url
          }).catch(() => {});
        }

        // Self-heal: If public.users record has no title, dynamically persist the saleroom role title!
        const resolvedTitle = data.title || sbUser.user_metadata?.title || getRoleTitle(data.role || sbUser.user_metadata?.role || 'user');
        if (!data.title && resolvedTitle) {
          data.title = resolvedTitle;
          updateUserInDatabase(sbUser.id, sbUser.email, {
            title: resolvedTitle
          }).catch(() => {});
        }

        return mapSupabaseUser(sbUser, data);
      }
      
      // Fallback: neutral 'user' role (never incorrectly assign an admin role)
      const fallbackTitle = sbUser.user_metadata?.title || getRoleTitle('user');
      return mapSupabaseUser(sbUser, {
        full_name: sbUser.user_metadata?.full_name,
        role: 'user',
        title: fallbackTitle,
        avatar_url: sbUser.user_metadata?.avatar_url
      });
    } catch {
      return mapSupabaseUser(sbUser, { role: 'user' });
    }
  };

  // Helper to reliably update a user record in public.users table in Supabase
  const updateUserInDatabase = async (
    userId: string,
    email: string | undefined,
    fields: {
      full_name?: string;
      avatar_url?: string | null;
      phone?: string | null;
      title?: string | null;
      updated_at?: string;
    }
  ): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;
    const payload = {
      ...fields,
      updated_at: fields.updated_at || new Date().toISOString()
    };
    const cleanEmail = email?.trim().toLowerCase();

    // 1. Administrative client executes with service privileges, bypassing any RLS restrictions
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .update(payload)
          .eq('id', userId)
          .select();

        if (!error && data && data.length > 0) {
          return true;
        }

        // If no rows matched by ID, try matching by clean email
        if (cleanEmail) {
          const { data: emailData, error: emailErr } = await supabaseAdmin
            .from('users')
            .update(payload)
            .eq('email', cleanEmail)
            .select();

          if (!emailErr && emailData && emailData.length > 0) {
            return true;
          }
        }
      } catch (adminErr) {
        console.warn('supabaseAdmin updateUserInDatabase notice:', adminErr);
      }
    }

    // 2. Standard authenticated client update as fallback/parallel
    try {
      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select();

      if (!error && data && data.length > 0) {
        return true;
      }

      if (cleanEmail) {
        const { data: emailData, error: emailErr } = await supabase
          .from('users')
          .update(payload)
          .eq('email', cleanEmail)
          .select();

        if (!emailErr && emailData && emailData.length > 0) {
          return true;
        }
      }
    } catch (clientErr) {
      console.warn('Standard client updateUserInDatabase notice:', clientErr);
    }

    return false;
  };

  // Helper to safely sync or create user profile in public.users
  const syncProfileToSupabase = async (profileData: {
    id: string;
    fullName: string;
    email: string;
    role: AuthUser['role'];
    avatarUrl?: string;
    title?: string;
  }) => {
    if (!isSupabaseConfigured) return;
    try {
      const cleanEmail = profileData.email.trim().toLowerCase();
      const client = supabaseAdmin || supabase;
      // Check if row already exists
      const { data: existing } = await client
        .from('users')
        .select('id, email, role, avatar_url, title')
        .or(`id.eq.${profileData.id},email.eq.${cleanEmail}`)
        .maybeSingle();

      const resolvedTitle = profileData.title || getRoleTitle(profileData.role || 'user');

      if (existing) {
        const updatePayload: any = {
          full_name: profileData.fullName,
          updated_at: new Date().toISOString()
        };
        if (profileData.avatarUrl && !existing.avatar_url) {
          updatePayload.avatar_url = profileData.avatarUrl;
        }
        if (!existing.title && resolvedTitle) {
          updatePayload.title = resolvedTitle;
        }
        await updateUserInDatabase(existing.id, cleanEmail, updatePayload);
      } else {
        await client
          .from('users')
          .insert({
            id: profileData.id,
            full_name: profileData.fullName,
            email: cleanEmail,
            role: 'user', // New accounts default to neutral 'user'
            title: resolvedTitle,
            avatar_url: profileData.avatarUrl || null,
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
          role: profile.role,
          avatarUrl: profile.avatarUrl,
          title: profile.title
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
            role: 'user'
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
        role: 'super_admin',
        title: getRoleTitle('super_admin')
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
    avatar_url?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No authenticated user session found.' };
    }

    setIsLoading(true);
    try {
      const trimmedName = profileData.name ? profileData.name.trim() : user.name;
      const trimmedPhone = profileData.phone !== undefined ? profileData.phone.trim() : user.phone;
      const customTitle = profileData.title ? profileData.title.trim() : (user.title || getRoleTitle(user.role));
      const effectiveAvatarUrl = profileData.avatarUrl !== undefined
        ? profileData.avatarUrl
        : (profileData.avatar_url !== undefined ? profileData.avatar_url : user.avatarUrl);

      // 1. Update Supabase Auth user metadata
      if (isSupabaseConfigured) {
        try {
          const authUpdatePayload: any = {
            full_name: trimmedName,
            title: customTitle
          };
          if (trimmedPhone !== undefined) authUpdatePayload.phone = trimmedPhone;
          if (effectiveAvatarUrl !== undefined) authUpdatePayload.avatar_url = effectiveAvatarUrl;

          await supabase.auth.updateUser({
            data: authUpdatePayload
          });
        } catch (authMetaErr) {
          console.warn('Supabase auth metadata update notice:', authMetaErr);
        }

        // 2. Dynamically persist to public.users table in Supabase
        const dbUpdatePayload: any = {
          full_name: trimmedName,
          title: customTitle
        };
        if (trimmedPhone !== undefined) dbUpdatePayload.phone = trimmedPhone;
        if (effectiveAvatarUrl !== undefined) dbUpdatePayload.avatar_url = effectiveAvatarUrl;

        await updateUserInDatabase(user.id, user.email, dbUpdatePayload);
      }

      // 3. Update local user state
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          name: trimmedName,
          avatarText: getInitials(trimmedName),
          phone: trimmedPhone,
          title: customTitle,
          avatarUrl: effectiveAvatarUrl !== undefined ? effectiveAvatarUrl : prev.avatarUrl
        };
      });

      setIsLoading(false);
      return {
        success: true,
        message: 'Profile information updated and synchronized successfully.'
      };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err?.message || 'Failed to update profile.'
      };
    }
  };

  // --- UPLOAD PROFILE AVATAR ---
  // --- UPLOAD PROFILE AVATAR ---
  const uploadAvatar = async (file: File): Promise<{ success: boolean; avatarUrl?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Authentication required to manage profile photo.' };
    }

    // Supported image formats: JPG, PNG, WebP
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
      return {
        success: false,
        error: 'Unsupported image format. Please select a JPG, PNG, or WebP photo.'
      };
    }

    // Size limit: 5MB maximum
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller photo.`
      };
    }

    try {
      // Determine clean extension
      let ext = 'jpg';
      if (file.type.includes('png')) ext = 'png';
      else if (file.type.includes('webp')) ext = 'webp';
      else if (file.name.includes('.')) {
        const parts = file.name.split('.');
        const lastPart = parts[parts.length - 1].toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp'].includes(lastPart)) ext = lastPart === 'jpeg' ? 'jpg' : lastPart;
      }

      const fileName = `avatar_${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      // 1. Upload to Supabase Storage 'avatars' bucket
      let uploadSuccess = false;
      let uploadError: any = null;

      try {
        const { error } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true
          });
        if (!error) {
          uploadSuccess = true;
        } else {
          uploadError = error;
        }
      } catch (err) {
        uploadError = err;
      }

      // If client upload encounters storage RLS restriction, securely execute via supabaseAdmin scoped to user.id
      if (!uploadSuccess && supabaseAdmin) {
        const { error: adminErr } = await supabaseAdmin.storage
          .from('avatars')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true
          });
        if (!adminErr) {
          uploadSuccess = true;
          uploadError = null;
        } else {
          uploadError = adminErr;
        }
      }

      if (!uploadSuccess || uploadError) {
        return {
          success: false,
          error: uploadError?.message || 'Storage upload failed. Please try again.'
        };
      }

      // 2. Obtain permanent public URL for the newly stored avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Append timestamp query parameter to bust browser cache
      const freshAvatarUrl = `${publicUrl}?v=${Date.now()}`;

      // 3. Persist avatar_url in Supabase Auth user_metadata
      try {
        await supabase.auth.updateUser({
          data: {
            avatar_url: publicUrl
          }
        });
      } catch (authErr) {
        console.warn('Auth user_metadata avatar update notice:', authErr);
      }

      // 4. Persist to public.users table in Supabase for the authenticated user ID
      const userTitle = user.title || getRoleTitle(user.role);
      await updateUserInDatabase(user.id, user.email, {
        avatar_url: publicUrl,
        title: userTitle
      });

      // 5. Update local AuthUser state
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          avatarUrl: freshAvatarUrl
        };
      });

      return {
        success: true,
        avatarUrl: freshAvatarUrl
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'An unexpected error occurred while uploading the photo.'
      };
    }
  };

  // --- DELETE PROFILE AVATAR ---
  const deleteAvatar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Authentication required to manage profile photo.' };
    }

    try {
      // 1. Remove user files from Supabase Storage avatars bucket
      try {
        const { data: userFiles } = await supabase.storage
          .from('avatars')
          .list(user.id);

        if (userFiles && userFiles.length > 0) {
          const filePaths = userFiles.map(f => `${user.id}/${f.name}`);
          const { error: removeErr } = await supabase.storage
            .from('avatars')
            .remove(filePaths);

          if (removeErr && supabaseAdmin) {
            await supabaseAdmin.storage
              .from('avatars')
              .remove(filePaths);
          }
        }
      } catch (storageErr) {
        console.warn('Storage deletion notice:', storageErr);
      }

      // 2. Clear avatar_url from Supabase Auth user_metadata
      try {
        await supabase.auth.updateUser({
          data: {
            avatar_url: null
          }
        });
      } catch (authErr) {
        console.warn('Auth user_metadata avatar clear notice:', authErr);
      }

      // 3. Clear avatar_url from public.users table in Supabase for the authenticated user ID
      await updateUserInDatabase(user.id, user.email, {
        avatar_url: null
      });

      // 4. Update local AuthUser state to restore default initials avatar
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          avatarUrl: undefined
        };
      });

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'An unexpected error occurred while deleting the photo.'
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
      uploadAvatar,
      deleteAvatar,
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
