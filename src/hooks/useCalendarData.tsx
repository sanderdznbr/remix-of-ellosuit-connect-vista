
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
  meeting_data?: any;
  color?: string;
}

export const useCalendarData = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();

  const parseAttendees = (attendees: any): string[] => {
    if (!attendees) return [];
    if (Array.isArray(attendees)) {
      return attendees.filter(item => typeof item === 'string');
    }
    if (typeof attendees === 'string') {
      try {
        const parsed = JSON.parse(attendees);
        return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const checkUserCompany = async (userId: string) => {
    try {
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
        setHasCompany(false);
        setCompanyId(null);
        setLoading(false);
        return;
      }

      if (companyUser && companyUser.company_id) {
        setHasCompany(true);
        setCompanyId(companyUser.company_id);
        await fetchEvents(companyUser.company_id);
      } else {
        await createUserCompany(userId);
      }
    } catch (error) {
      setHasCompany(false);
      setCompanyId(null);
      setLoading(false);
    }
  };

  const createUserCompany = async (userId: string) => {
    try {
      const { data: existingCompany } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingCompany) {
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
        throw associationError;
      }

      setHasCompany(true);
      setCompanyId(newCompany.id);
      await fetchEvents(newCompany.id);

    } catch (error) {
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
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('start_date', { ascending: true });

      if (error) {
        setEvents([]);
        return;
      }

      if (!data || data.length === 0) {
        setEvents([]);
        return;
      }

      const formattedEvents: CalendarEvent[] = data.map((event) => {
        let startDate = event.start_date;
        let endDate = event.end_date;

        if (startDate && !startDate.endsWith('Z') && !startDate.includes('+')) {
          startDate = startDate + 'Z';
        }
        if (endDate && !endDate.endsWith('Z') && !endDate.includes('+')) {
          endDate = endDate + 'Z';
        }

        const attendeesList = parseAttendees(event.attendees);

        return {
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
          attendees: attendeesList,
          meeting_provider: event.meeting_provider,
          is_all_day: event.is_all_day || false,
          meeting_data: event.meeting_data || {},
          color: event.color || '#3600FF'
        };
      });
      
      setEvents(formattedEvents);
    } catch (error) {
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
          meeting_provider: eventData.meeting_provider,
          attendees: eventData.attendees || [],
          is_all_day: eventData.is_all_day || false,
          color: eventData.color || '#3600FF'
        })
        .select()
        .single();

      if (error) {
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

      await fetchEvents(companyId);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar evento",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user && session) {
      checkUserCompany(user.id);
    } else {
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
    refreshEvents: () => companyId && fetchEvents(companyId)
  };
};
