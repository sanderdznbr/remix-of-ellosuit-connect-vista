
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImprovedEventModal from './ImprovedEventModal';
import AppointmentModal from './AppointmentModal';
import ReminderModal from './ReminderModal';
import EventDetailsModal from './EventDetailsModal';
import EventTypeSelector from './EventTypeSelector';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

interface MyCalendarProps {
  onNavigate?: (page: string) => void;
}

const MyCalendar = ({ onNavigate }: MyCalendarProps) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [isImporting, setIsImporting] = useState(false);

  const { events, loading, createEvent, refreshEvents, saveGoogleEvents } = useCalendarData();
  const { 
    isConnected: isGoogleConnected, 
    loading: googleLoading, 
    connectGoogle,
    importGoogleCalendarEvents 
  } = useGoogleCalendar();
  
  const { toast } = useToast();

  console.log('📅 MyCalendar - Estado atual:', {
    events: events.length,
    loading,
    isGoogleConnected,
    googleLoading
  });

  console.log('📅 MyCalendar - Eventos detalhados:', events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    type: e.event_type
  })));

  // Importar eventos do Google Calendar
  const handleImportGoogleEvents = async () => {
    if (!isGoogleConnected) {
      toast({
        title: "Google Calendar não conectado",
        description: "Conecte sua conta do Google primeiro para importar eventos",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      console.log('🔄 Importando eventos do Google Calendar...');
      const googleEvents = await importGoogleCalendarEvents();
      
      if (googleEvents && googleEvents.length > 0) {
        console.log('💾 Salvando eventos do Google no banco:', googleEvents.length);
        await saveGoogleEvents(googleEvents);
        await refreshEvents();
        
        toast({
          title: "✅ Eventos importados",
          description: `${googleEvents.length} eventos do Google Calendar foram importados com sucesso!`,
          duration: 3000
        });
      } else {
        toast({
          title: "ℹ️ Nenhum evento encontrado",
          description: "Não foram encontrados novos eventos no Google Calendar",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('❌ Erro ao importar eventos:', error);
      toast({
        title: "Erro ao importar",
        description: "Falha ao importar eventos do Google Calendar: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Auto-importar eventos quando conectar ao Google
  useEffect(() => {
    if (isGoogleConnected && !googleLoading && !isImporting && events.length === 0) {
      console.log('🔄 Auto-importando eventos do Google Calendar...');
      handleImportGoogleEvents();
    }
  }, [isGoogleConnected, googleLoading]);

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setShowTypeSelector(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const eventData = clickInfo.event;
    console.log('🎯 Evento clicado:', eventData);
    
    setSelectedEvent({
      id: eventData.id,
      title: eventData.title,
      start: eventData.start,
      end: eventData.end,
      extendedProps: eventData.extendedProps
    });
    setShowDetailsModal(true);
  };

  const handleTypeSelect = (type: 'meeting' | 'appointment' | 'reminder') => {
    setShowTypeSelector(false);
    
    if (type === 'meeting') {
      setShowEventModal(true);
    } else if (type === 'appointment') {
      setShowAppointmentModal(true);
    } else if (type === 'reminder') {
      setShowReminderModal(true);
    }
  };

  const handleCloseAllModals = () => {
    setShowEventModal(false);
    setShowAppointmentModal(false);
    setShowReminderModal(false);
    setShowTypeSelector(false);
    setSelectedDate(null);
  };

  const formatEventsForCalendar = (events: any[]) => {
    console.log('🔄 Formatando eventos para o calendário:', events.length, 'eventos');
    
    const formattedEvents = events.map((event, index) => {
      // Debug detalhado de cada evento
      console.log(`📅 Evento ${index + 1} - Original:`, {
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        start: event.start,
        end: event.end,
        type: event.event_type
      });

      // Usar start_date/end_date se disponível, caso contrário usar start/end
      const startDate = event.start_date || event.start;
      const endDate = event.end_date || event.end;
      
      if (!startDate) {
        console.warn(`⚠️ Evento ${event.id} sem data de início válida`);
        return null;
      }

      const formattedEvent = {
        id: event.id,
        title: event.title || 'Evento sem título',
        start: startDate,
        end: endDate || startDate,
        backgroundColor: getEventColor(event.event_type),
        borderColor: getEventColor(event.event_type),
        textColor: '#ffffff',
        classNames: ['calendar-event'],
        extendedProps: {
          description: event.description || '',
          eventType: event.event_type || 'meeting',
          meetingLink: event.meeting_link,
          meetingProvider: event.meeting_provider,
          attendees: event.attendees || [],
          isAllDay: event.is_all_day || false,
          source: event.source || (event.google_event_id ? 'google' : 'local'),
          googleEventId: event.google_event_id
        }
      };
      
      console.log(`✅ Evento ${index + 1} - Formatado:`, formattedEvent);
      return formattedEvent;
    }).filter(event => event !== null); // Remove eventos inválidos
    
    console.log('📊 Resumo da formatação:', {
      eventosOriginais: events.length,
      eventosFormatados: formattedEvents.length,
      eventosInvalidos: events.length - formattedEvents.length
    });
    
    return formattedEvents;
  };

  const getEventColor = (eventType: string) => {
    const colors = {
      'meeting': '#3600FF',
      'appointment': '#10B981',
      'reminder': '#F59E0B',
      'task': '#EF4444',
      'google_meet': '#4285F4'
    };
    return colors[eventType] || '#6B7280';
  };

  const calendarEvents = formatEventsForCalendar(events);
  const isLoadingEvents = loading || isImporting;

  console.log('📊 Status final do calendário:', {
    totalEventosCarregados: events.length,
    eventosFormatadosParaCalendario: calendarEvents.length,
    isLoading: isLoadingEvents,
    isGoogleConnected,
    estadoCompleto: {
      events,
      calendarEvents
    }
  });

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Calendário</h1>
          <p className="text-gray-600">Gerencie seus eventos, reuniões e compromissos</p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            onClick={() => setShowTypeSelector(true)}
            className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#3600FF] to-[#4F46E5] text-white rounded-t-3xl">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-6 w-6" />
            <span>Calendário</span>
            {isLoadingEvents && (
              <RefreshCw className="h-4 w-4 animate-spin ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Exibir mensagem se não há eventos */}
          {!isLoadingEvents && calendarEvents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum evento encontrado</p>
              <p className="text-sm">Crie seu primeiro evento ou conecte ao Google Calendar</p>
            </div>
          )}
          
          <div className="calendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              height="auto"
              events={calendarEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              locale="pt-br"
              eventDisplay="block"
              eventTextColor="#ffffff"
              viewDidMount={(view) => {
                setCurrentView(view.view.type);
              }}
              eventDidMount={(info) => {
                const source = info.event.extendedProps.source;
                if (source === 'google') {
                  info.el.title = `${info.event.title} (Google Calendar)`;
                  info.el.style.borderLeft = '4px solid #4285F4';
                }
                
                // Debug: log quando evento é montado
                console.log('🎨 Evento montado no calendário:', {
                  id: info.event.id,
                  title: info.event.title,
                  start: info.event.start,
                  end: info.event.end
                });
              }}
              eventContent={(eventInfo) => {
                return (
                  <div className="p-1">
                    <div className="font-medium text-xs truncate">
                      {eventInfo.event.title}
                    </div>
                    {eventInfo.event.extendedProps.source === 'google' && (
                      <div className="text-xs opacity-75">Google</div>
                    )}
                  </div>
                );
              }}
              loading={(isLoading) => {
                console.log('📅 FullCalendar loading state:', isLoading);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <EventTypeSelector
        isOpen={showTypeSelector}
        onClose={() => {
          setShowTypeSelector(false);
          setSelectedDate(null);
        }}
        onSelectType={handleTypeSelect}
        selectedDate={selectedDate || ''}
      />

      <ImprovedEventModal
        isOpen={showEventModal}
        onClose={handleCloseAllModals}
        selectedDate={selectedDate}
        onCreateEvent={createEvent}
        onNavigateToSettings={onNavigate ? () => onNavigate('settings') : undefined}
      />

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={handleCloseAllModals}
        selectedDate={selectedDate || ''}
        onCreateEvent={createEvent}
      />

      <ReminderModal
        isOpen={showReminderModal}
        onClose={handleCloseAllModals}
        selectedDate={selectedDate || ''}
        onCreateEvent={createEvent}
      />

      <EventDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    </div>
  );
};

export default MyCalendar;
