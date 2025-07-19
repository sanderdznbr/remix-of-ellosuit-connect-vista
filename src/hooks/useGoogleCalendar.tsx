import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Função para obter URL base consistente - SEMPRE sem www
  const getBaseUrl = () => {
    // Para produção, SEMPRE usar sem www independente da URL atual
    if (window.location.hostname === 'www.ellosuit.online' || window.location.hostname === 'ellosuit.online') {
      return 'https://ellosuit.online';
    }
    // Para desenvolvimento local
    return window.location.origin;
  };

  // Função para verificar conexão
  const checkConnection = async () => {
    if (!user) {
      console.log('⚠️ Não há usuário logado para verificar conexão');
      setIsConnected(false);
      setIntegration(null);
      return;
    }

    try {
      console.log('🔍 Verificando conexão Google Calendar para usuário:', user.id);
      
      const { data, error } = await supabase
        .from('meeting_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google_meet')
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao verificar integração:', error);
        setIsConnected(false);
        setIntegration(null);
        return;
      }

      if (data) {
        console.log('✅ Integração Google encontrada:', data.id);
        
        // Verificar se o token está expirado
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        
        if (now >= expiresAt && data.refresh_token) {
          console.log('⚠️ Token expirado, tentando renovar...');
          try {
            await renewToken(data.refresh_token);
            // Recarregar dados após renovação
            await checkConnection();
            return;
          } catch (error) {
            console.error('❌ Erro ao renovar token:', error);
            setIsConnected(false);
            setIntegration(null);
            return;
          }
        }
        
        setIntegration(data);
        setIsConnected(true);
      } else {
        console.log('⚠️ Nenhuma integração Google encontrada');
        setIsConnected(false);
        setIntegration(null);
      }
    } catch (error) {
      console.error('💥 Erro ao verificar conexão Google:', error);
      setIsConnected(false);
      setIntegration(null);
    }
  };

  // Função para obter Google Client ID
  const getGoogleClientId = async () => {
    try {
      console.log('🔑 Buscando Google Client ID...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({ action: 'get_client_id' })
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

  // Função para conectar com Google
  const connectGoogle = async () => {
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
      console.log('🔗 Iniciando conexão com Google Calendar...');
      
      const clientId = googleClientId || await getGoogleClientId();
      
      if (!clientId) {
        throw new Error('Não foi possível obter o Google Client ID');
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ');

      // Usar URL base consistente SEMPRE sem www + /dashboard
      const baseUrl = getBaseUrl();
      const redirectUri = `${baseUrl}/dashboard`;
      
      console.log('📝 Configuração OAuth:', {
        clientId: clientId.substring(0, 20) + '...',
        redirectUri: redirectUri,
        scopes: scopes,
        baseUrl: baseUrl,
        currentHostname: window.location.hostname
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=google_calendar_auth`;

      console.log('🔗 Redirecionando para autorização Google...');
      console.log('🔗 Auth URL:', authUrl);
      console.log('🔗 Redirect URI final:', redirectUri);
      window.location.href = authUrl;
    } catch (error) {
      console.error('💥 Erro ao conectar Google:', error);
      toast({
        title: "Erro",
        description: `Erro ao conectar com Google Calendar: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para processar código OAuth com usuário disponível
  const processGoogleOAuthCode = async (code: string, userId: string) => {
    console.log('🔄 Processando código OAuth para usuário:', userId);
    
    setLoading(true);
    setProcessingOAuth(true);
    
    try {
      console.log('📡 Chamando google-calendar edge function...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'exchange_code',
          code: code,
          user_id: userId
        })
      });

      console.log('📡 Resposta da edge function:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Edge Function Error: ${error.message || JSON.stringify(error)}`);
      }

      if (data?.success) {
        console.log('✅ OAuth processado com sucesso!');
        
        // Limpar URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Aguardar um momento e verificar conexão
        setTimeout(async () => {
          await checkConnection();
          
          toast({
            title: "✅ Google Meet Conectado!",
            description: "Google Meet foi conectado com sucesso! Agora você pode criar reuniões automaticamente.",
            duration: 5000,
          });
        }, 1000);
        
      } else {
        console.error('❌ Dados inesperados da edge function:', data);
        throw new Error(data?.error || 'Resposta inesperada da edge function');
      }
      
    } catch (error) {
      console.error('💥 Erro no processamento OAuth:', error);
      
      let errorMessage = 'Erro ao conectar com Google Meet';
      if (error.message.includes('invalid_grant')) {
        errorMessage = 'Código de autorização expirado. Tente conectar novamente.';
      } else if (error.message.includes('invalid_client')) {
        errorMessage = 'Configuração Google inválida. Verifique as credenciais.';
      } else if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'Erro de configuração do redirect URI. Verifique as configurações no Google Console.';
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Erro ao Conectar Google Meet",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
      
      // Limpar URL em caso de erro
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } finally {
      setLoading(false);
      setProcessingOAuth(false);
    }
  };

  // Função para renovar token
  const renewToken = async (refreshToken: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      console.log('🔄 Renovando token...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'renew_token',
          refreshToken: refreshToken,
          userId: user.id
        })
      });

      if (error) throw error;

      if (data?.success) {
        console.log('✅ Token renovado com sucesso');
        return data.access_token;
      }

      throw new Error('Failed to renew token');
    } catch (error) {
      console.error('💥 Erro ao renovar token:', error);
      throw error;
    }
  };

  // Função para obter access token válido
  const getValidAccessToken = async () => {
    if (!integration) {
      throw new Error('Google Calendar not connected');
    }

    const now = new Date();
    const expiresAt = new Date(integration.expires_at);
    
    if (now >= expiresAt && integration.refresh_token) {
      console.log('🔄 Token expirado, renovando...');
      return await renewToken(integration.refresh_token);
    }

    return integration.access_token;
  };

  // Função para criar evento Google Meet
  const createGoogleMeetEvent = async (eventData: any) => {
    if (!integration) {
      throw new Error('Google Calendar not connected');
    }

    try {
      console.log('🔄 Criando evento Google Meet...');
      
      const accessToken = await getValidAccessToken();
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'create_event',
          eventData: {
            title: eventData.title || 'Nova Reunião',
            description: eventData.description || '',
            start_date: eventData.start_date,
            end_date: eventData.end_date,
            attendees: eventData.attendees || []
          },
          accessToken: accessToken
        })
      });

      if (error) {
        throw new Error(`Erro ao criar evento: ${error.message}`);
      }

      if (data?.success) {
        console.log('✅ Evento criado com sucesso');
        return {
          success: true,
          googleEventId: data.googleEventId,
          meetLink: data.meetLink
        };
      } else {
        throw new Error('Falha ao criar evento no Google Calendar');
      }
    } catch (error) {
      console.error('💥 Erro ao criar evento Google Meet:', error);
      throw error;
    }
  };

  // Função para desconectar Google
  const disconnectGoogle = async () => {
    if (!user || !integration) return;

    setLoading(true);
    
    try {
      console.log('🔌 Desconectando Google Calendar...');
      
      const { error } = await supabase
        .from('meeting_integrations')
        .delete()
        .eq('id', integration.id);

      if (error) {
        throw error;
      }

      setIsConnected(false);
      setIntegration(null);
      
      console.log('✅ Google Calendar desconectado');
      toast({
        title: "Sucesso",
        description: "Google Calendar desconectado com sucesso"
      });
    } catch (error) {
      console.error('💥 Erro ao desconectar Google:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar Google Calendar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para importar eventos do Google Calendar
  const importGoogleCalendarEvents = async () => {
    if (!integration) {
      console.log('⚠️ Google Calendar não conectado');
      return;
    }

    try {
      console.log('📥 Importando eventos do Google Calendar...');
      
      const accessToken = await getValidAccessToken();
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'import_events',
          accessToken: accessToken
        })
      });

      if (error) {
        throw new Error(`Erro ao importar eventos: ${error.message}`);
      }

      if (data?.success) {
        console.log('✅ Eventos importados com sucesso');
        return data.events || [];
      } else {
        throw new Error('Falha ao importar eventos do Google Calendar');
      }
    } catch (error) {
      console.error('💥 Erro ao importar eventos do Google Calendar:', error);
      return [];
    }
  };

  // useEffect principal para detectar OAuth callback e inicializar
  useEffect(() => {
    console.log('🔄 useGoogleCalendar useEffect executado:', {
      hasUser: !!user,
      authLoading,
      currentUrl: window.location.href,
      hostname: window.location.hostname,
      search: window.location.search
    });
    
    // Verificar se há código OAuth na URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    console.log('🔍 Parâmetros da URL:', { 
      hasCode: !!code, 
      hasState: !!state, 
      state, 
      hasError: !!error,
      error 
    });

    // Se há erro OAuth
    if (error) {
      console.error('❌ Erro OAuth Google Meet:', error);
      
      let errorMessage = `Erro: ${error}`;
      if (error === 'access_denied') {
        errorMessage = 'Acesso negado. Você precisa autorizar o aplicativo para conectar o Google Meet.';
      }
      
      toast({
        title: "Erro de Autorização Google Meet",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Se há código OAuth
    if (code && state === 'google_calendar_auth') {
      console.log('✅ Código OAuth detectado, processando...');
      setProcessingOAuth(true);
      
      if (user && !authLoading) {
        console.log('✅ Usuário disponível, processando OAuth imediatamente...');
        processGoogleOAuthCode(code, user.id);
      } else {
        console.log('⏳ Aguardando usuário carregar...');
        // Aguardar usuário carregar
        let attempts = 0;
        const maxAttempts = 20;
        
        const waitForUser = () => {
          setTimeout(() => {
            attempts++;
            console.log(`🔄 Tentativa ${attempts}/${maxAttempts} - Aguardando usuário...`);
            
            if (user && !authLoading) {
              console.log('✅ Usuário carregado, processando OAuth...');
              processGoogleOAuthCode(code, user.id);
            } else if (attempts < maxAttempts) {
              waitForUser();
            } else {
              console.log('⚠️ Timeout aguardando usuário');
              setProcessingOAuth(false);
              toast({
                title: "Erro",
                description: "Timeout aguardando autenticação do usuário",
                variant: "destructive"
              });
              
              // Limpar URL
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }, 500);
        };
        
        waitForUser();
      }
      return;
    }
    
    // Inicialização normal (sem OAuth callback)
    if (!authLoading && user) {
      console.log('✅ Inicialização normal - verificando conexão existente...');
      checkConnection();
      getGoogleClientId();
    } else if (!authLoading && !user) {
      console.log('⚠️ Usuário não autenticado');
      setIsConnected(false);
      setIntegration(null);
    }
  }, [user, authLoading]);

  return {
    isConnected,
    loading: loading || processingOAuth,
    integration,
    processingOAuth,
    connectGoogle,
    disconnectGoogle,
    checkConnection,
    getValidAccessToken,
    createGoogleMeetEvent,
    importGoogleCalendarEvents
  };
};
