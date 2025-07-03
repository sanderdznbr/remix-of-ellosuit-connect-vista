
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  event_type: 'meeting' | 'appointment' | 'reminder';
  meeting_link?: string;
}

export const useCalendarData = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();

  const checkUserCompany = async (userId: string, retryCount = 0) => {
    try {
      console.log('Checking company for user:', userId, 'attempt:', retryCount + 1);
      
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
        .single();

      if (error) {
        console.error('Error fetching company user:', error);
        
        // Se não encontrou empresa e ainda tem tentativas, aguardar um pouco
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log('Company not found, retrying in 2 seconds...');
          setTimeout(() => checkUserCompany(userId, retryCount + 1), 2000);
          return;
        }
        
        setHasCompany(false);
        setCompanyId(null);
        setLoading(false);
        return;
      }

      if (companyUser && companyUser.company_id) {
        console.log('User company found:', companyUser.companies);
        setHasCompany(true);
        setCompanyId(companyUser.company_id);
        await fetchEvents(companyUser.company_id);
      } else {
        console.log('No company association found for user');
        setHasCompany(false);
        setCompanyId(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error in checkUserCompany:', error);
      setHasCompany(false);
      setCompanyId(null);
      setLoading(false);
    }
  };

  const fetchEvents = async (userCompanyId: string) => {
    try {
      console.log('Fetching events for company:', userCompanyId);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar eventos do calendário",
          variant: "destructive"
        });
        setEvents([]);
      } else {
        console.log('Events loaded:', data?.length || 0);
        const formattedEvents = (data || []).map(event => ({
          id: event.id,
          title: event.title,
          start: event.start_date,
          end: event.end_date,
          description: event.description,
          event_type: event.event_type,
          meeting_link: event.meeting_link
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Unexpected error fetching events:', error);
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
          attendees: eventData.attendees || [],
          is_all_day: eventData.is_all_day || false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar evento: " + error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!"
      });

      // Recarregar eventos
      await fetchEvents(companyId);
    } catch (error) {
      console.error('Unexpected error creating event:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar evento",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user && session) {
      console.log('User authenticated, checking company association...');
      checkUserCompany(user.id);
    } else {
      console.log('No authenticated user, resetting state');
      setEvents([]);
      setHasCompany(false);
      setCompanyId(null);
      setLoading(true);
    }
  }, [user, session]);

  return {
    events,
    loading,
    hasCompany,
    companyId,
    createEvent,
    refreshEvents: () => companyId && fetchEvents(companyId)
  };
};
