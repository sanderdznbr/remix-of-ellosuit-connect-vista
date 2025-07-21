
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useGoogleCalendar } from './useGoogleCalendar';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  event_type: 'meeting' | 'appointment' | 'reminder';
  meeting_link?: string;
  source?: 'local' | 'google';
  google_event_id?: string;
}

export const useCalendarData = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { 
    events: googleEvents, 
    isConnected: googleConnected, 
    fetchGoogleCalendarEvents 
  } = useGoogleCalendar();

  const checkUserCompany = async (userId: string) => {
    try {
      console.log('🔍 Verificando empresa para usuário:', userId);
      
      const { data: companyUser, error } = await supabase
        .from('company_users')
        .select(`
          company_id,
          role,
          companies!inner (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar empresa do usuário:', error);
        setHasCompany(false);
        setCompanyId(null);
        setLoading(false);
        return;
      }

      if (companyUser && companyUser.company_id) {
        console.log('✅ Empresa encontrada para usuário:', companyUser.companies);
        setHasCompany(true);
        setCompanyId(companyUser.company_id);
        await fetchEvents(companyUser.company_id);
      } else {
        console.log('⚠️ Nenhuma empresa encontrada - criando empresa para o usuário');
        await createUserCompany(userId);
      }
    } catch (error) {
      console.error('💥 Erro inesperado em checkUserCompany:', error);
      setHasCompany(false);
      setCompanyId(null);
      setLoading(false);
    }
  };

  const createUserCompany = async (userId: string) => {
    try {
      console.log('🏢 Criando empresa para usuário:', userId);
      
      const { data: existingCompany } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingCompany) {
        console.log('✅ Usuário já tem empresa:', existingCompany.company_id);
        setHasCompany(true);
        setCompanyId(existingCompany.company_id);
        await fetchEvents(existingCompany.company_id);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || '';
      const userMetadata = userData.user?.user_metadata || {};
      
      const companyName = userMetadata.company_name || 
                         userMetadata.username || 
                         userEmail.split('@')[0] + ' Company';

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          domain: null,
          settings: {}
        })
        .select()
        .single();

      if (companyError) {
        console.error('❌ Erro ao criar empresa:', companyError);
        throw companyError;
      }

      const { error: associationError } = await supabase
        .from('company_users')
        .insert({
          company_id: newCompany.id,
          user_id: userId,
          role: 'admin'
        });

      if (associationError) {
        console.error('❌ Erro ao associar usuário à empresa:', associationError);
        throw associationError;
      }

      console.log('✅ Empresa criada e usuário associado:', newCompany.name);
      setHasCompany(true);
      setCompanyId(newCompany.id);
      await fetchEvents(newCompany.id);

    } catch (error) {
      console.error('💥 Erro ao criar empresa para usuário:', error);
      setHasCompany(false);
      setCompanyId(null);
      setLoading(false);
      
      toast({
        title: "Erro",
        description: "Erro ao configurar empresa do usuário",
        variant: "destructive"
      });
    }
  };

  const formatGoogleEvent = (googleEvent: any): CalendarEvent => {
    const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
    const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;
    
    // If it's a date-only event, add time to make it compatible
    const formatDateTime = (dateStr: string) => {
      if (!dateStr.includes('T')) {
        return `${dateStr}T09:00:00Z`; // Default to 9 AM for all-day events
      }
      return dateStr;
    };

    const meetLink = googleEvent.conferenceData?.entryPoints?.find(
      (entry: any) => entry.entryPointType === 'video'
    )?.uri;

    return {
      id: `google-${googleEvent.id}`,
      title: googleEvent.summary || 'Evento do Google Calendar',
      start: formatDateTime(startTime),
      end: formatDateTime(endTime),
      description: googleEvent.description || '',
      event_type: meetLink ? 'meeting' : 'appointment',
      meeting_link: meetLink,
      source: 'google',
      google_event_id: googleEvent.id
    };
  };

  const fetchEvents = async (userCompanyId: string) => {
    try {
      console.log('📅 Buscando eventos para empresa:', userCompanyId);
      
      // Fetch local events
      const { data: localEvents, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar eventos locais:', error);
      }

      const formattedLocalEvents = (localEvents || []).map(event => ({
        id: event.id,
        title: event.title,
        start: event.start_date,
        end: event.end_date,
        description: event.description,
        event_type: event.event_type,
        meeting_link: event.meeting_link,
        source: 'local' as const,
        extendedProps: {
          description: event.description,
          event_type: event.event_type,
          meeting_link: event.meeting_link,
          attendees: event.attendees,
          meeting_provider: event.meeting_provider,
          is_all_day: event.is_all_day,
          meeting_data: event.meeting_data
        }
      }));

      // Format Google events if connected
      const formattedGoogleEvents = googleConnected 
        ? googleEvents.map(formatGoogleEvent)
        : [];

      // Merge and sort all events
      const allEvents = [...formattedLocalEvents, ...formattedGoogleEvents];
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      console.log('✅ Total eventos carregados:', allEvents.length, {
        local: formattedLocalEvents.length,
        google: formattedGoogleEvents.length
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('💥 Erro inesperado ao buscar eventos:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: any) => {
    if (!companyId || !user) {
      toast({
        title: "Erro",
        description: "Usuário deve estar associado a uma empresa para criar eventos",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📝 Criando evento:', eventData);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          event_type: eventData.event_type,
          company_id: companyId,
          created_by: user.id,
          meeting_link: eventData.meeting_link,
          meeting_provider: eventData.meeting_provider,
          attendees: eventData.attendees || [],
          is_all_day: eventData.is_all_day || false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar evento:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar evento: " + error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Evento criado com sucesso:', data);
      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!"
      });

      await fetchEvents(companyId);
    } catch (error) {
      console.error('💥 Erro inesperado ao criar evento:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar evento",
        variant: "destructive"
      });
    }
  };

  // Effect to re-fetch events when Google events change
  useEffect(() => {
    if (companyId && googleEvents.length >= 0) {
      console.log('🔄 Google events changed, refreshing calendar...');
      fetchEvents(companyId);
    }
  }, [googleEvents, companyId]);

  useEffect(() => {
    if (user && session) {
      console.log('👤 Usuário autenticado, verificando empresa...');
      checkUserCompany(user.id);
    } else {
      console.log('👤 Usuário não autenticado, resetando estado');
      setEvents([]);
      setHasCompany(false);
      setCompanyId(null);
      setLoading(false);
    }
  }, [user, session]);

  return {
    events,
    loading,
    hasCompany,
    companyId,
    createEvent,
    refreshEvents: () => companyId && fetchEvents(companyId),
    googleConnected,
    googleEventsCount: googleEvents.length
  };
};
