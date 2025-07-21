
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, RefreshCw, Wifi, WifiOff } from 'lucide-react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { events, loading, createEvent, refreshEvents } = useCalendarData();
  const { 
    isConnected: isGoogleConnected, 
    loading: googleLoading, 
    connectGoogle,
    importGoogleCalendarEvents 
  } = useGoogleCalendar();
  
  const { toast } = useToast();

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

    setIsRefreshing(true);
    try {
      console.log('🔄 Importando eventos do Google Calendar...');
      await importGoogleCalendarEvents();
      await refreshEvents();
      
      toast({
        title: "✅ Eventos importados",
        description: "Eventos do Google Calendar foram importados com sucesso!",
        duration: 3000
      });
    } catch (error) {
      console.error('❌ Erro ao importar eventos:', error);
      toast({
        title: "Erro ao importar",
        description: "Falha ao importar eventos do Google Calendar",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-importar eventos quando conectar ao Google
  useEffect(() => {
    if (isGoogleConnected && !googleLoading) {
      handleImportGoogleEvents();
    }
  }, [isGoogleConnected, googleLoading]);

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setShowTypeSelector(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const eventData = clickInfo.event;
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
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start_date || event.start,
      end: event.end_date || event.end,
      backgroundColor: getEventColor(event.event_type),
      borderColor: getEventColor(event.event_type),
      extendedProps: {
        description: event.description,
        eventType: event.event_type,
        meetingLink: event.meeting_link,
        meetingProvider: event.meeting_provider,
        attendees: event.attendees,
        isAllDay: event.is_all_day,
        source: event.source || 'local' // Identificar origem do evento
      }
    }));
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting':
        return '#3600FF';
      case 'appointment':
        return '#10B981';
      case 'reminder':
        return '#F59E0B';
      case 'task':
        return '#EF4444';
      case 'google_meet':
        return '#4285F4'; // Cor específica para eventos do Google
      default:
        return '#6B7280';
    }
  };

  const calendarEvents = formatEventsForCalendar(events);

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Calendário</h1>
          <p className="text-gray-600">Gerencie seus eventos, reuniões e compromissos</p>
          
          {/* Status da conexão com Google */}
          <div className="flex items-center mt-2 space-x-2">
            {isGoogleConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Google Calendar conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Google Calendar desconectado</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex space-x-3">
          {/* Botão de conectar/importar Google */}
          {!isGoogleConnected ? (
            <Button 
              onClick={connectGoogle}
              disabled={googleLoading}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Conectar Google
            </Button>
          ) : (
            <Button 
              onClick={handleImportGoogleEvents}
              disabled={isRefreshing}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Importando...' : 'Atualizar'}
            </Button>
          )}
          
          <Button 
            onClick={() => setShowTypeSelector(true)}
            className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-blue-600 font-medium">Total de Eventos</p>
              <p className="text-2xl font-bold text-blue-700">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="flex items-center">
            <Wifi className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-green-600 font-medium">Google Calendar</p>
              <p className="text-lg font-bold text-green-700">
                {isGoogleConnected ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
          <div className="flex items-center">
            <RefreshCw className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-purple-600 font-medium">Status</p>
              <p className="text-lg font-bold text-purple-700">
                {loading || isRefreshing ? 'Carregando...' : 'Atualizado'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-lg border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#3600FF] to-[#4F46E5] text-white rounded-t-3xl">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-6 w-6" />
            <span>Calendário</span>
            {(loading || isRefreshing) && (
              <RefreshCw className="h-4 w-4 animate-spin ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
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
              loading={loading || isRefreshing}
              viewDidMount={(view) => {
                setCurrentView(view.view.type);
              }}
              eventDidMount={(info) => {
                // Adicionar tooltip para eventos do Google
                if (info.event.extendedProps.source === 'google') {
                  info.el.title = `${info.event.title} (Google Calendar)`;
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

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
