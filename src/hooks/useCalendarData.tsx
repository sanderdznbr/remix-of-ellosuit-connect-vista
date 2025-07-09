
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
        // Tentar criar empresa automaticamente
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
      
      // Primeiro, verificar se o usuário realmente não tem empresa
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

      // Obter dados do usuário
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || '';
      const userMetadata = userData.user?.user_metadata || {};
      
      const companyName = userMetadata.company_name || 
                         userMetadata.username || 
                         userEmail.split('@')[0] + ' Company';

      // Criar nova empresa
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

      // Associar usuário à empresa
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
      console.log('📅 Buscando eventos para empresa:', userCompanyId);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        setEvents([]);
      } else {
        console.log('✅ Eventos carregados:', data?.length || 0);
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
    refreshEvents: () => companyId && fetchEvents(companyId)
  };
};
