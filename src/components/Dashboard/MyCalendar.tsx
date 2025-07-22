import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Video, Users, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './calendar-styles.css';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useAuth } from '@/hooks/useAuth';
import EventDetailsModal from './EventDetailsModal';
import ImprovedEventModal from './ImprovedEventModal';
import CalendarSkeleton from './CalendarSkeleton';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import GoogleMeetConnectionStatus from './GoogleMeetConnectionStatus';

interface MyCalendarProps {
  onNavigate?: (item: string) => void;
}

const MyCalendar = ({ onNavigate }: MyCalendarProps) => {
  const { user } = useAuth();
  const [view, setView] = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  
  const { events, loading, refreshEvents, handleEventUpdate, handleEventDelete } = useCalendarData();
  const { isConnected, connect } = useGoogleCalendar();

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.date);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start_date: clickInfo.event.startStr,
      end_date: clickInfo.event.endStr,
      description: clickInfo.event.extendedProps.description,
      event_type: clickInfo.event.extendedProps.event_type,
      meeting_provider: clickInfo.event.extendedProps.meeting_provider,
      meeting_link: clickInfo.event.extendedProps.meeting_link,
      attendees: clickInfo.event.extendedProps.attendees,
      color: clickInfo.event.backgroundColor,
      is_all_day: clickInfo.event.extendedProps.is_all_day
    });
    setIsEventDetailsOpen(true);
  };

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(currentDate);
    }
  }, [currentDate]);

  if (loading) {
    return <CalendarSkeleton />;
  }

  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start_date,
    end: event.end_date,
    color: event.color || '#3600FF',
    extendedProps: {
      description: event.description,
      event_type: event.event_type,
      meeting_provider: event.meeting_provider,
      meeting_link: event.meeting_link,
      attendees: event.attendees || [],
      is_all_day: event.is_all_day
    }
  }));

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen ml-4">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Calendar */}
        <div className="flex-1">
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    Meu Calendário
                  </h1>
                  <p className="text-gray-600 text-base">
                    Gerencie seus eventos e compromissos
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <GoogleMeetConnectionStatus 
                    isConnected={isConnected}
                    onConnect={connect}
                  />
                  <Button 
                    onClick={() => setIsEventModalOpen(true)}
                    className="bg-[#3600FF] hover:bg-[#3600FF]/90 text-white rounded-xl px-4 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Evento
                  </Button>
                </div>
              </div>

              <div className="calendar-container">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale="pt-br"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                  }}
                  buttonText={{
                    today: 'Hoje',
                    month: 'Mês',
                    week: 'Semana',
                    day: 'Dia'
                  }}
                  events={calendarEvents}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  height="600px"
                  dayMaxEvents={3}
                  moreLinkText="mais"
                  eventDisplay="block"
                  displayEventTime={true}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }}
                  dayHeaderFormat={{ weekday: 'short' }}
                  firstDay={0}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Quick Stats */}
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resumo do Mês
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Total de Eventos</span>
                  <Badge variant="secondary" className="rounded-full">
                    {events.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Este Mês</span>
                  <Badge variant="secondary" className="rounded-full">
                    {events.filter(event => {
                      const eventDate = new Date(event.start_date);
                      const now = new Date();
                      return eventDate.getMonth() === now.getMonth() && 
                             eventDate.getFullYear() === now.getFullYear();
                    }).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Com Google Meet</span>
                  <Badge variant="secondary" className="rounded-full">
                    {events.filter(event => event.meeting_provider === 'google_meet').length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Events */}
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Próximos Eventos
              </h3>
              <div className="space-y-3">
                {events
                  .filter(event => new Date(event.start_date) > new Date())
                  .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm mb-1">
                            {event.title}
                          </h4>
                          <div className="flex items-center text-xs text-gray-500 gap-2">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.start_date), 'dd/MM HH:mm', { locale: ptBR })}
                          </div>
                          {event.meeting_link && (
                            <div className="flex items-center text-xs text-blue-600 gap-1 mt-1">
                              <Video className="h-3 w-3" />
                              Online
                            </div>
                          )}
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: event.color || '#3600FF' }}
                        />
                      </div>
                    </div>
                  ))}
                {events.filter(event => new Date(event.start_date) > new Date()).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhum evento próximo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ImprovedEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventCreated={refreshEvents}
        selectedDate={selectedDate}
      />

      <EventDetailsModal
        isOpen={isEventDetailsOpen}
        onClose={() => setIsEventDetailsOpen(false)}
        event={selectedEvent}
        onEventUpdated={handleEventUpdate}
        onEventDeleted={handleEventDelete}
      />
    </div>
  );
};

export default MyCalendar;
