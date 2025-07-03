
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Função para atualizar o estado do usuário
    const updateAuthState = (session: Session | null) => {
      if (!mounted) return;
      
      console.log('Auth state updated:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          // Limpar completamente o estado
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          // Verificar se o usuário tem empresa associada
          try {
            const { data: companyUser } = await supabase
              .from('company_users')
              .select('company_id, role')
              .eq('user_id', session.user.id)
              .single();

            if (!companyUser) {
              console.log('User without company detected, creating company...');
              // Se não tem empresa, tentar criar uma baseada nos metadados
              const userMetadata = session.user.user_metadata;
              const companyName = userMetadata?.company_name || userMetadata?.username || session.user.email?.split('@')[0] + ' Company';
              
              const { data: newCompany } = await supabase
                .from('companies')
                .insert({
                  name: companyName,
                  domain: null,
                  settings: {}
                })
                .select()
                .single();

              if (newCompany) {
                await supabase
                  .from('company_users')
                  .insert({
                    company_id: newCompany.id,
                    user_id: session.user.id,
                    role: 'admin'
                  });
                
                console.log('Created company and associated user:', newCompany.name);
              }
            }
          } catch (error) {
            console.error('Error checking/creating company:', error);
          }
        }
        
        updateAuthState(session);
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }
        console.log('Initial session loaded:', session?.user?.email);
        updateAuthState(session);
      } catch (error) {
        console.error('Error in getInitialSession:', error);
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

  const signUp = async (email: string, password: string, username: string, companyName: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    console.log('Signing up:', email, 'with company:', companyName);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username,
          company_name: companyName
        }
      }
    });
    
    console.log('SignUp result:', data, error);
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('Signing in:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    console.log('SignIn result:', data?.user?.email, error);
    return { data, error };
  };

  const signOut = async () => {
    console.log('Signing out user:', user?.email);
    
    // Primeiro limpar o estado local
    setLoading(true);
    
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      // Forçar limpeza completa
      setUser(null);
      setSession(null);
      
      // Limpar localStorage se necessário
      try {
        localStorage.removeItem('supabase.auth.token');
      } catch (e) {
        console.warn('Could not clear localStorage:', e);
      }
      
      console.log('User signed out successfully');
    } else {
      console.error('SignOut error:', error);
    }
    
    setLoading(false);
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
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
