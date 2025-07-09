
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const checkConnection = async () => {
    if (!user) {
      console.log('⚠️ Não há usuário logado');
      return;
    }

    try {
      console.log('🔍 Verificando conexão Google Calendar para usuário:', user.id);
      console.log('🔍 User object completo:', user);
      
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
        console.log('✅ Integração Google encontrada:', data);
        console.log('🕐 Token expira em:', data.expires_at);
        console.log('🕐 Agora é:', new Date().toISOString());
        
        // Verificar se o token está expirado
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        
        if (now >= expiresAt) {
          console.log('⚠️ Token expirado, tentando renovar...');
          try {
            await renewTokenAndUpdateState(data);
          } catch (error) {
            console.error('❌ Erro ao renovar token:', error);
            setIsConnected(false);
            setIntegration(null);
            return;
          }
        } else {
          setIntegration(data);
          setIsConnected(true);
        }
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

  const getGoogleClientId = async () => {
    try {
      console.log('🔑 Buscando Google Client ID...');
      
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
      
      // Obter Client ID da edge function
      const clientId = googleClientId || await getGoogleClientId();
      
      if (!clientId) {
        throw new Error('Não foi possível obter o Google Client ID');
      }

      // Redirect to Google OAuth with calendar scopes
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ');

      const redirectUri = `https://84320702-4971-42e0-bb91-6756570feabc.lovableproject.com/dashboard`;
      
      console.log('📝 Configuração OAuth:', {
        clientId: clientId.substring(0, 20) + '...',
        redirectUri: redirectUri,
        scopes: scopes
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=google_calendar_auth`;

      console.log('🔗 URL de autorização Google Meet:', authUrl);
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

  const processOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    console.log('🔄 processOAuthCallback executado:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      hasUser: !!user,
      state: state,
      userDetails: user ? { id: user.id, email: user.email } : null,
      currentUrl: window.location.href
    });

    if (error) {
      console.error('❌ Erro OAuth Google Meet:', error);
      
      let errorMessage = `Erro: ${error}`;
      if (error === 'access_denied') {
        errorMessage = 'Acesso negado. Você precisa autorizar o aplicativo para conectar o Google Meet.';
      } else if (error.includes('redirect_uri_mismatch')) {
        errorMessage = 'Erro de configuração: Adicione https://84320702-4971-42e0-bb91-6756570feabc.lovableproject.com/dashboard nas "Authorized redirect URIs" do Google Console.';
      }
      
      toast({
        title: "Erro de Autorização Google Meet",
        description: errorMessage,
        variant: "destructive"
      });
      // Limpar URL após erro
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Verificar se há code e state, mesmo sem user ainda carregado
    if (code && state === 'google_calendar_auth') {
      console.log('✅ Code e state válidos encontrados:', { 
        codePrefix: code.substring(0, 20) + '...', 
        state,
        userLoaded: !!user 
      });
      
      // Se user não está carregado ainda, aguardar um pouco
      if (!user) {
        console.log('⏳ User não carregado, aguardando...');
        // Aguardar user carregar (máximo 10 segundos)
        let attempts = 0;
        const maxAttempts = 50; // 10 segundos (200ms * 50)
        
        const waitForUser = async () => {
          while (!user && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
            console.log(`⏳ Tentativa ${attempts}/${maxAttempts} aguardando user...`);
          }
          
          if (!user) {
            console.error('❌ Timeout aguardando user');
            throw new Error('Usuário não foi carregado. Tente fazer login novamente.');
          }
          
          console.log('✅ User carregado após aguardar:', user.id);
          return user;
        };
        
        try {
          await waitForUser();
        } catch (error) {
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive"
          });
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      }
      
      console.log('🔄 Processando código OAuth...', { 
        codePrefix: code.substring(0, 20) + '...', 
        state,
        userId: user?.id || 'AGUARDANDO USER' 
      });
      
      setLoading(true);
      
      try {
        console.log('📡 Chamando google-calendar edge function...');
        console.log('📡 Payload enviado:', {
          action: 'exchange_code',
          code: code.substring(0, 20) + '...',
          user_id: user?.id
        });
        
        // Implementar retry logic para melhor confiabilidade
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`🔄 Tentativa ${attempt}/${maxRetries} de conectar com Google...`);
            
            const { data, error } = await supabase.functions.invoke('google-calendar', {
              body: {
                action: 'exchange_code',
                code: code,
                user_id: user?.id
              }
            });

            console.log(`📡 Resposta tentativa ${attempt}:`, { 
              data, 
              error,
              hasData: !!data,
              hasError: !!error,
              success: data?.success
            });

            if (error) {
              throw new Error(`Edge Function Error: ${error.message || error}`);
            }

            if (data?.success) {
              console.log('✅ OAuth processado com sucesso na tentativa', attempt);
              
              // Limpar URL imediatamente
              window.history.replaceState({}, document.title, '/dashboard');
              
              // Aguardar salvamento na base de dados
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Verificar se a integração foi salva corretamente
              await checkConnection();
              
              // Mostrar toast de sucesso
              toast({
                title: "✅ Google Meet Conectado!",
                description: "Google Meet foi conectado com sucesso! Agora você pode criar reuniões automaticamente.",
                duration: 5000,
              });
              
              // Importar eventos em background (não crítico)
              try {
                await importGoogleCalendarEvents();
                console.log('📅 Eventos importados com sucesso');
              } catch (importError) {
                console.warn('⚠️ Erro ao importar eventos (não crítico):', importError);
              }
              
              return; // Sucesso - sair do loop de retry
              
            } else {
              throw new Error(data?.error || 'Resposta inesperada da edge function');
            }
            
          } catch (attemptError) {
            console.error(`❌ Erro na tentativa ${attempt}:`, attemptError);
            lastError = attemptError;
            
            // Se não é a última tentativa, aguardar antes de tentar novamente
            if (attempt < maxRetries) {
              const waitTime = attempt * 2000; // 2s, 4s, 6s...
              console.log(`⏳ Aguardando ${waitTime}ms antes da próxima tentativa...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        
        // Se chegou aqui, todas as tentativas falharam
        throw lastError || new Error('Falha em todas as tentativas de conexão');
        
      } catch (error) {
        console.error('💥 Erro final no processamento OAuth:', error);
        
        // Determinar mensagem de erro mais específica
        let errorMessage = 'Erro desconhecido ao conectar';
        let actionMessage = 'Tente novamente ou verifique sua conexão.';
        
        if (error.message.includes('invalid_grant')) {
          errorMessage = 'Código de autorização expirado';
          actionMessage = 'Por favor, tente conectar novamente.';
        } else if (error.message.includes('invalid_client')) {
          errorMessage = 'Configuração Google inválida';
          actionMessage = 'Verifique as credenciais no Google Console.';
        } else if (error.message.includes('redirect_uri_mismatch')) {
          errorMessage = 'URL de redirect não configurada';
          actionMessage = 'Verifique as URLs autorizadas no Google Console.';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage = 'Problema de conexão';
          actionMessage = 'Verifique sua internet e tente novamente.';
        } else {
          errorMessage = error.message;
        }
        
        toast({
          title: "❌ Erro ao Conectar Google Meet",
          description: `${errorMessage}. ${actionMessage}`,
          variant: "destructive",
          duration: 8000
        });
        
        // Limpar URL para permitir nova tentativa
        window.history.replaceState({}, document.title, '/dashboard');
      } finally {
        setLoading(false);
      }
    }
  };

  const importGoogleCalendarEvents = async () => {
    if (!integration) return;

    try {
      console.log('📅 Importando eventos do Google Calendar...');
      
      const accessToken = await getValidAccessToken();
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'import_events',
          accessToken: accessToken,
          userId: user?.id
        }
      });

      if (error) {
        console.error('❌ Erro ao importar eventos:', error);
        return;
      }

      if (data?.success) {
        console.log('✅ Eventos importados com sucesso:', data.imported);
        toast({
          title: "Eventos Importados",
          description: `${data.imported || 0} eventos foram importados do Google Calendar`
        });
      }
    } catch (error) {
      console.error('💥 Erro ao importar eventos:', error);
    }
  };

  const renewTokenAndUpdateState = async (integrationData: any) => {
    if (!integrationData?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('🔄 Renovando token Google...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'renew_token',
          refreshToken: integrationData.refresh_token,
          userId: user?.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        console.log('✅ Token renovado com sucesso');
        // Recarregar a integração atualizada
        await checkConnection();
        return data.access_token;
      }

      throw new Error('Failed to renew token');
    } catch (error) {
      console.error('💥 Erro ao renovar token:', error);
      throw error;
    }
  };

  const renewToken = async () => {
    if (!integration?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('🔄 Renovando token Google...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'renew_token',
          refreshToken: integration.refresh_token,
          userId: user?.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        console.log('✅ Token renovado com sucesso');
        await checkConnection(); // Recarrega a integração com o novo token
        return data.access_token;
      }

      throw new Error('Failed to renew token');
    } catch (error) {
      console.error('💥 Erro ao renovar token:', error);
      throw error;
    }
  };

  const getValidAccessToken = async () => {
    if (!integration) {
      throw new Error('Google Calendar not connected');
    }

    // Verificar se o token expirou
    const now = new Date();
    const expiresAt = new Date(integration.expires_at);
    
    if (now >= expiresAt) {
      console.log('🔄 Token expirado, renovando...');
      return await renewToken();
    }

    return integration.access_token;
  };

  const createGoogleMeetEvent = async (eventData: any) => {
    if (!integration) {
      throw new Error('Google Calendar not connected');
    }

    try {
      console.log('🔄 Criando evento Google Meet com dados:', eventData);
      
      const accessToken = await getValidAccessToken();
      
      // Garantir que os dados estão no formato correto
      const processedEventData = {
        title: eventData.title || 'Nova Reunião',
        description: eventData.description || '',
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        attendees: eventData.attendees || []
      };

      console.log('📝 Dados processados para o evento:', processedEventData);
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'create_event',
          eventData: processedEventData,
          accessToken: accessToken
        }
      });

      if (error) {
        console.error('❌ Erro da edge function:', error);
        throw new Error(`Erro ao criar evento: ${error.message}`);
      }

      if (data?.success) {
        console.log('✅ Evento criado com sucesso:', data);
        return {
          success: true,
          googleEventId: data.googleEventId,
          meetLink: data.meetLink
        };
      } else {
        console.error('❌ Resposta inesperada da edge function:', data);
        throw new Error('Falha ao criar evento no Google Calendar');
      }
    } catch (error) {
      console.error('💥 Erro ao criar evento Google Meet:', error);
      throw error;
    }
  };

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

  useEffect(() => {
    console.log('🔄 useGoogleCalendar useEffect executado:', {
      hasUser: !!user,
      userDetails: user ? { id: user.id, email: user.email } : null,
      currentUrl: window.location.href,
      hasCode: window.location.search.includes('code='),
      hasState: window.location.search.includes('state=google_calendar_auth'),
      searchParams: window.location.search
    });
    
    // Sempre verificar OAuth callback se há code na URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCallback = urlParams.get('code') && urlParams.get('state') === 'google_calendar_auth';
    
    if (hasOAuthCallback) {
      console.log('🔄 OAuth callback detectado, processando...');
      processOAuthCallback();
    }
    
    if (user) {
      console.log('✅ User disponível, executando funções de inicialização...');
      checkConnection();
      getGoogleClientId();
    } else {
      console.log('⚠️ User não disponível ainda, aguardando...');
    }
  }, [user]);

  return {
    isConnected,
    loading,
    integration,
    connectGoogle,
    disconnectGoogle,
    checkConnection,
    getValidAccessToken,
    createGoogleMeetEvent,
    importGoogleCalendarEvents
  };
};
