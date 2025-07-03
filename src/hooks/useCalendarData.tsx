
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
  const [hasCompany, setHasCompany] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Buscar empresa do usuário com retry mais inteligente
  const fetchUserCompany = async (retryCount = 0) => {
    if (!user) {
      console.log('No user found, setting loading to false');
      setLoading(false);
      return;
    }

    console.log(`Fetching company for user ${user.email}, attempt ${retryCount + 1}`);

    try {
      const { data: companyUser, error } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('Error fetching company:', error.message);
        
        // Se não encontrou empresa e é uma das primeiras tentativas, aguarda e tenta novamente
        if (retryCount < 5 && error.code === 'PGRST116') {
          console.log(`User company not found, retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => fetchUserCompany(retryCount + 1), (retryCount + 1) * 1000);
          return;
        }
        
        console.log('User has no company associated');
        setHasCompany(false);
        setLoading(false);
        
        if (retryCount === 0) {
          toast({
            title: "Empresa não encontrada",
            description: "Sua conta não está associada a uma empresa. Entre em contato com o suporte.",
            variant: "destructive"
          });
        }
        return;
      }

      console.log('Found company:', companyUser.company_id);
      setUserCompanyId(companyUser.company_id);
      setHasCompany(true);
    } catch (error) {
      console.error('Unexpected error fetching company:', error);
      setHasCompany(false);
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!userCompanyId || !hasCompany) {
      console.log('No company ID or no company, skipping fetch events');
      setLoading(false);
      return;
    }

    console.log('Fetching events for company:', userCompanyId);

    try {
      const { data: calendarEvents, error } = await supabase
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
        setLoading(false);
        return;
      }

      console.log('Fetched events:', calendarEvents?.length || 0);

      const formattedEvents: CalendarEvent[] = calendarEvents?.map(event => ({
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
      })) || [];

      setEvents(formattedEvents);
      calculateStats(formattedEvents);
      setUpcomingEvents(formattedEvents.filter(event => 
        new Date(event.start) >= new Date()).slice(0, 3)
      );
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error fetching events:', error);
      setLoading(false);
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting': return '#3B82F6';
      case 'appointment': return '#10B981';  
      case 'reminder': return '#F59E0B';
      default: return '#3B82F6';
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
    if (!userCompanyId || !user || !hasCompany) {
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
        console.error('Error creating event:', error);
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
      console.error('Unexpected error creating event:', error);
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
    } else {
      console.log('No user, resetting state');
      setLoading(false);
      setHasCompany(false);
      setUserCompanyId(null);
    }
  }, [user]);

  useEffect(() => {
    if (hasCompany && userCompanyId) {
      fetchEvents();
    } else if (!hasCompany && userCompanyId === null) {
      setLoading(false);
    }
  }, [userCompanyId, hasCompany]);

  return {
    events,
    stats,
    upcomingEvents,
    loading,
    userCompanyId,
    hasCompany,
    createEvent,
    refreshEvents: fetchEvents
  };
};
