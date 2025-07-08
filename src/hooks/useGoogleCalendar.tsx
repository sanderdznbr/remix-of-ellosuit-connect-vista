
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const checkConnection = async () => {
    if (!user) return;

    try {
      console.log('🔍 Verificando conexão Google Calendar para usuário:', user.id);
      
      const { data, error } = await supabase
        .from('meeting_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google_meet')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar integração:', error);
        return;
      }

      if (data) {
        console.log('✅ Integração Google encontrada:', data.id);
        setIntegration(data);
        setIsConnected(true);
      } else {
        console.log('⚠️ Nenhuma integração Google encontrada');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('💥 Erro ao verificar conexão Google:', error);
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

      const redirectUri = `${window.location.origin}/dashboard`;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=google_calendar_auth`;

      console.log('🔗 Redirecionando para:', authUrl);
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

    if (error) {
      console.error('❌ Erro OAuth:', error);
      toast({
        title: "Erro de Autorização",
        description: `Erro: ${error}`,
        variant: "destructive"
      });
      return;
    }

    if (code && state === 'google_calendar_auth' && user) {
      console.log('🔄 Processando código OAuth...');
      setLoading(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'exchange_code',
            code: code,
            userId: user.id
          }
        });

        if (error) {
          throw error;
        }

        if (data?.success) {
          console.log('✅ OAuth processado com sucesso');
          await checkConnection();
          
          // Importar eventos do Google Calendar
          await importGoogleCalendarEvents();
          
          toast({
            title: "Sucesso",
            description: "Google Calendar conectado e eventos importados!"
          });

          // Redirecionar para aba calendar se possível
          const hash = window.location.hash;
          if (hash.includes('dashboard')) {
            window.history.replaceState({}, document.title, '/dashboard#calendar');
          } else {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (error) {
        console.error('💥 Erro ao processar OAuth:', error);
        toast({
          title: "Erro",
          description: `Erro ao conectar: ${error.message}`,
          variant: "destructive"
        });
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
    if (user) {
      checkConnection();
      getGoogleClientId();
      processOAuthCallback();
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
