import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile, AuthModalView } from '../types/auth';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  authModalOpen: boolean;
  authModalView: AuthModalView;
  openLoginModal: () => void;
  openSignupModal: () => void;
  openForgotPasswordModal: () => void;
  openResetPasswordModal: () => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  signInWithEmailOrUsername: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: { full_name: string; username: string; email: string; password: string }) => Promise<{ success: boolean; needsEmailVerification?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PROFILE: UserProfile = {
  id: 'demo-analyst-uuid',
  full_name: 'Yash Bohra',
  username: 'yashbohra',
  email: 'yashbohragb@gmail.com',
  role: 'Frontend & Fraud Ops Lead',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('login');

  // Fetch or construct profile for authenticated user
  const fetchProfile = useCallback(async (userId: string, authUser: any) => {
    if (!isSupabaseConfigured) {
      setProfile(DEMO_PROFILE);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as UserProfile);
      } else {
        // Fallback to auth metadata if profile row is not yet created
        const meta = authUser.user_metadata || {};
        const fallbackProfile: UserProfile = {
          id: userId,
          full_name: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Fraud Analyst',
          username: meta.username || authUser.email?.split('@')[0] || 'analyst',
          email: authUser.email || '',
          role: meta.role || 'Fraud Operations Analyst',
          created_at: authUser.created_at,
          updated_at: authUser.updated_at,
        };
        setProfile(fallbackProfile);
      }
    } catch {
      // Safe fallback
      const meta = authUser.user_metadata || {};
      setProfile({
        id: userId,
        full_name: meta.full_name || 'Fraud Analyst',
        username: meta.username || 'analyst',
        email: authUser.email || '',
        role: meta.role || 'Fraud Operations Analyst',
      });
    }
  }, []);

  // Listen to Supabase Auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // If demo mode, check if previously logged in demo user
      const storedDemo = localStorage.getItem('ls_demo_session');
      if (storedDemo === 'true') {
        setUser({ id: DEMO_PROFILE.id, email: DEMO_PROFILE.email });
        setProfile(DEMO_PROFILE);
        setSession({ user: { id: DEMO_PROFILE.id } });
      }
      setIsLoading(false);
      return;
    }

    // Live Supabase Auth
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user);
        fetchProfile(currentSession.user.id, currentSession.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        await fetchProfile(newSession.user.id, newSession.user);
      } else {
        setUser(null);
        setProfile(null);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalView('reset_password');
        setAuthModalOpen(true);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Modal controls
  const openLoginModal = () => {
    setAuthModalView('login');
    setAuthModalOpen(true);
  };

  const openSignupModal = () => {
    setAuthModalView('signup');
    setAuthModalOpen(true);
  };

  const openForgotPasswordModal = () => {
    setAuthModalView('forgot_password');
    setAuthModalOpen(true);
  };

  const openResetPasswordModal = () => {
    setAuthModalView('reset_password');
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Sign In with Email OR Username
  const signInWithEmailOrUsername = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim();

    if (!isSupabaseConfigured) {
      // Resilient Demo Login
      if (
        (cleanId.toLowerCase() === 'yashbohra' || cleanId.toLowerCase() === 'yashbohragb@gmail.com') ||
        cleanId.length >= 3
      ) {
        const demoUser = {
          id: DEMO_PROFILE.id,
          email: cleanId.includes('@') ? cleanId : `${cleanId}@ledgersentinel.internal`,
          user_metadata: { full_name: cleanId === 'yashbohra' ? 'Yash Bohra' : cleanId },
        };
        setUser(demoUser);
        setProfile({
          ...DEMO_PROFILE,
          username: cleanId.includes('@') ? cleanId.split('@')[0] : cleanId,
          email: demoUser.email,
        });
        setSession({ user: demoUser });
        localStorage.setItem('ls_demo_session', 'true');
        return { success: true };
      }
      return { success: false, error: 'Unable to sign in with those credentials.' };
    }

    try {
      let emailToAuth = cleanId;

      // If user provided a username rather than an email, look up associated email
      if (!cleanId.includes('@')) {
        // Try RPC lookup first
        try {
          const { data: emailData } = await supabase.rpc('get_email_by_username', {
            p_username: cleanId,
          });
          if (emailData) {
            emailToAuth = emailData;
          } else {
            // Direct profile lookup fallback
            const { data: pData } = await supabase
              .from('profiles')
              .select('email')
              .ilike('username', cleanId)
              .maybeSingle();

            if (pData?.email) {
              emailToAuth = pData.email;
            } else {
              // Obscure whether username exists or password was wrong
              return { success: false, error: 'Unable to sign in with those credentials.' };
            }
          }
        } catch {
          return { success: false, error: 'Unable to sign in with those credentials.' };
        }
      }

      // Supabase signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (error || !data.user) {
        return { success: false, error: 'Unable to sign in with those credentials.' };
      }

      setUser(data.user);
      setSession(data.session);
      await fetchProfile(data.user.id, data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  };

  // Sign Up with Full Name, Username, Email, Password
  const signUp = async (data: {
    full_name: string;
    username: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; needsEmailVerification?: boolean; error?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanName = data.full_name.trim();

    if (!isSupabaseConfigured) {
      // Demo signup
      const newUser = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        user_metadata: { full_name: cleanName, username: cleanUsername },
      };
      const newProfile: UserProfile = {
        id: newUser.id,
        full_name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        role: 'Fraud Operations Analyst',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(newUser);
      setProfile(newProfile);
      setSession({ user: newUser });
      localStorage.setItem('ls_demo_session', 'true');
      return { success: true };
    }

    try {
      // Check username uniqueness in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: 'Username is already taken. Please choose another.' };
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            full_name: cleanName,
            username: cleanUsername,
            role: 'Fraud Operations Analyst',
          },
        },
      });

      if (error) {
        return { success: false, error: 'Unable to create your account. Please check your details and try again.' };
      }

      if (authData.user) {
        // If profile table exists, ensure profile record is inserted
        try {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            full_name: cleanName,
            username: cleanUsername,
            email: cleanEmail,
            role: 'Fraud Operations Analyst',
          });
        } catch {
          // Ignored if handled by database trigger
        }

        if (authData.session) {
          setUser(authData.user);
          setSession(authData.session);
          await fetchProfile(authData.user.id, authData.user);
          return { success: true, needsEmailVerification: false };
        } else {
          // Email confirmation is required by Supabase settings
          return { success: true, needsEmailVerification: true };
        }
      }

      return { success: false, error: 'Unable to create your account. Please check your details and try again.' };
    } catch {
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  };

  // Sign Out
  const signOut = async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('ls_demo_session');
      setUser(null);
      setProfile(null);
      setSession(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  // Forgot Password (Send Reset Email)
  const resetPasswordForEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const redirectUrl = `${window.location.origin}/#reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: 'Something went wrong. Please try again.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  };

  // Update Password (Recovery Flow)
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: 'Unable to update password. Please try again.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isAuthenticated: Boolean(user),
        isSupabaseConfigured,
        authModalOpen,
        authModalView,
        openLoginModal,
        openSignupModal,
        openForgotPasswordModal,
        openResetPasswordModal,
        closeAuthModal,
        setAuthModalView,
        signInWithEmailOrUsername,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
      }}
    >
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
