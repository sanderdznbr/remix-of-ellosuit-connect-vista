import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useGmail = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailAccount, setEmailAccount] = useState<any>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const checkConnection = async () => {
    if (!user) {
      console.log('⚠️ Não há usuário logado');
      setIsConnected(false);
      setEmailAccount(null);
      return;
    }

    try {
      console.log('🔍 Verificando conexão Gmail para usuário:', user.id);
      
      const { data, error } = await supabase
        .from('user_email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'gmail')
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao verificar conta de email:', error);
        setIsConnected(false);
        setEmailAccount(null);
        return;
      }

      if (data) {
        console.log('✅ Conta Gmail encontrada:', data.id);
        
        // Verificar se o token não expirou
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        
        if (now >= expiresAt) {
          console.log('⚠️ Token Gmail expirado, removendo conta inválida...');
          try {
            await supabase
              .from('user_email_accounts')
              .delete()
              .eq('id', data.id);
            
            setIsConnected(false);
            setEmailAccount(null);
            
            toast({
              title: "Token Expirado",
              description: "Sua conexão com Gmail expirou. Conecte novamente.",
              variant: "destructive"
            });
            return;
          } catch (deleteError) {
            console.error('❌ Erro ao deletar conta expirada:', deleteError);
          }
        }
        
        setEmailAccount(data);
        setIsConnected(true);
      } else {
        console.log('⚠️ Nenhuma conta Gmail encontrada');
        setIsConnected(false);
        setEmailAccount(null);
      }
    } catch (error) {
      console.error('💥 Erro ao verificar conexão Gmail:', error);
      setIsConnected(false);
      setEmailAccount(null);
    }
  };

  const getGoogleClientId = async () => {
    try {
      console.log('🔑 Buscando Google Client ID para Gmail...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_client_id' }
      });

      if (error) {
        console.error('❌ Erro ao buscar Client ID:', error);
        throw error;
      }

      if (data?.client_id) {
        console.log('✅ Client ID obtido com sucesso');
        setGoogleClientId(data.client_id);
        return data.client_id;
      } else {
        throw new Error('Client ID não encontrado');
      }
    } catch (error) {
      console.error('💥 Erro ao obter Client ID:', error);
      toast({
        title: "Erro de Configuração",
        description: "Google Client ID não configurado. Verifique as configurações do Supabase.",
        variant: "destructive"
      });
      return null;
    }
  };

  const connectGmail = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔗 Iniciando conexão com Gmail...');
      
      // Obter Client ID da edge function
      const clientId = googleClientId || await getGoogleClientId();
      
      if (!clientId) {
        throw new Error('Não foi possível obter o Google Client ID');
      }

      // Redirect to Google OAuth with Gmail scopes
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' ');

      const redirectUri = `${window.location.origin}/dashboard`;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=gmail_auth`;

      console.log('🔗 Redirecionando para Gmail OAuth:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('💥 Erro ao conectar Gmail:', error);
      toast({
        title: "Erro",
        description: `Erro ao conectar com Gmail: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('❌ Erro OAuth Gmail:', error);
      toast({
        title: "Erro de Autorização",
        description: `Erro: ${error}`,
        variant: "destructive"
      });
      // Limpar URL após erro
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state === 'gmail_auth' && user) {
      console.log('🔄 Processando código OAuth Gmail...');
      setLoading(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'exchange_code_gmail',
            code: code,
            user_id: user.id
          }
        });

        if (error) {
          console.error('❌ Erro da Edge Function Gmail:', error);
          throw new Error(`Erro ao conectar: ${error.message || 'Erro desconhecido'}`);
        }

        if (data?.success) {
          console.log('✅ OAuth Gmail processado com sucesso');
          
          // Limpar URL primeiro e redirecionar para o calendário
          window.history.replaceState({}, document.title, '/dashboard');
          
          // Aguardar um pouco para garantir que a conta foi salva
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar conexão
          await checkConnection();
          
          // Mostrar popup de sucesso
          toast({
            title: "✅ Gmail Conectado!",
            description: "Gmail foi conectado com sucesso! Agora você pode enviar emails diretamente da plataforma.",
            duration: 5000,
          });
        } else {
          throw new Error('Falha na conexão com Gmail');
        }
      } catch (error) {
        console.error('💥 Erro ao processar OAuth Gmail:', error);
        toast({
          title: "Erro",
          description: `Erro ao conectar: ${error.message}`,
          variant: "destructive"
        });
        
        // Limpar URL após erro
        window.history.replaceState({}, document.title, '/dashboard');
      } finally {
        setLoading(false);
      }
    }
  };

  const disconnectGmail = async () => {
    if (!user || !emailAccount) return;

    setLoading(true);
    
    try {
      console.log('🔌 Desconectando Gmail...');
      
      const { error } = await supabase
        .from('user_email_accounts')
        .delete()
        .eq('id', emailAccount.id);

      if (error) {
        throw error;
      }

      setIsConnected(false);
      setEmailAccount(null);
      
      console.log('✅ Gmail desconectado');
      toast({
        title: "Sucesso",
        description: "Gmail desconectado com sucesso"
      });
    } catch (error) {
      console.error('💥 Erro ao desconectar Gmail:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar Gmail",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkConnection();
      getGoogleClientId();
      processOAuthCallback();
    }
  }, [user]);

  return {
    isConnected,
    loading,
    emailAccount,
    connectGmail,
    disconnectGmail,
    checkConnection
  };
};