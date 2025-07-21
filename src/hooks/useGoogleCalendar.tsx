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

// Global cache and debounce management
const globalState = {
  clientId: null as string | null,
  lastCheck: 0,
  checkInterval: 5000, // Reduzido para 5 segundos
  isProcessing: false,
  hasProcessedOAuth: false,
  processingTimeout: null as number | null,
  cachedConnection: null as boolean | null,
  cachedIntegration: null as GoogleIntegration | null,
};

export const useGoogleCalendar = () => {
  const [state, setState] = useState<GoogleCalendarState>({
    isConnected: globalState.cachedConnection ?? false,
    loading: false,
    processingOAuth: false,
    integration: globalState.cachedIntegration,
    error: null
  });
  
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const debounceRef = useRef<number>();
  const mountedRef = useRef(true);

  // Safe state update
  const updateState = useCallback((updates: Partial<GoogleCalendarState>) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Debounced function calls - reduzido o delay
  const debounce = useCallback((fn: Function, delay: number = 100) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(fn, delay);
  }, []);

  // Get Google Client ID with cache
  const getGoogleClientId = useCallback(async (): Promise<string | null> => {
    if (globalState.clientId) return globalState.clientId;

    try {
      console.log('🔍 Fetching Google Client ID...');
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({ action: 'get_client_id' })
      });

      if (error) {
        console.error('❌ Error fetching Client ID:', error);
        throw error;
      }
      
      if (data?.client_id) {
        globalState.clientId = data.client_id;
        console.log('✅ Client ID obtained successfully');
        return data.client_id;
      }
      throw new Error('Client ID not found in response');
    } catch (error) {
      console.error('❌ Error getting Client ID:', error);
      return null;
    }
  }, []);

  // Check connection with improved caching and faster response
  const checkConnection = useCallback(async (force = false) => {
    if (!user || authLoading) return;
    
    // Retornar cache imediatamente se disponível e recente
    const now = Date.now();
    if (!force && globalState.cachedConnection !== null && (now - globalState.lastCheck) < globalState.checkInterval) {
      updateState({ 
        isConnected: globalState.cachedConnection,
        integration: globalState.cachedIntegration,
        loading: false 
      });
      return;
    }

    // Prevent multiple simultaneous calls
    if (globalState.isProcessing && !force) return;
    
    globalState.isProcessing = true;
    updateState({ loading: true, error: null });
    
    try {
      console.log('🔍 Checking Google Meet connection...');
      const { data, error } = await supabase
        .from('meeting_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google_meet')
        .maybeSingle();

      if (error) throw error;

      globalState.lastCheck = now;

      if (data) {
        // Check if token is expired
        const expiresAt = new Date(data.expires_at);
        const isExpired = new Date() >= expiresAt;
        
        if (isExpired && data.refresh_token) {
          console.log('🔄 Token expired, renewing...');
          await renewToken(data.refresh_token);
          return;
        }
        
        console.log('✅ Google Meet is connected');
        globalState.cachedConnection = true;
        globalState.cachedIntegration = data;
        updateState({ 
          integration: data, 
          isConnected: true, 
          loading: false 
        });
      } else {
        console.log('ℹ️ Google Meet not connected');
        globalState.cachedConnection = false;
        globalState.cachedIntegration = null;
        updateState({ 
          isConnected: false, 
          integration: null, 
          loading: false 
        });
      }
    } catch (error) {
      console.error('❌ Error checking connection:', error);
      globalState.cachedConnection = false;
      globalState.cachedIntegration = null;
      updateState({ 
        isConnected: false, 
        integration: null, 
        loading: false,
        error: error.message 
      });
    } finally {
      globalState.isProcessing = false;
    }
  }, [user, authLoading, updateState]);

  // Connect to Google with improved error handling and user ID in state
  const connectGoogle = useCallback(async () => {
    if (!user || globalState.isProcessing) return;

    globalState.isProcessing = true;
    updateState({ loading: true, error: null });
    
    try {
      console.log('🚀 Starting Google OAuth connection...');
      const clientId = await getGoogleClientId();
      if (!clientId) {
        throw new Error('Failed to get Google Client ID');
      }

      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ');

      // Use the EXACT same redirect URI that Google expects
      const redirectUri = 'https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/google-calendar';
      
      // Use actual user ID in state for security validation
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}`;

      console.log('🔗 OAuth Configuration:');
      console.log('  - Client ID:', clientId.substring(0, 20) + '...');
      console.log('  - Redirect URI:', redirectUri);
      console.log('  - User ID in state:', user.id);
      console.log('🔗 Redirecting to Google OAuth...');
      
      toast({
        title: "Redirecionando para Google",
        description: "Você será redirecionado para autorizar o acesso ao Google Calendar...",
        duration: 3000,
      });
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ Error connecting:', error);
      updateState({ loading: false, error: error.message });
      toast({
        title: "Erro de Conexão",
        description: `Falha ao conectar com Google: ${error.message}`,
        variant: "destructive"
      });
      globalState.isProcessing = false;
    }
  }, [user, getGoogleClientId, updateState, toast]);

  // Process OAuth code with improved state validation
  const processGoogleOAuthCode = useCallback(async (code: string, userId: string) => {
    if (globalState.hasProcessedOAuth) return;

    // Validate that the state matches the current user
    if (userId !== user?.id) {
      console.error('❌ State validation failed: user ID mismatch');
      toast({
        title: "❌ Erro de Segurança",
        description: "Estado OAuth inválido. Tente conectar novamente.",
        variant: "destructive"
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    globalState.hasProcessedOAuth = true;
    globalState.isProcessing = true;
    
    // Set timeout to reset processing state
    if (globalState.processingTimeout) {
      clearTimeout(globalState.processingTimeout);
    }
    globalState.processingTimeout = window.setTimeout(() => {
      globalState.hasProcessedOAuth = false;
      globalState.isProcessing = false;
    }, 30000); // 30 seconds timeout
    
    updateState({ loading: true, processingOAuth: true, error: null });
    
    try {
      console.log('🔄 Processing OAuth code for user:', userId);
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'exchange_code',
          code: code,
          user_id: userId
        })
      });

      if (error) {
        console.error('❌ OAuth exchange error:', error);
        throw new Error(`OAuth Error: ${error.message}`);
      }

      if (data?.success) {
        console.log('✅ OAuth processed successfully!');
        
        // Clear URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Clear cache and check connection
        globalState.lastCheck = 0;
        globalState.cachedConnection = null;
        globalState.cachedIntegration = null;
        
        setTimeout(() => {
          checkConnection(true);
          toast({
            title: "✅ Google Meet Conectado!",
            description: "Google Meet foi conectado com sucesso!",
            duration: 5000,
          });
        }, 500); // Reduzido o delay
        
      } else {
        throw new Error(data?.error || 'Resposta inesperada do servidor');
      }
      
    } catch (error) {
      console.error('❌ OAuth error:', error);
      
      let errorMessage = 'Falha ao conectar com Google Meet';
      if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = `❌ ERRO DE CONFIGURAÇÃO - redirect_uri_mismatch

Configure no Google Cloud Console EXATAMENTE:

✅ Authorized JavaScript origins:
https://ellosuit.online

✅ Authorized redirect URIs:
https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/google-calendar

⚠️ IMPORTANTE: 
- Copie as URLs EXATAMENTE como mostrado
- Aguarde até 5 minutos após salvar
- Certifique-se de não ter espaços extras`;
      } else if (error.message.includes('invalid_grant')) {
        errorMessage = 'Código de autorização expirado. Tente conectar novamente.';
      }
      
      updateState({ error: errorMessage });
      toast({
        title: "❌ Falha na Conexão",
        description: errorMessage,
        variant: "destructive",
        duration: 10000
      });
      
      // Clear URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      updateState({ loading: false, processingOAuth: false });
      globalState.isProcessing = false;
      if (globalState.processingTimeout) {
        clearTimeout(globalState.processingTimeout);
      }
    }
  }, [user, updateState, checkConnection, toast]);

  // Renew token
  const renewToken = useCallback(async (refreshToken: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🔄 Renewing access token...');
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
      
      // Clear cache to force refresh
      globalState.cachedConnection = null;
      globalState.cachedIntegration = null;
      globalState.lastCheck = 0;
      
      return data.access_token;
    } catch (error) {
      console.error('❌ Token renewal error:', error);
      throw error;
    }
  }, [user]);

  // Get valid access token
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

  // Create Google Meet event
  const createGoogleMeetEvent = useCallback(async (eventData: any) => {
    if (!state.integration) {
      throw new Error('Google Calendar not connected');
    }

    try {
      console.log('📅 Creating Google Meet event...');
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

      console.log('✅ Google Meet event created successfully');
      return {
        success: true,
        googleEventId: data.googleEventId,
        meetLink: data.meetLink
      };
    } catch (error) {
      console.error('❌ Error creating event:', error);
      throw error;
    }
  }, [state.integration, getValidAccessToken]);

  // Disconnect Google
  const disconnectGoogle = useCallback(async () => {
    if (!user || !state.integration) return;

    updateState({ loading: true });
    
    try {
      console.log('🔌 Disconnecting Google Meet...');
      const { error } = await supabase
        .from('meeting_integrations')
        .delete()
        .eq('id', state.integration.id);

      if (error) throw error;

      // Clear cache
      globalState.clientId = null;
      globalState.lastCheck = 0;
      globalState.cachedConnection = false;
      globalState.cachedIntegration = null;

      updateState({ 
        isConnected: false, 
        integration: null, 
        loading: false,
        error: null 
      });
      
      console.log('✅ Google Meet disconnected successfully');
      toast({
        title: "Sucesso",
        description: "Google Calendar desconectado com sucesso"
      });
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
      updateState({ loading: false, error: error.message });
      toast({
        title: "Erro",
        description: "Falha ao desconectar Google Calendar",
        variant: "destructive"
      });
    }
  }, [user, state.integration, updateState, toast]);

  // Import Google Calendar events - implementação melhorada
  const importGoogleCalendarEvents = useCallback(async () => {
    if (!state.integration) {
      throw new Error('Google Calendar not connected');
    }

    try {
      console.log('📅 Importing Google Calendar events...');
      const accessToken = await getValidAccessToken();
      
      // Buscar eventos dos próximos 90 dias para garantir mais dados
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Google Calendar API error:', response.status, errorText);
        throw new Error(`Google Calendar API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Google Calendar API response:', data);
      
      if (data.items && data.items.length > 0) {
        console.log('📅 Processing Google Calendar events:', data.items.length);
        
        const eventsToSave = data.items
          .filter((event: any) => {
            // Filtrar eventos válidos
            return event.summary && event.id && (event.start?.dateTime || event.start?.date);
          })
          .map((event: any) => {
            // Detectar se é um evento do Google Meet
            const hasMeetLink = event.conferenceData?.entryPoints?.some((ep: any) => ep.entryPointType === 'video');
            const meetLink = event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;
            
            // Detectar se é um evento de dia inteiro
            const isAllDay = !event.start?.dateTime;
            
            // Garantir que as datas estejam no formato correto
            let startDate = event.start?.dateTime || event.start?.date;
            let endDate = event.end?.dateTime || event.end?.date;
            
            // Se for evento de dia inteiro, ajustar as datas
            if (isAllDay) {
              startDate = new Date(startDate + 'T00:00:00').toISOString();
              endDate = new Date(endDate + 'T23:59:59').toISOString();
            }

            return {
              title: event.summary,
              description: event.description || '',
              start_date: startDate,
              end_date: endDate,
              event_type: hasMeetLink ? 'meeting' : 'appointment',
              meeting_link: meetLink,
              meeting_provider: 'google_meet',
              attendees: event.attendees?.map((att: any) => att.email).filter(Boolean) || [],
              is_all_day: isAllDay,
              google_event_id: event.id
            };
          });

        console.log('✅ Events processed for saving:', eventsToSave.length);
        return eventsToSave;
      }

      console.log('ℹ️ No events found in Google Calendar');
      return [];
    } catch (error) {
      console.error('❌ Error importing Google Calendar events:', error);
      throw error;
    }
  }, [state.integration, getValidAccessToken]);

  // Delete Google Calendar event
  const deleteGoogleCalendarEvent = useCallback(async (googleEventId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('🗑️ Deleting Google Calendar event:', googleEventId);
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'delete_event',
          googleEventId: googleEventId,
          userId: user.id
        })
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to delete event from Google Calendar');
      }

      console.log('✅ Event deleted from Google Calendar successfully');
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('❌ Error deleting Google Calendar event:', error);
      throw error;
    }
  }, [user]);

  // Main effect for initialization and OAuth processing - otimizado
  useEffect(() => {
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const urlState = urlParams.get('state');
    const error = urlParams.get('error');
    const googleConnected = urlParams.get('google_connected');
    
    // Handle success redirect from OAuth
    if (googleConnected === 'true') {
      console.log('✅ Returning from successful OAuth');
      window.history.replaceState({}, document.title, window.location.pathname);
      checkConnection(true);
      toast({
        title: "✅ Google Meet Conectado!",
        description: "Google Meet foi conectado com sucesso!",
        duration: 5000,
      });
      return;
    }
    
    // Handle OAuth error
    if (error) {
      console.error('❌ OAuth error:', error);
      let errorMessage = `OAuth Error: ${error}`;
      if (error === 'access_denied') {
        errorMessage = 'Acesso negado. Você precisa autorizar a aplicação para conectar o Google Meet.';
      } else if (error === 'invalid_state') {
        errorMessage = 'Estado de segurança inválido. Tente conectar novamente.';
      }
      
      toast({
        title: "Erro de Autorização",
        description: errorMessage,
        variant: "destructive"
      });
      
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Process OAuth code with user ID validation
    if (code && urlState && !globalState.hasProcessedOAuth) {
      if (user && !authLoading) {
        processGoogleOAuthCode(code, urlState);
      }
      return;
    }
    
    // Normal initialization - mais rápido
    if (!authLoading && user && !globalState.isProcessing) {
      // Se temos cache, usar imediatamente
      if (globalState.cachedConnection !== null) {
        updateState({
          isConnected: globalState.cachedConnection,
          integration: globalState.cachedIntegration,
          loading: false
        });
      }
      
      // Verificar conexão com delay menor
      debounce(() => {
        checkConnection();
        getGoogleClientId();
      }, 50);
    }
  }, [user, authLoading, checkConnection, getGoogleClientId, processGoogleOAuthCode, toast, debounce, updateState]);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (globalState.processingTimeout) {
        clearTimeout(globalState.processingTimeout);
        globalState.processingTimeout = null;
      }
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
    importGoogleCalendarEvents,
    deleteGoogleCalendarEvent
  };
};
