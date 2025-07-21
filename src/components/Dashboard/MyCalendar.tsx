
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImprovedEventModal from './ImprovedEventModal';
import AppointmentModal from './AppointmentModal';
import ReminderModal from './ReminderModal';
import EnhancedEventDetailsModal from './EnhancedEventDetailsModal';
import EventTypeSelector from './EventTypeSelector';
import EventClusterModal from './EventClusterModal';
import { useCalendarData } from '@/hooks/useCalendarData';

interface MyCalendarProps {
  onNavigate?: (page: string) => void;
}

const MyCalendar = ({ onNavigate }: MyCalendarProps) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [clusterEvents, setClusterEvents] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState('dayGridMonth');

  const { events, loading, createEvent, refreshEvents } = useCalendarData();
  const { toast } = useToast();

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

  const handleMoreClick = (info: any) => {
    const dayEvents = info.allSegs.map((seg: any) => ({
      id: seg.event.id,
      title: seg.event.title,
      start: seg.event.start,
      end: seg.event.end,
      extendedProps: seg.event.extendedProps
    }));
    
    setClusterEvents(dayEvents);
    setSelectedDate(info.date.toISOString().split('T')[0]);
    setShowClusterModal(true);
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
    return events.map((event) => {
      const startDate = event.start_date || event.start;
      const endDate = event.end_date || event.end;
      
      if (!startDate) {
        return null;
      }

      return {
        id: event.id,
        title: event.title || 'Evento sem título',
        start: startDate,
        end: endDate || startDate,
        backgroundColor: getEventColor(event.event_type),
        borderColor: getEventColor(event.event_type),
        textColor: '#ffffff',
        classNames: ['modern-event'],
        extendedProps: {
          description: event.description || '',
          event_type: event.event_type || 'meeting',
          meeting_link: event.meeting_link,
          meeting_provider: event.meeting_provider,
          attendees: event.attendees || [],
          is_all_day: event.is_all_day || false,
          source: event.source || (event.google_event_id ? 'google' : 'local'),
          google_event_id: event.google_event_id,
          meeting_data: event.meeting_data || {},
          meeting_status: event.meeting_status,
          meeting_notes: event.meeting_notes,
          recording_link: event.recording_link
        }
      };
    }).filter(event => event !== null);
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
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!loading && calendarEvents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum evento encontrado</p>
              <p className="text-sm">Crie seu primeiro evento</p>
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
              moreLinkClick={handleMoreClick}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={4}
              weekends={true}
              locale="pt-br"
              eventDisplay="block"
              eventTextColor="#ffffff"
              viewDidMount={(view) => {
                setCurrentView(view.view.type);
              }}
              eventContent={(eventInfo) => {
                return (
                  <div className="modern-event-content">
                    <div className="event-title">
                      {eventInfo.event.title}
                    </div>
                    {eventInfo.event.extendedProps.source === 'google' && (
                      <div className="event-source">Google</div>
                    )}
                  </div>
                );
              }}
              moreLinkContent={(args) => {
                return (
                  <div className="more-events-link">
                    <Plus className="h-3 w-3" />
                    <span>{args.num} mais</span>
                  </div>
                );
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

      <EnhancedEventDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onEventUpdate={refreshEvents}
      />

      <EventClusterModal
        isOpen={showClusterModal}
        onClose={() => {
          setShowClusterModal(false);
          setClusterEvents([]);
        }}
        events={clusterEvents}
        date={selectedDate || ''}
        onEventClick={(event) => {
          setSelectedEvent(event);
          setShowClusterModal(false);
          setShowDetailsModal(true);
        }}
      />
    </div>
  );
};

export default MyCalendar;
