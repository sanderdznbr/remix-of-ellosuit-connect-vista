import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  start_date: string;
  end_date: string;
  description?: string;
  event_type: 'meeting' | 'appointment' | 'reminder';
  meeting_link?: string;
  google_event_id?: string;
  source?: string;
  attendees?: string[];
  meeting_provider?: string;
  is_all_day?: boolean;
}

export const useCalendarData = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();

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

  const fetchEvents = async (userCompanyId: string) => {
    try {
      console.log('📅 Buscando TODOS os eventos para empresa:', userCompanyId);
      
      // Buscar TODOS os eventos sem filtros de data para debug
      const { data, error, count } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact' })
        .eq('company_id', userCompanyId)
        .order('start_date', { ascending: true });

      console.log('📊 Contagem total de eventos no banco:', count);
      console.log('📋 Dados retornados da query:', data?.length, 'eventos');

      if (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        setEvents([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Nenhum evento encontrado para a empresa');
        setEvents([]);
        return;
      }

      console.log('📅 Eventos brutos do banco:', data);

      // Formatação mais cuidadosa dos eventos
      const formattedEvents = data.map((event, index) => {
        console.log(`🔄 Formatando evento ${index + 1}:`, {
          id: event.id,
          title: event.title,
          start_date: event.start_date,
          end_date: event.end_date,
          event_type: event.event_type
        });

        // Garantir que as datas estão no formato correto
        let startDate = event.start_date;
        let endDate = event.end_date;

        // Se as datas não terminam com Z, adicionar para garantir UTC
        if (startDate && !startDate.endsWith('Z') && !startDate.includes('+')) {
          startDate = startDate + 'Z';
        }
        if (endDate && !endDate.endsWith('Z') && !endDate.includes('+')) {
          endDate = endDate + 'Z';
        }

        const formattedEvent = {
          id: event.id,
          title: event.title || 'Evento sem título',
          start: startDate,
          end: endDate,
          start_date: startDate,
          end_date: endDate,
          description: event.description || '',
          event_type: event.event_type || 'meeting',
          meeting_link: event.meeting_link,
          google_event_id: event.google_event_id,
          source: event.google_event_id ? 'google' : 'local',
          attendees: event.attendees || [],
          meeting_provider: event.meeting_provider,
          is_all_day: event.is_all_day || false,
          extendedProps: {
            description: event.description || '',
            event_type: event.event_type || 'meeting',
            meeting_link: event.meeting_link,
            attendees: event.attendees || [],
            meeting_provider: event.meeting_provider,
            is_all_day: event.is_all_day || false,
            meeting_data: event.meeting_data || {},
            source: event.google_event_id ? 'google' : 'local'
          }
        };

        console.log(`✅ Evento ${index + 1} formatado:`, formattedEvent);
        return formattedEvent;
      });
      
      console.log('📊 Resultado final:', {
        eventosNoBanco: count,
        eventosFormatados: formattedEvents.length,
        diferenca: (count || 0) - formattedEvents.length
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error('💥 Erro inesperado ao buscar eventos:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const saveGoogleEvents = async (googleEventsList: any[]) => {
    if (!companyId || !user || googleEventsList.length === 0) {
      console.log('⚠️ Não foi possível salvar eventos do Google - dados insuficientes');
      return;
    }

    try {
      console.log('💾 Salvando eventos do Google Calendar...', googleEventsList.length);
      
      const { data: existingEvents } = await supabase
        .from('calendar_events')
        .select('google_event_id')
        .eq('company_id', companyId)
        .not('google_event_id', 'is', null);

      const existingIds = new Set(existingEvents?.map(e => e.google_event_id) || []);
      
      const newEvents = googleEventsList.filter(event => 
        event.google_event_id && !existingIds.has(event.google_event_id)
      );

      console.log('📊 Análise de eventos:', {
        total: googleEventsList.length,
        existentes: existingIds.size,
        novos: newEvents.length
      });

      if (newEvents.length > 0) {
        const eventsToInsert = newEvents.map(event => ({
          title: event.title,
          description: event.description || '',
          start_date: event.start_date,
          end_date: event.end_date,
          event_type: event.event_type || 'meeting',
          meeting_link: event.meeting_link,
          meeting_provider: event.meeting_provider || 'google_meet',
          attendees: event.attendees || [],
          is_all_day: event.is_all_day || false,
          google_event_id: event.google_event_id,
          company_id: companyId,
          created_by: user.id
        }));

        console.log('📥 Inserindo eventos no banco:', eventsToInsert);

        const { data: insertedEvents, error } = await supabase
          .from('calendar_events')
          .insert(eventsToInsert)
          .select();

        if (error) {
          console.error('❌ Erro ao salvar eventos do Google:', error);
          throw error;
        } else {
          console.log('✅ Eventos do Google salvos com sucesso:', insertedEvents?.length || 0);
          await fetchEvents(companyId);
        }
      } else {
        console.log('ℹ️ Nenhum evento novo do Google para salvar');
      }
    } catch (error) {
      console.error('💥 Erro ao salvar eventos do Google:', error);
      throw error;
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
    createEvent: async (eventData: any) => {
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
    },
    refreshEvents: () => companyId && fetchEvents(companyId),
    saveGoogleEvents: async (googleEventsList: any[]) => {
      if (!companyId || !user || googleEventsList.length === 0) {
        console.log('⚠️ Não foi possível salvar eventos do Google - dados insuficientes');
        return;
      }

      try {
        console.log('💾 Salvando eventos do Google Calendar...', googleEventsList.length);
        
        const { data: existingEvents } = await supabase
          .from('calendar_events')
          .select('google_event_id')
          .eq('company_id', companyId)
          .not('google_event_id', 'is', null);

        const existingIds = new Set(existingEvents?.map(e => e.google_event_id) || []);
        
        const newEvents = googleEventsList.filter(event => 
          event.google_event_id && !existingIds.has(event.google_event_id)
        );

        console.log('📊 Análise de eventos:', {
          total: googleEventsList.length,
          existentes: existingIds.size,
          novos: newEvents.length
        });

        if (newEvents.length > 0) {
          const eventsToInsert = newEvents.map(event => ({
            title: event.title,
            description: event.description || '',
            start_date: event.start_date,
            end_date: event.end_date,
            event_type: event.event_type || 'meeting',
            meeting_link: event.meeting_link,
            meeting_provider: event.meeting_provider || 'google_meet',
            attendees: event.attendees || [],
            is_all_day: event.is_all_day || false,
            google_event_id: event.google_event_id,
            company_id: companyId,
            created_by: user.id
          }));

          console.log('📥 Inserindo eventos no banco:', eventsToInsert);

          const { data: insertedEvents, error } = await supabase
            .from('calendar_events')
            .insert(eventsToInsert)
            .select();

          if (error) {
            console.error('❌ Erro ao salvar eventos do Google:', error);
            throw error;
          } else {
            console.log('✅ Eventos do Google salvos com sucesso:', insertedEvents?.length || 0);
            await fetchEvents(companyId);
          }
        } else {
          console.log('ℹ️ Nenhum evento novo do Google para salvar');
        }
      } catch (error) {
        console.error('💥 Erro ao salvar eventos do Google:', error);
        throw error;
      }
    }
  };
};
