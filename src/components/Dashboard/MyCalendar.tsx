import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImprovedEventModal from './ImprovedEventModal';
import AppointmentModal from './AppointmentModal';
import ReminderModal from './ReminderModal';
import EnhancedEventDetailsModal from './EnhancedEventDetailsModal';
import EventTypeSelector from './EventTypeSelector';
import EventClusterModal from './EventClusterModal';
import CalendarSkeleton from './CalendarSkeleton';
import BulkDeleteModal from './BulkDeleteModal';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useRealtimeGoogleSync } from '@/hooks/useRealtimeGoogleSync';
import { RecurrenceConfig } from './RecurrenceSelector';
import './calendar-styles.css';

interface MyCalendarProps {
  onNavigate?: (page: string) => void;
}

const FLOW_COLOR = "#007DE3";

const MyCalendar = ({ onNavigate }: MyCalendarProps) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [clusterEvents, setClusterEvents] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);

  const { events, loading, createEvent, bulkDeleteEvents, refreshEvents } = useCalendarData();
  const { isConnected, connectGoogle, loading: googleLoading } = useGoogleCalendar();
  const { lastSyncTime, syncGoogleCalendar } = useRealtimeGoogleSync();
  const { toast } = useToast();

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setSelectedRange(null);
    setShowTypeSelector(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    const start = selectInfo.start;
    const end = selectInfo.end;
    
    if (start.getTime() !== end.getTime()) {
      setSelectedRange({
        start: start.toISOString(),
        end: end.toISOString()
      });
      setSelectedDate(start.toISOString().split('T')[0]);
      setShowEventModal(true);
    }
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

  const handleCreateEvent = async (eventData: any, recurrence?: RecurrenceConfig) => {
    try {
      await createEvent(eventData, recurrence);
      await refreshEvents();
      handleCloseAllModals();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleBulkDelete = async (eventIds: string[]) => {
    try {
      await bulkDeleteEvents(eventIds);
      await refreshEvents();
    } catch (error) {
      console.error('Error bulk deleting events:', error);
    }
  };

  const handleCloseAllModals = () => {
    setShowEventModal(false);
    setShowAppointmentModal(false);
    setShowReminderModal(false);
    setShowTypeSelector(false);
    setSelectedDate(null);
    setSelectedRange(null);
  };

  useEffect(() => {
    if (lastSyncTime) {
      refreshEvents();
    }
  }, [lastSyncTime, refreshEvents]);

  const formatEventsForCalendar = (events: any[]) => {
    return events.map((event) => {
      const startDate = event.start_date || event.start;
      const endDate = event.end_date || event.end;
      
      if (!startDate) return null;

      return {
        id: event.id,
        title: event.title || 'Evento sem título',
        start: startDate,
        end: endDate || startDate,
        backgroundColor: event.color || getEventColor(event.event_type),
        borderColor: event.color || getEventColor(event.event_type),
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
          recording_link: event.recording_link,
          color: event.color
        }
      };
    }).filter(event => event !== null);
  };

  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      'meeting': FLOW_COLOR,
      'appointment': '#10B981',
      'reminder': '#F59E0B',
      'task': '#EF4444',
      'google_meet': '#4285F4'
    };
    return colors[eventType] || '#6B7280';
  };

  const calendarEvents = formatEventsForCalendar(events);

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-white min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minha Agenda</h1>
            <p className="text-sm text-gray-500">Gerencie seus eventos, reuniões e compromissos</p>
          </div>
        </div>
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minha Agenda</h1>
          <p className="text-sm text-gray-500">
            Gerencie seus eventos, reuniões e compromissos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isConnected && (
            <Button
              onClick={() => connectGoogle()}
              variant="outline"
              className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
              size="sm"
              disabled={googleLoading}
            >
              <Video className="h-4 w-4 mr-2" />
              Conectar Google Calendar
            </Button>
          )}
          <Button 
            onClick={() => setShowBulkDeleteModal(true)}
            variant="outline"
            className="rounded-xl text-gray-600 hover:text-red-600"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir em Massa
          </Button>
          <Button 
            onClick={() => setShowTypeSelector(true)}
            className="rounded-xl"
            style={{ backgroundColor: FLOW_COLOR }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6">
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
              select={handleDateSelect}
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
              selectLongPressDelay={0}
              selectMinDistance={5}
              viewDidMount={(view) => {
                setCurrentView(view.view.type);
              }}
              eventContent={(eventInfo) => {
                return (
                  <div className="modern-event-content p-1 rounded">
                    <div className="event-title text-xs font-medium truncate">
                      {eventInfo.event.title}
                    </div>
                    {eventInfo.event.extendedProps.source === 'google' && (
                      <div className="event-source text-xs opacity-75 flex items-center">
                        <span className="text-xs">Google</span>
                      </div>
                    )}
                  </div>
                );
              }}
              moreLinkContent={(args) => {
                return (
                  <div className="more-events-link text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center">
                    <Plus className="h-3 w-3 mr-1" />
                    <span>{args.num} mais</span>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      <EventTypeSelector
        isOpen={showTypeSelector}
        onClose={() => {
          setShowTypeSelector(false);
          setSelectedDate(null);
          setSelectedRange(null);
        }}
        onSelectType={handleTypeSelect}
        selectedDate={selectedDate || ''}
      />

      <ImprovedEventModal
        isOpen={showEventModal}
        onClose={handleCloseAllModals}
        selectedDate={selectedDate}
        selectedRange={selectedRange}
        onCreateEvent={handleCreateEvent}
        onNavigateToSettings={onNavigate ? () => onNavigate('settings') : undefined}
      />

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={handleCloseAllModals}
        selectedDate={selectedDate || ''}
        selectedRange={selectedRange}
        onCreateEvent={handleCreateEvent}
      />

      <ReminderModal
        isOpen={showReminderModal}
        onClose={handleCloseAllModals}
        selectedDate={selectedDate || ''}
        selectedRange={selectedRange}
        onCreateEvent={handleCreateEvent}
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

      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        events={events}
        onDelete={handleBulkDelete}
      />
    </div>
  );
};

export default MyCalendar;
