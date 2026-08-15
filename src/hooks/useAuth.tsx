import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getAuthRedirectUrl } from '@/lib/platform';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para notificar iOS sobre login bem-sucedido
  const notifyIOSLoginSuccess = () => {
    try {
      if ((window as any).webkit?.messageHandlers?.usuarioLogado) {
        (window as any).webkit.messageHandlers.usuarioLogado.postMessage("ok");
        console.log('✅ iOS notificado sobre login bem-sucedido');
      }
    } catch (error) {
      console.log('📱 Notificação iOS não disponível:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Função para atualizar o estado do usuário
    const updateAuthState = (session: Session | null) => {
      if (!mounted) return;
      
      console.log('🔐 Auth state updated:', session?.user?.email || 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Notificar iOS quando usuário faz login
      if (session?.user) {
        notifyIOSLoginSuccess();
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event, session?.user?.email || 'No user');
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out - clearing state');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Notificar iOS especificamente no evento SIGNED_IN
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 Login bem-sucedido, notificando iOS...');
          notifyIOSLoginSuccess();
        }
        
        updateAuthState(session);
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('❌ Error getting session:', error);
        }
        console.log('🔐 Initial session loaded:', session?.user?.email || 'No session');
        updateAuthState(session);
      } catch (error) {
        console.error('💥 Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string, companyName: string, phone?: string) => {
    const redirectUrl = getAuthRedirectUrl('/');
    
    console.log('📝 Signing up:', email, 'with company:', companyName);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username,
          company_name: companyName,
          source: 'ellocontent',
          ...(phone ? { phone: phone.replace(/\D/g, '') } : {})
        }
      }
    });
    
    console.log('📝 SignUp result:', data?.user?.email || 'Failed', error?.message || 'Success');
    
    // Notificar iOS após signup bem-sucedido
    if (data?.user && !error) {
      notifyIOSLoginSuccess();
    }
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    console.log('🔑 SignIn result:', data?.user?.email || 'Failed', error?.message || 'Success');
    
    // Notificar iOS após signin bem-sucedido
    if (data?.user && !error) {
      notifyIOSLoginSuccess();
    }
    
    return { data, error };
  };

  const signOut = async () => {
    console.log('👋 Signing out user:', user?.email);
    
    // Evitar múltiplas chamadas simultâneas
    if (!user) {
      console.log('👋 No user to sign out');
      return { error: null };
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ SignOut error:', error);
      } else {
        console.log('✅ User signed out successfully');
        // O estado será limpo pelo onAuthStateChange
      }
      
      return { error };
    } catch (error) {
      console.error('💥 Unexpected signOut error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl('/')
      }
    });
    
    return { data, error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle
  };
};
