
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, RefreshCw, ExternalLink } from 'lucide-react';
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

  const { 
    events, 
    loading, 
    createEvent, 
    refreshEvents, 
    googleConnected, 
    googleEventsCount 
  } = useCalendarData();
  
  const { 
    isConnected: googleIsConnected, 
    connectGoogle, 
    fetchGoogleCalendarEvents 
  } = useGoogleCalendar();

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
      extendedProps: eventData.extendedProps,
      source: eventData.extendedProps?.source || 'local'
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

  const handleRefresh = async () => {
    refreshEvents();
    if (googleIsConnected) {
      await fetchGoogleCalendarEvents();
    }
  };

  const formatEventsForCalendar = (events: any[]) => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: getEventColor(event.event_type, event.source),
      borderColor: getEventColor(event.event_type, event.source),
      extendedProps: {
        description: event.description,
        eventType: event.event_type,
        meetingLink: event.meeting_link,
        meetingProvider: event.meeting_provider,
        attendees: event.attendees,
        isAllDay: event.is_all_day,
        source: event.source || 'local',
        googleEventId: event.google_event_id
      }
    }));
  };

  const getEventColor = (eventType: string, source?: string) => {
    if (source === 'google') {
      return '#4285F4'; // Google blue
    }
    
    switch (eventType) {
      case 'meeting':
        return '#3600FF';
      case 'appointment':
        return '#10B981';
      case 'reminder':
        return '#F59E0B';
      case 'task':
        return '#EF4444';
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
          
          {/* Integration Status */}
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center space-x-2">
              <Badge variant={googleConnected ? "default" : "secondary"}>
                Google Calendar: {googleConnected ? "Conectado" : "Desconectado"}
              </Badge>
              {googleConnected && googleEventsCount > 0 && (
                <Badge variant="outline">
                  {googleEventsCount} eventos do Google
                </Badge>
              )}
            </div>
            
            {!googleConnected && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={connectGoogle}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
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
            <div className="ml-auto flex items-center space-x-2">
              {events.length > 0 && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {events.length} eventos
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-6 w-6 animate-spin text-[#3600FF]" />
                <span className="text-gray-600">Carregando eventos...</span>
              </div>
            </div>
          ) : (
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
                eventContent={(arg) => {
                  const isGoogleEvent = arg.event.extendedProps.source === 'google';
                  return (
                    <div className="flex items-center space-x-1">
                      {isGoogleEvent && (
                        <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>
                      )}
                      <span className="truncate">{arg.event.title}</span>
                    </div>
                  );
                }}
              />
            </div>
          )}
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
