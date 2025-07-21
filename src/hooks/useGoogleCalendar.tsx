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

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
}

interface GoogleCalendarState {
  isConnected: boolean;
  loading: boolean;
  processingOAuth: boolean;
  integration: GoogleIntegration | null;
  error: string | null;
  events: GoogleCalendarEvent[];
}

// Global cache and debounce management
const globalState = {
  clientId: null as string | null,
  lastCheck: 0,
  checkInterval: 5000,
  isProcessing: false,
  hasProcessedOAuth: false,
  processingTimeout: null as number | null,
  cachedConnection: null as boolean | null,
  cachedIntegration: null as GoogleIntegration | null,
  cachedEvents: null as GoogleCalendarEvent[] | null,
  lastEventsFetch: 0,
};

export const useGoogleCalendar = () => {
  const [state, setState] = useState<GoogleCalendarState>({
    isConnected: globalState.cachedConnection ?? false,
    loading: false,
    processingOAuth: false,
    integration: globalState.cachedIntegration,
    error: null,
    events: globalState.cachedEvents || []
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

  // Debounced function calls
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

  // Fetch Google Calendar events
  const fetchGoogleCalendarEvents = useCallback(async (): Promise<GoogleCalendarEvent[]> => {
    if (!state.integration) {
      console.log('⚠️ No Google integration found');
      return [];
    }

    // Check cache
    const now = Date.now();
    if (globalState.cachedEvents && (now - globalState.lastEventsFetch) < 60000) { // 1 minute cache
      return globalState.cachedEvents;
    }

    try {
      console.log('📅 Fetching Google Calendar events...');
      const accessToken = await getValidAccessToken();
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'fetch_events',
          accessToken: accessToken
        })
      });

      if (error) {
        console.error('❌ Error fetching events:', error);
        throw error;
      }

      if (data?.success && data?.events) {
        console.log('✅ Google Calendar events fetched:', data.events.length);
        globalState.cachedEvents = data.events;
        globalState.lastEventsFetch = now;
        updateState({ events: data.events });
        return data.events;
      }

      return [];
    } catch (error) {
      console.error('❌ Error fetching Google Calendar events:', error);
      return [];
    }
  }, [state.integration]);

  // Check connection with improved caching and faster response
  const checkConnection = useCallback(async (force = false) => {
    if (!user || authLoading) return;
    
    // Return cache immediately if available and recent
    const now = Date.now();
    if (!force && globalState.cachedConnection !== null && (now - globalState.lastCheck) < globalState.checkInterval) {
      updateState({ 
        isConnected: globalState.cachedConnection,
        integration: globalState.cachedIntegration,
        events: globalState.cachedEvents || [],
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

        // Fetch events if connected
        if (data.access_token) {
          debounce(() => fetchGoogleCalendarEvents(), 500);
        }
      } else {
        console.log('ℹ️ Google Meet not connected');
        globalState.cachedConnection = false;
        globalState.cachedIntegration = null;
        globalState.cachedEvents = [];
        updateState({ 
          isConnected: false, 
          integration: null, 
          events: [],
          loading: false 
        });
      }
    } catch (error) {
      console.error('❌ Error checking connection:', error);
      globalState.cachedConnection = false;
      globalState.cachedIntegration = null;
      globalState.cachedEvents = [];
      updateState({ 
        isConnected: false, 
        integration: null, 
        events: [],
        loading: false,
        error: error.message 
      });
    } finally {
      globalState.isProcessing = false;
    }
  }, [user, authLoading, updateState, fetchGoogleCalendarEvents, debounce]);

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

      const redirectUri = 'https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/google-calendar';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}`;

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

  const processGoogleOAuthCode = useCallback(async (code: string, userId: string) => {
    if (globalState.hasProcessedOAuth) return;

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
    
    if (globalState.processingTimeout) {
      clearTimeout(globalState.processingTimeout);
    }
    globalState.processingTimeout = window.setTimeout(() => {
      globalState.hasProcessedOAuth = false;
      globalState.isProcessing = false;
    }, 30000);
    
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
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        globalState.lastCheck = 0;
        globalState.cachedConnection = null;
        globalState.cachedIntegration = null;
        globalState.cachedEvents = null;
        
        setTimeout(() => {
          checkConnection(true);
          toast({
            title: "✅ Google Meet Conectado!",
            description: "Google Meet foi conectado com sucesso!",
            duration: 5000,
          });
        }, 500);
        
      } else {
        throw new Error(data?.error || 'Resposta inesperada do servidor');
      }
      
    } catch (error) {
      console.error('❌ OAuth error:', error);
      
      let errorMessage = 'Falha ao conectar com Google Meet';
      if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = `❌ ERRO DE CONFIGURAÇÃO - redirect_uri_mismatch`;
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
      
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      updateState({ loading: false, processingOAuth: false });
      globalState.isProcessing = false;
      if (globalState.processingTimeout) {
        clearTimeout(globalState.processingTimeout);
      }
    }
  }, [user, updateState, checkConnection, toast]);

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
      
      globalState.cachedConnection = null;
      globalState.cachedIntegration = null;
      globalState.cachedEvents = null;
      globalState.lastCheck = 0;
      
      return data.access_token;
    } catch (error) {
      console.error('❌ Token renewal error:', error);
      throw error;
    }
  }, [user]);

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
      
      // Refresh events after creating
      setTimeout(() => {
        globalState.cachedEvents = null;
        fetchGoogleCalendarEvents();
      }, 1000);
      
      return {
        success: true,
        googleEventId: data.googleEventId,
        meetLink: data.meetLink
      };
    } catch (error) {
      console.error('❌ Error creating event:', error);
      throw error;
    }
  }, [state.integration, getValidAccessToken, fetchGoogleCalendarEvents]);

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

      globalState.clientId = null;
      globalState.lastCheck = 0;
      globalState.cachedConnection = false;
      globalState.cachedIntegration = null;
      globalState.cachedEvents = [];

      updateState({ 
        isConnected: false, 
        integration: null, 
        events: [],
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

  const importGoogleCalendarEvents = useCallback(async () => {
    return await fetchGoogleCalendarEvents();
  }, [fetchGoogleCalendarEvents]);

  // Main effect for initialization and OAuth processing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const urlState = urlParams.get('state');
    const error = urlParams.get('error');
    const googleConnected = urlParams.get('google_connected');
    
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

    if (code && urlState && !globalState.hasProcessedOAuth) {
      if (user && !authLoading) {
        processGoogleOAuthCode(code, urlState);
      }
      return;
    }
    
    if (!authLoading && user && !globalState.isProcessing) {
      if (globalState.cachedConnection !== null) {
        updateState({
          isConnected: globalState.cachedConnection,
          integration: globalState.cachedIntegration,
          events: globalState.cachedEvents || [],
          loading: false
        });
      }
      
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
    events: state.events,
    connectGoogle,
    disconnectGoogle,
    checkConnection: () => checkConnection(true),
    getValidAccessToken,
    createGoogleMeetEvent,
    importGoogleCalendarEvents,
    fetchGoogleCalendarEvents
  };
};
