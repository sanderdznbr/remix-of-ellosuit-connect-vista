
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    description?: string;
    eventType: 'meeting' | 'appointment' | 'reminder';
    meetingProvider?: 'google_meet' | 'zoom' | 'teams';
    meetingLink?: string;
    attendees?: Json;
  };
}

export interface CalendarStats {
  todayEvents: number;
  weekEvents: number;
  monthEvents: number;
}

export const useCalendarData = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats>({
    todayEvents: 0,
    weekEvents: 0,
    monthEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Buscar empresa do usuário
  const fetchUserCompany = async () => {
    if (!user) return;

    try {
      const { data: companyUser, error } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('Usuário não possui empresa ainda');
        return;
      }

      setUserCompanyId(companyUser.company_id);
    } catch (error) {
      console.error('Erro ao buscar empresa do usuário:', error);
    }
  };

  // Buscar eventos da empresa
  const fetchEvents = async () => {
    if (!userCompanyId) return;

    try {
      const { data: calendarEvents, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        return;
      }

      const formattedEvents: CalendarEvent[] = calendarEvents.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start_date,
        end: event.end_date,
        backgroundColor: getEventColor(event.event_type),
        borderColor: getEventColor(event.event_type),
        extendedProps: {
          description: event.description || undefined,
          eventType: event.event_type,
          meetingProvider: event.meeting_provider || undefined,
          meetingLink: event.meeting_link || undefined,
          attendees: event.attendees
        }
      }));

      setEvents(formattedEvents);
      calculateStats(formattedEvents);
      setUpcomingEvents(formattedEvents.filter(event => 
        new Date(event.start) >= new Date()).slice(0, 3)
      );
    } catch (error) {
      console.error('Erro ao processar eventos:', error);
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting': return '#2563EB';
      case 'appointment': return '#1D4ED8';
      case 'reminder': return '#3B82F6';
      default: return '#2563EB';
    }
  };

  const calculateStats = (events: CalendarEvent[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === today.toDateString();
    }).length;

    const weekEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate <= weekFromNow;
    }).length;

    const monthEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate <= monthFromNow;
    }).length;

    setStats({ todayEvents, weekEvents, monthEvents });
  };

  const createEvent = async (eventData: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    eventType: 'meeting' | 'appointment' | 'reminder';
    meetingProvider?: 'google_meet' | 'zoom' | 'teams';
    meetingLink?: string;
    attendees?: Json;
    isAllDay?: boolean;
  }) => {
    if (!userCompanyId || !user) {
      toast({
        title: "Erro",
        description: "Usuário não está associado a uma empresa",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          company_id: userCompanyId,
          created_by: user.id,
          title: eventData.title,
          description: eventData.description,
          start_date: eventData.startDate,
          end_date: eventData.endDate,
          event_type: eventData.eventType,
          meeting_provider: eventData.meetingProvider,
          meeting_link: eventData.meetingLink,
          attendees: eventData.attendees || [],
          is_all_day: eventData.isAllDay || false
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar evento:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar evento",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!"
      });

      // Recarregar eventos
      await fetchEvents();
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar evento",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserCompany();
    }
  }, [user]);

  useEffect(() => {
    if (userCompanyId) {
      fetchEvents();
      setLoading(false);
    }
  }, [userCompanyId]);

  return {
    events,
    stats,
    upcomingEvents,
    loading,
    userCompanyId,
    createEvent,
    refreshEvents: fetchEvents
  };
};
