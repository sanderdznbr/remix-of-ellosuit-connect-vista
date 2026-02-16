import React, { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Video, Settings, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CalendarKPIs from './CalendarKPIs';
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
  const [calendarRef, setCalendarRef] = useState<any>(null);

  const { events, loading, createEvent, bulkDeleteEvents, refreshEvents } = useCalendarData();
  const { isConnected, connectGoogle, loading: googleLoading } = useGoogleCalendar();
  const { lastSyncTime } = useRealtimeGoogleSync();
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
      setSelectedRange({ start: start.toISOString(), end: end.toISOString() });
      setSelectedDate(start.toISOString().split('T')[0]);
      setShowEventModal(true);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    const eventData = clickInfo.event;
    setSelectedEvent({
      id: eventData.id, title: eventData.title,
      start: eventData.start, end: eventData.end,
      extendedProps: eventData.extendedProps
    });
    setShowDetailsModal(true);
  };

  const handleMoreClick = (info: any) => {
    const dayEvents = info.allSegs.map((seg: any) => ({
      id: seg.event.id, title: seg.event.title,
      start: seg.event.start, end: seg.event.end,
      extendedProps: seg.event.extendedProps
    }));
    setClusterEvents(dayEvents);
    setSelectedDate(info.date.toISOString().split('T')[0]);
    setShowClusterModal(true);
  };

  const handleTypeSelect = (type: 'meeting' | 'appointment' | 'reminder') => {
    setShowTypeSelector(false);
    if (type === 'meeting') setShowEventModal(true);
    else if (type === 'appointment') setShowAppointmentModal(true);
    else if (type === 'reminder') setShowReminderModal(true);
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
    if (lastSyncTime) refreshEvents();
  }, [lastSyncTime, refreshEvents]);

  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      'meeting': FLOW_COLOR, 'appointment': '#10B981',
      'reminder': '#F59E0B', 'task': '#EF4444', 'google_meet': '#4285F4'
    };
    return colors[eventType] || '#6B7280';
  };

  const calendarEvents = useMemo(() => {
    return events.map((event) => {
      const startDate = event.start_date || (event as any).start;
      const endDate = event.end_date || (event as any).end;
      if (!startDate) return null;
      return {
        id: event.id, title: event.title || 'Evento sem título',
        start: startDate, end: endDate || startDate,
        backgroundColor: event.color || getEventColor(event.event_type),
        borderColor: 'transparent',
        textColor: '#ffffff', classNames: ['modern-event'],
        extendedProps: {
          description: event.description || '', event_type: event.event_type || 'meeting',
          meeting_link: event.meeting_link, meeting_provider: event.meeting_provider,
          attendees: event.attendees || [], is_all_day: event.is_all_day || false,
          source: event.source || (event.google_event_id ? 'google' : 'local'),
          google_event_id: event.google_event_id, meeting_data: event.meeting_data || {},
          meeting_status: (event as any).meeting_status, meeting_notes: (event as any).meeting_notes,
          recording_link: (event as any).recording_link, color: event.color
        }
      };
    }).filter(Boolean);
  }, [events]);

  // Dynamic height based on view
  const calendarHeight = currentView === 'dayGridMonth' ? 'auto' : '600px';

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Minha Agenda</h1>
            <p className="text-xs text-muted-foreground">Gerencie seus eventos e compromissos</p>
          </div>
        </div>
        <CalendarSkeleton />
      </div>
    );
  }

  const viewLabels: Record<string, string> = {
    dayGridMonth: 'Mês',
    timeGridWeek: 'Semana',
    timeGridDay: 'Dia',
  };

  const switchView = (view: string) => {
    setCurrentView(view);
    calendarRef?.getApi()?.changeView(view);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${FLOW_COLOR}12` }}>
            <Calendar className="h-5 w-5" style={{ color: FLOW_COLOR }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Minha Agenda</h1>
            <p className="text-xs text-muted-foreground">Eventos, reuniões e compromissos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl text-muted-foreground shrink-0 h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!isConnected && (
                <DropdownMenuItem onClick={() => connectGoogle()} disabled={googleLoading}>
                  <Video className="h-4 w-4 mr-2 text-blue-500" />
                  Conectar Google Calendar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowBulkDeleteModal(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir em Massa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => setShowTypeSelector(true)}
            className="rounded-xl shrink-0 h-9 text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ backgroundColor: FLOW_COLOR }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Custom toolbar */}
        <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-2">
          {/* View switcher */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {Object.entries(viewLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => switchView(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  currentView === key
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => calendarRef?.getApi()?.prev()}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => calendarRef?.getApi()?.today()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              Hoje
            </button>
            <button
              onClick={() => calendarRef?.getApi()?.next()}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="px-3 md:px-4 pb-4">
          <div className="calendar-container-v2">
            <FullCalendar
              ref={(el) => setCalendarRef(el)}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={false}
              height={calendarHeight}
              events={calendarEvents}
              dateClick={handleDateClick}
              select={handleDateSelect}
              eventClick={handleEventClick}
              moreLinkClick={handleMoreClick}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={2}
              weekends={true}
              locale={ptBrLocale}
              eventDisplay="block"
              eventTextColor="#ffffff"
              selectLongPressDelay={0}
              selectMinDistance={5}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:30:00"
              allDaySlot={true}
              allDayText="Dia todo"
              nowIndicator={true}
              viewDidMount={(view) => setCurrentView(view.view.type)}
              datesSet={(dateInfo) => {
                // Keep view in sync
                if (dateInfo.view.type !== currentView) {
                  setCurrentView(dateInfo.view.type);
                }
              }}
              eventContent={(eventInfo) => {
                const isTimeGrid = currentView.startsWith('timeGrid');
                return (
                  <div className={`modern-event-content ${isTimeGrid ? 'p-1.5' : 'px-1.5 py-0.5'}`}>
                    <div className="event-title text-xs font-semibold truncate">
                      {!isTimeGrid && eventInfo.timeText && (
                        <span className="font-normal opacity-80 mr-1">{eventInfo.timeText}</span>
                      )}
                      {eventInfo.event.title}
                    </div>
                    {isTimeGrid && eventInfo.event.extendedProps.description && (
                      <div className="text-[10px] opacity-75 truncate mt-0.5">
                        {eventInfo.event.extendedProps.description}
                      </div>
                    )}
                  </div>
                );
              }}
              moreLinkContent={(args) => (
                <span className="text-xs font-semibold" style={{ color: FLOW_COLOR }}>
                  +{args.num} mais
                </span>
              )}
            />
          </div>
        </div>
      </div>

      {/* KPIs - Below calendar */}
      <CalendarKPIs events={events} />

      {/* All modals */}
      <EventTypeSelector
        isOpen={showTypeSelector}
        onClose={() => { setShowTypeSelector(false); setSelectedDate(null); setSelectedRange(null); }}
        onSelectType={handleTypeSelect}
        selectedDate={selectedDate || ''}
      />
      <ImprovedEventModal
        isOpen={showEventModal} onClose={handleCloseAllModals}
        selectedDate={selectedDate} selectedRange={selectedRange}
        onCreateEvent={handleCreateEvent}
        onNavigateToSettings={onNavigate ? () => onNavigate('settings') : undefined}
      />
      <AppointmentModal
        isOpen={showAppointmentModal} onClose={handleCloseAllModals}
        selectedDate={selectedDate || ''} selectedRange={selectedRange}
        onCreateEvent={handleCreateEvent}
      />
      <ReminderModal
        isOpen={showReminderModal} onClose={handleCloseAllModals}
        selectedDate={selectedDate || ''} selectedRange={selectedRange}
        onCreateEvent={handleCreateEvent}
      />
      <EnhancedEventDetailsModal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedEvent(null); }}
        event={selectedEvent} onEventUpdate={refreshEvents}
      />
      <EventClusterModal
        isOpen={showClusterModal}
        onClose={() => { setShowClusterModal(false); setClusterEvents([]); }}
        events={clusterEvents} date={selectedDate || ''}
        onEventClick={(event) => { setSelectedEvent(event); setShowClusterModal(false); setShowDetailsModal(true); }}
      />
      <BulkDeleteModal
        isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)}
        events={events} onDelete={handleBulkDelete}
      />
    </div>
  );
};

export default MyCalendar;
