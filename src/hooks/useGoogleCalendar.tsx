
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface GoogleIntegration {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  provider_email: string;
}

interface GoogleCalendarState {
  isConnected: boolean;
  loading: boolean;
  processingOAuth: boolean;
  integration: GoogleIntegration | null;
  error: string | null;
}

// Cache para evitar múltiplas chamadas
const cache = {
  clientId: null as string | null,
  lastCheck: 0,
  checkInterval: 30000, // 30 segundos
};

export const useGoogleCalendar = () => {
  const [state, setState] = useState<GoogleCalendarState>({
    isConnected: false,
    loading: false,
    processingOAuth: false,
    integration: null,
    error: null
  });
  
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const isProcessingRef = useRef(false);
  const hasProcessedOAuthRef = useRef(false);

  // Função para atualizar estado de forma segura
  const updateState = useCallback((updates: Partial<GoogleCalendarState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Cache do Client ID
  const getGoogleClientId = useCallback(async (): Promise<string | null> => {
    if (cache.clientId) return cache.clientId;

    try {
      console.log('🔑 Fetching Google Client ID...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({ action: 'get_client_id' })
      });

      if (error) {
        throw new Error(`Failed to get Client ID: ${error.message}`);
      }

      if (data?.client_id) {
        cache.clientId = data.client_id;
        return data.client_id;
      }

      throw new Error('Client ID not found');
    } catch (error) {
      console.error('💥 Error getting Client ID:', error);
      return null;
    }
  }, []);

  // Verificar conexão com cache
  const checkConnection = useCallback(async (force = false) => {
    if (!user || (!force && state.loading)) return;
    
    // Cache check
    const now = Date.now();
    if (!force && (now - cache.lastCheck) < cache.checkInterval && state.integration) {
      return;
    }

    try {
      console.log('🔍 Checking connection...');
      updateState({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('meeting_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google_meet')
        .maybeSingle();

      if (error) {
        throw error;
      }

      cache.lastCheck = now;

      if (data) {
        // Verificar se token está expirado
        const expiresAt = new Date(data.expires_at);
        const isExpired = new Date() >= expiresAt;
        
        if (isExpired && data.refresh_token) {
          console.log('🔄 Token expired, renewing...');
          await renewToken(data.refresh_token);
          return;
        }
        
        updateState({ 
          integration: data, 
          isConnected: true, 
          loading: false 
        });
      } else {
        updateState({ 
          isConnected: false, 
          integration: null, 
          loading: false 
        });
      }
    } catch (error) {
      console.error('💥 Error checking connection:', error);
      updateState({ 
        isConnected: false, 
        integration: null, 
        loading: false,
        error: error.message 
      });
    }
  }, [user, state.loading, updateState]);

  // Conectar com Google
  const connectGoogle = useCallback(async () => {
    if (!user || isProcessingRef.current) return;

    isProcessingRef.current = true;
    updateState({ loading: true, error: null });
    
    try {
      console.log('🔗 Starting Google connection...');
      
      const clientId = await getGoogleClientId();
      if (!clientId) {
        throw new Error('Failed to get Google Client ID');
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ');

      const redirectUri = 'https://ellosuit.online/dashboard';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=google_meet_auth`;

      console.log('🔗 Redirecting to Google OAuth...');
      window.location.href = authUrl;
    } catch (error) {
      console.error('💥 Error connecting:', error);
      updateState({ loading: false, error: error.message });
      toast({
        title: "Erro de Conexão",
        description: `Falha ao conectar com Google: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [user, getGoogleClientId, updateState, toast]);

  // Processar código OAuth
  const processGoogleOAuthCode = useCallback(async (code: string, userId: string) => {
    if (hasProcessedOAuthRef.current) return;

    hasProcessedOAuthRef.current = true;
    console.log('🔄 Processing OAuth code...');
    
    updateState({ loading: true, processingOAuth: true, error: null });
    
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'exchange_code',
          code: code,
          user_id: userId
        })
      });

      if (error) {
        throw new Error(`OAuth Error: ${error.message}`);
      }

      if (data?.success) {
        console.log('✅ OAuth processed successfully!');
        
        // Limpar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Limpar cache e verificar conexão
        cache.lastCheck = 0;
        setTimeout(() => {
          checkConnection(true);
          toast({
            title: "✅ Google Meet Conectado!",
            description: "Google Meet foi conectado com sucesso!",
            duration: 5000,
          });
        }, 1000);
        
      } else {
        throw new Error(data?.error || 'Resposta inesperada do servidor');
      }
      
    } catch (error) {
      console.error('💥 OAuth error:', error);
      
      let errorMessage = 'Falha ao conectar com Google Meet';
      if (error.message.includes('invalid_grant')) {
        errorMessage = 'Código de autorização expirado. Tente conectar novamente.';
      }
      
      updateState({ error: errorMessage });
      toast({
        title: "❌ Falha na Conexão",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
      
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      updateState({ loading: false, processingOAuth: false });
      hasProcessedOAuthRef.current = false;
    }
  }, [updateState, checkConnection, toast]);

  // Renovar token
  const renewToken = useCallback(async (refreshToken: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'renew_token',
          refreshToken: refreshToken,
          userId: user.id
        })
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Failed to renew token');
      }

      console.log('✅ Token renewed successfully');
      return data.access_token;
    } catch (error) {
      console.error('💥 Token renewal error:', error);
      throw error;
    }
  }, [user]);

  // Obter access token válido
  const getValidAccessToken = useCallback(async () => {
    if (!state.integration) {
      throw new Error('Google Calendar not connected');
    }

    const now = new Date();
    const expiresAt = new Date(state.integration.expires_at);
    
    if (now >= expiresAt && state.integration.refresh_token) {
      return await renewToken(state.integration.refresh_token);
    }

    return state.integration.access_token;
  }, [state.integration, renewToken]);

  // Criar evento Google Meet
  const createGoogleMeetEvent = useCallback(async (eventData: any) => {
    if (!state.integration) {
      throw new Error('Google Calendar not connected');
    }

    try {
      const accessToken = await getValidAccessToken();
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'create_event',
          eventData: {
            title: eventData.title || 'New Meeting',
            description: eventData.description || '',
            start_date: eventData.start_date,
            end_date: eventData.end_date,
            attendees: eventData.attendees || []
          },
          accessToken: accessToken
        })
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Failed to create event');
      }

      return {
        success: true,
        googleEventId: data.googleEventId,
        meetLink: data.meetLink
      };
    } catch (error) {
      console.error('💥 Error creating event:', error);
      throw error;
    }
  }, [state.integration, getValidAccessToken]);

  // Desconectar Google
  const disconnectGoogle = useCallback(async () => {
    if (!user || !state.integration) return;

    updateState({ loading: true });
    
    try {
      const { error } = await supabase
        .from('meeting_integrations')
        .delete()
        .eq('id', state.integration.id);

      if (error) throw error;

      // Limpar cache
      cache.clientId = null;
      cache.lastCheck = 0;

      updateState({ 
        isConnected: false, 
        integration: null, 
        loading: false,
        error: null 
      });
      
      toast({
        title: "Sucesso",
        description: "Google Calendar desconectado com sucesso"
      });
    } catch (error) {
      console.error('💥 Error disconnecting:', error);
      updateState({ loading: false, error: error.message });
      toast({
        title: "Erro",
        description: "Falha ao desconectar Google Calendar",
        variant: "destructive"
      });
    }
  }, [user, state.integration, updateState, toast]);

  // Placeholder para importar eventos
  const importGoogleCalendarEvents = useCallback(async () => {
    return [];
  }, []);

  // Effect principal
  useEffect(() => {
    // Verificar OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const urlState = urlParams.get('state');
    const error = urlParams.get('error');
    
    // Tratar erro OAuth
    if (error) {
      console.error('❌ OAuth error:', error);
      let errorMessage = `OAuth Error: ${error}`;
      if (error === 'access_denied') {
        errorMessage = 'Acesso negado. Você precisa autorizar a aplicação para conectar o Google Meet.';
      }
      
      toast({
        title: "Erro de Autorização",
        description: errorMessage,
        variant: "destructive"
      });
      
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Processar código OAuth
    if (code && urlState === 'google_meet_auth' && !hasProcessedOAuthRef.current) {
      if (user && !authLoading) {
        processGoogleOAuthCode(code, user.id);
      }
      return;
    }
    
    // Inicialização normal
    if (!authLoading && user) {
      checkConnection();
      getGoogleClientId();
    }
  }, [user, authLoading, checkConnection, getGoogleClientId, processGoogleOAuthCode, toast]);

  // Cleanup
  useEffect(() => {
    return () => {
      isProcessingRef.current = false;
      hasProcessedOAuthRef.current = false;
    };
  }, []);

  return {
    isConnected: state.isConnected,
    loading: state.loading || state.processingOAuth,
    integration: state.integration,
    processingOAuth: state.processingOAuth,
    error: state.error,
    connectGoogle,
    disconnectGoogle,
    checkConnection: () => checkConnection(true),
    getValidAccessToken,
    createGoogleMeetEvent,
    importGoogleCalendarEvents
  };
};
