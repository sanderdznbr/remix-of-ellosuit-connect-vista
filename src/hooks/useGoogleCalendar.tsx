
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

// Tipos para melhor controle de estado
interface GoogleIntegration {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  provider_email: string;
}

interface ConnectionState {
  isConnected: boolean;
  loading: boolean;
  processingOAuth: boolean;
  integration: GoogleIntegration | null;
  error: string | null;
}

export const useGoogleCalendar = () => {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    loading: false,
    processingOAuth: false,
    integration: null,
    error: null
  });
  
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Refs para controle de execução
  const isProcessingRef = useRef(false);
  const hasProcessedOAuthRef = useRef(false);
  const connectionCheckRef = useRef<NodeJS.Timeout>();

  // Função para obter URL base consistente
  const getBaseUrl = useCallback(() => {
    return 'https://ellosuit.online';
  }, []);

  // Função para atualizar estado de forma segura
  const updateState = useCallback((updates: Partial<ConnectionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Função para obter Google Client ID com cache
  const getGoogleClientId = useCallback(async (): Promise<string | null> => {
    if (googleClientId) return googleClientId;

    try {
      console.log('🔑 Fetching Google Client ID...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({ action: 'get_client_id' })
      });

      if (error) {
        console.error('❌ Client ID fetch error:', error);
        throw new Error(`Failed to get Client ID: ${error.message}`);
      }

      if (data?.client_id) {
        console.log('✅ Client ID obtained successfully');
        setGoogleClientId(data.client_id);
        return data.client_id;
      }

      throw new Error('Client ID not found in response');
    } catch (error) {
      console.error('💥 Error getting Client ID:', error);
      toast({
        title: "Configuration Error",
        description: "Google Client ID not configured. Please check Supabase settings.",
        variant: "destructive"
      });
      return null;
    }
  }, [googleClientId, toast]);

  // Função para verificar conexão com debounce
  const checkConnection = useCallback(async (force = false) => {
    if (!user || (!force && state.loading)) {
      console.log('⚠️ Skipping connection check - no user or already loading');
      return;
    }

    // Limpar timeout anterior
    if (connectionCheckRef.current) {
      clearTimeout(connectionCheckRef.current);
    }

    // Debounce de 300ms
    connectionCheckRef.current = setTimeout(async () => {
      try {
        console.log('🔍 Checking Google Calendar connection for user:', user.id);
        updateState({ loading: true, error: null });
        
        const { data, error } = await supabase
          .from('meeting_integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google_meet')
          .maybeSingle();

        if (error) {
          console.error('❌ Connection check error:', error);
          updateState({ 
            isConnected: false, 
            integration: null, 
            loading: false,
            error: error.message 
          });
          return;
        }

        if (data) {
          console.log('✅ Google integration found:', data.id);
          
          // Verificar se token está expirado
          const now = new Date();
          const expiresAt = new Date(data.expires_at);
          
          if (now >= expiresAt && data.refresh_token) {
            console.log('⚠️ Token expired, attempting renewal...');
            try {
              await renewToken(data.refresh_token);
              // Recheck após renovação
              setTimeout(() => checkConnection(true), 1000);
              return;
            } catch (error) {
              console.error('❌ Token renewal failed:', error);
              updateState({ 
                isConnected: false, 
                integration: null, 
                loading: false,
                error: 'Token renewal failed' 
              });
              return;
            }
          }
          
          updateState({ 
            integration: data, 
            isConnected: true, 
            loading: false,
            error: null 
          });
        } else {
          console.log('⚠️ No Google integration found');
          updateState({ 
            isConnected: false, 
            integration: null, 
            loading: false,
            error: null 
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
    }, 300);
  }, [user, state.loading, updateState]);

  // Função para conectar com Google
  const connectGoogle = useCallback(async () => {
    if (!user || isProcessingRef.current) {
      console.log('⚠️ Cannot connect - no user or already processing');
      return;
    }

    isProcessingRef.current = true;
    updateState({ loading: true, error: null });
    
    try {
      console.log('🔗 Starting Google Calendar connection...');
      
      const clientId = await getGoogleClientId();
      if (!clientId) {
        throw new Error('Failed to get Google Client ID');
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ');

      const baseUrl = getBaseUrl();
      const redirectUri = `${baseUrl}/dashboard`;
      
      console.log('📝 OAuth config:', {
        clientId: clientId.substring(0, 20) + '...',
        redirectUri,
        scopes: scopes.split(' ').length + ' scopes'
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=google_calendar_auth`;

      console.log('🔗 Redirecting to Google OAuth...');
      window.location.href = authUrl;
    } catch (error) {
      console.error('💥 Error connecting to Google:', error);
      updateState({ loading: false, error: error.message });
      toast({
        title: "Connection Error",
        description: `Failed to connect to Google Calendar: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [user, getGoogleClientId, getBaseUrl, updateState, toast]);

  // Função para processar código OAuth
  const processGoogleOAuthCode = useCallback(async (code: string, userId: string) => {
    if (hasProcessedOAuthRef.current) {
      console.log('⚠️ OAuth already processed, skipping');
      return;
    }

    hasProcessedOAuthRef.current = true;
    console.log('🔄 Processing OAuth code for user:', userId);
    
    updateState({ loading: true, processingOAuth: true, error: null });
    
    try {
      console.log('📡 Calling google-calendar edge function...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: JSON.stringify({
          action: 'exchange_code',
          code: code,
          user_id: userId
        })
      });

      console.log('📡 Edge function response:', { 
        success: data?.success, 
        error: error?.message 
      });

      if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
      }

      if (data?.success) {
        console.log('✅ OAuth processed successfully!');
        
        // Limpar URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Aguardar e verificar conexão
        setTimeout(() => {
          checkConnection(true);
          
          toast({
            title: "✅ Google Meet Connected!",
            description: "Google Meet has been connected successfully! You can now create meetings automatically.",
            duration: 5000,
          });
        }, 1500);
        
      } else {
        throw new Error(data?.error || 'Unexpected response from server');
      }
      
    } catch (error) {
      console.error('💥 OAuth processing error:', error);
      
      let errorMessage = 'Failed to connect to Google Meet';
      if (error.message.includes('invalid_grant')) {
        errorMessage = 'Authorization code expired. Please try connecting again.';
      } else if (error.message.includes('invalid_client')) {
        errorMessage = 'Invalid Google configuration. Please check credentials.';
      } else if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'Redirect URI configuration error. Please check Google Console settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.';
      } else {
        errorMessage = error.message;
      }
      
      updateState({ error: errorMessage });
      toast({
        title: "❌ Google Meet Connection Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
      
      // Limpar URL em caso de erro
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } finally {
      updateState({ loading: false, processingOAuth: false });
      hasProcessedOAuthRef.current = false;
    }
  }, [updateState, checkConnection, toast]);

  // Função para renovar token
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
      return data.access_token;
    } catch (error) {
      console.error('💥 Token renewal error:', error);
      throw error;
    }
  }, [user]);

  // Função para obter access token válido
  const getValidAccessToken = useCallback(async () => {
    if (!state.integration) {
      throw new Error('Google Calendar not connected');
    }

    const now = new Date();
    const expiresAt = new Date(state.integration.expires_at);
    
    if (now >= expiresAt && state.integration.refresh_token) {
      console.log('🔄 Token expired, renewing...');
      return await renewToken(state.integration.refresh_token);
    }

    return state.integration.access_token;
  }, [state.integration, renewToken]);

  // Função para criar evento Google Meet
  const createGoogleMeetEvent = useCallback(async (eventData: any) => {
    if (!state.integration) {
      throw new Error('Google Calendar not connected');
    }

    try {
      console.log('🔄 Creating Google Meet event...');
      
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
      console.error('💥 Error creating Google Meet event:', error);
      throw error;
    }
  }, [state.integration, getValidAccessToken]);

  // Função para desconectar Google
  const disconnectGoogle = useCallback(async () => {
    if (!user || !state.integration) return;

    updateState({ loading: true });
    
    try {
      console.log('🔌 Disconnecting Google Calendar...');
      
      const { error } = await supabase
        .from('meeting_integrations')
        .delete()
        .eq('id', state.integration.id);

      if (error) {
        throw error;
      }

      updateState({ 
        isConnected: false, 
        integration: null, 
        loading: false,
        error: null 
      });
      
      console.log('✅ Google Calendar disconnected');
      toast({
        title: "Success",
        description: "Google Calendar disconnected successfully"
      });
    } catch (error) {
      console.error('💥 Error disconnecting Google:', error);
      updateState({ loading: false, error: error.message });
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar",
        variant: "destructive"
      });
    }
  }, [user, state.integration, updateState, toast]);

  // Função placeholder para importar eventos
  const importGoogleCalendarEvents = useCallback(async () => {
    console.log('📥 Import function called (placeholder)');
    return [];
  }, []);

  // useEffect principal para detectar OAuth callback e inicializar
  useEffect(() => {
    console.log('🔄 useGoogleCalendar effect:', {
      hasUser: !!user,
      authLoading,
      isProcessing: isProcessingRef.current,
      hasProcessedOAuth: hasProcessedOAuthRef.current
    });
    
    // Verificar OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    console.log('🔍 URL params:', { 
      hasCode: !!code, 
      hasState: !!state, 
      state, 
      hasError: !!error,
      error 
    });

    // Tratar erro OAuth
    if (error) {
      console.error('❌ OAuth error:', error);
      
      let errorMessage = `OAuth Error: ${error}`;
      if (error === 'access_denied') {
        errorMessage = 'Access denied. You need to authorize the application to connect Google Meet.';
      }
      
      toast({
        title: "Google Meet Authorization Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Processar código OAuth
    if (code && state === 'google_calendar_auth' && !hasProcessedOAuthRef.current) {
      console.log('✅ OAuth code detected, processing...');
      
      if (user && !authLoading) {
        console.log('✅ User ready, processing OAuth immediately...');
        processGoogleOAuthCode(code, user.id);
      } else {
        console.log('⏳ Waiting for user to load...');
        // Aguardar usuário com timeout
        let attempts = 0;
        const maxAttempts = 10;
        
        const waitForUser = () => {
          setTimeout(() => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} - waiting for user...`);
            
            if (user && !authLoading) {
              console.log('✅ User loaded, processing OAuth...');
              processGoogleOAuthCode(code, user.id);
            } else if (attempts < maxAttempts) {
              waitForUser();
            } else {
              console.log('⚠️ Timeout waiting for user');
              toast({
                title: "Error",
                description: "Timeout waiting for user authentication",
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
    
    // Inicialização normal
    if (!authLoading && user && !isProcessingRef.current) {
      console.log('✅ Normal initialization - checking existing connection...');
      checkConnection();
      getGoogleClientId();
    } else if (!authLoading && !user) {
      console.log('⚠️ User not authenticated');
      updateState({ 
        isConnected: false, 
        integration: null, 
        loading: false,
        error: null 
      });
    }
  }, [user, authLoading, checkConnection, getGoogleClientId, processGoogleOAuthCode, toast, updateState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (connectionCheckRef.current) {
        clearTimeout(connectionCheckRef.current);
      }
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
