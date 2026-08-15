
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getAuthRedirectUrl } from '@/lib/platform';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, companyName: string, phone?: string) => Promise<{ data: { user: User; session: Session } | { user: User; session: null }, error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ data: { user: User; session: Session } | null, error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ data: { provider?: string; url?: string } | null, error: AuthError | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check "remember me" preference on app start
    const rememberMe = localStorage.getItem('ellosuit_remember_me');
    const sessionActive = sessionStorage.getItem('ellosuit_session_active');
    
    // If user chose NOT to stay logged in and this is a new browser session, sign out
    if (rememberMe === 'false' && !sessionActive) {
      supabase.auth.signOut().then(() => {
        setSession(null);
        setUser(null);
        setLoading(false);
        localStorage.removeItem('ellosuit_remember_me');
      });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Tag user as ellocontent if not already tagged
    const tagAsEllocontent = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('source')
          .eq('id', userId)
          .single();
        if (profile && !profile.source) {
          await supabase.from('profiles').update({ source: 'ellocontent' } as any).eq('id', userId);
        }
      } catch {}
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => tagAsEllocontent(session.user.id), 500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string, companyName: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          company_name: companyName,
          source: 'ellocontent',
          ...(phone ? { phone } : {}),
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl('/'),
      },
    });
    return { data, error };
  };

  const logout = async () => {
    await signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
