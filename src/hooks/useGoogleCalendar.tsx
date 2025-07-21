
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

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
  hangoutLink?: string;
  attendees?: { email: string }[];
}

interface GoogleCalendarResponse {
  events: GoogleCalendarEvent[];
}

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao verificar integração Google Calendar:', error);
        setIsConnected(false);
        setIntegration(null);
        setError(error.message);
        return;
      }

      if (data) {
        console.log('✅ Integração Google Calendar encontrada:', data.id);
        setIntegration(data);
        setIsConnected(true);
        setError(null);
      } else {
        console.log('⚠️ Nenhuma integração Google Calendar encontrada');
        setIsConnected(false);
        setError(null);
      }
    } catch (error) {
      console.error('💥 Erro ao verificar conexão Google Calendar:', error);
      setError('Erro ao verificar conexão');
    }
  };

  const processGoogleCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('❌ Erro OAuth Google:', error);
      
      let errorMessage = `Erro: ${error}`;
      if (error === 'access_denied') {
        errorMessage = 'Acesso negado. Você precisa autorizar o aplicativo para conectar o Google Calendar.';
      } else if (error.includes('redirect_uri_mismatch')) {
        errorMessage = 'Erro de configuração: Adicione https://www.ellosuit.online/dashboard nas "Redirect URLs" do Google Cloud Console.';
      }
      
      setError(errorMessage);
      toast({
        title: "Erro de Autorização Google Calendar",
        description: errorMessage,
        variant: "destructive"
      });
      // Limpar URL após erro
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (code && state === 'google_calendar_auth' && user) {
      console.log('🔄 Processando callback do Google Calendar...');
      setLoading(true);
      setProcessingOAuth(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'exchange_code',
            code: code,
            user_id: user.id
          }
        });

        if (error) {
          throw error;
        }

        if (data?.success) {
          console.log('✅ Google Calendar conectado com sucesso');
          
          // Limpar URL primeiro
          window.history.replaceState({}, document.title, '/dashboard');
          
          // Aguardar um pouco para garantir que a integração foi salva
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar conexão
          await checkConnection();
          
          // Mostrar popup de sucesso
          toast({
            title: "✅ Google Calendar Conectado!",
            description: "Google Calendar foi conectado com sucesso! Agora você pode criar eventos automaticamente.",
            duration: 5000,
          });
        } else {
          throw new Error('Falha na conexão com Google Calendar');
        }
      } catch (error: any) {
        console.error('💥 Erro ao processar callback Google Calendar:', error);
        setError(error.message);
        toast({
          title: "Erro",
          description: `Erro ao conectar Google Calendar: ${error.message}`,
          variant: "destructive"
        });
        
        // Limpar URL após erro
        window.history.replaceState({}, document.title, '/dashboard');
      } finally {
        setLoading(false);
        setProcessingOAuth(false);
      }
    }
  };

  const connectGoogleCalendar = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔗 Iniciando conexão com Google Calendar...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url', user_id: user.id }
      });

      if (error) {
        throw error;
      }

      if (data?.authUrl) {
        console.log('🔗 Redirecionando para Google OAuth...');
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('💥 Erro ao conectar Google Calendar:', error);
      setError(error.message);
      toast({
        title: "Erro",
        description: `Erro ao conectar com Google Calendar: ${error.message}`,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Alias for compatibility
  const connectGoogle = connectGoogleCalendar;

  const createGoogleMeetEvent = async ({ title, description, start_date, end_date, attendees }: { title: string; description: string; start_date: string; end_date: string; attendees: string[] }) => {
    if (!integration?.access_token) {
      throw new Error('Google Calendar not connected');
    }

    try {
      console.log('📅 Criando evento no Google Calendar...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'create_event',
          accessToken: integration.access_token,
          title,
          description,
          start_date,
          end_date,
          attendees
        }
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        meetLink: data.hangoutLink,
        googleEventId: data.googleEventId
      };
    } catch (error) {
      console.error('💥 Erro ao criar evento no Google Calendar:', error);
      throw error;
    }
  };

  const deleteGoogleCalendarEvent = async (googleEventId: string) => {
    if (!integration?.access_token) {
      throw new Error('Google Calendar not connected');
    }

    try {
      console.log('🗑️ Deletando evento do Google Calendar...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'delete_event',
          accessToken: integration.access_token,
          eventId: googleEventId
        }
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('💥 Erro ao deletar evento do Google Calendar:', error);
      throw error;
    }
  };

  const disconnectGoogleCalendar = async () => {
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
      setError(null);
      
      console.log('✅ Google Calendar desconectado');
      toast({
        title: "Sucesso",
        description: "Google Calendar desconectado com sucesso"
      });
    } catch (error: any) {
      console.error('💥 Erro ao desconectar Google Calendar:', error);
      setError(error.message);
      toast({
        title: "Erro",
        description: "Erro ao desconectar Google Calendar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Alias for compatibility
  const disconnectGoogle = disconnectGoogleCalendar;

  const syncGoogleCalendarEvents = async () => {
    return await fullResyncCalendar();
  };

  const fullResyncCalendar = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return { created: 0, updated: 0 };
    }

    setLoading(true);
    
    try {
      console.log('🔄 Iniciando ressincronização completa...');
      
      // 1. Obter company_id do usuário
      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData?.company_id) {
        throw new Error('Usuário não está associado a uma empresa');
      }

      // 2. Deletar todos os eventos do Google Calendar existentes
      console.log('🗑️ Removendo eventos existentes do Google Calendar...');
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('company_id', companyData.company_id)
        .not('google_event_id', 'is', null);

      if (deleteError) {
        console.error('Erro ao deletar eventos:', deleteError);
      }

      // 3. Buscar todos os eventos do Google Calendar
      console.log('📅 Buscando eventos do Google Calendar...');
      
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 6); // 6 meses atrás
      
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 6); // 6 meses à frente

      const { data: googleEvents, error: fetchError } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'list_events',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString()
        }
      });

      if (fetchError) {
        throw fetchError;
      }

      if (!googleEvents?.events || googleEvents.events.length === 0) {
        console.log('📅 Nenhum evento encontrado no Google Calendar');
        toast({
          title: "Sincronização Completa",
          description: "Nenhum evento encontrado no Google Calendar",
        });
        return { created: 0, updated: 0 };
      }

      console.log(`📅 Encontrados ${googleEvents.events.length} eventos no Google Calendar`);

      // 4. Criar eventos localmente
      const eventsToCreate = googleEvents.events.map((event: any) => ({
        title: event.summary || 'Evento sem título',
        description: event.description || '',
        start_date: event.start?.dateTime || event.start?.date,
        end_date: event.end?.dateTime || event.end?.date,
        event_type: 'meeting' as const,
        meeting_link: event.hangoutLink || '',
        meeting_provider: event.hangoutLink ? 'google_meet' : '',
        attendees: event.attendees ? event.attendees.map((a: any) => a.email) : [],
        is_all_day: !event.start?.dateTime,
        google_event_id: event.id,
        company_id: companyData.company_id,
        created_by: user.id,
        color: '#3600FF'
      }));

      // Inserir em lotes para evitar timeouts
      const batchSize = 10;
      let totalCreated = 0;
      for (let i = 0; i < eventsToCreate.length; i += batchSize) {
        const batch = eventsToCreate.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(batch);

        if (insertError) {
          console.error('Erro ao inserir lote de eventos:', insertError);
        } else {
          totalCreated += batch.length;
        }
      }

      console.log('✅ Ressincronização completa finalizada');
      
      toast({
        title: "✅ Sincronização Completa!",
        description: `${totalCreated} eventos foram sincronizados do Google Calendar`,
        duration: 5000,
      });

      return { created: totalCreated, updated: 0 };

    } catch (error: any) {
      console.error('💥 Erro na ressincronização:', error);
      toast({
        title: "Erro na Sincronização",
        description: `Erro: ${error.message}`,
        variant: "destructive"
      });
      return { created: 0, updated: 0 };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkConnection();
      processGoogleCallback();
    }
  }, [user]);

  return {
    isConnected,
    loading,
    integration,
    processingOAuth,
    error,
    connectGoogleCalendar,
    connectGoogle,
    disconnectGoogleCalendar,
    disconnectGoogle,
    createGoogleMeetEvent,
    deleteGoogleCalendarEvent,
    checkConnection,
    syncGoogleCalendarEvents,
    fullResyncCalendar
  };
};
