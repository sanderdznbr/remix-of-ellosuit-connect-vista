
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: 'meeting' | 'appointment' | 'reminder';
  meeting_link?: string;
  meeting_provider?: 'google_meet' | 'zoom' | 'teams';
  attendees?: string[];
  is_all_day?: boolean;
  color?: string;
  recurrence_rule?: string;
  company_id: string;
  created_by: string;
  google_event_id?: string;
  status?: string;
  source?: string;
  meeting_data?: any;
  updated_at?: string;
  created_at?: string;
}

export const useCalendarData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Buscar eventos do calendário
  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ['calendar-events', user?.id],
    queryFn: async () => {
      if (!user) return [];

      console.log('🔍 Buscando eventos do calendário para usuário:', user.id);

      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData) {
        console.log('❌ Usuário não está associado a uma empresa');
        return [];
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', companyData.company_id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        throw error;
      }

      console.log(`✅ Encontrados ${data?.length || 0} eventos`);
      
      return data?.map(event => ({
        ...event,
        attendees: Array.isArray(event.attendees) ? 
          (event.attendees as any[]).map(a => typeof a === 'string' ? a : String(a)) : 
          [],
        status: event.status || 'pending',
        source: event.source || 'local'
      })) || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Criar evento
  const createEvent = async (eventData: Omit<CalendarEvent, 'id' | 'company_id' | 'created_by'>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📅 Criando evento:', eventData.title);

      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData) {
        throw new Error('Usuário não está associado a uma empresa');
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          company_id: companyData.company_id,
          created_by: user.id,
          attendees: eventData.attendees || [],
          color: eventData.color || '#3600FF',
          status: eventData.status || 'pending',
          source: eventData.source || 'local'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar evento:', error);
        throw error;
      }

      console.log('✅ Evento criado com sucesso:', data.id);
      
      // Invalidar e refetch dos eventos
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!"
      });

      return data;
    } catch (error: any) {
      console.error('💥 Erro ao criar evento:', error);
      toast({
        title: "Erro",
        description: `Erro ao criar evento: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Atualizar evento
  const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📝 Atualizando evento:', eventId, updates);

      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Converter attendees para o formato correto
      if (updates.attendees) {
        updateData.attendees = updates.attendees;
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar evento:', error);
        throw error;
      }

      console.log('✅ Evento atualizado com sucesso:', data.id);
      
      // Invalidar e refetch dos eventos
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!"
      });

      return data;
    } catch (error: any) {
      console.error('💥 Erro ao atualizar evento:', error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar evento: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Deletar evento
  const deleteEvent = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🗑️ Deletando evento:', eventId);

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('created_by', user.id);

      if (error) {
        console.error('❌ Erro ao deletar evento:', error);
        throw error;
      }

      console.log('✅ Evento deletado com sucesso');
      
      // Invalidar e refetch dos eventos
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      toast({
        title: "Sucesso",
        description: "Evento deletado com sucesso!"
      });
    } catch (error: any) {
      console.error('💥 Erro ao deletar evento:', error);
      toast({
        title: "Erro",
        description: `Erro ao deletar evento: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Buscar eventos por data
  const getEventsByDate = (date: Date) => {
    const targetDate = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.start_date).toISOString().split('T')[0];
      return eventDate === targetDate;
    });
  };

  // Buscar próximos eventos
  const getUpcomingEvents = (limit = 5) => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start_date) >= now)
      .slice(0, limit);
  };

  // Refrescar dados
  const refreshEvents = async () => {
    console.log('🔄 Refreshing calendar events...');
    await refetch();
  };

  // Log para debug
  useEffect(() => {
    if (events?.length) {
      console.log('📅 Eventos carregados:', events.length);
    }
  }, [events]);

  return {
    events,
    isLoading,
    loading: isLoading, // Alias para compatibilidade
    error,
    selectedDate,
    setSelectedDate,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsByDate,
    getUpcomingEvents,
    refreshEvents,
    refetch
  };
};
