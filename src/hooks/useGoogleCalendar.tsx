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
  checkInterval: 30000, // 30 seconds
  isProcessing: false,
  hasProcessedOAuth: false,
  processingTimeout: null as ReturnType<typeof setTimeout> | null,
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
  
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  // Safe state update
  const updateState = useCallback((updates: Partial<GoogleCalendarState>) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Debounced function calls
  const debounce = useCallback((fn: Function, delay: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(fn, delay);
  }, []);

  // Get Google Client ID with cache
  const getGoogleClientId = useCallback(async (): Promise<string | null> => {
    if (globalState.clientId) return globalState.clientId;

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({ action: 'get_client_id' })
      });

      if (error) throw error;
      if (data?.client_id) {
        globalState.clientId = data.client_id;
        return data.client_id;
      }
      throw new Error('Client ID not found');
    } catch (error) {
      console.error('❌ Error getting Client ID:', error);
      return null;
    }
  }, []);

  // Check connection with debounce and cache
  const checkConnection = useCallback(async (force = false) => {
    if (!user || authLoading) return;
    
    // Prevent multiple simultaneous calls
    if (globalState.isProcessing && !force) return;
    
    // Cache check
    const now = Date.now();
    if (!force && (now - globalState.lastCheck) < globalState.checkInterval && state.integration) {
      return;
    }

    globalState.isProcessing = true;
    updateState({ loading: true, error: null });
    
    try {
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
      console.error('❌ Error checking connection:', error);
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

  // Connect to Google with improved error handling
  const connectGoogle = useCallback(async () => {
    if (!user || globalState.isProcessing) return;

    globalState.isProcessing = true;
    updateState({ loading: true, error: null });
    
    try {
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

      // CORRECTED: Use the API callback URL instead of dashboard
      const redirectUri = 'https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/google-calendar';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=google_meet_auth`;

      console.log('🔗 Redirecting to Google OAuth with API callback URI:', redirectUri);
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

  // Process OAuth code with timeout and single execution
  const processGoogleOAuthCode = useCallback(async (code: string, userId: string) => {
    if (globalState.hasProcessedOAuth) return;

    globalState.hasProcessedOAuth = true;
    globalState.isProcessing = true;
    
    // Set timeout to reset processing state
    if (globalState.processingTimeout) {
      clearTimeout(globalState.processingTimeout);
    }
    globalState.processingTimeout = setTimeout(() => {
      globalState.hasProcessedOAuth = false;
      globalState.isProcessing = false;
    }, 30000); // 30 seconds timeout
    
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
        
        // Clear URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Clear cache and check connection
        globalState.lastCheck = 0;
        
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
      console.error('❌ OAuth error:', error);
      
      let errorMessage = 'Falha ao conectar com Google Meet';
      if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'Erro de configuração. Verifique se no Google Cloud Console está configurado: https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/google-calendar';
      } else if (error.message.includes('invalid_grant')) {
        errorMessage = 'Código de autorização expirado. Tente conectar novamente.';
      }
      
      updateState({ error: errorMessage });
      toast({
        title: "❌ Falha na Conexão",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
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
  }, [updateState, checkConnection, toast]);

  // Renew token
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
      console.error('❌ Error creating event:', error);
      throw error;
    }
  }, [state.integration, getValidAccessToken]);

  // Disconnect Google
  const disconnectGoogle = useCallback(async () => {
    if (!user || !state.integration) return;

    updateState({ loading: true });
    
    try {
      const { error } = await supabase
        .from('meeting_integrations')
        .delete()
        .eq('id', state.integration.id);

      if (error) throw error;

      // Clear cache
      globalState.clientId = null;
      globalState.lastCheck = 0;

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
      console.error('❌ Error disconnecting:', error);
      updateState({ loading: false, error: error.message });
      toast({
        title: "Erro",
        description: "Falha ao desconectar Google Calendar",
        variant: "destructive"
      });
    }
  }, [user, state.integration, updateState, toast]);

  // Import Google Calendar events (placeholder)
  const importGoogleCalendarEvents = useCallback(async () => {
    return [];
  }, []);

  // Main effect for initialization and OAuth processing
  useEffect(() => {
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const urlState = urlParams.get('state');
    const error = urlParams.get('error');
    
    // Handle OAuth error
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

    // Process OAuth code
    if (code && urlState === 'google_meet_auth' && !globalState.hasProcessedOAuth) {
      if (user && !authLoading) {
        processGoogleOAuthCode(code, user.id);
      }
      return;
    }
    
    // Normal initialization with debounce
    if (!authLoading && user && !globalState.isProcessing) {
      debounce(() => {
        checkConnection();
        getGoogleClientId();
      }, 500);
    }
  }, [user, authLoading, checkConnection, getGoogleClientId, processGoogleOAuthCode, toast, debounce]);

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
    importGoogleCalendarEvents
  };
};
